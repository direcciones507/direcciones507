import {money,validateYappyConfiguration,type YappyConfiguration} from './payment-policy';

// Server-only adapter. It is not wired into server.ts in this preparation release.
// API/CDN environment must be selected together when the launch is authorized.
export function createYappyProvider(config:YappyConfiguration,http:typeof fetch=fetch) {
  validateYappyConfiguration(config);
  const api=config.environment==='test'?'https://api-comecom-uat.yappycloud.com':'https://apipagosbg.bgeneral.cloud';
  const post=async(path:string,body:unknown,token?:string)=>{
    try {
      const response=await http(api+path,{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{'content-type':'application/json',...(token?{authorization:token}:{})},body:JSON.stringify(body)});
      if(!response.ok)throw Error();
      // Provider tokens and responses must never appear in logs/errors.
      const reader=response.body?.getReader();if(!reader)throw Error();let size=0;const chunks:Uint8Array[]=[];
      try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>64000){await reader.cancel();throw Error();}chunks.push(value);}}finally{reader.releaseLock();}
      const text=Buffer.concat(chunks).toString('utf8');
      return JSON.parse(text);
    }catch{throw Error('YAPPY_PROVIDER_UNCONFIRMED');}
  };
  return {
    async createOrder(order:{providerOrderId:string;amountCents:number},alias:string) {
      if(!/^[A-Za-z0-9]{1,15}$/.test(order.providerOrderId)||!/^[6][0-9]{7}$/.test(alias)||!Number.isSafeInteger(order.amountCents)||order.amountCents<=0)throw Error('INVALID_YAPPY_ORDER');
      const auth=await post('/payments/validate/merchant',{merchantId:config.merchantId,urlDomain:config.domain});
      if(typeof auth.body?.token!=='string'||!auth.body.token||!Number.isFinite(Number(auth.body.epochTime)))throw Error('YAPPY_PROVIDER_UNCONFIRMED');
      const amount=money(order.amountCents);
      const result=await post('/payments/payment-wc',{merchantId:config.merchantId,orderId:order.providerOrderId,domain:config.domain,paymentDate:auth.body.epochTime,aliasYappy:alias,ipnUrl:config.ipnUrl,discount:'0.00',taxes:'0.00',subtotal:amount,total:amount},auth.body.token);
      const body=result.body;
      if(!body||!body.transactionId||typeof body.token!=='string'||!body.token||typeof body.documentName!=='string'||!body.documentName||String(body.transactionId).length>300)throw Error('YAPPY_PROVIDER_UNCONFIRMED');
      return {transactionId:String(body.transactionId),token:body.token,documentName:body.documentName};
    }
  };
}
