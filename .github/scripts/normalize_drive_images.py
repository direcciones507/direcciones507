from pathlib import Path

HELPER = r'''
    function normalizarImagenDrive(url){
      const raw = String(url || '').trim();
      if(!raw) return '';
      const patterns = [
        /drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/i,
        /drive\.google\.com\/open\?id=([A-Za-z0-9_-]+)/i,
        /drive\.google\.com\/uc\?(?:[^#]*&)?id=([A-Za-z0-9_-]+)/i
      ];
      for(const pattern of patterns){
        const match = raw.match(pattern);
        if(match && match[1]) return `https://lh3.googleusercontent.com/d/${match[1]}`;
      }
      return raw;
    }
'''

for filename in ('ad507.template.html', 'index.html'):
    p = Path(filename)
    if not p.exists():
        continue
    text = p.read_text(encoding='utf-8')

    if 'function normalizarImagenDrive(url)' not in text:
        if '<script>' not in text:
            raise RuntimeError(f'No <script> marker in {filename}')
        text = text.replace('<script>', '<script>\n' + HELPER, 1)

    text = text.replace("document.getElementById('logoNegocio').src = data.logo;",
                        "document.getElementById('logoNegocio').src = normalizarImagenDrive(data.logo);")
    text = text.replace('document.getElementById("uiLogoImgHome").src = data.logo;',
                        'document.getElementById("uiLogoImgHome").src = normalizarImagenDrive(data.logo);')
    text = text.replace('imgElement.src = urlFoto;',
                        'imgElement.src = normalizarImagenDrive(urlFoto);')
    text = text.replace('img.src = url;', 'img.src = normalizarImagenDrive(url);')
    text = text.replace('img.src = u;', 'img.src = normalizarImagenDrive(u);')

    p.write_text(text, encoding='utf-8')

template = Path('ad507.template.html').read_text(encoding='utf-8')
assert 'function normalizarImagenDrive(url)' in template
assert 'imgElement.src = normalizarImagenDrive(urlFoto);' in template
assert "document.getElementById('logoNegocio').src = normalizarImagenDrive(data.logo);" in template
print('DRIVE_IMAGE_NORMALIZER_OK')
