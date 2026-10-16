// Extends the existing Requests view. No independent administrator or identity.
export const requestAdminScript=String.raw`
function reviewLabel(v){return ({PLACE:'Lugar',BUSINESS:'Negocio',RESIDENTIAL:'Residencial',ACTIVE:'Activa',PENDING_REVIEW:'En revisión',APPROVED:'Aprobada',REJECTED:'Rechazada',READY:'Lista',PENDING:'Pendiente',LOGO:'Logo',IMAGE:'Fotografía'})[v]||v||''}
async function openRequestReview(id){
  const rows=document.getElementById('requestsRows');rows.textContent='Cargando solicitud…';
  try{
    const response=await fetch('/v1/admin/requests/'+id,{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw Error();
    const {request:r}=await response.json();
    rows.innerHTML='<article class="tile"><h3 style="margin:0 0 12px">Detalle de solicitud</h3><b>'+esc(r.name)+'</b><p>'+esc(reviewLabel(r.type))+' · '+esc(r.extras.plan)+' · '+esc(reviewLabel(r.status))+'</p><p>'+'<strong>Descripción:</strong> '+esc(r.description||'No indicada')+'</p><p>'+'<strong>Referencia:</strong> '+esc(r.reference||'No indicada')+'</p><p>'+esc(r.latitude)+', '+esc(r.longitude)+'</p><p>'+'<strong>Teléfonos:</strong> '+esc([r.phone,r.landlinePhone].filter(Boolean).join(' · ')||'No indicados')+'</p><p>'+'<strong>Correo:</strong> '+esc(r.extras.email||'No indicado')+'</p><p>'+esc(r.commercialDescription||'')+'</p><p>'+'<strong>Horario:</strong> '+esc(r.hours||'No indicado')+'</p><p>'+esc(r.extras.postalCode||'')+' '+esc(r.extras.postalZone||'')+'</p><p>Código solicitado: '+esc(r.extras.namedCode||'')+'</p>'+r.socials.map(s=>'<p>'+esc(s.platform)+': '+esc(s.url)+'</p>').join('')+r.media.map((m,i)=>'<div><span>'+esc(r.type==='PLACE'?(i===0?'Foto de portada':'Foto adicional '+i):m.type)+' · '+esc(reviewLabel(m.status))+'</span>'+(m.status==='READY'?'<img alt="Archivo de la solicitud" style="max-width:100%;max-height:240px" src="'+esc(m.url||('/v1/admin/requests/'+id+'/media/'+m.id))+'">':'')+'</div>').join('')+'<p>País: '+esc(r.countryCode||r.extras.countryCode||'PA')+'</p><p>'+esc(Object.values(r.extras.territory||{}).filter(Boolean).join(' · '))+'</p>'+'<p>Decisión: '+esc(reviewLabel(r.review)||'Pendiente')+'</p><div id="reviewActions"></div><p id="reviewMessage" role="status"></p></article>';
    const actions=document.getElementById('reviewActions');
    if(r.publicUrl){const link=document.createElement('a');link.className='btn google';link.textContent='Abrir dirección digital';link.href=r.publicUrl;link.target='_blank';link.rel='noopener';actions.append(link);}
    if(r.extras.migration){const download=document.createElement('a');download.className='btn google';download.textContent='Descargar ficha de transición';download.href='/v1/admin/requests/'+id+'/bridge';actions.append(download);}
    if(r.extras.createdByAdmin&&r.ownerId){
      const select=document.createElement('select');select.setAttribute('aria-label','Cliente destinatario');
      const usersResponse=await fetch('/v1/admin/users',{credentials:'same-origin',cache:'no-store'});if(!usersResponse.ok)throw Error();
      const users=await usersResponse.json();
      for(const u of users.users.filter(u=>u.status==='ACTIVE'&&(u.roles.includes('CLIENT')||u.id===r.extras.createdByAdmin))){const option=document.createElement('option');option.value=u.id;option.textContent=u.email;option.selected=u.id===r.ownerId;select.append(option)}
      actions.append(select);const transfer=document.createElement('button');transfer.className='btn google';transfer.textContent='Transferir administración';actions.append(transfer);
      transfer.onclick=async()=>{if(!select.value||select.value===r.ownerId)return;if(!confirm('¿Transferir esta dirección a '+select.selectedOptions[0].textContent+'?'))return;transfer.disabled=true;
        try{const response=await fetch('/v1/admin/requests/'+id+'/transfer',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({expectedOwner:r.ownerId,targetId:select.value})});if(!response.ok)throw Error();await openRequestReview(id)}catch{document.getElementById('reviewMessage').textContent='No se pudo transferir. Actualiza y comprueba el propietario actual.';transfer.disabled=false}};
    }

    for(const [action,label]of [['approve','Aprobar'],['reject','Rechazar'],['publish','Publicar'],['rollback','Restaurar publicación antigua']]){
      if(action==='publish'&&(r.countryCode||r.extras.countryCode||'PA')!=='PA')continue;
      if(action==='rollback'){if(!r.extras.migration||r.status!=='ACTIVE')continue;}else if(action==='publish'){if(!['PENDING_REVIEW',...(r.extras.migration?['SUSPENDED']:[])].includes(r.status)||r.review!=='APPROVED')continue;}else if(r.status!=='PENDING_REVIEW'||r.review)continue;
      const button=document.createElement('button');button.className='btn google';button.textContent=label;actions.append(button);
      button.onclick=async()=>{button.disabled=true;try{const reply=await fetch('/v1/admin/requests/'+id+'/'+action,{method:'POST',credentials:'same-origin'});const body=await reply.json();if(!reply.ok){document.getElementById('reviewMessage').textContent=body.error==='CANONICAL_PUBLICATION_NOT_READY'?'Publicación bloqueada hasta verificar el asignador y el publicador.':'No se pudo completar la operación. La solicitud se conserva.';button.disabled=false;return}await openRequestReview(id)}catch{document.getElementById('reviewMessage').textContent='No se pudo completar la operación. Intenta nuevamente.';button.disabled=false}};
    }
  }catch{rows.textContent='No se pudo cargar la solicitud.'}
}
`;
