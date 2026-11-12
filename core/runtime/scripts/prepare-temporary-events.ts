/** Offline migration preparation only. Never connects or applies DDL at startup. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export function prepareTemporaryEvents(database:string,expectedUsers:number,commit:string){
 if(!/^[a-zA-Z0-9_-]{1,63}$/.test(database)||!Number.isSafeInteger(expectedUsers)||expectedUsers<0||!/^[a-f0-9]{40}$/.test(commit))throw Error('INVALID_MIGRATION_IDENTITY');
 const source=readFileSync(new URL('../schema-proposals/temporary-events.sql',import.meta.url),'utf8');
 const checksum=createHash('sha256').update(source).digest('hex');
 const guard=`
SELECT pg_advisory_xact_lock(hashtextextended('ad507:temporary-events:migration',0));
LOCK TABLE ad507.schema_migrations IN EXCLUSIVE MODE;
DO $$ BEGIN
 IF current_database()<>'${database}' THEN RAISE EXCEPTION 'WRONG_DATABASE'; END IF;
 IF to_regclass('ad507.users') IS NULL OR (SELECT data_type FROM information_schema.columns WHERE table_schema='ad507' AND table_name='users' AND column_name='id') IS DISTINCT FROM 'uuid' THEN RAISE EXCEPTION 'AUTH_FOUNDATION_REQUIRED'; END IF;
 IF (SELECT count(*) FROM ad507.users)<>${expectedUsers} THEN RAISE EXCEPTION 'BACKUP_PREFLIGHT_STALE'; END IF;
 IF EXISTS(SELECT 1 FROM ad507.schema_migrations WHERE version='temporary-events-v1') THEN RAISE EXCEPTION 'MIGRATION_ALREADY_APPLIED'; END IF;
 IF to_regclass('ad507.temporary_events') IS NOT NULL OR to_regclass('ad507.temporary_event_media') IS NOT NULL OR to_regclass('ad507.temporary_event_orders') IS NOT NULL THEN RAISE EXCEPTION 'UNTRACKED_EVENT_SCHEMA'; END IF;
END $$;
`;
 return source.replace('BEGIN;',()=>'BEGIN;'+guard).replace('COMMIT;',`INSERT INTO ad507.schema_migrations(version,checksum_sha256,description,applied_by,metadata) VALUES('temporary-events-v1','${checksum}','Isolated temporary events, media and Yappy orders',current_user,'{"commit":"${commit}","backupRequired":true}'::jsonb);\nCOMMIT;`);
}
if(import.meta.main){const [database,count,commit]=process.argv.slice(2);console.log(prepareTemporaryEvents(database,Number(count),commit));}
