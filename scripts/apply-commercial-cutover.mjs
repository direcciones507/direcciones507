// Optional single-code overlay in the maintained Pages build. No manifest => no change.
import { existsSync, readFileSync, mkdirSync, writeFileSync, realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
export function applyCommercialCutover(root, output) {
  const manifest=resolve(root,'commercial-cutover.json');if(!existsSync(manifest))return false;
  const m=JSON.parse(readFileSync(manifest,'utf8'));
  if(m.version!==1||!/^AD507-[A-Z0-9_-]+$/.test(m.code)||!/^[a-f0-9-]{36}$/.test(m.id)||!/^[a-f0-9]{64}$/.test(m.snapshotHash)||!/^[a-f0-9]{64}$/.test(m.htmlSha256)||m.htmlPath!=='commercial-cutovers/'+m.code+'.html')throw Error('INVALID_CUTOVER_MANIFEST');
  const input=realpathSync(resolve(root,m.htmlPath)),base=realpathSync(root)+sep;if(!input.startsWith(base))throw Error('INVALID_CUTOVER_PATH');
  const html=readFileSync(input,'utf8');if(Buffer.byteLength(html)>512000||createHash('sha256').update(html).digest('hex')!==m.htmlSha256||!html.includes('<!-- AD507-CUTOVER:'+m.id+':'+m.snapshotHash+' -->')||!html.includes('https://direcciones507.com/'+m.code.toLowerCase()+'/'))throw Error('INVALID_CUTOVER_ARTIFACT');
  // Retain the legacy record for fallback/rollback; never remove a code from Excel here.
  for(const code of [m.code,m.code.toLowerCase()]){const target=resolve(output,code);if(!existsSync(resolve(target,'index.html')))throw Error('LEGACY_PAGE_REQUIRED');}
  for(const code of [m.code,m.code.toLowerCase()])writeFileSync(resolve(output,code,'index.html'),html);
  return true;
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname))applyCommercialCutover(process.cwd(),resolve('out'));
