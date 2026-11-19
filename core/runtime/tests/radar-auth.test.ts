import {test,expect} from "bun:test";
import {radarActor,reportSource} from "../radar/auth";
const origin="https://direcciones.lat";
const allowed=new Set([origin]);
const request=(o?:string)=>new Request(origin+"/v1/radar/report",{method:"POST",headers:o?{origin:o}:{}});
test("rejects missing and foreign origins before reading identity",async()=>{
 const auth={currentUser:async()=>{throw new Error("unexpected identity lookup")}};
 expect(await radarActor(request(),auth,allowed)).toBeNull();
 expect(await radarActor(request("https://example.org"),auth,allowed)).toBeNull();
});
test("rejects anonymous users",async()=>{
 expect(await radarActor(request(origin),{currentUser:async()=>null},allowed)).toBeNull();
});
test("uses CORE identity and ADMIN role",async()=>{
 expect(await radarActor(request(origin),{currentUser:async()=>({id:"a",roles:["ADMIN"]})},allowed)).toEqual({accountRef:"a",isAdmin:true});
 expect(await radarActor(request(origin),{currentUser:async()=>({id:"b",roles:[]})},allowed)).toEqual({accountRef:"b",isAdmin:false});
});
test("owner source requires matching verified ownership",()=>{
 expect(reportSource({accountRef:"a",isAdmin:true},"b")).toBe("community");
 expect(reportSource({accountRef:"a",isAdmin:false},null)).toBe("community");
 expect(reportSource({accountRef:"a",isAdmin:false},"a")).toBe("verified_owner");
});
