// Serve the complete existing digital-address viewer at its original short URL.
// Do not navigate to /?code= or embed a generic link in an iframe.
(async () => {
  const code = location.pathname.replace(/\/index\.html$/i, '').replace(/^\/+|\/+$/g, '').toUpperCase();
  if (!/^AD507-[A-Z0-9-]+$/.test(code)) return;
  try {
    const response = await fetch('/?legacy-view=' + encodeURIComponent(code), {cache:'no-store'});
    if (!response.ok) throw new Error('viewer unavailable');
    const html = await response.text();
    if (!html.includes('mainClientPanelCardContainer') || !html.includes('ejecutarBusquedaSistema')) throw new Error('invalid viewer');
    document.open();
    document.write(html);
    document.close();
  } catch (error) {
    console.error('Unable to load digital address', error);
    document.addEventListener('DOMContentLoaded', () => {
      document.body.textContent = 'No se pudo cargar la dirección digital. Intenta nuevamente.';
    });
  }
})();
