import {test,expect} from "bun:test";
import {createRadarAbuseChecks} from "../radar/abuse";
test("daily registration limit",async()=>{
 for(const total of [0,9,10,11]){
  const checks=createRadarAbuseChecks({unsafe:async(q,p)=>{
   expect(q).toContain("24 hours");expect(p).toEqual(["account"]);return [{total}];
  }});
  expect(await checks.registrationAllowed("account")).toBe(total<10);
 }
});
test("report limits apply to account and establishment",async()=>{
 for(const [total,same,allowed] of [[0,0,true],[5,0,true],[6,0,false],[1,1,false]] as const){
  const checks=createRadarAbuseChecks({unsafe:async(q,p)=>{
   expect(q).toContain("1 minute");expect(p).toEqual(["account","establishment"]);return [{total,same}];
  }});
  expect(await checks.reportAllowed("account","establishment")).toBe(allowed);
 }
});
