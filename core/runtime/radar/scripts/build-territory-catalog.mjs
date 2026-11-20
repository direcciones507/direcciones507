// Offline transformation only. Never download geographic data in the public runtime.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
export const iso3={PA:'PAN',CO:'COL',CR:'CRI',GT:'GTM',SV:'SLV',HN:'HND',NI:'NIC',MX:'MEX'};
export function buildTerritoryCatalog(inputs){
 const catalog={};
 for(const [country,iso] of Object.entries(iso3)){
  const entry=inputs[country];
  if(!entry||entry.reviewed!==true||!Number.isInteger(entry.expectedCount)||entry.expectedCount<1)throw Error(country+': source and coverage review required');
  const {metadata:m,geometry:g}=entry;
  if(!m||m.boundaryISO!==iso||m.boundaryType!=='ADM1'||!m.boundaryID||!m.boundaryYearRepresented||!m.boundaryLicense||!m.boundarySource||!m.licenseSource||!entry.attribution?.trim())throw Error(country+': incomplete provenance');
  if(g?.type!=='FeatureCollection'||!Array.isArray(g.features)||g.features.length!==entry.expectedCount||Number(m.admUnitCount)!==entry.expectedCount)throw Error(country+': incomplete territorial coverage');
  const seen=new Set(),names=new Set();
  const regions=g.features.map(f=>{
   const id=f.properties?.shapeID,name=f.properties?.shapeName?.trim();
   if(typeof id!=='string'||!id||typeof name!=='string'||!name||seen.has(id)||names.has(name.normalize('NFC').toLowerCase()))throw Error(country+': invalid or duplicate region');
   seen.add(id);names.add(name.normalize('NFC').toLowerCase());
   if(f.type!=='Feature'||!['Polygon','MultiPolygon'].includes(f.geometry?.type))throw Error(country+': polygon required');
   let w=180,s=90,e=-180,n=-90;
   const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
   if(!Array.isArray(polygons)||!polygons.length)throw Error(country+': missing geometry');
   for(const polygon of polygons){
    if(!Array.isArray(polygon)||!polygon.length)throw Error(country+': empty polygon');
    for(const ring of polygon){
     if(!Array.isArray(ring)||ring.length<4)throw Error(country+': invalid ring');
     for(const point of ring){
      if(!Array.isArray(point)||!Number.isFinite(point[0])||!Number.isFinite(point[1])||Math.abs(point[0])>180||Math.abs(point[1])>85)throw Error(country+': invalid coordinate');
      w=Math.min(w,point[0]);e=Math.max(e,point[0]);s=Math.min(s,point[1]);n=Math.max(n,point[1]);
     }
    }
   }
   if(w>=e||s>=n||e-w>180)throw Error(country+': invalid extent');
   // Round outwards, not inwards. Extents are for camera navigation, not legal boundaries.
   const down=v=>Math.floor(v*1e5)/1e5,up=v=>Math.ceil(v*1e5)/1e5;
   return {id,name,bounds:[[down(w),down(s)],[up(e),up(n)]]};
  }).sort((a,b)=>a.name.localeCompare(b.name,'es')||a.id.localeCompare(b.id));
  catalog[country]={source:{id:m.boundaryID,year:m.boundaryYearRepresented,provider:m.boundarySource,license:m.boundaryLicense,licenseUrl:m.licenseSource,attribution:entry.attribution,transformation:'Polygon extents rounded outward; not legal boundaries'},regions};
 }
 return {version:1,level:'ADM1',countries:catalog};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [input,output]=process.argv.slice(2);
 if(!input||!output)throw Error('Usage: node build-territory-catalog.mjs <reviewed-input.json> <output.json>');
 const result=buildTerritoryCatalog(JSON.parse(readFileSync(input,'utf8')));
 const payload=JSON.stringify(result,null,2);writeFileSync(output,output.endsWith('.js')?'export const territoryCatalog='+payload+';\n':payload+'\n',{flag:'wx'});
}
