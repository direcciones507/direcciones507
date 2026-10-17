// Extends existing ADMIN, retaining its session and authorization.
export const planAdminScript=String.raw`
(async function(){
 const host=document.getElementById('statsView');if(!host)return;
 const section=document.createElement('section');section.className='tile';
 const title=document.createElement('h2');title.textContent='Vigencias y renovaciones';section.append(title);
 const country=document.createElement('select');country.setAttribute('aria-label','País de los planes');
 for(const code of ['', 'PA','CO','CR','GT','SV','HN','NI','MX']){const o=document.createElement('option');o.value=code;o.textContent=code||'Todos los países';country.append(o)}
 const plan=document.createElement('select');plan.setAttribute('aria-label','Plan');
 for(const [value,label]of [['','Todos los planes'],['BUSINESS_PREMIUM','Premium'],['BUSINESS_PREMIUM_PRO','Premium Pro']]){const o=document.createElement('option');o.value=value;o.textContent=label;plan.append(o)}
 const search=document.createElement('input');search.placeholder='Buscar código';search.maxLength=100;search.setAttribute('aria-label','Buscar código');
 const button=document.createElement('button');button.className='btn';button.textContent='Consultar vigencias';
 const result=document.createElement('div');result.setAttribute('role','status');section.append(country,plan,search,button,result);host.append(section);
 button.onclick=async()=>{button.disabled=true;try{
  const p=new URLSearchParams();if(country.value)p.set('country',country.value);if(plan.value)p.set('plan',plan.value);if(search.value)p.set('code',search.value);
  const response=await fetch('/v1/admin/plan-lifecycle?'+p,{credentials:'same-origin',cache:'no-store'});
  if(!response.ok){result.textContent=response.status===503?'Automatización pendiente de activación.':'No se pudieron consultar las vigencias.';return}
  const d=await response.json();result.replaceChildren();
  for(const [key,label]of [['active','Activos'],['expiring','Próximos a vencer'],['expired','Vencidos'],['renewed','Renovados']]){const p=document.createElement('p');p.textContent=label+': '+d.counts[key];result.append(p)}
  const note=document.createElement('p');note.textContent='Mostrando '+d.items.length+' de '+d.total+' resultados. Refina los filtros para ver otros códigos.';result.append(note);
  for(const item of d.items){const p=document.createElement('p');p.textContent=item.code+' · '+item.country_code+' · '+({ACTIVE:'Activo',EXPIRING:'Próximo a vencer',EXPIRED:'Vencido'})[item.state]+' · '+(item.expires_at?new Date(item.expires_at).toLocaleString():'Sin vencimiento')+' · Renovaciones: '+item.renewals+' · Correos con incidencia: '+item.failed_mail;result.append(p)}
 }catch{result.textContent='No se pudieron consultar las vigencias.'}finally{button.disabled=false}};
})();
`;
