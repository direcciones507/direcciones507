import {mkdirSync,writeFileSync} from 'node:fs';
import {commercialEntryHtml,userPanelPresentation} from '../user-panel';
const dir=new URL('../../../.legal-browser-fixtures/',import.meta.url);mkdirSync(dir,{recursive:true});
writeFileSync(new URL('latam.html',dir),commercialEntryHtml(true,new URL('https://direcciones.lat/')));
writeFileSync(new URL('panel.html',dir),userPanelPresentation(new URL('https://direcciones.lat/panel')));

await (await import('sharp')).default({create:{width:12,height:12,channels:3,background:'blue'}}).png().toFile(new URL('fixture.png',dir).pathname);

writeFileSync(new URL('panel507.html',dir),userPanelPresentation(new URL('https://direcciones507.com/panel')));

const {renderNewPublicAddress}=await import('../new-address-publication');
writeFileSync(new URL('analytics-public.html',dir),renderNewPublicAddress({type:'BUSINESS',name:'Ficha de prueba aislada',url:'https://direcciones.lat/AD507-STATS-PUBLIC/',code:'AD507-STATS-PUBLIC',socials:[],media:[],coordinates:{latitude:8,longitude:-80},phone:'50760000000',plan:{name:'Premium Pro',code:'BUSINESS_PREMIUM_PRO'},extras:{countryCode:'PA',historical:false,postalCode:null}} as any));
