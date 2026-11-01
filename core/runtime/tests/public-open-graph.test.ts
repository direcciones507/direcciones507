import {test,expect} from 'bun:test';
import {renderNewPublicAddress} from '../new-address-publication';
const logo='https://direcciones.lat/v1/addresses/AD507-N123/media/logo';
const photo='https://direcciones.lat/v1/addresses/AD507-N123/media/photo';
function fixture(type='BUSINESS',plan='BUSINESS_FREE',media=[{type:'IMAGE',url:photo},{type:'LOGO',url:logo}]){return {code:'AD507-N123',name:'Nombre & negocio',reference:'Frente al parque',description:'Descripción propia',commercialDescription:null,type,plan:{code:plan,name:plan},url:'https://direcciones.lat/nombre-propio/',coordinates:{latitude:8,longitude:-80},phone:null,landlinePhone:null,hours:null,socials:[],media,publication:null,extras:{countryCode:'PA',historical:false,postalCode:null,publicCode:'nombre-propio'}} as any;}
for(const [type,plan] of [['BUSINESS','BUSINESS_FREE'],['BUSINESS','BUSINESS_PREMIUM'],['BUSINESS','BUSINESS_PREMIUM_PRO'],['PLACE','PLACE_FREE']])test(`${plan}: initial HTML prefers logo and contains consistent social metadata`,()=>{
 const head=renderNewPublicAddress(fixture(type,plan)).split('</head>')[0];
 expect(head).toContain(`<meta property="og:image" content="${logo}">`);
 expect(head).toContain(`<meta property="og:image:secure_url" content="${logo}">`);
 expect(head).toContain(`<meta name="twitter:image" content="${logo}">`);
 expect(head).toContain('<meta name="twitter:card" content="summary_large_image">');
 expect(head).toContain('<meta property="og:title" content="Nombre &amp; negocio">');
 expect(head).toContain('<meta property="og:url" content="https://direcciones.lat/nombre-propio/">');
 expect(head).toContain('<meta property="og:description" content="'+(['PLACE_FREE','BUSINESS_PREMIUM_PRO'].includes(plan)?'Descripción propia':'Frente al parque')+'">');
 expect(head).not.toContain('og:image:width');expect(head).not.toContain('og:image:height');
});
test('main photo and site image are fallbacks; residential policy remains unchanged',()=>{
 expect(renderNewPublicAddress(fixture('PLACE','PLACE_FREE',[{type:'IMAGE',url:photo}]))).toContain(`<meta property="og:image" content="${photo}">`);
 expect(renderNewPublicAddress(fixture('BUSINESS','BUSINESS_FREE',[]))).toContain('<meta property="og:image" content="https://direcciones.lat/assets/og-latam-map-v2.jpg">');
 const html=renderNewPublicAddress(fixture('RESIDENTIAL','RESIDENTIAL'));
 expect(html).toContain(`<meta property="og:image" content="${photo}">`);expect(html).toContain('og:image:width');expect(html).not.toContain('og:image:secure_url');
});
