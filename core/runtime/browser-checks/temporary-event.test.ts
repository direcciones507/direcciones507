import {continuousGallery} from '../continuous-gallery';
import {test,expect} from 'bun:test';
import {chromium} from '@playwright/test';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import sharp from 'sharp';
import {handleTemporaryEventRoutes} from '../temporary-event-routes';
import {createTemporaryEventMedia} from '../temporary-event-media';
import {renderTemporaryEventPage} from '../temporary-event-page';
function adapter(executor:any):any{const sql:any={};sql.unsafe=(q:string,args:any[]=[])=>executor.query(q,args).then((r:any)=>r.rows);sql.begin=(fn:any)=>executor.transaction((tx:any)=>fn(adapter(tx)));return sql}
test('Android and desktop: save, recover, upload, private preview, tap-to-advance gallery and reduced motion',async()=>{
 const db=new PGlite(),sql=adapter(db),owner='11111111-1111-4111-8111-111111111111';
 await db.exec('CREATE SCHEMA ad507;CREATE TABLE ad507.users(id uuid PRIMARY KEY);');
 await db.exec(readFileSync(new URL('../schema-proposals/temporary-events.sql',import.meta.url),'utf8'));
 await sql.unsafe('INSERT INTO ad507.users VALUES($1)',[owner]);
 const image=await sharp({create:{width:600,height:400,channels:3,background:'#1760ce'}}).jpeg().toBuffer(),objects=new Map<string,Uint8Array>();
 const media=createTemporaryEventMedia({configurationVerified:true,accountId:'a'.repeat(32),bucket:'direcciones507-media',accessKeyId:'fixture',secretAccessKey:'fixture'},(async(url:any,options:any)=>{const key=new URL(url).pathname;if(options.method==='PUT'){objects.set(key,options.body);return new Response(null)}return new Response(Buffer.from(objects.get(key)!),{headers:{'content-type':'image/webp'}})}) as typeof fetch);
 const server=Bun.serve({hostname:'127.0.0.1',port:0,fetch:async(req)=>await handleTemporaryEventRoutes(req,{enabled:true,sql,media,payment:null,auth:{currentUser:async()=>({id:owner,roles:['CLIENT']})}})??new Response('Not found',{status:404})});
 const browser=await chromium.launch({executablePath:process.env.AD507_CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:393,height:851},isMobile:true,hasTouch:true});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(server.url+'panel/evento/nuevo');
  const fields={title:'Fiesta de Santiago',description:'Música y comunidad',startsOn:new Date().toISOString().slice(0,10),endsOn:new Date().toISOString().slice(0,10),hours:'18:00 a 22:00',province:'Veraguas',district:'Santiago',corregimiento:'Santiago',reference:'Parque central',responsibleName:'PRIVATE_NAME',responsibleEmail:'private@example.test',responsiblePhone:'60000000',latitude:'8.1',longitude:'-80.9'};
  for(const [name,value] of Object.entries(fields))await page.locator('[name="'+name+'"]').fill(value);
  for(let i=1;i<=3;i++)await page.locator('[name="photo'+i+'"]').setInputFiles({name:'image.jpg',mimeType:'image/jpeg',buffer:image});
  await page.getByRole('button',{name:'Guardar borrador'}).click();
  await page.waitForFunction(()=>document.getElementById('temporary-event-error')?.textContent?.startsWith('Borrador guardado. Continúa'));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(objects.size).toBe(1);
  expect(await page.locator('#event-after-save').isVisible()).toBe(true);expect(await page.locator('btn-yappy').count()).toBe(0);
  const preview=await page.locator('#event-preview-link').getAttribute('href');await page.clock.install();await page.goto(server.url+preview!.slice(1));
  expect(await page.getByText('Vista previa privada · Aún sin publicar').count()).toBe(1);expect(await page.locator('.photos img').count()).toBe(3);
  await page.waitForFunction(()=>[...document.images].filter(i=>i.hasAttribute('src')).every(i=>i.complete&&i.naturalWidth>0));expect(await page.content()).not.toContain('PRIVATE_NAME');
  expect(await page.locator('.photo-progress span[aria-current="true"]').count()).toBe(1);
  expect(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor)).toBe('rgb(28, 49, 68)');
  expect(await page.evaluate(()=>document.querySelector('main')!.getBoundingClientRect().width)).toBeLessThanOrEqual(520);
  await page.getByRole('button',{name:'Ver código QR',exact:true}).click();
  expect(await page.locator('.qr-modal').isVisible()).toBe(true);
  await page.getByRole('button',{name:'Cerrar código QR'}).click();
  expect(await page.locator('.qr-modal').isVisible()).toBe(false);
  expect(await page.locator('.photo-counter').textContent()).toBe('1 / 3');
  for(const expected of ['2 / 3','3 / 3','1 / 3','2 / 3']){await page.clock.runFor(5000);expect(await page.locator('.photo-counter').textContent()).toBe(expected);}
  await page.locator('.photo-next').tap();expect(await page.locator('#continuousGallery').isVisible()).toBe(true);
  expect(await page.locator('.cg-count').textContent()).toBe('2 / 3');
  expect(await page.locator('.cg-prev,.cg-next,.cg-controls').count()).toBe(0);
  await page.keyboard.press('ArrowRight');expect(await page.locator('.cg-count').textContent()).toBe('3 / 3');
  await page.clock.runFor(10000);expect(await page.locator('.photo-counter').textContent()).toBe('2 / 3');
  await page.getByRole('button',{name:'Cerrar visor de fotografías'}).tap();expect(await page.locator('#continuousGallery').isVisible()).toBe(false);
  await page.clock.runFor(5000);expect(await page.locator('.photo-counter').textContent()).toBe('3 / 3');
  await page.clock.runFor(5000);expect(await page.locator('.photo-counter').textContent()).toBe('1 / 3');
  const draftUrl=server.url+'panel/evento/nuevo?draft='+(await sql.unsafe('SELECT id FROM ad507.temporary_events'))[0].id;
  await page.goto(draftUrl);await page.waitForFunction(()=>document.querySelector<HTMLInputElement>('[name=title]')?.value==='Fiesta de Santiago');
  await page.waitForFunction(()=>document.getElementById('event-quote')?.textContent?.includes('USD 12.99'));
  await page.locator('[name=startsOn]').fill('2030-12-15');await page.locator('[name=endsOn]').fill('2031-02-12');
  await page.getByRole('button',{name:'Guardar borrador'}).click();
  await page.waitForFunction(()=>document.getElementById('event-quote')?.textContent==='60 días · USD 19.99');
  expect((await sql.unsafe('SELECT price_cents FROM ad507.temporary_events'))[0].price_cents).toBe(1999);
  await page.locator('[name=endsOn]').fill('2031-02-13');await page.getByRole('button',{name:'Guardar borrador'}).click();
  expect(await page.locator('#temporary-event-error').textContent()).toBe('Selecciona una duración de 1 a 60 días.');
  expect((await sql.unsafe('SELECT ends_on::text FROM ad507.temporary_events'))[0].ends_on).toBe('2031-02-12');
  for(const width of [360,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)}
  const reduced=await browser.newPage({viewport:{width:393,height:851},reducedMotion:'reduce'});await reduced.clock.install();await reduced.goto(server.url+preview!.slice(1));await reduced.clock.fastForward(20000);expect(await reduced.locator('.photo-counter').textContent()).toBe('1 / 3');
  // Published layout and expired state use the same renderer; test both widths.
  for(const width of [393,1440]){
   await page.setViewportSize({width,height:900});await page.route('https://example.test/**',r=>r.fulfill({body:image,contentType:'image/jpeg'}));
   const event={draft:{...fields,countryCode:'PA',timezone:'America/Panama',latitude:8.1,longitude:-80.9},slug:'fiesta-0123456789abcdef',status:'ACTIVE' as const,paymentConfirmedAt:new Date().toISOString(),photos:['https://example.test/1.jpg','https://example.test/2.jpg','https://example.test/3.jpg']};
   await page.setContent(renderTemporaryEventPage(event));expect(await page.getByRole('link',{name:'Google Maps'}).count()).toBe(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.setContent(renderTemporaryEventPage({...event,status:'EXPIRED'}));expect(await page.getByText('Este evento ha finalizado.').count()).toBe(1);expect(await page.locator('.actions a').count()).toBe(0);
  }
  expect(errors).toEqual([]);await context.close();await reduced.close();
 }finally{await browser.close();server.stop(true);await db.close()}
},45000);

