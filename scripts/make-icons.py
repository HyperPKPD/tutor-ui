"""Regenerates the logo, favicons and social image in public/ from the SVG definitions below.
Usage: python3 scripts/make-icons.py   (needs Playwright + Pillow; `npm run icons`)"""
import os, subprocess, sys, tempfile, json
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PUB = os.path.join(ROOT, 'public'); ICONS = os.path.join(PUB, 'icons')
os.makedirs(ICONS, exist_ok=True)

# Drawing in a 512x512 box: concentration-time curves of three populations on classic L-shaped axes.
ART = '''
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M118 128 V394 H398" stroke="#e2e8f0" stroke-width="22"/>
    <path d="M118 394 C168 394 176 156 236 156 C296 156 304 328 392 372" stroke="#3b82f6" stroke-width="26"/>
    <path d="M118 394 C160 394 168 112 222 112 C284 112 296 292 392 354" stroke="#f97316" stroke-width="26" opacity=".95"/>
    <path d="M118 394 C186 394 214 232 280 232 C330 232 350 350 392 384" stroke="#a855f7" stroke-width="26" opacity=".95"/>
  </g>'''
BG = '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e3a8a"/><stop offset="1" stop-color="#0b1226"/></linearGradient></defs>'

def svg(kind):
    if kind == 'rounded':   # favicon / any-purpose icon
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">{BG}<rect width="512" height="512" rx="112" fill="url(#g)"/>{ART}</svg>'
    if kind == 'full':      # apple-touch (iOS rounds it itself)
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">{BG}<rect width="512" height="512" fill="url(#g)"/>{ART}</svg>'
    if kind == 'maskable':  # content kept inside the central 62% safe zone
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">{BG}<rect width="512" height="512" fill="url(#g)"/><g transform="translate(96 96) scale(.625)">{ART}</g></svg>'

open(os.path.join(PUB, 'favicon.svg'), 'w').write(svg('rounded'))
open(os.path.join(ICONS, 'logo.svg'), 'w').write(svg('rounded'))

og = f'''<html><body style="margin:0"><div style="width:1200px;height:630px;background:linear-gradient(135deg,#1e3a8a,#0b1226);display:flex;align-items:center;gap:56px;padding:0 90px;box-sizing:border-box;font-family:Inter,Segoe UI,Arial,sans-serif;color:#fff">
<div style="width:300px;height:300px;flex:none">{svg('rounded')}</div>
<div><div style="font-size:92px;font-weight:800;letter-spacing:-2px">HyperPKPD</div>
<div style="font-size:50px;font-weight:600;color:#93c5fd;margin-top:6px">Interactive Population PK &amp; Exposure–Response</div>
<div style="font-size:30px;color:#cbd5e1;margin-top:26px;line-height:1.35">1–3 compartment · TMDD · Emax · Hill · hockey-stick<br>Equations, steady-state exposure and concept quizzes</div>
<div style="font-size:28px;color:#fbbf24;margin-top:26px;font-weight:600">hyperpkpd.com/tutor</div></div></div></body></html>'''

jobs = [
  ('rounded', 512, os.path.join(ICONS, 'icon-512.png')), ('rounded', 192, os.path.join(ICONS, 'icon-192.png')),
  ('maskable', 512, os.path.join(ICONS, 'icon-maskable-512.png')), ('maskable', 192, os.path.join(ICONS, 'icon-maskable-192.png')),
  ('full', 180, os.path.join(ICONS, 'apple-touch-icon.png')), ('rounded', 48, os.path.join(ICONS, 'favicon-48.png')),
  ('rounded', 32, os.path.join(ICONS, 'favicon-32.png')), ('rounded', 16, os.path.join(ICONS, 'favicon-16.png')),
]
js = '''const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const jobs=JSON.parse(process.argv[2]);
for(const j of jobs){const p=await b.newPage({viewport:{width:j.w,height:j.h},deviceScaleFactor:1});
 await p.setContent('<html><body style="margin:0;background:transparent">'+j.html+'</body></html>');
 await p.screenshot({path:j.out,omitBackground:true});await p.close();}
await b.close();})();'''
payload = [{'w': s, 'h': s, 'out': out, 'html': f'<div style="width:{s}px;height:{s}px">' + svg(k).replace('<svg ', f'<svg width="{s}" height="{s}" ') + '</div>'} for k, s, out in jobs]
payload.append({'w': 1200, 'h': 630, 'out': os.path.join(PUB, 'og-image.png'), 'html': og.replace('<html><body style="margin:0">', '').replace('</body></html>', '')})
f = tempfile.NamedTemporaryFile('w', suffix='.cjs', delete=False); f.write(js); f.close()
subprocess.run(['node', f.name, json.dumps(payload)], check=True)
# multi-size favicon.ico (PNG-compressed entries)
imgs = [Image.open(os.path.join(ICONS, n)).convert('RGBA') for n in ('favicon-48.png', 'favicon-32.png', 'favicon-16.png')]
imgs[0].save(os.path.join(PUB, 'favicon.ico'), format='ICO', sizes=[(48, 48), (32, 32), (16, 16)], append_images=imgs[1:])
print('icons written')
