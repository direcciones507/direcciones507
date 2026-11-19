import {test,expect} from "bun:test";
import {createFavoriteRoutes} from "../radar/favorites";
const origin="https://radar.direcciones.lat",id="00000000-0000-4000-8000-000000000001",account="00000000-0000-4000-8000-000000000002";
const allowed=new Set([origin]),anon={currentUser:async()=>null},user={currentUser:async()=>({id:account,roles:[]})};
const post=(body:unknown,from=origin)=>new Request(origin+"/v1/radar/favorites",{method:"POST",headers:{origin:from},body:JSON.stringify(body)});
test("favorites are disabled by default and require Core account and allowed origin",async()=>{
 const db={unsafe:async()=>{throw Error("unexpected database access")}};
 expect(await createFavoriteRoutes(db,user,allowed)(post({action:"list"}))).toBeNull();
 expect((await createFavoriteRoutes(db,anon,allowed,true)(post({action:"list"})))?.status).toBe(403);
 expect((await createFavoriteRoutes(db,user,allowed,true)(post({action:"list"},"https://other.example")))?.status).toBe(403);
});
test("favorites are scoped to server account for every operation",async()=>{
 const calls:any[][]=[];const handler=createFavoriteRoutes({unsafe:async(q:string,p:any[])=>{calls.push(p);return []}},user,allowed,true);
 expect((await handler(post({action:"add",id,accountRef:"spoof"})))?.status).toBe(200);
 expect((await handler(post({action:"remove",id,accountRef:"spoof"})))?.status).toBe(200);
 expect(await (await handler(post({action:"list",accountRef:"spoof"})))?.json()).toEqual({favorites:[]});
 expect(calls).toEqual([[account,id],[account,id],[account]]);
 expect((await handler(post({action:"add",id:"invalid"})))?.status).toBe(400);
});
test("private list hides unpublished details",async()=>{
 const handler=createFavoriteRoutes({unsafe:async()=>[{id,available:false,name:"secret",latitude:8,longitude:-80}]},user,allowed,true);
 const r=await handler(post({action:"list"}));expect(r?.headers.get("cache-control")).toBe("private, no-store");
 expect(await r?.json()).toEqual({favorites:[{id,available:false,name:null,category:null,country:null,coordinates:null}]});
});
test("favorite limit and unavailable establishment are handled",async()=>{
 for(const [code,status] of [["P4040",404],["P4290",429]] as const){
  const handler=createFavoriteRoutes({unsafe:async()=>{throw Object.assign(Error("test"),{code})}},user,allowed,true);
  expect((await handler(post({action:"add",id})))?.status).toBe(status);
 }
});
