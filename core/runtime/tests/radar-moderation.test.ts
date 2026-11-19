import {test,expect} from "bun:test";
import {createModerationRoutes} from "../radar/moderation";
const origin="https://direcciones.lat",id="00000000-0000-4000-8000-000000000001";
const allowed=new Set([origin]);
const store={pending:async(limit:number)=>{expect(limit).toBe(100);return []},publish:async(value:string)=>value===id};
const admin={currentUser:async()=>({id:"admin",roles:["ADMIN"]})};
const citizen={currentUser:async()=>({id:"citizen",roles:[]})};
const req=(body:unknown,o=origin)=>new Request(origin+"/v1/radar/admin/moderation",{method:"POST",headers:{origin:o},body:JSON.stringify(body)});
test("moderation disabled by default",async()=>expect(await createModerationRoutes(store,admin,allowed)(req({action:"list"}))).toBeNull());
test("citizens and foreign origins cannot moderate",async()=>{
 expect((await createModerationRoutes(store,citizen,allowed,true)(req({action:"publish",id})))?.status).toBe(403);
 expect((await createModerationRoutes(store,admin,allowed,true)(req({action:"list"},"https://example.org")))?.status).toBe(403);
});
test("ADMIN can list and approve valid establishments",async()=>{
 const handle=createModerationRoutes(store,admin,allowed,true);
 expect(await (await handle(req({action:"list"})))?.json()).toEqual({items:[]});
 expect((await handle(req({action:"publish",id})))?.status).toBe(200);
 expect((await handle(req({action:"publish",id:"invalid"})))?.status).toBe(400);
 expect((await handle(req({action:"publish",id:"00000000-0000-4000-8000-000000000002"})))?.status).toBe(404);
});
