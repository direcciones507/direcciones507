import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(import.meta.dirname,'..');
const codes=['AD507-THE1920','AD507-LABDIESELMONTERO','AD507-TRANSPORTEJEDIDIAS'];
const fixture=code=>process.env.HISTORICAL_FIXTURES_DIR?JSON.parse(fs.readFileSync(path.join(process.env.HISTORICAL_FIXTURES_DIR,code+'.json'),'utf8')):{ok:true,codigo:code,nombre:'Public test business '+code,referencia:'Public reference',horario:'09:00-17:00',plan:code===codes[0]?'Premium Pro':'Negocio',legacy:true,publico:true,tipo_direccion:'NEGOCIO',mostrar_logo:true,mostrar_fotos:code===codes[0],mostrar_redes:true,logo:'https://fixture.test/logo.png',foto1:code===codes[0]?'https://fixture.test/photo.png':'',instagram:'https://instagram.com/example',google:'https://www.google.com/maps/search/?api=1&query=8.95,-79.53',waze:'https://waze.com/ul?ll=8.95,-79.53&navigate=yes',uber:'https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=8.95&dropoff[longitude]=-79.53',whatsapp:'https://wa.me/50760000000',telefono:'50760000000'};
const launchOptions={headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE,args:JSON.parse(process.env.CHROMIUM_ARGS_JSON||'[]')}:{})};
let browser;
try{
 for(const width of [390,768,1440]){
  browser=await chromium.launch(launchOptions);
  const page=await browser.newPage({viewport:{width,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.hostname==='script.google.com'&&u.pathname.endsWith('/exec')){
    const code=u.searchParams.get('code');
    if(u.searchParams.has('action'))return route.abort(); // never emit real counters or writes
    const data=codes.includes(code)?fixture(code):{ok:false};
    return route.fulfill({json:data,headers:{'access-control-allow-origin':'*'}});
   }
   if(u.hostname==='direcciones507.com'){
    if(u.searchParams.has('test404'))return route.fulfill({path:path.join(root,'404.html'),status:404});
    let file=path.join(root,u.pathname==='/'?'index.html':u.pathname);
    if(u.pathname.endsWith('/')&&u.pathname!=='/')file=path.join(file,'index.html');
    if(fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file});
   }
   if(route.request().resourceType()==='image')return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="blue"/></svg>'});
   return route.abort();
  });
  for(const code of codes){
   const data=fixture(code);
   for(const entry of ['query','short','directory','search']){
    await page.goto(entry==='query'?'https://direcciones507.com/?code='+code:entry==='short'?'https://direcciones507.com/'+code+'/':'https://direcciones507.com/');
    if(entry==='directory')await page.locator('.seo-directory-wrapper .seo-trigger-link').filter({hasText:code}).click();
    if(entry==='search'){await page.locator('#inputCodigo').fill(code.toLowerCase());await page.locator('.btn-search-trigger').click();}
    await page.locator('#mainClientPanelCardContainer').waitFor({state:'visible'});
    assert.equal(await page.locator('#uiCodigo').textContent(),code);
    assert.equal(await page.locator('#uiNombre').textContent(),data.nombre);
    assert.equal(await page.locator('#uiRef').textContent(),data.referencia);
    assert.equal(await page.locator('#uiHorarioHome').textContent(),data.horario);
    for(const [id,key] of [['btnGoogleHome','google'],['btnWazeHome','waze'],['btnUberHome','uber'],['btnAvisoHome','whatsapp']])assert.equal(await page.locator('#'+id).getAttribute('href'),data[key]);
    if(data.logo&&data.mostrar_logo!==false)assert(await page.locator('#uiLogoBoxHome').isVisible());
    if(data.mostrar_fotos)assert(await page.locator('#fieldGaleriaHome').isVisible());
    await page.locator('#linkVerificacion').click();await page.locator('#printCardWrap').waitFor({state:'visible'});
    assert.equal(await page.locator('#printCodigo').textContent(),code);
    assert(new URL(await page.locator('#qrVerificacion').getAttribute('src')).searchParams.get('data').includes(code));
    assert.equal(await page.locator('#msgLogBusqueda').textContent(),'');
   }
  }
  await page.goto('https://direcciones507.com/AD507-THE1920/?test404=1');
  await page.frameLocator('iframe').locator('#mainClientPanelCardContainer').waitFor({state:'visible'});
  assert(await page.locator('iframe').isVisible());
  await page.goto('https://direcciones507.com/');
  assert(await page.locator('.hero-phone-preview-image img').isVisible());
  assert(await page.locator('#inputCodigo').isVisible());
  assert.equal(await page.locator('.header-account-actions a').count(),2);
  assert.deepEqual(errors,[]);
  console.log('PASS',width,'3 original records × query/short/directory/search, logo/gallery/QR/navigation, hero and account buttons');
  if(process.env.HISTORICAL_SCREENSHOT)await page.screenshot({path:process.env.HISTORICAL_SCREENSHOT+'-'+width+'.png'});
  await browser.close();
 }
}finally{await browser?.close();}
