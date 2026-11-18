import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {createPagaditoRestClient, PagaditoApiError} from './pagadito-rest-client';

test('Pagadito sandbox transport uses HTTPS, Basic auth and does not expose secrets in errors',async()=>{
  const original=globalThis.fetch;
  const requests:Array<{url:string;init:RequestInit}>=[];
  try{
    globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
      requests.push({url:String(input),init:init!});
      return new Response(JSON.stringify({response_code:'PG200-00'}),{
        status:200,headers:{'content-type':'application/json'}
      });
    }) as typeof fetch;
    const client=createPagaditoRestClient({environment:'sandbox',uid:'sandbox-user',wsk:'sandbox-secret'});
    const result=await client.paymentByToken({
      payment_token:'token-example',
      transaction:{merchantTransactionId:'order-example',currencyId:'USD',
        transactionDetails:[{quantity:'1',description:'Prueba',amount:'29.99'}]},
      browserInfo:{deviceFingerprintID:'device-example',customerIp:'127.0.0.1'}
    });
    assert.deepEqual(result,{response_code:'PG200-00'});
    assert.equal(requests.length,1);
    assert.equal(requests[0].url,'https://sandbox-api.pagadito.com/v1/payment');
    assert.equal(requests[0].init.method,'POST');
    const headers=new Headers(requests[0].init.headers);
    assert.equal(headers.get('authorization'),
      'Basic '+Buffer.from('sandbox-user:sandbox-secret').toString('base64'));
    assert.equal(headers.get('content-type'),'application/json');
    assert.equal(JSON.parse(String(requests[0].init.body)).transaction.merchantTransactionId,'order-example');

    globalThis.fetch=(async()=>new Response('provider diagnostic with sensitive content',{status:503})) as typeof fetch;
    await assert.rejects(()=>client.refund({authorization:'example',reason:'test'}),(error:unknown)=>{
      assert.ok(error instanceof PagaditoApiError);
      assert.equal(error.status,503);
      assert.equal(error.message.includes('provider diagnostic'),false);
      return true;
    });
  }finally{
    globalThis.fetch=original;
  }
});
