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

/** Existing email entry routes always return to canonical HTTPS, including behind Railway TLS. */
export function accountEmailEntry(req:Request):Response|null{
 const url=new URL(req.url);
 if(req.method!=='GET'||url.hostname!=='direcciones.lat'||!['/verificar-correo','/recuperar-contrasena'].includes(url.pathname))return null;
 const token=url.searchParams.get('token'),email=url.searchParams.get('email');
 if(!token||!email||!/^[A-Za-z0-9_-]{43}$/.test(token)||email.length>320)return new Response('Enlace inválido',{status:400,headers:{'cache-control':'no-store'}});
 const radarContext=url.searchParams.get('radar');
 const radarEmailEntry=!!radarContext&&/^[A-Za-z0-9_-]{43}$/.test(radarContext);
 const next=new URL(radarEmailEntry?'/commercial/international':'/','https://direcciones.lat');
 next.searchParams.set('token',token);next.searchParams.set('email',email);next.searchParams.set('action',url.pathname==='/recuperar-contrasena'?'reset':'verify');
 if(radarEmailEntry)next.searchParams.set('radar',radarContext!);
 return new Response(null,{status:302,headers:{location:next.toString(),'cache-control':'no-store','referrer-policy':'no-referrer'}});
}
