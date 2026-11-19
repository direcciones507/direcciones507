import {test,expect} from "bun:test";
import {createGeneralAuth} from "../general-auth";
const db={unsafe:async()=>[]};
const env={AD507_GOOGLE_CLIENT_ID:"test-client",AD507_GOOGLE_CLIENT_SECRET:"test-secret",AD507_SESSION_SECRET:"x".repeat(64),AD507_GOOGLE_REDIRECT_URI:"https://direcciones507.com/auth/google/callback",AD507_AUTH_SUCCESS_URL:"/panel",AD507_PUBLIC_BASE_URL:"https://direcciones507.com",RADAR_ENABLED:"true",AD507_RADAR_DOMAIN_VERIFIED:"true",AD507_GOOGLE_REDIRECT_URI_RADAR:"https://radar.direcciones.lat/auth/google/callback"};
const login=()=>new Request("https://radar.direcciones.lat/auth/google/login");
test("Radar reuses Google client with an explicit host-bound callback",async()=>{
 const auth=createGeneralAuth(db,env);
 const result=await auth.handle(login());
 expect(result?.status).toBe(302);
 const target=new URL(result!.headers.get("location")!);
 expect(target.searchParams.get("redirect_uri")).toBe(env.AD507_GOOGLE_REDIRECT_URI_RADAR);
 expect(target.searchParams.get("client_id")).toBe(env.AD507_GOOGLE_CLIENT_ID);
 expect(result!.headers.get("set-cookie")).toContain("ad507_oauth_state");
});
test("Radar cannot authenticate before release or with an unverified callback",async()=>{
 for(const override of [{RADAR_ENABLED:"false"},{AD507_RADAR_DOMAIN_VERIFIED:"false"},{AD507_GOOGLE_REDIRECT_URI_RADAR:"https://evil.example/auth/google/callback"}]){
  const auth=createGeneralAuth(db,{...env,...override});
  expect((await auth.handle(login()))?.status).toBe(503);
  expect(await auth.currentUser(login())).toBeNull();
 }
});
