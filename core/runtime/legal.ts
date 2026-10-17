import documents from './legal-content.json';
export const LEGAL_REVIEW_VERSION='2026-10-17-review.1';
export const LEGAL_PUBLISHABLE=false;
export const LEGAL_ACCEPTANCE_TEXT='He leído y acepto los Términos y Condiciones y la Política Comercial, y declaro haber leído la Política de Privacidad y la Política de Cookies. Las cookies opcionales no son condición del servicio.';
export const legalLinks=documents.map(({key,title})=>`<a href="/legal/${key}" target="_blank" rel="noopener" style="color:#9dd4ff;text-decoration:underline;font-weight:700">${title}</a>`).join(' · ');
export function requireLegalAcceptance(raw:unknown,publishable:boolean=LEGAL_PUBLISHABLE){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('INVALID_LEGAL_ACCEPTANCE');
 const a=(raw as any).legalAcceptance;
 if(!a||a.accepted!==true||a.version!==LEGAL_REVIEW_VERSION)throw Error('INVALID_LEGAL_ACCEPTANCE');
 if(!publishable)throw Error('LEGAL_DOCUMENTS_NOT_READY');
 return {version:LEGAL_REVIEW_VERSION,text:LEGAL_ACCEPTANCE_TEXT,acceptedAt:new Date().toISOString()};
}
const escape=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function legalReviewHtml(key:string){
 const doc=documents.find(doc=>doc.key===key);if(!doc)return null;
 return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${doc.title} | Direcciones 507/LATAM</title><style>body{margin:0;background:#f3f6fb;color:#172b45;font:17px/1.7 system-ui}main{max-width:850px;margin:auto;padding:24px}aside{padding:18px;background:#fff0cd;border:2px solid #996b00;border-radius:12px;color:#483300}article{white-space:pre-wrap;overflow-wrap:anywhere;background:white;padding:clamp(16px,4vw,36px);margin-top:20px;border-radius:12px}h1{font-size:clamp(26px,5vw,36px)}</style><main><h1>${doc.title}</h1><aside><strong>Revisión interna — no vigente.</strong> Faltan datos verificables y aprobación. No admite contratación ni aceptación válida. Referencia ${LEGAL_REVIEW_VERSION}.</aside><article>${escape(doc.text)}</article></main></html>`;
}
export function handleLegalRoutes(req:Request){
 if(!/^\/legal\/(terms|privacy|commercial|cookies)\/?$/.test(new URL(req.url).pathname))return null;
 if(!['GET','HEAD'].includes(req.method))return new Response(null,{status:405,headers:{allow:'GET, HEAD'}});
 return new Response(req.method==='HEAD'?null:'Documentación legal pendiente de validación. Contratación no habilitada por esta revisión.',{status:503,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow','x-content-type-options':'nosniff'}});
}
