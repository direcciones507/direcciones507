import type { Sql } from 'postgres';

const owner = `e.digital_address_ref IS NULL AND (
 EXISTS (SELECT 1 FROM radar.verified_owners o WHERE o.establishment_id=e.id AND o.account_ref=$2::uuid)
 OR (EXISTS (SELECT 1 FROM radar.registration_profiles p WHERE p.establishment_id=e.id AND p.submitted_by=$2::uuid)
 AND NOT EXISTS (SELECT 1 FROM radar.verified_owners o WHERE o.establishment_id=e.id))
)`;
const promoted = `e.published AND EXISTS (
 SELECT 1 FROM radar.campaigns c WHERE c.establishment_id=e.id AND c.status='APPROVED'
 AND c.starts_at<=now() AND c.ends_at>now()
)`;
const reclaimable = `(state='cleanup' OR (state IN ('staged','cancelled') AND updated_at<now()-interval '10 minutes'))`;

export function createRadarCoverRepository(db: Sql) {
 const canUpload = async (account:string,id:string) =>
  (await db.unsafe(`SELECT 1 FROM radar.establishments e WHERE e.id=$1::uuid AND ${owner} AND ${promoted}`,[id,account])).length===1;
 return {
  canUpload,
  async canManage(account:string,id:string) {
   return (await db.unsafe(`SELECT 1 FROM radar.establishments e WHERE e.id=$1::uuid AND ${owner}`,[id,account])).length===1;
  },
  async stage(account:string,id:string,key:string) {
   const rows=await db.unsafe(`INSERT INTO radar.cover_objects(establishment_id,storage_key,state)
    SELECT e.id,$3,'staged' FROM radar.establishments e WHERE e.id=$1::uuid AND ${owner} AND ${promoted} FOR UPDATE OF e RETURNING storage_key`,[id,account,key]);
   if(!rows.length)throw Error('RADAR_COVER_FORBIDDEN');
  },
  async publish(account:string,id:string,key:string) {
   await db.begin(async tx=>{
    await tx.unsafe('SELECT 1 FROM radar.establishments WHERE id=$1::uuid FOR UPDATE',[id]);
    await tx.unsafe(`UPDATE radar.cover_objects SET state='cleanup',updated_at=now() WHERE establishment_id=$1::uuid AND state='current'`,[id]);
    const rows=await tx.unsafe(`UPDATE radar.cover_objects SET state='current',updated_at=now()
     WHERE establishment_id=$1::uuid AND storage_key=$3 AND state='staged'
     AND EXISTS (SELECT 1 FROM radar.establishments e WHERE e.id=$1::uuid AND ${owner} AND ${promoted}) RETURNING storage_key`,[id,account,key]);
    if(!rows.length)throw Error('RADAR_COVER_FORBIDDEN');
   });
  },
  async visible(id:string) {
   const [row]=await db.unsafe<{storage_key:string}[]>(`SELECT storage_key FROM radar.cover_objects
    JOIN radar.establishments e ON e.id=establishment_id WHERE e.id=$1::uuid
    AND state='current' AND e.digital_address_ref IS NULL AND ${promoted}`,[id]);
   return row?.storage_key??null;
  },
  async remove(account:string,id:string) {
   return db.begin(async tx=>{
    await tx.unsafe('SELECT 1 FROM radar.establishments WHERE id=$1::uuid FOR UPDATE',[id]);
    const rows=await tx.unsafe(`SELECT 1 FROM radar.establishments e WHERE e.id=$1::uuid AND ${owner}`,[id,account]);
    if(!rows.length)return false;
    await tx.unsafe(`UPDATE radar.cover_objects SET state=CASE WHEN state='current' THEN 'cleanup' ELSE 'cancelled' END,updated_at=now()
     WHERE establishment_id=$1::uuid AND state IN ('current','staged')`,[id]);
    return true;
   });
  },
  async pending(id:string) {
   return db.unsafe<{storage_key:string}[]>(`SELECT storage_key FROM radar.cover_objects
    WHERE establishment_id=$1::uuid AND ${reclaimable} ORDER BY updated_at LIMIT 10`,[id]);
  },
  async claimCleanup(id:string,key:string) {
   const rows=await db.unsafe(`UPDATE radar.cover_objects SET state='cleanup' WHERE establishment_id=$1::uuid
    AND storage_key=$2 AND ${reclaimable} RETURNING storage_key`,[id,key]);
   return rows.length===1;
  },
  async finishCleanup(key:string) {
   await db.unsafe(`DELETE FROM radar.cover_objects WHERE storage_key=$1 AND state='cleanup'`,[key]);
  },
 };
}
