/** Shared form behavior; the server repeats every validation and checks atomically on save. */
export const customCodeUiScript=String.raw`
function wireCustomCode(input,getPlan,id){
 input.setAttribute('aria-label','Nombre de código personalizado');input.placeholder='direcciones-LATAM';input.maxLength=80;input.pattern='[A-Za-z0-9]+(-[A-Za-z0-9]+)*';
 const help=document.createElement('small');help.textContent='Ejemplo: direcciones-LATAM. Solo letras, números y guiones; sin espacios, puntos ni comas. No escribas el prefijo AD507-.';
 help.id='named-code-help-'+(id||'create');input.setAttribute('aria-describedby',help.id);
 const preview=document.createElement('p'),state=document.createElement('p');state.setAttribute('role','status');input.after(help,preview,state);
 let version=0;
 const message=error=>({INVALID_NAMED_CODE:'Revisa el nombre: usa letras, números y guiones, sin prefijo AD507- ni rutas reservadas.',CANONICAL_CODE_COLLISION:'Este código ya existe. Elige otro nombre.',HISTORICAL_REGISTRY_UNAVAILABLE:'No se pudo comprobar la disponibilidad. Intenta nuevamente.'})[error]||'No se pudo comprobar la disponibilidad. Intenta nuevamente.';
 const update=()=>{version++;const name=input.value,valid=!name||name.length<=80&&/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(name)&&!/^AD\d+-/i.test(name);input.setCustomValidity(valid?'':'Usa letras, números y guiones, sin espacios ni prefijo AD507-.');preview.textContent=name?'Código final: '+(getPlan()==='BUSINESS_PREMIUM'?'AD507-':'')+name:'';state.textContent='';};
 const check=async()=>{update();if(!input.value)return true;if(!input.reportValidity())return false;const current=version;state.textContent='Comprobando disponibilidad…';try{const query=new URLSearchParams({plan:getPlan(),name:input.value});if(id)query.set('id',id);const r=await fetch('/v1/user/code-availability?'+query,{credentials:'same-origin',cache:'no-store'}),data=await r.json();if(current!==version)return false;if(!r.ok){state.textContent=message(data.error);return false;}state.textContent='Código disponible: '+data.code;return true;}catch{if(current===version)state.textContent=message('UNAVAILABLE');return false;}};
 input.addEventListener('input',update);input.addEventListener('blur',()=>{if(input.value)check();});update();return {check,update,message};
}
`;
