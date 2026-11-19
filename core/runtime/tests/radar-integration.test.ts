import {test,expect} from "bun:test";
import {createRadarIntegration,radarOrigin} from "../radar/integration";
const db={unsafe:async()=>{throw Error("Unexpected database access")}};
const auth={currentUser:async()=>null};
const req=(origin=radarOrigin,path="/v1/radar/map")=>new Request(origin+path);
test("disabled Radar returns unavailable without database access",async()=>{
 const handler=createRadarIntegration(db,auth,{});
 expect((await handler(req()))?.status).toBe(503);
});
test("other hosts and unrelated routes remain untouched",async()=>{
 const handler=createRadarIntegration(db,auth,{RADAR_ENABLED:"true"});
 expect(await handler(req("https://direcciones.lat"))).toBeNull();
 expect(await handler(req("https://direcciones507.com"))).toBeNull();
 expect(await handler(req(radarOrigin,"/v1/auth/me"))).toBeNull();
});
test("enabled Radar handles public map and unknown routes",async()=>{
 const handler=createRadarIntegration({unsafe:async()=>[]},auth,{RADAR_ENABLED:"true"});
 const result=await handler(req(radarOrigin,"/v1/radar/map?country=PA&west=-83&south=7&east=-77&north=10"));
 expect(result?.status).toBe(200);
 expect(await result?.json()).toEqual({type:"FeatureCollection",features:[]});
 expect((await handler(req(radarOrigin,"/v1/radar/missing")))?.status).toBe(404);
});
