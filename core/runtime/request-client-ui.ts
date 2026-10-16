// Read-only detail inside the existing account panel. Authorization stays server-side.
export const requestClientScript=String.raw`
let requestDetailVersion=0;
async function openUserRequest(id){
  if(!/^[a-f0-9-]{36}$/.test(id))return;
  const version=++requestDetailVersion,view=document.getElementById('requestDetail');
  view.classList.remove('hidden');view.replaceChildren();
  const close=document.createElement('button');close.type='button';close.textContent='Cerrar detalle';
  close.onclick=()=>{requestDetailVersion++;view.classList.add('hidden');document.querySelector('[data-request="'+id+'"]')?.focus()};view.append(close);
  const content=document.createElement('div');content.textContent='Cargando solicitud…';view.append(content);
  view.scrollIntoView({block:'start',behavior:'smooth'});
  try{
    const response=await fetch('/v1/user/requests/'+id,{credentials:'same-origin',cache:'no-store'});
    if(!response.ok)throw Error();const {request:r}=await response.json();if(version!==requestDetailVersion)return;
    content.replaceChildren();const title=document.createElement('h2');title.textContent=r.name;title.tabIndex=-1;content.append(title);
    const labels={ACTIVE:'Activa',PENDING_REVIEW:'En revisión',DRAFT:'Borrador',SUSPENDED:'Suspendida',DISABLED:'Desactivada',ARCHIVED:'Archivada'};
    const add=(label,value)=>{if(value===undefined||value===null||value==='')return;const p=document.createElement('p'),b=document.createElement('strong');b.textContent=label+': ';p.append(b,document.createTextNode(String(value)));p.style.overflowWrap='anywhere';content.append(p)};
    add('Tipo',({PLACE:'Lugar',BUSINESS:'Negocio',RESIDENTIAL:'Residencial'})[r.type]||r.type);add('Estado',labels[r.status]||r.status);
    add('Código',r.code);add('Descripción',r.description);add('Referencia',r.reference);add('Ubicación',r.latitude+', '+r.longitude);
    add('País',countrySettings[r.countryCode||'PA']?.name||r.countryCode);add('Zona',Object.values(r.extras?.territory||{}).filter(Boolean).join(' · '));
    add('Teléfono',r.phone);add('Teléfono fijo',r.landlinePhone);add('Correo',r.extras?.email);add('Horario',r.hours);add('Descripción comercial',r.commercialDescription);
    for(const m of r.media||[]){if(m.status!=='READY')continue;const img=document.createElement('img');img.alt=m.type==='LOGO'?'Logo enviado':'Fotografía enviada';img.loading='lazy';img.style.cssText='display:block;max-width:100%;max-height:360px;object-fit:contain;margin:14px 0';img.src='/v1/user/requests/'+id+'/media/'+m.id;content.append(img)}
    if(r.latitude!=null&&r.longitude!=null){const link=document.createElement('a');link.textContent='Ver ubicación en Google Maps';link.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(r.latitude+','+r.longitude);link.target='_blank';link.rel='noopener';content.append(link)}
    if(r.publicUrl){const link=document.createElement('a');link.textContent='Abrir ficha, enlace y QR';link.href=r.publicUrl;link.className='btn';link.target='_blank';link.rel='noopener';content.append(link)}
    title.focus({preventScroll:true});
  }catch{if(version===requestDetailVersion)content.textContent='No se pudo cargar la solicitud. Cierra el detalle e intenta nuevamente.'}
}
document.getElementById('addresses').addEventListener('click',e=>{const card=e.target.closest('[data-request]');if(card&&!e.target.closest('a'))openUserRequest(card.dataset.request)});
document.getElementById('addresses').addEventListener('keydown',e=>{if(e.target.matches('[data-request]')&&['Enter',' '].includes(e.key)){e.preventDefault();openUserRequest(e.target.dataset.request)}});
`;
