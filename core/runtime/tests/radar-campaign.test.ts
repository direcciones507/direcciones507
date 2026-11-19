import {test,expect} from "bun:test";
import {createRadarCampaignLookup} from "../radar/campaign-repository";
test("commercial lookup disabled by default never queries database",async()=>{
 const lookup=createRadarCampaignLookup({unsafe:async()=>{throw Error("Disabled");}});
 expect((await lookup(["id"])).size).toBe(0);
});
test("enabled lookup binds IDs and time and maps active campaign",async()=>{
 const now=Date.parse("2026-11-18T00:00:00Z");
 const lookup=createRadarCampaignLookup({unsafe:async(query,params)=>{
  expect(query).toContain("c.status='APPROVED'");
  expect(query).toContain("c.ends_at>$2");
  expect(params).toEqual([JSON.stringify(["id"]),new Date(now).toISOString()]);
  return [{id:"id",kind:"featured",starts_at:new Date(now-1000),ends_at:new Date(now+1000)}];
 }},true);
 expect((await lookup(["id"],now)).get("id")).toEqual({kind:"featured",startsAt:now-1000,endsAt:now+1000});
});
