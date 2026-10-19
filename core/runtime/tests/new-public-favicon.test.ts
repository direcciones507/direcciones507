import {test,expect} from 'bun:test';
import {renderNewPublicAddress} from '../new-address-publication';

const logo='https://images.example.test/negocio-logo.png';
function pageFixture(countryCode:'PA'|'MX',historical=false){
  return {
    code:countryCode==='PA'?'AD507-TEST123':'AD52-TEST123',
    name:'Mi Negocio',
    reference:'Frente al colegio',
    description:null,
    commercialDescription:null,
    type:'BUSINESS',
    plan:{code:'BUSINESS_FREE',name:'Negocio gratis'},
    url:(historical?'https://direcciones507.com':'https://direcciones.lat')+'/AD507-TEST123/',
    coordinates:{latitude:8.12,longitude:-80.95},
    phone:'+50712345678',
    landlinePhone:null,
    hours:'8 a 4',
    socials:[],
    media:[{type:'LOGO',url:logo}],
    publication:null,
    extras:{countryCode,postalCode:null,historical}
  } as any;
}

test('new Core address uses 507 favicon for Panama and LATAM emblem for other countries',()=>{
  const panama=renderNewPublicAddress(pageFixture('PA'));
  expect(panama).toContain('id="dynamicFavicon" rel="icon" type="image/png" sizes="192x192" href="https://direcciones507.com/assets/icon-192.png"');
  expect(panama).toContain('id="dynamicAppleIcon" rel="apple-touch-icon" sizes="180x180" href="https://direcciones507.com/assets/icon-180.png"');
  const latam=renderNewPublicAddress(pageFixture('MX'));
  expect(latam).toContain('id="dynamicFavicon" rel="icon" type="image/png" sizes="32x32" href="https://direcciones507.com/assets/favicon-latam-32.png"');
  expect(latam).toContain('id="dynamicAppleIcon" rel="apple-touch-icon" href="https://direcciones507.com/assets/favicon-latam-32.png"');
  expect(latam).not.toContain('href="https://direcciones507.com/assets/icon-192.png"');
  // Keep the WhatsApp preview business-specific for both countries.
  for(const html of [panama,latam]){
    expect(html).toContain('<meta property="og:image" content="'+logo+'">');
    expect(html).toContain('<meta property="og:title" content="Mi Negocio">');
    expect(html).toContain('Frente al colegio');
  }
});

test('historical pages keep their existing relative icon paths',()=>{
  const html=renderNewPublicAddress(pageFixture('PA',true));
  expect(html).toContain('id="dynamicFavicon" rel="icon" type="image/png" sizes="192x192" href="/assets/icon-192.png"');
  expect(html).toContain('id="dynamicAppleIcon" rel="apple-touch-icon" sizes="180x180" href="/assets/icon-180.png"');
});
