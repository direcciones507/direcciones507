import {test,expect} from "bun:test";
import {createRadarRepository} from "../radar/repository";
const bounds={west:-83,south:7,east:-77,north:10};
test("map query binds bounds and country and normalizes rows",async()=>{
 const repo=createRadarRepository({unsafe:async(query,params)=>{
 expect(params).toEqual(["PA",7,10,-83,-77]);
 expect(query).toContain("e.published");expect(query).toContain("LIMIT 1000");
 return [{id:"a",name:"Shop",category:"shop",country:"PA",latitude:"8",longitude:"-80",published:true,reports:"[]"}];
 }});
 expect(await repo.listPublished("PA",bounds)).toEqual([{id:"a",name:"Shop",category:"shop",country:"PA",latitude:8,longitude:-80,published:true,reports:[]}]);
});
test("published lookup does not grant unverified ownership",async()=>{
 const repo=createRadarRepository({unsafe:async(q,p)=>{expect(q).toContain("AND published");expect(p).toEqual(["a"]);return [{id:"a"}]}});
 expect(await repo.findPublished("a")).toEqual({id:"a",verifiedOwnerAccount:null});
});
test("community report binds parameters; owner disabled",async()=>{
 const repo=createRadarRepository({unsafe:async(q,p)=>{expect(q).toContain("AND published");expect(p).toEqual(["a","b","available","community"]);return [{id:"r"}]}});
 await repo.addReport("a","b","available","community");
 await expect(repo.addReport("a","b","available","verified_owner")).rejects.toThrow();
});
test("unpublished establishment cannot receive report",async()=>{
 const repo=createRadarRepository({unsafe:async()=>[]});
 expect(await repo.findPublished("a")).toBeNull();
 await expect(repo.addReport("a","b","available","community")).rejects.toThrow();
});
