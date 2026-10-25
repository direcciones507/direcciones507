import {test,expect} from 'bun:test';
import sharp from 'sharp';
import {commercialEntryHtml} from '../user-panel';
import {handleLatamOpenGraphImage} from '../latam-open-graph';

test('LATAM raw HTML references a public compact image with matching MIME and dimensions for every crawler',async()=>{
  const html=commercialEntryHtml(true,new URL('https://direcciones.lat/'));
  const head=html.slice(0,html.indexOf('</head>'));
  const url='https://direcciones.lat/assets/og-latam-map-v2.jpg';
  for(const name of ['og:image','og:image:secure_url']){
    expect(head.match(new RegExp('property="'+name+'"','g'))).toHaveLength(1);
    expect(head).toContain('property="'+name+'" content="'+url+'"');
  }
  expect(head).toContain('name="twitter:image" content="'+url+'"');
  expect(head).toContain('property="og:image:type" content="image/jpeg"');
  expect(head).toContain('property="og:image:height" content="675"');
  expect(head).toContain('property="og:image:width" content="1200"');
  expect(head).toContain('rel="canonical" href="https://direcciones.lat/"');
  for(const ua of ['Mozilla/5.0','facebookexternalhit/1.1','WhatsApp/2.26']){
    const response=handleLatamOpenGraphImage(new Request(url,{headers:{'user-agent':ua}}))!;
    expect(response.status).toBe(200);expect(response.headers.get('content-type')).toBe('image/jpeg');
    const bytes=Buffer.from(await response.arrayBuffer());expect(bytes.length).toBeLessThan(300000);
    expect(response.headers.get('content-length')).toBe(String(bytes.length));
    const info=await sharp(bytes).metadata();expect(info.format).toBe('jpeg');expect(info.width).toBe(1200);expect(info.height).toBe(675);
  }
  const response=handleLatamOpenGraphImage(new Request(url,{method:'HEAD'}))!;
  expect(response.status).toBe(200);expect(await response.text()).toBe('');
});

test('image route never intercepts Panama or unrelated requests; Panama metadata remains identical',()=>{
  for(const url of ['https://direcciones507.com/assets/og-latam-map-v2.jpg','https://direcciones.lat.evil.test/assets/og-latam-map-v2.jpg','https://direcciones.lat/panel'])expect(handleLatamOpenGraphImage(new Request(url))).toBeNull();
  const head=commercialEntryHtml(false,new URL('https://direcciones507.com/commercial/panama')).split('</head>')[0];
  expect(head).toContain('property="og:image" content="https://direcciones507.com/og-507-2026.png"');
  expect(head).toContain('property="og:image:type" content="image/png"');
  expect(head).toContain('property="og:image:height" content="630"');
  expect(head).not.toContain('og-latam-map-v2');
});
