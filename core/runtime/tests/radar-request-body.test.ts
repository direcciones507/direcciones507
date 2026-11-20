import {test,expect} from "bun:test";
import {readRadarJson} from "../radar/request-body";
const request=(body:string|Uint8Array|ReadableStream<Uint8Array>,headers:Record<string,string>={})=>new Request("https://radar.direcciones.lat/",{method:"POST",body,headers});
test("shared Radar parser measures UTF-8 bytes, accepts exact limit",async()=>{
 const raw=JSON.stringify({name:"Café"});
 const bytes=new TextEncoder().encode(raw).byteLength;
 expect(await readRadarJson(request(raw),bytes)).toEqual({ok:true,body:{name:"Café"}});
 expect(await readRadarJson(request(raw),bytes-1)).toEqual({ok:false,status:413,error:"BODY_TOO_LARGE"});
});
test("shared Radar parser rejects declared and actual oversized bodies",async()=>{
 expect(await readRadarJson(request("{}",{"content-length":"9999"}),32)).toEqual({ok:false,status:413,error:"BODY_TOO_LARGE"});
 const chunks=new ReadableStream<Uint8Array>({start(c){c.enqueue(new Uint8Array(16));c.enqueue(new Uint8Array(17));c.close();}});
 expect(await readRadarJson(request(chunks),32)).toEqual({ok:false,status:413,error:"BODY_TOO_LARGE"});
});
test("shared Radar parser decodes UTF-8 across stream chunks",async()=>{
 const bytes=new TextEncoder().encode('"é"');
 const chunks=new ReadableStream<Uint8Array>({start(c){c.enqueue(bytes.slice(0,2));c.enqueue(bytes.slice(2));c.close();}});
 expect(await readRadarJson(request(chunks),bytes.length)).toEqual({ok:true,body:"é"});
});
test("shared Radar parser denies malformed JSON and invalid UTF-8",async()=>{
 for(const body of ["{",new Uint8Array([0xff])])expect(await readRadarJson(request(body),32)).toEqual({ok:false,status:400,error:"INVALID_BODY"});
});
