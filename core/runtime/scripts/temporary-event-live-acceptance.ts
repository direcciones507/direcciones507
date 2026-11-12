/** Controlled live acceptance. Creates and removes only its own CLIENT test account. */
import postgres from 'postgres';
import sharp from 'sharp';
import {randomBytes,scryptSync} from 'node:crypto';
import {signedR2Request} from '../r2-signing';
import type {R2Settings} from '../r2-storage';
import {sealBackup} from './temporary-event-release';
const check=(ok:unknown,name:string)=>{if(!ok)throw Error('ACCEPTANCE_'+name)};
export async function liveAcceptance(env:Record<string,string|undefined>,settings:R2Settings){
 check(/^release-backups\/temporary-events\/[0-9TZ]+$/.test(env.AD507_ACCEPTANCE_BACKUP_PREFIX||''),'VERIFIED_BACKUP_REQUIRED');
 const sql=postgres(env.DATABASE_URL!,{max:2,connect_timeout:10,onnotice:()=>{}}),id=crypto.randomUUID(),email='temporary-qa-'+id+'@direcciones507.com',password=randomBytes(32).toString('hex'),salt=randomBytes(16).toString('hex');
 let browser:any,created=false;const report:any={commit:env.AD507_RELEASE_COMMIT,base:'https://direcciones.lat',paymentsDisabled:true,viewports:[]};
 const base='https://direcciones.lat';let cookie='';
 const call=async(path:string,options:RequestInit={})=>fetch(base+path,{...options,redirect:'manual',headers:{origin:base,'x-requested-with':'XMLHttpRequest',...(cookie?{cookie}:{}),...(options.headers||{})},signal:AbortSignal.timeout(30000)});
 const save=async(name:string,bytes:Uint8Array)=>{const key=env.AD507_ACCEPTANCE_BACKUP_PREFIX+'/'+name+'.enc',sealed=sealBackup(bytes,env.AD507_TEMPORARY_BACKUP_KEY!),signed=signedR2Request(settings,'PUT',key,sealed,'application/octet-stream');const r=await fetch(signed.url,{method:'PUT',headers:signed.headers,body:sealed,redirect:'error'});check(r.ok,'EVIDENCE_UPLOAD');return key};
 const remove=async(key:string)=>{check(/^temporary-events\/[a-f0-9-]{36}\/[a-f0-9]{64}\.webp$/.test(key),'CLEANUP_SCOPE');const signed=signedR2Request(settings,'DELETE',key,new Uint8Array(),'image/webp');const r=await fetch(signed.url,{method:'DELETE',headers:signed.headers,redirect:'error'});check(r.ok,'MEDIA_CLEANUP')};
 try{
  await sql.begin(async tx=>{
   await tx.unsafe("INSERT INTO ad507.users(id,email,display_name,status) VALUES($1,$2,'Prueba técnica temporal','ACTIVE')",[id,email]);
   await tx.unsafe("INSERT INTO ad507.user_roles(user_id,role) VALUES($1,'CLIENT')",[id]);
   await tx.unsafe('INSERT INTO ad507.email_credentials(user_id,password_hash,email_verified_at) VALUES($1,$2,now())',[id,'scrypt:'+salt+':'+scryptSync(password,Buffer.from(salt,'hex'),64).toString('hex')]);
  });created=true;
  const login=await call('/v1/auth/email/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})});check(login.status===200,'LOGIN');cookie=login.headers.getSetCookie().find(x=>x.startsWith('ad507_session='))?.split(';')[0]||'';check(cookie,'SESSION');
  check((await call('/panel/evento/nuevo')).status===200,'FORM');
  const today=new Date().toISOString().slice(0,10),draft={title:'QA Dirección Temporal '+id.slice(0,8),description:'Evento sintético de aceptación. No publicar.',startsOn:today,endsOn:today,timezone:'America/Panama',hours:'18:00 a 22:00',countryCode:'PA',province:'Veraguas',district:'Santiago',corregimiento:'Santiago',reference:'Ubicación de prueba',latitude:8.1,longitude:-80.9,responsibleName:'RESPONSABLE_PRIVADO_QA',responsibleEmail:email,responsiblePhone:'60000000',publicContactConsent:false};
  const saved=await call('/v1/user/temporary-events',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(draft)});check(saved.status===201,'SAVE_DRAFT');const event:any=await saved.json(),path='/v1/user/temporary-events/'+event.id;check(event.status==='DRAFT','DRAFT_STATE');
  const image=await sharp({create:{width:600,height:400,channels:3,background:'#1760ce'}}).jpeg().toBuffer();
  for(let slot=1;slot<=3;slot++){const form=new FormData();form.set('slot',String(slot));form.set('photo',new File([new Uint8Array(image)],'acceptance.jpg',{type:'image/jpeg'}));check((await call(path+'/photos',{method:'POST',body:form})).status===200,'PHOTO_'+slot)}
  const preview=await call(path+'/preview'),html=await preview.text();check(preview.status===200,'PREVIEW');check(!html.includes('RESPONSABLE_PRIVADO_QA')&&!html.includes(email),'PRIVACY');check(html.includes('Descargar QR PNG')&&html.includes('Google Maps')&&html.includes('Waze'),'QR_MAPS');
  check((await call('/evento/'+event.slug)).status===404,'UNPAID_NOT_PUBLIC');
  const pay=await call(path+'/payment',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({alias:'60000000'})});check(pay.status===503,'PAYMENTS_OFF');
  const csrf=await call(path,{method:'PUT',headers:{origin:'https://invalid.example','content-type':'application/json'},body:JSON.stringify(draft)});check(csrf.status===403,'CSRF');
  const anonymous=await fetch(base+path);check(anonymous.status===401,'AUTHORIZATION');
  const orders=await sql.unsafe('SELECT count(*)::int AS n FROM ad507.temporary_event_orders WHERE event_id=$1',[event.id]);check(orders[0].n===0,'NO_PROVIDER_ORDER');
  const {chromium}=await import('playwright-core');browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const width of [393,1440]){
   const context=await browser.newContext({viewport:{width,height:900},...(width===393?{isMobile:true,hasTouch:true}:{})});const page=await context.newPage(),errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));
   await context.addCookies([{name:'ad507_session',value:cookie.slice('ad507_session='.length),url:base}]);
   await page.goto(base+'/panel/evento/nuevo?draft='+event.id);await page.waitForFunction((title:string)=>document.querySelector<HTMLInputElement>('[name=title]')?.value===title,draft.title);
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'FORM_OVERFLOW_'+width);check(await page.locator('btn-yappy').count()===0,'NO_PAYMENT_BUTTON');
   await page.clock.install();await page.goto(base+path+'/preview');await page.waitForFunction(()=>document.images.length>=3&&[...document.images].every(i=>i.complete&&i.naturalWidth>0));
   check(await page.locator('.photos img').count()===3,'THREE_PHOTOS');check(await page.getByRole('link',{name:'Descargar QR PNG'}).count()===1,'QR_DOWNLOAD');check(await page.getByRole('button',{name:'Imprimir cartel QR'}).count()===1,'POSTER');
   await page.clock.runFor(3900);check(await page.locator('[data-slide="1"]').getAttribute('aria-current')==='true','CAROUSEL_START');await page.clock.runFor(7000);check(await page.locator('[data-slide="0"]').getAttribute('aria-current')==='true','CAROUSEL_ONE_CYCLE');await page.clock.fastForward(14000);check(await page.locator('[data-slide="0"]').getAttribute('aria-current')==='true','CAROUSEL_STOP');
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'PREVIEW_OVERFLOW_'+width);check(errors.length===0,'BROWSER_ERRORS');
   const screenshot=await save('live-acceptance-'+width+'.png',await page.screenshot({fullPage:true}));report.viewports.push({width,photos:3,carousel:true,overflow:false,screenshot});await context.close();
  }
  report.privateDraftVerified=true;report.noPaymentOrderCreated=true;report.completedAt=new Date().toISOString();await save('live-acceptance-report.json',Buffer.from(JSON.stringify(report)));
 }finally{
  await browser?.close();
  if(created){
   const media=await sql.unsafe('SELECT m.object_key FROM ad507.temporary_event_media m JOIN ad507.temporary_events e ON e.id=m.event_id WHERE e.owner_user_id=$1',[id]);for(const m of media)await remove(m.object_key);
   await sql.begin(async tx=>{await tx.unsafe('DELETE FROM ad507.temporary_events WHERE owner_user_id=$1',[id]);await tx.unsafe('DELETE FROM ad507.users WHERE id=$1 AND email=$2',[id,email]);});report.testAccountRemoved=true;
  }
  await sql.end({timeout:3});
 }
 console.log('TEMPORARY_LIVE_ACCEPTANCE_VERIFIED '+JSON.stringify(report));return report;
}
