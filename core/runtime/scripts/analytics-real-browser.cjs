const {chromium}=require('playwright'),fs=require('fs'),assert=require('assert/strict');
(async()=>{const base=process.env.ANALYTICS_TEST_URL;if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base||''))throw Error('LOCAL_ONLY');const browser=await chromium.launch();const results=[],out='analytics-browser-evidence';fs.mkdirSync(out,{recursive:true});let iteration=0;
for(const [device,width,height]of [['mobile',390,844],['tablet',820,1180],['desktop',1440,1000]]){
 iteration++;const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Isolated session returned by the real OAuth callback; never a production session.
 const [name,...value]=process.env.ANALYTICS_TEST_COOKIE.split('=');await context.addCookies([{name,value:value.join('='),url:base}]);
 await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
 for(const suffix of ['BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO']){
  const visit=page.waitForResponse(r=>r.url().includes('/analytics/track')&&r.request().postDataJSON()?.event==='visit'&&r.status()===202);
  await page.goto(base+'/AD507-STATS-'+suffix+'/');
  if(await page.locator('[data-analytics-choice="true"]').isVisible())await page.locator('[data-analytics-choice="true"]').click();
  await visit;
  for(const id of ['btnGoogle','btnWaze','btnUber','btnWhats','btnCall','btnQR']){const button=page.locator('#'+id);if(await button.count()){const response=page.waitForResponse(r=>r.url().includes('/analytics/track')&&r.status()===202);await button.click({noWaitAfter:true});await response;}}
 }
 await page.goto(base+'/panel');await page.waitForFunction(()=>document.querySelectorAll('.analytics-metrics').length===4);
 const cards=page.locator('.address-card');for(const suffix of ['BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO']){const section=page.locator('[data-analytics-code="AD507-STATS-'+suffix+'"]');for(const label of ['WhatsApp','Google Maps','Waze','Uber','Llamar'])assert((await section.innerText()).includes(label));assert.equal(await section.locator('.analytics-metrics p').first().locator('strong').innerText(),String(iteration+1));assert.equal(await section.locator('.analytics-actions li').filter({hasText:'WhatsApp'}).locator('strong').innerText(),String(iteration));assert.equal(await section.locator('.analytics-actions li').filter({hasText:'Google Maps'}).locator('strong').innerText(),String(iteration+1));}
 const pro=page.locator('[data-analytics-code="AD507-STATS-BUSINESS_PREMIUM_PRO"]');await pro.locator('summary').click();assert.equal(await pro.locator('.analytics-daily-chart').count(),2);
 for(const days of ['7','90','30']){await pro.locator('select').selectOption(days);await page.waitForFunction(d=>document.querySelector('[data-analytics-code="AD507-STATS-BUSINESS_PREMIUM_PRO"] .analytics-period').textContent.includes('Últimos '+d+' días'),days);assert.equal(await pro.locator('.analytics-daily-chart').count(),2);}
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 for(const suffix of ['BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO'])await page.locator('[data-analytics-code="AD507-STATS-'+suffix+'"]').screenshot({path:out+'/real-'+device+'-'+suffix+'.png'});
 results.push({device,realDatabase:true,realAuthCallback:true,paidCards:2,charts:2,periods:[7,90,30],errors,overflow:false});await context.close();
}
fs.writeFileSync(out+'/real-results.json',JSON.stringify(results,null,2));await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
