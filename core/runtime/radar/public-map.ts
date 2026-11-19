import { countries, validCoordinates, currentActivity, visiblePin, type Country, type Report, type Pin } from "./domain";
export type Bounds = { west:number; south:number; east:number; north:number };
export type Establishment = { id:string; name:string; category:string; country:Country; latitude:number; longitude:number; published:boolean; reports:readonly Report[]; campaign?:{kind:Exclude<Pin,"normal">;startsAt:number;endsAt:number}; digitalAddress?:{publicUrl:string; publiclyVisible:boolean; residential:boolean; active:boolean} };
export function validateBounds(b:Bounds):boolean {
 return validCoordinates(b.south,b.west) && validCoordinates(b.north,b.east) && b.south<b.north && b.west!==b.east;
}
function inBounds(e:Establishment,b:Bounds):boolean {
 return e.latitude>=b.south && e.latitude<=b.north && (b.west<b.east ? e.longitude>=b.west && e.longitude<=b.east : e.longitude>=b.west || e.longitude<=b.east);
}
function addressLink(a:Establishment["digitalAddress"]):string|null {
 if (!a?.publiclyVisible || a.residential || !a.active) return null;
 try { const u=new URL(a.publicUrl); return u.protocol==="https:" && !u.username && !u.password && (!u.port || u.port==="443") && ["direcciones507.com","www.direcciones507.com","direcciones.lat","www.direcciones.lat"].includes(u.hostname) ? u.href : null; } catch {return null;}
}
// Inputs must come from authorized server-side records, never client-supplied visibility flags.
export function publicFeatures(rows:readonly Establishment[], bounds:Bounds, country:Country, now:number, commercialEnabled=false) {
 if (!validateBounds(bounds) || !countries.includes(country)) throw new RangeError("Invalid map query");
 return {type:"FeatureCollection" as const,features:rows.filter(e=>e.published && e.country===country && validCoordinates(e.latitude,e.longitude) && inBounds(e,bounds)).slice(0,1000).map(e=>{
 const report=currentActivity(e.reports,now);
 return {type:"Feature" as const,id:e.id,geometry:{type:"Point" as const,coordinates:[e.longitude,e.latitude]},properties:{name:e.name,category:e.category,pin:visiblePin(e.campaign??null,now,commercialEnabled),activity:report?.state??"unknown",reportedAt:report?.createdAt??null,source:report?.source??null,digitalAddressUrl:addressLink(e.digitalAddress)}};
 })};
}
