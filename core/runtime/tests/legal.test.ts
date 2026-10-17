import {test,expect} from 'bun:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {handleLegalRoutes,legalDocumentHtml,requireLegalAcceptance,LEGAL_VERSION,LEGAL_ACCEPTANCE_TEXT,LEGAL_CONTENT_HASH} from '../legal';
import {handleAccountLegal} from '../legal-account';
import documents from '../legal-content.json';
import {userPanelHtml,commercialEntryHtml} from '../user-panel';

test('four complete legal routes return 200 on both hosts, support HEAD and immutable version URLs',async()=>{
 for(const host of ['direcciones507.com','direcciones.lat'])for(const doc of documents){
  for(const path of ['/legal/'+doc.key,'/legal/'+LEGAL_VERSION+'/'+doc.key+'/']){
   const response=handleLegalRoutes(new Request('https://'+host+path))!;expect(response.status).toBe(200);const html=await response.text();
   expect(html).toContain(doc.title);expect(html).toContain(LEGAL_VERSION);
   expect(html).not.toMatch(/\{\{|REVISIÓN INTERNA|NO PUBLICAR|debe verificarse antes|LEGAL_DOCUMENTS_NOT_READY/);
  }
  const head=handleLegalRoutes(new Request('https://'+host+'/legal/'+doc.key,{method:'HEAD'}))!;expect(head.status).toBe(200);expect(await head.text()).toBe('');
 }
 expect(handleLegalRoutes(new Request('https://direcciones.lat/panel'))).toBeNull();expect(legalDocumentHtml('unknown')).toBeNull();
 expect(handleLegalRoutes(new Request('https://direcciones.lat/legal/terms',{method:'POST'}))?.status).toBe(405);
});
test('required acceptance rejects false/string/stale choices, normalizes server evidence and is independent of analytics',()=>{
 for(const legalAcceptance of [undefined,{}, {accepted:false,version:LEGAL_VERSION},{accepted:'true',version:LEGAL_VERSION},{accepted:true,version:'2026-10-17-review.1'}])expect(()=>requireLegalAcceptance({legalAcceptance})).toThrow('INVALID_LEGAL_ACCEPTANCE');
 const evidence=requireLegalAcceptance({legalAcceptance:{accepted:true,version:LEGAL_VERSION,acceptedAt:'forged',userId:'forged',text:'forged',analytics:false}});
 expect(evidence.text).toBe(LEGAL_ACCEPTANCE_TEXT);expect(evidence.contentHash).toBe(LEGAL_CONTENT_HASH);expect(evidence.acceptedAt).not.toBe('forged');expect(Number.isFinite(Date.parse(evidence.acceptedAt))).toBe(true);expect(evidence).not.toHaveProperty('userId');
});
test('shared forms preserve required unselected checkbox and five plan cards each contain four links',()=>{
 for(const html of [userPanelHtml,commercialEntryHtml(true,new URL('https://direcciones.lat/'))]){
  const checkbox=html.match(/<input id="requestTermsAccepted"[^>]*>/)?.[0]||'';expect(checkbox).toContain('required');expect(checkbox).not.toContain('checked');
  for(const doc of documents)expect(html).toContain('href="/legal/'+doc.key+'"');
  expect(html).toContain('cookies opcionales no son condición');expect(html).toContain('48 horas desde su envío');
  for(const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))expect(()=>new Function(script[1])).not.toThrow();
 }
 const html=commercialEntryHtml(true,new URL('https://direcciones.lat/'));
 const cards=[...html.matchAll(/<article class="latam-plan-card"[\s\S]*?<\/article>/g)].map(x=>x[0]);expect(cards).toHaveLength(5);
 for(const card of cards)for(const doc of documents)expect(card).toContain('/legal/'+doc.key);
 expect(html).toContain('latamRegistrationTermsAccepted');
});
test('final source, runtime hashes and generated static pages agree without placeholders',()=>{
 const names=['01-terminos','02-privacidad','03-comercial','04-cookies'];
 documents.forEach((doc,i)=>{expect(doc.text).toBe(readFileSync(new URL('../../../docs/legal/vigentes/'+names[i]+'.md',import.meta.url),'utf8'));expect(doc.sha256).toBe(createHash('sha256').update(doc.text).digest('hex'));expect(readFileSync(new URL('../../../legal/'+doc.key+'/index.html',import.meta.url),'utf8')).toBe(legalDocumentHtml(doc.key));});
});
test('registration boundary prevents missing acceptance before authentication; login/OAuth remain owned by existing auth',async()=>{
 let authCalls=0;const auth={handle:async()=>{authCalls++;return Response.json({ok:true})},currentUser:async()=>null} as any;
 const request=(value:any)=>new Request('https://direcciones.lat/v1/auth/email/register',{method:'POST',headers:{origin:'https://direcciones.lat','content-type':'application/json'},body:JSON.stringify(value)});
 expect((await handleAccountLegal(request({email:'x@test.local'}),{} as any,auth))?.status).toBe(400);expect(authCalls).toBe(0);
 expect((await handleAccountLegal(request({legalAcceptance:{accepted:true,version:LEGAL_VERSION}}),{} as any,auth))?.status).toBe(200);expect(authCalls).toBe(1);
 for(const path of ['/auth/google/login','/auth/google/callback','/v1/auth/email/login'])expect(await handleAccountLegal(new Request('https://direcciones.lat'+path),{} as any,auth)).toBeNull();
});
