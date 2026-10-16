/** Fixed public destinations only; never accept a return URL from client input. */
export function panelLogoutDestination(href: string, selectedCountry?: string): string {
  const current = new URL(href), target = new URL(current.hostname === 'direcciones.lat' ? 'https://direcciones.lat/' : 'https://direcciones507.com/');
  const country = selectedCountry || current.searchParams.get('country');
  if (country && ['PA','CO','CR','GT','SV','HN','NI','MX'].includes(country)) target.searchParams.set('country', country);
  return target.href;
}
/** Shared client card. Escape supplied data and keep the stored code unchanged. */
export function renderPanelAddressCard(a: Record<string, any>): string {
  const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
  const https = (value: unknown) => { try { const u = new URL(String(value)); return u.protocol === 'https:' && !u.username && !u.password ? u.href : ''; } catch { return ''; } };
  const type = a.addressType === 'RESIDENTIAL' ? 'Residencial' : a.addressType === 'PLACE' ? 'Lugar' : 'Negocio';
  const labels: Record<string,string> = {ACTIVE:'Activa',PENDING_REVIEW:'En revisión',DRAFT:'Borrador',SUSPENDED:'Suspendida',DISABLED:'Desactivada',ARCHIVED:'Archivada'};
  const detail = a.source === 'USER_REQUEST' && /^[a-f0-9-]{36}$/.test(String(a.id));
  const image = https(a.imageUrl), url = https(a.publicUrl);
  const plan = a.planName && String(a.planName).toLocaleLowerCase() !== type.toLocaleLowerCase() ? '<span class="address-plan">'+esc(a.planName)+'</span>' : '';
  return '<article class="address-card"'+(detail?' data-request="'+esc(a.id)+'"':'')+'>'+
    '<div class="address-top"><span class="address-kind">'+type+'</span><span class="badge address-status'+(a.status==='ACTIVE'?' is-active':'')+'">'+esc(labels[String(a.status)]||'En proceso')+'</span></div>'+
    '<h3 class="address-name">'+esc(a.name)+'</h3>'+plan+
    (a.code?'<div class="address-code-row"><code class="address-code">'+esc(a.code)+'</code></div>':'')+
    '<div class="address-actions">'+
    (a.code?'<button type="button" class="copy-code secondary" data-copy-code="'+esc(a.code)+'" aria-label="Copiar código de '+esc(a.name)+'">Copiar código</button>':'')+
    (url?'<a class="button address-open" href="'+esc(url)+'" target="_blank" rel="noopener">Abrir dirección digital <span aria-hidden="true">↗</span></a>':'')+
    (detail?'<button type="button" class="secondary address-detail" data-request-detail="'+esc(a.id)+'">Ver detalles de solicitud</button>':'')+'</div>'+
    (image?'<img class="address-image" src="'+esc(image)+'" alt="Imagen de la dirección" loading="lazy" referrerpolicy="no-referrer">':'')+
    (a.addressType==='RESIDENTIAL'?'<p class="muted">Tu acceso residencial conserva su proceso de activación independiente.</p>':'')+'</article>';
}
