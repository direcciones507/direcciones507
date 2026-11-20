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
  assert(await page.locator('.hero-actions a').count()===0,'Redundant hero CTA '+name);
  assert(await page.locator('#filters').isHidden(),'Filters initially open '+name);
  assert(await page.locator('#personalTools').getAttribute('open')===null,'Tools initially open '+name);
  assert(await page.evaluate(()=>{const title=document.querySelector('#heroTitle').getBoundingClientRect(),art=document.querySelector('.radar-art').getBoundingClientRect();return art.left>=title.right-1&&art.top<title.bottom&&art.bottom>title.top;}),'Radar not beside title '+name);
  if(width<=600)assert(await page.evaluate(()=>{const add=document.querySelector('#addButton').getBoundingClientRect(),search=document.querySelector('#searchForm').getBoundingClientRect();return Math.abs(add.left-search.left)<1&&Math.abs(add.width-search.width)<1;}),'Add/search alignment '+name);
  await page.screenshot({animations:'disabled',path:`/tmp/radar-review/${name}-hero.png`});
  await page.locator('#map').scrollIntoViewIfNeeded();await page.locator('.leaflet-container').waitFor();
  await page.locator('#results .result-card').filter({hasText:'Café del Istmo'}).click();await page.locator('#detail').waitFor();assert((await page.locator('#detail h3').innerText())==='Café del Istmo','Wrong detail');
  assert(await page.locator('#detail .detail-options').getAttribute('open')===null,'Actions initially expanded '+name);
  assert(await page.getByRole('button',{name:'Reportar actividad',exact:true}).isHidden(),'Actions leak from collapsed card '+name);
  assert(await page.evaluate(()=>{const card=document.querySelector('#detail').getBoundingClientRect(),map=document.querySelector('.map-area').getBoundingClientRect();return card.width<=300&&card.height<map.height*.7&&card.left>=map.left&&card.right<=map.right;}),'Card covers map '+name);
  await page.screenshot({animations:'disabled',path:`/tmp/radar-review/${name}-map.png`});
  await page.locator('#detail .detail-options>summary').click();
  assert(await page.getByRole('button',{name:'Reportar actividad',exact:true}).isVisible(),'Actions cannot open '+name);
  await page.locator('#detail .detail-options>summary').click();
  assert(await page.getByRole('button',{name:'Reportar actividad',exact:true}).isHidden(),'Actions cannot close '+name);
  await page.getByRole('button',{name:'Cerrar ficha',exact:true}).click();
  await page.locator('#searchInput').fill('Café');await page.locator('#searchForm').getByRole('button',{name:'Buscar',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#resultCount').textContent==='1');
  await page.locator('#searchInput').fill('');await page.locator('#searchForm').getByRole('button',{name:'Buscar',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#resultCount').textContent==='3');
  await page.getByRole('button',{name:'Filtros',exact:true}).click();await page.locator('#category').selectOption('cafe');await page.waitForFunction(()=>document.querySelector('#resultCount').textContent==='1');await page.locator('#category').selectOption('');
  await page.locator('#activity').selectOption('queue');await page.waitForFunction(()=>document.querySelector('#resultCount').textContent==='0');await page.locator('#activity').selectOption('');
  await page.locator('#country').selectOption('CR');await page.waitForFunction(()=>document.querySelector('#resultCount').textContent==='0');
  await page.locator('#country').selectOption('PA');await page.waitForFunction(()=>document.querySelector('#resultCount').textContent==='3');
  // Real pointer selection, including overlapping markers at wide territorial scales.
  await page.locator('#filtersButton').click();
  const normalVisible=()=>page.evaluate(()=>document.querySelectorAll('.raster-pin.pin-normal').length+[...document.querySelectorAll('.raster-cluster')].reduce((n,e)=>n+Number(e.dataset.normalCount||0),0));
  await page.locator('.raster-pin,.raster-cluster').first().waitFor();
  assert(await normalVisible()===0,'Normal visible before zoom '+name);
  assert(await page.locator('.raster-pin.pin-live,.raster-cluster.pin-live').count()===1,'Live missing '+name);
  const group=page.locator('.raster-cluster.pin-live').first();
  if(await group.count()){
   await group.click();await page.locator('.radar-cluster-list').waitFor();
   await page.locator('.radar-cluster-choice').filter({hasText:'Restaurante La Terraza'}).click();
   await page.locator('#detail').waitFor();assert(await page.locator('#detail h3').innerText()==='Restaurante La Terraza','Wrong grouped live detail');
   await page.getByRole('button',{name:'Cerrar ficha',exact:true}).click();
  }else{
   await page.locator('.raster-pin.pin-live').click();await page.locator('#detail').waitFor();assert(await page.locator('#detail h3').innerText()==='Restaurante La Terraza','Wrong live detail');await page.getByRole('button',{name:'Cerrar ficha',exact:true}).click();
  }
  await page.locator('#filtersButton').click();await page.locator('#territory').selectOption('0');await page.locator('#filtersButton').click();
  await page.waitForFunction(()=>!window.__radarTestCamera().moving&&!window.__radarTestCamera().pendingFit&&!window.__radarTestState().resetZoom);
  await page.locator('.leaflet-control-zoom-in').click();
  await page.waitForFunction(()=>document.querySelector('.raster-pin.pin-normal,.raster-cluster:not([data-normal-count="0"])'));
  assert(await normalVisible()>0,'Normal pins not revealed '+name);
  const normal=page.locator('.raster-pin.pin-normal').first();
  if(await normal.count()){
   const expected=await normal.getAttribute('aria-label');await normal.click();await page.locator('#detail').waitFor();assert(await page.locator('#detail h3').innerText()===expected,'Wrong normal detail');
  }else{
   await page.locator('.raster-cluster:not([data-normal-count="0"])').first().click();
   const choice=page.locator('.radar-cluster-choice').filter({hasNotText:/En vivo|Destacado/}).first();
   const expected=await choice.innerText();await choice.click();await page.locator('#detail').waitFor();assert(await page.locator('#detail h3').innerText()===expected,'Wrong grouped normal detail');
  }
  await page.getByRole('button',{name:'Cerrar ficha',exact:true}).click();
  await page.locator('.leaflet-control-zoom-out').click();await page.waitForFunction(()=>!document.querySelector('.raster-pin.pin-normal,.raster-cluster:not([data-normal-count="0"])'));
  assert(await normalVisible()===0,'Normal pins remained after zoom out '+name);
  await page.locator('.leaflet-control-zoom-in').click();await page.waitForFunction(()=>document.querySelector('.raster-pin.pin-normal,.raster-cluster:not([data-normal-count="0"])'));
  const before=await page.locator('#searchInput').inputValue();
  await page.locator('#howButton').click();await page.locator('#howDialog').waitFor();
  await page.screenshot({animations:'disabled',path:`/tmp/radar-review/${name}-help.png`});
  await page.mouse.click(2,2);await page.locator('#howDialog').waitFor({state:'hidden'});
  assert(await page.locator('#searchInput').inputValue()===before,'Help reset search '+name);
  assert(await normalVisible()>0,'Help reset zoom '+name);
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
  await page.goBack();await page.waitForFunction(()=>typeof window.__radarTestState==='function');
  assert(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('radarAction')||'null')?.type==='add'),'Pending Radar action lost during shared login navigation');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Overflow after interactions '+name);
  if(motion==='reduce'){assert(await page.locator('.sweep').evaluate(e=>getComputedStyle(e).animationName==='none'),'Reduced motion ignored');assert(await page.locator('#threeScene canvas').count()===0,'Reduced-motion device loaded 3D scene');}
  assert(errors.length===0,'Browser errors: '+errors.join('; '));report.push({name,viewport:{width,height},reducedMotion:motion,renderer:'Leaflet 2D fallback',checks:'responsive layout, map, all visible pins, progressive zoom, live-only pulse, priority panel, featured rows, help outside close, country, auth boundary',pageErrors:errors});await page.unrouteAll({behavior:'wait'});await context.close();
 }
 await writeFile('/tmp/radar-review/validation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){if(currentPage){console.error('RADAR_PAGE_ERRORS',currentErrors);console.error('RADAR_UI_FAILURE',await currentPage.evaluate(()=>({country:document.querySelector('#country')?.value,status:document.querySelector('#dataStatus')?.textContent,count:document.querySelector('#resultCount')?.textContent,category:document.querySelector('#category')?.value,activity:document.querySelector('#activity')?.value,results:document.querySelector('#results')?.innerText,camera:window.__radarTestCamera?.(),policy:window.__radarTestState?.()})));await currentPage.screenshot({path:'/tmp/radar-review/failure.png',fullPage:true});}throw error;}finally{await browser?.close();server.kill();}

