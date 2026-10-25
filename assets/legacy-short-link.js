// Keep historical AD507 codes on their own URL and render the original digital card.
(() => {
  const code = location.pathname.replace(/\/index\.html$/i, '').replace(/^\/+|\/+$/g, '').toUpperCase();
  if (!/^AD507-[A-Z0-9-]+$/.test(code)) return;
  // The existing public viewer resolves the code through the legacy Master.
  // An iframe retains the short URL rather than exposing a generic ?code= link.
  const frame = document.createElement('iframe');
  frame.src = '/?code=' + encodeURIComponent(code);
  frame.title = 'Dirección Digital ' + code;
  frame.setAttribute('allow', 'geolocation; clipboard-read; clipboard-write');
  frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;background:#fff';
  document.addEventListener('DOMContentLoaded', () => {
    document.title = code + ' | Direcciones507';
    document.body.replaceChildren(frame);
    document.body.style.cssText = 'margin:0;padding:0;overflow:hidden';
  });
})();
