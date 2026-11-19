import {createBusinessRoutes,createBusinessStore} from "./business";
import {radarPresentation} from "./presentation";
import {createRadarCampaignLookup} from "./campaign-repository";
import {createRadarAddressResolver} from "./address-resolver";
import {newPublicAddress} from "../new-address-publication";
import {createRadarAbuseChecks} from "./abuse";
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
 const resolveAddress=ownershipEnabled&&env.RADAR_ADDRESS_LINKS_ENABLED==="true"?createRadarAddressResolver(db,code=>newPublicAddress(db as Parameters<typeof newPublicAddress>[0],code,"https://direcciones.lat")):undefined;
 const campaignLookup=enabled&&env.RADAR_COMMERCIAL_ENABLED==="true"?createRadarCampaignLookup(db,true):undefined;
 const businessEnabled=ownershipEnabled&&env.RADAR_BUSINESS_DETAILS_ENABLED==="true";
 const business=createBusinessRoutes(createBusinessStore(db),auth,origins,businessEnabled);
 const api=createRadarRoutes({...createRadarRepository(db,ownershipEnabled,resolveAddress,businessEnabled),...createRadarAbuseChecks(db)},auth,origins,enabled,campaignLookup);
 const moderation=createModerationStore(db);
 const admin=createModerationRoutes(ownershipEnabled?moderation:{pending:moderation.pending,publish:moderation.publish},auth,origins,enabled);
 return async(req:Request):Promise<Response|null>=>{
  const url=new URL(req.url);
  if(url.origin!==radarOrigin)return null;
  const presentation=await radarPresentation(req,env);if(presentation)return presentation;
  if(!url.pathname.startsWith("/v1/radar/"))return null;
  if(!enabled)return Response.json({error:"RADAR_DISABLED"},{status:503,headers:{"cache-control":"no-store"}});
  return await business(req)??await admin(req)??await api(req)??Response.json({error:"NOT_FOUND"},{status:404});
 };
}
