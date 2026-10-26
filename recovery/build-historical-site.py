"""Build an isolated Pages artifact from the existing generator/template, public-only."""
import argparse,subprocess,tempfile,pathlib,json,re,shutil,html,hashlib,datetime
p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--public-manifest',required=True);p.add_argument('--output',required=True);a=p.parse_args()
repo=pathlib.Path(__file__).resolve().parents[1];dest=pathlib.Path(a.output).resolve();assert not dest.exists(), 'Use a fresh artifact directory'
public=json.loads(pathlib.Path(a.public_manifest).read_text())['codes'];codes=[r['codigo'] for r in public]
assert len(codes)>=20 and len(set(codes))==len(codes)
assert all(re.fullmatch(r'AD507-[A-Z0-9]+',c) for c in codes)
selected=['index.html','ad507.template.html','scripts/patch-ad507-2026.sh','.github/scripts/refine_hero.py','legal','assets','img','CNAME','robots.txt','manifest.webmanifest','ad507-the1920-phone-preview.jpg','og-507-2026.png','og-image-new.jpg','og-latam-2026.png','direccion-digital-panama.html','ubicacion-exacta-panama.html','verificar.html','404.html']
with tempfile.TemporaryDirectory(prefix='ad507-stage-') as tmp:
 stage=pathlib.Path(tmp)
 archive=subprocess.check_output(['git','archive',a.source,*selected],cwd=repo)
 subprocess.run(['tar','-x','-C',tmp],input=archive,check=True)
 original=stage.joinpath('index.html').read_text()
 subprocess.run(['bash','scripts/patch-ad507-2026.sh'],cwd=stage,check=True)
 subprocess.run(['python3','.github/scripts/refine_hero.py'],cwd=stage,check=True)
 home=stage.joinpath('index.html').read_text()
 # Retain current homepage OG tags and current account links exactly.
 def og(s):return re.findall(r'<meta[^>]+(?:property="og:|name="twitter:)[^>]+>',s)
 assert og(original)==og(home)
 for url in re.findall(r'href="([^"]*access=1[^"]*)"',original):assert url in home
 home=re.sub(r'document.getElementById\("seoHomeButtonsContainer"\)\.style.display = "(none|block)";',r'document.getElementById("seoHomeButtonsContainer")?.style.setProperty("display", "\1");',home)
 home=home.replace('class="search-bar-premium-container" style="display:none;"','class="search-bar-premium-container"').replace('id="msgLogBusqueda" style="display: none;','id="msgLogBusqueda" role="status" style="display: block;')
 home=re.sub(r'<span class="seo-trigger-link" onclick="ejecutarEnlaceInterno\(\'([^\']+)\'\)">([^<]+)</span>',lambda m:f'<a class="seo-trigger-link" href="/{m[1]}/">{m[2]}</a>',home)
 home=home.replace('</head>','<script src="/historical-entry.js" defer></script></head>',1)
 stage.joinpath('index.html').write_text(home)
 template=stage.joinpath('ad507.template.html').read_text()
 template=template.replace('https://direcciones507.com/assets/og-image.jpg','https://direcciones507.com/og-image-new.jpg')
 template=template.replace('if(!data.ok) return;',"if(!data.ok || String(data.codigo || data.code || '').toUpperCase() !== CODE || data.publico === false || data.indexable === false || /resid|persona|privad/i.test(String(data.plan || '') + ' ' + String(data.tipo_direccion || ''))){ document.getElementById('nombre').textContent = 'Dirección no disponible'; return; }")
 dest.mkdir()
 for item in selected:
  if item in ['ad507.template.html','scripts/patch-ad507-2026.sh','.github/scripts/refine_hero.py']:continue
  src=stage/item;out=dest/item
  if src.is_dir():shutil.copytree(src,out)
  else:shutil.copy2(src,out)
 # These are public routing identifiers, never the private list or record payloads.
 router='''(() => {
 const allowed = new Set(CODES);
 const open = value => {
  const code=String(value||'').trim().toUpperCase();
  if(allowed.has(code)){location.assign('/'+code+'/');return;}
  const log=document.getElementById('msgLogBusqueda');
  if(log){log.textContent='Código no disponible en el directorio público.';log.style.display='block';}
 };
 const load=window.onload;
 window.onload=function(event){
  const code=new URLSearchParams(location.search).get('code');
  if(code){open(code);return;}
  if(load)load.call(window,event);
 };
 window.ejecutarBusquedaSistema=()=>open(document.getElementById('inputCodigo')?.value);
 window.ejecutarEnlaceInterno=open;
})();
'''.replace('CODES',json.dumps(codes))
 dest.joinpath('historical-entry.js').write_text(router)
 for row in public:
  code=row['codigo'];lower=code.lower();page=template
  values={'AD507-CODE':code,'{{CODE}}':code,'{{TITLE}}':f'Dirección {code} - Direcciones507 Panamá','{{DESC}}':f'Dirección digital {code} en Panamá','{{CANONICAL}}':'https://direcciones507.com/'+lower+'/','{{SLUG}}':lower,'{{OG_IMAGE}}':'https://direcciones507.com/og-image-new.jpg'}
  for key,val in values.items():page=page.replace(key,val)
  assert '{{' not in page,'Unprocessed template '+code
  for slug in [code,lower]:
   d=dest/slug;d.mkdir();d.joinpath('index.html').write_text(page)
 dest.joinpath('.nojekyll').touch()
 stamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
 dest.joinpath('sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<url><loc>'+html.escape('https://direcciones507.com/'+(c.lower()+'/' if c else ''))+'</loc></url>' for c in ['']+codes)+'</urlset>')
 files=[x for x in dest.rglob('*') if x.is_file()]
 for legal in ['terms','privacy','commercial','cookies','versions']:assert (dest/'legal'/legal/'index.html').is_file()
 assert not (dest/'codes.json').exists() and not (dest/'core').exists() and not (dest/'.github').exists()
 info={'source_commit':a.source,'built_at':stamp,'public_cards':len(codes),'routes':len(codes)*2,'public_codes':codes,'file_count':len(files)+1,'total_bytes':sum(x.stat().st_size for x in files),'template_sha256':hashlib.sha256(template.encode()).hexdigest(),'private_record_payloads_included':False}
 for _ in range(3):info['total_bytes']=sum(x.stat().st_size for x in files)+len(json.dumps(info,indent=2).encode())
 dest.joinpath('build-info.json').write_text(json.dumps(info,indent=2))
 print(json.dumps({k:v for k,v in info.items() if k!='public_codes'},indent=2))
