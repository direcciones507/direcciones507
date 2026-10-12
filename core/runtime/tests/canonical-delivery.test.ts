import {test,expect} from 'bun:test';
import {renderNewPublicAddress} from '../new-address-publication';
import {proposedCountryUrl} from '../country-configuration';
import {readFileSync} from 'node:fs';

test('existing QR/share/copy mechanisms use canonical country URL rather than preview URL',()=>{
 for(const [country,code] of [['PA','AD507-N12345678123412341234123456789ABC'],['CO','AD57-N12345678123412341234123456789ABC'],['CR','AD506-N12345678123412341234123456789ABC']]){
  const url=proposedCountryUrl(country,code);
  const html=renderNewPublicAddress({name:'Synthetic',url,code,socials:[],media:[],coordinates:{latitude:8,longitude:-80},extras:{countryCode:country,historical:false,postalCode:null}} as any);
  expect(html).not.toContain('window.location.href');expect(html).toContain('url: '+JSON.stringify(url));expect(html).toContain('navigator.clipboard.writeText('+JSON.stringify(url)+')');
  const line=html.match(/const qrUrl = [^\n]+/)![0];const qr=new Function(line+';return qrUrl;')();
  expect(new URL(qr).searchParams.get('data')).toBe(url);
  for(const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))expect(()=>new Function(script[1])).not.toThrow();
 }
 // The source template's historical QR behavior remains byte-for-byte in Git.
 const source=readFileSync(new URL('../../../ad507.template.html',import.meta.url),'utf8');expect(source).toContain('encodeURIComponent(window.location.href)');
});

test('prepared individual historical renderer preserves original URL for QR and delivery',()=>{
 const url='https://direcciones507.com/ad507-0038/';
 const html=renderNewPublicAddress({name:'Synthetic imported',url,code:'AD507-0038',socials:[],media:[],coordinates:{latitude:8,longitude:-80},extras:{historical:true,countryCode:'PA'}} as any);
 const qr=new Function(html.match(/const qrUrl = [^\n]+/)![0]+';return qrUrl;')();
 expect(new URL(qr).searchParams.get('data')).toBe(url);expect(html).toContain('DIRECCIONES<span>507</span>');
});

test('delivery reuses canonical URL policy and only preserves a validated original Panama URL',()=>{
 expect(proposedCountryUrl('PA','AD507-0038','https://direcciones507.com/ad507-0038/')).toBe('https://direcciones507.com/ad507-0038/');
 for(const bad of ['javascript:alert(1)','https://evil.test/ad507-0038/','https://direcciones507.com/ad507-0038/?token=private','https://user:pass@direcciones507.com/ad507-0038/','https://direcciones507.com/ad507-9999/'])expect(()=>proposedCountryUrl('PA','AD507-0038',bad)).toThrow();
 expect(()=>proposedCountryUrl('CO','AD57-0038','https://direcciones507.com/ad507-0038/')).toThrow();
});
