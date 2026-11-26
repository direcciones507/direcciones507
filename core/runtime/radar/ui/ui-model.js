import {territoryCatalog} from './territory-catalog.js';
const labels={PA:'Provincia / comarca',CO:'Departamento / distrito capital',CR:'Provincia',GT:'Departamento',SV:'Departamento',HN:'Departamento',NI:'Departamento / región',MX:'Estado / entidad federativa'};
// Preserve stable city options and add verified ADM1 views only when all eight countries are available.
export function withTerritoryCatalog(base,catalog){
 if(catalog?.version!==1||catalog?.level!=='ADM1'||!catalog.countries)return base;
 const result={};
 for(const [code,country] of Object.entries(base)){
  const item=catalog.countries[code];
  if(!item?.source?.attribution||!item.source.license||!Array.isArray(item.regions)||!item.regions.length)return base;
  const ids=new Set(),regions=[];
  for(const region of item.regions){
   const b=region.bounds;
   if(typeof region.id!=='string'||!region.id||ids.has(region.id)||typeof region.name!=='string'||!region.name.trim()||!Array.isArray(b)||b.length!==2||!b.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))||b[0][0]<-180||b[1][0]>180||b[0][1]<-85||b[1][1]>85||b[0][0]>=b[1][0]||b[0][1]>=b[1][1])return base;
   ids.add(region.id);regions.push({...region,kind:'region',label:region.name+' · '+labels[code]});
  }
  result[code]={...country,views:[...country.views,...regions],territorySource:item.source};
 }
 return result;
}
const baseCountries={
 PA:{name:'Panamá',bounds:[[-83.1,7.1],[-77,9.8]],views:[{name:'Ciudad de Panamá',bounds:[[-79.65,8.87],[-79.40,9.12]]},{name:'David',bounds:[[-82.49,8.36],[-82.36,8.50]]},{name:'Santiago',bounds:[[-81.04,8.04],[-80.91,8.16]]},{name:'Colón',bounds:[[-79.98,9.28],[-79.82,9.42]]}]},
 CO:{name:'Colombia',bounds:[[-79,-4.3],[-66.8,12.5]],views:[{name:'Bogotá',bounds:[[-74.25,4.5],[-73.98,4.85]]},{name:'Medellín',bounds:[[-75.7,6.10],[-75.45,6.4]]}]},
 CR:{name:'Costa Rica',bounds:[[-86,8],[-82.5,11.3]],views:[{name:'San José',bounds:[[-84.22,9.86],[-83.96,10.03]]}]},
 GT:{name:'Guatemala',bounds:[[-92.3,13.6],[-88.2,17.9]],views:[{name:'Ciudad de Guatemala',bounds:[[-90.66,14.49],[-90.4,14.75]]}]},
 SV:{name:'El Salvador',bounds:[[-90.2,13.1],[-87.6,14.5]],views:[{name:'San Salvador',bounds:[[-89.35,13.6],[-89.08,13.82]]}]},
 HN:{name:'Honduras',bounds:[[-89.4,12.9],[-83.1,16.6]],views:[{name:'Tegucigalpa',bounds:[[-87.35,13.96],[-87.1,14.2]]}]},
 NI:{name:'Nicaragua',bounds:[[-87.8,10.7],[-82.7,15.1]],views:[{name:'Managua',bounds:[[-86.42,12.02],[-86.12,12.24]]},{name:'Granada',bounds:[[-86.03,11.87],[-85.88,12.01]]}]},
 MX:{name:'México',bounds:[[-118.5,14.4],[-86.7,32.8]],views:[{name:'Ciudad de México',bounds:[[-99.35,19.2],[-98.95,19.6]]}]}
};
export const countries=withTerritoryCatalog(baseCountries,territoryCatalog);
export const activityLabels={available:'Poca afluencia',queue:'Afluencia media',full:'Alta afluencia',incident:'Incidencia',unknown:'Pendiente de actualización'};
export let categoryGroups=[["Gastronomía",[["restaurant","Restaurantes"],["fonda","Fondas"],["cafe","Cafeterías"],["specialty-coffee","Cafés de especialidad"],["pizza","Pizzerías"],["fast-food","Comida rápida"],["juice","Juguerías y refresquerías"],["smoothies","Batidos y smoothies"],["bubble-tea","Bubble tea"],["bakery","Panaderías"],["ice-cream","Heladerías"],["pastry","Pastelerías"]]],["Hoteles y alojamiento",[["hotel","Hoteles / alojamiento"],["hostel","Hostales"],["cabin","Cabañas"],["vacation-rental","Alquileres vacacionales / Airbnb"],["resort","Resorts"],["glamping","Glamping"]]],["Tarde y noche",[["bar","Bares"],["nightclub","Discotecas"],["terrace","Terrazas"],["rooftop","Rooftops"],["karaoke","Karaokes"],["brewery","Cervecerías"],["lounge","Lounges"],["casino","Casinos"],["event-hall","Salones de eventos"]]],["Turismo y recreación",[["tourism","Turismo"],["recreation","Parques recreativos"],["sports","Deportes"]]],["Comercios",[["shop","Comercio"],["supermarket","Supermercados"],["mall","Centros comerciales"]]],["Salud y bienestar",[["health","Salud"],["pharmacy","Farmacias"],["clinic","Clínicas"],["gym","Gimnasios"]]],["Servicios",[["services","Servicios"],["workshop","Talleres"],["barber","Barberías"],["beauty","Salones de belleza"],["education","Educación"]]],["Otros",[["other","Otra"],["entertainment","Entretenimiento"]]]];
const categoryLabels=new Map(categoryGroups.flatMap(g=>g[1]));
let unavailableCategories=new Set();
export function applyDynamicCategories(data){
 if(data?.dynamic!==true||!Array.isArray(data.groups)||!Array.isArray(data.categories))return false;
 categoryGroups=data.groups.filter(g=>g.active===true).map(g=>[g.label,data.categories.filter(c=>c.groupId===g.id&&c.active===true).map(c=>[c.id,c.label])]).filter(g=>g[1].length);
 categoryLabels.clear();for(const c of data.categories)categoryLabels.set(c.id,c.label);
 const active=new Set(categoryGroups.flatMap(g=>g[1].map(c=>c[0])));unavailableCategories=new Set(data.categories.filter(c=>!active.has(c.id)).map(c=>c.id));
 return true;
}
export const categoryLabel=c=>categoryLabels.get(c)||String(c||'Establecimiento');
export function fillCategorySelect(select,doc=document,legacy=[]){const previous=select.value,optional=!select.required;select.replaceChildren();const option=(value,label)=>{const n=doc.createElement('option');n.value=value;n.textContent=label;return n;};if(optional)select.append(option('','Todas las categorías'));for(const [label,items] of categoryGroups){const group=doc.createElement('optgroup');group.label=label;for(const [id,name] of items)group.append(option(id,name));select.append(group);}for(const id of new Set(legacy))if(optional&&(!categoryLabels.has(id)||unavailableCategories.has(id))&&typeof id==='string'&&id)select.append(option(id,categoryLabel(id)));select.value=previous;if(!select.value&&!optional){const first=categoryGroups.flatMap(g=>g[1])[0];if(first)select.value=first[0];}}

