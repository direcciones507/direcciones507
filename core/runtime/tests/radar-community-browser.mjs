// Isolated browser checks of the new Radar dialogs. All writes intercepted; no real account or database.
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin='http://127.0.0.1:4184';
const server=spawn(process.execPath,['core/runtime/radar/scripts/preview.mjs'],{env:{...process.env,PORT:'4184',RADAR_TEST_FIXTURES:'1'},stdio:'inherit'});
const id='00000000-0000-4000-8000-000000000001',reportId='00000000-0000-4000-8000-000000000099';
const now=Date.now(),calls=[],errors=[];
let browser,context;
const assert=(ok,message)=>{if(!ok)throw Error(message);};
try{
 for(let i=0;i<50;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,...(process.env.RADAR_BROWSER_EXECUTABLE?{executablePath:process.env.RADAR_BROWSER_EXECUTABLE}:{}),args:['--disable-webgl']});
 await mkdir('/tmp/radar-new-features',{recursive:true});
 context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',geolocation:{latitude:8.9824,longitude:-79.5199},permissions:['geolocation']});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.route(origin+'/',async route=>{const response=await route.fetch(),html=await response.text();await route.fulfill({response,body:html.replace('</head>',['anonymous-reports','activity-validation','favorites','contributions','reputation','alerts'].map(s=>'<meta name="radar-'+s+'" content="true">').join('')+'</head>')});});
 await page.route('**/v1/auth/me',route=>route.fulfill({json:{user:{id:'test-only',roles:[]}}}));
 let saved=false,subscribed=false,validated=false;
 await page.route('**/v1/radar/**',async route=>{
  const req=route.request(),u=new URL(req.url()),kind=u.pathname.split('/').at(-1);
  if(kind==='map')return route.continue();
  const body=req.method()==='POST'?req.postDataJSON():null;calls.push({kind,body});
  if(kind==='activity-validation'){
   if(req.method()==='GET')return route.fulfill({json:{report:{id:reportId,state:'available',source:'community',reportedAt:now,confirmations:2,contradictions:1}}});
   validated=body.reportId===reportId&&body.agrees===true;return route.fulfill({status:201,json:{ok:true}});
  }
  if(kind==='favorites'){
   if(body.action==='add')saved=body.id===id;
   if(body.action==='remove')saved=false;
   return route.fulfill({json:body.action==='list'?{favorites:saved?[{id,name:'Café del Istmo',available:true,category:'cafe',country:'PA',coordinates:[-79.5166,8.9824]}]:[]}:{saved}});
  }
  if(kind==='contributions')return route.fulfill({json:{items:[{id:reportId,kind:'report',state:'available',source:'community',createdAt:now,current:true,name:'Café del Istmo'}],nextOffset:null}});
  if(kind==='reputation')return route.fulfill({json:{reports:5,validations:3,days:5,corroboratedDays:3,level:'active',windowDays:90}});
  if(kind==='alerts'){
   if(body.action==='enable')subscribed=body.id===id&&body.activity==='available';
   if(body.action==='disable')subscribed=false;
   return route.fulfill({json:body.action==='list'?{preferences:subscribed?[{id,name:'Café del Istmo',country:'PA',activity:'available',match:{state:'available',source:'community',reportedAt:now}}]:[]}:{enabled:subscribed}});
  }
  return route.fulfill({status:404,json:{error:'ISOLATED_TEST'}});
 });
 await page.goto(origin);await page.waitForFunction(()=>document.querySelector('#resultCount')?.textContent==='3'&&document.querySelector('#accountButton')?.textContent==='Mi cuenta');
 await page.locator('#map').scrollIntoViewIfNeeded();await page.locator('.leaflet-container').waitFor();
 await page.locator('#results .result-card').filter({hasText:'Café del Istmo'}).click();
 await page.locator('#detail .detail-options>summary').click();
 await page.getByRole('button',{name:'Validar actividad',exact:true}).click();
 await page.locator('#validationVote').waitFor();await page.locator('#validationGps').click();
 await page.waitForFunction(()=>document.querySelector('#validationDistance').textContent.includes('Distancia aproximada'));
 await page.getByRole('button',{name:'Confirmar actividad',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#validationStatus').textContent.includes('registrada'));
 assert(validated,'Confirmation payload');await page.locator('#validationDialog [data-close]').click();
 await page.getByRole('button',{name:'Guardar en favoritos',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('guardado en favoritos'));
 assert(saved,'Favorite payload');await page.getByRole('button',{name:'Cerrar ficha',exact:true}).click();
 await page.locator('#nearbyButton').click();await page.locator('#nearbyGps').click();
 await page.locator('#nearbyResults article').filter({hasText:'Café del Istmo'}).waitFor();
 await page.screenshot({path:'/tmp/radar-new-features/nearby-mobile.png'});await page.locator('#nearbyDialog [data-close]').click();
 await page.locator('#pulseButton').click();await page.locator('#pulseResults article').filter({hasText:'Restaurante La Terraza'}).waitFor();assert(await page.locator('#pulseResults article').count()===1,'Pulse must show active live campaigns only');assert(await page.locator('#pulseResults article').filter({hasText:'Café del Istmo'}).count()===0,'Featured/community-only report leaked into Pulse');
 await page.screenshot({path:'/tmp/radar-new-features/pulse-mobile.png'});await page.locator('#pulseDialog [data-close]').click();
 assert(await page.locator('#favoritesButton').isHidden(),'Personal tools initially visible');
 await page.locator('#personalTools>summary').click();
 await page.locator('#favoritesButton').click();await page.locator('#favoritesResults article').filter({hasText:'Café del Istmo'}).waitFor();
 await page.locator('#favoritesDialog [data-close]').click();
 await page.locator('#contributionsButton').click();await page.locator('#contributionsResults article').filter({hasText:'Café del Istmo'}).waitFor();
 await page.locator('#contributionsDialog [data-close]').click();
 await page.locator('#reputationButton').click();await page.locator('#reputationResults').getByText('Participación activa',{exact:true}).waitFor();
 await page.locator('#reputationDialog [data-close]').click();
 await page.locator('#alertsButton').click();await page.locator('#alertFavorite option').first().waitFor({state:'attached'});
 await page.locator('#alertEnable').click();await page.locator('#alertsResults article').filter({hasText:'Café del Istmo'}).waitFor();
 assert(subscribed,'Alert subscription payload');
 await page.screenshot({path:'/tmp/radar-new-features/alerts-mobile.png'});
 await page.getByRole('button',{name:'Desactivar alerta',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#alertsStatus').textContent.includes('Todavía no tienes alertas'));
 assert(!subscribed,'Alert unsubscribe');await page.locator('#alertsDialog [data-close]').click();
 assert(await page.locator('#personalTools').getAttribute('open')!==null,'Tools menu lost its open state');
 await page.locator('#favoritesButton').click();await page.getByRole('button',{name:'Quitar favorito',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#favoritesStatus').textContent.includes('Todavía no tienes favoritos'));
 assert(!saved,'Favorite removal');await page.locator('#favoritesDialog [data-close]').click();
 assert(calls.every(c=>!c.body||!('latitude' in c.body)&&!('longitude' in c.body)&&!('accountRef' in c.body)),'Unexpected precise position or account override in writes');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow');
 assert(!errors.length,'Page errors: '+errors.join('; '));
 console.log('Radar new features: isolated mobile interactions passed; no real writes.');
}finally{await context?.close();await browser?.close();server.kill();}
