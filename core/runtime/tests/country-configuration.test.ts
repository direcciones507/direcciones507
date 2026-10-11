import {expect,test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {COUNTRIES,countryConfiguration,proposedInternationalCode,preparedCountryAmount,prepareCountryTemplate} from '../country-configuration';
const id='12345678-1234-1234-1234-123456789abc';
const template=readFileSync(new URL('../../../ad507.template.html',import.meta.url),'utf8');
test('immutable countries, rollout and disabled card payments; unknown countries fail closed',()=>{
 expect(Object.keys(COUNTRIES)).toHaveLength(10);expect(countryConfiguration()).toBe(COUNTRIES.PA);
 expect(COUNTRIES.CO.rollout).toBe('NEXT');expect(COUNTRIES.CR.rollout).toBe('NEXT');
 for(const [code,c] of Object.entries(COUNTRIES)){
  expect(Object.isFrozen(c)).toBe(true);expect(Object.isFrozen(c.locationLabels)).toBe(true);
  expect(c.internationalCardPaymentsEnabled).toBe(false);
  if(code!=='PA')expect(c.pricing).toBe('UNCONFIGURED');
 }
 for(const c of ['__proto__','ZZ','pa',null,{},''])expect(()=>countryConfiguration(c)).toThrow('INVALID_COUNTRY');
});
test('distinct proposed namespaces; Panama matches PR51 UUID code format',()=>{
 const codes=Object.keys(COUNTRIES).map(c=>proposedInternationalCode(c,id));expect(new Set(codes).size).toBe(10);
 expect(codes[0]).toBe('AD507-N12345678123412341234123456789ABC');
 expect(proposedInternationalCode('CO',id)).toStartWith('AD57-N');expect(proposedInternationalCode('MX',id)).toStartWith('AD52-N');
 expect(proposedInternationalCode('PA','22345678-1234-1234-1234-123456789abc')).not.toBe(codes[0]);
 for(const x of ['',id.toUpperCase(),'../'+id,id.replaceAll('-','')])expect(()=>proposedInternationalCode('PA',x)).toThrow('INVALID_REQUEST');
});
test('single actual template shows blue LATAM top and bottom for every country',()=>{
 for(const [code,c] of Object.entries(COUNTRIES)){
  const html=prepareCountryTemplate(template,code);
  expect(html.match(/style="color:#0b57d0">Direcciones LATAM/g)).toHaveLength(2);
  expect(html.replace('<div class="brand-title-text" style="color:#0b57d0">Direcciones LATAM</div>','<div class="brand-title-text">DIRECCIONES<span>507</span></div>').replace('<div class="footer-title-main" style="color:#0b57d0">Direcciones LATAM</div>','<div class="footer-title-main">DIRECCIONES<span>507</span></div>')).toBe(template);
  for(const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))expect(()=>new Function(script[1])).not.toThrow();
 }
 expect(()=>prepareCountryTemplate('', 'CO')).toThrow('COUNTRY_TEMPLATE_MARKER_MISMATCH');
 expect(()=>prepareCountryTemplate(template+template,'CO')).toThrow('COUNTRY_TEMPLATE_MARKER_MISMATCH');
});
test('Panama delegates prices unchanged; all foreign pricing blocks without calling authority',()=>{
 let calls=0;const authority=(plan:string)=>{calls++;if(plan!=='EXISTING')throw Error('INVALID_PAYMENT_PLAN');return 1999;};
 expect(preparedCountryAmount('PA','EXISTING',authority)).toBe(1999);
 expect(()=>preparedCountryAmount('PA','INVALID',authority)).toThrow('INVALID_PAYMENT_PLAN');
 for(const c of Object.keys(COUNTRIES).filter(c=>c!=='PA'))expect(()=>preparedCountryAmount(c,'EXISTING',authority)).toThrow('COUNTRY_PRICING_NOT_CONFIGURED');
 expect(calls).toBe(2);
});
import {requestCountry,assertCountryCommerce,proposedCountryUrl,paymentMethods,informativeLocalAmount} from '../country-configuration';
import {validateRequestDraft} from '../request-validation';
import {userPanelHtml,adminCreationHtml,commercialEntryHtml} from '../user-panel';
import {prepareContacts} from '../panel-preparation';
const draft={type:'BUSINESS',plan:'BUSINESS_FREE',name:'Test',reference:'Park',latitude:8,longitude:-80,media:{logos:1,placePhotos:0,galleryPhotos:0}};
test('server country/territory validation and international phones preserve Panama',()=>{
 expect(validateRequestDraft({...draft,phone:'61234567'}).countryCode).toBe('PA');
 expect(validateRequestDraft({...draft,phone:'61234567'}).phone).toBe('+50761234567');
 for(const [countryCode,phone,expected]of [['CO','3001234567','+573001234567'],['CR','88888888','+50688888888'],['MX','5512345678','+525512345678']]){
  const data=validateRequestDraft({...draft,countryCode,phone,region:'Región',municipality:'Municipio',locality:'Sector',city:'Ciudad'});
  expect(data.phone).toBe(expected);expect(data.countryCode).toBe(countryCode);expect(data.territory.city).toBe('Ciudad');
 }
 expect(prepareContacts('+573001234567',null,'506').phone).toBe('+573001234567');
 expect(()=>validateRequestDraft({...draft,countryCode:'CO',region:42})).toThrow('INVALID_REGION');
 for(const c of ['PE','EC','XX',null])expect(()=>requestCountry(c)).toThrow('INVALID_COUNTRY');
 for(const c of Object.keys(COUNTRIES).filter(c=>!['PA','PE','EC'].includes(c)))expect(()=>assertCountryCommerce(c)).toThrow('COUNTRY_NOT_ENABLED');
});
test('domains enforce country/prefix, methods and informative rates do not enable charges',()=>{
 for(const c of Object.keys(COUNTRIES))expect(new URL(proposedCountryUrl(c,proposedInternationalCode(c,id))).origin).toBe(c==='PA'?'https://direcciones507.com':'https://direcciones.lat');
 expect(()=>proposedCountryUrl('CO','AD507-123')).toThrow('CANONICAL_CODE_INVALID');
 expect(paymentMethods('PA')).toEqual(['PAYPAL','YAPPY']);expect(paymentMethods('CO')).toEqual(['PAYPAL']);
 expect(informativeLocalAmount(1999,4000)).toBe(79960);expect(()=>informativeLocalAmount(1999,NaN)).toThrow('INVALID_EXCHANGE_RATE');
});
test('ADMIN, citizen and both commercial entries reuse one form with valid scripts',()=>{
 for(const html of [userPanelHtml,adminCreationHtml(),commercialEntryHtml(),commercialEntryHtml(true)]){
  expect(html.match(/id="countryCode"/g)).toHaveLength(1);
  for(const id of ['region','municipality','locality','city','sector'])expect(html).toContain('id="'+id+'"');
  for(const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))expect(()=>new Function(script[1])).not.toThrow();
  expect(html).toContain("countryCode:$('countryCode').value");
 }
 expect(adminCreationHtml()).toContain("fetch('/v1/admin/requests'");expect(userPanelHtml).toContain("fetch('/v1/user/requests'");
});
