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
for(const file of ['core-admin','commercial-management','commercial-editor','account-panel','moderation','moderation-repository','business','registration','auth','domain']){
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
const items={available:true,managementAvailable:true,items:[{id,name:'Comercio sintético',country:'PA',category:'shop',authorized:true}]};
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
  const body=route.request().postDataJSON();calls.push(body);await route.fulfill({json:body.action==='inspect'?{item:{name:'Comercio sintético',category:'shop',profile:{province:'Panamá',locality:'Santiago',description:'Original',phone:'',socials:[],extras:{},hours:{}}}}:{ok:true}});
 });
 await page.goto(origin+'/panel');await page.getByRole('button',{name:'Editar ficha comercial',exact:true}).click();
 try{await page.getByLabel('Descripción pública',{exact:true}).fill('Descripción actualizada',{timeout:5000});}catch(error){console.error('Synthetic editor diagnostics:',JSON.stringify({calls:calls.filter(c=>c.action==='inspect'),errors,html:await page.locator('#radarAccountItems').innerHTML()}));throw error;}await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
 await page.getByText('Cambios guardados en tu ficha comercial.',{exact:true}).waitFor();assert.equal(calls.find(c=>c.action==='update').profile.description,'Descripción actualizada');
 await page.getByRole('button',{name:'Cerrar edición',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Editar ficha comercial',exact:true}).isEnabled(),true);
 assert.deepEqual(errors,[]);console.log('CORE commercial browser: named review, explicit confirmation, pagination, search and owner editor passed. Synthetic writes only.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
