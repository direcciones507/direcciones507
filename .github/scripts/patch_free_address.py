from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

css_anchor = "    .hero-register-note { color: var(--text-muted); font-size: 12px; line-height: 1.4; }\n"
css_extra = r'''

    /* ===== CTA DIRECCION GRATIS ===== */
    .free-address-card { background: radial-gradient(circle at top right, rgba(6, 182, 212, 0.15), transparent), var(--bg-card); border: 1px solid rgba(6, 182, 212, 0.26); border-radius: 24px; padding: 26px; margin: -10px 0 30px; box-shadow: 0 16px 38px rgba(0,0,0,0.28); }
    .free-address-card .free-kicker { font-size: 11px; color: var(--cyan-brand); font-weight: 800; letter-spacing: 1px; text-transform: uppercase; display: block; margin-bottom: 7px; }
    .free-address-card h3 { font-size: 28px; font-weight: 900; color: #fff; line-height: 1.15; margin-bottom: 9px; }
    .free-address-card > p { color: var(--text-muted); font-size: 13.5px; line-height: 1.55; margin-bottom: 18px; }
    .free-address-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .free-address-btn { display: flex; align-items: center; justify-content: center; gap: 9px; background: transparent; border: 2px solid var(--cyan-brand); color: #fff; padding: 14px 12px; border-radius: 100px; font-weight: 800; text-decoration: none; font-size: 12px; text-transform: uppercase; cursor: pointer; text-align: center; }
    .free-address-btn:hover { background: rgba(6, 182, 212, 0.1); transform: translateY(-2px); }
    .free-address-info-btn { margin-top: 10px; width: 100%; background: rgba(255,255,255,0.025); border: 1px solid rgba(6, 182, 212, 0.35); color: #cbd5e1; padding: 12px 14px; border-radius: 14px; font-weight: 700; font-size: 12.5px; cursor: pointer; }
    .free-address-info-btn i { color: var(--cyan-brand); margin-right: 7px; }
    .form-guide-box { display: none; margin-top: 14px; padding: 18px; background: rgba(3, 7, 18, 0.62); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; color: #cbd5e1; text-align: left; }
    .form-guide-box.show { display: block; }
    .form-guide-box .guide-intro { font-size: 13px; line-height: 1.6; margin-bottom: 13px; color: #e2e8f0; }
    .form-guide-box .guide-intro strong { color: #fff; }
    .form-guide-list { display: grid; gap: 9px; }
    .form-guide-item { font-size: 12.5px; line-height: 1.5; color: #94a3b8; }
    .form-guide-item b { color: #fff; }
    .form-guide-tip { margin-top: 13px; font-size: 12px; line-height: 1.5; color: var(--cyan-brand); font-weight: 700; }
    .guide-form-cta { margin-top: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; background: linear-gradient(135deg, #0891b2, #2563eb); color: #fff; padding: 13px 16px; border-radius: 12px; text-decoration: none; font-size: 12.5px; font-weight: 800; }
'''
if css_anchor not in s:
    raise SystemExit('No se encontro ancla CSS')
s = s.replace(css_anchor, css_anchor + css_extra, 1)

