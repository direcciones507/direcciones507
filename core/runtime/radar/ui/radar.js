import {renderCommercialDetails,commercialWhatsapp,commercialOpenStatus} from './commercial-details.js';
import {applyCategoryUnits,registrationIntent,registrationKind,registrationChoiceMarkup,ownerRegistrationMarkup,setRegistrationKind,renderCategoryRegistrationFields,collectOwnerRegistration,restoreOwnerRegistration,collectOwnerPrivate,setOwnerPrivateEnabled,restoreOwnerPrivate,registrationTerritoryLabels} from './registration-form.js';
import {applyDynamicCategories,fillCategorySelect,pulseRows,nearbyBounds,nearbyRows,distanceKm,countries, activityLabels, categoryLabel, normalizeBounds, safeAddress, freshProperties, mapFeatures, mapPinStyle, priorityFeatures, featuredGroups, normalZoomStep,searchContext} from './ui-model.js';
const $=id=>document.getElementById(id), reduced=matchMedia('(prefers-reduced-motion: reduce)');
const lowPower=()=>reduced.matches||navigator.connection?.saveData||(navigator.deviceMemory&&navigator.deviceMemory<4)||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<4);
const anonymousReports=document.querySelector('meta[name="radar-anonymous-reports"]')?.content==='true';
const alertsEnabled=document.querySelector('meta[name="radar-alerts"]')?.content==='true';
const reputationEnabled=document.querySelector('meta[name="radar-reputation"]')?.content==='true';
const contributionsEnabled=document.querySelector('meta[name="radar-contributions"]')?.content==='true';
const favoritesEnabled=document.querySelector('meta[name="radar-favorites"]')?.content==='true';
const activityValidation=document.querySelector('meta[name="radar-activity-validation"]')?.content==='true';
const ownerRegistrationEnabled=document.querySelector('meta[name="radar-registration-profiles"]')?.content==='true';
const ownerPrivateEnabled=document.querySelector('meta[name="radar-owner-private"]')?.content==='true';
const state={country:'PA',features:[],map:null,maplibre:null,selected:null,picking:false,pickMarker:null,request:null,sequence:0,session:null,pending:null,sessionRequest:null,bounds:null,revealZoom:12.8,resetZoom:false,expiryTimer:null};
let loadTimer,refreshTimer,toastTimer,authTimer,nearbyTarget=null,pulseLoaded=false,pulseLoading=false;
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,5500);}
function show(id){const d=$(id);if(!d.open)d.showModal();}
function close(id){$(id).close();}
document.body.insertAdjacentHTML('beforeend',registrationChoiceMarkup);
document.addEventListener('pointerdown',e=>{const info=document.getElementById('ownerPrivacyHelp');if(info?.open&&!info.contains(e.target))info.open=false;});
$('addStatus').insertAdjacentHTML('beforebegin',ownerRegistrationMarkup);
let territoryPolicy={};try{territoryPolicy=JSON.parse(document.querySelector('meta[name="radar-territory-labels"]')?.content||'{}');}catch{}
function updateRegistrationTerritoryLabels(){const [region,locality]=registrationTerritoryLabels(territoryPolicy,$('placeCountry').value);$('businessRegionLabel').textContent=region;$('businessLocalityLabel').textContent=locality;}
$('placeCountry').addEventListener('change',updateRegistrationTerritoryLabels);$('placeCountry').addEventListener('change',()=>setOwnerPrivateEnabled($('addForm'),ownerPrivateEnabled&&$('addForm').dataset.registrationKind==='owner',$('placeCountry').value));$('addForm').addEventListener('reset',()=>queueMicrotask(updateRegistrationTerritoryLabels));
const ownerChoice=document.querySelector('[data-registration-kind="owner"]');ownerChoice.disabled=!ownerRegistrationEnabled;
if(!ownerRegistrationEnabled){const notice=el('p','muted','El registro de propietarios todavía no está disponible.');ownerChoice.after(notice);}
for(const button of document.querySelectorAll('[data-registration-kind]'))button.onclick=()=>{close('registrationChoiceDialog');beginAction(registrationIntent(button.dataset.registrationKind));};
for(const id of ['category','placeCategory','nearbyCategory','pulseFilter'])fillCategorySelect($(id));
async function refreshCategoryCatalog(){
 try{const response=await fetch('/v1/radar/categories',{cache:'no-store',credentials:'same-origin'});if(!response.ok)return;const data=await response.json();if(!applyDynamicCategories(data))return;applyCategoryUnits(data.categories);for(const id of ['category','nearbyCategory','pulseFilter'])fillCategorySelect($(id),document,state.features.map(f=>f.properties.category));if(!$('addDialog').open)fillCategorySelect($('placeCategory'));render();}catch{}
}
void refreshCategoryCatalog();
window.addEventListener('focus',()=>{void refreshCategoryCatalog();});
$('placeCategory').addEventListener('change',()=>renderCategoryRegistrationFields($('businessCategoryFields'),$('placeCategory').value));
// Keep native selects for keyboard/assistive technology; pointer activation uses a dismissible menu.
let activeSelectMenu=null;
function dismissSelectMenu(restore=false){if(!activeSelectMenu)return;const {menu,select}=activeSelectMenu;activeSelectMenu=null;menu.remove();select.removeAttribute('aria-expanded');if(restore)select.focus({preventScroll:true});}
function openSelectMenu(select){
 dismissSelectMenu();if(select.disabled||select.multiple||select.size>1)return;
 const menu=el('div','radar-select-popover');menu.setAttribute('role','listbox');menu.setAttribute('aria-label',select.closest('label')?.innerText?.trim().split('\\n')[0]||'Seleccionar opción');
 const options=Array.from(select.options),buttons=[];
 function addOption(option){if(option.hidden||option.disabled||option.parentElement?.disabled)return;const button=el('button','',option.label);button.type='button';button.setAttribute('role','option');button.setAttribute('aria-selected',String(option.selected));button.onclick=()=>{const changed=select.value!==option.value;select.value=option.value;dismissSelectMenu(true);if(changed){select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));}};menu.append(button);buttons.push(button);}
 for(const child of select.children){if(child.tagName==='OPTGROUP'){if(child.disabled)continue;menu.append(el('div','select-group',child.label));for(const option of child.children)addOption(option);}else if(child.tagName==='OPTION')addOption(child);}
 if(!buttons.length)return;
 (select.closest('dialog[open]')||document.body).append(menu);activeSelectMenu={select,menu};select.setAttribute('aria-expanded','true');
 const rect=select.getBoundingClientRect(),width=Math.min(Math.max(rect.width,190),innerWidth-16),left=Math.max(8,Math.min(rect.left,innerWidth-width-8));menu.style.width=width+'px';menu.style.left=left+'px';const below=innerHeight-rect.bottom-8,above=rect.top-8;const available=Math.max(below,above);menu.style.maxHeight=Math.min(420,Math.max(80,available))+'px';menu.style.top=(below>=Math.min(menu.offsetHeight,above)?rect.bottom+4:Math.max(8,rect.top-menu.offsetHeight-4))+'px';
 menu.addEventListener('keydown',event=>{const index=buttons.indexOf(document.activeElement);if(event.key==='Escape'){event.preventDefault();event.stopPropagation();dismissSelectMenu(true);}else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[next].focus();}else if(event.key==='Tab'){dismissSelectMenu(true);}});
 (buttons.find(b=>b.getAttribute('aria-selected')==='true')||buttons[0]).focus({preventScroll:true});
}
const customSelectIds=new Set(['placeCategory','placeCountry','category','country','territory','nearbyCategory','pulseFilter','activity','nearbyRadius','alertFavorite','alertActivity','contributionsFilter']);
document.addEventListener('pointerdown',event=>{const select=event.target.closest?.('select');if(activeSelectMenu&&!activeSelectMenu.menu.contains(event.target)&&event.target!==activeSelectMenu.select){const dialog=activeSelectMenu.select.closest('dialog[open]');dismissSelectMenu();if(dialog&&event.target===dialog){event.preventDefault();event.stopImmediatePropagation();return;}}if(select&&customSelectIds.has(select.id)&&event.button===0&&!select.disabled){event.preventDefault();if(activeSelectMenu?.select===select)dismissSelectMenu(true);else openSelectMenu(select);}},true);
document.addEventListener('click',event=>{const select=event.target.closest?.('select');if(select&&customSelectIds.has(select.id)&&event.detail>0){event.preventDefault();}if(activeSelectMenu&&!activeSelectMenu.menu.contains(event.target)&&event.target!==activeSelectMenu.select)dismissSelectMenu();},true);
window.addEventListener('resize',()=>dismissSelectMenu());
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>b.closest('dialog').close();
for(const d of document.querySelectorAll('dialog')){d.addEventListener('click',e=>{if(e.target===d){if(activeSelectMenu){dismissSelectMenu();return;}const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});d.addEventListener('close',()=>{if(activeSelectMenu?.select.closest('dialog')===d)dismissSelectMenu();if(d.id==='accountDialog'){clearInterval(authTimer);$('accountFrame').src='about:blank';}if(d.id==='addDialog'&&!state.picking)clearPickMarker();});}
$('howButton').onclick=()=>show('howDialog');
function scrollMap(){document.querySelector('#explorar').scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});}
function scrollPicker(){document.querySelector('.map-area').scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});}
function readStorage(){try{return JSON.parse(sessionStorage.getItem('radarAction')||'null');}catch{return null;}}
function saveAction(action){state.pending=action;try{sessionStorage.setItem('radarAction',JSON.stringify({...action,...(action.draft?{draft:{...action.draft,ownerPrivate:undefined}}:{}),savedAt:Date.now(),country:state.country}));}catch{}}
function clearAction(){state.pending=null;try{sessionStorage.removeItem('radarAction');}catch{}}
function countryOptions(){for(const id of ['placeCountry'])$(id).replaceChildren(...Object.entries(countries).map(([code,c])=>{const n=el('option','',c.name);n.value=code;return n;}));}
function territoryOptions(){const c=countries[state.country],select=$('territory');const all=el('option','','Todo el país');all.value='';select.replaceChildren(all);for(const [kind,label] of [['city','Ciudades'],['region','Divisiones territoriales']]){const group=el('optgroup');group.label=label;for(const [i,v] of c.views.entries()){if((v.kind||'city')!==kind)continue;const n=el('option','',v.label||v.name);n.value=String(i);group.append(n);}if(group.children.length)select.append(group);}const source=$('territorySource');if(source){source.hidden=!c.territorySource;source.replaceChildren();if(c.territorySource){source.append(document.createTextNode(c.territorySource.attribution+' '));const url=c.territorySource.copyrightUrl||c.territorySource.licenseUrl;try{const linkUrl=new URL(url);if(linkUrl.protocol==='https:'){const link=el('a','','Fuente y licencia');link.href=linkUrl.href;link.target='_blank';link.rel='noopener noreferrer';source.append(link);}}catch{}}}}
function setCountry(code,move=true){if(!countries[code])return;nearbyTarget=null;pulseLoaded=false;pulseLoading=false;state.request?.abort();mapQueryKey=null;mapQueryFetchedAt=-Infinity;++state.sequence;state.country=code;$('country').value=code;$('mapCountry').textContent=countries[code].name.toLocaleUpperCase('es');$('placeCountry').value=code;updateRegistrationTerritoryLabels();territoryOptions();state.bounds=countries[code].bounds;state.selected=null;state.features=[];$('detail').hidden=true;$('category').value='';render();if(move&&state.map){state.resetZoom=true;state.map.fitBounds(countries[code].bounds,{padding:35,duration:reduced.matches?0:700});}scheduleLoad(0);}
$('country').onchange=()=>setCountry($('country').value);
$('territory').onchange=()=>{const view=countries[state.country].views[Number($('territory').value)];const bounds=$('territory').value===''?countries[state.country].bounds:view.bounds;state.bounds=bounds;if(state.map){state.resetZoom=true;state.map.fitBounds(bounds,{padding:30,duration:reduced.matches?0:650});}scheduleLoad(0);};
$('filtersButton').onclick=()=>{const open=$('filters').hidden;$('filters').hidden=!open;$('filtersButton').setAttribute('aria-expanded',String(open));state.map?.resize();};
document.addEventListener('click',e=>{if(!$('filters').hidden&&!$('filters').contains(e.target)&&!$('filtersButton').contains(e.target)&&!e.target.closest?.('.radar-select-popover')&&!document.querySelector('dialog[open]')){$('filters').hidden=true;$('filtersButton').setAttribute('aria-expanded','false');state.map?.resize();}});
$('category').onchange=render; $('activity').onchange=render;
$('resetFilters').onclick=()=>{$('searchInput').value='';$('category').value='';$('activity').value='';setCountry(state.country);};
$('searchForm').onsubmit=e=>{e.preventDefault();const context=searchContext($('searchInput').value,state.country);if(context.view){$('territory').value=String(countries[state.country].views.indexOf(context.view));state.bounds=context.view.bounds;if(state.map){state.resetZoom=true;state.map.fitBounds(context.view.bounds,{padding:30,duration:reduced.matches?0:650});}}scheduleLoad(0);};
$('searchInput').addEventListener('input',()=>{if(!$('searchInput').value)scheduleLoad(0);});
$('refreshButton').onclick=()=>refreshMapData();
$('expandButton').onclick=()=>{const expanded=document.querySelector('.map-shell').classList.toggle('expanded');$('expandButton').setAttribute('aria-pressed',String(expanded));$('expandButton').setAttribute('aria-label',expanded?'Reducir área del mapa':'Ampliar área del mapa');document.body.style.overflow=expanded?'hidden':'';state.map?.resize();};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(state.picking)cancelPicking();if(document.querySelector('.map-shell.expanded'))$('expandButton').click();}});
function currentBounds(){if(state.map){const b=state.map.getBounds();return normalizeBounds([b.getWest(),b.getSouth(),b.getEast(),b.getNorth()]);}return normalizeBounds((state.bounds||countries[state.country].bounds).flat());}
let mapQueryKey=null,mapQueryFetchedAt=-Infinity;
function refreshMapData(){
 mapQueryFetchedAt=-Infinity;
 mapQueryKey=null;
 scheduleLoad(0);
}
function scheduleLoad(delay=250){clearTimeout(loadTimer);loadTimer=setTimeout(load,delay);}
async function load(){
 if(state.map?.isMoving()){scheduleLoad(150);return;}
 if(state.resetZoom&&state.map){state.revealZoom=state.map.getZoom()+normalZoomStep;state.resetZoom=false;}
 if(state.features.some(f=>f.properties.commercialModel))updateMap(filtered());
 const bounds=currentBounds();
 const params=new URLSearchParams({country:state.country,...Object.fromEntries(['west','south','east','north'].map((key,index)=>[key,String(bounds[index])]))});
 const query=searchContext($('searchInput').value,state.country).query;
 if(query)params.set('q',query);
 const key=params.toString();
 if(key===mapQueryKey){
  if(pulseLoading)return;
  if(!nearbyTarget&&performance.now()-mapQueryFetchedAt<5000){
   updateMap(filtered());
   return;
  }
 }
 state.request?.abort();
 state.request=new AbortController();
 mapQueryKey=key;
 mapQueryFetchedAt=-Infinity;
 const seq=++state.sequence;
 pulseLoading=true;
 pulseLoaded=false;
 renderPulse();$('dataStatus').textContent='Consultando esta zona…';$('results').setAttribute('aria-busy','true');
 try{const r=await fetch('/v1/radar/map?'+params,{signal:state.request.signal,credentials:'same-origin',cache:'no-store'});if(!r.ok)throw Error(r.status===429?'Radar está ocupado temporalmente.':r.status===503?'Radar no está habilitado en este entorno.':r.status===400?'Revisa los filtros de búsqueda.':'No se pudo consultar esta zona.');const data=await r.json();if(seq!==state.sequence)return;mapQueryFetchedAt=performance.now();state.features=(Array.isArray(data.features)?data.features:[]).filter(f=>f?.geometry?.type==='Point'&&typeof f.id==='string'&&Number.isFinite(f.geometry.coordinates?.[0])&&Number.isFinite(f.geometry.coordinates?.[1])).slice(0,1000);fillCategorySelect($('category'),document,state.features.map(f=>f.properties.category));pulseLoaded=true;pulseLoading=false;render();if(nearbyTarget){const match=state.features.find(f=>f.id===nearbyTarget);nearbyTarget=null;if(match)selectFeature(match);else toast('No se encontró el establecimiento en esta vista.');}$('updatedAt').textContent='Actualizado '+new Intl.DateTimeFormat('es',{hour:'2-digit',minute:'2-digit'}).format(new Date());}
 catch(e){if(e.name==='AbortError'||seq!==state.sequence)return;state.features=[];pulseLoaded=false;pulseLoading=false;render();$('dataStatus').textContent=(e.message==='Failed to fetch'?'No hay conexión. Revisa tu red e intenta actualizar.':e.message)+' Pulsa actualizar para reintentar.';$('updatedAt').textContent='Consulta sin actualizar';}
 finally{if(seq===state.sequence)$('results').removeAttribute('aria-busy');}
}
function filtered(){const cat=$('category').value,activity=$('activity').value;return state.features.filter(f=>(!cat||f.properties.category===cat)&&(!activity||f.properties.activity===activity));}
function relativeTime(p){if(!p.reportedAt)return 'Sin reporte reciente';const minutes=Math.max(0,Math.floor((Date.now()-Number(p.reportedAt))/60000));return minutes<1?'Reportado hace un momento':`Hace ${minutes} min · vigente ${Math.max(0,30-minutes)} min`;}
function activityBadge(p){const badge=el('span','activity-badge');badge.append(el('i',p.activity),document.createTextNode(activityLabels[p.activity]||activityLabels.unknown));return badge;}
function render(){
 state.features=state.features.map(f=>({...f,properties:freshProperties(f.properties)}));
 const rows=filtered(),priority=priorityFeatures(rows);
 $('resultCount').textContent=String(priority.length);
 $('dataStatus').textContent=priority.length?'':'Sin destacados ni actividades en vivo para esta búsqueda. Acerca el mapa para explorar establecimientos gratuitos.';
 const fragment=document.createDocumentFragment();
 for(const f of priority){const p=f.properties,b=el('button','result-card');b.type='button';b.dataset.id=f.id;b.setAttribute('aria-pressed',String(state.selected?.id===f.id));const top=el('span','result-top');top.append(el('span','category-symbol',p.pin==='live'?'◉':'◇'),el('span','category-label',categoryLabel(p.category)));const meta=el('span','result-meta');meta.append(el('i',p.activity),document.createTextNode(activityLabels[p.activity]||activityLabels.unknown));b.append(top,el('h4','',p.name),el('span','commercial-badge '+p.pin,p.pin==='live'?'En vivo':p.pin==='featured'?'Destacado':'Ficha comercial'),meta);
  const openStatus=commercialOpenStatus(p);if(openStatus)b.append(el('span','detail-open-status',openStatus));
  const qty=p.details?.quantity,unit=p.details?.unit;
  if(Number.isInteger(qty)&&qty>=0&&['tables','rooms','places','units'].includes(unit))b.append(el('span','result-availability',qty+' '+({tables:'mesas',rooms:'habitaciones',places:'cupos',units:'unidades'})[unit]+' disponibles ahora'));
  b.append(el('div','result-time',relativeTime(p)));b.onclick=()=>selectFeature(f);fragment.append(b);}
 $('results').replaceChildren(fragment);renderFeatured(rows);updateMap(rows);state.pulseControl?.();renderPulse();
 if(state.selected){const current=rows.find(f=>f.id===state.selected.id);if(!current){state.selected=null;$('detail').hidden=true;}else{state.selected=current;detail(current,false);}}
 clearTimeout(state.expiryTimer);
 const deadlines=state.features.flatMap(f=>[f.properties.liveUntil,f.properties.featuredUntil,f.properties.annualUntil,f.properties.reportedAt?Number(f.properties.reportedAt)+1800000:null]).map(Number).filter(t=>Number.isFinite(t)&&t>Date.now());
 if(deadlines.length)state.expiryTimer=setTimeout(render,Math.min(2147483647,Math.max(1,Math.min(...deadlines)-Date.now()+10)));
}
function renderFeatured(rows){const groups=featuredGroups(rows),fragment=document.createDocumentFragment();for(const [category,items] of groups){const section=el('section','featured-category');section.append(el('h3','',({restaurant:'Restaurantes',hotel:'Hoteles',cafe:'Cafeterías',shop:'Comercios',services:'Servicios',health:'Salud',other:'Otros'})[category]||categoryLabel(category)));const track=el('div','featured-track');track.setAttribute('aria-label',categoryLabel(category));for(const f of items){const b=el('button','featured-card');b.type='button';b.append(el('span','commercial-badge','Destacado'),el('h4','',f.properties.name),el('span','',categoryLabel(category)));const availability=f.properties.details;const labels={tables:'mesas',rooms:'habitaciones',places:'cupos',units:'unidades'};if(Number.isInteger(availability?.quantity)&&availability.quantity>=0&&Object.hasOwn(labels,availability.unit))b.append(el('span','result-availability',availability.quantity+' '+labels[availability.unit]+' disponibles ahora'));b.onclick=()=>{scrollMap();selectFeature(f);};track.append(b);}section.append(track);fragment.append(section);}$('featuredGroups').replaceChildren(fragment);$('featuredSection').hidden=!groups.size;}
function detail(f,focus=true){
 const p=f.properties,d=$('detail'),optionsOpen=!d.hidden&&d.dataset.id===f.id&&!!d.querySelector('.detail-options[open]');
 d.replaceChildren();d.dataset.id=f.id;
 const top=el('div','detail-top');top.append(el('span','category-label',categoryLabel(p.category)));
 const closeButton=el('button','icon-button','×');closeButton.setAttribute('aria-label','Cerrar ficha');
 closeButton.onclick=()=>{dismissDetail();const button=[...document.querySelectorAll('.result-card')].find(n=>n.dataset.id===f.id);button?.focus({preventScroll:true});};
 const whatsapp=commercialWhatsapp(p);if(whatsapp)top.append(whatsapp);top.append(closeButton);d.append(top,el('h3','',p.name));
 if(p.commercialModel){
  if(p.phone)d.append(el('p','',p.phone));
  const status=commercialOpenStatus(p)||p.openStatus;
  if(status)d.append(el('p','detail-open-status',status));
  if(p.pin!=='normal'||Number(p.annualUntil)>Date.now()){
   appendBusinessDetails(d,p);
   const directions=el('a','button subtle','Cómo llegar');
   directions.href='https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent([...f.geometry.coordinates].reverse().join(','));
   directions.target='_blank';directions.rel='noopener noreferrer';d.append(directions);
  }
  const corporateUrl=p.corporate?safeAddress(p.digitalAddressUrl):null;
  if(corporateUrl){
   const address=el('a','button subtle','Ver dirección digital');
   address.href=corporateUrl;address.target='_blank';address.rel='noopener noreferrer';d.append(address);
  }
  d.hidden=false;if(focus)d.focus({preventScroll:true});return;
 }
 if(['live','featured'].includes(p.pin))d.append(el('span','commercial-badge '+p.pin,p.pin==='featured'?'Destacado':'Pin en vivo'));
 d.append(el('p','detail-country',countries[p.country||state.country]?.name||state.country));
 const hoursStatus=commercialOpenStatus(p);const available=p.details?.quantity,availableUnit=p.details?.unit;const availableNames={tables:'mesas',rooms:'habitaciones',places:'cupos',units:'unidades'};const statusLine=el('div','detail-status-line');if(hoursStatus)statusLine.append(el('span','detail-open-status',hoursStatus));if(Number.isInteger(available)&&available>=0&&Object.hasOwn(availableNames,availableUnit))statusLine.append(el('span','result-availability',available+' '+availableNames[availableUnit]+' disponibles'));if(statusLine.childNodes.length){statusLine.style.display='flex';statusLine.style.flexWrap='wrap';statusLine.style.alignItems='center';statusLine.style.gap='8px';d.append(statusLine);}
 const activity=el('div','detail-activity');activity.append(activityBadge(p),el('span','',relativeTime(p)));d.append(activity);
 const options=el('details','detail-options');options.open=optionsOpen;
 const summary=el('summary','button subtle','Más opciones');summary.append(el('span','disclosure-arrow','⌄'));summary.lastChild.setAttribute('aria-hidden','true');options.append(summary);
 const content=el('div','detail-options-content');
 if(p.source)content.append(el('p','',p.source==='verified_owner'?'Reporte de propietario verificado':'Reporte de la comunidad'));
 if(p.pin==='live'&&p.liveUntil)content.append(el('p','','En vivo hasta '+new Intl.DateTimeFormat('es',{dateStyle:'medium',timeStyle:'short'}).format(new Date(Number(p.liveUntil)))));
 appendBusinessDetails(content,p);
 // The map pin conveys coordinates; do not display raw GPS numbers in the public card.
 const actions=el('div','detail-actions'),link=safeAddress(p.digitalAddressUrl);
 if(link){const a=el('a','button subtle','Ver dirección digital');a.href=link;a.target='_blank';a.rel='noopener noreferrer';actions.append(a);}
 const b=el('button','button primary','Reportar actividad');b.onclick=()=>beginAction({type:'report',id:f.id,name:p.name});actions.append(b);
 if(activityValidation&&p.reportedAt){const validate=el('button','button subtle','Validar actividad');validate.onclick=()=>openValidation(f);actions.append(validate);}
 if(favoritesEnabled){const favorite=el('button','button subtle','Guardar en favoritos');favorite.onclick=()=>beginAction({type:'favorite-add',id:f.id,name:p.name});actions.append(favorite);}

 content.append(actions);options.append(content);d.append(options);d.hidden=false;if(focus)d.focus({preventScroll:true});
}
let mapSelectionSequence=0;
function openPinGroup(rows){const out=$('pinGroupResults');out.replaceChildren();const sorted=[...rows].sort((a,b)=>({live:0,featured:1,normal:2}[a.properties.pin]??3)-({live:0,featured:1,normal:2}[b.properties.pin]??3)||a.properties.name.localeCompare(b.properties.name));for(const f of sorted){const button=el('button','button subtle wide',f.properties.name+(f.properties.pin==='live'?' · En vivo':f.properties.pin==='featured'?' · Destacado':''));button.type='button';button.onclick=()=>{close('pinGroupDialog');const latest=filtered().find(row=>row.id===f.id);if(latest)selectFeature(latest);else toast('El establecimiento ya no está en esta consulta.');};out.append(button);}show('pinGroupDialog');}
function dismissDetail(){++mapSelectionSequence;if(!state.selected&&$('detail').hidden)return;state.selected=null;const panel=$('detail');panel.hidden=true;panel.querySelector('.detail-options')?.removeAttribute('open');delete panel.dataset.id;for(const n of document.querySelectorAll('.result-card[aria-pressed="true"]'))n.setAttribute('aria-pressed','false');}
// Close the pin card on any free map surface, while leaving navigation and pin selection intact.
// A renderer handles its own actual map tiles/pins; this catches surrounding map-area overlays.
document.querySelector('.map-area')?.addEventListener('click',event=>{
 const target=event.target;
 if(!(target instanceof Element)||$('detail').hidden||state.picking||document.querySelector('dialog[open]'))return;
 if(target.closest('#detail,#map,.map-tools,.map-top,.map-legend,.map-bottom,.pick-notice,.map-fallback,button,a,input,select'))return;
 dismissDetail();
});
// Map taps are processed by the renderer. Other free surfaces close the card too.
document.addEventListener('click',event=>{const target=event.target;if(!(target instanceof Element)||$('detail').hidden||target.closest('#detail,#map,.result-card,.featured-card,dialog')||document.querySelector('dialog[open]'))return;dismissDetail();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('detail').hidden&&!document.querySelector('dialog[open]'))dismissDetail();});
function selectFeature(f){state.selected=f;for(const n of document.querySelectorAll('.result-card'))n.setAttribute('aria-pressed',String(n.dataset.id===f.id));detail(f);}
function mapIdentity(feature){
 return {type:'Feature',id:feature.id,geometry:feature.geometry,properties:{pin:mapPinStyle(feature.properties),radarId:feature.id}};
}
function updateMap(rows){if(!state.map)return;const visible=mapFeatures(rows,state.map.getZoom(),state.revealZoom);const source=state.map.getSource('establishments');if(!source)return;if(state.map.engine==='raster')source.setData({type:'FeatureCollection',features:visible});else{source.setData({type:'FeatureCollection',features:visible.filter(f=>f.properties.pin==='normal').map(mapIdentity)});state.map.getSource('priority')?.setData({type:'FeatureCollection',features:priorityFeatures(visible).map(mapIdentity)});}}
function pinImage(color){const canvas=document.createElement('canvas');canvas.width=64;canvas.height=80;const c=canvas.getContext('2d');c.shadowColor='#02091599';c.shadowBlur=7;c.shadowOffsetY=6;c.beginPath();c.moveTo(32,72);c.bezierCurveTo(28,65,12,47,12,29);c.arc(32,29,20,Math.PI,0);c.bezierCurveTo(52,47,36,65,32,72);const g=c.createLinearGradient(12,8,45,64);g.addColorStop(0,'#e6eef9');g.addColorStop(.35,color);g.addColorStop(1,'#304f71');c.fillStyle=g;c.fill();c.strokeStyle='#d0deee';c.lineWidth=1.4;c.stroke();c.shadowBlur=0;c.shadowOffsetY=0;c.beginPath();c.arc(32,29,9,0,Math.PI*2);c.fillStyle='#13273d';c.fill();c.beginPath();c.arc(32,29,4,0,Math.PI*2);c.fillStyle=color;c.fill();return c.getImageData(0,0,64,80);}
let mapInitialization=null;
function initMap(){if(mapInitialization)return mapInitialization;if(state.map)return Promise.resolve();mapInitialization=initializeMap().finally(()=>{mapInitialization=null;});return mapInitialization;}
async function initializeMap(){if(state.map)return;try{const m=await import('./vendor/maplibre-gl.mjs');state.maplibre=m;m.setWorkerCount(lowPower()?1:2);const map=new m.Map({container:'map',style:{version:8,sources:{base:{type:'raster',tiles:[document.querySelector('meta[name="radar-tiles"]')?.content||'https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}},layers:[{id:'background',type:'background',paint:{'background-color':'#132b40'}},{id:'base',type:'raster',source:'base',paint:{'raster-saturation':-.55,'raster-brightness-min':.12,'raster-brightness-max':.87,'raster-contrast':.06,'raster-hue-rotate':-12,'raster-fade-duration':reduced.matches?0:200}}]},center:[-79.5199,8.9824],zoom:12.2,minZoom:3,maxZoom:18,pitch:lowPower()?0:22,renderWorldCopies:false,attributionControl:{compact:false},canvasContextAttributes:{antialias:false},pixelRatio:Math.min(devicePixelRatio,lowPower()?1.5:2),cooperativeGestures:true,refreshExpiredTiles:true});state.map=map;$('mapFallback').hidden=true;map.addControl(new m.NavigationControl({showCompass:!lowPower(),visualizePitch:false}),'top-right');map.on('load',()=>{for(const [name,color] of Object.entries({normal:'#9daf9f',corporate:'#2164b5',featured:'#d7bc7a',live:'#d66e6c'}))map.addImage('pin-'+name,pinImage(color),{pixelRatio:2});map.addSource('establishments',{type:'geojson',data:{type:'FeatureCollection',features:[]},cluster:true,clusterRadius:45,clusterMaxZoom:13});map.addLayer({id:'cluster-depth',type:'circle',source:'establishments',filter:['has','point_count'],paint:{'circle-color':'#0c2038','circle-radius':24,'circle-opacity':.8,'circle-translate':[0,5]}});map.addLayer({id:'clusters',type:'circle',source:'establishments',filter:['has','point_count'],paint:{'circle-color':'#3b6995','circle-radius':['step',['get','point_count'],17,25,20,100,25],'circle-stroke-width':2,'circle-stroke-color':'#c7d8ed'}});map.addSource('priority',{type:'geojson',data:{type:'FeatureCollection',features:[]}});map.addLayer({id:'live-halo',type:'circle',source:'priority',filter:['==',['get','pin'],'live'],paint:{'circle-color':'#c85b5a','circle-radius':19,'circle-opacity':.22,'circle-stroke-color':'#df807c','circle-stroke-width':1}});map.addLayer({id:'pins',type:'symbol',source:'establishments',filter:['!', ['has','point_count']],layout:{'icon-image':['concat','pin-',['get','pin']],'icon-size':['case',['==',['get','pin'],'featured'],1.2,1],'icon-anchor':'bottom','icon-allow-overlap':true}});map.addLayer({id:'priority-pins',type:'symbol',source:'priority',layout:{'icon-image':['concat','pin-',['get','pin']],'icon-size':1.15,'icon-anchor':'bottom','icon-allow-overlap':true}});for(const layer of ['pins','priority-pins','clusters']){map.on('mouseenter',layer,()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave',layer,()=>map.getCanvas().style.cursor='');}updateMap(filtered());scheduleLoad(0);});map.on('moveend',()=>{if(state.resetZoom){state.revealZoom=map.getZoom()+normalZoomStep;state.resetZoom=false;}scheduleLoad();});
let pulseFrame=0,lastPulse=0;function liveVisible(){return !document.hidden&&!reduced.matches&&filtered().some(f=>f.properties.pin==='live');}function pulse(time){if(!liveVisible()){pulseFrame=0;return;}pulseFrame=requestAnimationFrame(pulse);if(time-lastPulse<80)return;lastPulse=time;const phase=(time%2200)/2200;map.setPaintProperty('live-halo','circle-radius',15+phase*15);map.setPaintProperty('live-halo','circle-opacity',.3*(1-phase));}function syncPulse(){if(liveVisible()){if(!pulseFrame)pulseFrame=requestAnimationFrame(pulse);}else{cancelAnimationFrame(pulseFrame);pulseFrame=0;if(map.getLayer('live-halo'))map.setPaintProperty('live-halo','circle-opacity',.22);}}state.pulseControl=syncPulse;syncPulse();document.addEventListener('visibilitychange',syncPulse);reduced.addEventListener('change',syncPulse);map.once('remove',()=>{cancelAnimationFrame(pulseFrame);document.removeEventListener('visibilitychange',syncPulse);reduced.removeEventListener('change',syncPulse);state.pulseControl=null;});const selectAt=async point=>{
 if(state.picking)return;
 if(!map.getLayer('pins'))return;
 // IDs stored as properties survive the vector tile conversion of UUID strings.
 const box=[[point.x-12,point.y-12],[point.x+12,point.y+12]];
 const hits=map.queryRenderedFeatures(box,{layers:['priority-pins','pins','clusters','cluster-depth']});
 if(!hits.length){dismissDetail();return;}
 const sequence=++mapSelectionSequence;
 const clusterIds=new Set(),ids=new Set();
 for(const hit of hits){
  if(hit.properties?.cluster){clusterIds.add(hit.properties.cluster_id);continue;}
  if(hit.properties?.radarId)ids.add(String(hit.properties.radarId));
 }
 for(const id of clusterIds){
  try{const leaves=await map.getSource('establishments').getClusterLeaves(id,1000,0);for(const leaf of leaves)if(leaf.properties?.radarId)ids.add(String(leaf.properties.radarId));}
  catch{if(sequence===mapSelectionSequence)toast('Amplía el mapa para consultar estos establecimientos.');}
 }
 if(sequence!==mapSelectionSequence||state.picking||state.map!==map)return;
 const rows=filtered().filter(f=>ids.has(f.id));
 if(rows.length===1){selectFeature(rows[0]);return;}
 if(rows.length>1){openPinGroup(rows);return;}
 if(hits.length)toast('Actualiza la zona o acerca el mapa para consultar el establecimiento.');
};
 // Pointer events on the real map canvas avoid renderer-specific click suppression.
 // A short, single-pointer gesture is selection; dragging/pinching remains navigation.
 const canvas=map.getCanvas(),activePointers=new Map();let multiPointer=false;
 const down=e=>{if(e.button!==0)return;if(!activePointers.size)multiPointer=false;activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(activePointers.size>1)multiPointer=true;};
 const move=e=>{const start=activePointers.get(e.pointerId);if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>10)start.moved=true;};
 const cancel=e=>{activePointers.delete(e.pointerId);};
 const up=e=>{const start=activePointers.get(e.pointerId);activePointers.delete(e.pointerId);if(!start||start.moved||multiPointer||state.picking||Math.hypot(e.clientX-start.x,e.clientY-start.y)>10)return;const r=canvas.getBoundingClientRect();void selectAt({x:(e.clientX-r.left)*canvas.clientWidth/r.width,y:(e.clientY-r.top)*canvas.clientHeight/r.height}).catch(()=>toast('No se pudo consultar este PIN. Intenta nuevamente.'));};
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('pointerleave',cancel);
 map.once('remove',()=>{canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('pointerleave',cancel);});
 map.on('click',e=>{
  if(state.picking){finishPicking(e.lngLat.lng,e.lngLat.lat);return;}
  // A blank map click dismisses the card even if mobile browsers skip pointerup.
  if($('detail').hidden||!map.getLayer('pins'))return;
  const point=e.point,box=[[point.x-12,point.y-12],[point.x+12,point.y+12]];
  if(!map.queryRenderedFeatures(box,{layers:['priority-pins','pins','clusters','cluster-depth']}).length)dismissDetail();
 });let warned=false;map.on('error',()=>{if(!warned){warned=true;toast('Algunos recursos del mapa no pudieron cargar. La consulta en lista sigue disponible.');}});map.getCanvas().addEventListener('webglcontextlost',e=>{e.preventDefault();mapUnavailable('El dispositivo interrumpió el mapa. Puedes seguir consultando la lista.');});const resize=new ResizeObserver(()=>map.resize());resize.observe($('map'));map.once('remove',()=>resize.disconnect());if(state.country!=='PA')map.fitBounds(countries[state.country].bounds,{padding:30,duration:0});}
 catch{await initRasterMap();}}
async function initRasterMap(){try{state.map?.remove();state.map=null;const {rasterMap}=await import('./raster-map.js');let warned=false;state.map=await rasterMap({container:$('map'),tiles:document.querySelector('meta[name="radar-tiles"]')?.content||'https://tile.openstreetmap.org/{z}/{x}/{y}.png',bounds:countries[state.country].bounds,reduced,onMove:()=>{if(state.resetZoom&&!state.map.isMoving()){state.revealZoom=state.map.getZoom()+normalZoomStep;state.resetZoom=false;}scheduleLoad();},onSelect:f=>{if(!state.picking)selectFeature(f);},onPick:(lng,lat)=>{if(state.picking)finishPicking(lng,lat);else dismissDetail();},onError:()=>{if(!warned){warned=true;toast('No se pudieron cargar algunas teselas. Revisa tu conexión; la lista sigue disponible.');}}});$('mapFallback').hidden=true;state.revealZoom=state.map.getZoom()+normalZoomStep;if(state.country!=='PA'){state.resetZoom=true;state.map.fitBounds(countries[state.country].bounds);}updateMap(filtered());scheduleLoad(0);}catch{mapUnavailable('No se pudo cargar el mapa. Puedes seguir buscando por país y zona en la lista.');}}
function mapUnavailable(message){state.map?.remove();state.map=null;$('fallbackMessage').textContent=message;$('mapFallback').hidden=false;scheduleLoad(0);}
$('retryMap').onclick=()=>initMap();
function gps(onSuccess,status){if(!navigator.geolocation){status('Este navegador no admite ubicación. Puedes seleccionar las coordenadas manualmente.');return;}navigator.geolocation.getCurrentPosition(p=>onSuccess(p.coords),()=>status('No se obtuvo la ubicación. Revisa el permiso del navegador o selecciona un punto en el mapa.'),{enableHighAccuracy:false,timeout:10000,maximumAge:60000});}
$('locateButton').onclick=()=>gps(p=>{if(state.map)state.map.easeTo({center:[p.longitude,p.latitude],zoom:14,duration:reduced.matches?0:700});else toast('El mapa no está disponible. Elige una vista territorial.');},toast);
function renderPulse(){if(!$('pulseDialog').open)return;const out=$('pulseResults');out.replaceChildren();if(pulseLoading){$('pulseStatus').textContent='Consultando promociones en vivo…';return;}if(!pulseLoaded){$('pulseStatus').textContent='No hay una consulta actualizada. Pulsa actualizar pulso.';return;}const rows=pulseRows(state.features,state.country,$('pulseFilter').value);$('pulseStatus').textContent=rows.length?rows.length+' promociones en vivo en esta zona.':'No hay promociones En vivo vigentes en esta zona.';for(const f of rows){const p=f.properties,row=el('article','pending-item');row.append(el('h3','',p.name),el('p','',categoryLabel(p.category)),el('span','commercial-badge live','En vivo'),el('p','','Disponible hasta '+new Intl.DateTimeFormat('es',{dateStyle:'medium',timeStyle:'short'}).format(new Date(Number(p.liveUntil)))),activityBadge(p));const b=el('button','button subtle','Ver ficha');b.type='button';b.onclick=()=>{close('pulseDialog');selectFeature(f);scrollMap();};row.append(b);out.append(row);}}
$('alertsButton').hidden=!alertsEnabled;
$('alertsButton').onclick=()=>beginAction({type:'alerts-list'});
let alertsSequence=0,alertsTimer=null;
$('alertsDialog').addEventListener('close',()=>{++alertsSequence;clearInterval(alertsTimer);$('alertsResults').replaceChildren();$('alertFavorite').replaceChildren();$('alertsStatus').textContent='';});
async function openAlerts(){show('alertsDialog');clearInterval(alertsTimer);await loadAlerts(true);if($('alertsDialog').open)alertsTimer=setInterval(()=>{if(!document.hidden&&$('alertsDialog').open)loadAlerts(false);},60000);}
async function loadAlerts(loadFavorites){const seq=++alertsSequence,out=$('alertsResults');try{if(loadFavorites){$('alertsStatus').textContent='Consultando tus alertas…';$('alertEnable').disabled=true;const data=await write('/v1/radar/favorites',{action:'list'});if(seq!==alertsSequence||!$('alertsDialog').open)return;const options=(data.favorites||[]).filter(f=>f.available).map(f=>{const o=el('option','',f.name);o.value=f.id;return o;});$('alertFavorite').replaceChildren(...options);$('alertEnable').disabled=!options.length;}const data=await write('/v1/radar/alerts',{action:'list'});if(seq!==alertsSequence||!$('alertsDialog').open)return;out.replaceChildren();const rows=Array.isArray(data.preferences)?data.preferences:[];let count=0;for(const a of rows){const row=el('article','pending-item'),match=a.match&&Date.now()-a.match.reportedAt<1800000&&a.match.reportedAt<=Date.now();row.append(el('h3','',a.name),el('p','',activityLabels[a.activity]||'Actividad'));if(match){count++;row.append(activityBadge({activity:a.match.state}),el('p','muted',relativeTime({reportedAt:a.match.reportedAt})),el('p','muted',a.match.source==='verified_owner'?'Reporte de propietario verificado':'Reporte comunitario'));}else row.append(el('p','muted','Sin coincidencia vigente'));const remove=el('button','button subtle','Desactivar alerta');remove.type='button';remove.onclick=async()=>{remove.disabled=true;try{await write('/v1/radar/alerts',{action:'disable',id:a.id,activity:a.activity});if($('alertsDialog').open)loadAlerts(false);}catch(err){if($('alertsDialog').open)$('alertsStatus').textContent=err.message;remove.disabled=false;}};row.append(remove);out.append(row);}$('alertsStatus').textContent=rows.length?count+' coincidencias vigentes · '+rows.length+' alertas activadas.':$('alertFavorite').options.length?'Todavía no tienes alertas activadas.':'Guarda un establecimiento en favoritos para activar alertas.';}catch(err){if(seq===alertsSequence){out.replaceChildren();$('alertsStatus').textContent=err.message;}}}
$('alertEnable').onclick=async()=>{const b=$('alertEnable'),id=$('alertFavorite').value;if(!id)return;b.disabled=true;try{await write('/v1/radar/alerts',{action:'enable',id,activity:$('alertActivity').value});if($('alertsDialog').open)await loadAlerts(false);}catch(err){if($('alertsDialog').open)$('alertsStatus').textContent=err.message;}finally{b.disabled=!$('alertFavorite').options.length;}};
$('reputationButton').hidden=!reputationEnabled;
$('reputationButton').onclick=()=>beginAction({type:'reputation-summary'});
let reputationSequence=0;
$('reputationDialog').addEventListener('close',()=>{++reputationSequence;$('reputationResults').replaceChildren();$('reputationStatus').textContent='';});
async function openReputation(){const seq=++reputationSequence;show('reputationDialog');const out=$('reputationResults');out.replaceChildren();$('reputationStatus').textContent='Consultando tu participación…';try{const data=await write('/v1/radar/reputation',{action:'summary'});if(seq!==reputationSequence||!$('reputationDialog').open)return;const box=el('article','pending-item');box.append(el('h3','',({initial:'Participación inicial',active:'Participación activa',constant:'Participación constante'})[data.level]||'Participación inicial'));for(const [label,value] of [['Reportes comunitarios',data.reports],['Validaciones realizadas',data.validations],['Días con participación',data.days],['Días con reportes corroborados',data.corroboratedDays]])box.append(el('p','',label+': '+Number(value)));box.append(el('p','muted','Para avanzar se requiere actividad en distintos días y reportes corroborados por al menos dos cuentas distintas, sin contradicciones registradas. No se otorgan niveles por cantidad de votos solamente.'));out.append(box);$('reputationStatus').textContent='Resumen privado · últimos 90 días';}catch(err){if(seq===reputationSequence)$('reputationStatus').textContent=err.message;}}
$('contributionsButton').hidden=!contributionsEnabled;
$('contributionsButton').onclick=()=>beginAction({type:'contributions-list'});
let contributionsSequence=0,contributionsOffset=null;
$('contributionsDialog').addEventListener('close',()=>{++contributionsSequence;contributionsOffset=null;$('contributionsResults').replaceChildren();$('contributionsStatus').textContent='';$('contributionsMore').hidden=true;});
function openContributions(){show('contributionsDialog');loadContributions(0);}
$('contributionsFilter').onchange=()=>loadContributions(0);
$('contributionsMore').onclick=()=>{if(contributionsOffset!==null)loadContributions(contributionsOffset);};
async function loadContributions(offset){const seq=++contributionsSequence,kind=$('contributionsFilter').value,out=$('contributionsResults'),more=$('contributionsMore');if(offset===0)out.replaceChildren();more.hidden=true;$('contributionsStatus').textContent='Consultando tus contribuciones…';try{const data=await write('/v1/radar/contributions',{action:'list',kind,offset});if(seq!==contributionsSequence||!$('contributionsDialog').open)return;const rows=Array.isArray(data.items)?data.items:[];for(const item of rows){const row=el('article','pending-item'),time=Number(item.createdAt);row.append(el('h3','',item.name||'Establecimiento no disponible'),el('p','',item.kind==='report'?'Reporte de actividad':item.agrees?'Confirmación de actividad':'Contradicción de actividad'),el('p','',activityLabels[item.state]||activityLabels.unknown));if(Number.isFinite(time))row.append(el('p','muted',new Intl.DateTimeFormat('es',{dateStyle:'medium',timeStyle:'short'}).format(new Date(time))));row.append(el('p','muted',item.current?'Reporte asociado vigente':'Registro histórico · no refleja la actividad actual'));out.append(row);}contributionsOffset=Number.isSafeInteger(data.nextOffset)?data.nextOffset:null;more.hidden=contributionsOffset===null;$('contributionsStatus').textContent=out.children.length?out.children.length+' contribuciones mostradas.':'Todavía no tienes contribuciones de este tipo.';}catch(err){if(seq!==contributionsSequence)return;$('contributionsStatus').textContent=err.message;if(offset>0){contributionsOffset=offset;more.hidden=false;}}}
$('favoritesButton').hidden=!favoritesEnabled;
$('favoritesButton').onclick=()=>beginAction({type:'favorites-list'});
let favoritesSequence=0;
$('favoritesDialog').addEventListener('close',()=>{++favoritesSequence;$('favoritesResults').replaceChildren();$('favoritesStatus').textContent='';});
async function saveFavorite(action){try{await write('/v1/radar/favorites',{action:'add',id:action.id});clearAction();toast('Establecimiento guardado en favoritos.');}catch(err){if(err.code==='AUTH_REQUIRED'){openAccount();return;}clearAction();toast(err.message);}}
async function openFavorites(){const seq=++favoritesSequence;show('favoritesDialog');$('favoritesResults').replaceChildren();$('favoritesStatus').textContent='Consultando tus favoritos…';try{const data=await write('/v1/radar/favorites',{action:'list'});if(seq!==favoritesSequence||!$('favoritesDialog').open)return;const rows=Array.isArray(data.favorites)?data.favorites:[];$('favoritesStatus').textContent=rows.length?rows.length+' establecimientos guardados.':'Todavía no tienes favoritos.';for(const f of rows){const row=el('article','pending-item');row.append(el('h3','',f.available?f.name:'Establecimiento no disponible'));if(f.available){row.append(el('p','',categoryLabel(f.category)+' · '+(countries[f.country]?.name||f.country)));const view=el('button','button subtle','Ver en mapa');view.type='button';view.onclick=()=>{if(!state.map||!countries[f.country]||!Array.isArray(f.coordinates)||!f.coordinates.every(Number.isFinite)){toast('El mapa no está disponible.');return;}close('favoritesDialog');$('searchInput').value='';$('activity').value='';setCountry(f.country,false);$('category').value='';state.revealZoom=Math.min(state.revealZoom,14);state.resetZoom=false;nearbyTarget=f.id;state.map.easeTo({center:f.coordinates,zoom:15,duration:reduced.matches?0:700});scrollMap();scheduleLoad(0);};row.append(view);}const remove=el('button','button subtle','Quitar favorito');remove.type='button';remove.onclick=async()=>{remove.disabled=true;try{await write('/v1/radar/favorites',{action:'remove',id:f.id});if(seq===favoritesSequence&&$('favoritesDialog').open)openFavorites();}catch(err){if(seq===favoritesSequence)$('favoritesStatus').textContent=err.message;remove.disabled=false;}};row.append(remove);$('favoritesResults').append(row);}}catch(err){if(seq===favoritesSequence)$('favoritesStatus').textContent=err.message;}}
$('pulseButton').onclick=()=>{show('pulseDialog');renderPulse();scheduleLoad(0);};
$('pulseFilter').onchange=renderPulse;
$('pulseRefresh').onclick=()=>refreshMapData();
let nearbyLocation=null,nearbySequence=0,nearbyRequest=null;
$('nearbyButton').onclick=()=>{nearbyLocation=null;$('nearbyResults').replaceChildren();$('nearbyStatus').textContent='Autoriza tu ubicación para consultar establecimientos en '+countries[state.country].name+'.';show('nearbyDialog');};
$('nearbyDialog').addEventListener('close',()=>{++nearbySequence;nearbyRequest?.abort();nearbyLocation=null;$('nearbyResults').replaceChildren();$('nearbyGps').disabled=false;});
$('nearbyGps').onclick=()=>{const seq=++nearbySequence;$('nearbyGps').disabled=true;$('nearbyStatus').textContent='Solicitando permiso de ubicación…';gps(p=>{if(seq!==nearbySequence||!$('nearbyDialog').open)return;$('nearbyGps').disabled=false;nearbyLocation={lat:p.latitude,lng:p.longitude};loadNearby();},message=>{if(seq!==nearbySequence)return;$('nearbyGps').disabled=false;$('nearbyStatus').textContent=message;});};
$('nearbyRadius').onchange=$('nearbyCategory').onchange=()=>{if(nearbyLocation)loadNearby();};
async function loadNearby(){const location=nearbyLocation,country=state.country,radius=Number($('nearbyRadius').value),category=$('nearbyCategory').value;if(!location)return;const seq=++nearbySequence;nearbyRequest?.abort();nearbyRequest=new AbortController();$('nearbyResults').replaceChildren();$('nearbyStatus').textContent='Consultando '+countries[country].name+'…';try{const bounds=nearbyBounds(location.lat,location.lng,radius);if(!bounds)throw Error('No se pudo calcular el área de búsqueda.');const params=new URLSearchParams({country,...Object.fromEntries(['west','south','east','north'].map((k,i)=>[k,String(bounds[i])]))});const r=await fetch('/v1/radar/map?'+params,{signal:nearbyRequest.signal,credentials:'same-origin',cache:'no-store'});if(!r.ok)throw Error('No se pudo consultar el entorno. Intenta nuevamente.');const data=await r.json();if(seq!==nearbySequence||!$('nearbyDialog').open)return;const rows=nearbyRows(Array.isArray(data.features)?data.features:[],location.lat,location.lng,radius,category,country);$('nearbyStatus').textContent=rows.length?rows.length+' establecimientos encontrados en el área consultada.':'No hay establecimientos publicados en esta distancia para el país y categoría seleccionados.';for(const {feature:f,km} of rows){const row=el('article','pending-item'),p=f.properties;row.append(el('h3','',p.name),el('p','',categoryLabel(p.category)+' · '+(km<1?Math.round(km*1000)+' m':km.toFixed(1)+' km')),activityBadge(p),el('p','',relativeTime(p)));const b=el('button','button subtle','Ver en el mapa');b.type='button';b.onclick=()=>{if(!state.map){$('nearbyStatus').textContent='El mapa no está disponible en este dispositivo.';return;}close('nearbyDialog');$('searchInput').value='';$('category').value='';$('activity').value='';$('territory').value='';state.revealZoom=Math.min(state.revealZoom,14);state.resetZoom=false;nearbyTarget=f.id;state.map.easeTo({center:f.geometry.coordinates,zoom:15,duration:reduced.matches?0:700});scrollMap();scheduleLoad(0);};row.append(b);$('nearbyResults').append(row);}}catch(err){if(seq===nearbySequence&&err.name!=='AbortError')$('nearbyStatus').textContent=err.message;}}
function coordinates(lng,lat){$('latitude').value=lat.toFixed(6);$('longitude').value=lng.toFixed(6);}
function clearPickMarker(){state.pickMarker?.remove();state.pickMarker=null;}
function finishPicking(lng,lat){coordinates(lng,lat);state.picking=false;document.querySelector('.map-area').classList.remove('picking');$('pickNotice').hidden=true;clearPickMarker();if(state.map.engine==='raster'){state.pickMarker=state.map.makeMarker(lng,lat,coordinates);}else{state.pickMarker=new state.maplibre.Marker({draggable:true,color:'#8eafda'}).setLngLat([lng,lat]).addTo(state.map);state.pickMarker.on('dragend',()=>{const p=state.pickMarker.getLngLat();coordinates(p.lng,p.lat);});}toast('Pin colocado. Puedes moverlo antes de continuar.');$('pickNotice').replaceChildren(el('span','','Ajusta el pin y confirma su ubicación'));const b=el('button','button primary','Usar este punto');b.onclick=()=>{if(ownerPicker){const lat=Number($('latitude').value),lng=Number($('longitude').value);if(Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180){if(!window.opener){toast('No se pudo conectar con Mi panel. Regresa a la pestaña original e intenta nuevamente.');return;}window.opener.postMessage({type:'radar-owner-location',token:ownerPicker.token,lat,lng},ownerPicker.origin);window.close();}return;}pickOriginal=null;$('pickNotice').hidden=true;clearPickMarker();$('addStatus').textContent='Ubicación confirmada en el mapa.';show('addDialog');};const cancel=el('button','button subtle','Cancelar');cancel.onclick=cancelPicking;$('pickNotice').append(b,cancel);$('pickNotice').hidden=false;}
const ownerPickerParams=new URLSearchParams(location.search);
const ownerPicker=ownerPickerParams.get('ownerPicker')==='1'&&['https://direcciones.lat','https://direcciones507.com','https://cuenta.direcciones507.com'].includes(ownerPickerParams.get('returnOrigin'))&&/^[0-9a-f-]{36}$/i.test(ownerPickerParams.get('token')||'')?{origin:ownerPickerParams.get('returnOrigin'),token:ownerPickerParams.get('token')}:null;
let pickOriginal=null;
function cancelPicking(){if(ownerPicker){window.close();return;}state.picking=false;clearPickMarker();if(pickOriginal){$('latitude').value=pickOriginal.lat;$('longitude').value=pickOriginal.lng;pickOriginal=null;}$('pickNotice').hidden=true;document.querySelector('.map-area').classList.remove('picking');show('addDialog');}
$('cancelPick').onclick=cancelPicking;
$('pickButton').onclick=async()=>{const button=$('pickButton');button.disabled=true;$('addStatus').textContent='Preparando el mapa…';try{await initMap();if(!$('addDialog').open)return;if(!state.map){$('addStatus').textContent='No se pudo cargar el mapa. Reintenta o usa tu ubicación.';return;}pickOriginal={lat:$('latitude').value,lng:$('longitude').value};state.picking=true;close('addDialog');$('pickNotice').replaceChildren(el('span','','Toca el mapa para colocar el pin'));const b=el('button','button subtle','Cancelar');b.onclick=cancelPicking;$('pickNotice').append(b);$('pickNotice').hidden=false;document.querySelector('.map-area').classList.add('picking');scrollPicker();if(pickOriginal.lat.trim()&&pickOriginal.lng.trim()){const lat=Number(pickOriginal.lat),lng=Number(pickOriginal.lng);if(Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180){state.map.easeTo({center:[lng,lat],zoom:16,duration:0});finishPicking(lng,lat);}}}finally{button.disabled=false;}};
let placeGpsSequence=0;
$('addDialog').addEventListener('close',()=>{++placeGpsSequence;$('placeGps').disabled=false;$('placeGps').removeAttribute('aria-busy');$('placeGps').textContent='Usar mi ubicación';});
$('placeGps').onclick=()=>{const seq=++placeGpsSequence,button=$('placeGps');button.disabled=true;button.setAttribute('aria-busy','true');button.textContent='Buscando ubicación…';$('addStatus').textContent='Buscando tu ubicación. Permite el acceso al GPS y espera un momento.';const done=()=>{if(seq!==placeGpsSequence||!$('addDialog').open)return false;button.disabled=false;button.removeAttribute('aria-busy');button.textContent='Usar mi ubicación';return true;};gps(p=>{if(!done())return;coordinates(p.longitude,p.latitude);$('addStatus').textContent='Ubicación obtenida. Elige en el mapa para comprobar y ajustar el PIN.';},m=>{if(done())$('addStatus').textContent=m;});};
$('addButton').onclick=()=>show('registrationChoiceDialog');
function getRadarLogoutButton(){
 let button=$('radarLogoutButton');
 // A cached Radar shell can be older than the new JS: ensure the control exists.
 if(!button){
  const account=$('accountButton');if(!account)return null;
  button=document.createElement('button');
  button.id='radarLogoutButton';button.type='button';
  button.className='button subtle';button.textContent='Cerrar sesión';button.hidden=true;
  account.after(button);
 }
 return button;
}
function checkSession(){
 if(state.sessionRequest)return state.sessionRequest;
 state.sessionRequest=(async()=>{
  try{
   const response=await fetch('/v1/auth/me',{credentials:'same-origin',cache:'no-store'});
   state.session=response.ok?(await response.json()).user:null;
  }catch{state.session=null;}
  $('accountButton').textContent=state.session?'Mi panel':'Ingresar';
  const logoutButton=getRadarLogoutButton();if(logoutButton)logoutButton.hidden=!state.session;
  $('adminButton').hidden=!state.session?.roles?.includes('ADMIN');
  return state.session;
 })().finally(()=>{state.sessionRequest=null;});
 return state.sessionRequest;
}
async function beginAction(action){saveAction(action);if(action.type==='report'&&anonymousReports){resumeAction(action);return;}if(!await checkSession()){openAccount();return;}resumeAction(action);}
function resumeAction(action){if(!action)return;if(alertsEnabled&&action.type==='alerts-list'){clearAction();openAlerts();return;}if(reputationEnabled&&action.type==='reputation-summary'){clearAction();openReputation();return;}if(contributionsEnabled&&action.type==='contributions-list'){clearAction();openContributions();return;}if(favoritesEnabled&&action.type==='favorites-list'){clearAction();openFavorites();return;}if(favoritesEnabled&&action.type==='favorite-add'){saveFavorite(action);return;}if(action.type==='add'&&registrationKind(action)==='owner'){clearAction();location.assign('https://direcciones.lat/auth/radar?panel=1&add=1');return;}
 if(action.type==='add'){setRegistrationKind($('addForm'),registrationKind(action)||'user');$('addDialog').querySelector('h2').textContent=registrationKind(action)==='owner'?'Registrar mi comercio':'Agregar establecimiento';if(action.draft){$('placeName').value=action.draft.name||'';$('placeCategory').value=action.draft.category||'shop';$('placeCountry').value=action.draft.country||state.country;updateRegistrationTerritoryLabels();coordinates(Number(action.draft.longitude),Number(action.draft.latitude));}renderCategoryRegistrationFields($('businessCategoryFields'),$('placeCategory').value);if(registrationKind(action)==='owner')restoreOwnerRegistration($('addForm'),action.draft?.profile);setOwnerPrivateEnabled($('addForm'),ownerPrivateEnabled&&registrationKind(action)==='owner',$('placeCountry').value);$('addStatus').textContent='';show('addDialog');}if(action.type==='business'){clearAction();location.assign('https://direcciones.lat/auth/radar?panel=1');return;}if(action.type==='report'){state.pending=action;$('reportName').textContent=action.name||'Establecimiento seleccionado';$('reportStatus').textContent='';show('reportDialog');if(action.reportState){const n=$('reportForm').querySelector(`input[value="${['available','queue','full','incident'].includes(action.reportState)?action.reportState:'available'}"]`);n.checked=true;}}}
function openAccount(){location.assign('https://direcciones.lat/auth/radar');}
$('accountButton').onclick=async()=>{if(await checkSession()){location.assign('https://direcciones.lat/auth/radar?panel=1');}else{clearAction();openAccount();}};
const radarLogoutControl=getRadarLogoutButton();
if(radarLogoutControl)radarLogoutControl.onclick=async()=>{
 const button=radarLogoutControl;button.disabled=true;
 try{
  const response=await fetch('/auth/logout',{method:'POST',credentials:'same-origin'});
  if(!response.ok)throw Error();
  state.session=null;clearAction();
  location.replace('https://radar.direcciones.lat/');
 }catch{button.disabled=false;toast('No se pudo cerrar la sesión. Vuelve a intentarlo.');}
};
$('checkSession').onclick=async()=>{if(await checkSession()){close('accountDialog');resumeAction(state.pending);}else $('accountStatus').textContent='La sesión aún no está disponible. Completa el acceso en la tarjeta.';};
async function write(path,body){const r=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(body)});let data={};try{data=await r.json();}catch{}if(!r.ok){const err=Error(({DUPLICATE:'Ya existe un establecimiento con este nombre y ubicación.',REGISTRATION_RATE_LIMIT:'Alcanzaste el límite de registros. Intenta más tarde.',REPORT_RATE_LIMIT:'Espera antes de enviar otro reporte.',FAVORITE_REQUIRED:'Guarda primero este establecimiento en favoritos.',FAVORITE_LIMIT:'Puedes guardar hasta 100 establecimientos. Elimina un favorito para agregar otro.',ESTABLISHMENT_UNAVAILABLE:'Este establecimiento ya no está disponible.',CONFIRMATION_RATE_LIMIT:'Espera antes de volver a validar.',ALREADY_VALIDATED_OR_OWN_REPORT:'Ya validaste esta actividad o es tu propio reporte.',REPORT_UNAVAILABLE:'Este reporte ya no está disponible.',AUTH_REQUIRED:'Esta acción requiere una sesión o participación anónima habilitada.',REGISTRATION_DISABLED:'El registro está deshabilitado en este entorno.',OWNER_REGISTRATION_DISABLED:'El registro de propietarios todavía no está disponible.',VERIFICATION_DISABLED:'La administración de fichas aún no está habilitada en este entorno.',OWNER_REQUIRED:'Solo el propietario aprobado puede modificar esta ficha.',CLAIM_UNAVAILABLE:'La solicitud ya existe o alcanzaste el límite de solicitudes pendientes.',INVALID_BUSINESS:'Revisa los horarios y la cantidad disponible.',FORBIDDEN:'Esta acción requiere acceso administrativo.',RADAR_DISABLED:'Radar no está habilitado en este entorno.',INVALID_ESTABLISHMENT:'Revisa el nombre, categoría y coordenadas.',INVALID_REPORT:'Revisa la actividad seleccionada.',PREVIEW_READ_ONLY:'Esta vista previa permite explorar. Las escrituras y el acceso real se verifican en staging.'})[data.error]||'No se pudo completar la solicitud. Intenta nuevamente.');err.status=r.status;err.code=data.error;throw err;}return data;}
function setBusy(form,busy){for(const b of form.querySelectorAll('button[type=submit],button:not([type])'))b.disabled=busy;}
$('addForm').onsubmit=async e=>{e.preventDefault();const draft={name:$('placeName').value.trim(),category:$('placeCategory').value,country:$('placeCountry').value,latitude:Number($('latitude').value),longitude:Number($('longitude').value)};const kind=e.target.dataset.registrationKind||'user';if(kind==='owner'){if(!ownerRegistrationEnabled){$('addStatus').textContent='El registro de propietarios todavía no está disponible.';return;}try{draft.registrationKind='owner';draft.profile=collectOwnerRegistration(e.target);if(ownerPrivateEnabled)draft.ownerPrivate=collectOwnerPrivate(e.target);}catch(err){$('addStatus').textContent=err.message;return;}}const action={...registrationIntent(kind),draft};saveAction(action);if(!await checkSession()){openAccount();return;}setBusy(e.target,true);$('addStatus').textContent='Publicando establecimiento…';try{const result=await write('/v1/radar/establishments',draft);clearAction();e.target.reset();close('addDialog');if(kind==='owner'){location.assign('https://direcciones.lat/auth/radar?panel=1');return;}toast('Establecimiento publicado correctamente.');if(state.country!==draft.country)setCountry(draft.country,false);$('searchInput').value='';$('category').value='';$('activity').value='';$('territory').value='';await initMap();if(state.map){state.revealZoom=Math.min(state.revealZoom,14);state.resetZoom=false;nearbyTarget=result.id;state.map.easeTo({center:[draft.longitude,draft.latitude],zoom:16,duration:reduced.matches?0:700});scrollPicker();}refreshMapData();}catch(err){$('addStatus').textContent=err.message;if(err.code==='AUTH_REQUIRED')openAccount();}finally{setBusy(e.target,false);}};
$('reportForm').onsubmit=async e=>{e.preventDefault();const reportState=new FormData(e.target).get('state'),action={...state.pending,reportState};saveAction(action);if(!anonymousReports&&!await checkSession()){openAccount();return;}setBusy(e.target,true);$('reportStatus').textContent='Publicando actividad…';try{await write('/v1/radar/report',{id:action.id,state:reportState});clearAction();close('reportDialog');toast('Actividad publicada. Gracias por compartir.');refreshMapData();}catch(err){$('reportStatus').textContent=err.message;if(err.code==='AUTH_REQUIRED')openAccount();}finally{setBusy(e.target,false);}};
let validationSequence=0,validationReport=null,validationFeature=null;
async function openValidation(f){const seq=++validationSequence;validationFeature=f;validationReport=null;$('validationName').textContent=f.properties.name;$('validationStatus').textContent='Consultando actividad reciente…';$('validationSummary').textContent='';$('validationDistance').textContent='';$('validationVote').hidden=true;show('validationDialog');try{const r=await fetch('/v1/radar/activity-validation?id='+encodeURIComponent(f.id),{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw Error('No se pudo consultar la actividad.');const data=await r.json();if(seq!==validationSequence||!$('validationDialog').open)return;const report=data.report;if(!report||!activityLabels[report.state]||Date.now()-Number(report.reportedAt)>=1800000){$('validationStatus').textContent='Pendiente de actualización.';return;}validationReport=report;$('validationSummary').textContent=activityLabels[report.state]+' · '+Number(report.confirmations)+' confirmaciones · '+Number(report.contradictions)+' contradicciones';$('validationStatus').textContent='¿Coincide con lo que observas ahora?';$('validationVote').hidden=false;}catch(err){if(seq===validationSequence)$('validationStatus').textContent=err.message;}}
$('validationGps').onclick=()=>{const seq=validationSequence,f=validationFeature;if(!f)return;gps(p=>{if(seq!==validationSequence||!$('validationDialog').open)return;const km=distanceKm(p.latitude,p.longitude,f.geometry.coordinates[1],f.geometry.coordinates[0]);$('validationDistance').textContent=Number.isFinite(km)?'Distancia aproximada: '+(km<1?Math.round(km*1000)+' m':km.toFixed(1)+' km')+'. Tu ubicación no se envía.':'No se pudo calcular la distancia.';},m=>{if(seq===validationSequence)$('validationDistance').textContent=m;});};
for(const b of $('validationVote').querySelectorAll('button'))b.onclick=async()=>{const seq=validationSequence,report=validationReport;if(!report)return;const buttons=$('validationVote').querySelectorAll('button');for(const n of buttons)n.disabled=true;try{await write('/v1/radar/activity-validation',{reportId:report.id,agrees:b.dataset.agrees==='true'});if(seq!==validationSequence||!$('validationDialog').open)return;$('validationStatus').textContent='Gracias. Tu validación quedó registrada.';$('validationVote').hidden=true;validationReport=null;refreshMapData();}catch(err){if(seq===validationSequence)$('validationStatus').textContent=err.message;}finally{for(const n of buttons)n.disabled=false;}};
document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();scheduleLoad(0);}});
countryOptions();updateRegistrationTerritoryLabels();territoryOptions();state.bounds=countries.PA.bounds;
const stored=readStorage();if(stored&&Date.now()-stored.savedAt<30*60*1000&&['add','report','business','favorite-add','favorites-list','contributions-list','reputation-summary','alerts-list'].includes(stored.type)){state.pending=stored;if(countries[stored.country])setCountry(stored.country,false);checkSession().then(user=>{if(user)resumeAction(stored);});}else clearAction();
checkSession();scheduleLoad(0);
if(ownerPicker){
 const lat=Number(ownerPickerParams.get('lat')),lng=Number(ownerPickerParams.get('lng'));
 if(ownerPickerParams.has('lat')&&ownerPickerParams.has('lng')&&Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180)coordinates(lng,lat);
 show('addDialog');$('pickButton').click();
}

// Default to exploration on a fresh visit; respect explicit anchors and restored history.
const navigation=performance.getEntriesByType('navigation')[0];
if(!location.hash&&!state.pending&&(!navigation||navigation.type==='navigate')){
  $('explorar').scrollIntoView({behavior:'instant',block:'start'});
}
const mapObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){initMap();mapObserver.disconnect();}},{rootMargin:'350px'});mapObserver.observe($('map'));
refreshTimer=setInterval(()=>{if(!document.hidden){render();scheduleLoad(0);}},60000);
if(!lowPower()){const start=()=>import('./motion.js').then(m=>m.enhance(reduced)).catch(()=>{});if('requestIdleCallback'in window)requestIdleCallback(start,{timeout:2500});else setTimeout(start,1200);}

function appendBusinessDetails(d,p){renderCommercialDetails(d,p);}
