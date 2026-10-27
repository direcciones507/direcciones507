/** Offline presentation fixtures only. No accounts, production calls or deployed preview. */
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const base=process.env.AD507_BASELINE_ROOT,out=process.argv[2];
if(!base?.startsWith('/')||!out?.startsWith('/')||resolve(out).startsWith(resolve(new URL('../../../',import.meta.url).pathname)))throw Error('EXPLICIT_BASELINE_AND_EXTERNAL_OUTPUT_REQUIRED');
process.env.AD507_COMMERCIAL_WORKFLOW_ENABLED='true';
const current=await import('../user-panel'),old=await import(base+'/core/runtime/user-panel.ts');
const render=await import('../new-address-publication'),oldRender=await import(base+'/core/runtime/new-address-publication.ts');
mkdirSync(out,{recursive:true});
const records=['BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO'].map((plan,i)=>({id:'123e4567-e89b-42d3-a456-42661417400'+i,code:'AD507-N1234567'+i,publicCode:i?'CAFEMALAGA':'AD507-CAFEDELPRADO',name:i?'Café Málaga':'Café del Prado',planCode:plan,planName:i?'Premium Pro':'Premium',addressType:'BUSINESS',source:'USER_REQUEST',status:'ACTIVE',publicationReceipt:'synthetic',publicUrl:'https://direcciones.lat/'+(i?'CAFEMALAGA':'AD507-CAFEDELPRADO/')}));
const stub=(addresses:any[])=>'<script>if(!crypto.randomUUID)crypto.randomUUID=()=>"123e4567-e89b-42d3-a456-426614174999";window.fetch=async(input)=>{const u=String(input);if(u.includes("/v1/user/panel"))return Response.json('+JSON.stringify({ok:true,user:{displayName:'Cuenta sintética',email:'test@example.invalid'},addresses,orders:[],plans:[{code:'BUSINESS_FREE',name:'Gratis'},{code:'BUSINESS_PREMIUM',name:'Premium'},{code:'BUSINESS_PREMIUM_PRO',name:'Premium Pro'}],actions:{prepareRequest:true,submitRequest:true}})+');if(u.includes("/analytics/"))return Response.json({ok:true,plan:u.includes("12345671")?"premium_pro":"premium",visits:{status:"available",total:1},interactions:{google:1,whatsapp:1,waze:1,uber:1,call:1},period_days:30,daily_series:[{day:"2026-10-26",event_type:"visit",total:1}]});return Response.json({ok:true,available:true});};</script>';
for(const version of ['baseline','current']){
 const panel=version==='current'?current:old,renderer=version==='current'?render:oldRender;
 const addresses=records.map(a=>version==='current'?a:{...a,publicCode:undefined,publicUrl:'https://direcciones.lat/'+a.code+'/'});
 writeFileSync(out+'/'+version+'-panel.html',panel.userPanelHtml.replace('<head>','<head>'+stub(addresses)));
 writeFileSync(out+'/'+version+'-form.html',panel.userPanelHtml.replace('<head>','<head>'+stub([])));
 for(const [i,r]of records.entries()){
 const page=renderer.renderNewPublicAddress({code:r.code,...(version==='current'?{publicCode:r.publicCode}:{}),name:r.name,type:'BUSINESS',plan:{code:r.planCode,name:r.planName},url:version==='current'?r.publicUrl:'https://direcciones.lat/'+r.code+'/',coordinates:{latitude:8,longitude:-80},phone:'50760000000',landlinePhone:'5072000000',socials:[],media:[],extras:{countryCode:'PA',historical:false}} as any);
 const route=version+'/'+(version==='current'?r.publicCode:r.code);mkdirSync(out+'/'+route,{recursive:true});writeFileSync(out+'/'+route+'/index.html',page.replace('<head>','<head>'+stub([])));
 }
}
writeFileSync(out+'/index.html','<!doctype html><meta charset="utf-8"><title>Prueba local de compatibilidad · datos sintéticos</title>'+['panel','form','premium','pro'].map(p=>'<a href="/review-'+p+'.html">'+p+'</a> ').join(' '));
for(const p of ['panel','form','premium','pro'])writeFileSync(out+'/review-'+p+'.html','<!doctype html><meta charset="utf-8"><title>Comparación local '+p+'</title>'+[390,820,1440].map(width=>'<h2>'+p+' '+width+'</h2>'+['baseline','current'].map(v=>'<iframe title="'+v+' '+width+'" data-width="'+width+'" data-version="'+v+'" src="/'+((p==='pro'||p==='premium')?v+'/'+(v==='current'?(p==='pro'?'CAFEMALAGA':'AD507-CAFEDELPRADO'):(p==='pro'?'AD507-N12345671':'AD507-N12345670'))+'/':v+'-'+p+'.html')+(p==='form'?'?selectedPlan=BUSINESS_PREMIUM_PRO':'')+'" style="width:'+width+'px;height:1100px;border:1px solid #aaa"></iframe>').join('')).join(''));
console.log(JSON.stringify({output:out,widths:[390,820,1440],pages:['panel','form','premium','pro'],externalWrites:false}));
