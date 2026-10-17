import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import documents from './legal-content.json';
export const LEGAL_VERSION='1.0-20261017';
// Compatibility export for in-flight clients; it now identifies the complete policy set.
export const LEGAL_REVIEW_VERSION=LEGAL_VERSION;
export const LEGAL_ACCEPTANCE_TEXT='He leído y acepto los Términos y Condiciones y la Política Comercial, y autorizo el tratamiento de mis datos para las finalidades del servicio descritas en la Política de Privacidad. Conozco la Política de Cookies; las cookies opcionales no son condición del servicio. Declaro tener al menos 18 años.';
export const LEGAL_CONTENT_HASH=createHash('sha256').update(documents.map(d=>d.sha256).join('\n')).digest('hex');
export const legalLinks=documents.map(({key,title})=>`<a href="/legal/${key}" target="_blank" rel="noopener" style="color:#9dd4ff;text-decoration:underline;font-weight:700;margin-inline-end:8px">${title}</a>`).join(' ');
export const cookieConsentSource=readFileSync(new URL('../../assets/legal-consent.js',import.meta.url),'utf8');
export const cookieConsentHtml='<script>'+cookieConsentSource+'</script>';
// Validate the published bundle, rather than relying on a global deployment switch.
export function requireLegalAcceptance(raw:unknown){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('INVALID_LEGAL_ACCEPTANCE');
 const a=(raw as any).legalAcceptance;
 if(!a||a.accepted!==true||a.version!==LEGAL_VERSION)throw Error('INVALID_LEGAL_ACCEPTANCE');
 return {version:LEGAL_VERSION,contentHash:LEGAL_CONTENT_HASH,text:LEGAL_ACCEPTANCE_TEXT,acceptedAt:new Date().toISOString()};
}
const escape=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function legalDocumentHtml(key:string){
 const doc=documents.find(doc=>doc.key===key);if(!doc)return null;
 if(doc.version!==LEGAL_VERSION||/\{\{|debe verificarse antes|REVISIÓN INTERNA|NO PUBLICAR/.test(doc.text)||createHash('sha256').update(doc.text).digest('hex')!==doc.sha256)throw Error('INVALID_LEGAL_BUNDLE');
 const body=doc.text.trim().split(/\n\n+/).map(p=>{const lines=p.split('\n');if(/^\d+\.\s/.test(lines[0])||lines[0]==='Anexo de países')return '<section><h2>'+escape(lines.shift()!)+'</h2>'+ (lines.length?'<p>'+escape(lines.join(' '))+'</p>':'')+'</section>';if(p.startsWith('- '))return '<ul>'+lines.filter(Boolean).map(l=>'<li>'+escape(l.replace(/^- /,''))+'</li>').join('')+'</ul>';return '<p>'+escape(p.replace(/\n/g,' '))+'</p>';}).join('\n');
 return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${doc.title} | Direcciones 507/LATAM</title><style>*{box-sizing:border-box}body{margin:0;background:#f3f6fb;color:#172b45;font:17px/1.7 system-ui}main{max-width:900px;margin:auto;padding:clamp(16px,4vw,32px)}article{overflow-wrap:anywhere;background:white;padding:clamp(18px,4vw,40px);border:1px solid #d4dfed;border-radius:14px}nav{display:flex;gap:12px;flex-wrap:wrap;margin:18px 0}a,button{color:#064c94;font:inherit}nav a{color:#064c94!important;min-height:44px;padding:8px}nav[aria-label="Documentos legales"]{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}h1{font-size:clamp(27px,5vw,38px);line-height:1.25}h2{font-size:clamp(21px,4vw,27px);line-height:1.35}section{scroll-margin-top:20px}button{min-height:44px;cursor:pointer}a:focus-visible,button:focus-visible{outline:3px solid #3579bd;outline-offset:3px}</style></head><body><main><header><a href="/">Direcciones 507/LATAM</a><h1>${doc.title}</h1><p>Versión ${LEGAL_VERSION}. Vigencia desde su publicación autorizada.</p><nav aria-label="Documentos legales">${legalLinks}</nav></header><article>${body}</article><footer><nav><a href="/legal/versions">Historial de versiones</a><button type="button" data-cookie-settings>Configurar cookies</button></nav></footer></main>${cookieConsentHtml}</body></html>`;
}
export const legalReviewHtml=legalDocumentHtml;
export function handleLegalRoutes(req:Request){
 const path=new URL(req.url).pathname;
 if(path==='/assets/legal-consent.js')return new Response(req.method==='HEAD'?null:cookieConsentSource,{headers:{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache','x-content-type-options':'nosniff'}});
 const history=/^\/legal\/versions\/?$/.test(path);
 const match=path.match(/^\/legal\/(?:1\.0-20261017\/)?(terms|privacy|commercial|cookies)\/?$/);
 if(!match&&!history)return null;
 if(!['GET','HEAD'].includes(req.method))return new Response(null,{status:405,headers:{allow:'GET, HEAD'}});
 const html=history?'<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Versiones legales</title><h1>Direcciones 507/LATAM — Versiones legales</h1><p>Versión '+LEGAL_VERSION+'. Vigencia desde la publicación autorizada de esta versión.</p>'+legalLinks+'</html>':legalDocumentHtml(match![1]);
 return new Response(req.method==='HEAD'?null:html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-cache','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com; img-src 'self' data: https://*.google-analytics.com; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",'x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
}
