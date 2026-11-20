type Database={unsafe(query:string,params:any[]):PromiseLike<any[]>};
const validId=(v:unknown):v is string=>typeof v==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(v);
export function validateCategoryEntry(body:any){
 if(!body||!['group','category'].includes(body.kind)||!validId(body.id)||typeof body.label!=='string'||!body.label.trim()||body.label.trim().length>100||!Number.isInteger(body.sortOrder)||body.sortOrder<0||body.sortOrder>10000||typeof body.active!=='boolean')return null;
 const base={id:body.id,label:body.label.trim(),sortOrder:body.sortOrder,active:body.active};
 if(body.kind==='group')return validId(body.icon)?{...base,kind:'group' as const,icon:body.icon}:null;
 return validId(body.groupId)&&['tables','rooms','places','units'].includes(body.capacityUnit)?{...base,kind:'category' as const,groupId:body.groupId,capacityUnit:body.capacityUnit as string}:null;
}
export function createCategoryStore(db:Database){return {
 async list(){
 const groups=await db.unsafe('SELECT id,label,icon,sort_order AS "sortOrder",active FROM radar.category_groups ORDER BY sort_order,id',[]);
 const categories=await db.unsafe('SELECT id,group_id AS "groupId",label,sort_order AS "sortOrder",active,capacity_unit AS "capacityUnit" FROM radar.category_catalog ORDER BY sort_order,id',[]);
 return {groups,categories};
 },
 async save(actor:string,input:unknown){
 const v=validateCategoryEntry(input);if(!v)return false;
 const rows=v.kind==='group'?await db.unsafe(`WITH saved AS (
 INSERT INTO radar.category_groups(id,label,sort_order,active,icon) VALUES($1,$2,$3,$4,$5)
 ON CONFLICT(id) DO UPDATE SET label=EXCLUDED.label,sort_order=EXCLUDED.sort_order,active=EXCLUDED.active,icon=EXCLUDED.icon RETURNING id
 ) INSERT INTO ad507.audit_log(actor_user_id,actor_type,action,entity_type,entity_id,metadata)
 SELECT $6::uuid,'ADMIN','RADAR_CATEGORY_GROUP_SAVED','radar_category_group',id,jsonb_build_object('active',$4::boolean) FROM saved RETURNING entity_id`,[v.id,v.label,v.sortOrder,v.active,v.icon,actor]):
 await db.unsafe(`WITH saved AS (
 INSERT INTO radar.category_catalog(id,label,sort_order,active,group_id,capacity_unit)
 SELECT $1,$2,$3,$4,$5,$6 FROM radar.category_groups WHERE id=$5
 ON CONFLICT(id) DO UPDATE SET label=EXCLUDED.label,sort_order=EXCLUDED.sort_order,active=EXCLUDED.active,group_id=EXCLUDED.group_id,capacity_unit=EXCLUDED.capacity_unit RETURNING id
 ) INSERT INTO ad507.audit_log(actor_user_id,actor_type,action,entity_type,entity_id,metadata)
 SELECT $7::uuid,'ADMIN','RADAR_CATEGORY_SAVED','radar_category',id,jsonb_build_object('active',$4::boolean) FROM saved RETURNING entity_id`,[v.id,v.label,v.sortOrder,v.active,v.groupId,v.capacityUnit,actor]);
 return rows.length===1;
 }
};}
