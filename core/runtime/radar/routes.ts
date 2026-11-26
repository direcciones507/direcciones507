import {readRadarJson} from "./request-body";
import {countries,type Country,type Report} from "./domain";
import {publicFeatures,validateBounds,type Bounds,type Establishment} from "./public-map";
import {validateRegistration,type EstablishmentDraft} from "./registration";
import {radarActor,reportSource,type CoreAuth} from "./auth";
export interface RadarRepository {
 registrationAllowed?(accountRef:string):Promise<boolean>;
 reportAllowed?(accountRef:string,id:string):Promise<boolean>;
 register?(draft:EstablishmentDraft,accountRef:string):Promise<string|null>;
 listPublished(country:Country,bounds:Bounds,search?:string):Promise<Establishment[]>;
 findPublished(id:string):Promise<{id:string;verifiedOwnerAccount:string|null}|null>;
 addReport(id:string,accountRef:string,state:Report["state"],source:Report["source"]):Promise<void>;
 addAnonymousReport?(id:string,digest:string,state:Report["state"]):Promise<void>;
 anonymousReportAllowed?(digest:string,id:string):Promise<boolean>;
}
const json=(status:number,data:unknown)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});
export function createRadarRoutes(repo:RadarRepository,auth:CoreAuth,origins:ReadonlySet<string>,enabled=false,campaignLookup?:(ids:string[],now:number)=>Promise<Map<string,NonNullable<Establishment["campaign"]>>>,anonymousIdentity?:(req:Request)=>string|null,ownerRegistrationEnabled=false,catalog?:{list():Promise<{groups:any[];categories:any[]}>;lookup(id:string,activeOnly?:boolean):Promise<string|undefined>},privateOwnerRequired=false,commercialModel=false){
 // A per-process admission cap protects the shared pool without using visitor IPs.
 // Tune only after isolated load testing; writes and authentication are independent.
 let activeMapReads=0;
 const maxMapReads=8;
 return async (req:Request):Promise<Response|null>=>{
  const u=new URL(req.url);
  if(!enabled || !["/v1/radar/map","/v1/radar/report","/v1/radar/establishments","/v1/radar/categories"].includes(u.pathname))return null;
  if(u.pathname==="/v1/radar/categories"){
   if(req.method!=="GET")return json(405,{error:"METHOD_NOT_ALLOWED"});
   if(!catalog)return json(200,{dynamic:false});
   return json(200,{dynamic:true,...await catalog.list()});
  }
  if(u.pathname==="/v1/radar/map" && req.method==="GET"){
   const country=u.searchParams.get("country") as Country;
   const keys=["west","south","east","north"] as const;
   if(!countries.includes(country)||keys.some(k=>!u.searchParams.get(k)?.trim()))return json(400,{error:"INVALID_QUERY"});
   const b=Object.fromEntries(keys.map(k=>[k,Number(u.searchParams.get(k))])) as Bounds;
   if(!validateBounds(b))return json(400,{error:"INVALID_BOUNDS"});
   const search=u.searchParams.get("q")?.trim()??"";
   if(search.length>100)return json(400,{error:"INVALID_SEARCH"});
   if(activeMapReads>=maxMapReads)return Response.json({error:"MAP_BUSY"},{status:429,headers:{"cache-control":"no-store","retry-after":"2"}});
   activeMapReads++;
   try{
    const rows=search?await repo.listPublished(country,b,search):await repo.listPublished(country,b);
    const now=Date.now();
    if(campaignLookup){const campaigns=await campaignLookup(rows.map(e=>e.id),now);for(const e of rows)e.campaign=campaigns.get(e.id);}
    return json(200,publicFeatures(rows,b,country,now,!!campaignLookup,commercialModel));
   }finally{activeMapReads--;}

  }
  if(u.pathname==="/v1/radar/establishments" && req.method==="POST"){
   const actor=await radarActor(req,auth,origins);
   if(!actor)return json(403,{error:"AUTH_REQUIRED"});
   if(!repo.register)return json(503,{error:"REGISTRATION_DISABLED"});
   const parsed=await readRadarJson(req,4608);if(!parsed.ok)return json(parsed.status,{error:parsed.error});
   const body=parsed.body;
   const requestedCategory=(body as any)?.category;
   const unit=catalog&&typeof requestedCategory==="string"?await catalog.lookup(requestedCategory.trim(),true):undefined;
   if(catalog&&!unit)return json(400,{error:"INVALID_CATEGORY"});
   const draft=validateRegistration(body,unit,privateOwnerRequired);
   if(!draft)return json(400,{error:"INVALID_ESTABLISHMENT"});
   if(draft.registrationKind==='owner'&&!ownerRegistrationEnabled)return json(503,{error:"OWNER_REGISTRATION_DISABLED"});
   if(repo.registrationAllowed && !await repo.registrationAllowed(actor.accountRef))return json(429,{error:"REGISTRATION_RATE_LIMIT"});
   try {
    const id=await repo.register(draft,actor.accountRef);
    return id?json(201,{id,status:"published"}):json(409,{error:"DUPLICATE"});
   } catch(error) {
    if(draft.registrationKind==='owner'&&(error as {code?:string})?.code==='42P01')return json(503,{error:"OWNER_REGISTRATION_DISABLED"});
    if((error as {code?:string})?.code==="P4290")return json(429,{error:"REGISTRATION_RATE_LIMIT"});
    throw error;
   }
  }
  if(u.pathname==="/v1/radar/report" && req.method==="POST"){
   const origin=req.headers.get("origin");
   if(!origin||!origins.has(origin))return json(403,{error:"AUTH_REQUIRED"});
   const actor=await radarActor(req,auth,origins);
   const digest=actor?null:anonymousIdentity?.(req);
   if(!actor&&(!digest||!/^[0-9a-f]{64}$/.test(digest)||!repo.addAnonymousReport))return json(403,{error:"AUTH_REQUIRED"});
   const parsed=await readRadarJson(req,2048);if(!parsed.ok)return json(parsed.status,{error:parsed.error});
   const body=parsed.body as any;
   if(!body||typeof body.id!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)||!["available","queue","full","incident"].includes(body.state))return json(400,{error:"INVALID_REPORT"});
   const e=await repo.findPublished(body.id);
   if(!e)return json(404,{error:"NOT_FOUND"});
   if(actor&&repo.reportAllowed&&!await repo.reportAllowed(actor.accountRef,e.id))return json(429,{error:"REPORT_RATE_LIMIT"});
   if(!actor&&repo.anonymousReportAllowed&&!await repo.anonymousReportAllowed(digest!,e.id))return json(429,{error:"REPORT_RATE_LIMIT"});
   try {
    if(actor)await repo.addReport(e.id,actor.accountRef,body.state,reportSource(actor,e.verifiedOwnerAccount));
    else await repo.addAnonymousReport!(e.id,digest!,body.state);
   }
   catch(error){if((error as {code?:string})?.code==="P4290")return json(429,{error:"REPORT_RATE_LIMIT"});throw error;}
   return json(201,{ok:true});
  }
  return json(405,{error:"METHOD_NOT_ALLOWED"});
 };
}
