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
 const ownershipEnabled=enabled&&env.RADAR_OWNERSHIP_ENABLED==="true";
 const api=createRadarRoutes(createRadarRepository(db,ownershipEnabled),auth,origins,enabled);
 const moderation=createModerationStore(db);
 const admin=createModerationRoutes(ownershipEnabled?moderation:{pending:moderation.pending,publish:moderation.publish},auth,origins,enabled);
 return async(req:Request):Promise<Response|null>=>{
  const url=new URL(req.url);
  if(url.origin!==radarOrigin||!url.pathname.startsWith("/v1/radar/"))return null;
  if(!enabled)return Response.json({error:"RADAR_DISABLED"},{status:503,headers:{"cache-control":"no-store"}});
  return await admin(req)??await api(req)??Response.json({error:"NOT_FOUND"},{status:404});
 };
}
