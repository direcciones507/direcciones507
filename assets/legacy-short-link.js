// Routing only: existing codes are still resolved and authorized by the original viewer.
(() => {
  const code = location.pathname.replace(/\/index\.html$/i, '').replace(/^\/+|\/+$/g, '').toUpperCase();
  if (!/^AD507-[A-Z0-9-]+$/.test(code)) return;
  location.replace('/?code=' + encodeURIComponent(code) + location.hash);
})();
