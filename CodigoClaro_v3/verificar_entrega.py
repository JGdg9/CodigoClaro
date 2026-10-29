#!/usr/bin/env python3
"""Verifica archivos, catálogos, PDF y sintaxis; no valida servicios externos ni motores del IDE."""
from pathlib import Path
from html.parser import HTMLParser
from collections import Counter
import hashlib, json, os, re, shutil, subprocess, sys, tempfile

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader=None

ROOT=Path(__file__).resolve().parent
PUB=ROOT/'public'
errors=[]; notes=[]
repo_root=ROOT.parent
def repository_txt_files():
    """Cuenta los archivos .txt rastreados o no ignorados del árbol del repositorio."""
    try:
        result=subprocess.run(
            ['git','ls-files','--cached','--others','--exclude-standard','-z'],
            cwd=repo_root,capture_output=True,check=True
        )
        candidates=[repo_root/Path(os.fsdecode(item)) for item in result.stdout.split(b'\0') if item]
    except (OSError,subprocess.CalledProcessError):
        excluded={'.git','node_modules','.venv','venv','__pycache__'}
        candidates=[]
        for current,dirs,names in os.walk(repo_root):
            dirs[:]=[name for name in dirs if name not in excluded]
            candidates.extend(Path(current)/name for name in names if name.lower().endswith('.txt'))
    return sorted(path.relative_to(repo_root).as_posix() for path in candidates
                  if path.is_file() and path.suffix.lower()=='.txt')
actual_txt=repository_txt_files()
expected_txt=['CodigoClaro_v3/requirements-docs.txt']
if actual_txt!=expected_txt:
    errors.append(f"Se esperaba un único archivo .txt ({expected_txt[0]}); se encontraron {len(actual_txt)}: {', '.join(actual_txt) or 'ninguno'}")
else:
    notes.append(f"Se encontró 1 archivo .txt: {actual_txt[0]}.")

try:
    content_validation=subprocess.run(
        [sys.executable,str(ROOT/'scripts'/'generar_temarios.py'),'--validate-only'],
        cwd=ROOT,capture_output=True,text=True,timeout=60
    )
    if content_validation.returncode:
        errors.append('El contenido versionado de los temarios no supera la validación: '+
                      (content_validation.stdout+'\n'+content_validation.stderr).strip())
    else:
        notes.append(content_validation.stdout.strip())
except Exception as exc:
    errors.append(f'No se pudo validar el contenido versionado de los temarios: {exc}')

try:
    public_catalog=json.loads((PUB/'catalogo_temas.json').read_text(encoding='utf-8'))
    expected_pages={item['file']:item.get('pages') for item in public_catalog}
    docs_catalog=json.loads((ROOT/'docs'/'catalogo_temas.json').read_text(encoding='utf-8'))
except Exception as exc:
    public_catalog=[]
    expected_pages={}
    docs_catalog=[]
    errors.append(f'No se pudo leer el catálogo público de temarios: {exc}')
if len(public_catalog)!=75 or len(docs_catalog)!=75:
    errors.append(f'Los catálogos público y documental deben tener 75 temas (hay {len(public_catalog)} y {len(docs_catalog)}).')
elif any((public.get('file'),public.get('pages'),public.get('version')) !=
         (docs.get('file'),docs.get('pages'),docs.get('version'))
         for public,docs in zip(public_catalog,docs_catalog)):
    errors.append('Los catálogos público y documental deben coincidir en archivos, páginas y versión.')
if PdfReader is None:
    errors.append('Falta pypdf; instala requirements-docs.txt para validar el contenido y la paginación mínima de los temarios.')
class CheckHTML(HTMLParser):
    def __init__(self): super().__init__(); self.ids=[]; self.local=[]
    def handle_starttag(self, tag, attrs):
        """Recoge IDs y referencias locales para detectar duplicados y enlaces rotos."""
        a=dict(attrs)
        if a.get('id'): self.ids.append(a['id'])
        for key in ('href','src'):
            val=a.get(key)
            if val: self.local.append((tag,key,val))

