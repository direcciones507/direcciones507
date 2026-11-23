// Public information only; use text nodes and validated external destinations.
export function renderCommercialDetails(target,p,doc=document){
 const node=(tag,text)=>{const n=doc.createElement(tag);n.textContent=text;return n;};
 const profile=p.registrationProfile||{},details=p.details||{};
 if(p.verifiedOwner===true)target.append(node('p','Negocio verificado'));
 const area=[profile.province,profile.locality].filter(v=>typeof v==='string'&&v.trim()).join(' · ');
 if(area)target.append(node('p',area));
 if(typeof profile.description==='string'&&profile.description)target.append(node('p',profile.description));
 // Phone numbers remain in the contact profile; the public card shows only the optional WhatsApp icon.
 const labels={cuisine:'Tipo de cocina',services:'Servicios',accommodation:'Alojamiento',products:'Productos',experiences:'Experiencias',access:'Acceso'};
 for(const [key,label] of Object.entries(labels))if(typeof profile.extras?.[key]==='string'&&profile.extras[key])target.append(node('p',label+': '+profile.extras[key]));
 for(const value of Array.isArray(profile.socials)?profile.socials.slice(0,8):[]){try{
  const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443')continue;
  const host=u.hostname.replace(/^www\./,'');
  const a=node('a',host==='tiktok.com'||host.endsWith('.tiktok.com')?'TikTok':host);a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';a.className='button subtle';target.append(a);
 }catch{}}
 // One effective schedule avoids displaying the original and edited hours twice.
 const hours=details.hours&&Object.keys(details.hours).length?details.hours:profile.hours;
 if(hours&&Object.keys(hours).length){target.append(node('h4','Horario de atención'));
  for(const [day,label] of Object.entries({monday:'Lunes',tuesday:'Martes',wednesday:'Miércoles',thursday:'Jueves',friday:'Viernes',saturday:'Sábado',sunday:'Domingo'})){
   const value=hours[day];if(value==='closed'||typeof value==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d-(?:[01]\d|2[0-3]):[0-5]\d$/.test(value))target.append(node('p',label+': '+(value==='closed'?'Cerrado':value.replace('-',' – '))));
  }
 }
 const capacity=profile.capacity,unitNames={tables:'mesas',rooms:'habitaciones',places:'cupos',units:'unidades'};
 if(Number.isInteger(capacity?.total)&&capacity.total>=0&&Object.hasOwn(unitNames,capacity.unit))target.append(node('p','Capacidad total: '+capacity.total+' '+unitNames[capacity.unit]));
 if(Number.isInteger(details.quantity)&&details.quantity>=0)target.append(node('p',details.quantity+' '+({tables:'mesas',rooms:'habitaciones',places:'cupos',units:'unidades'}[details.unit]||'unidades')+' disponibles'));
}

export function commercialWhatsapp(p,doc=document){
 const number=p.registrationProfile?.whatsapp;if(typeof number!=='string'||!/^\+[1-9][0-9]{6,14}$/.test(number))return null;
 const a=doc.createElement('a');a.href='https://wa.me/'+number.slice(1);a.target='_blank';a.rel='noopener noreferrer';a.className='commercial-whatsapp';a.setAttribute('aria-label','Contactar por WhatsApp');a.title='WhatsApp';
 const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 32 32');svg.setAttribute('aria-hidden','true');const path=doc.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('fill','currentColor');path.setAttribute('d','M16 3a13 13 0 0 0-11 20L3 29l6-2A13 13 0 1 0 16 3zm0 2a11 11 0 1 1-6 20l-4 1 1-4A11 11 0 0 1 16 5zm-5 5c-2 0-3 2-2 5 2 5 7 8 11 8 2 0 4-2 3-3l-4-2-2 2c-3-1-5-3-6-5l2-2-2-3z');svg.append(path);a.append(svg);return a;
}

/** A conservative compact status, only when a valid schedule and local time zone exist. */
export function commercialOpenStatus(p,now=new Date()){
 const zones={PA:'America/Panama',CO:'America/Bogota',CR:'America/Costa_Rica',GT:'America/Guatemala',SV:'America/El_Salvador',HN:'America/Tegucigalpa',NI:'America/Managua',MX:'America/Mexico_City'};
 const zone=zones[p.country];if(!zone)return null;
 const details=p.details||{},profile=p.registrationProfile||{};
 const hours=details.hours&&Object.keys(details.hours).length?details.hours:profile.hours;
 if(!hours||typeof hours!=='object')return null;
 const days=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const get=type=>parts.find(part=>part.type===type)?.value;
 const today={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[get('weekday')];
 if(today===undefined)return null;
 const minute=Number(get('hour'))*60+Number(get('minute'));
 const parse=value=>{
  if(typeof value!=='string'||!/^([01]\\d|2[0-3]):[0-5]\\d-([01]\\d|2[0-3]):[0-5]\\d$/.test(value))return null;
  const [start,end]=value.split('-').map(t=>Number(t.slice(0,2))*60+Number(t.slice(3)));
  return {start,end};
 };
 const current=parse(hours[days[today]]),previous=parse(hours[days[(today+6)%7]]);
 if(previous&&previous.end<=previous.start&&minute<previous.end)return minute>=previous.end-60?'Cierra pronto':'Abierto ahora';
 if(current){
  const opened=minute>=current.start&&(current.end>current.start?minute<current.end:true);
  if(opened)return current.end>current.start&&minute>=current.end-60?'Cierra pronto':'Abierto ahora';
 }
 return Object.values(hours).some(value=>value==='closed'||parse(value))?'Cerrado ahora':null;
}
