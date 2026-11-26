// Focused acceptance for the new CORE controls. Synthetic identities and intercepted writes only.
import {createRequire} from 'node:module';
import {mkdtemp,mkdir,readFile,writeFile,cp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),ts=require('typescript'),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const work=await mkdtemp(join(tmpdir(),'radar-core-browser-'));
await writeFile(join(work,'package.json'),'{"type":"module"}');
for(const file of ['core-admin','category-catalog','commercial-management','pin-retirement','commercial-editor','owner-panel-create','account-panel','commercial-catalog','campaign-repository','repository','abuse','moderation','moderation-repository','business','registration','auth','domain','request-body']){
 const source=await readFile(new URL('../radar/'+file+'.ts',import.meta.url),'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/from (["'])(\.[^"']+)\1/g,(all,q,spec)=>'from '+q+spec+(/\.[a-z]+$/.test(spec)?'':'.js')+q);
 await writeFile(join(work,file+'.js'),compiled);
}
await mkdir(join(work,'ui'));await cp(new URL('../radar/ui/registration-form.js',import.meta.url),join(work,'ui/registration-form.js'));
const {withCoreRadarAdmin}=await import(pathToFileURL(join(work,'core-admin.js'))),{radarAccountScript,radarAccountSection}=await import(pathToFileURL(join(work,'account-panel.js')));
const env={RADAR_ENABLED:'true',RADAR_OWNERSHIP_ENABLED:'true',RADAR_BUSINESS_DETAILS_ENABLED:'true',RADAR_CORE_ADMIN_ENABLED:'true'};
const id='00000000-0000-4000-8000-000000000001',account='00000000-0000-4000-8000-000000000002';
const style='<style>*{box-sizing:border-box}body{font:16px system-ui;margin:16px}.hidden{display:none}label{display:block;margin:8px 0}input,textarea,select{display:block;max-width:100%;width:100%}button{margin:6px;min-height:42px}article{overflow-wrap:anywhere}main{max-width:900px;margin:auto}</style>';
const admin=withCoreRadarAdmin('<html><head>'+style+'</head><body><main><button id="statsTile">Estadísticas</button></main></body></html>',env);
const items={available:true,managementAvailable:true,items:[{id,name:'Comercio sintético',country:'PA',category:'restaurant',authorized:true,canManage:true}]};
const client='<html><head>'+style+'</head><body><main>'+radarAccountSection+'</main><script>'+radarAccountScript+';renderRadarAccount('+JSON.stringify(items)+');</script></body></html>';
const server=createServer((req,res)=>{res.setHeader('content-type','text/html; charset=utf-8');res.end(req.url==='/admin'?admin:client);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
let browser;const errors=[],calls=[];
try{
 browser=await chromium.launch({headless:true,...(process.env.RADAR_BROWSER_EXECUTABLE?{executablePath:process.env.RADAR_BROWSER_EXECUTABLE}:{}),args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/v1/admin/radar',async route=>{
  const body=route.request().postDataJSON();calls.push(body);
  await route.fulfill({json:body.action==='overview'?{requests:[{id,accountRef:account,name:'Comercio sintético',country:'PA',accountName:'Solicitante'}],owners:[],pending:[{id,name:'Pendiente anterior',country:'PA'}],establishments:[],hasMore:body.offset===0}:{ok:true}});
 });
 await page.goto(origin+'/admin');await page.getByRole('button',{name:/Radar/}).click();
 const approve=page.getByRole('button',{name:'Aprobar titularidad',exact:true});assert.equal(await approve.isEnabled(),false);
 await page.getByRole('checkbox').check();await approve.click();assert.equal(calls.filter(c=>c.action==='verify_owner').length,0);
 await page.getByRole('button',{name:'Confirmar: Comercio sintético',exact:true}).click();await page.getByRole('button',{name:'Aprobar titularidad',exact:true}).waitFor();
 assert.equal(calls.find(c=>c.action==='verify_owner').evidenceReviewed,true);
 await page.getByRole('button',{name:'Siguiente',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#radarAdminRows button:last-child')?.disabled===true);
 assert.ok(calls.some(c=>c.action==='overview'&&c.offset===100));
 await page.locator('#radarAdminSearch').fill('Comercio');await Promise.all([page.waitForResponse(r=>r.url().endsWith('/v1/admin/radar')),page.getByRole('button',{name:'Buscar',exact:true}).click()]);await page.getByRole('checkbox').waitFor();
 assert.ok(calls.some(c=>c.q==='Comercio'&&c.offset===0));
 await page.route('**/v1/user/radar/business',async route=>{
  const body=route.request().postDataJSON();calls.push(body);
  await route.fulfill({status:body.action==='register'?201:200,json:body.action==='catalog'?{dynamic:false}:body.action==='register'?{id:'00000000-0000-4000-8000-000000000055',status:'published'}:body.action==='inspect'?{item:{name:'Comercio sintético',category:'restaurant',configuredUnit:'tables',verified:true,profile:{province:'Panamá',locality:'Santiago',description:'Original',phone:'',socials:[],extras:{},hours:{}}}}:{ok:true}});
 });
 for(const width of [390,820]){
  await page.setViewportSize({width,height:900});
  await page.goto(origin+'/panel');await page.getByRole('button',{name:'Editar mi negocio',exact:true}).click();
  await page.getByLabel('Descripción pública',{exact:true}).fill('Descripción actualizada',{timeout:5000});
  await page.getByLabel('WhatsApp comercial público (opcional)',{exact:true}).fill('+50760000000');
  await page.getByLabel('Mesas totales',{exact:true}).fill('12');
  await page.getByLabel('Mesas disponibles ahora',{exact:true}).fill('7');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
  await page.getByText('Cambios guardados en tu ficha comercial.',{exact:true}).waitFor();
  await page.getByText('Capacidad total: 12 mesas',{exact:true}).waitFor();
  await page.getByText('Disponibilidad ahora: 7 mesas',{exact:true}).waitFor();
  await page.getByText('WhatsApp: +50760000000',{exact:true}).waitFor();
  const update=calls.filter(c=>c.action==='update').at(-1);
  assert.equal(update.profile.description,'Descripción actualizada');
  assert.deepEqual(update.availability,{quantity:7,unit:'tables'});
  await page.getByRole('button',{name:'Cerrar edición',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Editar mi negocio',exact:true}).isEnabled(),true);
 }
 await page.setViewportSize({width:390,height:900});
 await page.goto(origin+'/panel');
 await page.getByRole('button',{name:'Agregar mi local',exact:true}).click();
 await page.locator('#radarOwnerCreateForm').waitFor({state:'visible'});
 await page.locator('#radarOwnerCreateForm [name=name]').fill('Local de prueba en Mi panel');
 await page.locator('#radarOwnerCreateForm [name=category]').selectOption('restaurant');
 await page.locator('#radarOwnerCreateForm [name=latitude]').fill('8.9824');
 await page.locator('#radarOwnerCreateForm [name=longitude]').fill('-79.5199');
 await page.locator('#radarOwnerCreateForm [name=businessProvince]').fill('Panamá');
 await page.locator('#radarOwnerCreateForm [name=businessLocality]').fill('Santiago');
 await page.locator('#radarOwnerCreateForm [name=businessDescription]').fill('Restaurante en prueba aislada');
 await page.locator('#radarOwnerCreateForm [name=businessCapacity]').fill('10');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.getByRole('button',{name:'Guardar mi local',exact:true}).click();
 await page.getByText('Local publicado correctamente.',{exact:false}).waitFor();
 const registered=calls.find(c=>c.action==='register');
 assert.equal(registered.draft.registrationKind,'owner');
 assert.equal(registered.draft.profile.capacity.total,10);
 assert.equal(registered.draft.profile.capacity.unit,'tables');
 assert(!('accountRef' in registered.draft)&&!('verified' in registered.draft),'Owner cannot grant privileges');
 assert.equal(new URL(page.url()).pathname,'/panel');
 await page.getByRole('link',{name:'Continuar en Radar',exact:true}).waitFor();
 assert.deepEqual(errors,[]);console.log('CORE commercial browser: owner creates locally in panel, edits existing business and returns to Radar by link. Synthetic writes only.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
