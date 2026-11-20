import {test,expect} from "bun:test";
import {createRadarRepository} from "../radar/repository";
const bounds={west:-83,south:7,east:-77,north:10};
test("map query binds bounds and country and normalizes rows",async()=>{
 const repo=createRadarRepository({unsafe:async(query,params)=>{
 expect(params).toEqual(["PA",7,10,-83,-77]);
 expect(query).toContain("e.published");expect(query).toContain("LIMIT 1000");
 return [{id:"a",name:"Shop",category:"shop",country:"PA",latitude:"8",longitude:"-80",published:true,reports:"[]"}];
 }});
 expect(await repo.listPublished("PA",bounds)).toEqual([{id:"a",name:"Shop",category:"shop",country:"PA",latitude:8,longitude:-80,published:true,verifiedOwner:false,reports:[]}]);
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

test("new registrations are published atomically, without granting ownership or updating duplicates",async()=>{
 const draft={name:"Shop",category:"shop",country:"PA" as const,latitude:8,longitude:-80};
 const repo=createRadarRepository({unsafe:async(q,p)=>{expect(q).toContain("longitude,published)");expect(q).toContain("VALUES ($1,$2,$3,$4,$5,$6,true)");expect(q).toContain("ON CONFLICT DO NOTHING");expect(p).toEqual(["account","Shop","shop","PA",8,-80]);return [{id:"new"}]}});
 expect(await repo.register!(draft,"account")).toBe("new");
 const duplicate=createRadarRepository({unsafe:async()=>[]});expect(await duplicate.register!(draft,"account")).toBeNull();
});