old_hero = '''          <div class="hero-register-row">
            <a href="https://docs.google.com/forms/d/e/1FAIpQLSdvSoj6BViYQj71797pNJw1c6H28dsJZ5oiu86qQmou6Jxmng/viewform" target="_blank" rel="noopener" class="hero-register-cta">
              <i class="fa-solid fa-pen-to-square"></i> Completa el formulario
            </a>
            <span class="hero-register-note">Solicita tu dirección digital.<br>Verificación y generación en hasta 24 horas.</span>
          </div>
'''
new_hero = '''          <div class="free-address-card" id="solicitaDireccionGratis">
            <span class="free-kicker">¿Tienes un negocio o residencia?</span>
            <h3>Obtén tu dirección digital GRATIS</h3>
            <p>Crea tu dirección y compártela para que clientes, familiares, repartidores o visitantes puedan llegar a ti fácilmente.</p>
            <div class="free-address-actions">
              <a href="https://wa.me/50765996532?text=Hola,%20deseo%20solicitar%20mi%20direcci%C3%B3n%20digital%20gratis" target="_blank" rel="noopener" class="free-address-btn"><i class="fa-brands fa-whatsapp"></i> Gratis por WhatsApp</a>
              <a href="https://docs.google.com/forms/d/e/1FAIpQLSdvSoj6BViYQj71797pNJw1c6H28dsJZ5oiu86qQmou6Jxmng/viewform" target="_blank" rel="noopener" class="free-address-btn"><i class="fa-solid fa-globe"></i> Gratis en línea</a>
            </div>
            <button type="button" class="free-address-info-btn" onclick="toggleFormGuide()"><i class="fa-solid fa-circle-info"></i> ¿Cómo llenar el formulario?</button>
            <div class="form-guide-box" id="formGuideBox">
              <p class="guide-intro"><strong>Es muy fácil.</strong> Completa únicamente los campos marcados como obligatorios. Los demás son opcionales y puedes dejarlos en blanco si no aplican a tu caso.</p>
              <div class="form-guide-list">
                <div class="form-guide-item"><b>Nombre del negocio o residencia:</b> escribe cómo quieres identificar tu dirección.</div>
                <div class="form-guide-item"><b>Teléfono / WhatsApp:</b> puedes usar el mismo número. Si el campo no está marcado como obligatorio, puedes dejarlo vacío.</div>
                <div class="form-guide-item"><b>Correo electrónico:</b> coloca un correo donde podamos contactarte sobre tu solicitud.</div>
                <div class="form-guide-item"><b>Referencia:</b> escribe algo cercano que ayude a encontrarte, por ejemplo “frente a la farmacia” o “al lado del minisúper”.</div>
                <div class="form-guide-item"><b>Coordenadas:</b> son necesarias para ubicar exactamente el punto de tu dirección y generar correctamente los accesos de navegación.</div>
                <div class="form-guide-item"><b>Ubicación de Google Maps o WhatsApp:</b> si el formulario la solicita, pega el enlace de ubicación que tengas disponible.</div>
                <div class="form-guide-item"><b>Campos de negocio:</b> si registras una residencia y un campo no aplica, déjalo en blanco siempre que no esté marcado como obligatorio.</div>
              </div>
              <div class="form-guide-tip">Consejo: no tienes que llenar todo. Concéntrate primero en los campos obligatorios.</div>
              <a href="https://docs.google.com/forms/d/e/1FAIpQLSdvSoj6BViYQj71797pNJw1c6H28dsJZ5oiu86qQmou6Jxmng/viewform" target="_blank" rel="noopener" class="guide-form-cta"><i class="fa-solid fa-pen-to-square"></i> Llenar formulario</a>
            </div>
          </div>
'''
if old_hero not in s:
    raise SystemExit('No se encontro bloque hero original')
s = s.replace(old_hero, new_hero, 1)

old_bottom = '''      <div class="cta-banner-premium">
        <div>
          <span style="font-size:11px; color:var(--cyan-brand); font-weight:800; letter-spacing:1px; text-transform:uppercase;">¿Tienes un negocio o residencia?</span>
          <h3>Agrega tu dirección y sé encontrado por todos.</h3>
          <p>Miles de personas te están buscando. Aparece en Direcciones507 y haz crecer tu presencia digital de forma masiva en todo el país.</p>
        </div>
        <div class="cta-action-right-side">
          <a href="https://wa.me/50765996532" target="_blank" class="btn-premium-cta-trigger">
            <i class="fa-solid fa-plus"></i> SOLICITAR TU DIRECCIÓN DIGITAL
          </a>
        </div>
      </div>

'''
if old_bottom not in s:
    raise SystemExit('No se encontro CTA inferior original')
s = s.replace(old_bottom, '', 1)

js_anchor = '    function toggleSeccion(idSeccion) {\n'
js_insert = '''    function toggleFormGuide() {
      const box = document.getElementById('formGuideBox');
      if (!box) return;
      box.classList.toggle('show');
      if (box.classList.contains('show')) {
        setTimeout(() => box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 120);
      }
    }

'''
if js_anchor not in s:
    raise SystemExit('No se encontro ancla JS')
s = s.replace(js_anchor, js_insert + js_anchor, 1)

mobile_anchor = '    @media (max-width: 640px) { .features-grid-view { grid-template-columns: 1fr !important; } .main-hero-title { font-size: 32px; } .seo-pages-buttons-container { grid-template-columns: 1fr; flex-direction: column; gap: 10px; } }\n'
mobile_new = '    @media (max-width: 640px) { .features-grid-view { grid-template-columns: 1fr !important; } .main-hero-title { font-size: 32px; } .seo-pages-buttons-container { grid-template-columns: 1fr; flex-direction: column; gap: 10px; } .free-address-card { padding: 22px 18px; } .free-address-card h3 { font-size: 24px; } .free-address-actions { grid-template-columns: 1fr; } .free-address-btn { width: 100%; } }\n'
if mobile_anchor not in s:
    raise SystemExit('No se encontro media query movil')
s = s.replace(mobile_anchor, mobile_new, 1)

p.write_text(s, encoding='utf-8')
