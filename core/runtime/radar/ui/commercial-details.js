// Public information only; use text nodes and validated external destinations.
export function renderCommercialDetails(target,p,doc=document){
 const node=(tag,text)=>{const n=doc.createElement(tag);n.textContent=text;return n;};
 const profile=p.registrationProfile||{},details=p.details||{};
 if(p.verifiedOwner===true)target.append(node('p','Negocio verificado'));
 const area=[profile.province,profile.locality].filter(v=>typeof v==='string'&&v.trim()).join(' · ');
 if(area)target.append(node('p',area));
 if(typeof profile.description==='string'&&profile.description)target.append(node('p',profile.description));
 if(typeof profile.phone==='string'&&/^[+0-9 ()-]{5,32}$/.test(profile.phone)){
  const a=node('a','Llamar · '+profile.phone);a.href='tel:'+profile.phone.replace(/[^+0-9]/g,'');a.className='button subtle';target.append(a);
 }
 const labels={cuisine:'Tipo de cocina',services:'Servicios',accommodation:'Alojamiento',products:'Productos',experiences:'Experiencias',access:'Acceso'};
 for(const [key,label] of Object.entries(labels))if(typeof profile.extras?.[key]==='string'&&profile.extras[key])target.append(node('p',label+': '+profile.extras[key]));
 for(const value of Array.isArray(profile.socials)?profile.socials.slice(0,8):[]){try{
  const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443')continue;
  const a=node('a',u.hostname.replace(/^www\./,''));a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';a.className='button subtle';target.append(a);
 }catch{}}
 // One effective schedule avoids displaying the original and edited hours twice.
 const hours=details.hours&&Object.keys(details.hours).length?details.hours:profile.hours;
 if(hours&&Object.keys(hours).length){target.append(node('h4','Horario de atención'));
  for(const [day,label] of Object.entries({monday:'Lunes',tuesday:'Martes',wednesday:'Miércoles',thursday:'Jueves',friday:'Viernes',saturday:'Sábado',sunday:'Domingo'})){
   const value=hours[day];if(value==='closed'||typeof value==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d-(?:[01]\d|2[0-3]):[0-5]\d$/.test(value))target.append(node('p',label+': '+(value==='closed'?'Cerrado':value.replace('-',' – '))));
  }
 }
 if(Number.isInteger(details.quantity)&&details.quantity>=0)target.append(node('p',details.quantity+' '+({tables:'mesas',rooms:'habitaciones',places:'cupos',units:'unidades'}[details.unit]||'unidades')+' disponibles'));
}
