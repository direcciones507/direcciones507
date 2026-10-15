import {test,expect} from 'bun:test';
import {commercialEntryHtml,userPanelHtml} from '../user-panel';
const html=()=>commercialEntryHtml(true,new URL('https://direcciones.lat/'));
test('C01/C09 public menu keeps four destinations and private addresses stay in account panel',()=>{
 const page=html(),nav=page.match(/<nav aria-label="Navegación principal">(.*?)<\/nav>/)![1];
 expect([...nav.matchAll(/<a[^>]*>([^<]+)<\/a>/g)].map(m=>m[1])).toEqual(['Inicio','Países','Planes','Ayuda']);
 expect(page).not.toContain('href="/panel#addresses"');expect(userPanelHtml).toContain('Mis direcciones y lugares');
});
test('C02/C03/C08 reuse OAuth and preserve session and error nodes',()=>{
 const page=html();expect(page).toContain('data-latam-session="guest" href="#latamAccess"');expect(page).toContain('data-latam-session="authenticated" href="/panel"');
 expect(page).toContain('id="login" class="hidden" hidden');expect(page).toContain('id="message" role="status"');
 expect(page).toContain('latamCanPrepare=!!d.actions.prepareRequest');expect(page).toContain("if(document.getElementById('commercialCountry').value!=='PA')");
 expect(userPanelHtml).not.toContain('latamRequestDialog');expect(userPanelHtml).toContain('<h1>Mi panel</h1>');
 for(const script of page.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))expect(()=>new Function(script[1])).not.toThrow();
});
test('C04/C06/C07 retain country support and request types without another Natalie control',()=>{
 const page=html();expect(page).toContain('id="latamCountryState" hidden');expect(page).toContain('id="commercialCountry"');expect(page).toContain('id="countryCode"');expect(page).toContain('Más países');
 expect([...page.matchAll(/class="latam-plan-card"[^>]*>[\s\S]*?<h3>(.*?)<\/h3>/g)].map(m=>m[1])).toEqual(['Residencial','Lugar','Negocio Gratis','Premium','Premium Pro']);
 expect(page).not.toContain('id="latamHelp"');expect(page).toContain('id="latamHelpLink"');expect(page.match(/id="natalieLauncher"/g)?.length).toBe(1);
});
test('C05 hero uses the owner-approved PNG already published by PR81',()=>{
 const page=html();
 expect(page).toContain("hero.src='https://raw.githubusercontent.com/direcciones507/direcciones507/feat/admin-ui-20261006/direcciones-latam-mapa-sin-cuadro-azul.png'");
 expect(page).toContain('<img id="latamArt" class="latam-art" alt="" width="2400" height="1400">');
 expect(page).not.toContain("type:'image/webp'");
});

test('shared access dialog exists before its initialization script executes',()=>{
 const page=html();expect(page.indexOf('<dialog id="latamAccess"')).toBeLessThan(page.indexOf('<script>'));
 expect(page).toContain('type="email" required maxlength="320"');
});

test('browser HTML parser sees a real body, access dialog and executable scripts outside style',async()=>{
 const page=html();const seen={body:0,header:0,dialog:0,scripts:0};
 await new HTMLRewriter().on('body',{element(){seen.body++;}}).on('header',{element(){seen.header++;}})
 .on('dialog#latamAccess',{element(){seen.dialog++;}}).on('script',{element(){seen.scripts++;}})
 .transform(new Response(page)).text();
 expect(seen.body).toBe(1);expect(seen.header).toBeGreaterThan(0);expect(seen.dialog).toBe(1);expect(seen.scripts).toBeGreaterThan(0);
 expect(page.indexOf('</style>')).toBeLessThan(page.indexOf('</head>'));
});
