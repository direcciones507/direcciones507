import {readFileSync} from 'node:fs';
import sharp from 'sharp';
import {territoryFieldLabels} from '../territory-directory';
const uiRoot=new URL('./ui/',import.meta.url);
const assets=new Set(['favicon.svg','vendor/manrope.woff','vendor/inter.woff','radar.css','radar-visual-v1.css','radar.js','ui-model.js','territory-catalog.js','registration-form.js','commercial-details.js','motion.js','raster-map.js','vendor/leaflet.js','vendor/leaflet.css','vendor/maplibre-gl.css','vendor/maplibre-gl.mjs','vendor/maplibre-gl-shared.mjs','vendor/maplibre-gl-worker.mjs','vendor/gsap.min.js','vendor/ScrollTrigger.min.js','vendor/three.module.min.js','vendor/three.core.min.js']);
// Fixed artwork, never generated from request data. Reuse encoded assets in memory.
const pngAssets=new Map<string,Promise<Buffer>>();
function radarPng(asset:string){
 let pending=pngAssets.get(asset);
 if(!pending){
  pending=asset==='share.png'?Promise.resolve(readFileSync(new URL('share.png',uiRoot))):sharp(readFileSync(new URL('favicon.svg',uiRoot))).resize(180,180).png().toBuffer();
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
 const robots=url.pathname==='/robots.txt',sitemap=url.pathname==='/sitemap.xml';
 if(!root&&!account&&!robots&&!sitemap&&asset===null)return null;
 if(env.RADAR_ENABLED!=='true')return new Response('Radar no está habilitado.',{status:503,headers:{'cache-control':'no-store'}});
 if(req.method!=='GET'&&req.method!=='HEAD')return new Response(null,{status:405,headers:{allow:'GET, HEAD'}});
 const tiles=tileUrl(env);
 // Public search exposure is an explicit release decision, off by default.
 const indexing=env.RADAR_INDEXING_ENABLED==='true';
 if(robots){
  const body='User-agent: *\nDisallow: /v1/\nDisallow: /auth/\nDisallow: /radar/account\nDisallow: /panel\nDisallow: /admin\n'+(indexing?'Sitemap: https://radar.direcciones.lat/sitemap.xml\n':'');
  return new Response(req.method==='HEAD'?null:body,{headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-cache','x-content-type-options':'nosniff'}});
 }
 if(sitemap){
  if(!indexing)return new Response(null,{status:404,headers:{'cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});
  const body='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://radar.direcciones.lat/</loc></url></urlset>';
  return new Response(req.method==='HEAD'?null:body,{headers:{'content-type':'application/xml; charset=utf-8','cache-control':'no-cache','x-content-type-options':'nosniff'}});
 }
 if(asset==='share.png'||asset==='apple-touch-icon.png'){const body=req.method==='HEAD'?null:new Uint8Array(await radarPng(asset));return new Response(body,{headers:{...headers('image/png',tiles),'cache-control':'public, max-age=86400'}});}
 if(asset!==null){if(!assets.has(asset))return new Response(null,{status:404});const type=asset.endsWith('.svg')?'image/svg+xml':asset.endsWith('.woff')?'font/woff':asset.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8';return new Response(req.method==='HEAD'?null:readFileSync(new URL(asset,uiRoot)),{headers:headers(type,tiles)});}
 if(account)return new Response(null,{status:302,headers:{location:'https://direcciones.lat/auth/radar','cache-control':'no-store','referrer-policy':'no-referrer','x-robots-tag':'noindex, nofollow'}});
 const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
 const html=readFileSync(new URL('index.html',uiRoot),'utf8').replace('</head>',`<meta name="radar-tiles" content="${escape(tiles)}"><meta name="radar-territory-labels" content="${escape(JSON.stringify(territoryFieldLabels()))}"><meta name="radar-anonymous-reports" content="${env.RADAR_ANONYMOUS_REPORTS_ENABLED==='true'}"><meta name="radar-activity-validation" content="${env.RADAR_ACTIVITY_VALIDATION_ENABLED==='true'}"><meta name="radar-favorites" content="${env.RADAR_FAVORITES_ENABLED==='true'}"><meta name="radar-contributions" content="${env.RADAR_CONTRIBUTIONS_ENABLED==='true'}"><meta name="radar-reputation" content="${env.RADAR_REPUTATION_ENABLED==='true'}"><meta name="radar-alerts" content="${env.RADAR_ALERTS_ENABLED==='true'&&env.RADAR_FAVORITES_ENABLED==='true'}"><meta name="radar-registration-profiles" content="${env.RADAR_REGISTRATION_PROFILES_ENABLED==='true'&&env.RADAR_OWNERSHIP_ENABLED==='true'&&env.RADAR_BUSINESS_DETAILS_ENABLED==='true'}"><meta name="radar-owner-private" content="${env.RADAR_OWNER_PRIVATE_ENABLED==='true'}"></head>`);
 return new Response(req.method==='HEAD'?null:html,{headers:{...headers('text/html; charset=utf-8',tiles),'x-robots-tag':indexing&&url.pathname==='/'?'index, follow':'noindex, nofollow'}});
}

