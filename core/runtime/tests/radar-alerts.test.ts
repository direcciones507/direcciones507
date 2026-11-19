import {test,expect} from "bun:test";
import {createAlertRoutes} from "../radar/alerts";
const origin="https://radar.direcciones.lat",id="00000000-0000-4000-8000-000000000001",account="00000000-0000-4000-8000-000000000002",allowed=new Set([origin]);
const user={currentUser:async()=>({id:account,roles:[]})},anon={currentUser:async()=>null};
const post=(body:unknown,from=origin)=>new Request(origin+"/v1/radar/alerts",{method:"POST",headers:{origin:from},body:JSON.stringify(body)});
test("alerts require Core account and explicit enablement",async()=>{
 const db={unsafe:async()=>{throw Error("unexpected query")}};
 expect(await createAlertRoutes(db,user,allowed)(post({action:"list"}))).toBeNull();
 expect((await createAlertRoutes(db,anon,allowed,true)(post({action:"list"})))?.status).toBe(403);
 expect((await createAlertRoutes(db,user,allowed,true)(post({action:"list"},"https://other.example")))?.status).toBe(403);
 expect((await createAlertRoutes(db,user,allowed,true)(post({action:"enable",id,activity:"unknown"})))?.status).toBe(400);
});
test("alert configuration is account scoped and opt-in per favorite",async()=>{
 const calls:any[][]=[];const h=createAlertRoutes({unsafe:async(q:string,p:any[])=>{calls.push(p);return q.startsWith("INSERT")?[{establishment_id:id}]:[]}},user,allowed,true);
 expect(await (await h(post({action:"enable",id,activity:"available",accountRef:"spoof"})))?.json()).toEqual({enabled:true});
 expect(await (await h(post({action:"disable",id,activity:"available",accountRef:"spoof"})))?.json()).toEqual({enabled:false});
 expect(calls).toEqual([[account,id,"available"],[account,id,"available"]]);
 expect((await createAlertRoutes({unsafe:async()=>[]},user,allowed,true)(post({action:"enable",id,activity:"full"})))?.status).toBe(404);
});
test("alerts match only the latest current published activity and expose no identities",async()=>{
 const h=createAlertRoutes({unsafe:async(q:string,p:any[])=>{
  expect(p).toEqual([account]);expect(q).toContain("30 minutes");expect(q).toContain("e.published");expect(q).toContain("LIMIT 1");
  return [{id,name:"Cafe",country:"PA",activity:"available",state:"full",reported_at:1},{id,name:"Cafe",country:"PA",activity:"full",state:"full",source:"community",reported_at:2,account_ref:"secret"}];
 }},user,allowed,true);
 const r=await h(post({action:"list"}));expect(r?.headers.get("cache-control")).toBe("private, no-store");
 expect(await r?.json()).toEqual({preferences:[{id,name:"Cafe",country:"PA",activity:"available",match:null},{id,name:"Cafe",country:"PA",activity:"full",match:{state:"full",source:"community",reportedAt:2}}]});
});
