import {mkdirSync,writeFileSync} from 'node:fs';
import {legalReviewHtml} from '../legal';
const output=new URL('../../../docs/legal/evidencia/',import.meta.url);
mkdirSync(output,{recursive:true});
for(const key of ['terms','privacy','commercial','cookies'])writeFileSync(new URL(key+'.html',output),legalReviewHtml(key)!);
console.log('Four internal review previews written; no public policy activated.');
