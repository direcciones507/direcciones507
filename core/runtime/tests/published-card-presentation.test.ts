import {test,expect} from 'bun:test';
import {createHash} from 'node:crypto';
const file=new URL('../../../ad507.template.html',import.meta.url);
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
test('published visual redesign preserves functional scripts and upper identity/gallery verbatim',async()=>{
 const html=await Bun.file(file).text();
 // Pin the current main scripts after its approved gallery-logo correction.
 expect(hash([...html.matchAll(/<script[^>]*>[\s\S]*?<\/script>/g)].map(x=>x[0]).filter(x=>!x.startsWith('<script>\n// Mobile presentation restoration.')).join(''))).toBe('0f35f4fd478928d49042e824259b1183350d9268ab700e8ceb2c2110eaa6fe33');
 expect(hash(html.slice(html.indexOf('  <div class="identity-block">'),html.indexOf('  <div class="white-sheet">')).trim())).toBe('cdf342f8a997d854fb390da21a4e9acba9ba6fd786f7c11e62f8e40bd0d0cf97');
 expect(hash(html.slice(html.indexOf('    <div id="premiumGalleryContainer"'),html.indexOf('    <section class="public-lower-layout"')).trim())).toBe('fc0e29b9069774257e11866bf27b19c39730463f1f1a14e0a5988c62b18a9394');
});
test('shared lower layout contains original controls once and preserves hidden configuration',async()=>{
 const html=await Bun.file(file).text();const ids=new Map<string,number>();const socials:string[]=[];
 await new HTMLRewriter().on('[id]',{element(e){const id=e.getAttribute('id')!;ids.set(id,(ids.get(id)||0)+1);}})
 .on('#redes-container > *',{element(e){socials.push(e.tagName);}})
 .on('#btnLandline',{element(e){expect(e.getAttribute('hidden')).not.toBeNull();}})
 .on('#codigoPostalContainer',{element(e){expect(e.getAttribute('style')).toBe('display:none;');}})
 .on('#btnTikTok,#btnFacebook,#btnWeb',{element(e){expect(e.getAttribute('style')).toBe('display:none;');}})
 .transform(new Response(html)).text();
 for(const id of ['btnGoogle','btnWaze','btnUber','btnWhats','btnGoogleSecundario','btnCall','btnShare','btnHorario','btnRef','btnQR','qrSection','qrImg','btnStats','btnInstagram','btnFacebook','btnTikTok','btnWeb'])expect(ids.get(id)).toBe(1);
 expect(socials).toEqual(['a','a','a','a']);
});

test('mobile restoration reuses each original node and isolates the newer styles to tablet and desktop',async()=>{
 const html=await Bun.file(file).text();
 expect(html).toContain('@media (min-width: 768px) {\n    /* Shared published-card lower layout only.');
 expect(html).toContain("matchMedia('(max-width: 767px)')");
 const presentation=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].find(x=>x[1].includes('// Mobile presentation restoration.'))![1];
 expect(presentation).toContain('sheet.before(slots[0].node)');
 expect(presentation).toContain('anchor.after(node)');
 expect(presentation).not.toMatch(/cloneNode|innerHTML|fetch\(|\.href\s*=|\.hidden\s*=|localStorage|cookie/);
});

test('wide card glyph references resolve locally without relying on the external icon font',async()=>{
 const html=await Bun.file(file).text();const symbols=new Set<string>();const uses:string[]=[];
 await new HTMLRewriter().on('symbol',{element(e){symbols.add(e.getAttribute('id')!);expect(e.getAttribute('viewBox')).toBeTruthy();}})
 .on('.public-lower-layout .wide-card-icon use',{element(e){uses.push(e.getAttribute('href')!);}}).transform(new Response(html)).text();
 expect(uses.length).toBeGreaterThan(15);
 for(const href of uses)expect(symbols.has(href.slice(1))).toBe(true);
 expect(html).toContain('.wide-card-icon { display: none; }');
});
