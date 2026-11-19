import {test,expect} from "bun:test";
import {createConfirmationRoutes} from "../radar/confirmations";
const origin="https://radar.direcciones.lat",id="00000000-0000-4000-8000-000000000001",account="00000000-0000-4000-8000-000000000002";
const allowed=new Set([origin]),anon={currentUser:async()=>null},user={currentUser:async()=>({id:account,roles:[]})};
const post=(body:unknown={reportId:id,agrees:true},from=origin)=>new Request(origin+"/v1/radar/activity-validation",{method:"POST",headers:{origin:from},body:JSON.stringify(body)});
test("activity validation disabled by default and anonymous requires trusted identity",async()=>{
 const db={unsafe:async()=>{throw Error("unexpected call")}};
 expect(await createConfirmationRoutes(db,anon,allowed)(post())).toBeNull();
 expect((await createConfirmationRoutes(db,anon,allowed,true)(post()))?.status).toBe(403);
 expect((await createConfirmationRoutes(db,user,allowed,true)(post(undefined,"https://evil.example")))?.status).toBe(403);
});
test("registered and anonymous votes bind server identity only",async()=>{
 const writes:any[][]=[];const db={unsafe:async(q:string,p:any[])=>{writes.push(p);return []}};
 const payload={reportId:id,agrees:false,accountRef:"spoof",anonymousRef:"spoof"};
 expect((await createConfirmationRoutes(db,user,allowed,true)(post(payload)))?.status).toBe(201);
 const digest="a".repeat(64);
 expect((await createConfirmationRoutes(db,anon,allowed,true,()=>digest)(post(payload)))?.status).toBe(201);
 expect(writes).toEqual([[id,account,null,false],[id,null,digest,false]]);
});
test("validation rejects invalid input, duplicates, self votes and stale reports",async()=>{
 for(const [code,status] of [["23505",409],["P4090",409],["P4040",404],["P4290",429]] as const){
  const handler=createConfirmationRoutes({unsafe:async()=>{throw Object.assign(Error("test"),{code})}},user,allowed,true);
  expect((await handler(post()))?.status).toBe(status);
  expect((await handler(post({reportId:id,agrees:"true"})))?.status).toBe(400);
 }
});
test("public summary excludes identities and returns no stale activity",async()=>{
 const db={unsafe:async(q:string,p:any[])=>{expect(q).toContain("30 minutes");expect(q).toContain("e.published");expect(p).toEqual([id]);return [{id,state:"queue",source:"community",reported_at:1000,confirmations:2,contradictions:1,account_ref:account}]}};
 const r=await createConfirmationRoutes(db,anon,allowed,true)(new Request(origin+"/v1/radar/activity-validation?id="+id));
 expect(await r?.json()).toEqual({report:{id,state:"queue",source:"community",reportedAt:1000,confirmations:2,contradictions:1}});
 const empty=await createConfirmationRoutes({unsafe:async()=>[]},anon,allowed,true)(new Request(origin+"/v1/radar/activity-validation?id="+id));
 expect(await empty?.json()).toEqual({report:null});
});
