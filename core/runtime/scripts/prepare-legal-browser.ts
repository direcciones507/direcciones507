import {mkdirSync,writeFileSync} from 'node:fs';
import {commercialEntryHtml,userPanelPresentation} from '../user-panel';
const dir=new URL('../../../.legal-browser-fixtures/',import.meta.url);mkdirSync(dir,{recursive:true});
writeFileSync(new URL('latam.html',dir),commercialEntryHtml(true,new URL('https://direcciones.lat/')));
writeFileSync(new URL('panel.html',dir),userPanelPresentation(new URL('https://direcciones.lat/panel')));

await (await import('sharp')).default({create:{width:12,height:12,channels:3,background:'blue'}}).png().toFile(new URL('fixture.png',dir).pathname);