if not (ROOT/'server.js').is_file(): errors.append('Falta server.js')
if not (ROOT/'lib'/'quizzes.js').is_file(): errors.append('Falta el banco de preguntas del servidor')
if not (ROOT/'lib'/'quizzes-expanded.js').is_file(): errors.append('Falta el banco ampliado de preguntas')
if not (ROOT/'tests'/'api.test.js').is_file(): errors.append('Faltan las pruebas de integración')
expected={'Java':15,'JavaScript':15,'Python':15,'Kotlin':15,'React':15}
counts={}
for track,count_expected in expected.items():
    prefix=track
    files=list((PUB/'temarios').glob(f'{prefix}_Tema_*.pdf'))
    counts[track]=len(files)
    if len(files)!=count_expected: errors.append(f'{track}: se esperaban {count_expected} PDF individuales; hay {len(files)}')
    for f in files:
        if f.stat().st_size<500 or f.read_bytes()[:5]!=b'%PDF-': errors.append(f'PDF incompleto o inválido: {f.name}')
        actual_pages=None
        if PdfReader:
            try:
                reader=PdfReader(str(f),strict=True)
                actual_pages=len(reader.pages)
                if actual_pages<10: errors.append(f'{f.name}: tiene {actual_pages} páginas; requiere al menos 10')
                if len(reader.pages)>0:
                    for page_number,page in enumerate(reader.pages,start=1):
                        text=page.extract_text() or ''
                        # El pie y el título no cuentan como explicación didáctica.
                        text='\n'.join(line for line in text.splitlines()
                                       if not re.match(r'\s*CódigoClaro\s*[·|•]',line,re.I)
                                       and not re.match(r'\s*Página\s+\d+\s*$',line,re.I))
                        words=re.findall(r'\b[\wáéíóúüñÁÉÍÓÚÜÑ]+\b',text,re.UNICODE)
                        if len(words)<100: errors.append(f'{f.name}: la página {page_number} tiene solo {len(words)} palabras de contenido; requiere al menos 100')
            except Exception as exc:
                errors.append(f'No se pudo leer el contenido PDF de {f.name}: {exc}')
        pdfinfo=shutil.which('pdfinfo')
        if pdfinfo:
            # pdfinfo may emit Windows-1252 metadata (for example accented author names).
            # Replace undecodable bytes so the ASCII Pages field remains parseable on Windows.
            meta=subprocess.run([pdfinfo,str(f)],capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=10)
            match=re.search(r'^Pages:\s+(\d+)',meta.stdout,re.M)
            info_pages=int(match.group(1)) if match else None
            if actual_pages is None: actual_pages=info_pages
            elif info_pages!=actual_pages: errors.append(f'{f.name}: pdfinfo y pypdf discrepan ({info_pages} frente a {actual_pages} páginas)')
            expected_count=expected_pages.get(f.name)
            if not match or actual_pages!=expected_count: errors.append(f'{f.name}: catálogo declara {expected_count} páginas y el PDF contiene {actual_pages if actual_pages is not None else "sin dato"}')
        mirror=ROOT/'docs'/'temarios'/f.name
        if not mirror.is_file():
            errors.append(f'Falta la copia documental de {f.name} en docs/temarios')
        elif hashlib.sha256(f.read_bytes()).digest()!=hashlib.sha256(mirror.read_bytes()).digest():
            errors.append(f'Las copias public/docs de {f.name} no son idénticas')
pdfs=list((PUB/'temarios').glob('*.pdf'))
if len(pdfs)!=90: errors.append(f'Se esperaban 90 PDF en total; hay {len(pdfs)}')
doc_pdfs=list((ROOT/'docs'/'temarios').glob('*.pdf'))
public_names=sorted(path.name for path in pdfs)
docs_names=sorted(path.name for path in doc_pdfs)
if public_names!=docs_names:
    errors.append('public/temarios y docs/temarios deben contener exactamente los mismos PDF.')
else:
    for public_pdf,docs_pdf in zip(sorted(pdfs,key=lambda path:path.name),sorted(doc_pdfs,key=lambda path:path.name)):
        if hashlib.sha256(public_pdf.read_bytes()).digest()!=hashlib.sha256(docs_pdf.read_bytes()).digest():
            errors.append(f'Las copias public/docs no son idénticas: {public_pdf.name}')
