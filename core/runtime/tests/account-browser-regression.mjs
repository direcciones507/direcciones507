// Isolated real-browser regression. All account and request data below is synthetic.
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {Script} from 'node:vm';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fixtures=JSON.parse(readFileSync(process.env.ACCOUNT_FIXTURES||'/tmp/ad507-account-fixtures.json','utf8'));
for(const [name,{html}]of Object.entries(fixtures)){
 for(const [i,m]of [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].entries())new Script(m[1],{filename:name+'-'+i});
}
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-gpu']}: {})});
const id='11111111-1111-4111-8111-111111111111';
const plans=['BUSINESS_FREE','BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO'].map(code=>({code,name:code}));
let passed=0;
try{
 for(const viewport of [{width:390,height:844},{width:820,height:1180},{width:1440,height:1000}]){
  const homeContext=await browser.newContext({viewport}),home=await homeContext.newPage();home.setDefaultTimeout(7000);
  await home.route('**/*',route=>new URL(route.request().url()).pathname==='/'?route.fulfill({status:200,contentType:'text/html',body:fixtures.home507.html}):route.fulfill({status:404,body:''}));
  await home.goto('https://direcciones507.com/');
  for(const plan of ['PLACE','BUSINESS_FREE','BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO']){
   await home.locator('[data-507-plan="'+plan+'"]').click();
   assert.equal(await home.locator('#plan507Continue').getAttribute('href'),'https://direcciones.lat/panel?country=PA&origin=507&selectedPlan='+plan);
   await home.locator('#plan507Close').click();
  }
  await homeContext.close();
  for(const status of [200,401,503]){
   const context=await browser.newContext({viewport});const page=await context.newPage();page.setDefaultTimeout(7000);const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   let panelReads=0,activeStatus=status;
   await page.route('https://direcciones.lat/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/panel')return route.fulfill({status:200,...fixtures.plan,body:fixtures.plan.html});
    if(url.pathname==='/v1/user/panel'){panelReads++;return route.fulfill({status:activeStatus,json:activeStatus===200?{ok:true,user:{email:'test@example.invalid'},addresses:[{id,source:'USER_REQUEST',name:'Solicitud de prueba',addressType:'BUSINESS',planCode:'BUSINESS_PREMIUM_PRO',status:'PENDING_REVIEW',workflow:'PAYMENT_PENDING'}],orders:[],plans,actions:{prepareRequest:true,submitRequest:true}}:{ok:false,error:status===401?'UNAUTHENTICATED':'USER_PANEL_UNAVAILABLE'}});}
    if(url.pathname==='/v1/user/requests/'+id)return route.fulfill({json:{request:{id,name:'Solicitud de prueba',type:'BUSINESS',status:'PENDING_REVIEW',countryCode:'PA',latitude:8,longitude:-80,extras:{plan:'BUSINESS_PREMIUM_PRO',workflow:'PAYMENT_PENDING'},media:[]}}});
    if(url.pathname==='/auth/google/login'){
     assert.equal(url.searchParams.get('country'),'PA');
     // Simulates only the callback destination; actual provider auth needs a private session.
     return route.fulfill({status:200,contentType:'text/html',body:'<p>Proveedor Google simulado</p>'});
    }
    return route.fulfill({status:404,body:''});
   });
   await page.goto('https://direcciones.lat/panel?country=PA&origin=507&selectedPlan=BUSINESS_PREMIUM_PRO');
   await page.locator('#loading').waitFor({state:'hidden'});
   assert.equal(new URL(page.url()).pathname,'/panel');assert.equal(panelReads,1);if(await page.getByRole('button',{name:'Rechazar',exact:true}).isVisible())await page.getByRole('button',{name:'Rechazar',exact:true}).click();
   if(status===200){
    await page.locator('#requestForm').waitFor({state:'visible'});
    assert.equal(await page.locator('#plan').inputValue(),'BUSINESS_PREMIUM_PRO');
    assert.equal(await page.locator('#countryCode').inputValue(),'PA');
    await page.locator('[data-request-detail]').click();
    await page.getByRole('heading',{name:'Solicitud de prueba'}).waitFor();
    assert.equal(await page.getByRole('link',{name:'Pagar ahora con Yappy'}).getAttribute('href'),'/panel/payments/'+id);
    assert.equal(await page.locator('#requestForm').isVisible(),false);
    await page.getByRole('button',{name:'Cerrar detalle'}).click();
    await page.locator('#toggleNewRequest').click();await page.locator('#business').click();await page.locator('#requestForm').waitFor({state:'visible'});
    for(const code of plans.map(p=>p.code)){await page.locator('#plan').selectOption(code);assert.equal(await page.locator('#namedCodeField').isVisible(),code!=='BUSINESS_FREE');}
   }else{
    await page.locator('#login').waitFor({state:'visible'});
    assert.equal(await page.locator('#panel').isVisible(),false);
    if(status===401){
     await page.locator('#google').click();
     await page.waitForURL('**/auth/google/login?country=PA');
     assert.equal(await page.evaluate(()=>sessionStorage.getItem('ad507PendingPlan')),'BUSINESS_PREMIUM_PRO');
     assert.equal(await page.evaluate(()=>sessionStorage.getItem('ad507EntryOrigin')),'507');
     activeStatus=200;await page.goto('https://direcciones.lat/panel?country=PA');await page.locator('#requestForm').waitFor({state:'visible'});assert.equal(await page.locator('#plan').inputValue(),'BUSINESS_PREMIUM_PRO');assert.equal(new URL(page.url()).searchParams.get('origin'),'507');
    }
   }
   assert.deepEqual(errors,[]);passed++;await context.close();
  }
 }
 console.log('PASS: generated JavaScript, 9 browser scenarios, mobile/tablet/desktop, 200/401/503, detail, plans, Google return context');
}finally{await browser.close();}
