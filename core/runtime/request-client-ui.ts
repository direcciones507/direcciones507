import { addressEditScript } from './address-edit-ui';
// Read-only detail inside the existing account panel. Authorization stays server-side.
export const requestClientScript=addressEditScript+String.raw`
let requestDetailVersion=0;
async function openUserRequest(id,editing=false){
  if(!/^[a-f0-9-]{36}$/.test(id))return;
  const version=++requestDetailVersion,view=document.getElementById('requestDetail');
  document.getElementById('newRequestContent')?.classList.add('hidden');document.getElementById('requestForm')?.classList.add('hidden');const toggle=document.getElementById('toggleNewRequest');if(toggle)toggle.setAttribute('aria-expanded','false');const chevron=document.getElementById('newRequestChevron');if(chevron)chevron.textContent='▾';
  view.classList.remove('hidden');view.replaceChildren();
  const close=document.createElement('button');close.type='button';close.textContent='Cerrar detalle';close.className='secondary';
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
    add('Código',r.code);if(r.type==='PLACE'||r.extras?.plan==='BUSINESS_PREMIUM_PRO')add('Descripción',r.description);add('Referencia',r.reference);add('Ubicación',r.latitude+', '+r.longitude);
    add('País',countrySettings[r.countryCode||'PA']?.name||r.countryCode);add('Zona',Object.values(r.extras?.territory||{}).filter(Boolean).join(' · '));
    add('Teléfono',r.phone);add('Teléfono fijo',r.landlinePhone);add('Correo',r.extras?.email);add('Horario',r.hours);add('Descripción comercial',r.commercialDescription);
    for(const m of r.media||[]){if(m.status!=='READY')continue;const img=document.createElement('img');img.alt=m.type==='LOGO'?'Logo enviado':'Fotografía enviada';img.loading='lazy';img.style.cssText='display:block;max-width:100%;max-height:360px;object-fit:contain;margin:14px 0';img.src='/v1/user/requests/'+id+'/media/'+m.id;content.append(img)}
    if(r.latitude!=null&&r.longitude!=null){const link=document.createElement('a');link.textContent='Ver ubicación en Google Maps';link.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(r.latitude+','+r.longitude);link.target='_blank';link.rel='noopener';content.append(link)}

    const editButton=mountAddressEditor(content,r,false,async()=>{await load();await openUserRequest(id)});if(editing&&editButton)editButton.click();
    title.focus({preventScroll:true});
  }catch{if(version===requestDetailVersion)content.textContent='No se pudo cargar la solicitud. Cierra el detalle e intenta nuevamente.'}
}
document.getElementById('addresses').addEventListener('click',async e=>{
  const edit=e.target.closest('[data-edit-address]');if(edit){openUserRequest(edit.dataset.editAddress,true);return;}
  const copy=e.target.closest('[data-copy-code]');
  if(copy){
    copy.disabled=true;
    try{
      const code=copy.dataset.copyCode;
      if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(code);
      else{const input=document.createElement('textarea');input.value=code;input.style.cssText='position:fixed;left:-9999px';document.body.append(input);input.select();const ok=document.execCommand('copy');input.remove();copy.focus();if(!ok)throw Error()}
      document.getElementById('message').textContent='Código copiado.';
    }catch{document.getElementById('message').textContent='No se pudo copiar. Puedes seleccionar el código de la tarjeta.'}
    finally{copy.disabled=false}return;
  }
  const card=e.target.closest('[data-request]');
  if(card&&!e.target.closest('a')&&(!e.target.closest('button')||e.target.closest('[data-request-detail]')))openUserRequest(card.dataset.request);
});
`;
