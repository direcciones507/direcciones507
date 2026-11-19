import {readFileSync} from 'node:fs';
const uiRoot=new URL('./ui/',import.meta.url);
const assets=new Set(['vendor/manrope.woff','vendor/inter.woff','radar.css','radar.js','ui-model.js','motion.js','raster-map.js','vendor/leaflet.js','vendor/leaflet.css','vendor/maplibre-gl.css','vendor/maplibre-gl.mjs','vendor/maplibre-gl-shared.mjs','vendor/maplibre-gl-worker.mjs','vendor/gsap.min.js','vendor/ScrollTrigger.min.js','vendor/three.module.min.js','vendor/three.core.min.js']);
function tileUrl(env:Record<string,string|undefined>){
 const fallback='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
 try{const raw=env.RADAR_TILE_URL||fallback;const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password&&['{z}','{x}','{y}'].every(p=>raw.includes(p))?raw:fallback;}catch{return fallback;}
}
function headers(type:string,tiles:string){return {'content-type':type,'cache-control':'no-cache','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','x-robots-tag':'noindex, nofollow','content-security-policy':`default-src 'self'; font-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: ${new URL(tiles).origin}; connect-src 'self' ${new URL(tiles).origin}; worker-src 'self' blob:; frame-src 'self'; frame-ancestors 'self'; base-uri 'none'; object-src 'none'`};}
export async function radarPresentation(req:Request,env:Record<string,string|undefined>):Promise<Response|null>{
 const url=new URL(req.url),root=['/','/radar','/radar/'].includes(url.pathname),account=url.pathname==='/radar/account';
 const asset=url.pathname.startsWith('/radar/ui/')?url.pathname.slice(10):null;
 if(!root&&!account&&asset===null)return null;
 if(env.RADAR_ENABLED!=='true')return new Response('Radar no está habilitado.',{status:503,headers:{'cache-control':'no-store'}});
 if(req.method!=='GET'&&req.method!=='HEAD')return new Response(null,{status:405,headers:{allow:'GET, HEAD'}});
 const tiles=tileUrl(env);
 if(asset!==null){if(!assets.has(asset))return new Response(null,{status:404});const type=asset.endsWith('.woff')?'font/woff':asset.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8';return new Response(req.method==='HEAD'?null:readFileSync(new URL(asset,uiRoot)),{headers:headers(type,tiles)});}
 if(account){
  // Reuse the actual shared LATAM card, fields, legal acceptance, Google/email and recovery scripts.
  // The surrounding commercial page stays in its source DOM for those scripts, hidden in this embedded entry.
  const {commercialEntryHtml}=await import('../user-panel');
  let html=commercialEntryHtml(true,new URL('https://direcciones.lat/?access=1'));
  html=html.replace('</head>',`<style>body>header,body>main,body>footer,#natalieLauncher,#modalPoliticas{display:none!important}body{background:#071321!important}#latamAccess{width:calc(100% - 20px)!important;max-width:500px!important;max-height:calc(100dvh - 20px)!important;margin:auto!important}#latamAccess::backdrop{background:transparent!important}</style></head>`);
  // OAuth must navigate the top-level tab; Google does not allow sign-in inside an iframe.
  const nonce=crypto.randomUUID().replaceAll('-','');
  html=html.replace('</body>',`<script>document.getElementById('latamGoogleAccess')?.setAttribute('target','_top');</script></body>`).replaceAll('<script>','<script nonce="'+nonce+'">');
  return new Response(req.method==='HEAD'?null:html,{headers:{...headers('text/html; charset=utf-8',tiles),'cache-control':'no-store','content-security-policy':`default-src 'self'; font-src 'self'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'none'; object-src 'none'`}});
 }
 const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
 const html=readFileSync(new URL('index.html',uiRoot),'utf8').replace('</head>',`<meta name="radar-tiles" content="${escape(tiles)}"><meta name="radar-anonymous-reports" content="${env.RADAR_ANONYMOUS_REPORTS_ENABLED==='true'}"><meta name="radar-activity-validation" content="${env.RADAR_ACTIVITY_VALIDATION_ENABLED==='true'}"></head>`);
 return new Response(req.method==='HEAD'?null:html,{headers:headers('text/html; charset=utf-8',tiles)});
}
