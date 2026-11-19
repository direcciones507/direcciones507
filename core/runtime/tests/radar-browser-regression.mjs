// Runs only against the isolated read-only visual preview, never production or a live account.
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'@playwright/test');
const server=spawn(process.execPath,['core/runtime/radar/scripts/preview.mjs'],{env:{...process.env,PORT:'4183'},stdio:'inherit'});
const origin='http://127.0.0.1:4183';let browser;
const assert=(condition,message)=>{if(!condition)throw Error(message);};
try{
 for(let i=0;i<50;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,args:['--disable-webgl']});
 await mkdir('/tmp/radar-review',{recursive:true});const report=[];
 for(const [name,width,height,motion] of [['desktop',1440,1000,'no-preference'],['tablet',820,1180,'no-preference'],['mobile',390,844,'reduce'],['small-mobile',320,740,'reduce']]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:motion}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin);await page.waitForFunction(()=>document.querySelector('#resultCount').textContent==='6');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow '+name);
  await page.screenshot({path:`/tmp/radar-review/${name}-hero.png`});
  await page.getByRole('link',{name:'Explorar Radar',exact:true}).click();await page.locator('.leaflet-container').waitFor();
  await page.locator('#results .result-card').filter({hasText:'Café del Istmo'}).click();await page.locator('#detail').waitFor();
  await page.screenshot({path:`/tmp/radar-review/${name}-map.png`});
  await page.getByRole('button',{name:'Cerrar ficha',exact:true}).click();
  await page.locator('#searchInput').fill('Café');await page.locator('#searchForm').getByRole('button',{name:'Buscar',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#resultCount').textContent==='1');
  await page.locator('#searchInput').fill('');await page.locator('#searchForm').getByRole('button',{name:'Buscar',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#resultCount').textContent==='6');
  await page.getByRole('button',{name:'Filtros',exact:true}).click();await page.locator('#category').selectOption('cafe');await page.waitForFunction(()=>document.querySelector('#resultCount').textContent==='1');await page.locator('#category').selectOption('');
  await page.locator('#activity').selectOption('queue');await page.waitForFunction(()=>document.querySelector('#resultCount').textContent==='1');await page.locator('#activity').selectOption('');
  await page.locator('#country').selectOption('CR');await page.waitForFunction(()=>document.querySelector('#resultCount').textContent==='0');
  await page.locator('#country').selectOption('PA');await page.waitForFunction(()=>document.querySelector('#resultCount').textContent==='6');
  await page.getByRole('button',{name:'Agregar establecimiento',exact:true}).click();await page.locator('#accountDialog').waitFor();
  await page.frameLocator('#accountFrame').getByText('Vista previa visual',{exact:true}).waitFor();
  assert(await page.frameLocator('#accountFrame').locator('body').innerText().then(t=>t.includes('no solicita credenciales')),'Preview must not collect credentials');
  await page.locator('#accountDialog [data-close]').click();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Overflow after interactions '+name);
  if(motion==='reduce'){assert(await page.locator('.sweep').evaluate(e=>getComputedStyle(e).animationName==='none'),'Reduced motion ignored');assert(await page.locator('#threeScene canvas').count()===0,'Reduced-motion device loaded 3D scene');}
  assert(errors.length===0,'Browser errors: '+errors.join('; '));report.push({name,viewport:{width,height},reducedMotion:motion,renderer:'Leaflet 2D fallback',checks:'hero, overflow, map, card, search, category, activity, country, auth boundary',pageErrors:errors});await context.close();
 }
 await writeFile('/tmp/radar-review/validation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser?.close();server.kill();}
