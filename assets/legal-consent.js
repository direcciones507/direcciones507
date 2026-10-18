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
  banner.style.cssText='position:fixed;bottom:max(16px,env(safe-area-inset-bottom));left:16px;right:16px;width:min(100% - 32px,460px);max-width:460px;margin:auto;z-index:2147483000;padding:22px;background:#fff;color:#17324d;border:1px solid #d8e6f1;border-radius:20px;box-shadow:0 18px 65px #031a3560;font:15px/1.5 system-ui;box-sizing:border-box';
  const heading=document.createElement('h2');heading.textContent='Tu privacidad, tu elección';heading.style.cssText='font:750 20px/1.25 system-ui;margin:0 0 10px;color:#102e4a';banner.append(heading);
  const description=document.createElement('p');description.textContent='Usamos cookies necesarias para que el sitio funcione. Puedes aceptar o rechazar la analítica opcional sin afectar el servicio.';description.style.cssText='margin:0 0 18px;color:#48627a;font:400 14px/1.55 system-ui';banner.append(description);
  const row=document.createElement('div');row.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px';
  for(const [label,value]of [['Rechazar',false],['Aceptar',true]]){const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.analyticsChoice=String(value);button.style.cssText='width:100%;min-width:0;min-height:46px;padding:11px 10px;border:1px solid '+(value?'#087fb2':'#b9cddd')+';border-radius:11px;background:'+(value?'linear-gradient(125deg,#0898bf,#176ab5)':'#f4f8fc')+';color:'+(value?'#fff':'#163c59')+';font:700 14px system-ui;cursor:pointer';button.onclick=()=>choose(value);row.append(button);}
  banner.append(row);
  const link=document.createElement('a');link.href='/legal/cookies/';link.textContent='Consultar política de cookies';link.style.cssText='display:block;text-align:center;color:#16658f;text-decoration:underline;font:600 13px system-ui;margin-top:16px';banner.append(link);

