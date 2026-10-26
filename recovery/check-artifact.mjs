import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';const require=createRequire(import.meta.url);const {chromium}=require('playwright');
const site=path.resolve(process.argv[2]);const records=path.resolve(process.argv[3]);const info=JSON.parse(fs.readFileSync(path.join(site,'build-info.json')));const binary=require('../..'+'/recovery-tools/node_modules/@sparticuz/chromium/build/index.js').default;
const syntheticImage='<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#176dff"/></svg>';
for(const width of [390,768,1440]){
 const browser=await chromium.launch({headless:true,executablePath:path.resolve('../recovery-tools/chrome/chromium'),args:binary.args});
 try{
  const page=await browser.newPage({viewport:{width,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async r=>{
   const u=new URL(r.request().url());
   if(u.hostname==='script.google.com'&&u.pathname.endsWith('/exec')){
    const code=u.searchParams.get('code');assert(info.public_codes.includes(code),'Unexpected non-public lookup');
    if(u.searchParams.has('action'))return r.fulfill({json:{ok:true}});
    return r.fulfill({path:path.join(records,code+'.json'),contentType:'application/json',headers:{'access-control-allow-origin':'*'}});
   }
   if(u.hostname==='direcciones507.com'){
    const f=path.join(site,u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname);if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({path:f});
   }
   if(r.request().resourceType()==='image')return r.fulfill({body:syntheticImage,contentType:'image/svg+xml'});
   return r.abort();
  });
  let count=0;
  for(const code of info.public_codes){
   const d=JSON.parse(fs.readFileSync(path.join(records,code+'.json')));
   for(const slug of [code,code.toLowerCase()]){
    await page.goto('https://direcciones507.com/'+slug+'/');
    await page.locator('#nombre').filter({hasText:d.nombre}).waitFor({state:'visible'});
    assert.equal(await page.locator('#codigo').textContent(),code);
    assert.equal(await page.locator('#ref').textContent(),d.referencia||'Referencia no indicada');
    for(const id of ['btnGoogle','btnWaze','btnUber','btnWhats']){const href=await page.locator('#'+id).getAttribute('href');assert(href&&href!=='#',code+': '+id);}
    const qr=new URL(await page.locator('#qrImg').getAttribute('src'));assert.equal(qr.searchParams.get('data'),'https://direcciones507.com/'+slug+'/');
    count++;
   }
  }
  await page.goto('https://direcciones507.com/');assert(await page.locator('.header-account-actions').isVisible());
  const phone=page.locator('.hero-phone-preview img');assert(await phone.isVisible(),'Original phone restored');
  await page.locator('.seo-directory-wrapper a').filter({hasText:'AD507-THE1920'}).click();await page.locator('#nombre').filter({hasText:'THE 1920'}).waitFor({state:'visible'});
  assert.deepEqual(errors,[]);
  console.log('PASS',width,count,'complete routes, Maps/Waze/Uber/WhatsApp/QR, phone, account buttons and directory');
  await page.screenshot({path:path.resolve('../historical-check-'+width+'.png')});
 }finally{await browser.close();}
}
