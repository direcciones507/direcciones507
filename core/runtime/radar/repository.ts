import type {RadarRepository} from "./routes";
import type {Country,Report} from "./domain";
import type {Bounds,Establishment} from "./public-map";
type Database={unsafe(query:string,params:any[]):PromiseLike<any[]>};
export function createRadarRepository(db:Database):RadarRepository {
 return {
  async register(draft,accountRef) {
   const rows=await db.unsafe(`INSERT INTO radar.establishments(account_ref,name,category,country,latitude,longitude)
    VALUES ($1,$2,$3,$4,$5,$6)
    ON CONFLICT DO NOTHING RETURNING id`,[accountRef,draft.name,draft.category,draft.country,draft.latitude,draft.longitude]);
   return rows[0]?.id??null;
  },
  async listPublished(country:Country,b:Bounds):Promise<Establishment[]> {
   const rows=await db.unsafe(`SELECT e.id,e.name,e.category,e.country,e.latitude,e.longitude,e.published,
    COALESCE(r.reports,'[]'::jsonb) AS reports
    FROM radar.establishments e
    LEFT JOIN LATERAL (SELECT jsonb_agg(jsonb_build_object('state',a.state,'source',a.source,'createdAt',extract(epoch from a.created_at)*1000)) AS reports
      FROM (SELECT state,source,created_at FROM radar.activity_reports
       WHERE establishment_id=e.id AND created_at > now()-interval '30 minutes'
       ORDER BY created_at DESC,(source='verified_owner') DESC LIMIT 20) a) r ON true
    WHERE e.published AND e.country=$1 AND e.latitude BETWEEN $2 AND $3
    AND (($4 < $5 AND e.longitude BETWEEN $4 AND $5) OR ($4 > $5 AND (e.longitude >= $4 OR e.longitude <= $5)))
    ORDER BY e.id LIMIT 1000`,[country,b.south,b.north,b.west,b.east]);
   return rows.map(r=>({id:r.id,name:r.name,category:r.category,country:r.country,latitude:Number(r.latitude),longitude:Number(r.longitude),published:r.published,reports:(typeof r.reports==="string"?JSON.parse(r.reports):r.reports) as Report[]}));
  },
  async findPublished(id) {
   const rows=await db.unsafe("SELECT id FROM radar.establishments WHERE id=$1::uuid AND published",[id]);
   // Until ownership verification is integrated, all reports are community reports.
   return rows[0]?{id:rows[0].id,verifiedOwnerAccount:null}:null;
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
