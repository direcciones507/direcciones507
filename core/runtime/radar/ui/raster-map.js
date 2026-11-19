// Loaded only when WebGL is unavailable. Same public GeoJSON and map actions; no second Radar engine.
const palette={normal:'#9daf9f',featured:'#d7bc7a',live:'#d66e6c'};
export async function rasterMap({container,tiles,bounds,onMove,onSelect,onPick,onError,reduced}){
 const css=document.createElement('link');css.rel='stylesheet';css.href='/radar/ui/vendor/leaflet.css';document.head.append(css);
 await new Promise((resolve,reject)=>{if(window.L)return resolve();const s=document.createElement('script');s.src='/radar/ui/vendor/leaflet.js';s.onload=resolve;s.onerror=reject;document.head.append(s);});
 const L=window.L;container.replaceChildren();container.className='raster-map';
 const map=L.map(container,{zoomControl:false,scrollWheelZoom:false,preferCanvas:true,zoomAnimation:!reduced.matches,fadeAnimation:!reduced.matches}).setView([8.9824,-79.5199],12);
 L.control.zoom({position:'topright'}).addTo(map);L.tileLayer(tiles,{maxZoom:19,keepBuffer:1,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}).on('tileerror',onError).addTo(map);
 map.attributionControl.setPrefix(false);const pins=L.featureGroup().addTo(map);
 let features=[],frame=0,moving=false;
 function draw(){cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{pins.clearLayers();const b=map.getBounds(),visible=features.filter(f=>b.contains([f.geometry.coordinates[1],f.geometry.coordinates[0]]));
 // Geographic grid groups keep the 2D fallback inexpensive at country zoom.
 const groups=new Map(),zoom=map.getZoom(),cell=zoom<14?55:0;
 for(const f of visible){const [lng,lat]=f.geometry.coordinates,p=map.project([lat,lng],zoom);const key=cell&&f.properties.pin==='normal'?`${Math.floor(p.x/cell)},${Math.floor(p.y/cell)}`:f.id;const group=groups.get(key)||[];group.push(f);groups.set(key,group);}
 for(const group of groups.values()){const f=group[0],coords=[f.geometry.coordinates[1],f.geometry.coordinates[0]];if(group.length>1){const button=document.createElement('button');button.className='raster-cluster';button.textContent=String(group.length);button.setAttribute('aria-label',`Ampliar grupo de ${group.length} establecimientos`);const marker=L.marker(coords,{icon:L.divIcon({html:button,className:'raster-pin-host',iconSize:[44,44],iconAnchor:[22,22]}),keyboard:false}).addTo(pins);button.onclick=e=>{e.stopPropagation();map.setView(coords,map.getZoom()+2);};continue;}
 const button=document.createElement('button');button.className='raster-pin pin-'+f.properties.pin;button.dataset.id=f.id;button.style.setProperty('--pin-color',palette[f.properties.pin]||palette.normal);button.setAttribute('aria-label',f.properties.name);button.title=f.properties.name;button.append(document.createElement('span'));button.onclick=e=>{e.stopPropagation();onSelect(f);};L.marker(coords,{icon:L.divIcon({html:button,className:'raster-pin-host',iconSize:[38,50],iconAnchor:[19,48]}),keyboard:false}).addTo(pins);}
 });}
 map.on('movestart',()=>{moving=true;});map.on('moveend',()=>{moving=false;draw();onMove();});map.on('click',e=>onPick(e.latlng.lng,e.latlng.lat));
 const resize=new ResizeObserver(()=>map.invalidateSize());resize.observe(container);
 return {engine:'raster',isMoving:()=>moving,getBounds:()=>map.getBounds(),getZoom:()=>map.getZoom(),getSource:()=>({setData:data=>{features=data.features;draw();}}),easeTo:({center,zoom})=>map.setView([center[1],center[0]],zoom||map.getZoom(),{animate:!reduced.matches}),fitBounds:(b)=>map.fitBounds(b.map(([lng,lat])=>[lat,lng]),{padding:[25,25],animate:!reduced.matches}),resize:()=>map.invalidateSize(),remove:()=>{cancelAnimationFrame(frame);resize.disconnect();map.remove();},makeMarker:(lng,lat,onDrag)=>{const marker=L.marker([lat,lng],{draggable:true,icon:L.divIcon({html:'<span class="placement-pin" aria-label="Pin movible">◎</span>',className:'raster-pin-host',iconSize:[40,40],iconAnchor:[20,20]})}).addTo(map);marker.on('dragend',()=>{const p=marker.getLatLng();onDrag(p.lng,p.lat);});return marker;}};
}
