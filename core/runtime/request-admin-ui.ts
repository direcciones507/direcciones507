// Extends the existing Requests view. No independent administrator or identity.
export const requestAdminScript=String.raw`
async function openRequestReview(id){
  const rows=document.getElementById('requestsRows');rows.textContent='Cargando solicitud…';
  try{
    const response=await fetch('/v1/admin/requests/'+id,{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw Error();
    const {request:r}=await response.json();
    rows.innerHTML='<article class="tile"><b>'+esc(r.name)+'</b><p>'+esc(r.type)+' · '+esc(r.extras.plan)+' · '+esc(r.status)+'</p><p>'+esc(r.description)+'</p><p>'+esc(r.reference)+'</p><p>'+esc(r.latitude)+', '+esc(r.longitude)+'</p><p>'+esc(r.phone||'')+' '+esc(r.landlinePhone||'')+'</p><p>'+esc(r.extras.email||'')+'</p><p>'+esc(r.commercialDescription||'')+'</p><p>'+esc(r.hours||'')+'</p><p>'+esc(r.extras.postalCode||'')+' '+esc(r.extras.postalZone||'')+'</p>'+r.media.map(m=>'<div><span>'+esc(m.type)+' · '+esc(m.status)+'</span>'+(m.status==='READY'?'<img alt="Archivo de la solicitud" style="max-width:100%;max-height:240px" src="/v1/admin/requests/'+id+'/media/'+m.id+'">':'')+'</div>').join('')+'<p>Decisión: '+esc(r.review||'Pendiente')+'</p><div id="reviewActions"></div><p id="reviewMessage" role="status"></p></article>';
    const actions=document.getElementById('reviewActions');
    for(const [action,label]of [['approve','Aprobar'],['reject','Rechazar'],['publish','Publicar']]){
      if(r.status!=='PENDING_REVIEW'||(action==='publish'?r.review!=='APPROVED':!!r.review))continue;
      const button=document.createElement('button');button.className='btn google';button.textContent=label;actions.append(button);
      button.onclick=async()=>{button.disabled=true;try{const reply=await fetch('/v1/admin/requests/'+id+'/'+action,{method:'POST',credentials:'same-origin'});const body=await reply.json();if(!reply.ok){document.getElementById('reviewMessage').textContent=body.error==='CANONICAL_PUBLICATION_NOT_READY'?'Publicación bloqueada hasta verificar el asignador y el publicador.':'No se pudo completar la operación. La solicitud se conserva.';button.disabled=false;return}await openRequestReview(id)}catch{document.getElementById('reviewMessage').textContent='No se pudo completar la operación. Intenta nuevamente.';button.disabled=false}};
    }
  }catch{rows.textContent='No se pudo cargar la solicitud.'}
}
`;
