// Explicitly for isolated visual review; never imported by the production entrypoint.
import {readFileSync} from 'node:fs';
import {comparePanamaAdm1Names} from './panama-territory-reference.mjs';
const read=name=>JSON.parse(readFileSync(new URL('../data/'+name,import.meta.url),'utf8'));
const expected=Object.freeze({PA:13,CO:33,CR:7,GT:22,SV:14,HN:18,NI:17,MX:32});
const corrections={
 CO:{'COL-1399':{name:'Bogotá, D.C.'},'COL-1342':{name:'San Andrés, Providencia y Santa Catalina'}},
 GT:{'GTM-1945':{name:'Quetzaltenango'}},
 NI:{'NIC-657':{name:'Región Autónoma de la Costa Caribe Norte'},'NIC-644':{name:'Región Autónoma de la Costa Caribe Sur'},'NIC-4800':{name:'Río San Juan'}},
 MX:{'MEX-2727':{name:'Ciudad de México'},'MEX-2731':{name:'Estado de México'}}
};
export function buildPreviewTerritories(natural=read('territory-adm1-candidate.json'),panama=read('panama-adm1-osm-candidate.json')){
 if(natural.status!=='REVIEW_REQUIRED'||panama.status!=='CAMERA_EXTENTS_REVIEW_REQUIRED'||!comparePanamaAdm1Names(panama.regions.map(r=>r.name)).complete)throw Error('Candidate provenance or Panama coverage invalid');
 const countries={};
 for(const [code,count] of Object.entries(expected)){
  const original=code==='PA'?panama.regions:natural.countries[code]?.regions;
  const source=code==='PA'?panama.source:natural.source;
  if(!Array.isArray(original)||original.length!==count||!source?.attribution||!source.license||!source.licenseUrl)throw Error('Incomplete source for '+code);
  const ids=new Set(),names=new Set();
  const regions=original.map(r=>{
   const entry={id:r.id,name:corrections[code]?.[r.id]?.name??r.name,bounds:r.bounds};
   const name=entry.name?.normalize('NFC').trim().toLowerCase();
   const b=entry.bounds;
   if(!entry.id||!name||ids.has(entry.id)||names.has(name)||!Array.isArray(b)||b.length!==2||!b.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))||b[0][0]<-180||b[1][0]>180||b[0][1]<-85||b[1][1]>85||b[0][0]>=b[1][0]||b[0][1]>=b[1][1])throw Error('Invalid candidate for '+code);
   ids.add(entry.id);names.add(name);return entry;
  }).sort((a,b)=>a.name.localeCompare(b.name,'es'));
  countries[code]={regions,source:{...source,reviewStatus:'PREVIEW_ONLY',attribution:'Vista de ensayo · '+source.attribution+' · '+source.license+' · Encuadre aproximado'}};
 }
 return {version:1,level:'ADM1',countries,reviewStatus:'PREVIEW_ONLY'};
}
