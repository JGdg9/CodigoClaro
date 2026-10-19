#!/usr/bin/env python3
"""Verificación del paquete piloto CódigoClaro; no ejecuta los motores del IDE."""
from pathlib import Path
from html.parser import HTMLParser
from collections import Counter
import json, re, shutil, subprocess, sys, tempfile

ROOT=Path(__file__).resolve().parent
PUB=ROOT/'public'
errors=[]; notes=[]
class CheckHTML(HTMLParser):
    def __init__(self): super().__init__(); self.ids=[]; self.local=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if a.get('id'): self.ids.append(a['id'])
        for key in ('href','src'):
            val=a.get(key)
            if val: self.local.append((tag,key,val))

if not (ROOT/'server.js').is_file(): errors.append('Falta server.js')
if not (ROOT/'lib'/'quizzes.js').is_file(): errors.append('Falta el banco de preguntas del servidor')
if not (ROOT/'tests'/'api.test.js').is_file(): errors.append('Faltan las pruebas de integración')
expected={'Java':15,'JavaScript':15,'Python':15,'Kotlin':15,'React':15}
counts={}
for track,count_expected in expected.items():
    prefix=track
    files=list(PUB.glob(f'{prefix}_Tema_*.pdf'))
    counts[track]=len(files)
    if len(files)!=count_expected: errors.append(f'{track}: se esperaban {count_expected} PDF individuales; hay {len(files)}')
    for f in files:
        if f.stat().st_size<500 or f.read_bytes()[:5]!=b'%PDF-': errors.append(f'PDF incompleto o inválido: {f.name}')
        pdfinfo=shutil.which('pdfinfo')
        if pdfinfo:
            meta=subprocess.run([pdfinfo,str(f)],capture_output=True,text=True,timeout=10)
            match=re.search(r'^Pages:\s+(\d+)',meta.stdout,re.M)
            if not match or int(match.group(1))!=10: errors.append(f'{f.name}: se esperaban 10 páginas, se detectaron {match.group(1) if match else 'sin dato'}')
pdfs=list(PUB.glob('*.pdf'))
if len(pdfs)!=89: errors.append(f'Se esperaban 89 PDF en total; hay {len(pdfs)}')
for f in pdfs:
    if f.stat().st_size<500 or f.read_bytes()[:5]!=b'%PDF-': errors.append(f'Cabecera PDF incorrecta: {f.name}')
    if not f.read_bytes()[-1024:].strip().endswith(b'%%EOF'): errors.append(f'No se ha localizado %%EOF al final de {f.name}')
if not (PUB/'aula.html').is_file(): errors.append('Falta el aula completa')
if not (PUB/'temarios.html').is_file(): errors.append('Falta la página de temarios')
if not (PUB/'privacidad.html').is_file() or not (PUB/'condiciones.html').is_file(): errors.append('Faltan textos de privacidad/condiciones')
quiz_text=(ROOT/'lib'/'quizzes.js').read_text(encoding='utf-8') if (ROOT/'lib'/'quizzes.js').exists() else ''
quiz_ids=re.findall(r"\{id:'([^']+)'",quiz_text)
if len(quiz_ids)<15: errors.append(f'Banco de preguntas demasiado pequeño: {len(quiz_ids)}')
if len(set(quiz_ids))!=len(quiz_ids): errors.append('Hay identificadores de preguntas duplicados')
# Static HTML, local references and inline JS parse checks.
node=shutil.which('node')
for name in ['index.html','aula.html','temarios.html','diagnostico.html','privacidad.html','condiciones.html','guia-temarios.html']:
    file=PUB/name
    if not file.exists(): errors.append(f'Falta página: {name}'); continue
    src=file.read_text(encoding='utf-8')
    if not src.lstrip().lower().startswith('<!doctype html>') or not src.rstrip().lower().endswith('</html>'): errors.append(f'Estructura HTML básica a revisar: {name}')
    parser=CheckHTML(); parser.feed(src)
    dup=[k for k,v in Counter(parser.ids).items() if v>1]
    if dup: errors.append(f'IDs HTML duplicados en {name}: {dup[:5]}')
    for tag,key,ref in parser.local:
        if ref.startswith(('https://','http://','//','data:','blob:','javascript:','#')) or '${' in ref: continue
        pathpart=ref.split('?',1)[0].split('#',1)[0]
        if not pathpart or pathpart in ('/','/privacidad','/condiciones') or pathpart.startswith('/api/'): continue
        target=(PUB/pathpart.lstrip('/')) if pathpart.startswith('/') else (PUB/pathpart)
        if not target.exists(): errors.append(f'Enlace local roto en {name}: {ref}')
    if node:
        scripts=re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>',src,re.I|re.S)
        for i,js in enumerate(scripts):
            with tempfile.NamedTemporaryFile('w',suffix='.js',encoding='utf-8',delete=False) as temp:
                temp.write(js); tmp=Path(temp.name)
            try:
                result=subprocess.run([node,'--check',str(tmp)],capture_output=True,text=True,timeout=15)
                if result.returncode: errors.append(f'Sintaxis JS en {name}, bloque {i+1}: {(result.stderr or result.stdout).strip()}')
            except Exception as exc: errors.append(f'No se pudo revisar JS de {name}: {exc}')
            finally: tmp.unlink(missing_ok=True)

if node:
    for file in [ROOT/'server.js',ROOT/'lib'/'quizzes.js',ROOT/'tests'/'api.test.js']:
        r=subprocess.run([node,'--check',str(file)],capture_output=True,text=True,timeout=15)
        if r.returncode: errors.append(f'Sintaxis Node incorrecta en {file.relative_to(ROOT)}: {(r.stderr or r.stdout).strip()}')
    r=subprocess.run([node,'--test',str(ROOT/'tests'/'api.test.js')],capture_output=True,text=True,timeout=30,cwd=ROOT)
    if r.returncode: errors.append('Pruebas API fallidas:\n'+(r.stdout+'\n'+r.stderr).strip())
    else: notes.append('Prueba de integración API superada (registro/login/cookies, progreso aislado, test, cambio de contraseña, feedback, admin/CSV y borrado).')
else:
    errors.append('Node.js no está instalado; no se pueden ejecutar las comprobaciones JavaScript/API.')

if errors:
    print('FALLO: se encontraron problemas:')
    for e in errors: print(' - '+e)
    sys.exit(1)
print('OK: catálogo con 75 temas (15 por tecnología).')
if shutil.which('pdfinfo'): print('OK: los 75 temarios individuales tienen exactamente 10 páginas.')
print(f'OK: {len(pdfs)} PDF con cabecera válida y marcador final.')
print('OK: estructura HTML, IDs, enlaces locales y sintaxis JS revisados.')
for n in notes: print('OK: '+n)
print('Límite: no certifica visualmente cada navegador ni los motores externos/CDN del IDE; revísalos manualmente antes de probar con participantes.')
