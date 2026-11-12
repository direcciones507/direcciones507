import {test,expect} from 'bun:test';
import {publicCardPresentation,publicCardMotionStyle,publicCardMotionScript} from '../public-card-presentation';
import {renderNewPublicAddress} from '../new-address-publication';
function fixture(type='BUSINESS',code='BUSINESS_PREMIUM_PRO',historical=false){return {code:'AD507-N12345678',name:'Negocio de prueba',reference:'Frente al parque',description:'Descripción propia',commercialDescription:null,type,plan:{code,name:code==='BUSINESS_PREMIUM_PRO'?'Premium Pro':code==='BUSINESS_PREMIUM'?'Premium':'Negocio Gratis'},url:'https://direcciones.lat/AD507-N12345678/',coordinates:{latitude:8,longitude:-80},phone:'+50760000000',landlinePhone:null,hours:'8 a 4',socials:[],media:[],publication:null,extras:{countryCode:'PA',historical,postalCode:null}} as any;}
test('presentation preserves every original element and script after removing its own additions',()=>{
 const original='<html><head><title>Original</title></head><body><a id="maps" href="https://example.com/map" hidden>Mapa</a><script>const code="UNCHANGED";</script></body></html>';
 const result=publicCardPresentation(original);
 expect(result.replace('<body class="public-card-motion">','<body>').replace('<style id="new-public-card-motion">'+publicCardMotionStyle+'</style>','').replace('<script id="new-public-card-motion-script">'+publicCardMotionScript+'</script>','')).toBe(original);
 expect(()=>new Function(publicCardMotionScript)).not.toThrow();
 expect(publicCardMotionScript).not.toMatch(/fetch\(|XMLHttpRequest|localStorage|\.href\s*=|\.hidden\s*=|innerHTML|cloneNode/);
 expect(publicCardMotionStyle).not.toMatch(/\bdisplay\s*:/);
});
for(const [type,plan] of [['BUSINESS','BUSINESS_PREMIUM_PRO'],['BUSINESS','BUSINESS_PREMIUM'],['BUSINESS','BUSINESS_FREE'],['PLACE','PLACE']])test(plan+' receives only the visual layer and preserves descriptive gating',()=>{
 const html=renderNewPublicAddress(fixture(type,plan));
 expect(html).toContain('<body class="public-card-motion">');expect(html).toContain('id="new-public-card-motion"');
 expect(html).toContain('"descripcionComercial":'+(plan==='BUSINESS_PREMIUM_PRO'||type==='PLACE'?'"Descripción propia"':'null'));
 for(const id of ['btnGoogle','btnWaze','btnUber','btnWhats','btnQR','qrImg'])expect(html.match(new RegExp('id="'+id+'"','g'))?.length).toBe(1);
 for(const s of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))expect(()=>new Function(s[1])).not.toThrow();
});
test('historical and Residential render paths receive no new styling or motion',()=>{
 for(const record of [fixture('BUSINESS','BUSINESS_PREMIUM_PRO',true),fixture('PLACE','PLACE',true),fixture('RESIDENTIAL','RESIDENTIAL')]){
  const html=renderNewPublicAddress(record);expect(html).not.toContain('new-public-card-motion');expect(html).not.toContain('<body class="public-card-motion">');
 }
});
