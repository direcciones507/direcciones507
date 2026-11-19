export const countries={
 PA:{name:'Panamá',bounds:[[-83.1,7.1],[-77,9.8]],views:[{name:'Ciudad de Panamá',bounds:[[-79.65,8.87],[-79.40,9.12]]},{name:'David',bounds:[[-82.49,8.36],[-82.36,8.50]]},{name:'Santiago',bounds:[[-81.04,8.04],[-80.91,8.16]]},{name:'Colón',bounds:[[-79.98,9.28],[-79.82,9.42]]}]},
 CO:{name:'Colombia',bounds:[[-79,-4.3],[-66.8,12.5]],views:[{name:'Bogotá',bounds:[[-74.25,4.5],[-73.98,4.85]]},{name:'Medellín',bounds:[[-75.7,6.10],[-75.45,6.4]]}]},
 CR:{name:'Costa Rica',bounds:[[-86,8],[-82.5,11.3]],views:[{name:'San José',bounds:[[-84.22,9.86],[-83.96,10.03]]}]},
 GT:{name:'Guatemala',bounds:[[-92.3,13.6],[-88.2,17.9]],views:[{name:'Ciudad de Guatemala',bounds:[[-90.66,14.49],[-90.4,14.75]]}]},
 SV:{name:'El Salvador',bounds:[[-90.2,13.1],[-87.6,14.5]],views:[{name:'San Salvador',bounds:[[-89.35,13.6],[-89.08,13.82]]}]},
 HN:{name:'Honduras',bounds:[[-89.4,12.9],[-83.1,16.6]],views:[{name:'Tegucigalpa',bounds:[[-87.35,13.96],[-87.1,14.2]]}]},
 NI:{name:'Nicaragua',bounds:[[-87.8,10.7],[-82.7,15.1]],views:[{name:'Managua',bounds:[[-86.42,12.02],[-86.12,12.24]]},{name:'Granada',bounds:[[-86.03,11.87],[-85.88,12.01]]}]},
 MX:{name:'México',bounds:[[-118.5,14.4],[-86.7,32.8]],views:[{name:'Ciudad de México',bounds:[[-99.35,19.2],[-98.95,19.6]]}]}
};
export const activityLabels={available:'Poca afluencia',queue:'Afluencia media',full:'Alta afluencia',incident:'Incidencia',unknown:'Pendiente de actualización'};
export const categoryLabel=c=>({shop:'Comercio',restaurant:'Restaurante',cafe:'Cafetería',health:'Salud',services:'Servicios',hotel:'Alojamiento',other:'Otra'})[c]||String(c||'Establecimiento');
export function normalizeBounds(input){let [w,s,e,n]=input;const wrap=x=>((x+180)%360+360)%360-180;if(e-w>=359.9){w=-180;e=180;}else{w=wrap(w);e=wrap(e);}return [w,Math.max(-85,s),e,Math.min(85,n)];}
export function safeAddress(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&['direcciones507.com','www.direcciones507.com','direcciones.lat','www.direcciones.lat'].includes(u.hostname)?u.href:null;}catch{return null;}}
export function freshProperties(input={},now=Date.now()){
 const p={...input};
 if(!Object.hasOwn(activityLabels,p.activity)||!Number.isFinite(Number(p.reportedAt))||!p.reportedAt||now-Number(p.reportedAt)>=1800000||Number(p.reportedAt)>now){p.activity='unknown';p.reportedAt=null;p.source=null;}
 const active=t=>Number.isFinite(Number(t))&&Number(t)>now;
 p.isFeatured=active(p.featuredUntil);
 p.pin=active(p.liveUntil)?'live':p.isFeatured?'featured':'normal';
 return p;
}
export const normalZoomStep=.6;
export function mapFeatures(rows,zoom,revealZoom){return rows.filter(f=>f.properties.pin!=='normal'||zoom>=revealZoom);}
export function priorityFeatures(rows){return rows.filter(f=>f.properties.pin==='live'||f.properties.pin==='featured');}
export function featuredGroups(rows){const groups=new Map();for(const f of rows){if(!f.properties.isFeatured)continue;const key=f.properties.category;const group=groups.get(key)||[];group.push(f);groups.set(key,group);}return groups;}
export function searchContext(text,country){
 const clean=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 const aliases={cafe:'cafe',cafes:'cafe',cafeteria:'cafe',cafeterias:'cafe',restaurante:'restaurant',restaurantes:'restaurant',hotel:'hotel',hoteles:'hotel',comercio:'shop',comercios:'shop',servicio:'services',servicios:'services'};
 let query=text.trim(),view=null;
 for(const candidate of countries[country]?.views||[]){const suffix=' en '+candidate.name;if(clean(query).endsWith(clean(suffix))){query=query.slice(0,query.length-suffix.length).trim();view=candidate;break;}}
 return {query:aliases[clean(query)]||query,view};
}
