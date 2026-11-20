// Test real WebGL canvas input with isolated fixtures. No production requests or account writes.
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin='http://127.0.0.1:4185';
const server=spawn(process.execPath,['core/runtime/radar/scripts/preview.mjs'],{env:{...process.env,PORT:'4185',RADAR_TEST_FIXTURES:'1'},stdio:'inherit'});
const assert=(condition,message)=>{if(!condition)throw Error(message);};
let browser;
try{
 for(let i=0;i<50;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,...(process.env.RADAR_BROWSER_EXECUTABLE?{executablePath:process.env.RADAR_BROWSER_EXECUTABLE}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const touch of [false,true]){
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1440,height:1000},hasTouch:touch,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://tile.openstreetmap.org/**',route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jJwAAAABJRU5ErkJggg==','base64')}));
  // Instrument only for camera positioning and locating actual rendered pixels.
  await page.route('**/radar/ui/radar.js',async route=>{
   const response=await route.fetch();
   await route.fulfill({response,body:(await response.text())+'\nwindow.__radarWebGLTest={map:()=>state.map,rows:()=>state.features};'});
  });
  await page.goto(origin);await page.locator('#map').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>window.__radarWebGLTest?.map()?.getLayer?.('pins'),{},{timeout:45000});
  assert(await page.evaluate(()=>!!window.__radarWebGLTest.map().getCanvas().getContext('webgl2')||!!window.__radarWebGLTest.map().getCanvas().getContext('webgl')),'WebGL unavailable: cannot substitute raster');
  for(const [name,coords,layer] of [['Restaurante La Terraza',[-79.525,8.978],'priority-pins'],['Mercado de San Felipe',[-79.535,8.963],'pins']]){
   await page.evaluate(coords=>window.__radarWebGLTest.map().jumpTo({center:coords,zoom:16,pitch:0}),coords);
   await page.waitForFunction(({name,layer})=>{
    const map=window.__radarWebGLTest.map(),f=window.__radarWebGLTest.rows().find(f=>f.properties.name===name);
    if(!f)return false;const point=map.project(f.geometry.coordinates);
    return map.queryRenderedFeatures([point.x,point.y-16],{layers:[layer]}).some(hit=>hit.properties.radarId===f.id);
   },{name,layer});
   await page.locator('#map').scrollIntoViewIfNeeded();
   await page.evaluate(()=>{window.__radarPointerEvents=[];for(const type of ['pointerdown','pointerup','pointercancel','click'])document.addEventListener(type,e=>window.__radarPointerEvents.push({type,target:e.target.className,x:e.clientX,y:e.clientY}),{capture:true});});
   const pos=await page.evaluate(coords=>{const p=window.__radarWebGLTest.map().project(coords),r=window.__radarWebGLTest.map().getCanvas().getBoundingClientRect();return {x:r.left+p.x,y:r.top+p.y-16};},coords);
   const target=await page.evaluate(({x,y})=>({hit:document.elementFromPoint(x,y)?.className,inside:x>=0&&y>=0&&x<innerWidth&&y<innerHeight,canvas:document.elementFromPoint(x,y)===window.__radarWebGLTest.map().getCanvas()}),pos);
   console.log('WEBGL_POINTER_TARGET',JSON.stringify({touch,name,pos,target}));
   assert(target.inside&&target.canvas,'Rendered pin is blocked or outside viewport: '+JSON.stringify(target));
   if(touch)await page.touchscreen.tap(pos.x,pos.y);else await page.mouse.click(pos.x,pos.y);
   try{await page.locator('#detail').waitFor({timeout:12000});}catch(error){
    console.error('WEBGL_SELECTION_FAILURE',JSON.stringify(await page.evaluate(({x,y})=>{const map=window.__radarWebGLTest.map(),r=map.getCanvas().getBoundingClientRect(),p=[x-r.left,y-r.top];return {events:window.__radarPointerEvents,hit:document.elementFromPoint(x,y)?.className,rows:map.queryRenderedFeatures([[p[0]-12,p[1]-12],[p[0]+12,p[1]+12]],{layers:['pins','priority-pins','clusters','cluster-depth']}).map(f=>({layer:f.layer.id,id:f.properties.radarId,cluster:f.properties.cluster_id})),group:document.querySelector('#pinGroupDialog').open,toast:document.querySelector('#toast').textContent};},pos)),errors);
    throw error;
   }
   assert(await page.locator('#detail h3').innerText()===name,'Wrong WebGL pin selection '+name);
   await page.getByRole('button',{name:'Cerrar ficha',exact:true}).click();
  }
  assert(!errors.length,'WebGL page errors '+errors.join('; '));
  await context.close();
 }
 console.log('Radar WebGL: real mouse and touchscreen opened paid and free UUID pins.');
}finally{await browser?.close();server.kill();}
