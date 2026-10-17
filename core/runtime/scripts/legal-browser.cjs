const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.cwd(),out=path.join(root,'legal-browser-evidence');fs.mkdirSync(out,{recursive:true});
const version='1.0-20261017',results=[];
const fixtures=path.join(root,'.legal-browser-fixtures');
(async()=>{
 const browser=await chromium.launch({headless:true});
 for(const [device,width,height]of [['mobile',390,844],['tablet',820,1180],['desktop',1440,1000]]){
  const context=await browser.newContext({viewport:{width,height}});let authenticated=false,analytics=0,posts=[],registers=0;const errors=[];
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.hostname==='www.googletagmanager.com'){analytics++;return route.fulfill({contentType:'application/javascript',body:''});}
   if(!['direcciones.lat','direcciones507.com'].includes(url.hostname)){if(['unpkg.com','cdnjs.cloudflare.com','fonts.googleapis.com','fonts.gstatic.com','raw.githubusercontent.com'].includes(url.hostname))return route.continue();return route.abort();}
   if(url.pathname==='/v1/user/panel')return route.fulfill({status:authenticated?200:401,contentType:'application/json',body:JSON.stringify(authenticated?{user:{email:'fixture@example.test',displayName:'Prueba local'},addresses:[],orders:[],plans:[{code:'BUSINESS_FREE',name:'Negocio Gratis'},{code:'BUSINESS_PREMIUM',name:'Premium'},{code:'BUSINESS_PREMIUM_PRO',name:'Premium Pro'}],actions:{prepareRequest:true,submitRequest:true},nextAddressCursor:null}:{error:'UNAUTHENTICATED'})});
   if(url.pathname==='/v1/user/requests'&&request.method()==='POST'){
    const body=request.postDataBuffer().toString();const match=body.match(/name="payload"\r\n\r\n([^\r]+)\r\n/);assert(match,'multipart payload');const payload=JSON.parse(match[1]);posts.push(payload);
    const free=payload.type==='PLACE'||payload.plan==='BUSINESS_FREE';return route.fulfill({contentType:'application/json',body:JSON.stringify({request:{id:'11111111-1111-4111-8111-111111111111',status:free?'PENDING_REVIEW':'DRAFT',...(free?{}:{workflow:'PAYMENT_PENDING'})}})});
   }
   if(url.pathname==='/v1/auth/email/register'){registers++;return route.fulfill({contentType:'application/json',body:'{"ok":true}'});}
   if(url.pathname==='/v1/legal/account-acceptance')return route.fulfill({contentType:'application/json',body:'{"ok":true}'});
   let filename;
   if(url.pathname==='/')filename=url.hostname==='direcciones507.com'?path.join(root,'index.html'):path.join(fixtures,'latam.html');
   else if(url.pathname==='/panel')filename=path.join(fixtures,'panel.html');
   else if(url.pathname.startsWith('/legal/'))filename=path.join(root,url.pathname,'index.html');
   else filename=path.join(root,url.pathname);
   if(!filename.startsWith(root)||!fs.existsSync(filename)||!fs.statSync(filename).isFile())return route.fulfill({status:404,body:''});
   const ext=path.extname(filename),contentType=({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'})[ext]||'application/octet-stream';
   return route.fulfill({contentType,body:fs.readFileSync(filename)});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  for(const key of ['terms','privacy','commercial','cookies']){
   const response=await page.goto('https://direcciones.lat/legal/'+key+'/');assert.equal(response.status(),200);await page.waitForSelector('article');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'legal overflow '+device+' '+key);
   assert.equal(await page.locator('body').innerText().then(t=>/REVISIÓN INTERNA|NO PUBLICAR|\{\{|debe verificarse antes/.test(t)),false);
   await page.screenshot({path:path.join(out,device+'-'+key+'.png')});
   results.push({device,key,status:200,horizontalOverflow:false});
  }
  await page.goto('https://direcciones507.com/');assert.equal(analytics,0,'no analytics before choice');
  await page.locator('[data-analytics-choice="false"]').click();assert.equal(analytics,0,'reject analytics');
  await page.locator('[data-cookie-settings]').first().click();await page.locator('[data-analytics-choice="true"]').click();await page.waitForFunction(()=>document.querySelector('script[src*="gtag/js"]'));assert.equal(analytics,1,'only accepted GA loaded');
  assert.equal(await page.locator('iframe[src*="googletagmanager"]').count(),0);assert.equal(await page.locator('script[src*="gtm.js"]').count(),0);
  for(const card of await page.locator('.plan-pricing-card').all())assert.equal(await card.locator('.plan-legal a').count(),4);
  await page.locator('.planes-grid-layout').screenshot({path:path.join(out,device+'-507-plans.png')});
  await page.goto('https://direcciones.lat/?access=1');await page.waitForSelector('#latamAccess[open]');
  if(await page.locator('#ad507CookieOptions').isVisible())await page.locator('[data-analytics-choice="false"]').click();
  assert.equal(await page.locator('#latamRegistrationTermsAccepted').isChecked(),false);
  await page.locator('#latamAccessEmail').fill('fixture@example.test');await page.locator('#latamAccessPassword').fill('isolated-password-long');
  await page.locator('#latamEmailSubmit').click();assert.equal(registers,0);
  await page.locator('#latamRegistrationTermsAccepted').check();await page.locator('#latamEmailSubmit').click();await page.waitForFunction(()=>document.getElementById('latamPasswordNotice').textContent.includes('recibirás'));
  assert.equal(registers,1);await page.locator('#latamAccess').screenshot({path:path.join(out,device+'-account-legal.png')});
  await page.locator('#latamAccess button[aria-label="Cerrar acceso"]').click();
  assert.equal(await page.locator('.latam-plan-card').count(),5);
  for(const card of await page.locator('.latam-plan-card').all())assert.equal(await card.locator('.plan-legal a').count(),4);
  await page.locator('#planes').screenshot({path:path.join(out,device+'-latam-plans.png')});
  authenticated=true;
  const png=fs.readFileSync(path.join(fixtures,'fixture.png'));
  for(const plan of ['RESIDENTIAL','BUSINESS_FREE','BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO','PLACE']){
   await page.goto('https://direcciones.lat/panel?selectedPlan='+plan);await page.waitForSelector('#requestForm:not(.hidden)');
   assert.equal(await page.locator('#requestTermsAccepted').isChecked(),false);const before=posts.length;
   await page.locator('#name').fill('Fixture '+plan);await page.locator('#reference').fill('Ubicación sintética');await page.locator('#coordinates').fill('8.1, -80.9');
   if(plan.startsWith('BUSINESS'))await page.locator('#logo').setInputFiles({name:'fixture.png',mimeType:'image/png',buffer:png});
   if(plan==='PLACE')await page.locator('#cover').setInputFiles({name:'fixture.png',mimeType:'image/png',buffer:png});
   await page.locator('#send').click();assert.equal(posts.length,before,'unchecked form must not send');
   await page.locator('#requestTermsAccepted').check();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'form overflow '+device+' '+plan);
   if(plan==='RESIDENTIAL')await page.locator('#requestForm').screenshot({path:path.join(out,device+'-form-legal.png')});
   await page.locator('#send').click();await page.waitForFunction(()=>document.getElementById('message').textContent.includes('En revisión')||document.getElementById('message').textContent.includes('pendiente de pago'));
   assert.equal(posts.length,before+1);assert.equal(posts.at(-1).legalAcceptance.accepted,true);assert.equal(posts.at(-1).legalAcceptance.version,version);
   results.push({device,plan,withoutAcceptance:'blocked',withAcceptance:'sent',analyticsRequired:false});
  }
  assert.deepEqual(errors,[],'browser JS errors '+device);await context.close();
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2)+'\n');await browser.close();console.log('Legal browser checks passed: 3 viewports, 4 policies, 5 forms and optional cookies.');
})().catch(error=>{console.error(error);process.exitCode=1;});
