import {test} from 'bun:test';
import assert from 'node:assert/strict';
import {Script,runInNewContext} from 'node:vm';
import {radarAccountData,renderRadarAccount,radarAccountScript} from '../radar/account-panel';
const env={RADAR_ENABLED:'true',RADAR_OWNERSHIP_ENABLED:'true',RADAR_BUSINESS_DETAILS_ENABLED:'true'};
test('CORE account list uses authenticated account and preserves every feature gate',async()=>{
 const calls:any[]=[],db={unsafe:async(_q:string,p:any[])=>{calls.push(p);return [{name:'Synthetic',authorized:true}];}};
 for(const key of Object.keys(env))assert.equal(await radarAccountData(db,'account',{...env,[key]:'false'}),null);
 assert.equal(calls.length,0);assert.deepEqual(await radarAccountData(db,'account',env),{available:true,items:[{name:'Synthetic',authorized:true}]});assert.deepEqual(calls,[['account']]);
});
test('community submissions are included in the account query without granting ownership',async()=>{
 const statements:string[]=[];
 const db={unsafe:async(q:string,p:any[])=>{statements.push(q);assert.deepEqual(p,['00000000-0000-4000-8000-000000000002']);return [{name:'Barrio Centro',authorized:false,requested:false,declared:false,submitted:true}];}};
 const result=await radarAccountData(db,'00000000-0000-4000-8000-000000000002',env);
 assert.equal(result?.items?.[0]?.submitted,true);
 assert.ok(statements[0].includes('e.account_ref=$1::text'));
 assert.match(statements[0],/AS submitted/);
 const u=ui();renderRadarAccount(result,u.doc);
 assert.match(u.nodes.radarAccountItems.children[0].children[2].textContent,/Agregado como usuario/);
 assert.equal(u.nodes.radarAccountItems.children[0].children.length,3);
});
test('Radar query failure cannot break the existing CORE account panel',async()=>{
 assert.deepEqual(await radarAccountData({unsafe:async()=>{throw Error('isolated failure');}},'account',env),{available:false,items:[]});
});
function ui(){
 const nodes:any={};function node(){return {children:[] as any[],textContent:'',className:'',hidden:false,classList:{toggle:(_key:string,value:boolean)=>{nodes.hidden=value;}},append(...children:any[]){this.children.push(...children);},replaceChildren(){this.children=[];}};}
 nodes.radarAccountSection=node();nodes.radarAccountItems=node();return {nodes,doc:{getElementById:(id:string)=>nodes[id],createElement:()=>node()}};
}
test('list renders untrusted names as text and never grants controls to pending requests',()=>{
 const u=ui();renderRadarAccount({available:true,items:[{name:'<img src=x onerror=alert(1)>',category:'shop',country:'PA',authorized:false,requested:true},{name:'Approved',authorized:true}]},u.doc);
 const rows=u.nodes.radarAccountItems.children;assert.equal(rows[0].children[0].textContent,'<img src=x onerror=alert(1)>');assert.match(rows[0].children[2].textContent,/Sin permisos/);assert.equal(rows[1].children[2].textContent,'Administración autorizada');assert.equal(rows[0].children.length,3);
 renderRadarAccount(undefined,u.doc);assert.equal(u.nodes.hidden,true);assert.equal(u.nodes.radarAccountItems.children.length,0);
});

test('shared account renderer executes as a standalone generated script',()=>{
 new Script(radarAccountScript);const u=ui();runInNewContext(radarAccountScript+';renderRadarAccount(data,document);',{document:u.doc,data:{available:true,items:[]}});assert.equal(u.nodes.hidden,false);assert.match(u.nodes.radarAccountItems.children[0].textContent,/Todavía no tienes/);
});