typescript_route=PUB/'temarios'/'Ruta_TypeScript_JavaScript_React_Node_15_Temas.pdf'
if not typescript_route.is_file(): errors.append('Falta la ruta complementaria TypeScript de 15 temas')
for f in pdfs:
    if f.stat().st_size<500 or f.read_bytes()[:5]!=b'%PDF-': errors.append(f'Cabecera PDF incorrecta: {f.name}')
    if not f.read_bytes()[-1024:].strip().endswith(b'%%EOF'): errors.append(f'No se ha localizado %%EOF al final de {f.name}')
    if PdfReader and f.name not in expected_pages:
        try:
            page_count=len(PdfReader(str(f),strict=True).pages)
            if page_count<10: errors.append(f'{f.name}: tiene {page_count} páginas; requiere al menos 10')
        except Exception as exc:
            errors.append(f'No se pudo leer la paginación de {f.name}: {exc}')
if not (PUB/'aula.html').is_file(): errors.append('Falta el aula completa')
if not (PUB/'premium-piloto.html').is_file(): errors.append('Falta el prototipo local del apartado Premium')
elif 'premium-piloto.html' not in (PUB/'index.html').read_text(encoding='utf-8'):
    errors.append('La portada no enlaza al prototipo Premium')
if not (PUB/'temarios').is_dir(): errors.append('Falta public/temarios con los PDF')
if not (PUB/'ayuda').is_dir(): errors.append('Falta public/ayuda con la documentación de usuario')
if not (PUB/'temarios.html').is_file(): errors.append('Falta la página de temarios')
if not (PUB/'privacidad.html').is_file() or not (PUB/'condiciones.html').is_file(): errors.append('Faltan textos de privacidad/condiciones')
quiz_text=(ROOT/'lib'/'quizzes.js').read_text(encoding='utf-8') if (ROOT/'lib'/'quizzes.js').exists() else ''
quiz_ids=re.findall(r"\{id:'([^']+)'",quiz_text)
if len(quiz_ids)<15: errors.append(f'Banco de preguntas demasiado pequeño: {len(quiz_ids)}')
if len(set(quiz_ids))!=len(quiz_ids): errors.append('Hay identificadores de preguntas duplicados')
# Static HTML, local references and inline JS parse checks.
node=shutil.which('node')
for name in ['index.html','aula.html','temarios.html','diagnostico.html','privacidad.html','condiciones.html','guia-temarios.html','premium-piloto.html']:
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
        if not target.exists() and pathpart.lower().endswith('.pdf'):
            target=PUB/'temarios'/Path(pathpart).name
        if not target.exists() and Path(pathpart).suffix.lower() in ('.txt','.md'):
            help_name=Path(pathpart).name
            if help_name.lower().endswith('.txt'): help_name=help_name[:-4]+'.md'
            target=PUB/'ayuda'/help_name
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
    for file in [ROOT/'server.js',ROOT/'lib'/'quizzes.js',ROOT/'lib'/'quizzes-expanded.js',*sorted((ROOT/'tests').glob('*.test.js'))]:
        r=subprocess.run([node,'--check',str(file)],capture_output=True,text=True,timeout=15)
        if r.returncode: errors.append(f'Sintaxis Node incorrecta en {file.relative_to(ROOT)}: {(r.stderr or r.stdout).strip()}')
    test_files=sorted((ROOT/'tests').glob('*.test.js'))
    r=subprocess.run([node,'--test',*[str(f) for f in test_files]],capture_output=True,text=True,timeout=90,cwd=ROOT)
    if r.returncode: errors.append('Suite de pruebas fallida:\n'+(r.stdout+'\n'+r.stderr).strip())
    else:
        match=re.search(r'\btests\s+(\d+)',r.stdout)
        notes.append(f'Suite automatizada superada ({match.group(1) if match else len(test_files)} pruebas contabilizadas; API, regresión frontend, seguridad y recursos).')
else:
    errors.append('Node.js no está instalado; no se pueden ejecutar las comprobaciones JavaScript/API.')

if errors:
    print('FALLO: se encontraron problemas:')
    for e in errors: print(' - '+e)
    sys.exit(1)
print(f'OK: catálogo con 75 temas individuales y {len(pdfs) - len(public_catalog)} PDF complementarios.')
if shutil.which('pdfinfo'): print('OK: los 75 temarios individuales coinciden con el número de páginas del catálogo.')
print(f'OK: los {len(pdfs)} PDF en public/temarios tienen al menos 10 páginas, cabecera válida y marcador final.')
print('OK: estructura HTML, IDs, enlaces locales y sintaxis JS revisados.')
for n in notes: print('OK: '+n)
print('Límite: no certifica visualmente cada navegador ni los motores externos/CDN del IDE; revísalos manualmente antes de probar con participantes.')
