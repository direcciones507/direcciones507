from pathlib import Path

p = Path("index.html")
text = p.read_text(encoding="utf-8")

css = r'''
    /* ===== AJUSTES FINALES HERO 2026 ===== */
    #mainGlobalHeroView .free-address-info-btn {
      width: calc((100% - 10px) / 2);
      margin: 10px auto 0;
      display: block;
    }
    #mainGlobalHeroView .hero-integrations-row .hero-integration-item:nth-child(1) i {
      background: conic-gradient(from 25deg, #4285f4 0 25%, #34a853 25% 50%, #fbbc05 50% 75%, #ea4335 75% 100%);
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    #mainGlobalHeroView .hero-integrations-row .hero-integration-item:nth-child(2) i {
      color: #ffffff; background: #6ad7f5; width: 38px; height: 38px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
    }
    #mainGlobalHeroView .hero-integrations-row .hero-integration-item:nth-child(3) i {
      color: #ffffff; background: #000000; width: 38px; height: 38px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center;
    }
    #mainGlobalHeroView .hero-integrations-row .hero-integration-item:nth-child(4) i {
      color: #ffffff; background: #25d366; width: 38px; height: 38px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
    }
    #mainGlobalHeroView .hero-integrations-row .hero-integration-item:nth-child(5) i {
      color: #ffffff; background: linear-gradient(135deg, #06b6d4, #2563eb); width: 38px; height: 38px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center;
    }
    #mainGlobalHeroView .category-pills-row { justify-content: center; align-items: center; text-align: center; }
    #mainGlobalHeroView .category-pills-row .cat-item-node { font-size: 13.5px; text-align: center; }
    #mainGlobalHeroView .category-pills-row .cat-icon-circle { transform: scale(1.08); transform-origin: center; }

    #mainGlobalHeroView .hero-intro-layout {
      width: 100%; max-width: 940px; margin: 0 auto 34px; display: grid;
      grid-template-columns: minmax(220px, 300px) minmax(0, 1fr); gap: 54px; align-items: center; text-align: left;
    }
    #mainGlobalHeroView .hero-intro-copy { min-width: 0; }
    #mainGlobalHeroView .hero-intro-copy .main-hero-title,
    #mainGlobalHeroView .hero-intro-copy .main-hero-desc { margin-left: 0; margin-right: 0; }
    #mainGlobalHeroView .hero-phone-preview {
      width: 230px; max-width: 100%; margin: 0 auto; padding: 9px; background: linear-gradient(145deg, #101827, #020617);
      border: 2px solid rgba(148,163,184,.38); border-radius: 34px;
      box-shadow: 0 24px 55px rgba(0,0,0,.45), 0 0 28px rgba(6,182,212,.10); transform: rotate(-5deg); position: relative;
    }
    #mainGlobalHeroView .hero-phone-preview::before {
      content: ''; position: absolute; top: 7px; left: 50%; transform: translateX(-50%); width: 72px; height: 15px;
      border-radius: 0 0 12px 12px; background: #020617; z-index: 2;
    }
    #mainGlobalHeroView .hero-phone-preview img { display: block; width: 100%; height: auto; border-radius: 26px; object-fit: cover; }
    @media (max-width: 760px) {
      #mainGlobalHeroView .hero-intro-layout { grid-template-columns: 1fr; gap: 24px; text-align: center; margin-bottom: 28px; }
      #mainGlobalHeroView .hero-intro-copy { order: 1; }
      #mainGlobalHeroView .hero-phone-preview { order: 2; width: 190px; transform: rotate(-4deg); }
      #mainGlobalHeroView .hero-intro-copy .main-hero-title,
      #mainGlobalHeroView .hero-intro-copy .main-hero-desc { margin-left: auto; margin-right: auto; }
    }
    @media (max-width: 640px) { #mainGlobalHeroView .free-address-info-btn { width: 100%; } }
'''

if 'AJUSTES FINALES HERO 2026' not in text:
    style_pos = text.find('</style>')
    if style_pos != -1:
        text = text[:style_pos] + css + '\n  ' + text[style_pos:]
else:
    start = text.find('    /* ===== AJUSTES FINALES HERO 2026 ===== */')
    end = text.find('</style>', start)
    if start != -1 and end != -1:
        text = text[:start] + css + '\n  ' + text[end:]

script = r'''
<script id="ad507-hero-phone-layout">
document.addEventListener('DOMContentLoaded', function () {
  const hero = document.getElementById('mainGlobalHeroView');
  if (!hero || hero.querySelector('.hero-intro-layout')) return;
  const title = hero.querySelector('.main-hero-title');
  const desc = hero.querySelector('.main-hero-desc');
  if (!title || !desc) return;
  const badge = title.previousElementSibling;
  const parent = title.parentElement;
  const intro = document.createElement('div');
  intro.className = 'hero-intro-layout';
  const phone = document.createElement('div');
  phone.className = 'hero-phone-preview';
  phone.innerHTML = '<img src="/ad507-the1920-phone-preview.jpg" alt="Vista previa de una Dirección Digital AD507" loading="eager">';
  const copy = document.createElement('div');
  copy.className = 'hero-intro-copy';
  parent.insertBefore(intro, badge || title);
  intro.appendChild(phone);
  intro.appendChild(copy);
  if (badge && badge !== desc) copy.appendChild(badge);
  copy.appendChild(title);
  copy.appendChild(desc);
});
</script>
'''

if 'ad507-hero-phone-layout' not in text:
    body_pos = text.rfind('</body>')
    if body_pos != -1:
        text = text[:body_pos] + script + '\n' + text[body_pos:]

p.write_text(text, encoding="utf-8")
