#!/usr/bin/env bash
set -euo pipefail

NEW_WEBAPP_URL="https://script.google.com/macros/s/AKfycbwGtlH6FVh80hlT-9gzhVbgxpFHRnerep5NGULSSRuoF62iWB3q2hmICMlAMS9nwQyq/exec"

# Actualiza cualquier URL antigua de Apps Script en las fuentes mantenidas.
for file in index.html ad507.template.html verificar.html; do
  [ -f "$file" ] || continue
  sed -E -i "s#https://script\.google\.com/macros/s/[A-Za-z0-9_-]+/exec#$NEW_WEBAPP_URL#g" "$file"
  sed -i 's/action=click&code=${encodeURIComponent(CODIGO_ACTUAL)}&platform=${plataforma}/action=track\&code=${encodeURIComponent(CODIGO_ACTUAL)}\&event=${plataforma}/g' "$file"
done

# Corrige favicon y OpenGraph de la plantilla SEO antes de generar cada código.
python3 - <<'PY'
from pathlib import Path

p = Path("ad507.template.html")
if p.exists():
    text = p.read_text(encoding="utf-8")

    text = text.replace(
        '<link id="dynamicFavicon" rel="icon" type="image/png" href="https://direcciones507.com/assets/logo-direcciones507.png?v=2">',
        '<link id="dynamicFavicon" rel="icon" type="image/png" href="https://direcciones507.com/assets/favicon.png">'
    )
    text = text.replace(
        '<link id="dynamicAppleIcon" rel="apple-touch-icon" href="https://direcciones507.com/assets/logo-direcciones507.png?v=2">',
        '<link id="dynamicAppleIcon" rel="apple-touch-icon" href="https://direcciones507.com/assets/favicon.png">'
    )
    text = text.replace(
        '<meta property="og:image" content="https://direcciones507.com/assets/logo-direcciones507.png?v=2">',
        '<meta property="og:image" content="https://direcciones507.com/assets/og-image.jpg">\n  <meta property="og:image:secure_url" content="https://direcciones507.com/assets/og-image.jpg">\n  <meta property="og:image:type" content="image/jpeg">'
    )
    text = text.replace(
        '<meta property="og:image:width" content="300">',
        '<meta property="og:image:width" content="1200">'
    )
    text = text.replace(
        '<meta property="og:image:height" content="300">',
        '<meta property="og:image:height" content="630">'
    )
    text = text.replace(
        '<meta name="twitter:image" content="{{OG_IMAGE}}">',
        '<meta name="twitter:image" content="https://direcciones507.com/assets/og-image.jpg">'
    )

    p.write_text(text, encoding="utf-8")
PY

# El index principal sí usa este bloque histórico. La plantilla SEO tiene otra estructura,
# por eso no debe detener el build si ese bloque no existe allí.
python3 - <<'PY'
from pathlib import Path

p = Path("index.html")
if p.exists():
    text = p.read_text(encoding="utf-8")
    needle = '        const data = respuesta;\n        CODIGO_ACTUAL = String(data.codigo || data.code || codigo).trim().toUpperCase();\n        const planLower = String(data.plan || "").toLowerCase().trim();'
    replacement = '''        const data = respuesta;
        CODIGO_ACTUAL = String(data.codigo || data.code || codigo).trim().toUpperCase();

        // AD507 2026: el Apps Script es la fuente de verdad para permisos.
        let planUi = String(data.plan || data.plan_comercial || "").toLowerCase().trim();
        if (!data.legacy) {
          if (data.tipo_direccion === "RESIDENCIAL" || data.publico === false) {
            planUi = "residencial";
          } else if (data.mostrar_fotos || data.mostrar_logo || data.mostrar_redes || data.analytics) {
            planUi = "premium";
          } else {
            planUi = "negocio";
          }
        }
        const planLower = planUi;'''

    if needle in text:
        text = text.replace(needle, replacement, 1)
        p.write_text(text, encoding="utf-8")
PY

echo "AD507 2026 frontend patch aplicado correctamente."
