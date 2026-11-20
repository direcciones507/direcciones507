import type {RadarRepository} from "./routes";
import type {Country,Report} from "./domain";
import type {Bounds,Establishment} from "./public-map";
type Database={unsafe(query:string,params:any[]):PromiseLike<any[]>};
export function createRadarRepository(db:Database,ownershipEnabled=false,resolveAddress?:(id:string,country:Country)=>Promise<Establishment["digitalAddress"]|null>,businessEnabled=false,registrationProfilesEnabled=false):RadarRepository {
 return {
  async register(draft,accountRef) {
   if(draft.registrationKind==='owner'){
    if(!registrationProfilesEnabled||!draft.profile)throw Error('OWNER_REGISTRATION_DISABLED');
    const rows=await db.unsafe(`WITH added AS (
     INSERT INTO radar.establishments(account_ref,name,category,country,latitude,longitude,published)
     VALUES ($1,$2,$3,$4,$5,$6,true) ON CONFLICT DO NOTHING RETURNING id
    ),saved AS (
     INSERT INTO radar.registration_profiles(establishment_id,submitted_by,profile)
     SELECT id,$1::uuid,$7::text::jsonb FROM added RETURNING establishment_id
    ) SELECT establishment_id AS id FROM saved`,[accountRef,draft.name,draft.category,draft.country,draft.latitude,draft.longitude,JSON.stringify(draft.profile)]);
    return rows[0]?.id??null;
   }
   const rows=await db.unsafe(`INSERT INTO radar.establishments(account_ref,name,category,country,latitude,longitude,published)
    VALUES ($1,$2,$3,$4,$5,$6,true)
    ON CONFLICT DO NOTHING RETURNING id`,[accountRef,draft.name,draft.category,draft.country,draft.latitude,draft.longitude]);
   return rows[0]?.id??null;
  },
  async listPublished(country:Country,b:Bounds,search=""):Promise<Establishment[]> {
   const rows=await db.unsafe(`SELECT e.id,e.name,e.category,e.country,e.latitude,e.longitude,e.published,
    e.digital_address_ref IS NOT NULL AS has_link,
    ${registrationProfilesEnabled?"(SELECT profile FROM radar.registration_profiles p WHERE p.establishment_id=e.id)":"NULL"} AS registration_profile,
    ${businessEnabled?"(SELECT jsonb_build_object('hours',d.hours,'quantity',d.quantity,'unit',d.unit,'updatedAt',extract(epoch from d.updated_at)*1000) FROM radar.business_details d JOIN radar.verified_owners o ON o.establishment_id=d.establishment_id AND o.account_ref=d.updated_by WHERE d.establishment_id=e.id)":"NULL"} AS details,
    COALESCE(r.reports,'[]'::jsonb) AS reports
    FROM radar.establishments e
    LEFT JOIN LATERAL (SELECT jsonb_agg(jsonb_build_object('state',a.state,'source',a.source,'createdAt',extract(epoch from a.created_at)*1000)) AS reports
      FROM (SELECT state,source,created_at FROM radar.activity_reports
       WHERE establishment_id=e.id AND created_at > now()-interval '30 minutes'
       ORDER BY created_at DESC,(source='verified_owner') DESC LIMIT 20) a) r ON true
    WHERE e.published AND e.country=$1 AND e.latitude BETWEEN $2 AND $3
    AND (($4::double precision < $5::double precision AND e.longitude BETWEEN $4 AND $5) OR ($4::double precision > $5::double precision AND (e.longitude >= $4 OR e.longitude <= $5)))
    ${search ? "AND (strpos(lower(e.name),lower($6::text))>0 OR strpos(lower(e.category),lower($6::text))>0)" : ""}
    ORDER BY e.id LIMIT 1000`,[country,b.south,b.north,b.west,b.east,...(search?[search]:[])]);
   const establishments:Establishment[]=rows.map(r=>({id:r.id,name:r.name,category:r.category,country:r.country,latitude:Number(r.latitude),longitude:Number(r.longitude),published:r.published,...(r.registration_profile?{registrationProfile:typeof r.registration_profile==="string"?JSON.parse(r.registration_profile):r.registration_profile}:{}),reports:(typeof r.reports==="string"?JSON.parse(r.reports):r.reports) as Report[],...(r.details?{details:typeof r.details==="string"?JSON.parse(r.details):r.details}:{})}));
   if(resolveAddress){
    const linked=establishments.filter((_,i)=>rows[i].has_link===true);
    for(let i=0;i<linked.length;i+=8){
     await Promise.all(linked.slice(i,i+8).map(async e=>{e.digitalAddress=(await resolveAddress(e.id,country))??undefined;}));
    }
   }
   return establishments;
  },
  async findPublished(id) {
   if(ownershipEnabled){
    const rows=await db.unsafe("SELECT e.id,o.account_ref AS owner FROM radar.establishments e LEFT JOIN radar.verified_owners o ON o.establishment_id=e.id WHERE e.id=$1::uuid AND e.published",[id]);
    return rows[0]?{id:rows[0].id,verifiedOwnerAccount:rows[0].owner??null}:null;
   }
   const rows=await db.unsafe("SELECT id FROM radar.establishments WHERE id=$1::uuid AND published",[id]);
   // Until ownership verification is integrated, all reports are community reports.
   return rows[0]?{id:rows[0].id,verifiedOwnerAccount:null}:null;
  },
  async addAnonymousReport(id,digest,state) {
   const rows=await db.unsafe("INSERT INTO radar.activity_reports(establishment_id,anonymous_ref,state,source) SELECT id,$2,$3,'community' FROM radar.establishments WHERE id=$1::uuid AND published RETURNING id",[id,digest,state]);
   if(!rows.length)throw new Error("Establishment unavailable");
  },
  async addReport(id,accountRef,state,source) {
   if(source==="verified_owner"){
    const verified=await db.unsafe(`INSERT INTO radar.activity_reports(establishment_id,account_ref,state,source)
     SELECT e.id,o.account_ref,$3,'verified_owner' FROM radar.establishments e
     JOIN radar.verified_owners o ON o.establishment_id=e.id
     WHERE e.id=$1::uuid AND e.published AND o.account_ref=$2::uuid RETURNING id`,[id,accountRef,state]);
    if(!verified.length)throw new Error("Owner verification required");
    return;
   }
   if(source!=="community")throw new Error("Invalid report source");
   const rows=await db.unsafe(`INSERT INTO radar.activity_reports(establishment_id,account_ref,state,source)
    SELECT id,$2,$3,$4 FROM radar.establishments WHERE id=$1::uuid AND published RETURNING id`,[id,accountRef,state,source]);
   if(!rows.length)throw new Error("Establishment unavailable");
  }
 };
}
