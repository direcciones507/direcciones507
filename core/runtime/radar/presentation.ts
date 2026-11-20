import {readFileSync} from 'node:fs';
import sharp from 'sharp';
const uiRoot=new URL('./ui/',import.meta.url);
const assets=new Set(['favicon.svg','vendor/manrope.woff','vendor/inter.woff','radar.css','radar.js','ui-model.js','registration-form.js','commercial-details.js','motion.js','raster-map.js','vendor/leaflet.js','vendor/leaflet.css','vendor/maplibre-gl.css','vendor/maplibre-gl.mjs','vendor/maplibre-gl-shared.mjs','vendor/maplibre-gl-worker.mjs','vendor/gsap.min.js','vendor/ScrollTrigger.min.js','vendor/three.module.min.js','vendor/three.core.min.js']);
// Fixed artwork, never generated from request data. Reuse encoded assets in memory.
const socialArtwork="<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1200\" height=\"630\" viewBox=\"0 0 1200 630\"><defs><linearGradient id=\"bg\" x2=\"1\" y2=\"1\"><stop stop-color=\"#07111f\"/><stop offset=\"1\" stop-color=\"#162e49\"/></linearGradient><linearGradient id=\"metal\"><stop stop-color=\"#91add0\"/><stop offset=\".5\" stop-color=\"#e1ecfa\"/><stop offset=\"1\" stop-color=\"#7797bd\"/></linearGradient></defs><rect width=\"1200\" height=\"630\" fill=\"url(#bg)\"/><g transform=\"translate(910 315)\" fill=\"none\" stroke=\"#7797bd\"><circle r=\"230\" stroke-opacity=\".22\"/><circle r=\"190\" stroke-width=\"2\"/><circle r=\"140\" stroke-opacity=\".65\"/><circle r=\"90\" stroke-opacity=\".65\"/><path d=\"M-190 0H190M0-190V190\" stroke-opacity=\".23\"/><path d=\"M0 0 145-122 A190 190 0 0 1 187 33Z\" fill=\"#6b9cd3\" stroke=\"none\" opacity=\".2\"/><path d=\"M0 0 145-122\" stroke=\"#d4e2f2\" stroke-width=\"3\"/><g fill=\"#d4e2f2\" stroke=\"none\"><circle cx=\"-93\" cy=\"-110\" r=\"8\"/><circle cx=\"105\" cy=\"78\" r=\"10\"/><circle cx=\"-112\" cy=\"80\" r=\"6\"/></g><path d=\"M0 42S-25 15-25-4a25 25 0 0 1 50 0C25 15 0 42 0 42Z\" fill=\"#0e2640\" stroke=\"url(#metal)\" stroke-width=\"3\"/><circle cy=\"-4\" r=\"8\" fill=\"#d4e2f2\"/></g><g font-family=\"sans-serif\" fill=\"#edf4ff\"><text x=\"76\" y=\"147\" font-size=\"66\" font-weight=\"bold\">radar</text><text x=\"80\" y=\"191\" font-size=\"21\" letter-spacing=\"2\" fill=\"#aac2e0\">POR DIRECCIONES LATAM · 507</text><text x=\"76\" y=\"308\" font-size=\"64\" font-weight=\"bold\">Tu ciudad.</text><text x=\"76\" y=\"380\" font-size=\"64\" font-weight=\"bold\" fill=\"#a8c5ec\">En tiempo real.</text><text x=\"80\" y=\"456\" font-size=\"27\" fill=\"#d4e2f2\">Descubre establecimientos y su actividad.</text><text x=\"80\" y=\"553\" font-size=\"24\" fill=\"#a8c5ec\">radar.direcciones.lat</text></g><path d=\"M80 502H600\" stroke=\"#6e8db4\" stroke-opacity=\".55\"/></svg>";
const pngAssets=new Map<string,Promise<Buffer>>();
function radarPng(asset:string){
 let pending=pngAssets.get(asset);
 if(!pending){
  pending=(asset==='share.png'?sharp(Buffer.from(socialArtwork)):sharp(readFileSync(new URL('favicon.svg',uiRoot))).resize(180,180)).png().toBuffer();
  pngAssets.set(asset,pending);
  pending.catch(()=>{if(pngAssets.get(asset)===pending)pngAssets.delete(asset);});
 }
 return pending;
}
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
 if(asset==='share.png'||asset==='apple-touch-icon.png'){const body=req.method==='HEAD'?null:new Uint8Array(await radarPng(asset));return new Response(body,{headers:{...headers('image/png',tiles),'cache-control':'public, max-age=86400'}});}
 if(asset!==null){if(!assets.has(asset))return new Response(null,{status:404});const type=asset.endsWith('.svg')?'image/svg+xml':asset.endsWith('.woff')?'font/woff':asset.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8';return new Response(req.method==='HEAD'?null:readFileSync(new URL(asset,uiRoot)),{headers:headers(type,tiles)});}
 if(account)return new Response(null,{status:302,headers:{location:'https://direcciones.lat/auth/radar','cache-control':'no-store','referrer-policy':'no-referrer'}});
 const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
 const html=readFileSync(new URL('index.html',uiRoot),'utf8').replace('</head>',`<meta name="radar-tiles" content="${escape(tiles)}"><meta name="radar-anonymous-reports" content="${env.RADAR_ANONYMOUS_REPORTS_ENABLED==='true'}"><meta name="radar-activity-validation" content="${env.RADAR_ACTIVITY_VALIDATION_ENABLED==='true'}"><meta name="radar-favorites" content="${env.RADAR_FAVORITES_ENABLED==='true'}"><meta name="radar-contributions" content="${env.RADAR_CONTRIBUTIONS_ENABLED==='true'}"><meta name="radar-reputation" content="${env.RADAR_REPUTATION_ENABLED==='true'}"><meta name="radar-alerts" content="${env.RADAR_ALERTS_ENABLED==='true'&&env.RADAR_FAVORITES_ENABLED==='true'}"><meta name="radar-registration-profiles" content="${env.RADAR_REGISTRATION_PROFILES_ENABLED==='true'&&env.RADAR_OWNERSHIP_ENABLED==='true'&&env.RADAR_BUSINESS_DETAILS_ENABLED==='true'}"></head>`);
 return new Response(req.method==='HEAD'?null:html,{headers:headers('text/html; charset=utf-8',tiles)});
}

