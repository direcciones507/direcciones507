import {createRadarRoutes} from "./routes";
import {createRadarRepository} from "./repository";
import {createModerationRoutes} from "./moderation";
import {createModerationStore} from "./moderation-repository";
import type {CoreAuth} from "./auth";
type Database=Parameters<typeof createRadarRepository>[0];
export const radarOrigin="https://radar.direcciones.lat";
export function createRadarIntegration(db:Database,auth:CoreAuth,env:Record<string,string|undefined>){
 const enabled=env.RADAR_ENABLED==="true";
 const origins=new Set([radarOrigin]);
 const api=createRadarRoutes(createRadarRepository(db),auth,origins,enabled);
 const admin=createModerationRoutes(createModerationStore(db),auth,origins,enabled);
 return async(req:Request):Promise<Response|null>=>{
  const url=new URL(req.url);
  if(url.origin!==radarOrigin||!url.pathname.startsWith("/v1/radar/"))return null;
  if(!enabled)return Response.json({error:"RADAR_DISABLED"},{status:503,headers:{"cache-control":"no-store"}});
  return await admin(req)??await api(req)??Response.json({error:"NOT_FOUND"},{status:404});
 };
}
