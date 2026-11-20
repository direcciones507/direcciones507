// Adapter for createGeneralAuth(...).currentUser, with no new session store.
export type CoreIdentity = { id:string; roles:readonly string[] };
export type CoreAuth = { currentUser(req:Request):Promise<CoreIdentity|null> };
export type RadarActor = { accountRef:string; isAdmin:boolean };
export async function radarActor(req:Request, auth:CoreAuth, allowedOrigins:ReadonlySet<string>):Promise<RadarActor|null> {
 const origin=req.headers.get("origin");
 if (!origin || !allowedOrigins.has(origin)) return null;
 const user=await auth.currentUser(req);
 if (!user?.id) return null;
 return {accountRef:user.id,isAdmin:user.roles.includes("ADMIN")};
}
// Ownership verification must be looked up server-side for the specific establishment.
export function reportSource(actor:RadarActor, verifiedOwnerAccount:string|null):"community"|"verified_owner" {
 return verifiedOwnerAccount!==null && actor.accountRef===verifiedOwnerAccount ? "verified_owner":"community";
}
