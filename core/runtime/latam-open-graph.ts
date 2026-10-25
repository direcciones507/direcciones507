import {readFileSync} from 'node:fs';

// Versioned, public image, shipped in the same deployment as its metadata.
// No external fetch, authentication or database work for preview crawlers.
const image=readFileSync(new URL('./assets/og-latam-map-v2.jpg',import.meta.url));
export function handleLatamOpenGraphImage(req:Request):Response|null {
  const url=new URL(req.url);
  if(url.hostname!=='direcciones.lat'||url.pathname!=='/assets/og-latam-map-v2.jpg')return null;
  if(req.method!=='GET'&&req.method!=='HEAD')return new Response(null,{status:405,headers:{allow:'GET, HEAD'}});
  return new Response(req.method==='HEAD'?null:image,{headers:{
    'content-type':'image/jpeg',
    'content-length':String(image.byteLength),
    'cache-control':'public, max-age=31536000, immutable',
    'x-content-type-options':'nosniff',
  }});
}
