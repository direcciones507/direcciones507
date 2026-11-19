import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {handlePagaditoSandboxQuote} from './pagadito-sandbox-routes';

const id='11111111-1111-4111-8111-111111111111';
const url='https://direcciones507.com/v1/user/pagadito/sandbox/requests/'+id+'/quote';
const authenticated={id:'22222222-2222-4222-8222-222222222222',roles:['CLIENT']};
function context(enabled=true,user:any=authenticated){
  let calls=0;
  return {
    ctx:{
      enabled,
      auth:{currentUser:async()=>user},
      bridge:{quote:async(userId:string,addressId:string,mode:string)=>{
        calls++;
        assert.equal(userId,authenticated.id);
        assert.equal(addressId,id);
        return {amountCents:2999,currency:'USD',mode,checkoutEnabled:false};
      }}
    },
    calls:()=>calls
  };
}
test('disabled Pagadito preview fails closed without touching orders',async()=>{
  const c=context(false);
  const r=await handlePagaditoSandboxQuote(new Request(url),c.ctx as any);
  assert.equal(r?.status,503);
  assert.equal(c.calls(),0);
});
test('requires authentication and rejects cross-site access',async()=>{
  const c=context(true,null);
  assert.equal((await handlePagaditoSandboxQuote(new Request(url),c.ctx as any))?.status,401);
  const cross=context();
  assert.equal((await handlePagaditoSandboxQuote(new Request(url,{headers:{'sec-fetch-site':'cross-site'}}),cross.ctx as any))?.status,403);
  assert.equal(cross.calls(),0);
});
test('only authenticated read-only quotes are available',async()=>{
  const c=context();
  const r=await handlePagaditoSandboxQuote(new Request(url+'?mode=ANNUAL'),c.ctx as any);
  assert.equal(r?.status,200);
  assert.equal((await r!.json()).quote.checkoutEnabled,false);
  assert.equal(c.calls(),1);
  assert.equal((await handlePagaditoSandboxQuote(new Request(url,{method:'POST'}),c.ctx as any))?.status,405);
  assert.equal(c.calls(),1);
});
test('rejects unsupported modes without querying database',async()=>{
  const c=context();
  const r=await handlePagaditoSandboxQuote(new Request(url+'?mode=RENEWAL'),c.ctx as any);
  assert.equal(r?.status,400);
  assert.equal(c.calls(),0);
});
