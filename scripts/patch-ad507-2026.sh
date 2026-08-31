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

        // AD507 2026: separar el nombre comercial del plan de sus permisos reales.
        const rawPlan = String(data.plan || data.plan_comercial || "").toLowerCase().trim();
        let planUi = rawPlan;
        if (!data.legacy) {
          if (data.tipo_direccion === "RESIDENCIAL" || data.publico === false) {
            planUi = "residencial";
          } else if (rawPlan.includes("pro")) {
            planUi = "pro";
          } else if (rawPlan.includes("premium")) {
            planUi = "premium";
          } else {
            planUi = "negocio";
          }
        }
        const planLower = planUi;'''

    if needle in text:
        text = text.replace(needle, replacement, 1)

    # Portada principal: eliminar el mapa decorativo, centrar el mensaje y conservar todo el contenido actual.
    hero_title_old = '<h2 class="main-hero-title">Encuentra cualquier dirección <span>fácil, rápido y preciso.</span></h2>'
    hero_title_new = '<h2 class="main-hero-title">Encuentra cualquier dirección<br><span>fácil, rápido y preciso.</span></h2>'
    if hero_title_old in text:
        text = text.replace(hero_title_old, hero_title_new, 1)

    map_block = '''        <div class="map-art-container">
          <div id="mapaPanamaReal"></div>
        </div>
'''
    if map_block in text:
        text = text.replace(map_block, '', 1)

    integrations = '''
          <div class="hero-integrations" aria-label="Aplicaciones integradas">
            <div class="hero-integrations-title">Integramos tus aplicaciones directamente</div>
            <div class="hero-integrations-row">
              <div class="hero-integration-item"><i class="fa-solid fa-location-dot"></i><span>Google Maps</span></div>
              <div class="hero-integration-item"><i class="fa-brands fa-waze"></i><span>Waze</span></div>
              <div class="hero-integration-item"><i class="fa-brands fa-uber"></i><span>Uber</span></div>
              <div class="hero-integration-item"><i class="fa-brands fa-whatsapp"></i><span>WhatsApp</span></div>
              <div class="hero-integration-item"><i class="fa-solid fa-qrcode"></i><span>Código QR</span></div>
            </div>
          </div>

