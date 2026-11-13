import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
let checks=0;
try{for(const width of [390,820,1440]){
 const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[],posts=[];let fixturePlan='BUSINESS_PREMIUM';page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());
  if(u.hostname==='bt-cdn-uat.yappycloud.com')return route.fulfill({contentType:'application/javascript',body:`customElements.define('btn-yappy',class extends HTMLElement{connectedCallback(){const b=document.createElement('button');b.textContent='Yappy fixture';b.onclick=()=>this.dispatchEvent(new Event('eventClick'));this.append(b);}eventPayment(v){this.dataset.fixture='received';}});`});
  if(u.hostname!=='commercial.test')return route.abort();
  if(u.pathname.startsWith('/panel/payments/'))return route.fulfill({contentType:'text/html',body:readFileSync('/tmp/ad507-commercial-fixture.html','utf8')});
  if(u.pathname.endsWith('/payment')){
   if(req.method()==='POST'){posts.push(req.postDataJSON());return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,orderId:'22222222-2222-4222-8222-222222222222',amountCents:1650,button:{token:'fixture'}})});}
   const split=u.searchParams.get('mode')==='INSTALLMENTS';if(split)await new Promise(resolve=>setTimeout(resolve,120));return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,quote:{plan:fixturePlan,paymentAvailable:fixturePlan!=='RESIDENTIAL',mode:split?'INSTALLMENTS':'ANNUAL',amountCents:fixturePlan==='RESIDENTIAL'?1499:split?1650:2999,totalCents:fixturePlan==='RESIDENTIAL'?1499:split?3300:2999,installments:split?2:1,modalitiesEnabled:true,currency:'USD'}})});
  }
  if(u.pathname.endsWith('/advertising')){const annual=u.searchParams.get('mode')==='PLACE_AD_365';return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,quote:{plan:'PLACE',mode:annual?'PLACE_AD_365':'PLACE_AD_30',amountCents:annual?16189:1499,durationDays:annual?365:30,paymentAvailable:false,images:[{id:'33333333-3333-4333-8333-333333333333'}]}})});}
  return route.fulfill({status:404,body:''});
 });
 const base='https://commercial.test/panel/payments/11111111-1111-4111-8111-111111111111';await page.goto(base);await page.getByText('Pago anual: $29.99 USD',{exact:false}).waitFor();
 await page.locator('#purchaseMode').selectOption('INSTALLMENTS');await page.getByText('Primera cuota: $16.50 USD',{exact:false}).waitFor();assert.match(await page.locator('#quote').textContent(),/total \$33.00/);
 await page.locator('#purchaseMode').selectOption('ANNUAL');await page.getByText('Pago anual: $29.99 USD',{exact:false}).waitFor();await page.locator('#purchaseMode').selectOption('INSTALLMENTS');await page.getByText('Primera cuota: $16.50 USD',{exact:false}).waitFor();
 await page.locator('#purchaseMode').selectOption('ANNUAL');await page.getByText('Pago anual: $29.99 USD',{exact:false}).waitFor();await page.locator('#purchaseMode').selectOption('INSTALLMENTS');await page.locator('#purchaseMode').selectOption('ANNUAL');await page.waitForTimeout(200);assert.match(await page.locator('#quote').textContent(),/Pago anual: \$29.99/);await page.locator('#purchaseMode').selectOption('INSTALLMENTS');await page.getByText('Primera cuota: $16.50 USD',{exact:false}).waitFor();
 await page.locator('#alias').fill('60000000');await page.getByRole('button',{name:'Yappy fixture'}).click();assert.equal(posts.length,0);await page.locator('#purchaseTerms').check();await page.getByRole('button',{name:'Yappy fixture'}).click();await page.locator('btn-yappy[data-fixture="received"]').waitFor();assert.equal(posts.length,1);assert.equal(posts[0].mode,'INSTALLMENTS');assert.equal(posts[0].legalAcceptance.accepted,true);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.goto(base+'?advertising=1');await page.getByText('Publicidad de Lugar · 30 días',{exact:false}).waitFor();await page.locator('#purchaseMode').selectOption('PLACE_AD_365');await page.getByText('Publicidad de Lugar · 365 días · $161.89 USD',{exact:false}).waitFor();assert.match(await page.locator('#message').textContent(),/pendiente de habilitación/);assert.equal(await page.locator('#checkout').isVisible(),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);fixturePlan='RESIDENTIAL';await page.goto(base+'?residential=1');await page.getByText('Residencial: tarifa anual US$14.99. Las nuevas contrataciones permanecen deshabilitadas; no se generará ningún cobro.',{exact:true}).waitFor();assert.equal(await page.locator('#checkout').isVisible(),false);assert.match(await page.locator('#quote').textContent(),/14.99/);assert.equal(posts.length,1);assert.deepEqual(errors,[]);checks+=17;await context.close();
 }}finally{await browser.close();}console.log(`Commercial browser: 3 viewport sizes, ${checks} assertions, no external payment or page errors.`);
