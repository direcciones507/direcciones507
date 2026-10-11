import type { Sql } from 'postgres';
import { createHash } from 'node:crypto';
import { validateRequestFiles, type RequestFile } from './request-validation';
import { createRequestMediaStorage } from './request-media';
import { optimizeRequestImage } from './image-processing';
import type { R2Settings } from './r2-storage';
import { validateHistoricalSnapshot, snapshotHash, verifyHistoricalPhotos, verifyMigrationBridge, verifyHistoricalCodePresent } from './commercial-migration';

const digest=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export type CanonicalPublication = {
  // Installed only after historical registry and the single previous allocator are verified.
  historicalRegistryVerified: true;
  reserve: (request:{id:string;type:string;plan:string;name:string;requestedName:string})=>Promise<string>;
  publish: (request:{id:string;code:string;type:string})=>Promise<{confirmed:true;receipt:string}>;
};
export function createRequestRepository(sql:Sql, options:{r2:R2Settings|null;fetch?:typeof fetch;canonical?:CanonicalPublication|null}) {
  const actor=async(tx:any,id:string,role:string)=>{
    const users=await tx.unsafe(`SELECT u.id FROM ad507.users u JOIN ad507.user_roles r ON r.user_id=u.id WHERE u.id=$1::uuid AND u.status='ACTIVE' AND r.role=$2`,[id,role]);
    if(!users.length)throw Error('FORBIDDEN');
  };
  const audit=async(tx:any,id:string,action:string,addressId:string,admin=false)=>tx.unsafe(`INSERT INTO ad507.audit_log(actor_user_id,actor_type,action,entity_type,entity_id) VALUES($1::uuid,$2,$3,'ADDRESS',$4)`,[id,admin?'ADMIN':'USER',action,addressId]);
  const owned=async(tx:any,id:string,addressId:string)=>{
    if(!uuid.test(addressId))throw Error('REQUEST_NOT_FOUND');
    const rows=await tx.unsafe(`SELECT a.* FROM ad507.addresses a JOIN ad507.address_ownership o ON o.address_id=a.id WHERE a.id=$1::uuid AND o.user_id=$2::uuid AND o.ownership_role='OWNER' AND a.source='USER_REQUEST' FOR UPDATE OF a`,[addressId,id]);
    if(!rows.length)throw Error('REQUEST_NOT_FOUND');return rows[0];
  };
  const complete=async(tx:any,row:any)=>{
    const files=await tx.unsafe('SELECT media_type,upload_status FROM ad507.address_media WHERE address_id=$1::uuid',[row.id]);
    const expected=row.request_data.media;
    if(files.some((m:any)=>m.upload_status!=='READY')||files.filter((m:any)=>m.media_type==='LOGO').length!==expected.logos||files.filter((m:any)=>m.media_type==='IMAGE').length!==expected.placePhotos+expected.galleryPhotos)throw Error('MEDIA_INCOMPLETE');
  };
  const historicalIntegrity=async(tx:any,row:any)=>{
    const snapshot=row.legacy_payload,expected=validateHistoricalSnapshot(snapshot);
    if(snapshotHash(snapshot)!==row.request_data.migration.snapshotHash||row.code!==snapshot.code)throw Error('HISTORICAL_DATA_CHANGED');
    const columns:any={name:'name',reference:'reference',description:'description',commercial_description:'commercialDescription',phone:'phone',landline_phone:'landlinePhone',hours:'hours',address_type:'type'};
    for(const [column,key]of Object.entries(columns))if((row[column]??'')!==((expected as any)[key as string]??''))throw Error('HISTORICAL_DATA_CHANGED');
    if(Number(row.latitude)!==expected.latitude||Number(row.longitude)!==expected.longitude||row.request_data.plan!==expected.plan)throw Error('HISTORICAL_DATA_CHANGED');
    const plans=await tx.unsafe('SELECT code FROM ad507.plans WHERE id=$1::uuid',[row.plan_id]);
    if(expected.type!=='PLACE'&&plans[0]?.code!==expected.plan||expected.type==='PLACE'&&row.plan_id!==null)throw Error('HISTORICAL_DATA_CHANGED');
    const media=await tx.unsafe('SELECT media_type,url,storage_key,upload_status FROM ad507.address_media WHERE address_id=$1::uuid ORDER BY position',[row.id]);
    if(media.length!==snapshot.media.length||media.some((m:any,i:number)=>m.media_type!==snapshot.media[i].type||m.url!==snapshot.media[i].url||m.storage_key!==null||m.upload_status!=='READY'))throw Error('HISTORICAL_DATA_CHANGED');
    const socials=await tx.unsafe('SELECT platform,url FROM ad507.address_socials WHERE address_id=$1::uuid',[row.id]);
    if(snapshotHash(Object.fromEntries(socials.map((v:any)=>[v.platform,v.url])))!==snapshotHash(expected.socials))throw Error('HISTORICAL_DATA_CHANGED');
    for(const key of ['postalCode','postalZone','email'])if((row.request_data[key]??'')!==((expected as any)[key]??''))throw Error('HISTORICAL_DATA_CHANGED');
  };
  const repository = {
    async stageHistorical(actorId:string,key:string,snapshot:any) {
      if(!uuid.test(actorId)||!/^[A-Za-z0-9_-]{16,128}$/.test(key))throw Error('INVALID_IDEMPOTENCY_KEY');
      const data=validateHistoricalSnapshot(snapshot),hash=snapshotHash(snapshot),keyHash=digest(actorId+':'+key),payloadHash=digest(actorId+':historical:'+hash);
      await actor(sql,actorId,'ADMIN');await verifyHistoricalCodePresent(snapshot.code,options.fetch);
      return sql.begin(async tx=>{
        await actor(tx,actorId,'ADMIN');await tx.unsafe('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['historical:'+snapshot.code]);
        const previous=await tx.unsafe('SELECT * FROM ad507.addresses WHERE request_key_hash=$1 OR upper(trim(code))=$2',[keyHash,snapshot.code]);
        if(previous.length){const p=previous[0];if(p.request_key_hash!==keyHash||p.request_payload_hash!==payloadHash)throw Error('IDEMPOTENCY_CONFLICT');return {id:p.id,code:p.code,status:p.status};}
        const plans=await tx.unsafe("SELECT id FROM ad507.plans WHERE code=$1 AND status='ACTIVE'",[data.plan]);if(data.type!=='PLACE'&&!plans.length)throw Error('PLAN_NOT_FOUND');
        const rows=await tx.unsafe(`INSERT INTO ad507.addresses(code,address_type,status,plan_id,name,reference,description,commercial_description,latitude,longitude,phone,landline_phone,hours,source,request_key_hash,request_payload_hash,request_data,legacy_payload)
          VALUES($1,$2,'PENDING_REVIEW',$3::uuid,$4,$5,$6,$7,$8,$9,$10,$11,$12,'USER_REQUEST',$13,$14,$15::jsonb,$16::jsonb) RETURNING *`,[snapshot.code,data.type,plans[0]?.id??null,data.name,data.reference,data.description,data.commercialDescription,data.latitude,data.longitude,data.phone,data.landlinePhone,data.hours,keyHash,payloadHash,tx.json({media:data.media,plan:data.plan,email:data.email,postalCode:data.postalCode,postalZone:data.postalZone,createdByAdmin:actorId,origin:'HISTORICAL_IMPORT',migration:{snapshotHash:hash,originalUrl:snapshot.publicUrl}}),tx.json(snapshot)]);
        const row=rows[0];await tx.unsafe('INSERT INTO ad507.address_ownership(address_id,user_id) VALUES($1::uuid,$2::uuid)',[row.id,actorId]);
        for(const [i,m]of snapshot.media.entries())await tx.unsafe("INSERT INTO ad507.address_media(address_id,media_type,url,position,is_primary,upload_status) VALUES($1::uuid,$2,$3,$4,$5,'READY')",[row.id,m.type,m.url,i,snapshot.media.findIndex((v:any)=>v.type===m.type)===i]);
        for(const [platform,url]of Object.entries(data.socials))await tx.unsafe('INSERT INTO ad507.address_socials(address_id,platform,url) VALUES($1::uuid,$2,$3)',[row.id,platform,url]);
        await audit(tx,actorId,'HISTORICAL_ADDRESS_STAGED',row.id,true);return {id:row.id,code:row.code,status:row.status};
      });
    },
    async rollbackHistorical(actorId:string,addressId:string) {
      if(!uuid.test(addressId))throw Error('REQUEST_NOT_FOUND');
      const session=await sql.reserve();try{
        await session.unsafe('SELECT pg_advisory_lock(hashtextextended($1,0))',['publish:'+addressId]);await actor(session,actorId,'ADMIN');
        const rows=await session.unsafe("SELECT * FROM ad507.addresses WHERE id=$1::uuid AND source='USER_REQUEST'",[addressId]),row=rows[0];
        if(!row?.request_data?.migration)throw Error('REQUEST_NOT_FOUND');
        if(row.status==='SUSPENDED')return {id:row.id,code:row.code,status:'SUSPENDED'};
        if(row.status!=='ACTIVE')throw Error('INVALID_STATE_TRANSITION');
        await historicalIntegrity(session,row);await verifyHistoricalCodePresent(row.code,options.fetch);await verifyMigrationBridge(row,options.fetch);await verifyHistoricalPhotos(row.legacy_payload,options.fetch);
        await session.unsafe('BEGIN');try{
          await actor(session,actorId,'ADMIN');await session.unsafe("UPDATE ad507.addresses SET status='SUSPENDED',updated_at=now() WHERE id=$1::uuid",[row.id]);await audit(session,actorId,'HISTORICAL_PUBLICATION_ROLLED_BACK',row.id,true);await session.unsafe('COMMIT');
        }catch(e){await session.unsafe('ROLLBACK');throw e;}
        return {id:row.id,code:row.code,status:'SUSPENDED'};
      }finally{await session.unsafe('SELECT pg_advisory_unlock(hashtextextended($1,0))',['publish:'+addressId]).catch(()=>{});session.release();}
    },
    async createAdmin(actorId:string,key:string,raw:unknown,files:RequestFile[]) {
      return repository.submit(actorId,key,raw,files,true);
    },
    async submit(actorId:string,key:string,raw:unknown,files:RequestFile[],admin=false) {
      if(!uuid.test(actorId)||!/^[A-Za-z0-9_-]{16,128}$/.test(key))throw Error('INVALID_IDEMPOTENCY_KEY');
      const data=validateRequestFiles(raw,files);
      // Reject duplicate gallery parts before persisting an impossible required count.
      const fingerprints=files.map(f=>f.role+':'+digest(f.bytes));
      if(new Set(fingerprints).size!==files.length)throw Error('DUPLICATE_MEDIA');
      if(files.length&&!options.r2)throw Error('R2_NOT_READY');
      const preparedFiles=await Promise.all(files.map(async file=>({...await optimizeRequestImage(file.bytes,file.mime),role:file.role})));
      if(new Set(preparedFiles.map(f=>f.role+':'+digest(f.bytes))).size!==preparedFiles.length)throw Error('DUPLICATE_MEDIA');
      const keyHash=digest(actorId+':'+key),payloadHash=digest(actorId+':'+JSON.stringify({data,files:fingerprints.sort()}));
      const request=await sql.begin(async tx=>{
        await actor(tx,actorId,admin?'ADMIN':'CLIENT');
        await tx.unsafe('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[keyHash]);
        await tx.unsafe('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[payloadHash]);
        const existing=await tx.unsafe('SELECT id::text FROM ad507.addresses WHERE request_key_hash=$1 OR request_payload_hash=$2 ORDER BY (request_key_hash=$1) DESC NULLS LAST LIMIT 1',[keyHash,payloadHash]);
        if(existing.length){const row=await owned(tx,actorId,existing[0].id);if(row.request_payload_hash!==payloadHash)throw Error('IDEMPOTENCY_CONFLICT');return row;}
        const plan=await tx.unsafe("SELECT id FROM ad507.plans WHERE code=$1 AND status='ACTIVE'",[data.plan]);
        if(data.type!=='PLACE'&&!plan.length)throw Error('PLAN_NOT_FOUND');
        const rows=await tx.unsafe(`INSERT INTO ad507.addresses(code,address_type,status,plan_id,name,reference,description,commercial_description,latitude,longitude,phone,landline_phone,hours,source,request_key_hash,request_payload_hash,request_data)
          VALUES(NULL,$1,'DRAFT',$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11,'USER_REQUEST',$12,$13,$14::jsonb) RETURNING *`,[data.type,plan[0]?.id??null,data.name,data.reference,data.description,data.commercialDescription,data.latitude,data.longitude,data.phone,data.landlinePhone,data.hours,keyHash,payloadHash,tx.json({media:data.media,plan:data.plan,email:data.email,namedCode:data.namedCode,postalCode:data.postalCode,postalZone:data.postalZone,...(admin?{createdByAdmin:actorId}:{})})]);
        const row=rows[0];await tx.unsafe('INSERT INTO ad507.address_ownership(address_id,user_id) VALUES($1::uuid,$2::uuid)',[row.id,actorId]);
        for(const [platform,url]of Object.entries(data.socials))await tx.unsafe('INSERT INTO ad507.address_socials(address_id,platform,url) VALUES($1::uuid,$2,$3)',[row.id,platform,url]);
        await audit(tx,actorId,admin?'ADMIN_ADDRESS_CREATED':'REQUEST_CREATED',row.id,admin);return row;
      });
      if(request.status!=='DRAFT')return {id:request.id,status:request.status,code:request.code,review:request.review_decision};
      try {
        if(files.length){const storage=createRequestMediaStorage(sql,actorId,options.r2!,options.fetch);for(const file of [...preparedFiles].sort((a,b)=>a.role==='logo'?-1:b.role==='logo'?1:0))await storage.storeOptimized({...file,ownerId:actorId,addressId:request.id});}
        return await sql.begin(async tx=>{
          await actor(tx,actorId,admin?'ADMIN':'CLIENT');const row=await owned(tx,actorId,request.id);
          if(row.status==='DRAFT'){await complete(tx,row);await tx.unsafe("UPDATE ad507.addresses SET status='PENDING_REVIEW',updated_at=now() WHERE id=$1::uuid",[row.id]);await audit(tx,actorId,'REQUEST_SUBMITTED',row.id,admin);}
          return {id:row.id,status:row.status==='DRAFT'?'PENDING_REVIEW':row.status,code:row.code,review:row.review_decision};
        });
      } catch(error){
        const latest=await sql.begin(async tx=>{await actor(tx,actorId,admin?'ADMIN':'CLIENT');return owned(tx,actorId,request.id);});
        if(latest.status!=='DRAFT')return {id:latest.id,status:latest.status,code:latest.code,review:latest.review_decision};
        return {id:request.id,status:'DRAFT',code:null,error:error instanceof Error&&['MEDIA_INCOMPLETE','MEDIA_LIMIT_EXCEEDED','MEDIA_FORBIDDEN'].includes(error.message)?error.message:'MEDIA_UPLOAD_RETRY_REQUIRED'};}
    },
    async read(actorId:string,addressId:string) {
      if(!uuid.test(addressId))throw Error('REQUEST_NOT_FOUND');
      const rows=await sql.unsafe(`SELECT a.id::text,a.code,a.address_type AS type,a.status,a.name,a.reference,a.description,a.commercial_description AS \"commercialDescription\",a.latitude,a.longitude,a.phone,a.landline_phone AS \"landlinePhone\",a.hours,a.review_decision AS review,a.request_data AS extras FROM ad507.addresses a JOIN ad507.users u ON u.id=$1::uuid AND u.status='ACTIVE' WHERE a.id=$2::uuid AND a.source='USER_REQUEST' AND (EXISTS(SELECT 1 FROM ad507.user_roles r WHERE r.user_id=u.id AND r.role='ADMIN') OR EXISTS(SELECT 1 FROM ad507.address_ownership o WHERE o.address_id=a.id AND o.user_id=u.id))`,[actorId,addressId]);
      if(!rows.length)throw Error('REQUEST_NOT_FOUND');
      const owners=await sql.unsafe("SELECT user_id::text FROM ad507.address_ownership WHERE address_id=$1::uuid AND ownership_role='OWNER'",[addressId]);
      const media=await sql.unsafe('SELECT id::text,media_type AS type,url,position,upload_status AS status FROM ad507.address_media WHERE address_id=$1::uuid ORDER BY position,id',[addressId]);
      const socials=await sql.unsafe('SELECT platform,url FROM ad507.address_socials WHERE address_id=$1::uuid ORDER BY platform',[addressId]);
      return {...rows[0],ownerId:owners.length===1?owners[0].user_id:null,media,socials};
    },
    async transfer(actorId:string,addressId:string,expectedOwner:string,targetId:string) {
      if(![actorId,addressId,expectedOwner,targetId].every(id=>uuid.test(id)))throw Error('INVALID_REQUEST');
      return sql.begin(async tx=>{
        await actor(tx,actorId,'ADMIN');
        const rows=await tx.unsafe("SELECT * FROM ad507.addresses WHERE id=$1::uuid AND source='USER_REQUEST' FOR UPDATE",[addressId]);
        const row=rows[0];if(!row)throw Error('REQUEST_NOT_FOUND');
        if(!row.request_data?.createdByAdmin)throw Error('ADMIN_CREATION_REQUIRED');
        if(row.status==='DRAFT')throw Error('MEDIA_INCOMPLETE');
        // Reversal can only restore the creator; normal transfer requires an active CLIENT.
        await actor(tx,targetId,targetId===row.request_data.createdByAdmin?'ADMIN':'CLIENT');
        const owners=await tx.unsafe("SELECT user_id::text FROM ad507.address_ownership WHERE address_id=$1::uuid AND ownership_role='OWNER'",[addressId]);
        if(owners.length!==1)throw Error('OWNERSHIP_CONFLICT');
        if(owners[0].user_id===targetId)return {id:addressId,ownerId:targetId,unchanged:true};
        if(owners[0].user_id!==expectedOwner)throw Error('OWNERSHIP_CONFLICT');
        await tx.unsafe("DELETE FROM ad507.address_ownership WHERE address_id=$1::uuid AND ownership_role='OWNER'",[addressId]);
        await tx.unsafe("INSERT INTO ad507.address_ownership(address_id,user_id,ownership_role) VALUES($1::uuid,$2::uuid,'OWNER') ON CONFLICT(address_id,user_id) DO UPDATE SET ownership_role='OWNER'",[addressId,targetId]);
        await tx.unsafe("INSERT INTO ad507.audit_log(actor_user_id,actor_type,action,entity_type,entity_id,before_json,after_json) VALUES($1::uuid,'ADMIN','ADDRESS_OWNERSHIP_TRANSFERRED','ADDRESS',$2,$3::jsonb,$4::jsonb)",[actorId,addressId,tx.json({ownerId:expectedOwner}),tx.json({ownerId:targetId})]);
        return {id:addressId,ownerId:targetId,unchanged:false};
      });
    },
    async review(actorId:string,addressId:string,decision:'APPROVED'|'REJECTED') {
      if(!uuid.test(addressId)||!['APPROVED','REJECTED'].includes(decision))throw Error('INVALID_REQUEST');
      return sql.begin(async tx=>{
        await actor(tx,actorId,'ADMIN');
        const rows=await tx.unsafe("SELECT * FROM ad507.addresses WHERE id=$1::uuid AND source='USER_REQUEST' FOR UPDATE",[addressId]);const row=rows[0];
        if(!row)throw Error('REQUEST_NOT_FOUND');
        if(row.review_decision===decision)return {id:row.id,status:row.status,decision};
        if(row.status!=='PENDING_REVIEW'||row.review_decision)throw Error('INVALID_STATE_TRANSITION');
        await complete(tx,row);if(row.request_data?.migration){await historicalIntegrity(tx,row);if(decision==='APPROVED'){const proof=await verifyHistoricalPhotos(row.legacy_payload,options.fetch);await tx.unsafe("UPDATE ad507.addresses SET request_data=jsonb_set(request_data,'{migration,photoProof}',$2::jsonb) WHERE id=$1::uuid",[row.id,tx.json(proof)]);}}
        await tx.unsafe("UPDATE ad507.addresses SET review_decision=$2,reviewed_by=$3::uuid,status=$4,updated_at=now() WHERE id=$1::uuid",[row.id,decision,actorId,decision==='REJECTED'?'ARCHIVED':'PENDING_REVIEW']);
        await audit(tx,actorId,'REQUEST_'+decision,row.id,true);
        return {id:row.id,status:decision==='REJECTED'?'ARCHIVED':'PENDING_REVIEW',decision};
      });
    },
    async publish(actorId:string,addressId:string) {
      if(!uuid.test(addressId))throw Error('REQUEST_NOT_FOUND');
      if(!options.canonical||options.canonical.historicalRegistryVerified!==true)throw Error('CANONICAL_PUBLICATION_NOT_READY');
      const session=await sql.reserve();
      try {
        await session.unsafe('SELECT pg_advisory_lock(hashtextextended($1,0))',['publish:'+addressId]);
        await actor(session,actorId,'ADMIN');
        const rows=await session.unsafe("SELECT * FROM ad507.addresses WHERE id=$1::uuid AND source='USER_REQUEST'",[addressId]);const row=rows[0];
        if(!row)throw Error('REQUEST_NOT_FOUND');
        if(row.status==='ACTIVE'&&row.publication_receipt)return {id:row.id,code:row.code,status:'ACTIVE',receipt:row.publication_receipt};
        if((row.status!=='PENDING_REVIEW'&&!(row.status==='SUSPENDED'&&row.request_data?.migration))||row.review_decision!=='APPROVED')throw Error('APPROVAL_REQUIRED');
        await complete(session,row);
        if(row.request_data?.migration){await historicalIntegrity(session,row);await verifyHistoricalCodePresent(row.code,options.fetch);await verifyMigrationBridge(row,options.fetch);const proof=await verifyHistoricalPhotos(row.legacy_payload,options.fetch);if(snapshotHash(proof)!==snapshotHash(row.request_data.migration.photoProof))throw Error('HISTORICAL_MEDIA_UNVERIFIED');}
        const code=row.code??await options.canonical.reserve({id:row.id,type:row.address_type,plan:row.request_data.plan,name:row.name,requestedName:row.request_data.namedCode});
        if(!/^AD507-[A-Z0-9_-]+$/.test(code))throw Error('CANONICAL_CODE_INVALID');
        if(!row.code)try{await session.unsafe("UPDATE ad507.addresses SET code=$2,updated_at=now() WHERE id=$1::uuid",[row.id,code]);}catch(error){if((error as {code?:string}).code==='23505')throw Error('CANONICAL_CODE_COLLISION');throw error;}
        // External allocator/publisher MUST deduplicate by this durable request id.
        const published=await options.canonical.publish({id:row.id,code,type:row.address_type});
        if(published.confirmed!==true||typeof published.receipt!=='string'||!published.receipt||published.receipt.length>300)throw Error('PUBLICATION_UNCONFIRMED');
        await session.unsafe('BEGIN');
        try {
          const tx=session;
          await actor(tx,actorId,'ADMIN');
          const current=await tx.unsafe("SELECT * FROM ad507.addresses WHERE id=$1::uuid FOR UPDATE",[row.id]);
          if(!['PENDING_REVIEW',...(row.request_data?.migration?['SUSPENDED']:[])].includes(current[0]?.status)||current[0]?.review_decision!=='APPROVED')throw Error('PUBLICATION_STATE_CONFLICT');
          if(row.request_data?.migration)await historicalIntegrity(tx,current[0]);
          await tx.unsafe("UPDATE ad507.addresses SET status='ACTIVE',publication_receipt=$2,updated_at=now() WHERE id=$1::uuid",[row.id,published.receipt]);await audit(tx,actorId,'REQUEST_PUBLISHED',row.id,true);
          await session.unsafe('COMMIT');
        } catch(error){await session.unsafe('ROLLBACK');throw error;}
        return {id:row.id,code,status:'ACTIVE',receipt:published.receipt};
      } finally {await session.unsafe('SELECT pg_advisory_unlock(hashtextextended($1,0))',['publish:'+addressId]).catch(()=>{});session.release();}
    },
  };
  return repository;
}
