(() => {
 const allowed = new Set(["AD507-0004", "AD507-TRANSPORTEJEDIDIAS", "AD507-THE1920", "AD507-LABDIESELMONTERO", "AD507-0017", "AD507-0019", "AD507-FJSPORTGYM", "AD507-JIMENEZBARBER", "AD507-MORATRUCK", "AD507-0023", "AD507-NELLYSNAILS", "AD507-LAURAMARIASTUDIO", "AD507-SUAVECITOSCLEAN", "AD507-ARTESANIASVIELKA", "AD507-BRISASBOUTIQUE", "AD507-ARTEMARY", "AD507-SOMBRERODONPEDRO", "AD507-SOMBREROSALEX", "AD507-VENTASARTESANALES", "AD507-ARTESANIASOMAIRA", "AD507-0035", "AD507-MONASANFRANCISCO", "AD507-MONACOSTADELESTE", "AD507-SOMBREROSARQUIMEDES", "AD507-FONDATATIANA"]);
 const open = value => {
  const code=String(value||'').trim().toUpperCase();
  if(allowed.has(code)){location.assign('/'+code+'/');return;}
  const log=document.getElementById('msgLogBusqueda');
  if(log){log.textContent='Código no disponible en el directorio público.';log.style.display='block';}
 };
 const load=window.onload;
 window.onload=function(event){
  const code=new URLSearchParams(location.search).get('code');
  if(code){open(code);return;}
  if(load)load.call(window,event);
 };
 window.ejecutarBusquedaSistema=()=>open(document.getElementById('inputCodigo')?.value);
 window.ejecutarEnlaceInterno=open;
})();
