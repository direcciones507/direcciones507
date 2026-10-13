import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';

type LedgerRow={version:string;checksum_sha256:string};
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');

/** Offline review only. Does not connect, execute SQL, assign ledger versions or enable gates. */
export function commercialMigrationManifest(root=new URL('../../../',import.meta.url)) {
  const foundation=readdirSync(new URL('db/migrations/',root)).filter(f=>/^\d{4}_[a-z0-9_]+\.sql$/.test(f)).sort().map(file=>({
    version:file.slice(0,4),file,checksum_sha256:sha(readFileSync(new URL('db/migrations/'+file,root),'utf8')),
  }));
  const proposals=['landline.sql','requests.sql','payments.sql'].map((file,i)=>({
    file,checksum_sha256:sha(readFileSync(new URL('core/runtime/schema-proposals/'+file,root),'utf8')),
    requires:i===0?'verified foundation ledger':i===1?'landline.sql':'requests.sql',
    version:null,applied:false,
  }));
  return {foundation,proposals,dependentProposals:['countries.sql (PR52, after requests.sql)','paypal.sql (PR52, after payments.sql)'],productionAuthorized:false};
}

/** Missing, duplicate, unexpected or changed ledger evidence never confirms readiness. */
export function reviewFoundationLedger(rows:readonly LedgerRow[],manifest=commercialMigrationManifest()) {
  const missing=manifest.foundation.filter(f=>!rows.some(r=>r.version===f.version)).map(f=>f.version);
  const mismatched=manifest.foundation.filter(f=>rows.some(r=>r.version===f.version&&r.checksum_sha256!==f.checksum_sha256)).map(f=>f.version);
  const unexpected=rows.filter(r=>!manifest.foundation.some(f=>f.version===r.version)).map(r=>r.version);
  const duplicates=[...new Set(rows.filter((r,i)=>rows.findIndex(v=>v.version===r.version)!==i).map(r=>r.version))];
  return {ledgerMatches:!missing.length&&!mismatched.length&&!unexpected.length&&!duplicates.length,
    missing,mismatched,unexpected,duplicates,productionAuthorized:false,publicationVerified:false};
}

if(import.meta.main)console.log(JSON.stringify(commercialMigrationManifest(),null,2));
