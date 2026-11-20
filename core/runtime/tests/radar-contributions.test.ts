import {test,expect} from "bun:test";
import {createContributionRoutes} from "../radar/contributions";
const origin="https://radar.direcciones.lat",account="00000000-0000-4000-8000-000000000001";
const allowed=new Set([origin]),anon={currentUser:async()=>null},user={currentUser:async()=>({id:account,roles:[]})};
const post=(body:unknown={action:"list"},from=origin)=>new Request(origin+"/v1/radar/contributions",{method:"POST",headers:{origin:from},body:JSON.stringify(body)});
test("history requires existing account, correct origin and feature switch",async()=>{
 const db={unsafe:async()=>{throw Error("unexpected database access")}};
 expect(await createContributionRoutes(db,user,allowed)(post())).toBeNull();
 expect((await createContributionRoutes(db,anon,allowed,true)(post()))?.status).toBe(403);
 expect((await createContributionRoutes(db,user,allowed,true)(post(undefined,"https://other.example")))?.status).toBe(403);
});
test("history uses only authenticated identity and paginates without exposing others",async()=>{
 const handler=createContributionRoutes({unsafe:async(q:string,p:any[])=>{
  expect(p).toEqual([account,"confirmation",25]);
  expect(q).toContain("r.account_ref=$1::uuid");expect(q).toContain("c.account_ref=$1::uuid");
  expect(q).toContain("CASE WHEN e.published");expect(q).toContain("LIMIT 26 OFFSET");
  return Array.from({length:26},(_,i)=>({id:String(i),kind:"confirmation",state:"queue",source:"community",agrees:false,created_at:123,current:false,name:null,account_ref:"secret",anonymous_ref:"secret"}));
 }},user,allowed,true);
 const r=await handler(post({action:"list",kind:"confirmation",offset:25,accountRef:"spoof"}));
 expect(r?.headers.get("cache-control")).toBe("private, no-store");
 const data=await r?.json();expect(data.items).toHaveLength(25);expect(data.nextOffset).toBe(50);
 expect(data.items[0]).toEqual({id:"0",kind:"confirmation",state:"queue",source:"community",agrees:false,createdAt:123,current:false,name:null,country:null,category:null});
});
test("invalid pagination and filters are rejected without query",async()=>{
 const handler=createContributionRoutes({unsafe:async()=>{throw Error("unexpected database access")}},user,allowed,true);
 for(const body of [{action:"list",offset:-1},{action:"list",offset:2001},{action:"list",offset:1.5},{action:"list",kind:"other"},{action:"delete"}])expect((await handler(post(body)))?.status).toBe(400);
});
