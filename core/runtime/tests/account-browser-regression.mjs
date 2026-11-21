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
 // Shared card + real Radar UI; every HTTP request is isolated and no real account is used.
 for(const registrationKind of ['user','owner']){
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>console.error('RADAR_PAGE_ERROR',e.stack||e.message));
  const radar='https://radar.direcciones.lat',latam='https://direcciones.lat';let loginPosts=0,logoutPosts=0;
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url()),path=url.pathname;
   if(![radar,latam].includes(url.origin))return route.abort();
   if(url.origin===radar){
    if(path==='/')return route.fulfill({contentType:'text/html',body:readFileSync(new URL('../radar/ui/index.html',import.meta.url),'utf8').replace('</head>','<meta name="radar-registration-profiles" content="true"></head>')});
    if(path.startsWith('/radar/ui/')&&!path.includes('..')){
     const asset=path.slice('/radar/ui/'.length);
     // This test covers authentication, so no map engines or remote tiles are required.
     if(asset.includes('vendor/')||asset==='raster-map.js')return route.fulfill({status:404,body:''});
     return route.fulfill({contentType:asset.endsWith('.css')?'text/css':'text/javascript',body:readFileSync(new URL('../radar/ui/'+asset,import.meta.url))});
    }
    if(path==='/v1/auth/me')return route.fulfill({status:request.headers().cookie?.includes('__Secure-ad507_radar_session=isolated-test')?200:401,json:request.headers().cookie?.includes('__Secure-ad507_radar_session=isolated-test')?{user:{id:'00000000-0000-4000-8000-000000000001',roles:['CLIENT']}}:{error:'UNAUTHENTICATED'}});
    if(path==='/v1/radar/map')return route.fulfill({json:{type:'FeatureCollection',features:[]}});
    if(path==='/auth/logout'){logoutPosts++;return route.fulfill({status:204,headers:{'set-cookie':'__Secure-ad507_radar_session=; Max-Age=0; Path=/; Secure; HttpOnly; Domain=direcciones.lat; SameSite=Lax'}});}
   }else{
    if(path==='/auth/radar')return route.fulfill({status:302,headers:{location:url.searchParams.get('panel')==='1'?latam+'/panel?radar=1'+(url.searchParams.get('add')==='1'?'&addLocal=1':'')+'#radarAccountSection':loginPosts?radar+'/':latam+'/commercial/international?access=1&radar=1'}});
    if(path==='/panel')return route.fulfill({contentType:'text/html; charset=utf-8',body:fixtures.plan.html});
    if(path==='/'||path==='/commercial/international')return route.fulfill({contentType:'text/html',body:fixtures.commercial.html});
    if(path==='/v1/user/panel')return route.fulfill({status:401,json:{error:'UNAUTHENTICATED'}});
    if(path==='/v1/auth/email/login'){
     loginPosts++;assert.equal(request.method(),'POST');assert.equal(request.headers().origin,latam);
     assert.deepEqual(request.postDataJSON(),{email:'radar-browser@example.invalid',password:'synthetic-password-123',token:''});
     return route.fulfill({json:{ok:true,redirect:radar+'/'},headers:{'set-cookie':'__Secure-ad507_radar_session=isolated-test; Path=/; Secure; HttpOnly; Domain=direcciones.lat; SameSite=Lax'}});
    }
   }
   return route.fulfill({status:404,body:''});
  });
  await page.goto(radar+'/');await page.locator('#addButton').click();await page.getByRole('button',{name:registrationKind==='owner'?'Soy propietario de un comercio':'Soy usuario',exact:true}).click();await page.waitForURL(latam+'/commercial/international?access=1&radar=1');
  if(await page.getByRole('button',{name:'Rechazar',exact:true}).isVisible()){
   // The access dialog is modal: close it before using a background consent control.
   await page.getByRole('button',{name:'Cerrar acceso',exact:true}).click();
   await page.getByRole('button',{name:'Rechazar',exact:true}).click();
   await page.reload();await page.locator('#latamAccess').waitFor({state:'visible'});
  }
  await page.locator('#latamAccessEmail').fill('radar-browser@example.invalid');await page.locator('#latamAccessPassword').fill('synthetic-password-123');
  await page.locator('#latamEmailSubmit').click();
  if(registrationKind==='owner'){
   await page.waitForURL(latam+'/panel?radar=1&addLocal=1#radarAccountSection');
  }else{
   await page.waitForURL(radar+'/');
   try{await page.locator('#addDialog').waitFor({state:'visible'});}
   catch(error){
    const diag=await page.evaluate(()=>({url:location.href,button:document.querySelector('#accountButton')?.textContent,storage:sessionStorage.getItem('radarAction'),dialogOpen:document.querySelector('#addDialog')?.open,logoutPresent:!!document.querySelector('#radarLogoutButton'),logoutVisible:!document.querySelector('#radarLogoutButton')?.hidden}));
    console.error('RADAR_COMMUNITY_RESUME_DIAGNOSTIC',JSON.stringify(diag));
    throw error;
   }
   assert.equal(await page.locator('#accountButton').innerText(),'Mi panel');
   assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('radarAction')).type),'add');
   assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('radarAction')).registrationKind),'user');
   assert.equal(await page.locator('#ownerRegistrationFields').isVisible(),false);
   // A modal dialog makes controls outside it inert. Close it before checking the header.
   await page.locator('#addDialog [data-close]').click();
   const logoutView=await page.locator('#radarLogoutButton').evaluate(el=>({hidden:el.hidden,display:getComputedStyle(el).display}));
   assert.equal(logoutView.hidden,false,'Authenticated Radar logout must be unhidden: '+JSON.stringify(logoutView));
   assert.equal(await page.locator('#radarLogoutButton').isVisible(),true);
   await page.locator('#accountButton').click();
   await page.waitForURL(latam+'/panel?radar=1#radarAccountSection');
  }
  assert.equal(loginPosts,1);assert.equal(logoutPosts,0);
  const cookie=(await context.cookies(radar)).find(c=>c.name==='__Secure-ad507_radar_session');assert.ok(cookie?.httpOnly&&cookie?.secure);
  assert.ok((await context.cookies(radar)).some(c=>c.name==='__Secure-ad507_radar_session'&&c.httpOnly&&c.secure));
  await context.close();console.log('PASS: isolated Radar -> dedicated shared LATAM email card -> automatic Radar pending add action -> CORE account; no real accounts or writes.');
 }

 for(const viewport of [{width:390,height:844},{width:820,height:1180},{width:1440,height:1000}]){
  const homeContext=await browser.newContext({viewport}),home=await homeContext.newPage();home.setDefaultTimeout(7000);
  await home.route('**/*',route=>new URL(route.request().url()).pathname==='/'?route.fulfill({status:200,contentType:'text/html',body:fixtures.home507.html}):route.fulfill({status:404,body:''}));
  await home.goto('https://direcciones507.com/');
  const homePlans={};
  for(const plan of ['PLACE','TEMPORARY_ADDRESS','BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO']){
   const card=home.locator('[data-commercial-plan="'+plan+'"]');
   await card.locator('.btn-plan-action-trigger').click();
   const expected=plan==='TEMPORARY_ADDRESS'?'https://direcciones.lat/panel/evento/nuevo':'https://direcciones.lat/panel?country=PA&origin=507&selectedPlan='+plan;
   assert.equal(await home.locator('#plan507Continue').getAttribute('href'),expected);
   homePlans[plan]={title:await home.locator('#plan507Title').textContent(),price:await home.locator('#plan507Price').textContent(),features:await home.locator('#plan507Features li').allTextContents(),summary:await card.locator('.plan-507-summary').textContent(),style:await card.evaluate(c=>{const s=getComputedStyle(c);return [s.backgroundColor,s.borderRadius,s.padding];})};
   await home.locator('#plan507Close').click();
  }
  const latam=await homeContext.newPage();latam.setDefaultTimeout(7000);
  await latam.route('**/*',route=>{
   const path=new URL(route.request().url()).pathname;
   if(path==='/')return route.fulfill({contentType:'text/html',body:fixtures.commercial.html});
   if(path==='/v1/user/panel')return route.fulfill({status:401,json:{ok:false,error:'UNAUTHENTICATED'}});
   return route.fulfill({status:404,body:''});
  });
  await latam.goto('https://direcciones.lat/');
  if(await latam.getByRole('button',{name:'Rechazar',exact:true}).isVisible())await latam.getByRole('button',{name:'Rechazar',exact:true}).click();
  for(const [plan,expected]of Object.entries(homePlans)){
   const card=latam.locator('[data-commercial-plan="'+plan+'"]');await card.click();
   await latam.locator('#latamPlanDetails').waitFor({state:'visible'});
   assert.equal(await latam.locator('#latamPlanDetailsTitle').textContent(),expected.title);
   assert.equal(await latam.locator('#latamPlanDetailsPrice').textContent(),expected.price);
   assert.deepEqual(await latam.locator('#latamPlanDetailsFeatures li').allTextContents(),expected.features);
   assert.equal(await card.locator('.latam-plan-action>p').textContent(),expected.summary);
   assert.deepEqual(await card.evaluate(c=>{const s=getComputedStyle(c);return [s.backgroundColor,s.borderRadius,s.padding];}),expected.style);
   assert.equal(await latam.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   assert.equal(await latam.locator('#latamPlanDetails').evaluate(c=>c.scrollWidth<=c.clientWidth+1),true);
   await latam.locator('#latamPlanDetailsBack').click();
  }
  await homeContext.close();
  // Checkout is rendered without provider activity or real payment. Keep the
  // official Yappy custom-element host and verify responsive legibility.
  const payContext=await browser.newContext({viewport});
  const payPage=await payContext.newPage();payPage.setDefaultTimeout(7000);
  const checkoutErrors=[];payPage.on('pageerror',e=>checkoutErrors.push(e.message));
  await payPage.route('https://bt-cdn.yappy.cloud/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
  await payPage.route('https://direcciones.lat/**',route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/panel/payments/'+id)return route.fulfill({status:200,contentType:'text/html',body:fixtures.payment.html});
    if(path==='/v1/user/requests/'+id+'/payment')return route.fulfill({status:200,json:{ok:true,quote:{amountCents:4999,orderId:null}}});
    return route.fulfill({status:404,body:''});
  });
  await payPage.goto('https://direcciones.lat/panel/payments/'+id);
  await payPage.locator('#checkout').waitFor({state:'visible'});
  assert.equal(await payPage.locator('#quote').textContent(),'Pago anual: $49.99 USD · Vigencia 12 meses · Sin cobro automático');
  assert.equal(await payPage.locator('btn-yappy').count(),1);
  assert.equal(await payPage.locator('.back-link').getAttribute('href'),'/panel');
  const backStyle=await payPage.locator('.back-link').evaluate(link=>({
    label:link.textContent.replace(/\\s+/g,' ').trim(),
    decoration:getComputedStyle(link).textDecorationLine,
    background:getComputedStyle(link).backgroundColor,
    borderRadius:getComputedStyle(link).borderRadius
  }));
  assert.equal(backStyle.label,'←Volver a Mi cuenta');
  assert.equal(backStyle.decoration,'none');
  assert.notEqual(backStyle.background,'rgba(0, 0, 0, 0)');
  assert.notEqual(backStyle.borderRadius,'0px');

  assert.equal(await payPage.locator('.notice').isVisible(),true);
  assert.equal(await payPage.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true);
  const background=await payPage.locator('main').evaluate(main=>getComputedStyle(main).backgroundColor);
  assert.equal(background,'rgb(255, 255, 255)');
  assert.deepEqual(checkoutErrors,[]);
  await payContext.close();
  for(const status of [200,401,503]){
   const context=await browser.newContext({viewport});const page=await context.newPage();page.setDefaultTimeout(7000);const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   let panelReads=0,activeStatus=status;
   await page.route('https://direcciones.lat/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/panel')return route.fulfill({status:200,...fixtures.plan,body:fixtures.plan.html});
    if(url.pathname==='/v1/user/panel'){panelReads++;return route.fulfill({status:activeStatus,json:activeStatus===200?{ok:true,user:{email:'test@example.invalid'},addresses:[{id,source:'USER_REQUEST',name:'Solicitud de prueba',addressType:'BUSINESS',planCode:'BUSINESS_PREMIUM_PRO',planName:'Premium Pro',status:'PENDING_REVIEW',workflow:'PAYMENT_PENDING'}],orders:[],plans,actions:{prepareRequest:true,submitRequest:true}}:{ok:false,error:status===401?'UNAUTHENTICATED':'USER_PANEL_UNAVAILABLE'}});}
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
    // Contrast regression: blue business card and white review preview must
    // never inherit the opposite surface's foreground colors.
    const cardContrast=await page.locator('.address-card').evaluate(card=>({
      background:getComputedStyle(card).backgroundImage,
      kind:getComputedStyle(card.querySelector('.address-kind')).color,
      plan:getComputedStyle(card.querySelector('.address-plan')).color
    }));
    if(!/linear-gradient/.test(cardContrast.background))console.log('CARD_VISUAL_DIAGNOSTIC',JSON.stringify({
      cardContrast,
      bodyClass:await page.locator('body').getAttribute('class'),
      visibleStyleCount:await page.evaluate(()=>document.styleSheets.length),
      styleHasContract:await page.evaluate(()=>document.head.innerHTML.includes('Final contrast contract')),
      cardClass:await page.locator('.address-card').first().getAttribute('class'),
      computed:await page.locator('.address-card').evaluate(card=>{
        const c=getComputedStyle(card);
        return {background:c.background,backgroundColor:c.backgroundColor,backgroundImage:c.backgroundImage,cssText:card.getAttribute('style')};
      }),
      matchingCss:await page.evaluate(()=>Array.from(document.styleSheets).flatMap(sheet=>Array.from(sheet.cssRules||[]).filter(rule=>rule.selectorText?.includes('.address-card')&&rule.style?.background).map(rule=>({selector:rule.selectorText,background:rule.style.background}))).slice(-10))
    }));
    assert.match(cardContrast.background,/linear-gradient/);
    assert.equal(cardContrast.kind,'rgb(255, 255, 255)');
    assert.equal(cardContrast.plan,'rgb(234, 245, 255)');
    const reviewContrast=await page.locator('#preview').evaluate(preview=>{
      preview.innerHTML='<div class="review-title">Prueba de contraste</div><div class="review-ref">Referencia visible</div><p>Celular visible</p>';
      return {
        background:getComputedStyle(preview).backgroundColor,
        title:getComputedStyle(preview.querySelector('.review-title')).color,
        ref:getComputedStyle(preview.querySelector('.review-ref')).color,
        phone:getComputedStyle(preview.querySelector('p')).color
      };
    });
    assert.equal(reviewContrast.background,'rgb(255, 255, 255)');
    assert.equal(reviewContrast.title,'rgb(18, 43, 72)');
    assert.equal(reviewContrast.ref,'rgb(24, 50, 77)');
    assert.equal(reviewContrast.phone,'rgb(32, 59, 89)');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true);

    // A selected plan opens the focused creation view. Close it before inspecting an existing request.
    if(await page.locator('#panel').evaluate(el=>el.classList.contains('panel-creation-focus'))){
      assert.equal(await page.locator('#requestForm').isVisible(),true);
      assert.equal(await page.locator('[data-request-detail]').isVisible(),false);
      await page.locator('#panel-creation-close').click();
      assert.equal(await page.locator('[data-request-detail]').isVisible(),true);
    }
    await page.locator('[data-request-detail]').click();
    await page.locator('#requestDetail').getByRole('heading',{name:'Solicitud de prueba',exact:true}).waitFor();
    assert.equal(await page.getByRole('link',{name:'Ir al pago'}).getAttribute('href'),'/panel/payments/'+id);
    assert.equal(await page.locator('#requestForm').isVisible(),false);
    await page.getByRole('button',{name:'Cerrar detalle'}).click();
    await page.locator('#toggleNewRequest').click();await page.locator('#business').click();await page.locator('#requestForm').waitFor({state:'visible'});
    assert.equal(await page.locator('#plan option[value=BUSINESS_FREE]').count(),0);
    assert.deepEqual(await page.locator('#plan option').allTextContents(),['Premium · $29.99 / año','Premium Pro · $49.99 / año']);
    for(const code of plans.map(p=>p.code).filter(code=>code!=='BUSINESS_FREE')){await page.locator('#plan').selectOption(code);assert.equal(await page.locator('#namedCodeField').isVisible(),code!=='BUSINESS_FREE');}
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
 // Re-enter an expired/rejected/cancelled purchase on both first-party hosts.
 // Provider CDN and HTTP responses are synthetic; no financial traffic occurs.
 for(const host of ['direcciones507.com','direcciones.lat']){
  const context=await browser.newContext({viewport:{width:820,height:1180}}),page=await context.newPage();page.setDefaultTimeout(7000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const order='22222222-2222-4222-8222-222222222222';let current='PENDING',retryAllowed=false,posts=0,statusReads=0;
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url()),path=url.pathname;
   if(url.hostname==='bt-cdn.yappy.cloud')return route.fulfill({contentType:'application/javascript',body:"customElements.define('btn-yappy',class extends HTMLElement{eventPayment(){window.providerDisplays=(window.providerDisplays||0)+1;}});"});
   if(path==='/panel/payments/'+id)return route.fulfill({contentType:'text/html',body:fixtures.payment.html});
   if(path==='/v1/user/payments/'+order){statusReads++;return route.fulfill({json:{payment:{status:current,retryAllowed}}});}
   if(path==='/v1/user/requests/'+id+'/payment'){
    if(route.request().method()==='POST'){posts++;assert.equal(current==='FAILED'||current==='CANCELLED',true);current='PENDING';retryAllowed=false;return route.fulfill({json:{orderId:order,amountCents:4999,button:{transactionId:'fake',token:'fake',documentName:'fake'}}});}
    return route.fulfill({json:{quote:{amountCents:4999,orderId:order}}});
   }
   if(path==='/panel')return route.fulfill({contentType:'text/html',body:fixtures.pa.html});
   if(path==='/admin/create')return route.fulfill({contentType:'text/html',body:fixtures.admin.html});
   if(path==='/v1/user/panel')return route.fulfill({json:{user:{email:'test@example.invalid'},addresses:[],orders:[],plans,actions:{prepareRequest:true,submitRequest:true}}});
   return route.fulfill({status:404,body:''});
  });
  await page.goto('https://'+host+'/panel?country=PA&selectedPlan=BUSINESS_PREMIUM');
  await page.locator('#requestForm').waitFor({state:'visible'});
  if(await page.getByRole('button',{name:'Rechazar',exact:true}).isVisible())await page.getByRole('button',{name:'Rechazar',exact:true}).click();
  assert.equal(await page.locator('#plan').inputValue(),'BUSINESS_PREMIUM');
  assert.deepEqual(await page.locator('#plan option').evaluateAll(options=>options.map(o=>o.value)),['BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO']);
  await page.locator('#plan').selectOption('BUSINESS_PREMIUM_PRO');
  // Focused creation hides the picker until the current form is closed.\n  await page.locator('#panel-creation-close').click();\n  await page.locator('#toggleNewRequest').click();\n  await page.locator('#place').click();assert.equal(await page.locator('#coverField').isVisible(),true);
  for(const status of ['FAILED','FAILED','CANCELLED']){
   current='PENDING';retryAllowed=false;
   await page.goto('https://'+host+'/panel/payments/'+id+'?order='+order);
   await page.locator('#message').filter({hasText:'Pago pendiente'}).waitFor();assert.equal(await page.locator('#checkout').isVisible(),false);
   current=status;retryAllowed=true;
   await page.locator('#refresh').click();await page.locator('#checkout').waitFor({state:'visible'});
   await page.locator('#alias').fill('60000000');await page.locator('#purchaseTerms').check();
   await page.reload();await page.locator('#checkout').waitFor({state:'visible'});assert.equal(await page.locator('#alias').inputValue(),'60000000');
   await page.locator('#purchaseTerms').check();const beforeReads=statusReads,beforePosts=posts;
   await page.locator('btn-yappy').dispatchEvent('eventClick');await page.waitForFunction(()=>window.providerDisplays===1);
   assert.equal(posts,beforePosts+1);assert.ok(statusReads>beforeReads);
   await page.locator('btn-yappy').dispatchEvent('eventClick');await page.locator('#checkout').waitFor({state:'hidden'});assert.equal(posts,beforePosts+1);
   current='PAID';retryAllowed=false;await page.locator('#refresh').click();await page.locator('#message').filter({hasText:'Pago confirmado'}).waitFor();assert.equal(await page.locator('#checkout').isVisible(),false);
  }
  await page.goto('https://'+host+'/admin/create');
  await page.locator('#plan option[value=BUSINESS_FREE]').waitFor({state:'attached'});
  assert.deepEqual(errors,[]);await context.close();
 }
 // ADMIN sees the same forms with server-authorized free actions, never checkout.
 for(const width of [390,820]){
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage();page.setDefaultTimeout(7000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const p=new URL(route.request().url()).pathname;
   if(p==='/panel')return route.fulfill({contentType:'text/html',body:fixtures.admin.html});
   if(p==='/panel/evento/nuevo')return route.fulfill({contentType:'text/html',body:fixtures.adminEvent.html});
   if(p==='/icons')return route.fulfill({contentType:'text/html',body:fixtures.businessIcons.html});
   if(p==='/v1/user/panel')return route.fulfill({json:{user:{email:'admin@example.invalid'},billingExempt:true,addresses:[],orders:[],plans,actions:{prepareRequest:true,submitRequest:true}}});
   if(p==='/v1/user/temporary-events')return route.fulfill({json:{events:[]}});
   return route.fulfill({status:404,body:''});
  });
  await page.goto('https://direcciones.lat/panel?selectedPlan=BUSINESS_PREMIUM');await page.locator('#requestForm').waitFor({state:'visible'});
  if(await page.getByRole('button',{name:'Rechazar',exact:true}).isVisible())await page.getByRole('button',{name:'Rechazar',exact:true}).click();
  assert.equal(await page.locator('#orderSection').isVisible(),false);
  assert.equal((await page.locator('#plan option').allTextContents()).some(s=>s.includes('$')),false);
  assert.match(await page.locator('.temporary-event-cta').textContent(),/Gratis/);
  await page.locator('.temporary-event-cta').click();await page.locator('#temporary-event-draft').waitFor({state:'visible'});
  assert.equal(await page.locator('btn-yappy').count(),0);assert.equal(await page.locator('#event-alias').count(),0);assert.equal(await page.locator('#event-publish').count(),1);
  await page.goto('https://direcciones.lat/icons');
  for(const target of ['#btnHorario .accordion-icon-left i','#btnQR .accordion-icon-left i'])assert.equal(await page.locator(target).evaluate(e=>getComputedStyle(e).color),'rgb(238, 244, 252)');
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS: generated JavaScript, 9 account browser scenarios + 3 visual Yappy fixtures, mobile/tablet/desktop, 200/401/503, contrast, detail, plans and Google return context; terminal Yappy retries and preserved Lugar on both production hosts');
}finally{await browser.close();}
