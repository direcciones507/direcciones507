import {test,expect} from "bun:test";
import {participationLevel,createReputationRoutes} from "../radar/reputation";
const origin="https://radar.direcciones.lat",account="00000000-0000-4000-8000-000000000001",allowed=new Set([origin]);
const user={currentUser:async()=>({id:account,roles:[]})},anon={currentUser:async()=>null};
const post=(body:unknown={action:"summary"},from=origin)=>new Request(origin+"/v1/radar/reputation",{method:"POST",headers:{origin:from},body:JSON.stringify(body)});
test("participation indicator requires corroboration on distinct days",()=>{
 expect(participationLevel(90,0)).toBe("initial");
 expect(participationLevel(4,3)).toBe("initial");
 expect(participationLevel(5,3)).toBe("active");
 expect(participationLevel(15,9)).toBe("active");
 expect(participationLevel(15,10)).toBe("constant");
});
test("reputation is private and disabled by default",async()=>{
 const db={unsafe:async()=>{throw Error("unexpected database access")}};
 expect(await createReputationRoutes(db,user,allowed)(post())).toBeNull();
 expect((await createReputationRoutes(db,anon,allowed,true)(post()))?.status).toBe(403);
 expect((await createReputationRoutes(db,user,allowed,true)(post(undefined,"https://other.example")))?.status).toBe(403);
});
test("summary uses server identity, excludes anonymous/own votes and conflicting corroboration",async()=>{
 const handler=createReputationRoutes({unsafe:async(q:string,p:any[])=>{
  expect(p).toEqual([account]);expect(q).toContain("c.account_ref IS NOT NULL");expect(q).toContain("c.account_ref<>$1::uuid");expect(q).toContain("count(DISTINCT c.account_ref) FILTER (WHERE c.agrees)>=2");expect(q).toContain("count(*) FILTER (WHERE NOT c.agrees)=0");expect(q).toContain("90 days");expect(q).toContain("30 minutes");
  return [{reports:10,validations:24,days:6,corroborated_days:4,account_ref:"secret"}];
 }},user,allowed,true);
 const r=await handler(post({action:"summary",accountRef:"spoof",level:"constant"}));expect(r?.headers.get("cache-control")).toBe("private, no-store");
 expect(await r?.json()).toEqual({reports:10,validations:24,days:6,corroboratedDays:4,level:"active",windowDays:90});
});