// Isolated DOM fixtures verify viewer behavior without production writes or plan changes.
test('continuous viewer opens the selected photo, navigates without closing and isolates cards',async()=>{
 const browser=await chromium.launch({executablePath:process.env.AD507_CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
 try{
  for(const width of [393,768,1440]){
   const page=await browser.newPage({viewport:{width,height:900},hasTouch:width<1000,isMobile:width<500});
   const photo=(n:number)=>'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text y="40">'+n+'</text></svg>');
   const html=(numbers:number[])=>continuousGallery('<html><head></head><body style="min-height:2000px"><div id="galeriaFotos">'+numbers.map(n=>'<img width="100" height="100" src="'+photo(n)+'" alt="Foto '+n+'">').join('')+'</div></body></html>');
   await page.setContent(html([1,2,2,3]));
   await page.locator('#galeriaFotos img').nth(1).click();
   expect(await page.locator('.cg-count').textContent()).toBe('2 / 3');
   expect(await page.locator('.cg-image').getAttribute('src')).toBe(photo(2));
   expect(await page.locator('.cg-prev,.cg-next,.cg-controls').count()).toBe(0);
   expect(await page.getByRole('button',{name:'Cerrar visor de fotografías'}).textContent()).toBe('');
   const closeBox=await page.locator('.cg-close').boundingBox();expect(closeBox!.width).toBeCloseTo(48,1);expect(closeBox!.height).toBeCloseTo(44,1);
   expect(await page.locator('.cg-close').evaluate(el=>getComputedStyle(el).borderRadius)).toBe('999px');
   await page.keyboard.press('ArrowRight');
   expect(await page.locator('.cg-count').textContent()).toBe('3 / 3');expect(await page.locator('#continuousGallery').isVisible()).toBe(true);
   await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowLeft');expect(await page.locator('.cg-count').textContent()).toBe('1 / 3');
   await page.locator('.cg-stage').dispatchEvent('touchstart',{touches:[{identifier:0,clientX:300,clientY:200}]});
   await page.locator('.cg-stage').dispatchEvent('touchend',{changedTouches:[{identifier:0,clientX:100,clientY:205}]});expect(await page.locator('.cg-count').textContent()).toBe('2 / 3');
   await page.locator('.cg-stage').dispatchEvent('touchstart',{touches:[{identifier:0,clientX:100,clientY:200}]});
   await page.locator('.cg-stage').dispatchEvent('touchend',{changedTouches:[{identifier:0,clientX:300,clientY:205}]});expect(await page.locator('.cg-count').textContent()).toBe('1 / 3');
   expect(await page.evaluate(()=>document.documentElement.style.overflow)).toBe('hidden');await page.keyboard.press('Escape');expect(await page.locator('#continuousGallery').isVisible()).toBe(false);expect(await page.evaluate(()=>document.documentElement.style.overflow)).toBe('');
   await page.setContent(html([4]));await page.locator('#galeriaFotos img').click();expect(await page.locator('.cg-count').textContent()).toBe('1 / 1');expect(await page.locator('.cg-prev,.cg-next,.cg-controls').count()).toBe(0);expect(await page.locator('.cg-image').getAttribute('src')).toBe(photo(4));
   await page.getByRole('button',{name:'Cerrar visor de fotografías'}).click();await page.close();
  }
 }finally{await browser.close();}
},45000);
