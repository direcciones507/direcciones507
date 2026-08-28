#!/usr/bin/env bash
set -euo pipefail

NEW_WEBAPP_URL="https://script.google.com/macros/s/AKfycbwGtlH6FVh80hlT-9gzhVbgxpFHRnerep5NGULSSRuoF62iWB3q2hmICMlAMS9nwQyq/exec"

# Patch every maintained HTML source before the Pages build. This keeps old LEGACY
# records working while allowing the 2026 API to control new plan capabilities.
for file in index.html ad507.template.html verificar.html; do
  [ -f "$file" ] || continue

  # Replace any previous Apps Script deployment URL with the validated 2026 endpoint.
  sed -E -i "s#https://script\.google\.com/macros/s/[A-Za-z0-9_-]+/exec#$NEW_WEBAPP_URL#g" "$file"

  # New Apps Script tracks events with action=track&event=...
  sed -i 's/action=click&code=${encodeURIComponent(CODIGO_ACTUAL)}&platform=${plataforma}/action=track\&code=${encodeURIComponent(CODIGO_ACTUAL)}\&event=${plataforma}/g' "$file"
done

# The existing UI was written for Persona/Residencial, Negocio and Premium.
# Normalize only the UI-facing plan value from explicit API capability flags.
# LEGACY rows retain their existing plan because the API already returns legacy=true.
python3 - <<'PY'
from pathlib import Path

for name in ("index.html", "ad507.template.html"):
    p = Path(name)
    if not p.exists():
        continue
    text = p.read_text(encoding="utf-8")
    needle = '        const data = respuesta;\n        CODIGO_ACTUAL = String(data.codigo || data.code || codigo).trim().toUpperCase();\n        const planLower = String(data.plan || "").toLowerCase().trim();'
    replacement = '''        const data = respuesta;
        CODIGO_ACTUAL = String(data.codigo || data.code || codigo).trim().toUpperCase();

        // AD507 2026: el Apps Script es la fuente de verdad para permisos.
        // Solo traducimos el plan para mantener compatible la interfaz histórica.
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
    if needle not in text:
        raise SystemExit(f"No se encontró bloque de compatibilidad esperado en {name}")
    p.write_text(text.replace(needle, replacement, 1), encoding="utf-8")
PY

echo "AD507 2026 frontend patch aplicado correctamente."
