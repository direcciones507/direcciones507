import {verifiedRadarOrdersEnabled} from './verified-orders';
import {radarAnnualUntil} from './annual-memberships';
import {createRadarCoverRoutes} from "./cover-routes";
import type {Sql} from "postgres";
import {createAlertRoutes} from "./alerts";
import {createReputationRoutes} from "./reputation";
import {createContributionRoutes} from "./contributions";
import {createFavoriteRoutes} from "./favorites";
import {createConfirmationRoutes} from "./confirmations";
import {createAnonymousIdentity} from "./anonymous-identity";
import {createBusinessRoutes,createBusinessStore} from "./business";
import {radarPresentation} from "./presentation";
import {createRadarCampaignLookup} from "./campaign-repository";
import {createRadarAddressResolver} from "./address-resolver";
import {createRadarAbuseChecks} from "./abuse";
import {createCategoryStore} from "./category-catalog";
import {createRadarRoutes} from "./routes";
import {createRadarRepository} from "./repository";
import {createModerationRoutes} from "./moderation";
import {createModerationStore} from "./moderation-repository";
import type {CoreAuth} from "./auth";
type Database=Parameters<typeof createRadarRepository>[0];
export const radarOrigin="https://radar.direcciones.lat";
// Railway terminates TLS before Bun. Only canonical Radar host requests may
// be normalized, and only when the configured domain is verified and the
// Railway edge marks the original connection as HTTPS. Never use forwarded host.
export function normalizeRadarRequest(req:Request,env:Record<string,string|undefined>):Request {
 const url=new URL(req.url);
 if(env.AD507_RADAR_DOMAIN_VERIFIED!=="true"||url.hostname!=="radar.direcciones.lat"||url.protocol!=="http:"||url.username||url.password||(url.port&&url.port!=="8080")||req.headers.get("x-forwarded-proto")!=="https")return req;
 url.protocol="https:";url.port="";
 return new Request(url.toString(),req);
}
export function createRadarIntegration(db:Database,auth:CoreAuth,env:Record<string,string|undefined>,trustedPeer?:(req:Request)=>string|null){
 const enabled=env.RADAR_ENABLED==="true";
 const origins=new Set([radarOrigin]);
 const ownershipEnabled=enabled&&env.RADAR_OWNERSHIP_ENABLED==="true";
 const resolveAddress=ownershipEnabled&&env.RADAR_ADDRESS_LINKS_ENABLED==="true"?createRadarAddressResolver(db):undefined;
 const campaignLookup=enabled&&env.RADAR_COMMERCIAL_ENABLED==="true"?createRadarCampaignLookup(db,true,verifiedRadarOrdersEnabled(env)):undefined;
 const businessEnabled=ownershipEnabled&&env.RADAR_BUSINESS_DETAILS_ENABLED==="true";
 const profilesEnabled=businessEnabled&&env.RADAR_REGISTRATION_PROFILES_ENABLED==='true';
 const covers=createRadarCoverRoutes(db as Sql,auth,env);
 const business=createBusinessRoutes(createBusinessStore(db,profilesEnabled),auth,origins,businessEnabled);
 const anonymousIdentity=enabled&&env.RADAR_ANONYMOUS_REPORTS_ENABLED==="true"?createAnonymousIdentity(env.RADAR_ANONYMOUS_REPORTS_SECRET,trustedPeer):undefined;
 const alerts=createAlertRoutes(db,auth,origins,enabled&&env.RADAR_FAVORITES_ENABLED==="true"&&env.RADAR_ALERTS_ENABLED==="true");
 const reputation=createReputationRoutes(db,auth,origins,enabled&&env.RADAR_REPUTATION_ENABLED==="true");
 const contributions=createContributionRoutes(db,auth,origins,enabled&&env.RADAR_CONTRIBUTIONS_ENABLED==="true");
 const favorites=createFavoriteRoutes(db,auth,origins,enabled&&env.RADAR_FAVORITES_ENABLED==="true");
 const confirmations=createConfirmationRoutes(db,auth,origins,enabled&&env.RADAR_ACTIVITY_VALIDATION_ENABLED==="true",anonymousIdentity);
 const catalog=enabled&&env.RADAR_CATEGORY_CATALOG_ENABLED==="true"?createCategoryStore(db):undefined;
 const api=createRadarRoutes({...createRadarRepository(db,ownershipEnabled,resolveAddress,businessEnabled,profilesEnabled,profilesEnabled&&env.RADAR_OWNER_PRIVATE_ENABLED==='true'),...createRadarAbuseChecks(db)},auth,origins,enabled,campaignLookup,anonymousIdentity,profilesEnabled,catalog,profilesEnabled&&env.RADAR_OWNER_PRIVATE_ENABLED==='true',env.RADAR_COMMERCIAL_MODEL_ENABLED==='true',(ids,now)=>radarAnnualUntil(db,ids,now,verifiedRadarOrdersEnabled(env)));
 const moderation=createModerationStore(db);
 const admin=createModerationRoutes(ownershipEnabled?moderation:{pending:moderation.pending,publish:moderation.publish},auth,origins,enabled);
 return async(req:Request):Promise<Response|null>=>{
  req=normalizeRadarRequest(req,env);
  const url=new URL(req.url);
  if(url.origin!==radarOrigin)return null;
  const presentation=await radarPresentation(req,{...env,RADAR_ANONYMOUS_REPORTS_ENABLED:anonymousIdentity?"true":"false"});if(presentation)return presentation;
  if(!url.pathname.startsWith("/v1/radar/"))return null;
  let response:Response;
  try{
   response=!enabled?Response.json({error:"RADAR_DISABLED"},{status:503}):
    (businessEnabled?await covers(req):null)??await business(req)??await admin(req)??await confirmations(req)??await favorites(req)??await contributions(req)??await reputation(req)??await alerts(req)??await api(req)??Response.json({error:"NOT_FOUND"},{status:404});
  }catch{
   // Keep diagnostics free of SQL text, credentials, request payloads and account IDs.
   console.error("RADAR_API_UNEXPECTED_ERROR");
   response=Response.json({error:"RADAR_API_UNAVAILABLE"},{status:500});
  }
  // API responses must never become indexable or cacheable, even after public SEO release.
  const headers=new Headers(response.headers);
  headers.set("x-robots-tag","noindex, nofollow");
  headers.set("x-content-type-options","nosniff");
  if(!headers.get("cache-control")?.includes("no-store"))headers.set("cache-control","no-store");
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
 };
}
