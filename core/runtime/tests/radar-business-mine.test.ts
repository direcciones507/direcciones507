import {test} from 'bun:test';
import assert from 'node:assert/strict';
import {createBusinessRoutes} from '../radar/business';
const origin='https://radar.direcciones.lat',mine='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
function setup(user:any,enabled=true){
 const accounts:string[]=[],store:any={mine:async(account:string)=>{accounts.push(account);return [{id:other,name:'Isolated',authorized:false,requested:true}];}};
 const handler=createBusinessRoutes(store,{currentUser:async()=>user},new Set([origin]),enabled);
 const call=(body:any={action:'mine'},site=origin)=>handler(new Request(origin+'/v1/radar/business',{method:'POST',headers:{origin:site},body:JSON.stringify(body)}));
 return {call,accounts};
}
test('personal business list uses CORE account and ignores submitted account identifiers',async()=>{
 for(const roles of [['CLIENT'],['ADMIN']]){
  const s=setup({id:mine,roles}),r=await s.call({action:'mine',accountRef:other});assert.equal(r!.status,200);assert.deepEqual(s.accounts,[mine]);assert.equal(r!.headers.get('cache-control'),'no-store');
  const data=await r!.json();assert.equal(data.items[0].authorized,false);assert.equal(data.items[0].requested,true);
 }
});
test('personal business list rejects guest and foreign origin before reading account records',async()=>{
 const guest=setup(null);assert.equal((await guest.call())!.status,403);assert.deepEqual(guest.accounts,[]);
 const foreign=setup({id:mine,roles:['CLIENT']});assert.equal((await foreign.call({action:'mine'},'https://evil.example'))!.status,403);assert.deepEqual(foreign.accounts,[]);
});
test('personal business list preserves the existing feature gate',async()=>{
 const s=setup({id:mine,roles:['CLIENT']},false);assert.equal((await s.call())!.status,503);assert.deepEqual(s.accounts,[]);
});
