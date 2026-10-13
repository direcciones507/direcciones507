type Mail = {to:string;subject:string;text:string};
export function createAccountMailer(env:Record<string,string|undefined>, request:typeof fetch=fetch){
 const endpoint=env.EMAIL_WEBHOOK_URL?.trim()??'';
 const secret=env.EMAIL_WEBHOOK_SECRET?.trim()??'';
 const from=env.EMAIL_FROM?.trim()??'';
 let configured=false;
 try{const url=new URL(endpoint);configured=url.protocol==='https:'&&!url.username&&!url.password&&!url.hash&&!!secret&&!!from;}catch{}
 async function send(mail:Mail){
  if(!configured)return {sent:false,reason:'EMAIL_NOT_CONFIGURED'};
  const response=await request(endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+secret},body:JSON.stringify({from,to:mail.to,subject:mail.subject,text:mail.text}),signal:AbortSignal.timeout(10000),redirect:'error'});
  if(!response.ok)throw Error('EMAIL_DELIVERY_FAILED');
  return {sent:true};
 }
 return {configured,send};
}
