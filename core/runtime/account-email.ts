export type Mail = {to:string;subject:string;text:string;html?:string;idempotencyKey?:string};
export function createAccountMailer(env:Record<string,string|undefined>, request:typeof fetch=fetch){
 const endpoint=env.EMAIL_WEBHOOK_URL?.trim()??'';
 const secret=env.EMAIL_WEBHOOK_SECRET?.trim()??'';
 const from=env.EMAIL_FROM?.trim()??'';
 const resendKey=env.RESEND_API_KEY?.trim()??'';
 let webhookConfigured=false;
 try{const url=new URL(endpoint);webhookConfigured=url.protocol==='https:'&&!url.username&&!url.password&&!url.hash&&!!secret&&!!from;}catch{}
 const resendConfigured=!!resendKey&&!!from;
 const configured=webhookConfigured||resendConfigured;
 async function send(mail:Mail){
  if(!configured)return {sent:false,reason:'EMAIL_NOT_CONFIGURED'};
  const useWebhook=webhookConfigured;
  const response=await request(useWebhook?endpoint:'https://api.resend.com/emails',{
   method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+(useWebhook?secret:resendKey),...(mail.idempotencyKey?{'Idempotency-Key':mail.idempotencyKey}:{})},
   body:JSON.stringify({from,to:useWebhook?mail.to:[mail.to],subject:mail.subject,text:mail.text,...(mail.html?{html:mail.html}:{})}),
   signal:AbortSignal.timeout(10000),redirect:'error'
  });
  if(!response.ok)throw Object.assign(Error('EMAIL_DELIVERY_FAILED'),{status:response.status});
  if(mail.idempotencyKey){const body=await response.json() as {id?:string};if(typeof body.id!=='string'||!body.id||body.id.length>200)throw Error('EMAIL_PROVIDER_UNCONFIRMED');return {sent:true,providerId:body.id};}
  return {sent:true};
 }
 return {configured,send};
}
