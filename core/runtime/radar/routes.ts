import {countries,type Country,type Report} from "./domain";
import {publicFeatures,validateBounds,type Bounds,type Establishment} from "./public-map";
import {validateRegistration,type EstablishmentDraft} from "./registration";
import {radarActor,reportSource,type CoreAuth} from "./auth";
export interface RadarRepository {
 registrationAllowed?(accountRef:string):Promise<boolean>;
 reportAllowed?(accountRef:string,id:string):Promise<boolean>;
 register?(draft:EstablishmentDraft,accountRef:string):Promise<string|null>;
 listPublished(country:Country,bounds:Bounds):Promise<Establishment[]>;
 findPublished(id:string):Promise<{id:string;verifiedOwnerAccount:string|null}|null>;
 addReport(id:string,accountRef:string,state:Report["state"],source:Report["source"]):Promise<void>;
}
const json=(status:number,data:unknown)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});
export function createRadarRoutes(repo:RadarRepository,auth:CoreAuth,origins:ReadonlySet<string>,enabled=false){
 return async (req:Request):Promise<Response|null>=>{
  const u=new URL(req.url);
  if(!enabled || !["/v1/radar/map","/v1/radar/report","/v1/radar/establishments"].includes(u.pathname))return null;
  if(u.pathname==="/v1/radar/map" && req.method==="GET"){
   const country=u.searchParams.get("country") as Country;
   const keys=["west","south","east","north"] as const;
   if(!countries.includes(country)||keys.some(k=>!u.searchParams.get(k)?.trim()))return json(400,{error:"INVALID_QUERY"});
   const b=Object.fromEntries(keys.map(k=>[k,Number(u.searchParams.get(k))])) as Bounds;
   if(!validateBounds(b))return json(400,{error:"INVALID_BOUNDS"});
   return json(200,publicFeatures(await repo.listPublished(country,b),b,country,Date.now()));
  }
  if(u.pathname==="/v1/radar/establishments" && req.method==="POST"){
   const actor=await radarActor(req,auth,origins);
   if(!actor)return json(403,{error:"AUTH_REQUIRED"});
   if(!repo.register)return json(503,{error:"REGISTRATION_DISABLED"});
   let body:unknown;
   try{const raw=await req.text();if(raw.length>4096)return json(413,{error:"BODY_TOO_LARGE"});body=JSON.parse(raw);}catch{return json(400,{error:"INVALID_BODY"});}
   const draft=validateRegistration(body);
   if(!draft)return json(400,{error:"INVALID_ESTABLISHMENT"});
   if(repo.registrationAllowed && !await repo.registrationAllowed(actor.accountRef))return json(429,{error:"REGISTRATION_RATE_LIMIT"});
   const id=await repo.register(draft,actor.accountRef);
   return id?json(201,{id,status:"pending"}):json(409,{error:"DUPLICATE"});
  }
  if(u.pathname==="/v1/radar/report" && req.method==="POST"){
   const actor=await radarActor(req,auth,origins);
   if(!actor)return json(403,{error:"AUTH_REQUIRED"});
   let body:any;
   try {const raw=await req.text();if(raw.length>2048)return json(413,{error:"BODY_TOO_LARGE"});body=JSON.parse(raw);}catch{return json(400,{error:"INVALID_BODY"});}
   if(!body||typeof body.id!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)||!["available","queue","full","incident"].includes(body.state))return json(400,{error:"INVALID_REPORT"});
   const e=await repo.findPublished(body.id);
   if(!e)return json(404,{error:"NOT_FOUND"});
   if(repo.reportAllowed && !await repo.reportAllowed(actor.accountRef,e.id))return json(429,{error:"REPORT_RATE_LIMIT"});
   await repo.addReport(e.id,actor.accountRef,body.state,reportSource(actor,e.verifiedOwnerAccount));
   return json(201,{ok:true});
  }
  return json(405,{error:"METHOD_NOT_ALLOWED"});
 };
}
