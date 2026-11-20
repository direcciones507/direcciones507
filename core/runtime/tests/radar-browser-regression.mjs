// Runs only against the isolated read-only visual preview, never production or a live account.
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'@playwright/test');
const server=spawn(process.execPath,['core/runtime/radar/scripts/preview.mjs'],{env:{...process.env,PORT:'4183',RADAR_TEST_FIXTURES:'1'},stdio:'inherit'});
const origin='http://127.0.0.1:4183';let browser,currentPage,currentErrors;
const assert=(condition,message)=>{if(!condition)throw Error(message);};
try{
 for(let i=0;i<50;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,...(process.env.RADAR_BROWSER_EXECUTABLE?{executablePath:process.env.RADAR_BROWSER_EXECUTABLE}:{}),args:['--disable-webgl']});
 await mkdir('/tmp/radar-review',{recursive:true});const report=[];
 for(const [name,width,height,motion] of [['desktop',1440,1000,'no-preference'],['tablet',820,1180,'no-preference'],['mobile',390,844,'reduce'],['small-mobile',320,740,'reduce']]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:motion}),page=await context.newPage(),errors=[];currentPage=page;currentErrors=errors;page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/radar/ui/raster-map.js',async route=>{const response=await route.fetch();const source=await response.text();await route.fulfill({response,body:source.replace("return {engine:'raster'", "window.__radarTestCamera=()=>({moving,pendingFit,fitSequence,zoom:map.getZoom(),animatingZoom:map._animatingZoom,bounds:{west:map.getBounds().getWest(),east:map.getBounds().getEast(),south:map.getBounds().getSouth(),north:map.getBounds().getNorth()}});return {engine:'raster'")});});
  await page.route('**/radar/ui/radar.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+'\nwindow.__radarTestState=()=>({revealZoom:state.revealZoom,resetZoom:state.resetZoom});'});});
  await page.goto(origin);await page.waitForFunction(()=>document.querySelector('#resultCount').textContent==='3');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow '+name);
  await page.screenshot({animations:'disabled',path:`/tmp/radar-review/${name}-hero.png`});
  await page.getByRole('link',{name:'Explorar Radar',exact:true}).click();await page.locator('.leaflet-container').waitFor();
  await page.locator('#results .result-card').filter({hasText:'Café del Istmo'}).click();await page.locator('#detail').waitFor();assert((await page.locator('#detail h3').innerText())==='Café del Istmo','Wrong detail');
  await page.screenshot({animations:'disabled',path:`/tmp/radar-review/${name}-map.png`});
  await page.getByRole('button',{name:'Cerrar ficha',exact:true}).click();
  await page.locator('#searchInput').fill('Café');await page.locator('#searchForm').getByRole('button',{name:'Buscar',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#resultCount').textContent==='1');
  await page.locator('#searchInput').fill('');await page.locator('#searchForm').getByRole('button',{name:'Buscar',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#resultCount').textContent==='3');
  await page.getByRole('button',{name:'Filtros',exact:true}).click();await page.locator('#category').selectOption('cafe');await page.waitForFunction(()=>document.querySelector('#resultCount').textContent==='1');await page.locator('#category').selectOption('');
  await page.locator('#activity').selectOption('queue');await page.waitForFunction(()=>document.querySelector('#resultCount').textContent==='0');await page.locator('#activity').selectOption('');
  await page.locator('#country').selectOption('CR');await page.waitForFunction(()=>document.querySelector('#resultCount').textContent==='0');
  await page.locator('#country').selectOption('PA');await page.waitForFunction(()=>document.querySelector('#resultCount').textContent==='3');
  // Every visible priority pin is clickable; normal pins reveal with a small map zoom.
  await page.locator('#filtersButton').click();
  await page.locator('.raster-pin').first().waitFor();
  assert(await page.locator('.raster-pin.pin-normal').count()===0,'Normal visible before zoom '+name);
  assert(await page.locator('.raster-pin.pin-live').count()===1,'Live missing '+name);
  const pulse=await page.locator('.raster-pin.pin-live').evaluate(e=>getComputedStyle(e,'::after').animationName);
  assert(motion==='reduce'?pulse==='none':pulse==='livePulse','Incorrect live pulse '+name);
  for(const pin of await page.locator('.raster-pin').all()){await pin.click({force:true});await page.locator('#detail').waitFor();await page.getByRole('button',{name:'Cerrar ficha',exact:true}).click();}
  await page.locator('.leaflet-control-zoom-in').click();await page.waitForTimeout(500);
  await page.locator('.raster-cluster,.raster-pin.pin-normal').first().waitFor();
  // At wide territorial scale, existing clustering represents the revealed normals.
  await page.locator('#filtersButton').click();await page.locator('#territory').selectOption('0');await page.locator('#filtersButton').click();await page.waitForTimeout(800);
  await page.locator('.leaflet-control-zoom-in').click();await page.waitForTimeout(500);
  let normalZoomSteps=1;if(await page.locator('.raster-pin.pin-normal').count()===0){await page.locator('.raster-cluster').first().click();normalZoomSteps+=2;await page.waitForTimeout(500);}
  await page.locator('.raster-pin.pin-normal').first().waitFor();
  for(const pin of await page.locator('.raster-pin.pin-normal').all()){await pin.click({force:true});await page.locator('#detail').waitFor();await page.getByRole('button',{name:'Cerrar ficha',exact:true}).click();}
  for(let i=0;i<normalZoomSteps;i++){await page.locator('.leaflet-control-zoom-out').click();await page.waitForTimeout(350);}assert(await page.locator('.raster-cluster,.raster-pin.pin-normal').count()===0,'Normal pins remained after zoom out '+name);
  for(let i=0;i<normalZoomSteps;i++){await page.locator('.leaflet-control-zoom-in').click();await page.waitForTimeout(350);}
  const before=await page.locator('#searchInput').inputValue();
  await page.locator('#howButton').click();await page.locator('#howDialog').waitFor();
  await page.screenshot({animations:'disabled',path:`/tmp/radar-review/${name}-help.png`});
  await page.mouse.click(2,2);await page.locator('#howDialog').waitFor({state:'hidden'});
  assert(await page.locator('#searchInput').inputValue()===before,'Help reset search '+name);
  assert(await page.locator('.raster-pin.pin-normal').count()>0,'Help reset zoom '+name);
  assert(await page.locator('main>.how,main>.closing').count()===0,'Promotional containers remain');
  const featuredNames=(await page.locator('#results .result-card:has(.commercial-badge.featured) h4').allTextContents()).sort();
  const categoryNames=await page.locator('#results .result-card:has(.commercial-badge.featured) .category-label').allTextContents();
  assert(await page.locator('#featuredGroups .featured-category').count()===new Set(categoryNames).size,'Featured categories do not match this viewport');
  assert(JSON.stringify((await page.locator('#featuredGroups .featured-card h4').allTextContents()).sort())===JSON.stringify(featuredNames),'Featured-only rows do not match this viewport');
  await page.locator('#searchInput').fill('Café en Ciudad de Panamá');await page.locator('#searchForm').getByRole('button',{name:'Buscar',exact:true}).click();await page.locator('#results .result-card').filter({hasText:'Café del Istmo'}).waitFor();
  await page.locator('#searchInput').fill('Servicios en Ciudad de Panamá');await page.locator('#searchForm').getByRole('button',{name:'Buscar',exact:true}).click();await page.locator('#results .result-card').filter({hasText:'Servicios Bahía'}).waitFor();
  await page.route('https://direcciones.lat/auth/radar',route=>route.fulfill({contentType:'text/html',body:'<p>Acceso existente de LATAM: navegación interceptada en prueba.</p>'}));
  await page.getByRole('button',{name:'Agregar establecimiento',exact:true}).click();
  await page.waitForURL('https://direcciones.lat/auth/radar');
  assert(new URL(page.url()).search==='', 'No authentication tokens or arbitrary return URLs');
  await page.goBack();await page.locator('#searchInput').waitFor();
  assert(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('radarAction')||'null')?.type==='add'),'Pending Radar action lost during shared login navigation');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Overflow after interactions '+name);
  if(motion==='reduce'){assert(await page.locator('.sweep').evaluate(e=>getComputedStyle(e).animationName==='none'),'Reduced motion ignored');assert(await page.locator('#threeScene canvas').count()===0,'Reduced-motion device loaded 3D scene');}
  assert(errors.length===0,'Browser errors: '+errors.join('; '));report.push({name,viewport:{width,height},reducedMotion:motion,renderer:'Leaflet 2D fallback',checks:'responsive layout, map, all visible pins, progressive zoom, live-only pulse, priority panel, featured rows, help outside close, country, auth boundary',pageErrors:errors});await context.close();
 }
 await writeFile('/tmp/radar-review/validation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){if(currentPage){console.error('RADAR_PAGE_ERRORS',currentErrors);console.error('RADAR_UI_FAILURE',await currentPage.evaluate(()=>({country:document.querySelector('#country')?.value,status:document.querySelector('#dataStatus')?.textContent,count:document.querySelector('#resultCount')?.textContent,category:document.querySelector('#category')?.value,activity:document.querySelector('#activity')?.value,results:document.querySelector('#results')?.innerText,camera:window.__radarTestCamera?.(),policy:window.__radarTestState?.()})));await currentPage.screenshot({path:'/tmp/radar-review/failure.png',fullPage:true});}throw error;}finally{await browser?.close();server.kill();}

