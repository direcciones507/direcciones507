import {test,expect} from 'bun:test';
import {readFileSync} from 'node:fs';
import {handleLegalRoutes,legalReviewHtml,requireLegalAcceptance,LEGAL_REVIEW_VERSION,LEGAL_ACCEPTANCE_TEXT} from '../legal';
import documents from '../legal-content.json';
import {userPanelHtml,commercialEntryHtml} from '../user-panel';

test('review documents render all four separately; incomplete texts never publish on either domain',()=>{
 for(const host of ['direcciones507.com','direcciones.lat'])for(const doc of documents){
  const req=new Request(`https://${host}/legal/${doc.key}`);
  expect(handleLegalRoutes(req)?.status).toBe(503);
  expect(handleLegalRoutes(req)?.headers.get('x-robots-tag')).toContain('noindex');
  const html=legalReviewHtml(doc.key)!;
  expect(html).toContain(doc.title);expect(html).toContain('Revisión interna — no vigente');
  expect(html).not.toContain('<script');
 }
 expect(handleLegalRoutes(new Request('https://direcciones.lat/panel'))).toBeNull();
 expect(legalReviewHtml('unknown')).toBeNull();
});
test('server rejects missing, false, string and stale consent, and refuses review versions in live requests',()=>{
 for(const legalAcceptance of [undefined,{}, {accepted:false,version:LEGAL_REVIEW_VERSION},{accepted:'true',version:LEGAL_REVIEW_VERSION},{accepted:true,version:'old'}])expect(()=>requireLegalAcceptance({legalAcceptance},true)).toThrow('INVALID_LEGAL_ACCEPTANCE');
 const raw={legalAcceptance:{accepted:true,version:LEGAL_REVIEW_VERSION,acceptedAt:'forged',userId:'forged',text:'forged'}};
 expect(()=>requireLegalAcceptance(raw)).toThrow('LEGAL_DOCUMENTS_NOT_READY');
 const evidence=requireLegalAcceptance(raw,true);expect(evidence.text).toBe(LEGAL_ACCEPTANCE_TEXT);
 expect(evidence.acceptedAt).not.toBe('forged');expect(Number.isFinite(Date.parse(evidence.acceptedAt))).toBe(true);expect(evidence).not.toHaveProperty('userId');
});
test('existing shared checkbox remains unselected, required, readable and linked to four independent documents',()=>{
 for(const html of [userPanelHtml,commercialEntryHtml(true,new URL('https://direcciones.lat/'))]){
  const checkbox=html.match(/<input id="requestTermsAccepted"[^>]*>/)?.[0]||'';
  expect(checkbox).toContain('required');expect(checkbox).not.toContain('checked');
  for(const doc of documents)expect(html).toContain('href="/legal/'+doc.key+'"');
  expect(html).toContain('cookies opcionales no son condición');expect(html).toContain('48 horas desde su envío');
  for(const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))expect(()=>new Function(script[1])).not.toThrow();
 }
});
test('review renderer uses the complete reconciled sources, without modifying original transcriptions',()=>{
 const names=['01-terminos-y-condiciones.md','02-politica-de-privacidad.md','03-politica-comercial.md','04-politica-de-cookies.md'];
 documents.forEach((doc,i)=>{expect(doc.text+'\n').toBe(readFileSync(new URL('../../../docs/legal/reconciliados/'+names[i],import.meta.url),'utf8'));});
});
