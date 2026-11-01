import {CODE_NAMESPACE_LOCK,personalizedCode,assertCodeAvailable,verifyHistoricalCustomCode,addressPublicUrl} from './custom-public-code';
import type { Sql } from 'postgres';
import { validateRequestDraft, type RequestFile } from './request-validation';
import { createR2Storage, type R2Settings } from './r2-storage';

const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export function createAddressEditing(sql:Sql,options:{r2:R2Settings|null;fetch?:typeof fetch}) {
  async function access(tx:any,actorId:string,id:string,admin:boolean,lock=false) {
    if(!uuid.test(id)||!uuid.test(actorId))throw Error('REQUEST_NOT_FOUND');
    const rows=await tx.unsafe(`SELECT a.*,a.updated_at::text AS version FROM ad507.addresses a
      JOIN ad507.users u ON u.id=$1::uuid AND u.status='ACTIVE'
      WHERE a.id=$2::uuid AND a.source='USER_REQUEST' AND a.address_type IN ('BUSINESS','PLACE')
      AND a.status='ACTIVE' AND a.publication_receipt IS NOT NULL
      AND (${admin?`EXISTS(SELECT 1 FROM ad507.user_roles r WHERE r.user_id=u.id AND r.role='ADMIN')`:
      `EXISTS(SELECT 1 FROM ad507.address_ownership o WHERE o.address_id=a.id AND o.user_id=u.id AND o.ownership_role='OWNER') AND EXISTS(SELECT 1 FROM ad507.user_roles r WHERE r.user_id=u.id AND r.role IN ('CLIENT','ADMIN'))`}) ${lock?'FOR UPDATE OF a':''}`,[actorId,id]);
    if(!rows.length)throw Error('REQUEST_NOT_FOUND');
    // Imported Pages records require the separate, explicit migration procedure.
    if(rows[0].request_data?.migration)throw Error('HISTORICAL_EDIT_NOT_ENABLED');
    return rows[0];
  }
  async function snapshot(tx:any,row:any) {
    const media=await tx.unsafe('SELECT id::text,media_type,storage_key,url,position,is_primary,upload_status FROM ad507.address_media WHERE address_id=$1::uuid ORDER BY position,id',[row.id]);
    const socials=await tx.unsafe('SELECT platform,url FROM ad507.address_socials WHERE address_id=$1::uuid ORDER BY platform',[row.id]);
    return {name:row.name,reference:row.reference,description:row.description,commercialDescription:row.commercial_description,phone:row.phone,landlinePhone:row.landline_phone,hours:row.hours,latitude:row.latitude,longitude:row.longitude,extras:row.request_data,media,socials};
  }
  async function audit(tx:any,actorId:string,id:string,admin:boolean,action:string,before:any,after:any) {
    await tx.unsafe(`INSERT INTO ad507.audit_log(actor_user_id,actor_type,action,entity_type,entity_id,before_json,after_json) VALUES($1::uuid,$2,$3,'ADDRESS',$4,$5::jsonb,$6::jsonb)`,[actorId,admin?'ADMIN':'USER',action,id,tx.json(before),tx.json(after)]);
  }
  return {
    async history(actorId:string,id:string,admin:boolean) {
      await access(sql,actorId,id,admin);
      return sql.unsafe(`SELECT id::text,action,actor_type AS "actorType",created_at AS "createdAt",before_json AS before,after_json AS after FROM ad507.audit_log WHERE entity_type='ADDRESS' AND entity_id=$1 AND action IN ('ADDRESS_EDITED','LOCATION_REQUESTED','LOCATION_APPROVED','LOCATION_REJECTED') ORDER BY id DESC LIMIT 100`,[id]);
    },
    async edit(actorId:string,id:string,raw:any,files:RequestFile[],admin:boolean) {
      if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!['version','namedCode','name','reference','description','commercialDescription','phone','landlinePhone','hours','instagram','facebook','tiktok','latitude','longitude','retainMedia','newCover'].includes(k)))throw Error('INVALID_REQUEST');
      const row=await access(sql,actorId,id,admin);
      if(raw.version!==row.version)throw Error('EDIT_CONFLICT');
      const before=await snapshot(sql,row),plan=row.request_data.plan;
      const custom=raw.namedCode===undefined?null:personalizedCode(plan,raw.namedCode);
      if(custom)await verifyHistoricalCustomCode(custom,options.fetch);
      const retained=raw.retainMedia??before.media.map((m:any)=>m.id);
      if(!Array.isArray(retained)||retained.some((id:any)=>typeof id!=='string'||!before.media.some((m:any)=>m.id===id&&m.upload_status==='READY'))||new Set(retained).size!==retained.length)throw Error('INVALID_MEDIA');
      const keep=retained.map((id:string)=>before.media.find((m:any)=>m.id===id));
      const count=(type:string)=>keep.filter((m:any)=>m.media_type===type).length+files.filter(f=>f.role===(type==='LOGO'?'logo':'photo')).length;
      const allowsDescription=['PLACE','BUSINESS_PREMIUM_PRO'].includes(plan);
      if(!allowsDescription&&raw.description)throw Error('CAPABILITY_VIOLATION');
      if(plan!=='BUSINESS_PREMIUM_PRO'&&raw.commercialDescription)throw Error('CAPABILITY_VIOLATION');
      const oldSocials=Object.fromEntries(before.socials.map((s:any)=>[s.platform,s.url]));
      const data=validateRequestDraft({type:row.address_type,plan,countryCode:row.country_code,
        name:raw.name??row.name,reference:raw.reference??row.reference,description:allowsDescription?(raw.description??row.description??''):'',
        commercialDescription:plan==='BUSINESS_PREMIUM_PRO'?(raw.commercialDescription??row.commercial_description??''):'',
        phone:raw.phone===undefined?row.phone:raw.phone,landlinePhone:raw.landlinePhone===undefined?row.landline_phone:raw.landlinePhone,hours:raw.hours??row.hours??'',
        instagram:raw.instagram??oldSocials.instagram??'',facebook:raw.facebook??oldSocials.facebook??'',tiktok:raw.tiktok??oldSocials.tiktok??'',
        latitude:Number(row.latitude),longitude:Number(row.longitude),media:{logos:count('LOGO'),placePhotos:row.address_type==='PLACE'?count('IMAGE'):0,galleryPhotos:row.address_type==='PLACE'?0:count('IMAGE')}});
      let location:any=null;
      if(raw.latitude!==undefined||raw.longitude!==undefined){
        if(typeof raw.latitude!=='number'||!Number.isFinite(raw.latitude)||raw.latitude < -90||raw.latitude>90||typeof raw.longitude!=='number'||!Number.isFinite(raw.longitude)||raw.longitude < -180||raw.longitude>180)throw Error('INVALID_COORDINATES');
        if(raw.latitude!==Number(row.latitude)||raw.longitude!==Number(row.longitude))location={latitude:raw.latitude,longitude:raw.longitude,requestId:crypto.randomUUID(),requestedBy:actorId,requestedAt:new Date().toISOString()};
      }
      if(files.length&&!options.r2)throw Error('R2_NOT_READY');
      const uploaded:any[]=[];
      if(files.length){
        const storage=createR2Storage(options.r2!,{fetch:options.fetch,
          authorize:async scope=>{if(scope.ownerId!==actorId||scope.addressId!==id||scope.action!=='upload')return false;await access(sql,actorId,id,admin);return true;},
          // Durable recovery references survive ambiguous PUT results. Old files stay intact.
          registerIntent:async scope=>{await audit(sql,actorId,id,admin,'EDIT_MEDIA_UPLOAD_INTENT',null,{storageKey:scope.storageKey,role:scope.role});}});
        for(const file of files){const stored=await storage.storeOptimized({...file,ownerId:actorId,addressId:id,countryCode:row.country_code});uploaded.push({media_type:file.role==='logo'?'LOGO':'IMAGE',storage_key:stored.storageKey,url:null,upload_status:'READY'});}
      }
      if(raw.newCover!==undefined&&typeof raw.newCover!=='boolean')throw Error('INVALID_REQUEST');
      const nextMedia=[...keep,...uploaded];
      if(raw.newCover){const index=nextMedia.findIndex(m=>uploaded.includes(m)&&m.media_type==='IMAGE');if(index<0)throw Error('INVALID_MEDIA');const [cover]=nextMedia.splice(index,1);const first=nextMedia.findIndex(m=>m.media_type==='IMAGE');nextMedia.splice(first<0?nextMedia.length:first,0,cover);}
      if(new Set(nextMedia.map(m=>m.storage_key??m.url)).size!==nextMedia.length)throw Error('DUPLICATE_MEDIA');
      const saved=await sql.begin(async tx=>{
        if(custom)await tx.unsafe('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[CODE_NAMESPACE_LOCK]);
        const current=await access(tx,actorId,id,admin,true);if(current.version!==raw.version)throw Error('EDIT_CONFLICT');
        if(custom)await assertCodeAvailable(tx,id,custom);
        const aliases=[...new Set([...(current.request_data.codeAliases??[]),...(custom&&current.request_data.publicCode?[current.request_data.publicCode]:[])])];
        const extras={...current.request_data,...(custom?{namedCode:raw.namedCode,publicCode:custom,codeAliases:aliases}:{}),media:data.media,...(location?{pendingLocation:admin?null:location}:{})};
        await tx.unsafe(`UPDATE ad507.addresses SET name=$2,reference=$3,description=$4,commercial_description=$5,phone=$6,landline_phone=$7,hours=$8,latitude=$9,longitude=$10,request_data=$11::jsonb,updated_at=clock_timestamp() WHERE id=$1::uuid`,[id,data.name,data.reference,allowsDescription?data.description:current.description,plan==='BUSINESS_PREMIUM_PRO'?data.commercialDescription:current.commercial_description,data.phone,data.landlinePhone,data.hours,admin&&location?location.latitude:current.latitude,admin&&location?location.longitude:current.longitude,tx.json(extras)]);
        if([...new Set([...Object.keys(data.socials),...Object.keys(oldSocials)])].some(key=>data.socials[key]!==oldSocials[key])){
          await tx.unsafe('DELETE FROM ad507.address_socials WHERE address_id=$1::uuid',[id]);
          for(const [platform,url]of Object.entries(data.socials))await tx.unsafe('INSERT INTO ad507.address_socials(address_id,platform,url) VALUES($1::uuid,$2,$3)',[id,platform,url]);
        }
        // Update active media associations; obsolete R2 objects are deleted after commit.
        if(uploaded.length||raw.newCover||retained.length!==before.media.length||retained.some((mediaId:string,i:number)=>mediaId!==before.media[i].id)){
          await tx.unsafe('DELETE FROM ad507.address_media WHERE address_id=$1::uuid',[id]);
          for(const [i,m]of nextMedia.entries())await tx.unsafe(`INSERT INTO ad507.address_media(id,address_id,media_type,storage_key,url,position,is_primary,upload_status) VALUES($1::uuid,$2::uuid,$3,$4,$5,$6,$7,'READY')`,[m.id??crypto.randomUUID(),id,m.media_type,m.storage_key,m.url,i,nextMedia.findIndex(v=>v.media_type===m.media_type)===i]);
        }
        const updated=await access(tx,actorId,id,admin);await audit(tx,actorId,id,admin,'ADDRESS_EDITED',before,await snapshot(tx,updated));
        if(location)await audit(tx,actorId,id,admin,admin?'LOCATION_APPROVED':'LOCATION_REQUESTED',{latitude:current.latitude,longitude:current.longitude,pendingLocation:current.request_data.pendingLocation??null},admin?location:{pendingLocation:location});
        return {id,code:current.code,publicCode:extras.publicCode??current.code,publicUrl:addressPublicUrl({...current,request_data:extras}),status:current.status,version:updated.version};
      });
      // After the database commit, delete replaced objects no longer referenced by any address.
      // Failures are recorded for cleanup without rolling back a successful edit.
      if(options.r2){
        const removed=before.media.filter((m:any)=>m.storage_key&&!nextMedia.some(n=>n.storage_key===m.storage_key));
        if(removed.length){
          const storage=createR2Storage(options.r2,{fetch:options.fetch,
            authorize:async scope=>scope.ownerId===actorId&&scope.addressId===id&&scope.action==='delete'&&!!scope.storageKey,
            registerIntent:async()=>{}});
          for(const m of removed){
            const inUse=await sql.unsafe('SELECT 1 FROM ad507.address_media WHERE storage_key=$1 LIMIT 1',[m.storage_key]);
            if(inUse.length)continue;
            let lastError:unknown;
            for(let attempt=0;attempt<3;attempt++){
              try{
                await storage.deletePrivate({ownerId:actorId,addressId:id,role:m.media_type==='LOGO'?'logo':'photo',countryCode:row.country_code,storageKey:m.storage_key});
                lastError=undefined;
                break;
              }catch(error){lastError=error;}
            }
            if(lastError){
              await audit(sql,actorId,id,admin,'EDIT_MEDIA_DELETE_FAILED',null,{storageKey:m.storage_key,error:String(lastError)});
              // Never report complete cleanup when an obsolete R2 object still exists.
              throw Error('R2_DELETE_FAILED');
            }
          }
        }
      }
      return saved;
    },
    async reviewLocation(actorId:string,id:string,raw:any,approved:boolean) {
      if(!raw||typeof raw.version!=='string'||typeof raw.requestId!=='string'||Object.keys(raw).some(k=>!['version','requestId'].includes(k)))throw Error('INVALID_REQUEST');
      return sql.begin(async tx=>{
        const row=await access(tx,actorId,id,true,true),pending=row.request_data.pendingLocation;
        if(row.version!==raw.version||!pending||pending.requestId!==raw.requestId)throw Error('EDIT_CONFLICT');
        if(typeof pending.latitude!=='number'||!Number.isFinite(pending.latitude)||Math.abs(pending.latitude)>90||typeof pending.longitude!=='number'||!Number.isFinite(pending.longitude)||Math.abs(pending.longitude)>180)throw Error('INVALID_COORDINATES');
        const before=await snapshot(tx,row);
        await tx.unsafe(`UPDATE ad507.addresses SET latitude=$2,longitude=$3,request_data=request_data-'pendingLocation',updated_at=clock_timestamp() WHERE id=$1::uuid`,[id,approved?pending.latitude:row.latitude,approved?pending.longitude:row.longitude]);
        await audit(tx,actorId,id,true,approved?'LOCATION_APPROVED':'LOCATION_REJECTED',before,{...await snapshot(tx,await access(tx,actorId,id,true)),reviewedRequest:pending});
        return {id,approved};
      });
    }
  };
}