'''
    category_marker = '          <div class="category-pills-row">'
    if category_marker in text and 'class="hero-integrations"' not in text:
        text = text.replace(category_marker, integrations + category_marker, 1)

    hero_css_marker = '    /* ===== CTA DIRECCION GRATIS ===== */'
    hero_css = '''    /* ===== AJUSTE VISUAL PORTADA 2026 ===== */
    #mainGlobalHeroView .hero-view-wrapper { padding-top: 48px; }
    #mainGlobalHeroView .hero-grid-layout {
      grid-template-columns: 1fr;
      max-width: 960px;
      margin: 0 auto;
      gap: 0;
      text-align: center;
    }
    #mainGlobalHeroView .hero-grid-layout > div:first-child { width: 100%; }
    #mainGlobalHeroView .main-hero-title {
      font-size: 44px;
      line-height: 1.12;
      max-width: 900px;
      margin-left: auto;
      margin-right: auto;
    }
    #mainGlobalHeroView .main-hero-desc {
      max-width: 860px;
      margin-left: auto;
      margin-right: auto;
    }
    #mainGlobalHeroView .free-address-card {
      max-width: 820px;
      margin: 0 auto 28px;
      text-align: left;
    }
    #mainGlobalHeroView .category-pills-row {
      max-width: 900px;
      margin-left: auto;
      margin-right: auto;
    }
    #mainGlobalHeroView .map-art-container { display: none !important; }
    .hero-integrations {
      width: 100%;
      max-width: 820px;
      margin: 0 auto 28px;
      padding: 20px 12px 22px;
      border-top: 1px solid rgba(255,255,255,0.06);
      border-bottom: 1px solid rgba(255,255,255,0.06);
      text-align: center;
    }
    .hero-integrations-title {
      color: var(--cyan-brand);
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .7px;
      margin-bottom: 16px;
    }
    .hero-integrations-row {
      display: grid;
      grid-template-columns: repeat(5, minmax(0,1fr));
      gap: 10px;
      align-items: center;
    }
    .hero-integration-item {
      min-width: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 7px;
      color: #e2e8f0;
      font-size: 12px;
      font-weight: 650;
    }
    .hero-integration-item i { color: var(--cyan-brand); font-size: 24px; }
    .hero-integration-item .fa-whatsapp { color: #25d366; }
    .brand-logo-icon { font-size: 31px; }
    .brand-meta h1 { font-size: 22px; }
    .brand-meta span { font-size: 10.5px; }
    @media (max-width: 640px) {
      #mainGlobalHeroView .hero-view-wrapper { padding-top: 34px; }
      #mainGlobalHeroView .main-hero-title { font-size: 30px; letter-spacing: -1px; }
      #mainGlobalHeroView .free-address-card { text-align: left; }
      .hero-integrations-row { grid-template-columns: repeat(3, minmax(0,1fr)); row-gap: 18px; }
      .hero-integration-item i { font-size: 22px; }
    }

'''
    if hero_css_marker in text and 'AJUSTE VISUAL PORTADA 2026' not in text:
        text = text.replace(hero_css_marker, hero_css + hero_css_marker, 1)

    # En escritorio, sube el mapa para aprovechar mejor el espacio del hero.
    marker = '    /* ===== CONTENEDOR MAPA DE PANAMÁ REAL ===== */'
    desktop_map_rule = '''    @media (min-width: 901px) {
      .map-art-container {
        align-self: start;
        margin-top: 64px;
      }
    }

'''
    if marker in text and desktop_map_rule not in text:
        text = text.replace(marker, desktop_map_rule + marker, 1)

    # Mostrar el logo cuando exista, independientemente de si la ficha es Gratis o Premium.
    old_logo = '''        if (planLower === "premium" && data.logo) {
          document.getElementById("uiLogoImgHome").src = data.logo;
          document.getElementById("uiLogoBoxHome").style.display = "block";
        } else {
          document.getElementById("uiLogoBoxHome").style.display = "none";
        }'''
    new_logo = '''        if (data.logo) {
          document.getElementById("uiLogoImgHome").src = data.logo;
          document.getElementById("uiLogoBoxHome").style.display = "block";
        } else {
          document.getElementById("uiLogoBoxHome").style.display = "none";
        }'''
    if old_logo in text:
        text = text.replace(old_logo, new_logo, 1)

    # Galería: solo cuando el backend autoriza mostrar fotos. Mantener compatibilidad legacy.
    text = text.replace(
        '        if(planLower === "premium" && gridFotos && containerGaleria){',
        '        if(((data.legacy && (planLower === "premium" || planLower === "pro")) || (!data.legacy && data.mostrar_fotos === true)) && gridFotos && containerGaleria){'
    )
    text = text.replace(
        "          let fotosValidas = data.fotos && Array.isArray(data.fotos) ? data.fotos.filter(u=>u) : [data.foto1, data.foto2, data.foto3].filter(u=>u);",
        "          let fotosValidas = data.fotos && Array.isArray(data.fotos) ? data.fotos.filter(u=>u) : [data.foto1, data.foto2, data.foto3, data.foto4, data.foto5].filter(u=>u);"
    )

    # Redes: para registros nuevos manda el permiso explícito; los legacy conservan su conducta anterior.
    text = text.replace(
        '        if((planLower === "negocio" || planLower === "premium") && redesBox) {',
        '        if(((data.legacy && (planLower === "negocio" || planLower === "premium" || planLower === "pro")) || (!data.legacy && data.mostrar_redes === true)) && redesBox) {'
    )

    # Usar siempre el enlace corto del cliente en navegación interna, compartir y copiar.
    text = text.replace(
        '      window.location.href = `https://direcciones507.com/?code=${encodeURIComponent(codigoLimpio)}`;',
        '      window.location.href = `https://direcciones507.com/${encodeURIComponent(codigoLimpio)}`;'
    )
    text = text.replace(
        '        const shareUrl = `https://direcciones507.com/?code=${encodeURIComponent(CODIGO_ACTUAL)}`;',
        '        const shareUrl = `https://direcciones507.com/${encodeURIComponent(CODIGO_ACTUAL)}`;'
    )

    # Footer: colores de marca más visibles y consistentes.
    text = text.replace(
        '    .social-pill-large.wa-color { border-color: rgba(37, 211, 102, 0.4); background: rgba(37, 211, 102, 0.05); }\n    .social-pill-large.wa-color i { color: #25d366; }\n    .social-pill-large.ig-color { border-color: rgba(214, 41, 118, 0.4); background: rgba(214, 41, 118, 0.05); }\n    .social-pill-large.ig-color i { color: #d62976; }\n    .social-pill-large.tk-color { border-color: rgba(255, 0, 80, 0.4); background: rgba(255, 0, 80, 0.05); }\n    .social-pill-large.tk-color i { color: #00f2fe; }',
        '    .social-pill-large { transition: transform .22s ease, filter .22s ease, box-shadow .22s ease; }\n    .social-pill-large:hover { transform: translateY(-2px); filter: brightness(1.08); }\n    .social-pill-large.wa-color { border-color: rgba(37, 211, 102, 0.72); background: linear-gradient(135deg, #25d366, #128c7e); color: #fff; box-shadow: 0 8px 20px rgba(37,211,102,.18); }\n    .social-pill-large.wa-color i { color: #fff; }\n    .social-pill-large.ig-color { border-color: rgba(253, 29, 29, 0.55); background: linear-gradient(135deg, #833ab4, #c13584 45%, #fd1d1d 72%, #fcb045); color: #fff; box-shadow: 0 8px 20px rgba(193,53,132,.18); }\n    .social-pill-large.ig-color i { color: #fff; }\n    .social-pill-large.tk-color { border-color: rgba(255,255,255,.2); background: #000000; color: #fff; box-shadow: 0 8px 20px rgba(0,0,0,.28); }\n    .social-pill-large.tk-color i { color: #fff; }'
    )

    # Directorio: convertir códigos en pills más visibles.
    text = text.replace(
        '    .seo-trigger-link { color: var(--text-muted); text-decoration: none; font-size: 12px; background: rgba(255, 255, 255, 0.02); padding: 6px 14px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.04); cursor: pointer; }',
        '    .seo-trigger-link { color: #dbeafe; text-decoration: none; font-size: 12px; font-weight: 700; background: linear-gradient(135deg, rgba(15,23,42,.88), rgba(8,47,73,.72)); padding: 9px 15px; border-radius: 999px; border: 1px solid rgba(6,182,212,.38); cursor: pointer; box-shadow: 0 5px 14px rgba(0,0,0,.18); transition: all .22s ease; }\n    .seo-trigger-link:hover { color: #ffffff; border-color: rgba(6,182,212,.8); background: linear-gradient(135deg, rgba(8,145,178,.28), rgba(37,99,235,.24)); transform: translateY(-2px); box-shadow: 0 8px 18px rgba(6,182,212,.14); }'
    )

    # La información de negocios publicados puede pertenecer tanto a Gratis como a planes pagados.
    text = text.replace(
        '<p><b>3. Datos Comerciales:</b> La información de comercios, horarios y galerías multimedia provista voluntariamente por los suscriptores del Plan Premium se considera de carácter público para impulsar su posicionamiento.</p>',
        '<p><b>3. Datos Comerciales:</b> La información comercial que el titular autoriza a publicar en una ficha de negocio puede mostrarse públicamente e indexarse según las características del plan seleccionado.</p>'
    )

    p.write_text(text, encoding="utf-8")
PY

echo "AD507 2026 frontend patch aplicado correctamente."
