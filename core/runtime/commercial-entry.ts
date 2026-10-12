import {latamWelcome} from './latam-presentation';
import {INITIAL_COUNTRIES,COUNTRIES,requestCountry} from './country-configuration';

export function commercialEntryContext(url:URL){
 let country='PA';try{country=requestCountry(url.searchParams.get('country')??'PA');}catch{}
 const international=url.hostname==='direcciones.lat'||url.pathname.endsWith('/international');
 return {country,international,canonical:international?'https://direcciones.lat/':'https://direcciones507.com/commercial/panama',
   title:international?'Direcciones LATAM | Direcciones comerciales':'Direcciones507 | Direcciones comerciales',
   description:international?'Una plataforma de direcciones comerciales para Latinoamérica.':'Direcciones507: direcciones comerciales, ubicación, contacto y QR para Panamá.'};
}
/** Explicit opt-in routing proposal. Never intercept historical codes, assets or APIs. */
export function sharedCommercialRoot(req:Request,env:Record<string,string|undefined>){
 const u=new URL(req.url);
 if(req.method!=='GET'||u.pathname!=='/'||env.AD507_SHARED_COMMERCIAL_ENTRY_ENABLED!=='true')return false;
 if(u.hostname==='direcciones507.com')return false; // Preserve the historical homepage and its indexation.
 return u.hostname==='direcciones.lat'&&env.AD507_INTERNATIONAL_DOMAIN_VERIFIED==='true';
}
export function commercialNavigation(country='PA',international=true){
 requestCountry(country);
 if(international)return latamWelcome(country,COUNTRIES,INITIAL_COUNTRIES);
 const brand=international?'Direcciones LATAM':'Direcciones507';
 return '<section class="card" id="commercialWelcome"><h1 style="color:#0b57d0">'+brand+'</h1><p id="commercialIdentity">'+(country==='PA'?'Direcciones507 · Panamá':'Direcciones LATAM · '+COUNTRIES[country as keyof typeof COUNTRIES].name)+'</p><label for="commercialCountry">País</label><select id="commercialCountry">'+INITIAL_COUNTRIES.map(c=>'<option value="'+c+'"'+(c===country?' selected':'')+'>'+COUNTRIES[c].name+'</option>').join('')+'</select><nav aria-label="Presencia comercial"><a href="?country=PA" data-commercial-country="PA">Panamá · Direcciones507</a> · <a href="?country=CO" data-commercial-country="CO">Presencia internacional</a></nav><p id="commercialAvailability" role="status"></p><h2>Servicios y planes</h2><p>Residencial · Lugar · Negocio Gratis · Premium · Premium Pro</p><p>Ubicación, contacto, mapas y QR en una plataforma. Las capacidades y precios de Panamá conservan su autoridad vigente. Los países extranjeros están en preparación.</p></section>';
}
/** Same document navigation retains all input values and File objects. No PII in URLs/storage. */
export function initializeCommercialNavigation(){
 const select=document.getElementById('commercialCountry') as HTMLSelectElement|null;
 if(!select)return;
 const formCountry=document.getElementById('countryCode') as HTMLSelectElement;
 const refresh=()=>{
   const country=select.value,panama=country==='PA';
   document.getElementById('commercialIdentity')!.textContent=panama?'Direcciones507 · Panamá':'Direcciones LATAM · '+select.selectedOptions[0].textContent;
   document.getElementById('commercialAvailability')!.textContent=panama?'Panamá: revisa el estado de habilitación al ingresar.':'País en preparación: publicación y cobros deshabilitados.';
   // Changing geography does not erase family/business data or selected photos.
   formCountry.value=country;formCountry.dispatchEvent(new Event('change'));
 };
 formCountry.addEventListener('change',()=>{if(select.value!==formCountry.value){select.value=formCountry.value;select.dispatchEvent(new Event('change'));}});
 select.onchange=()=>{const u=new URL(location.href);u.searchParams.set('country',select.value);history.pushState({},'',u.pathname+u.search);refresh();};
 document.querySelectorAll<HTMLAnchorElement>('[data-commercial-country]').forEach(a=>a.onclick=e=>{e.preventDefault();select.value=a.dataset.commercialCountry!;select.dispatchEvent(new Event('change'));});
 addEventListener('popstate',()=>{const c=new URL(location.href).searchParams.get('country')??'PA';if(Array.from(select.options).some(o=>o.value===c))select.value=c;else select.value='PA';refresh();});
 refresh();
}
