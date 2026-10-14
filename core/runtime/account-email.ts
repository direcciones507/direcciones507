type Mail = {to:string;subject:string;text:string};
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
   method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+(useWebhook?secret:resendKey)},
   body:JSON.stringify({from,to:useWebhook?mail.to:[mail.to],subject:mail.subject,...(useWebhook?{text:mail.text}:{text:mail.text})}),
   signal:AbortSignal.timeout(10000),redirect:'error'
  });
  if(!response.ok)throw Error('EMAIL_DELIVERY_FAILED');
  return {sent:true};
 }
 return {configured,send};
}
