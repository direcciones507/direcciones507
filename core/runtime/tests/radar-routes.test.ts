import {test,expect} from "bun:test";
import {createRadarRoutes,type RadarRepository} from "../radar/routes";
const origin="https://direcciones.lat", id="00000000-0000-4000-8000-000000000001";
const writes:unknown[][]=[];
const repo:RadarRepository={listPublished:async()=>[],findPublished:async()=>({id,verifiedOwnerAccount:"owner"}),addReport:async(...args)=>{writes.push(args)}};
const anon={currentUser:async()=>null}, user={currentUser:async()=>({id:"citizen",roles:[]})};
const allowed=new Set([origin]);
const map=()=>new Request(origin+"/v1/radar/map?country=PA&west=-83&south=7&east=-77&north=10");
const post=()=>new Request(origin+"/v1/radar/report",{method:"POST",headers:{origin},body:JSON.stringify({id,state:"available",accountRef:"owner",source:"verified_owner"})});
test("API disabled by default",async()=>{expect(await createRadarRoutes(repo,anon,allowed)(map())).toBeNull()});
test("map available without authentication",async()=>{
 const r=await createRadarRoutes(repo,anon,allowed,true)(map());
 expect(r?.status).toBe(200);expect(await r?.json()).toEqual({type:"FeatureCollection",features:[]});
});
test("invalid map bounds rejected",async()=>{
 const r=await createRadarRoutes(repo,anon,allowed,true)(new Request(origin+"/v1/radar/map?country=PA&west=-83&south=99&east=-77&north=10"));
 expect(r?.status).toBe(400);
});
test("anonymous report denied",async()=>{expect((await createRadarRoutes(repo,anon,allowed,true)(post()))?.status).toBe(403)});
test("report uses server identity, ignores spoofed owner",async()=>{
 const r=await createRadarRoutes(repo,user,allowed,true)(post());
 expect(r?.status).toBe(201);expect(writes.at(-1)).toEqual([id,"citizen","available","community"]);
});