export function normalizeBounds(input){let [w,s,e,n]=input;const wrap=x=>((x+180)%360+360)%360-180;if(e-w>=359.9){w=-180;e=180;}else{w=wrap(w);e=wrap(e);}return [w,Math.max(-85,s),e,Math.min(85,n)];}
export function safeAddress(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&['direcciones507.com','www.direcciones507.com','direcciones.lat','www.direcciones.lat'].includes(u.hostname)?u.href:null;}catch{return null;}}
export function freshProperties(input={},now=Date.now()){
 const p={...input};
 if(!Object.hasOwn(activityLabels,p.activity)||!Number.isFinite(Number(p.reportedAt))||!p.reportedAt||now-Number(p.reportedAt)>=1800000||Number(p.reportedAt)>now){p.activity='unknown';p.reportedAt=null;p.source=null;}
 const active=t=>Number.isFinite(Number(t))&&Number(t)>now;
 p.isFeatured=active(p.featuredUntil);
 p.pin=active(p.liveUntil)?'live':p.isFeatured?'featured':'normal';
 if(p.commercialModel&&!active(p.annualUntil)&&p.pin==='normal'){
  delete p.registrationProfile;
  delete p.details;
 }
 return p;
}
export const normalZoomStep=.6;
// All registered establishments remain discoverable at any zoom; normal pins cluster on the map.
export function mapPinStyle(properties){return properties.pin==='normal'&&(properties.corporate||safeAddress(properties.digitalAddressUrl))?'corporate':properties.pin;}
export function mapFeatures(rows,zoom,revealZoom){
 return rows.filter(({properties:p})=>!p.commercialModel||p.corporate||p.pin==='live'||(p.pin==='featured'?zoom>=10:zoom>=13));
}
export function priorityFeatures(rows){
 const rank=p=>p.pin==='live'?1:p.pin==='featured'?2:p.commercialModel&&Number(p.annualUntil)>Date.now()?3:4;
 return rows.filter(f=>rank(f.properties)<4).sort((a,b)=>rank(a.properties)-rank(b.properties));
}
export function featuredGroups(rows){const groups=new Map();for(const f of rows){if(!f.properties.isFeatured)continue;const key=f.properties.category;const group=groups.get(key)||[];group.push(f);groups.set(key,group);}return groups;}
export function searchContext(text,country){
 const clean=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 const aliases={cafe:'cafe',cafes:'cafe',cafeteria:'cafe',cafeterias:'cafe',restaurante:'restaurant',restaurantes:'restaurant',hotel:'hotel',hoteles:'hotel',comercio:'shop',comercios:'shop',servicio:'services',servicios:'services'};
 let query=text.trim(),view=null;
 for(const candidate of countries[country]?.views||[]){const suffixes=[candidate.label,candidate.name].filter(Boolean).map(name=>' en '+name);const suffix=suffixes.find(s=>clean(query).endsWith(clean(s)));if(suffix){query=query.slice(0,query.length-suffix.length).trim();view=candidate;break;}}
 return {query:aliases[clean(query)]||query,view};
}

