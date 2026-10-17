import {mkdirSync,writeFileSync} from 'node:fs';
import {legalDocumentHtml,handleLegalRoutes,LEGAL_VERSION} from '../legal';
// One renderer for the static Pages host, shared Core, immutable versions and review evidence.
const root=new URL('../../../',import.meta.url);
for(const key of ['terms','privacy','commercial','cookies']){
 const html=legalDocumentHtml(key)!;
 for(const path of ['legal/'+key+'/','legal/'+LEGAL_VERSION+'/'+key+'/','docs/legal/evidencia/']){
  const directory=new URL(path,root);mkdirSync(directory,{recursive:true});writeFileSync(new URL(path.startsWith('docs/')?key+'.html':'index.html',directory),html);
 }
}
const versions=new URL('legal/versions/',root);mkdirSync(versions,{recursive:true});
writeFileSync(new URL('index.html',versions),await handleLegalRoutes(new Request('https://direcciones.lat/legal/versions'))!.text());
console.log('Four complete policies generated for static and shared hosts; no deployment performed.');
