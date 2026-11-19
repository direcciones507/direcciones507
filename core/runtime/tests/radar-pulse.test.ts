import {test,expect} from "bun:test";
import {pulseRows} from "../radar/ui/ui-model.js";
const now=2000000;
const feature=(id:string,time:number,state="available",pin="normal",country="PA",source="community")=>({id,geometry:{type:"Point",coordinates:[-80,8]},properties:{country,category:"shop",activity:state,reportedAt:time,source,pin,liveUntil:pin==="live"?now+10000:null}});
test("pulse includes normal pins with fresh reports and excludes expired or commercial-only entries",()=>{
 const rows=pulseRows([feature("normal",now-1000),feature("live",now-5000,"full","live"),feature("expired",now-1800000),feature("future",now+1),feature("unknown",now-1,"unknown","live"),feature("foreign",now-1,"available","normal","CO"),feature("untrusted",now-1,"available","normal","PA","other")],"PA","",now);
 expect(rows.map(r=>r.id)).toEqual(["normal","live"]);
 expect(rows[0].properties.pin).toBe("normal");
});
test("pulse filter preserves verified source and never invents a report",()=>{
 const rows=pulseRows([feature("owner",now-1,"queue","normal","PA","verified_owner"),feature("other",now-2)],"PA","queue",now);
 expect(rows.map(r=>r.id)).toEqual(["owner"]);expect(rows[0].properties.source).toBe("verified_owner");
 expect(pulseRows([],"PA","",now)).toEqual([]);
 expect(pulseRows([feature("one",now-1)],"PA","invalid",now)).toEqual([]);
});
