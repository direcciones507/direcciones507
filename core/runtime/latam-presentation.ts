import {legalLinks,LEGAL_VERSION,LEGAL_ACCEPTANCE_TEXT} from './legal';
import {sharedVisualStyle} from './shared-visual-style';
import {readFileSync} from 'node:fs';
// Hero replacement uploaded by owner; keep the image hosted in the existing GitHub repository.
/** Presentation only: the existing panel, country policy and Natalie remain authoritative. */
export function latamPresentation(html:string){
 const legacy=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
 const start=legacy.indexOf('<div id="modalPoliticas"'),end=legacy.indexOf('<button id="natalieLauncher"',start);
 if(start<0||end<0)throw Error('EXISTING_LEGAL_NOTICE_REQUIRED');
 const notice=legacy.slice(start,end).replace('onclick="cerrarPoliticas()"','data-legal-close');
 const footer=`<footer class="latam-footer"><div class="latam-footer-inner"><div class="latam-footer-brand"><a href="#inicio" class="latam-footer-logo"><svg width="48" height="56" viewBox="0 0 24 28" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 26S3 18 3 11a9 9 0 1 1 18 0c0 7-9 15-9 15Z"/><circle cx="12" cy="11" r="3"/></svg><strong>Direcciones LATAM</strong></a><p>Tu ubicación, más fácil de compartir.</p><small>Powered by AD507 Technologies</small><div class="latam-footer-social" aria-label="Redes sociales"><a href="https://www.facebook.com/share/18ezKyzYvg/" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.23.19 2.23.19v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z"/></svg></a><a href="https://instagram.com/direcciones507" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.8" cy="6.3" r="1" fill="currentColor" stroke="none"/></svg></a><a href="https://tiktok.com/@direcciones507" target="_blank" rel="noopener noreferrer" aria-label="TikTok"><svg viewBox="0 0 24 24" width="23" height="23" fill="currentColor" aria-hidden="true"><path d="M16.7 2c.3 2.6 1.7 4.2 4.3 4.4v3.6a9.2 9.2 0 0 1-4.3-1.2v6.6c0 4.2-2.8 6.6-6.3 6.6a6.3 6.3 0 0 1-6.4-6.3c0-4 3.2-6.7 7.2-6.3v3.8c-2.1-.5-3.5.5-3.5 2.4 0 1.5 1.1 2.6 2.6 2.6 1.7 0 2.6-1.2 2.6-3V2h3.8Z"/></svg></a></div></div><nav aria-label="Información y contacto"><div><strong>Planes y servicios</strong><a href="#planes">Ver todos los planes</a><a href="#planes">Residencial</a><a href="#planes">Negocio Gratis</a><a href="#planes">Premium y Premium Pro</a></div><div><strong>Información</strong>${legalLinks}<button type="button" data-cookie-settings>Configurar cookies</button></div><div><strong>Contacto</strong><a href="https://wa.me/50765996532" target="_blank" rel="noopener noreferrer">WhatsApp</a><a href="mailto:soporte@direcciones507.com">soporte@direcciones507.com</a></div></nav></div><div class="latam-copyright">© 2026 Direcciones LATAM. Todos los derechos reservados.</div></footer>`;
 const header=`<header class="latam-header"><a class="latam-brand" href="#inicio"><svg width="32" height="38" viewBox="0 0 24 28" fill="none" stroke="#438bff" stroke-width="2" aria-hidden="true"><path d="M12 26S3 18 3 11a9 9 0 1 1 18 0c0 7-9 15-9 15Z"/><circle cx="12" cy="11" r="3"/></svg><div>Direcciones <strong>LATAM</strong><small>Direcciones digitales para Latinoamérica</small></div></a><details class="latam-menu"><summary>Menú</summary><nav aria-label="Navegación principal"><a href="#inicio">Inicio</a><a href="#paises">Países</a><a href="#planes">Planes</a><a href="#ayuda" id="latamHelpLink">Ayuda</a></nav></details><div class="latam-account"><a class="latam-outline hidden" data-latam-session="guest" href="#latamAccess">Ingresar</a><a class="button hidden" data-latam-session="guest" href="#latamAccess">Crear cuenta</a><a class="latam-outline hidden" data-latam-session="authenticated" href="/panel">Mi cuenta</a><button id="logout" data-latam-session="authenticated" class="hidden">Cerrar sesión</button></div></header>`;
 const css=`
.latam-footer{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;padding:28px 0 92px;border-top:1px solid #263951;color:#aabbd0}.latam-footer strong{font-size:21px;color:#fff}.latam-footer p{font-size:14px}.latam-footer nav{display:grid;grid-template-columns:repeat(2,minmax(140px,1fr));gap:12px 24px;align-content:start}.latam-footer button{padding:0;min-height:36px;background:none!important;box-shadow:none!important;color:#cbd8ec!important;text-align:left;justify-content:start;font-weight:400;font-size:14px}.latam-footer a{min-height:36px;display:inline-flex;align-items:center}.latam-plan-card p{font-size:13px;line-height:1.6;color:#b8c7da;margin:0 0 16px}.latam-plan-card>span{margin-top:auto}.latam-plan-card h3{margin-bottom:10px!important}body.latam .natalie-chat{max-height:min(540px,70dvh);bottom:84px;width:min(360px,calc(100vw - 32px));right:16px}body.latam .natalie-launcher{right:16px;bottom:16px}body.latam .natalie-messages{min-height:80px;max-height:35dvh}body.latam .latam-benefit-grid article{padding:20px}body.latam .latam-benefits{padding-bottom:24px}@media(max-width:620px){.latam-footer nav{width:100%}.latam-plan-card{min-height:230px}}

body.latam{background:#071321;color:#f4f7fc;color-scheme:dark}body.latam header a{background:transparent}body.latam header a.button{background:#1f6fff}body.latam a{color:#cbd8ec;text-decoration:none}body.latam a:hover{color:white}body.latam a:focus-visible,body.latam summary:focus-visible{outline:3px solid #8bbcff;outline-offset:4px}body.latam main{max-width:1280px;margin:0 auto;padding:0 32px}body.latam .card,body.latam .section-card,body.latam .request-shell,body.latam .review-card,body.latam .address-card,body.latam .address-empty,body.latam .upload-box{background:#0e2036;color:#f4f7fc;border:1px solid #263951;box-shadow:none}body.latam input,body.latam select,body.latam textarea{background:#091827;color:#f4f7fc;border-color:#40516b}body.latam .muted{color:#b8c7da}body.latam button,body.latam .button{background:#1f6fff;color:white}body.latam .error{color:#ffaaa3}body.latam .latam-header{max-width:1440px;margin:auto;background:#071321;border-bottom:1px solid #203047;padding:22px 32px;gap:24px}body.latam .latam-brand{display:flex;align-items:center;gap:12px;font-size:23px;font-weight:750;color:white;white-space:nowrap}.latam-brand>span{color:#438bff;font-size:38px}.latam-brand strong{color:#438bff}.latam-brand small{display:block;font-size:11px;font-weight:400;color:#aabbd0;margin-top:4px}.latam-menu summary{display:none}.latam-menu nav{gap:22px;font-size:14px}.latam-account{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.latam-account a{min-height:44px;padding:12px 16px;border-radius:9px;font-size:14px}.latam-outline{border:1px solid #32445e}.latam-hero{position:relative;isolation:isolate;min-height:570px;padding:64px 0 36px}.latam-art{position:absolute;z-index:-1;right:-32px;top:0;width:78%;height:100%;object-fit:contain;object-position:right;mask-image:linear-gradient(90deg,transparent 0%,#000 40%),linear-gradient(180deg,transparent,#000 15%,#000 80%,transparent);mask-composite:intersect;opacity:.95}.latam-copy{max-width:520px}.latam-copy h1{font-size:clamp(40px,4.6vw,64px);line-height:1.06;letter-spacing:-.035em;margin:0 0 24px}.latam-copy>p{max-width:460px;color:#c5d2e4;line-height:1.65;font-size:18px}.latam-cta{display:flex!important;justify-content:space-between!important;width:100%;margin:26px 0 30px;min-height:56px!important}.latam-country-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.latam-country-grid a{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:98px;background:#0d1f35e6;border:1px solid #2a3c55;border-radius:12px;padding:12px 5px;font-size:13px;text-align:center}.latam-country-grid a[aria-current=true]{border-color:#6fa6ff;background:#163355}.latam-country-grid .flag{display:block;margin:4px 0 7px}.latam-country-grid small{font-size:10px;color:#b3c3d7;margin-top:5px}.latam-country-label{font-weight:700;margin-bottom:14px}.latam-secondary-countries{margin-top:16px}.latam-secondary-countries summary{padding:10px 0}.latam-benefits{padding:20px 0 36px}.latam-benefits h2{font-size:20px;margin:0 0 22px}.latam-benefit-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.latam-benefit-grid article{background:#0e2036;border:1px solid #263951;border-radius:15px;padding:26px}.latam-benefit-grid .symbol{color:#438bff;font-size:32px}.latam-benefit-grid h3{font-size:17px}.latam-benefit-grid p{font-size:14px;line-height:1.65;color:#b8c7da}.latam-info{padding:26px 0;line-height:1.65;border-top:1px solid #203047}.latam-info h2{font-size:21px}.latam-info p{color:#b8c7da}.latam-info a{text-decoration:underline!important}body.latam footer.card{margin-top:30px;color:#aabbd0!important}body.latam #commercialWelcome{background:transparent;border:0;padding:0;box-shadow:none}body.latam #commercialIdentity,body.latam #commercialAvailability{color:#aabbd0;font-size:12px;line-height:1.5}body.latam #commercialCountry{max-width:320px}body.latam #loading,body.latam #login{margin-top:20px}body.latam #login h1{font-size:24px}body.latam #cuenta{scroll-margin-top:24px}
.latam-plan-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}.latam-info a.latam-plan-card{text-decoration:none!important}.latam-plan-card[hidden]{display:none!important}.latam-plan-card{display:flex;flex-direction:column;justify-content:space-between;min-height:142px;padding:22px 16px;background:#0e2036;border:1px solid #263951;border-radius:14px;text-decoration:none!important}.latam-plan-card h3{font-size:17px;margin:0 0 20px;color:#fff}.latam-plan-card>span{font-size:13px;color:#8db8ff}.latam-plan-card[aria-disabled=true]{opacity:.65}#latamRequestDialog{width:min(1120px,94vw);max-height:90vh;border:1px solid #40516b;border-radius:18px;background:#071321;color:#f4f7fc;padding:24px}#latamRequestDialog::backdrop{background:#020b16cc}#latamRequestClose{margin-bottom:18px}body.latam #latamActionStatus{color:#b8c7da;font-size:13px;line-height:1.5}#latamActionStatus:empty{display:none}@media(max-width:1099px){.latam-plan-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:620px){.latam-plan-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.latam-plan-card{padding:18px 12px}.latam-plan-card h3{font-size:16px}#latamRequestDialog{padding:16px}}@media(max-width:359px){.latam-plan-grid{grid-template-columns:1fr}}
@media(min-width:1100px){.latam-title-line{white-space:nowrap}.latam-copy h1{font-size:60px}.latam-menu:not([open]) nav{display:flex}.latam-menu{display:block}.latam-header{flex-wrap:nowrap!important}.latam-account{justify-content:flex-end}.latam-country-grid{max-width:500px}}
@media(min-width:621px) and (max-width:1099px){.latam-hero{min-height:620px}.latam-art{width:100%;object-position:center bottom;opacity:.35}.latam-copy{max-width:570px}.latam-benefit-grid{gap:12px}.latam-benefit-grid article{padding:20px}.latam-header .latam-account{margin-left:auto}}
@media(max-width:1099px){.latam-menu summary{display:block;cursor:pointer;min-height:44px;padding:12px;border:1px solid #32445e;border-radius:9px}.latam-menu[open]{order:3;width:100%}.latam-menu nav{padding:18px 0}.latam-menu:not([open]) nav{display:none}}
@media(max-width:620px){body.latam main{padding:0 20px}body.latam .latam-header{padding:18px 20px;gap:12px}.latam-brand{font-size:20px!important}.latam-brand small{font-size:10px}.latam-account{width:100%}.latam-account a{flex:1;text-align:center;padding:12px 8px}.latam-hero{min-height:0;padding:36px 0 24px}.latam-art{display:block;width:100%;right:0;top:16px;height:270px;object-fit:contain;opacity:.17;pointer-events:none}.latam-copy{text-align:center;max-width:none}.latam-copy h1{font-size:clamp(34px,9vw,44px)}.latam-copy>p{font-size:16px;margin-left:auto;margin-right:auto}.latam-country-label{text-align:left}.latam-country-grid{gap:7px}.latam-country-grid a{font-size:11px;padding:10px 3px;min-height:96px}.latam-country-grid .flag{font-size:26px}.latam-secondary-countries{text-align:left}.latam-benefits{padding-top:8px}.latam-benefits h2{font-size:18px}.latam-benefit-grid{gap:8px}.latam-benefit-grid article{padding:16px 9px;text-align:center}.latam-benefit-grid h3{font-size:13px;line-height:1.4}.latam-benefit-grid p{font-size:12px;line-height:1.6}.latam-info{padding:20px 0}body.latam #commercialCountry{max-width:none}}
@media(max-width:359px){.latam-country-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.latam-benefit-grid{grid-template-columns:1fr}.latam-benefit-grid article{text-align:left}.latam-brand{white-space:normal}}
`;
 const homeCss=`
.latam-plan-action{color:inherit!important;text-decoration:none!important;display:contents}.plan-legal a{font-size:12px!important;color:#b4dcff!important;line-height:1.7}/* Homepage layout only; existing palette, map, forms and account remain unchanged. */
body.latam #commercialWelcome{max-width:1180px;margin-inline:auto}
#commercialWelcome .latam-hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:center;gap:32px;min-height:0;padding:44px 0 28px}
#commercialWelcome .latam-copy{max-width:none;min-width:0}
#commercialWelcome .latam-copy h1{font-size:clamp(36px,4.3vw,60px);margin-bottom:20px}
#commercialWelcome .latam-title-line{white-space:normal}
#commercialWelcome .latam-copy>p{font-size:17px;margin:0;max-width:480px}
#commercialWelcome .latam-art{position:static;z-index:auto;width:100%;height:clamp(240px,28vw,360px);max-height:380px;object-fit:cover;object-position:right center;opacity:.95;mask-image:none}
#commercialWelcome .latam-cta{width:fit-content;max-width:100%;gap:28px;justify-content:center!important;min-height:50px!important;margin:24px 0 0;padding:14px 22px}
#commercialWelcome #paises{padding:22px 0 26px;border-top:1px solid #203047}
#commercialWelcome .latam-country-label{margin:0 0 16px;font-size:18px}
#commercialWelcome .latam-country-grid{max-width:none;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
#commercialWelcome .latam-country-grid a{min-height:96px;padding:12px 8px}
#commercialWelcome .latam-country-grid a[aria-current=true]{outline:2px solid #6fa6ff;outline-offset:2px;font-weight:750}
#commercialWelcome .latam-secondary-countries{margin-top:12px}
#commercialWelcome #commercialIdentity{margin:14px 0 8px}
#commercialWelcome #commercialAvailability,#commercialWelcome .latam-availability{padding:12px 16px;border:1px solid #263951;border-radius:10px;line-height:1.6;font-size:13px;margin:10px 0 0}
#commercialWelcome .latam-benefits{padding:24px 0 28px}
#commercialWelcome .latam-benefit-grid{gap:18px;align-items:stretch}
#commercialWelcome .latam-benefit-grid article{padding:22px;min-width:0}
#commercialWelcome .latam-benefit-grid h3{line-height:1.4}
#commercialWelcome .latam-benefit-grid p{margin-bottom:0}
#commercialWelcome .latam-plan-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:16px}
#commercialWelcome .latam-plan-card{flex:0 1 calc((100% - 32px)/3);min-width:0;min-height:210px;padding:22px;overflow-wrap:anywhere}
#commercialWelcome .latam-plan-card h3{line-height:1.4}
#commercialWelcome .latam-plan-card p{font-size:14px}
#commercialWelcome #ayuda{padding:22px 0}
#commercialWelcome #ayuda p{margin-bottom:0}
body.latam .latam-footer{display:block;padding:24px 0 48px;margin-top:12px}
.latam-footer-inner{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;max-width:1180px;margin-inline:auto}
.latam-footer-inner>div{min-width:0}
.latam-footer-inner p{margin:6px 0 10px;line-height:1.5}
.latam-footer-inner nav{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 24px;max-width:420px}
.latam-footer-inner nav a,.latam-footer-inner nav button{font-size:14px;white-space:normal;line-height:1.5}
@media(min-width:621px) and (max-width:899px){
#commercialWelcome .latam-hero{gap:20px;padding-top:32px}
#commercialWelcome .latam-copy h1{font-size:36px}
#commercialWelcome .latam-copy>p{font-size:15px}
#commercialWelcome .latam-benefit-grid{gap:12px}
#commercialWelcome .latam-benefit-grid article{padding:18px 14px}
#commercialWelcome .latam-plan-card{flex-basis:calc((100% - 16px)/2)}
}
@media(max-width:620px){
#commercialWelcome .latam-hero{grid-template-columns:minmax(0,1fr);gap:16px;padding:28px 0 24px;text-align:center}
#commercialWelcome .latam-copy{display:contents}
#commercialWelcome .latam-copy h1{order:0;font-size:clamp(34px,9vw,44px);margin:0}
#commercialWelcome .latam-copy>p{order:1;font-size:16px;margin-inline:auto}
#commercialWelcome .latam-art{order:2;height:230px;max-height:230px}
#commercialWelcome .latam-cta{order:3;margin:0 auto}
#commercialWelcome .latam-country-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
#commercialWelcome .latam-country-grid a{font-size:13px}
#commercialWelcome .latam-benefit-grid{grid-template-columns:1fr;gap:12px}
#commercialWelcome .latam-benefit-grid article{text-align:left;padding:20px}
#commercialWelcome .latam-benefit-grid h3{font-size:17px;margin:10px 0}
#commercialWelcome .latam-benefit-grid p{font-size:14px}
#commercialWelcome .latam-plan-card{flex-basis:100%;min-height:0;padding:20px}
#commercialWelcome .latam-plan-card>span{margin-top:8px}
.latam-footer-inner{flex-direction:column;gap:18px}
.latam-footer-inner nav{width:100%;max-width:none;gap:6px 16px}
}

/* Homepage-only polish; retain existing colors and functional controls. */
#commercialWelcome .latam-hero{grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr);gap:clamp(24px,4vw,56px)}
#commercialWelcome .latam-copy h1{font-size:clamp(38px,4.1vw,58px);line-height:1.12;letter-spacing:-.035em;text-wrap:balance}
#commercialWelcome .latam-copy>p{max-width:530px;line-height:1.7;color:#d1def0}
#commercialWelcome .latam-art{object-fit:cover;object-position:right center;max-height:390px;border-radius:18px}
#commercialWelcome .latam-benefit-grid article{display:flex;flex-direction:column;gap:8px;border-radius:18px;background:linear-gradient(150deg,#132b48,#0e2036)}
#commercialWelcome .latam-benefit-grid h3{margin:2px 0;font-size:18px}
#commercialWelcome .latam-benefit-grid p{line-height:1.65}
#commercialWelcome .latam-plan-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;align-items:stretch}
#commercialWelcome .latam-plan-card{flex:auto;min-height:208px;padding:24px;border-radius:18px;background:linear-gradient(155deg,#142d4c,#0e2036);border-color:#344d6b;overflow-wrap:break-word}
#commercialWelcome .latam-plan-card h3{margin-bottom:10px!important;font-size:19px}
#commercialWelcome .latam-plan-card p{font-size:14px;line-height:1.65;flex:1}
#commercialWelcome .latam-plan-card>span{display:inline-flex;align-items:center;font-weight:700;margin-top:16px}
body.latam .latam-footer-inner{justify-content:center;align-items:center;gap:clamp(24px,6vw,88px)}
body.latam .latam-footer-inner>div{flex:0 1 300px}
body.latam .latam-footer-inner nav{flex:0 1 440px;justify-items:start}
/* Prices are informative only; no checkout or billing changes. */
#commercialWelcome .latam-plan-price{font-size:27px;line-height:1.2;font-weight:800;letter-spacing:-.025em;color:#f2f8ff;margin:0 0 14px}
#commercialWelcome .latam-plan-card[data-latam-type="PLACE"] .latam-plan-price,#commercialWelcome .latam-plan-card[data-latam-plan="BUSINESS_FREE"] .latam-plan-price{color:#8af0b0}
/* Recognizable plan icons and clear visual hierarchy. */
#commercialWelcome .latam-plan-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:16px}
#commercialWelcome .latam-plan-icon{width:54px;height:54px;display:inline-flex;align-items:center;justify-content:center;border-radius:16px;background:#224e60;color:#83ead2;flex-shrink:0}
#commercialWelcome .latam-plan-label{font-size:11px;line-height:1.35;font-weight:700;letter-spacing:.025em;text-align:right;color:#d5e6f4;background:#ffffff12;border:1px solid #ffffff1a;border-radius:999px;padding:6px 10px}
#commercialWelcome .latam-plan-card[data-latam-type="PLACE"] .latam-plan-icon{background:#244b60;color:#8cddff}
#commercialWelcome .latam-plan-card[data-latam-plan="BUSINESS_FREE"] .latam-plan-icon{background:#244c40;color:#8af0b0}
#commercialWelcome .latam-plan-card[data-latam-plan="BUSINESS_PREMIUM"] .latam-plan-icon{background:#49375c;color:#d9afff}
#commercialWelcome .latam-plan-card[data-latam-plan="BUSINESS_PREMIUM_PRO"] .latam-plan-icon{background:#55422e;color:#ffd489}
#commercialWelcome .latam-plan-grid .latam-plan-card h3{margin-bottom:8px!important;font-size:21px}
#commercialWelcome .latam-plan-grid .latam-plan-card p{margin-top:0}

/* LATAM compact help strip and premium footer; presentation only. */
#commercialWelcome .latam-help-strip{display:flex;align-items:center;gap:22px;padding:22px 28px;margin:28px 0 18px;border:1px solid #2468aa;border-radius:20px;background:linear-gradient(125deg,#102a56,#071b37 75%);box-shadow:0 12px 32px #020d2240}
#commercialWelcome .latam-help-heading{display:flex;align-items:center;gap:14px;flex-shrink:0}
#commercialWelcome .latam-help-heading h2{font-size:29px;margin:0;color:white}
#commercialWelcome .latam-help-icon{display:grid;place-items:center;width:56px;height:56px;border-radius:18px;background:linear-gradient(140deg,#00a5ef,#2446b7);font-size:29px;color:white}
#commercialWelcome .latam-help-strip p{margin:0;flex:1;color:#cbdcf4;line-height:1.55}
#commercialWelcome .latam-help-strip p strong{display:block;color:#fff;font-size:18px}
#commercialWelcome .latam-help-action{display:inline-flex;align-items:center;justify-content:center;text-decoration:none!important;white-space:nowrap;padding:14px 20px;border-radius:999px;background:#078df2;color:white;font-weight:700}
body.latam .latam-footer{display:block;padding:36px 20px 60px;background:linear-gradient(135deg,#061223,#0a1c32);border-top:1px solid #23486c;border-radius:18px 18px 0 0}
body.latam .latam-copyright{text-align:center;width:100%;margin:26px auto 0;font-size:13px;line-height:1.5;color:#b8c9dd}
body.latam .latam-footer-inner{max-width:1180px;display:grid;grid-template-columns:minmax(240px,1.1fr) minmax(0,1.9fr);gap:44px;margin:auto}
body.latam .latam-footer-logo{display:flex;align-items:center;gap:14px;text-decoration:none!important;color:#fff}
body.latam .latam-footer-logo svg{color:#11a9ff;flex-shrink:0}
body.latam .latam-footer-logo strong{font-size:24px}
body.latam .latam-footer-brand p{margin:2px 0 12px 62px}
body.latam .latam-footer-brand small{display:block;margin-left:62px}
body.latam .latam-footer-social{display:flex;gap:12px;margin:20px 0 0 62px}
body.latam .latam-footer-social a{width:42px;height:42px;min-height:42px;border-radius:50%;display:grid;place-items:center;background:#1a3453;color:white;font-size:23px;font-weight:800;text-decoration:none!important}
body.latam .latam-footer-social a:hover{background:#086ec1}
body.latam .latam-footer-inner nav{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;max-width:none}
body.latam .latam-footer-inner nav>div{display:flex;flex-direction:column;align-items:flex-start;gap:10px}
body.latam .latam-footer-inner nav strong{color:#fff;font-size:15px;margin-bottom:7px}
body.latam .latam-footer-inner nav a,body.latam .latam-footer-inner nav button{min-height:0;padding:0;font-size:14px;color:#cbd8ec!important;text-align:left}
@media(max-width:850px){#commercialWelcome .latam-help-strip{flex-wrap:wrap;gap:14px;padding:18px}#commercialWelcome .latam-help-strip p{flex-basis:calc(100% - 100px)}#commercialWelcome .latam-help-action{margin-left:auto}body.latam .latam-footer-inner{grid-template-columns:1fr;gap:28px}}
@media(max-width:560px){#commercialWelcome .latam-help-strip{display:block}#commercialWelcome .latam-help-heading{margin-bottom:12px}#commercialWelcome .latam-help-strip p{margin-bottom:15px}#commercialWelcome .latam-help-action{width:100%;white-space:normal}body.latam .latam-footer-inner nav{grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}body.latam .latam-footer-brand p,body.latam .latam-footer-brand small,body.latam .latam-footer-social{margin-left:0}}
/* Help alignment and recognizable social logos across screen sizes. */
#commercialWelcome .latam-help-strip{box-sizing:border-box;min-width:0;min-height:112px;overflow:visible;gap:24px;padding:22px 28px}
#commercialWelcome .latam-help-heading{min-width:0;gap:16px;align-items:center}
#commercialWelcome .latam-help-icon{box-sizing:border-box;display:flex;align-items:center;justify-content:center;flex:0 0 52px;width:52px;height:52px;line-height:1;margin:0;overflow:hidden}
#commercialWelcome .latam-help-heading h2{line-height:1.2;white-space:nowrap}
#commercialWelcome .latam-help-strip p{min-width:0;overflow-wrap:break-word}
body.latam .latam-footer-social a{display:flex;align-items:center;justify-content:center;flex:0 0 42px;line-height:1}
body.latam .latam-footer-social svg{display:block;flex-shrink:0}
@media(max-width:850px){#commercialWelcome .latam-help-strip{min-height:0;padding:18px 20px;gap:16px}#commercialWelcome .latam-help-strip p{flex:1 1 230px}}
@media(max-width:560px){#commercialWelcome .latam-help-strip{display:flex;flex-direction:column;align-items:stretch;gap:12px;padding:18px;border-radius:16px}#commercialWelcome .latam-help-heading{gap:12px}#commercialWelcome .latam-help-icon{flex-basis:46px;width:46px;height:46px;font-size:23px}#commercialWelcome .latam-help-heading h2{font-size:23px}#commercialWelcome .latam-help-strip p{flex:none;margin:0;font-size:14px}#commercialWelcome .latam-help-strip p strong{font-size:16px}body.latam .latam-footer-logo strong{font-size:20px}body.latam .latam-footer-logo svg{width:38px;height:44px}body.latam .latam-footer-inner nav{grid-template-columns:repeat(2,minmax(0,1fr))}body.latam .latam-footer-inner nav>div{min-width:0}body.latam .latam-footer-inner nav a,body.latam .latam-footer-inner nav button{overflow-wrap:anywhere}}
/* Center and constrain the help banner without affecting the footer. */
#commercialWelcome .latam-help-strip{width:min(100%,860px);max-width:860px;margin:26px auto 22px;min-height:0;padding:20px 26px;display:flex;justify-content:center;align-items:center;gap:22px}
#commercialWelcome .latam-help-heading{justify-content:center;flex:0 0 auto}
#commercialWelcome .latam-help-strip p{flex:0 1 auto;max-width:490px;text-align:center;margin:0}
@media(max-width:850px){#commercialWelcome .latam-help-strip{width:calc(100% - 20px);padding:18px 20px;gap:16px}#commercialWelcome .latam-help-strip p{flex:1 1 220px}}
@media(max-width:560px){#commercialWelcome .latam-help-strip{width:100%;padding:18px 16px;display:flex;flex-direction:column;align-items:center;gap:10px}#commercialWelcome .latam-help-heading{justify-content:center}#commercialWelcome .latam-help-strip p{flex:none;max-width:100%;text-align:center;margin:0}}
/* LATAM plan cards: centered 3+2 layout and refined presentation only. */
@media(min-width:1100px){
#commercialWelcome .latam-plan-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:18px}
#commercialWelcome .latam-plan-grid .latam-plan-card{flex:0 1 calc((100% - 36px)/3);max-width:calc((100% - 36px)/3)}
}
#commercialWelcome .latam-plan-grid .latam-plan-card{position:relative;min-width:0;background:linear-gradient(145deg,#193c61 0%,#112c4a 65%,#10243d 100%);border:1px solid #446d92;border-radius:20px;box-shadow:0 10px 28px #020a1840,inset 0 1px 0 #ffffff14;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
#commercialWelcome .latam-plan-grid .latam-plan-card:hover{transform:translateY(-3px);border-color:#78b5d5;box-shadow:0 15px 30px #020a1860}
#commercialWelcome .latam-plan-grid .latam-plan-card:focus-visible{outline:3px solid #9dd9f7;outline-offset:3px}
#commercialWelcome .latam-plan-grid .latam-plan-card>span{display:inline-flex;align-items:center;align-self:flex-start;padding:9px 13px;border-radius:999px;background:#234e70;color:#d6f5ff;font-weight:700;font-size:13px;letter-spacing:.01em}
#commercialWelcome .latam-plan-grid .latam-plan-card h3{color:#fff}
@media(prefers-reduced-motion:reduce){#commercialWelcome .latam-plan-grid .latam-plan-card{transition:none}#commercialWelcome .latam-plan-grid .latam-plan-card:hover{transform:none}}
/* LATAM benefit cards: colorful scalable SVG icons, responsive and presentation-only. */
#commercialWelcome .latam-benefit-grid article{background:#142c45;border:1px solid #2a425f;border-radius:18px;gap:9px;box-shadow:0 8px 24px #020b1640}
#commercialWelcome .latam-benefit-icon{display:inline-flex;align-items:center;justify-content:center;width:62px;height:62px;border-radius:16px;flex-shrink:0}
#commercialWelcome .latam-benefit-icon .symbol{width:30px;height:30px;display:block}
#commercialWelcome .latam-benefit-green .latam-benefit-icon{background:#214f44;color:#65e6a4}
#commercialWelcome .latam-benefit-purple .latam-benefit-icon{background:#49365d;color:#d7a6ff}
#commercialWelcome .latam-benefit-gold .latam-benefit-icon{background:#51402c;color:#ffd17d}
#commercialWelcome .latam-benefit-green .latam-benefit-icon .symbol{color:#65e6a4}
#commercialWelcome .latam-benefit-purple .latam-benefit-icon .symbol{color:#d7a6ff}
#commercialWelcome .latam-benefit-gold .latam-benefit-icon .symbol{color:#ffd17d}
@media(min-width:621px) and (max-width:1099px){#commercialWelcome .latam-plan-grid{grid-template-columns:repeat(2,minmax(0,1fr))}#commercialWelcome .latam-hero{gap:20px}#commercialWelcome .latam-art{height:300px}}
@media(max-width:620px){#commercialWelcome .latam-hero{grid-template-columns:1fr}#commercialWelcome .latam-copy h1{font-size:clamp(34px,9vw,44px)}#commercialWelcome .latam-art{height:220px}#commercialWelcome .latam-plan-grid{grid-template-columns:1fr}#commercialWelcome .latam-plan-card{min-height:0}body.latam .latam-footer-inner{align-items:stretch;gap:20px}body.latam .latam-footer-inner>div,body.latam .latam-footer-inner nav{flex:auto}}
`;
 const sessionScript = `
let latamSessionState='loading',latamCanPrepare=false;
let pendingSelectedPlanHandoff=null;
function updateLatamSession(){
 if(pendingSelectedPlanHandoff&&latamSessionState!=='loading'){
  const pending=pendingSelectedPlanHandoff;pendingSelectedPlanHandoff=null;
  queueMicrotask(()=>prepareLatamRequest({preventDefault(){}},pending.type,pending.plan));
 }
 if(['guest','error'].includes(latamSessionState)&&document.getElementById('latamRequestDialog').open)document.getElementById('latamRequestDialog').close();
 document.querySelectorAll('[data-latam-session]').forEach(a=>a.classList.toggle('hidden',a.dataset.latamSession!==latamSessionState));
 const c=document.getElementById('commercialCountry').value,cta=document.getElementById('latamCreate');
 document.querySelectorAll('a[data-latam-session="authenticated"]').forEach(a=>a.href='/panel?country='+encodeURIComponent(c)+(new URLSearchParams(location.search).get('origin')==='507'?'&origin=507':''));
 document.getElementById('latamGoogleAccess').href='/auth/google/login?country='+encodeURIComponent(c);
 cta.href=latamSessionState==='authenticated'?'#requestForm':'#latamAccess';
 cta.setAttribute('aria-disabled',String(latamSessionState==='loading'||latamSessionState==='error'||(latamSessionState==='authenticated'&&!latamCanPrepare)));
 document.querySelectorAll('[data-latam-type]').forEach(a=>{const free=a.dataset.latamType==='PLACE'||a.dataset.latamType==='BUSINESS'&&a.dataset.latamPlan==='BUSINESS_FREE';const allowed=c==='PA'||free;a.href=allowed?cta.href:'#commercialAvailability';a.setAttribute('aria-disabled',String(!allowed||cta.getAttribute('aria-disabled')==='true'));});
}
function prepareLatamRequest(e,type,plan){
 const status=document.getElementById('latamActionStatus');
 if(latamSessionState==='guest'){e.preventDefault();const u=new URL(location.href);u.searchParams.set('selectedPlan',type==='RESIDENTIAL'?'RESIDENTIAL':type==='PLACE'?'PLACE':plan);history.replaceState({},'',u);openLatamAccess();return;}
 if(document.getElementById('commercialCountry').value!=='PA'&&!(type==='PLACE'||type==='BUSINESS'&&(plan==='BUSINESS_FREE'||plan===''))){e.preventDefault();status.textContent='Por ahora solo se aceptan solicitudes de Negocio Gratis y Lugar Gratis en este país. Los planes pagados siguen cerrados.';status.scrollIntoView({block:'center'});return;}
 e.preventDefault();
 if(new URLSearchParams(location.search).get('origin')==='507'){
  const selectedPlan=type==='RESIDENTIAL'?'RESIDENTIAL':type==='PLACE'?'PLACE':plan;
  const destination=new URL('/panel',location.origin);
  destination.searchParams.set('country','PA');
  destination.searchParams.set('origin','507');
  if(selectedPlan)destination.searchParams.set('selectedPlan',selectedPlan);
  location.assign(destination.href);
  return;
 }
 if(latamSessionState!=='authenticated'||!latamCanPrepare){status.textContent=latamSessionState==='loading'?'Verificando tu sesión…':latamSessionState==='error'?'No se pudo verificar tu sesión. Intenta actualizar.':'La preparación de solicitudes no está habilitada para esta cuenta.';return;}
 const select=document.getElementById('plan');
 if(plan&&!Array.from(select.options).some(o=>o.value===plan)){status.textContent='Este plan no está disponible para preparar en tu cuenta.';return;}
 document.getElementById('latamRequestDialog').appendChild(document.getElementById('message'));
 document.getElementById('latamRequestDialog').showModal();
 document.getElementById(type==='RESIDENTIAL'?'residential':type==='PLACE'?'place':'business').click();
 if(plan){select.value=plan;select.dispatchEvent(new Event('change'));}
 document.getElementById('formTitle').focus();
 document.getElementById('requestForm').scrollIntoView({block:'start'});
}
`;
 const accessCss=`
#latamPlanDetails{width:min(570px,calc(100vw - 24px));max-height:calc(100dvh - 28px);overflow:auto;padding:clamp(18px,4vw,30px);border:1px solid #d5e5f5;border-radius:20px;background:#fff;color:#16324d;box-shadow:0 24px 75px #0009;color-scheme:light}
#latamPlanDetails::backdrop{background:#031326bb}
#latamPlanDetails h2{font-size:clamp(22px,4vw,29px);color:#13365a;margin:0 0 12px}
#latamPlanDetails p{color:#40546b;line-height:1.55}
#latamPlanDetailsPrice{font-size:21px;font-weight:800;color:#0c5bb4!important}
#latamPlanDetailsFeatures{padding-left:23px;line-height:1.65;color:#203b54}
#latamPlanDetailsFeatures li{margin:7px 0}
#latamPlanDetails .latam-plan-detail-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:20px}
#latamPlanDetails button{min-height:46px;border-radius:11px;padding:10px 17px}
#latamPlanDetailsBack{background:#e8eef5;color:#173653}
#latamPlanDetailsContinue{background:#1269d2;color:white}

/* Premium details dialog: outer plan cards remain unchanged. */
#latamPlanDetails{border:1px solid #9bbde0;border-radius:24px;background:linear-gradient(165deg,#fff,#f2f7ff);box-shadow:0 30px 90px #001a3970;padding:clamp(22px,5vw,34px)}
#latamPlanDetails h2{font-size:clamp(26px,5vw,34px);font-weight:900;letter-spacing:-.025em;color:#15385e}
#latamPlanDetailsPrice{display:inline-block;padding:9px 16px;border-radius:13px;background:#e3efff;color:#1456a0!important;font-size:26px;font-weight:900}
#latamPlanDetailsCountry{font-weight:700;color:#516b85!important}
#latamPlanDetailsFeatures{list-style:none;padding:0;margin:20px 0;display:grid;gap:10px}
#latamPlanDetailsFeatures li{position:relative;margin:0;padding:13px 14px 13px 42px;border:1px solid #e0e9f4;border-radius:13px;background:white;color:#23405e;font-weight:600;line-height:1.5}
#latamPlanDetailsFeatures li::before{content:"✓";position:absolute;left:14px;top:12px;width:20px;height:20px;display:grid;place-items:center;border-radius:50%;background:#e0f5e9;color:#147447;font-weight:900}
#latamPlanDetailsTerms{padding:12px 14px;border-left:3px solid #79a9dc;background:#edf4fd;border-radius:0 10px 10px 0;font-size:13px}
#latamPlanDetails .latam-plan-detail-actions{display:grid;grid-template-columns:1fr 1.5fr;gap:12px;margin-top:22px}
#latamPlanDetails .latam-plan-detail-actions button{min-height:50px;border-radius:13px;padding:12px 16px;font-weight:800;font-size:15px;cursor:pointer}
#latamPlanDetailsBack{background:#e7edf5;color:#254663;border:1px solid #c8d6e6}
#latamPlanDetailsContinue{background:linear-gradient(135deg,#1878e8,#064fae);color:#fff;box-shadow:0 8px 20px #0866d144}
#latamPlanDetails .latam-plan-detail-actions button:focus-visible{outline:3px solid #7cb9ff;outline-offset:3px}
@media(max-width:440px){#latamPlanDetails .latam-plan-detail-actions{grid-template-columns:1fr}}
#latamAccess{box-sizing:border-box;width:min(440px,calc(100vw - 24px));max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px);margin:auto;padding:20px;border:1px solid #dce6ef;border-radius:18px;background:#fff;color:#18324b;box-shadow:0 20px 70px #001a3670;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable}
#latamAccess::backdrop{background:#020b16cc}
#latamAccess>form{display:flex;justify-content:flex-end;margin:0}
#latamAccess>form button{min-height:32px;padding:5px 12px;border-radius:9px;background:#eff5ff;color:#17458b;box-shadow:none;font-size:13px}
#latamAccess h2{margin:4px 0 6px;color:#102e49;font-size:23px;line-height:1.2}
#latamAccessCountry{margin:0 0 12px;font-size:13px;color:#526981;line-height:1.4}
#latamAccess label{margin:10px 0 5px;font-size:14px;font-weight:700}
#latamAccess input{display:block;width:100%;height:42px;margin:0;padding:10px 12px;border:1px solid #cad8e5;border-radius:11px;background:#fff;color:#142f46;font-size:16px;min-width:0}
#latamAccess .latam-password-row{display:flex;gap:8px;align-items:center;margin-bottom:12px}
#latamAccess .latam-password-row input{flex:1}
#latamAccess #latamTogglePassword{flex-shrink:0;min-height:42px;padding:10px;border:1px solid #cad8e5;border-radius:11px;background:#f3f7fc;color:#204668;box-shadow:none;font-size:13px}
#latamAccess #latamEmailSubmit,#latamAccess #latamGoogleAccess{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:44px;padding:11px 14px;border-radius:11px;font-size:14px;font-weight:750;line-height:1.25}
#latamAccess #latamEmailSubmit{border:0;background:#0b57d0;color:#fff}
#latamAccess #latamGoogleAccess{border:1px solid #ccd8e5;background:#fff;color:#233b54;text-decoration:none;box-shadow:none}
#latamAccess #latamPasswordNotice{margin:8px 0 0;font-size:12px;line-height:1.4;color:#526981}
#latamAccess .latam-auth-links{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:2px 14px;margin:7px 0}
#latamAccess .latam-auth-links button{min-height:32px;padding:4px 0;border:0;border-radius:4px;background:transparent;color:#0b57d0;font-size:12px;font-weight:700;box-shadow:none;transform:none}
#latamAccess .latam-auth-divider{display:flex;align-items:center;gap:12px;margin:8px 0;color:#63778c;font-size:13px}
#latamAccess .latam-auth-divider:before,#latamAccess .latam-auth-divider:after{content:'';flex:1;border-top:1px solid #dbe3eb}
/* Refined accessible account dialog, presentation-only. */
#latamAccess{width:min(470px,calc(100vw - 28px));padding:26px 28px 28px;border:1px solid #e5edf8;border-radius:24px;background:linear-gradient(180deg,#ffffff 0%,#f6faff 100%);box-shadow:0 28px 90px #0011259c,0 0 0 1px #ffffff75}
#latamAccess::backdrop{background:#030b1dd9;backdrop-filter:blur(5px)}
#latamAccess>form button{background:#edf4ff;color:#244a76;font-weight:700;border:1px solid #dae6f4;border-radius:999px;padding:6px 14px}
#latamAccess h2{font-size:27px;letter-spacing:-.035em;margin:12px 0 7px;color:#112e53}
#latamAccessCountry{display:inline-block;padding:7px 12px;margin:0 0 16px;border-radius:999px;background:#eaf4ff;color:#345a7b;font-size:13px}
#latamAccess label{color:#253e5b;font-size:14px;margin:12px 0 7px}
#latamAccess input{height:48px;border:1px solid #cbd9ea;border-radius:13px;background:#fff;box-shadow:0 1px 3px #0e376b0b;transition:border-color .15s,box-shadow .15s}
#latamAccess input:focus{outline:2px solid #61c6ee;outline-offset:1px;border-color:#198ad5;box-shadow:0 0 0 4px #1a9bf01c}
#latamAccess .latam-password-row{gap:10px}
#latamAccess #latamTogglePassword{height:48px;min-height:48px;padding:0 15px;border-radius:12px;font-weight:700}
#latamAccess #latamEmailSubmit,#latamAccess #latamGoogleAccess{min-height:49px;border-radius:13px;font-size:15px}
#latamAccess #latamEmailSubmit{background:linear-gradient(110deg,#0b57d0,#147be4);box-shadow:0 7px 18px #0b57d02b}
#latamAccess #latamGoogleAccess{background:#fff;border:1px solid #c8d6e7;color:#1d3249;box-shadow:0 2px 8px #12345610}
#latamAccess #latamGoogleAccess:hover{border-color:#8da8c8;background:#f9fcff}
#latamAccess .latam-google-logo{display:block;flex:0 0 23px}
#latamAccess #latamPasswordNotice{font-size:12px;line-height:1.5;margin:10px 0 8px}
#latamAccess .latam-auth-links{gap:6px 18px;margin:10px 0}
#latamAccess .latam-auth-links button{font-size:13px}
#latamAccess .latam-auth-divider{margin:12px 0}
@media(max-width:480px){#latamAccess{padding:19px 17px 22px;border-radius:20px;width:calc(100vw - 22px)}#latamAccess h2{font-size:23px}#latamAccess .latam-auth-links{gap:4px 12px}#latamAccess .latam-auth-links button{font-size:12px}#latamAccess #latamTogglePassword{padding:0 11px}}
/* Compact tablet/mobile access dialog without changing authentication controls. */
#latamAccess{width:min(470px,calc(100vw - 28px));padding:17px 22px 19px}
#latamAccess>form{float:right;position:relative;z-index:1;margin:0 0 0 12px}
#latamAccess>form button{min-height:30px;padding:4px 11px}
#latamAccess h2{margin:4px 0 6px;font-size:25px;line-height:1.3}
#latamAccessCountry{margin:0 0 10px;padding:5px 10px}
#latamAccess label{margin:7px 0 4px}
#latamAccess input{height:43px}
#latamAccess .latam-password-row{margin-bottom:8px}
#latamAccess #latamTogglePassword{height:43px;min-height:43px}
#latamAccess #latamEmailSubmit,#latamAccess #latamGoogleAccess{min-height:43px;padding:9px 12px}
#latamAccess #latamPasswordNotice{margin:6px 0 4px}
#latamAccess .latam-auth-links{display:flex;flex-direction:row;flex-wrap:wrap;justify-content:center;column-gap:15px;row-gap:0;margin:3px 0}
#latamAccess .latam-auth-links button{min-height:28px;padding:3px 0}
#latamAccess .latam-auth-divider{margin:4px 0}
@media(max-width:480px){#latamAccess{width:calc(100vw - 22px);padding:15px 16px 17px}#latamAccess h2{font-size:22px}#latamAccess .latam-auth-links{column-gap:10px}#latamAccess .latam-auth-links button{font-size:12px}}
/* Persistent cookie preferences must be available but unobtrusive. */
.latam-footer [data-cookie-settings]{display:inline!important;min-height:0!important;width:auto!important;padding:2px 0!important;margin:0!important;background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;color:#bed1e8!important;font:500 12px/1.5 system-ui,sans-serif!important;text-decoration:none!important}
/* Footer-only visual polish: keep all legal links clickable, but remove underlines. */
body.latam .latam-footer-inner nav[aria-label="Información y contacto"] a[href^="/legal/"],body.latam .latam-footer-inner nav[aria-label="Información y contacto"] [data-cookie-settings]{text-decoration:none!important;border-bottom:0!important}
body.latam .latam-footer-inner nav[aria-label="Información y contacto"] a[href^="/legal/"]:hover,body.latam .latam-footer-inner nav[aria-label="Información y contacto"] [data-cookie-settings]:hover{color:#fff!important}

#latamAccess #latamRegistrationTerms[hidden]{display:none!important}
/* LATAM plan cards: legibility only, no layout or business-logic changes. */
#commercialWelcome .latam-plan-card h3{color:#ffffff!important;opacity:1!important}
#commercialWelcome .latam-plan-card p{color:#e5eef9!important;opacity:1!important}
#commercialWelcome .latam-plan-card .latam-plan-price{opacity:1!important}
#commercialWelcome .latam-plan-card>span{color:#eaf5ff!important;opacity:1!important}
#commercialWelcome .latam-plan-card .plan-legal,
#commercialWelcome .latam-plan-card .plan-legal a,
#commercialWelcome .latam-plan-card a[href^="/legal/"]{color:#dceeff!important;opacity:1!important;text-decoration:underline;text-underline-offset:2px}
#commercialWelcome .latam-plan-card [class*="review"],
#commercialWelcome .latam-plan-card [class*="notice"]{color:#dce8f6!important;opacity:1!important}

/* Compact legal references below Google sign-in; account acceptance remains in registration flow. */
#latamAccess h2{font-size:clamp(25px,4vw,29px)!important;font-weight:800!important;letter-spacing:-.035em!important;line-height:1.18!important;margin:5px 0 14px!important}
#latamAccess>label[for="latamAccessEmail"],#latamAccess>label[for="latamAccessPassword"]{font-size:13px!important;font-weight:750!important;letter-spacing:.01em!important;color:#30465e!important}
#latamAccess .latam-access-legal-note{margin:10px 0 0;padding:8px 4px 0;border-top:1px solid #e3eaf3;text-align:center;color:#63758b;font-size:11px;line-height:1.55}
#latamAccess .latam-access-legal-note>span{display:block;margin-bottom:4px}
#latamAccess .latam-access-legal-note nav[aria-label="Condiciones de cuenta"]{display:flex!important;justify-content:center;flex-wrap:wrap;gap:3px 12px!important;margin:0!important;padding:0!important}
#latamAccess .latam-access-legal-note nav[aria-label="Condiciones de cuenta"] a{font-size:11px!important;line-height:1.5!important;color:#456581!important;text-decoration:none!important;font-weight:600!important;padding:2px!important;border:0!important;background:none!important}
#latamAccess .latam-access-legal-note nav[aria-label="Condiciones de cuenta"] a:hover,#latamAccess .latam-access-legal-note nav[aria-label="Condiciones de cuenta"] a:focus-visible{text-decoration:underline!important;color:#0b57a6!important}
/* Post-legal visual repair: scoped to existing dialogs, no flow changes. */
#latamAccess{padding:18px 22px 20px!important}
#latamAccess h2{font-size:23px!important;margin:4px 0 8px!important}
#latamAccess nav[aria-label="Condiciones de cuenta"]{display:flex!important;flex-wrap:wrap;gap:3px 14px;margin:0 0 8px!important;padding:0!important;align-items:center}
#latamAccess nav[aria-label="Condiciones de cuenta"] a{display:inline!important;width:auto!important;margin:0!important;padding:2px 0!important;min-height:0!important;font-size:12px!important;line-height:1.45!important;color:#154b82!important;text-decoration:underline;text-underline-offset:2px}
#latamAccess #latamRegistrationTerms:not([hidden]){display:flex!important;align-items:flex-start!important;gap:8px!important;margin:5px 0 10px!important;padding:0!important;color:#243e59!important;font-size:12px!important;line-height:1.4!important;min-height:0!important}
#latamAccess #latamRegistrationTermsAccepted{appearance:auto!important;-webkit-appearance:checkbox!important;display:block!important;flex:0 0 18px!important;width:18px!important;height:18px!important;margin:1px 0 0!important;padding:0!important;accent-color:#145cb4!important}
#latamAccess #latamRegistrationTerms span{display:block!important;color:#243e59!important;font-size:12px!important;line-height:1.4!important}
#latamAccessCountry{margin:2px 0 9px!important;padding:5px 10px!important}
#latamAccess label:not(#latamRegistrationTerms){margin:7px 0 4px!important}
#latamAccess input:not([type="checkbox"]){height:42px!important}
#latamAccess #latamTogglePassword{height:42px!important;min-height:42px!important}
#latamPlanDetails nav[aria-label],#latamPlanDetails .legal-links{font-size:13px}
#latamPlanDetails a[href^="/legal/"]{color:#164f8d!important;text-decoration:underline;text-underline-offset:2px;font-weight:650}
#latamPlanDetailsTerms{background:#f1f6fc!important;color:#28425c!important;padding:10px 12px!important;line-height:1.5!important}
@media(max-width:480px){#latamAccess{padding:15px 17px 17px!important}#latamAccess h2{font-size:21px!important}}
@media(prefers-reduced-motion:reduce){#latamAccess input{transition:none}}
#latamAccess [hidden]{display:none!important}
@media(max-width:480px),(max-height:600px){#latamAccess{padding:16px}#latamAccess h2{font-size:21px}}
`;
 return html.replace(/<footer class="account-footer">[\s\S]*?<\/footer>/,'').replaceAll('Direcciones507 · Panamá','Direcciones LATAM · Panamá').replace('<body>','<body class="latam">')
 .replace(/<header>[\s\S]*?<\/header>/,header)
 .replace('</style>',css+accessCss+homeCss+sharedVisualStyle+'</style>')
 .replace(/<footer class="card"[^>]*>[\s\S]*?<\/footer>/,footer)
 .replace('<script>',notice+`<dialog id="latamPlanDetails" aria-labelledby="latamPlanDetailsTitle"><h2 id="latamPlanDetailsTitle"></h2><p id="latamPlanDetailsPrice"></p><p id="latamPlanDetailsCountry"></p><ul id="latamPlanDetailsFeatures"></ul><p id="latamPlanDetailsTerms"></p><p id="latamPlanReviewNotice" hidden>Importante: Tu solicitud será revisada por nuestro equipo. La aprobación y publicación pueden tardar hasta 48 horas después del envío. La activación no es automática. La solicitud puede ser rechazada.</p><div class="latam-plan-detail-actions"><button type="button" id="latamPlanDetailsBack">Regresar</button><button type="button" id="latamPlanDetailsContinue">Continuar con mi dirección</button></div></dialog>`+`<dialog id="latamAccess" aria-label="Acceso a Direcciones LATAM"><form method="dialog"><button type="submit" aria-label="Cerrar acceso">Cerrar</button></form><h2>Accede a tu cuenta</h2><label id="latamRegistrationTerms" style="display:flex;gap:10px;color:#fff;font-size:14px;line-height:1.6"><input id="latamRegistrationTermsAccepted" type="checkbox" style="width:22px;height:22px;flex:none;accent-color:#3286ff"><span>${LEGAL_ACCEPTANCE_TEXT}</span></label><p id="latamAccessCountry"></p><label for="latamAccessEmail">Correo electrónico</label><input id="latamAccessEmail" type="email" required maxlength="320" autocomplete="email" placeholder="tu@correo.com"><label id="latamPasswordLabel" for="latamAccessPassword">Contraseña</label><div class="latam-password-row" id="latamPasswordRow"><input id="latamAccessPassword" type="password" autocomplete="current-password" placeholder="Contraseña" minlength="12"><button type="button" id="latamTogglePassword" aria-label="Mostrar contraseña" aria-pressed="false">Mostrar</button></div><button type="button" id="latamEmailSubmit">Crear cuenta con correo</button><p id="latamPasswordNotice" role="status">Regístrate con tu correo o continúa con Google.</p><div class="latam-auth-links"><button type="button" id="latamHaveAccount">Ya tengo una cuenta</button><button type="button" id="latamCreateAccount">Crear cuenta</button><button type="button" id="latamForgotPassword">¿Olvidaste tu contraseña?</button></div><div class="latam-auth-divider">o</div><a id="latamGoogleAccess" class="button" href="/auth/google/login"><svg class="latam-google-logo" viewBox="0 0 48 48" width="23" height="23" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.03 46.98 31.88 46.98 24.55Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.87.93 7.51 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.97 6.19C6.51 42.62 14.62 48 24 48Z"/></svg> Continuar con Google</a><div class="latam-access-legal-note"><span>Consulta nuestros documentos:</span><nav aria-label="Condiciones de cuenta">${legalLinks}</nav></div></dialog>`+'<script>')
 .replace(/<section id="login" class="card hidden">[\s\S]*?<\/section>/,'<section id="login" class="hidden" hidden><button id="google" hidden>Continuar con Google</button></section>')
 .replace('<section id="panel" class="hidden">','<dialog id="latamRequestDialog" aria-label="Preparar dirección"><button type="button" id="latamRequestClose" class="secondary">Cerrar preparación</button><section id="panel" class="hidden">')
 .replace('</section><p id="message" role="status">','</section></dialog><span id="latamMessageAnchor"></span><p id="message" role="status">')
 .replace('id="formTitle"','id="formTitle" tabindex="-1"')
 .replace('<script>','<script>'+sessionScript)
 .replace("async function load(){try{", "async function load(){latamSessionState='loading';updateLatamSession();try{")
 .replace("if(r.status===401){", "if(r.status===401){latamSessionState='guest';updateLatamSession();")
 .replace("const d=await r.json();$('login')", "const d=await r.json();latamSessionState='authenticated';latamCanPrepare=!!d.actions.prepareRequest;updateLatamSession();$('login')")
 .replace("}catch{$('panel').classList.add('hidden');$('message')", "}catch{latamSessionState='error';updateLatamSession();$('panel').classList.add('hidden');$('message')")
 .replace('</script>',`
const accessDialog=document.getElementById('latamAccess');
document.getElementById('latamGoogleAccess').addEventListener('click',event=>{if(latamEmailMode==='register'&&!prepareAccountLegalAcceptance()){event.preventDefault();return;}const p=new URLSearchParams(location.search);const plan=p.get('selectedPlan');if(plan&&['RESIDENTIAL','PLACE','BUSINESS_FREE','BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO'].includes(plan))sessionStorage.setItem('ad507PendingPlan',plan);else sessionStorage.removeItem('ad507PendingPlan');if(p.get('origin')==='507')sessionStorage.setItem('ad507EntryOrigin','507');else sessionStorage.removeItem('ad507EntryOrigin');});
function openLatamAccess(){document.getElementById('latamAccessCountry').textContent='País seleccionado: '+(document.getElementById('commercialCountry')?.selectedOptions[0]?.textContent||'Panamá');if(!accessDialog.open)accessDialog.showModal();accessDialog.scrollTop=0;document.getElementById('latamAccessEmail').focus({preventScroll:true});}
document.querySelectorAll('[data-latam-session="guest"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();openLatamAccess();}));
const legalVersion=${JSON.stringify(LEGAL_VERSION)};
let latamEmailMode='login';
function prepareAccountLegalAcceptance(){const checkbox=document.getElementById('latamRegistrationTermsAccepted');if(!checkbox.checked){checkbox.setCustomValidity('Acepta las condiciones para crear una cuenta.');checkbox.reportValidity();checkbox.focus();return false;}checkbox.setCustomValidity('');try{sessionStorage.setItem('ad507PendingLegalAcceptance',JSON.stringify({accepted:true,version:legalVersion}));}catch{}return true;}
document.getElementById('latamRegistrationTermsAccepted').onchange=event=>event.target.setCustomValidity('');
const latamEmailSubmit=document.getElementById('latamEmailSubmit');
const latamEmailNotice=document.getElementById('latamPasswordNotice');
const latamEmailPassword=document.getElementById('latamAccessPassword');
const latamEmailField=document.getElementById('latamAccessEmail');
function setLatamEmailMode(mode){
 latamEmailMode=mode;document.getElementById('latamRegistrationTerms').hidden=mode!=='register';document.getElementById('latamRegistrationTermsAccepted').checked=false;
 latamEmailSubmit.textContent=mode==='register'?'Crear cuenta con correo':mode==='login'?'Ingresar con correo':mode==='forgot'?'Enviar recuperación':mode==='verify'?'Verificar correo':'Cambiar contraseña';
 document.getElementById('latamPasswordRow').hidden=mode==='forgot'||mode==='verify';
 document.getElementById('latamPasswordLabel').hidden=mode==='forgot'||mode==='verify';
 document.getElementById('latamHaveAccount').hidden=mode==='login';
 document.getElementById('latamCreateAccount').hidden=mode==='register';
 document.getElementById('latamForgotPassword').hidden=mode==='forgot'||mode==='verify'||mode==='reset';
 latamEmailPassword.autocomplete=mode==='register'||mode==='reset'?'new-password':'current-password';
 latamEmailNotice.textContent=mode==='register'?'Utiliza una contraseña de al menos 12 caracteres. Te enviaremos un enlace de verificación.':mode==='forgot'?'Te enviaremos un enlace para recuperar tu contraseña.':mode==='verify'?'Introduce el código del enlace recibido.':mode==='reset'?'Introduce el código del enlace recibido y tu nueva contraseña.':'Introduce tu correo y contraseña.';
}
document.getElementById('latamHaveAccount').onclick=()=>setLatamEmailMode('login');
document.getElementById('latamCreateAccount').onclick=()=>setLatamEmailMode('register');
document.getElementById('latamForgotPassword').onclick=()=>setLatamEmailMode('forgot');
document.getElementById('latamTogglePassword').onclick=()=>{const visible=latamEmailPassword.type==='text';latamEmailPassword.type=visible?'password':'text';const button=document.getElementById('latamTogglePassword');button.textContent=visible?'Mostrar':'Ocultar';button.setAttribute('aria-pressed',String(!visible));button.setAttribute('aria-label',visible?'Mostrar contraseña':'Ocultar contraseña');};
latamEmailSubmit.onclick=async()=>{
 const email=latamEmailField.value.trim(),password=latamEmailPassword.value;
 const route={register:'register',login:'login',forgot:'forgot',verify:'verify',reset:'reset'}[latamEmailMode];
 const token=new URLSearchParams(location.search).get('token')||'';
 if(route==='register'&&!prepareAccountLegalAcceptance())return;
 if(!latamEmailField.checkValidity()){latamEmailField.reportValidity();return;}
 if(['register','login','reset'].includes(route)&&password.length<12){latamEmailNotice.textContent='La contraseña debe tener al menos 12 caracteres.';return;}
 latamEmailSubmit.disabled=true;latamEmailNotice.textContent='Procesando solicitud…';
 try{
  const response=await fetch('/v1/auth/email/'+route,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(route==='register'?{email,password,token,legalAcceptance:{accepted:true,version:legalVersion}}:{email,password,token})});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'No se pudo completar la solicitud.');
  if(route==='login'){const p=new URLSearchParams(location.search);const selected=p.get('selectedPlan');location.assign('/panel?country='+encodeURIComponent(document.getElementById('commercialCountry').value)+(p.get('origin')==='507'?'&origin=507':'')+(selected?'&selectedPlan='+encodeURIComponent(selected):''));return;}
  latamEmailNotice.textContent=route==='register'||route==='forgot'?'Si el correo cumple las condiciones, recibirás un mensaje con las instrucciones.':'Solicitud completada. Ya puedes ingresar.';
  if(route==='verify'||route==='reset'){setLatamEmailMode('login');latamEmailPassword.value='';history.replaceState({},'',location.pathname+'?country='+encodeURIComponent(document.getElementById('commercialCountry')?.value||'PA'));latamEmailNotice.textContent='Solicitud completada. Ya puedes ingresar.';}
 }catch(err){latamEmailNotice.textContent=err instanceof Error?err.message:'No se pudo completar la solicitud.';}
 finally{latamEmailSubmit.disabled=false;}
};
const authParams=new URLSearchParams(location.search);
if(authParams.has('token')&&authParams.has('email')){
 latamEmailField.value=authParams.get('email')||'';
 setLatamEmailMode(authParams.get('action')==='reset'||location.pathname==='/recuperar-contrasena'?'reset':'verify');
 openLatamAccess();
}else {setLatamEmailMode('login');if(authParams.get('access')==='1')openLatamAccess();}
const countrySelect=document.getElementById('commercialCountry');
const countryState=document.getElementById('latamCountryState'),countryField=document.getElementById('countryField');
countryField.appendChild(countryState);countryState.hidden=false;document.getElementById('countryCode').hidden=true;countryField.querySelector('label[for="countryCode"]').hidden=true;
const markCountry=()=>{document.querySelectorAll('[data-commercial-country]').forEach(a=>a.setAttribute('aria-current',String(a.dataset.commercialCountry===countrySelect.value)));document.querySelectorAll('[data-latam-type="PLACE"]').forEach(a=>{a.hidden=false;});updateLatamSession();};
countrySelect.addEventListener('change',markCountry);window.addEventListener('popstate',markCountry);
const menu=document.querySelector('.latam-menu'),desktop=matchMedia('(min-width:1100px)');
const syncMenu=()=>menu.open=desktop.matches;syncMenu();desktop.addEventListener('change',syncMenu);
const hero=document.getElementById('latamArt');
hero.src='https://raw.githubusercontent.com/direcciones507/direcciones507/feat/admin-ui-20261006/direcciones-latam-mapa-sin-cuadro-azul.png';
document.getElementById('latamCreate').onclick=e=>prepareLatamRequest(e,'BUSINESS','');
const latamPlanCatalog={
 PLACE:{title:'Lugar Gratis',price:'Gratis',features:['Comparte ubicaciones de interés con una dirección digital fácil de encontrar','Ideal para iglesias, parques, cascadas, ríos, playas y atractivos turísticos','No se admiten comercios ni establecimientos comerciales; deben solicitar un plan de negocio','Agrega nombre, ubicación, referencia y fotografía del lugar','Comparte el lugar mediante enlace y herramientas de navegación','Disponible en los ocho países iniciales; todas las solicitudes están sujetas a revisión y aprobación']},
 RESIDENTIAL:{title:'Residencial',price:'US$12.99',features:['Dirección digital para tu hogar','Código digital y acceso mediante enlace o QR','Ubicación y referencia para compartir','Acceso residencial privado según sus controles de seguridad']},
 BUSINESS_FREE:{title:'Negocio Gratis',price:'US$0',features:['Dirección digital de negocio y código QR','Logo, horario, contacto y referencia','Navegación para llegar al negocio','Solicitudes gratuitas hasta el 9 de noviembre de 2026; sujetas a aprobación ADMIN. Servicio gratuito hasta el 30 de diciembre de 2026, con desactivación el 31 de diciembre si no se renueva','Sin descripción breve ni código personalizado incluido']},
 BUSINESS_PREMIUM:{title:'Premium',price:'US$19.99',features:['Todo lo incluido en Negocio Gratis','Código personalizado con nombre sujeto a disponibilidad','Redes sociales y código postal o zona postal','Sin reporte mensual de estadísticas']},
 BUSINESS_PREMIUM_PRO:{title:'Premium Pro',price:'US$39.99',features:['Todo lo incluido en Premium','Descripción comercial','Galería de hasta cinco fotografías','Estadísticas avanzadas de la dirección digital','Enlace exclusivo con nombre del negocio (próximamente; ejemplo: restaurante-manuel)']}
};
let latamSelectedPlan=null;
const latamPlanDialog=document.getElementById('latamPlanDetails');
function showLatamPlanDetails(e,type,plan){
 const detailsKey=type==='RESIDENTIAL'?'RESIDENTIAL':type==='PLACE'?'PLACE':plan;
 if(!latamPlanCatalog[detailsKey]){prepareLatamRequest(e,type,plan);return;}
 e.preventDefault();
 const item=latamPlanCatalog[detailsKey],country=document.getElementById('commercialCountry');
 latamSelectedPlan={type,plan};
 document.getElementById('latamPlanDetailsTitle').textContent=item.title;
 document.getElementById('latamPlanDetailsPrice').textContent=item.price+(item.price==='Gratis'?'':' · Precio de referencia, confirmar vigencia');
 document.getElementById('latamPlanDetailsCountry').textContent='País seleccionado: '+country.options[country.selectedIndex].textContent;
 document.getElementById('latamPlanDetailsFeatures').replaceChildren(...item.features.map(feature=>{const li=document.createElement('li');li.textContent=feature;return li;}));
 document.getElementById('latamPlanDetailsTerms').textContent=detailsKey==='BUSINESS_FREE'?'Promoción Negocio Gratis en Panamá y Costa Rica: solicita hasta el 9 de noviembre de 2026. Cada solicitud requiere revisión y aprobación del administrador. El servicio gratuito de las direcciones aprobadas termina el 30 de diciembre de 2026, sin importar cuándo se aprobaron. Las no renovadas se desactivan automáticamente el 31 de diciembre de 2026. Para continuar, se requiere contratar un plan vigente y confirmar el pago. Sin descuentos ni cobros automáticos. Consultar o solicitar el plan gratuito no genera cobro.':'La disponibilidad, promociones, vigencia, renovación y medios de pago se confirman antes de contratar. La preparación no realiza ningún cobro. Las solicitudes y publicaciones internacionales siguen sujetas a habilitación por país.';
 document.getElementById('latamPlanReviewNotice').hidden=!['BUSINESS_FREE','PLACE'].includes(detailsKey);
 latamPlanDialog.showModal();latamPlanDialog.scrollTop=0;requestAnimationFrame(()=>{latamPlanDialog.scrollTop=0;});
}
document.getElementById('latamPlanDetailsBack').onclick=()=>latamPlanDialog.close();
document.getElementById('latamPlanDetailsContinue').onclick=()=>{
 if(!latamSelectedPlan)return;
 const {type,plan}=latamSelectedPlan;
 latamPlanDialog.close();
 prepareLatamRequest({preventDefault(){}},type,plan);
};

document.querySelectorAll('[data-latam-type]').forEach(a=>a.onclick=e=>{if(!e.target.closest('.plan-legal'))showLatamPlanDetails(e,a.dataset.latamType,a.dataset.latamPlan)});
const selected507Plan=new URLSearchParams(window.location.search).get('selectedPlan');
if(selected507Plan){
 const selectedCard=Array.from(document.querySelectorAll('[data-latam-type]')).find(a=>selected507Plan==='RESIDENTIAL'?a.dataset.latamType==='RESIDENTIAL':selected507Plan==='PLACE'?a.dataset.latamType==='PLACE':a.dataset.latamPlan===selected507Plan);
 if(selectedCard){pendingSelectedPlanHandoff={type:selectedCard.dataset.latamType,plan:selectedCard.dataset.latamPlan};if(latamSessionState!=='loading')updateLatamSession();}
}

document.getElementById('latamRequestDialog').addEventListener('close',()=>document.getElementById('latamMessageAnchor').after(document.getElementById('message')));
document.getElementById('latamRequestClose').onclick=()=>document.getElementById('latamRequestDialog').close();
document.getElementById('latamHelpLink').onclick=()=>document.getElementById('natalieLauncher').click();
(${bindLatamOverlays.toString()})();
markCountry();
</script>`);

}
export function latamWelcome(country:string,countries:Record<string,{name:string}>,initial:readonly string[]){
 const details:Record<string,string>={Residencial:'Ubicación y referencia para tu hogar. Acceso residencial privado.','Lugar Gratis':'Iglesias, parques, cascadas, ríos, playas y atractivos de interés. Solo Panamá y Costa Rica por ahora. Sujeto a revisión. No incluye comercios.','Negocio Gratis':'Logo, horario y contacto. Navegación y código QR.',Premium:'Todo lo incluido en Negocio Gratis, código con nombre, redes sociales, código postal, zona postal y estadísticas.','Premium Pro':'Todo lo incluido en Premium, galería de 5 fotos y estadísticas avanzadas. Enlace exclusivo con nombre: próximamente.'};
 const flag=(c:string)=>{const colors:Record<string,string[]>={CR:['#16489c','#fff','#d92235','#fff','#16489c'],CO:['#f9d526','#f9d526','#174da6','#ce253c'],GT:['#55a5d8','#fff','#55a5d8'],SV:['#1752b8','#fff','#1752b8'],HN:['#149bd7','#fff','#149bd7'],NI:['#1a62bc','#fff','#1a62bc'],MX:['#087044','#fff','#cf2536']};if(c==='PA')return '<svg viewBox="0 0 36 24" width="36" height="24"><path fill="#fff" d="M0 0h36v24H0z"/><path fill="#d82235" d="M18 0h18v12H18z"/><path fill="#1556a4" d="M0 12h18v12H0z"/><text x="9" y="10" text-anchor="middle" font-size="11" fill="#1556a4">★</text><text x="27" y="22" text-anchor="middle" font-size="11" fill="#d82235">★</text></svg>';const stripes=colors[c];const vertical=['MX','GT'].includes(c);return '<svg viewBox="0 0 36 24" width="36" height="24">'+stripes.map((color,i)=>'<rect fill="'+color+'" x="'+(vertical?i*36/stripes.length:0)+'" y="'+(vertical?0:i*24/stripes.length)+'" width="'+(vertical?36/stripes.length:36)+'" height="'+(vertical?24:24/stripes.length)+'"/>').join('')+'</svg>';};
 const card=(c:string)=>`<a href="?country=${c}" data-commercial-country="${c}" aria-current="${c===country}"><span class="flag" aria-hidden="true">${flag(c)}</span>${countries[c].name}<small>${c==='PA'?'Direcciones507':'En preparación'}</small></a>`;
 return `<section id="commercialWelcome"><div class="latam-hero" id="inicio"><div class="latam-copy"><h1>Crea tu<br><span class="latam-title-line">Dirección Digital</span></h1><p>Comparte un solo enlace o código QR y facilita que te encuentren. Funciona con Google Maps, Waze, Uber y WhatsApp.</p><a id="latamCreate" class="button latam-cta" href="/auth/google/login">Crear mi Dirección <span aria-hidden="true">→</span></a></div><img id="latamArt" class="latam-art" alt="" width="2400" height="1400"></div><section id="paises" aria-label="Selección de país"><div class="latam-country-label">Elige tu país</div><div class="latam-country-grid">${['PA','CR','CO','MX'].map(card).join('')}</div><details class="latam-secondary-countries"><summary>Más países</summary><div class="latam-country-grid">${initial.filter(c=>!['PA','CR','CO','MX'].includes(c)).map(card).join('')}</div></details><div id="latamCountryState" hidden><label for="commercialCountry">País seleccionado</label><select id="commercialCountry">${initial.map(c=>`<option value="${c}"${c===country?' selected':''}>${countries[c].name}</option>`).join('')}</select></div><p id="commercialIdentity">${'Direcciones LATAM · '+countries[country].name}</p><p id="commercialAvailability" role="status"></p><p id="latamActionStatus" role="status"></p></section><section class="latam-benefits"><h2>¿Por qué usar Direcciones LATAM?</h2><div class="latam-benefit-grid"><article class="latam-benefit-green"><span class="latam-benefit-icon"><svg class="symbol" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 9h8M8 13h5M15 16l2 2 3-3"/></svg></span><h3>Un solo enlace</h3><p>Comparte toda tu información de contacto y ubicación en un solo lugar.</p></article><article class="latam-benefit-purple"><span class="latam-benefit-icon"><svg class="symbol" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s-7-6.3-7-12a7 7 0 1 1 14 0c0 5.7-7 12-7 12Z"/><circle cx="12" cy="10" r="2.5"/></svg></span><h3>Llegan más fácil</h3><p>Guía a tus clientes, amigos o repartidores hasta tu ubicación.</p></article><article class="latam-benefit-gold"><span class="latam-benefit-icon"><svg class="symbol" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM21 14v3M18 21h3M14 21v-2"/></svg></span><h3>QR listo para imprimir</h3><p>Usa tu código QR en tarjetas, redes, sitios web y más.</p></article></div></section><section id="planes" class="latam-info"><h2>Servicios y planes</h2><div class="latam-plan-grid">${[
 ['Residencial','RESIDENTIAL',''],['Lugar Gratis','PLACE',''],['Negocio Gratis','BUSINESS','BUSINESS_FREE'],['Premium','BUSINESS','BUSINESS_PREMIUM'],['Premium Pro','BUSINESS','BUSINESS_PREMIUM_PRO'],
].map(([name,type,plan])=>`<article class="latam-plan-card" ${type==='PLACE'&&!['PA','CR'].includes(country)?'hidden':''} data-latam-type="${type}" data-latam-plan="${plan}"><a class="latam-plan-action" href="/auth/google/login"><div class="latam-plan-top"><span class="latam-plan-icon" aria-hidden="true">${({"Residencial":"<svg width=\"28\" height=\"28\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"m3 11 9-8 9 8\"/><path d=\"M5 10v11h14V10M9 21v-7h6v7\"/></svg>","Lugar Gratis":"<svg width=\"28\" height=\"28\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 22s-7-6.3-7-12a7 7 0 1 1 14 0c0 5.7-7 12-7 12Z\"/><circle cx=\"12\" cy=\"10\" r=\"2.5\"/></svg>","Negocio Gratis":"<svg width=\"28\" height=\"28\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M3 10h18l-2-6H5l-2 6ZM5 10v11h14V10M9 21v-7h6v7\"/></svg>","Premium":"<svg width=\"28\" height=\"28\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"m12 2 3 6 7 .9-5 4.8 1.2 7-6.2-3.3-6.2 3.3 1.2-7-5-4.8L9 8z\"/></svg>","Premium Pro":"<svg width=\"28\" height=\"28\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"m2 9 4 3 6-8 6 8 4-3-2 11H4L2 9Z\"/><path d=\"M7 16h10\"/></svg>"})[name]}</span><span class="latam-plan-label">${({Residencial:"Hogar","Lugar Gratis":"Sitios de interés","Negocio Gratis":"Para comenzar",Premium:"Más herramientas","Premium Pro":"Mayor presencia"})[name]}</span></div><h3>${name}</h3><div class="latam-plan-price" aria-label="Precio del plan">${({Residencial:"$12.99","Lugar Gratis":"GRATIS","Negocio Gratis":"GRATIS",Premium:"$19.99","Premium Pro":"$39.99"})[name]}</div><p>${details[name]}</p><span>Elegir plan <span aria-hidden="true">→</span></span></a>${['PLACE','BUSINESS_FREE'].includes(type==='PLACE'?'PLACE':plan)?'<p class="plan-review-notice" style="font-size:13px;color:#eef6ff">Revisión administrativa de hasta 48 horas después del envío; aprobación no garantizada.</p>':''}</article>`).join('')}</div><p class="latam-availability">Los servicios están sujetos a la disponibilidad de cada país. Los demás países están en preparación.</p></section><section id="ayuda" class="latam-info latam-help-strip"><div class="latam-help-heading"><span class="latam-help-icon" aria-hidden="true">✦</span><h2>Ayuda</h2></div><p><strong>¿Necesitas orientación?</strong> Abre Natalie desde Ayuda en el menú o desde su botón flotante.</p></section></section>`;
}

/** Visual lifecycle only: reuse the current launcher and close handlers. */
export function bindLatamOverlays(){
 const panel=document.getElementById('natalieChat'),launcher=document.getElementById('natalieLauncher'),close=document.getElementById('natalieClose');

 document.addEventListener('pointerdown',event=>{const target=event.target as Node|null;if(panel?.classList.contains('open')&&target&&!panel.contains(target)&&!launcher?.contains(target))close?.click();});
 const legal=document.getElementById('modalPoliticas');
 const hide=()=>{if(legal)legal.style.display='none';};
 legal?.querySelector('[data-legal-close]')?.addEventListener('click',hide);
 document.querySelectorAll('[data-latam-legal]').forEach(button=>button.addEventListener('click',()=>{const key=button.getAttribute('data-latam-legal');if(['terms','privacy','commercial','cookies'].includes(key))location.assign('/legal/'+key);}));
 legal?.addEventListener('pointerdown',event=>{if(event.target===legal)hide();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape')hide();});
}
