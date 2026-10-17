/* Optional analytics is independent of account/contract acceptance. No GTM container is loaded. */
(function(){
 if(window.ad507CookieConsent)return;
 const nonce=document.currentScript?.nonce;
 const key='ad507_cookie_preferences_v1',version='1.0-20261017';
 let choice=null,loaded=false,banner;
 try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&saved.version===version&&typeof saved.analytics==='boolean')choice=saved;}catch{}
 function enableAnalytics(){
  if(loaded||!choice?.analytics||location.pathname!=='/'||!['direcciones507.com','www.direcciones507.com'].includes(location.hostname))return;
  loaded=true;window['ga-disable-G-88307ETH2H']=false;window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
  window.gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  window.gtag('js',new Date());window.gtag('config','G-88307ETH2H',{cookie_expires:0,allow_google_signals:false,allow_ad_personalization_signals:false});
  const script=document.createElement('script');script.async=true;if(nonce)script.nonce=nonce;script.src='https://www.googletagmanager.com/gtag/js?id=G-88307ETH2H';document.head.append(script);
 }
 function removeAnalyticsCookies(){
  for(const raw of document.cookie.split(';')){const name=raw.trim().split('=')[0];if(!/^_ga(?:_|$)/.test(name))continue;
   for(const domain of ['',location.hostname,'.direcciones507.com'])document.cookie=name+'=; Max-Age=0; Path=/'+(domain?'; Domain='+domain:'');
  }
 }
 function choose(analytics){
  const wasEnabled=choice?.analytics===true;choice={version,analytics,at:new Date().toISOString()};
  try{localStorage.setItem(key,JSON.stringify(choice));}catch{}
  banner.hidden=true;
  if(analytics)enableAnalytics();else{
   window['ga-disable-G-88307ETH2H']=true;
   if(window.gtag)window.gtag('consent','update',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
   removeAnalyticsCookies();if(wasEnabled&&loaded)location.reload();
  }
 }
 function open(){banner.hidden=false;banner.querySelector('button')?.focus();}
 function mount(){
  banner=document.createElement('section');banner.id='ad507CookieOptions';banner.setAttribute('aria-label','Preferencias de cookies');
  banner.style.cssText='position:fixed;bottom:16px;left:16px;right:16px;max-width:560px;margin:auto;z-index:2147483000;padding:18px;background:#fff;color:#152c49;border:2px solid #315b86;border-radius:14px;box-shadow:0 8px 30px #0003;font:15px/1.6 system-ui';
  const text=document.createElement('p');text.textContent='Usamos almacenamiento necesario para el servicio. La analítica es opcional: puedes rechazarla y continuar.';text.style.margin='0 0 12px';banner.append(text);
  const row=document.createElement('div');row.style.cssText='display:flex;gap:10px;flex-wrap:wrap';
  for(const [label,value]of [['Rechazar analítica',false],['Aceptar analítica',true]]){const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.analyticsChoice=String(value);button.style.cssText='padding:10px 14px;border:2px solid #174979;border-radius:9px;background:#174979;color:#fff;font:700 15px system-ui;cursor:pointer;min-height:44px';button.onclick=()=>choose(value);row.append(button);}
  const link=document.createElement('a');link.href='/legal/cookies/';link.textContent='Política de Cookies';link.style.cssText='color:#064c94;text-decoration:underline;font-weight:700;padding:10px';row.append(link);banner.append(row);banner.hidden=choice!==null||location.pathname.startsWith('/legal/');document.body.append(banner);
  document.addEventListener('click',event=>{if(event.target.closest('[data-cookie-settings]')){event.preventDefault();open();}});
  enableAnalytics();
 }
 window.ad507CookieConsent={open:()=>banner?open():null,get:()=>choice};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