// Local distance calculation. Coordinates are neither sent nor persisted.
export function distanceKm(lat1,lng1,lat2,lng2){
 if(![lat1,lng1,lat2,lng2].every(Number.isFinite)||Math.abs(lat1)>90||Math.abs(lat2)>90||Math.abs(lng1)>180||Math.abs(lng2)>180)return NaN;
 const rad=n=>n*Math.PI/180,dlat=rad(lat2-lat1),dlng=rad(lng2-lng1);
 const a=Math.sin(dlat/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dlng/2)**2;
 return 6371*2*Math.asin(Math.sqrt(Math.max(0,Math.min(1,a))));
}

// Geographic query is snapped outward to a coarse grid; precise distance stays local.
export function nearbyBounds(lat,lng,radius){
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>85||Math.abs(lng)>180||![5,10,20].includes(radius))return null;
 const padLat=radius/110, padLng=radius/(110*Math.max(.08,Math.cos(lat*Math.PI/180)));
 const floor=x=>Math.floor(x*4)/4,ceil=x=>Math.ceil(x*4)/4;
 return normalizeBounds([floor(lng-padLng),floor(lat-padLat),ceil(lng+padLng),ceil(lat+padLat)]);
}
export function nearbyRows(features,lat,lng,radius,category,country,now=Date.now()){
 if(!nearbyBounds(lat,lng,radius))return [];
 return features.filter(f=>f?.geometry?.type==='Point'&&typeof f.id==='string'&&f.properties?.country===country&&(!category||f.properties.category===category))
 .map(f=>({feature:{...f,properties:freshProperties(f.properties,now)},km:distanceKm(lat,lng,f.geometry.coordinates?.[1],f.geometry.coordinates?.[0])}))
 .filter(row=>Number.isFinite(row.km)&&row.km<=radius).sort((a,b)=>a.km-b.km||a.feature.id.localeCompare(b.feature.id)).slice(0,100);
}

// Commercial live campaigns only; community activity is supplementary.
export function pulseRows(features,country,category='',now=Date.now()){
 return features.filter(f=>f?.geometry?.type==='Point'&&typeof f.id==='string'&&f.properties?.country===country)
 .map(f=>({...f,properties:freshProperties(f.properties,now)}))
 .filter(f=>f.properties.pin==='live'&&(!category||f.properties.category===category))
 .sort((a,b)=>Number(a.properties.liveUntil)-Number(b.properties.liveUntil)||a.id.localeCompare(b.id)).slice(0,100);
}
