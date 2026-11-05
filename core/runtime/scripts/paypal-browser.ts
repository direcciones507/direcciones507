import {paypalPaymentPage} from '../payment-ui';
import {handlePayPalRoutes} from '../payment-routes';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.AD507_PLAYWRIGHT_MODULE??'playwright');
const out=new URL('../../../docs/evidence/paypal-sandbox-20261105/',import.meta.url);await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.AD507_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']}),results=[];
try{for(const width of [390,820,1440]){
 const id='11111111-1111-4111-8111-111111111111';let paid=false,captured=0,origin='';
 const c:any={enabled:true,auth:{currentUser:async()=>({id,roles:['CLIENT']})},provider:{},repository:{quotePayPal:async()=>({amountCents:1999,orderId:null}),preparePayPal:async()=>({required:true,order:{id}}),initializePayPal:async()=>({orderId:id,providerOrderId:'SYNTHETICORDER'}),readPayPal:async()=>({id,amount_cents:1999,status:paid?'PAID':'PENDING',provider_reference:'SYNTHETICORDER'}),confirmPayPal:async(_user:any,_id:any,_provider:any,capture:boolean)=>{if(capture&&!paid){captured++;paid=true;}if(!paid)throw Error('PAYMENT_CONFIRMATION_REQUIRED');}}};
 const server=Bun.serve({hostname:'127.0.0.1',port:0,fetch:async req=>{const p=new URL(req.url).pathname;if(p.startsWith('/panel/'))return new Response(paypalPaymentPage(id,p.startsWith('/panel/paypal/')?'order':'address'),{headers:{'content-type':'text/html'}});return await handlePayPalRoutes(req,{...c,origin})??new Response('not found',{status:404});}});origin=server.url.origin;
 const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));
 try{
  await page.route('https://www.sandbox.paypal.com/**',(r:any)=>r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><p>Proveedor simulado de pruebas.</p><a href="'+origin+'/panel/paypal/'+id+'">Volver al comercio</a>'}));
  await page.goto(origin+'/panel/payments/'+id);await page.getByRole('button',{name:'Continuar con PayPal Sandbox'}).click();await page.getByRole('link',{name:'Volver al comercio'}).click();await page.getByText('Pago aún no confirmado.',{exact:false}).waitFor();assert.equal(paid,false);
  await page.getByRole('button',{name:'Confirmar pago de prueba'}).click();await page.getByText('Pago Sandbox confirmado.',{exact:false}).waitFor();assert.equal(captured,1);await page.getByRole('button',{name:'Consultar estado'}).click();assert.equal(captured,1);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:new URL('confirmed-'+width+'.jpg',out).pathname,fullPage:true,type:'jpeg',quality:75});
  paid=false;await page.goto(origin+'/panel/paypal/'+id+'?cancelled=1');await page.getByText('Regresaste sin completar el pago.',{exact:false}).waitFor();assert.equal(paid,false);assert.deepEqual(errors,[]);
  results.push({width,hostedApprovalSimulated:true,capture:true,duplicateCapturePrevented:true,cancelDoesNotPay:true,overflow:false,jsErrors:errors,realPayPal:false,realDatabase:false,physicalDevice:false});
 }finally{await context.close();await server.stop(true);}
}await writeFile(new URL('browser-results.json',out),JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await browser.close();}
