export function paymentPage(id:string,environment:'test'|'production') {
  if(!/^[a-f0-9-]{36}$/.test(id))throw Error('INVALID_PAYMENT_REQUEST');
  const cdn=environment==='test'?'https://bt-cdn-uat.yappycloud.com/v1/cdn/web-component-btn-yappy.js':'https://bt-cdn.yappy.cloud/v1/cdn/web-component-btn-yappy.js';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Direcciones507 | Pago</title><style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color-scheme:light}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;padding:clamp(16px,4vw,40px);font-size:16px;line-height:1.5;color:#172b47;background:linear-gradient(150deg,#06152c 0%,#102d55 58%,#0a1c37 100%)}
main{width:100%;max-width:580px;margin:clamp(12px,5vh,56px) auto;padding:clamp(21px,4.5vw,34px);background:#fff;border:1px solid #d7e3f2;border-radius:22px;box-shadow:0 22px 58px #010f2590}
a{color:#1259b0;font-weight:750;text-decoration:underline;text-underline-offset:3px}
a:hover{text-decoration-thickness:2px}
a:focus-visible,input:focus-visible,button:focus-visible,btn-yappy:focus-visible{outline:3px solid #3b82f6;outline-offset:3px}
.eyebrow{margin:22px 0 4px!important;color:#175ca3;font-size:13px;font-weight:800;letter-spacing:.025em}
h1{font-size:clamp(27px,4.2vw,36px);line-height:1.18;letter-spacing:-.032em;color:#102b4d;margin:8px 0 12px}
.intro{color:#50657e;line-height:1.55;margin:0 0 20px}
#quote{padding:17px 19px;background:#edf5ff;border:1px solid #cfdef1;border-radius:13px;color:#0d386b;font-weight:850;font-size:clamp(18px,3vw,22px);margin:18px 0 22px}
#checkout{min-width:0}
label{display:block;margin:0 0 8px;color:#183554;font-weight:750;font-size:15px}
input{font:inherit;width:100%;min-width:0;min-height:50px;padding:12px 15px;border:1px solid #aebfd5;border-radius:11px;background:#fff;color:#102b4d;box-sizing:border-box;margin:0 0 12px}
input::placeholder{color:#60738a}
#checkout .hint{font-size:13px;line-height:1.45;color:#50657e;margin:0 0 16px}
btn-yappy{display:block;width:100%;min-height:52px;margin:12px 0 18px}
#message:not(:empty){margin:16px 0;padding:13px 15px;color:#153b65;background:#eaf3ff;border-left:4px solid #2371c2;border-radius:9px;line-height:1.5;overflow-wrap:anywhere}
button{font:inherit;cursor:pointer;min-height:48px;padding:11px 17px;border:1px solid #afc7e4;border-radius:11px;background:#eaf3ff;color:#173a68;font-weight:750}
button:hover{background:#dbeafe}
.notice{font-size:14px;line-height:1.55;color:#4c6079;padding-top:17px;margin:22px 0 0;border-top:1px solid #e1eaf4}
.hidden{display:none!important}
@media(max-width:600px){body{padding:12px}main{margin:14px auto;border-radius:17px;padding:20px 17px}h1{font-size:28px}#quote{padding:15px 16px}btn-yappy{margin-top:14px}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important;transition:none!important}}
</style><script type="module" src="${cdn}"></script></head><body><main><a href="/panel">← Volver a Mi cuenta</a><p class="eyebrow">Direcciones 507/LATAM · Panamá</p><h1>Pago de tu dirección</h1><p class="intro">Confirma los datos antes de continuar con Yappy.</p><p id="quote">Consultando importe…</p><div id="checkout" class="hidden"><label for="alias">Celular registrado en Yappy</label><input id="alias" inputmode="numeric" maxlength="8" autocomplete="tel-national"><p class="hint">Escribe los ocho dígitos del celular asociado a tu cuenta Yappy.</p><btn-yappy theme="blue"></btn-yappy></div><p id="message" role="status" aria-live="polite"></p><button type="button" id="refresh" class="hidden">Consultar estado del pago</button><p class="notice">Cuando Yappy confirme el pago, tu solicitud pasará a revisión administrativa. La dirección se publica únicamente después de su aprobación.</p></main><script>
const addressId='${id}',q=document.getElementById('quote'),m=document.getElementById('message'),checkout=document.getElementById('checkout'),refresh=document.getElementById('refresh');let orderId=new URL(location.href).searchParams.get('order'),key=crypto.randomUUID(),busy=false;
async function state(){if(!orderId)return;refresh.classList.remove('hidden');const r=await fetch('/v1/user/payments/'+orderId,{cache:'no-store',credentials:'same-origin'});const v=await r.json();if(!r.ok){m.textContent='No se pudo consultar el pago.';return}m.textContent={PENDING:'Pago pendiente de confirmación.',PAID:'Pago confirmado. Tu solicitud continúa con la revisión administrativa.',FAILED:'Pago no completado. Consulta con Direcciones507 antes de reintentarlo.',CANCELLED:'Pago cancelado.',REFUNDED:'Pago reembolsado.'}[v.payment.status]||'Consulta con Direcciones507.';checkout.classList.add('hidden');}
async function init(){try{const r=await fetch('/v1/user/requests/'+addressId+'/payment',{cache:'no-store',credentials:'same-origin'});const v=await r.json();if(!r.ok)throw Error();q.textContent='Importe: $'+(v.quote.amountCents/100).toFixed(2);if(v.quote.amountCents===0){m.textContent='Este plan no requiere pago.';return}if(!orderId&&v.quote.orderId)orderId=v.quote.orderId;if(orderId){await state();return}checkout.classList.remove('hidden');const button=document.querySelector('btn-yappy');button.addEventListener('eventClick',async()=>{if(busy)return;const alias=document.getElementById('alias').value.trim();if(!/^6[0-9]{7}$/.test(alias)){m.textContent='Introduce tu celular de ocho dígitos.';return}busy=true;try{const r=await fetch('/v1/user/requests/'+addressId+'/payment',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json','idempotency-key':key},body:JSON.stringify({alias})});const v=await r.json();if(v.orderId){orderId=v.orderId;const u=new URL(location.href);u.searchParams.set('order',orderId);history.replaceState(null,'',u);refresh.classList.remove('hidden');}if(!r.ok)throw Error();button.eventPayment(v.button);m.textContent='Confirma el pago en Yappy.';}catch{m.textContent='No se pudo iniciar o confirmar el pago. Consulta su estado antes de reintentarlo.';}finally{busy=false}});button.addEventListener('eventSuccess',()=>state());button.addEventListener('eventError',()=>state());}catch{q.textContent='El pago no está disponible. Vuelve a tu panel.';}}
refresh.onclick=()=>state().catch(()=>{m.textContent='No se pudo consultar el pago.';});init();
</script></body></html>`;
}
