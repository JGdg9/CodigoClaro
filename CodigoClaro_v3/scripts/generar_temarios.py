#!/usr/bin/env python3
"""Genera y valida los temarios PDF desde contenido versionado.

Las rutas se resuelven respecto al proyecto para permitir ejecutar este
generador desde cualquier directorio.
"""
from pathlib import Path
import json
import shutil
import sys
import tempfile
from urllib.parse import urlparse
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Preformatted, Table, TableStyle, KeepTogether
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parents[1]
PUB = ROOT / 'public'
CATALOG = PUB / 'catalogo_temas.json'
CONTENT_FILE = Path(__file__).resolve().parent / 'temarios_contenido.json'
TOPIC_CONTENT = {}

# Registra fuentes del sistema para conservar tildes y signos en todos los bloques.
FONT, BOLD, CODE = 'Helvetica', 'Helvetica-Bold', 'Courier'
font_sets = [
    (Path('C:/Windows/Fonts/arial.ttf'), Path('C:/Windows/Fonts/arialbd.ttf'), Path('C:/Windows/Fonts/consola.ttf')),
    (Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'), Path('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'), Path('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf')),
]
for regular_path, bold_path, code_path in font_sets:
    if all(path.is_file() for path in (regular_path, bold_path, code_path)):
        pdfmetrics.registerFont(TTFont('CC-Regular', str(regular_path)))
        pdfmetrics.registerFont(TTFont('CC-Bold', str(bold_path)))
        pdfmetrics.registerFont(TTFont('CC-Code', str(code_path)))
        FONT, BOLD, CODE = 'CC-Regular', 'CC-Bold', 'CC-Code'
        break

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='CoverTitleCC', fontName=BOLD, fontSize=24, leading=30, textColor=colors.HexColor('#243b80'), spaceAfter=16, alignment=TA_LEFT))
styles.add(ParagraphStyle(name='SubCC', fontName=FONT, fontSize=11, leading=14, textColor=colors.HexColor('#475467'), spaceAfter=5))
styles.add(ParagraphStyle(name='H1CC', fontName=BOLD, fontSize=16, leading=19, textColor=colors.HexColor('#243b80'), spaceBefore=4, spaceAfter=7, keepWithNext=True))
styles.add(ParagraphStyle(name='H2CC', fontName=BOLD, fontSize=10.5, leading=13, textColor=colors.HexColor('#087f8c'), spaceBefore=6, spaceAfter=3, keepWithNext=True))
styles.add(ParagraphStyle(name='BodyCC', fontName=FONT, fontSize=9, leading=12.2, textColor=colors.HexColor('#263244'), spaceAfter=5))
styles.add(ParagraphStyle(name='SmallCC', fontName=FONT, fontSize=8, leading=10, textColor=colors.HexColor('#596579'), spaceAfter=3))
styles.add(ParagraphStyle(name='CodeCC', fontName=CODE, fontSize=7.4, leading=9.2, leftIndent=8, rightIndent=8, backColor=colors.HexColor('#f3f5f9'), borderColor=colors.HexColor('#d8deea'), borderWidth=.5, borderPadding=6, spaceBefore=3, spaceAfter=5))
styles.add(ParagraphStyle(name='BulletCC', parent=styles['BodyCC'], leftIndent=13, firstLineIndent=-8, bulletIndent=0, spaceAfter=2))
styles.add(ParagraphStyle(name='BodyLastCC', fontName=FONT, fontSize=9.5, leading=13.6, textColor=colors.HexColor('#263244'), spaceAfter=6))
styles.add(ParagraphStyle(name='BulletLastCC', parent=styles['BodyLastCC'], leftIndent=13, firstLineIndent=-8, bulletIndent=0, spaceAfter=3))


def esc(s):
    """Escapa texto para insertarlo de forma segura en el marcado de un PDF."""
    return (str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            .replace('"', '&quot;').replace("'", '&apos;'))
def para(s, style='BodyCC'):
    """Crea un párrafo PDF con el estilo editorial solicitado."""
    return Paragraph(esc(s).replace('\n','<br/>'), styles[style])
def bullet(s):
    """Crea un elemento de lista para los documentos generados."""
    return Paragraph('• ' + esc(s), styles['BulletCC'])

def code_panel(value):
    """Separa el código, su etiqueta de lenguaje y las notas editoriales."""
    lines = str(value).splitlines()
    language = ''
    if lines and lines[0].strip().startswith('[') and lines[0].strip().endswith(']'):
        language = lines.pop(0).strip()[1:-1]
    code_lines, notes = [], []
    for line in lines:
        if line.startswith(('Contexto:', 'Criterio de aceptación:')):
            notes.append(line)
        else:
            code_lines.append(line)
    blocks = []
    if language:
        blocks.append(para('Código · ' + language, 'SmallCC'))
    code = '\n'.join(code_lines).strip()
    if code:
        blocks.append(Preformatted(code, styles['CodeCC'], maxLineLength=100))
    blocks.extend(para(note, 'SmallCC') for note in notes)
    return blocks

def footer(canvas, doc):
    """Dibuja el pie de página y la numeración de cada página del PDF."""
    canvas.saveState(); w,h=A4
    canvas.setStrokeColor(colors.HexColor('#d9dee8')); canvas.line(1.8*cm,1.35*cm,w-1.8*cm,1.35*cm)
    canvas.setFont(FONT,7); canvas.setFillColor(colors.HexColor('#667085'))
    canvas.drawString(1.8*cm,0.95*cm,'CódigoClaro · Síntesis basada en fuentes oficiales')
    canvas.drawRightString(w-1.8*cm,0.95*cm,f'Página {doc.page}')
    canvas.restoreState()

def case_table(cases):
    rows = [
        [para('Entrada', 'SmallCC'), para('Resultado esperado', 'SmallCC')],
        *[[para(case['input'], 'SmallCC'), para(case['expected'], 'SmallCC')] for case in cases],
    ]
    return Table(
        rows,
        colWidths=[6.5 * cm, 10.5 * cm],
        style=TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#eaf0ff')),
            ('GRID', (0, 0), (-1, -1), .4, colors.HexColor('#d9dee8')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]),
    )


def make_pages(item):
    """Construye un tema con explicación, ejemplo, pruebas y solución verificable."""
    track, num, title = item['track'], item['num'], item['title']
    try:
        content = TOPIC_CONTENT[(track, title)]
    except KeyError as exc:
        raise ValueError(f'Falta contenido didáctico para {track}: {title}') from exc

    sources = [
        Paragraph(
            f'<link href="{esc(source["url"])}" color="#087f8c">{esc(source["label"])}</link>',
            styles['SmallCC'],
        )
        for source in content['sources']
    ]
    page_one = [
        para(f'CÓDIGOCLARO · RUTA {track.upper()}', 'H2CC'),
        para(f'Tema {num:02d} · {title}', 'CoverTitleCC'),
        para('Guía de estudio · DAM/DAW', 'SubCC'),
        para(item['description']),
        para('1. Explicación', 'H1CC'),
        para(content['explanation']),
        para('2. Ejemplo', 'H1CC'),
        *code_panel(content['example']),
        para('Resultado esperado', 'H2CC'),
        Preformatted(content['output'], styles['CodeCC'], maxLineLength=100),
    ]
    page_two = [
        para('3. Errores frecuentes', 'H1CC'),
        *[bullet(mistake) for mistake in content['mistakes']],
        para('4. Ejercicio', 'H1CC'),
        para(content['exercise']['statement']),
        para('Casos que debe superar', 'H2CC'),
        case_table(content['exercise']['cases']),
    ]
    page_three = [
        KeepTogether([
            para('5. Solución explicada', 'H1CC'),
            *code_panel(content['exercise']['solution']),
        ]),
        para('Otras soluciones válidas', 'H2CC'),
        *[bullet(approach) for approach in content['exercise']['alternatives']],
        para('6. Fuentes oficiales', 'H1CC'),
        para('Esta guía resume conceptos para estudiar. Consulta las fuentes para comprobar detalles de versión y APIs.'),
        *sources,
    ]
    return [page_one, page_two, page_three]


def load_topic_content(catalog):
    """Valida que cada tema tenga material y pruebas concretas antes de generar."""
    if not CONTENT_FILE.is_file():
        raise FileNotFoundError(f'Falta el contenido didáctico versionado: {CONTENT_FILE}')
    payload = json.loads(CONTENT_FILE.read_text(encoding='utf-8'))
    if payload.get('version') != 1 or not isinstance(payload.get('topics'), list):
        raise ValueError('El banco de contenido debe tener version 1 y una lista topics.')

    expected = {(item['track'], item['title']) for item in catalog}
    indexed = {}
    for content in payload['topics']:
        if not isinstance(content, dict):
            raise ValueError('Cada entrada de topics debe ser un objeto JSON.')
        key = (content.get('track'), content.get('title'))
        if key in indexed:
            raise ValueError(f'Contenido duplicado para {key[0]}: {key[1]}')
        required_text = ('explanation', 'example')
        if any(not isinstance(content.get(field), str) or len(content[field].strip()) < 2 for field in required_text):
            raise ValueError(f'Explicación o ejemplo vacíos para {key[0]}: {key[1]}')
        if not isinstance(content.get('output'), str) or not content['output'].strip():
            raise ValueError(f'Explicación, ejemplo o salida vacíos para {key[0]}: {key[1]}')
        mistakes = content.get('mistakes')
        exercise = content.get('exercise')
        sources = content.get('sources')
        if not isinstance(mistakes, list) or len(mistakes) < 3:
            raise ValueError(f'Se requieren tres errores frecuentes para {key[0]}: {key[1]}')
        if not isinstance(exercise, dict) or not isinstance(exercise.get('statement'), str) or not isinstance(exercise.get('cases'), list) or len(exercise['cases']) < 3:
            raise ValueError(f'Se requieren tres casos de prueba para {key[0]}: {key[1]}')
        if any(not isinstance(case, dict) or not isinstance(case.get('input'), str) or not isinstance(case.get('expected'), str) for case in exercise['cases']):
            raise ValueError(f'Cada caso necesita entrada y resultado esperados en {key[0]}: {key[1]}')
        if not isinstance(exercise.get('solution'), str) or len(exercise['solution'].strip()) < 8:
            raise ValueError(f'Falta solución desarrollada para {key[0]}: {key[1]}')
        if not isinstance(exercise.get('alternatives'), list) or len(exercise['alternatives']) < 2 or any(not isinstance(value, str) or not value.strip() for value in exercise['alternatives']):
            raise ValueError(f'Se requieren dos enfoques válidos para {key[0]}: {key[1]}')
        if not isinstance(sources, list) or not sources or any(
            not isinstance(source, dict)
            or not isinstance(source.get('label'), str)
            or not isinstance(source.get('url'), str)
            or urlparse(source['url']).scheme != 'https'
            or not urlparse(source['url']).hostname
            for source in sources
        ):
            raise ValueError(f'Falta una fuente HTTPS directa para {key[0]}: {key[1]}')
        indexed[key] = content

    missing = expected - indexed.keys()
    unexpected = indexed.keys() - expected
    if missing or unexpected:
        raise ValueError(f'Cobertura del catálogo incorrecta; faltan {sorted(missing)} y sobran {sorted(unexpected)}.')
    return indexed
def build_pdf(item, workspace):
    """Genera el PDF de un tema en la carpeta pública organizada de temarios."""
    dest = PUB / 'temarios' / item['file']
    work_pdf = workspace / item['file']
    dest.parent.mkdir(parents=True, exist_ok=True)
    story=[]
    pages = make_pages(item)
    for content in pages:
        # Deja fluir las secciones para no reservar una página casi vacía por apartado.
        story.extend(content)
    doc=SimpleDocTemplate(str(work_pdf), pagesize=A4, rightMargin=1.8*cm, leftMargin=1.8*cm, topMargin=1.65*cm, bottomMargin=1.8*cm, title=f"{item['track']} · Tema {item['num']:02d}: {item['title']}", author='CódigoClaro · síntesis con fuentes oficiales', subject=f"Temario didáctico de {item['track']} para DAM y DAW")
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    shutil.copyfile(work_pdf, dest)
    return dest, doc.page


# Ruta adicional mantenida separada del catálogo principal para no regenerar
# los 75 temarios ni sobrescribir su índice al producir estos materiales.
TS_ROUTE_SOURCES = {
    'intro': ('Handbook: introducción', 'https://www.typescriptlang.org/docs/handbook/intro.html'),
    'everyday': ('Handbook: tipos cotidianos', 'https://www.typescriptlang.org/docs/handbook/2/everyday-types.html'),
    'objects': ('Handbook: tipos de objeto', 'https://www.typescriptlang.org/docs/handbook/2/objects.html'),
    'exact_optional': ('TSConfig: exactOptionalPropertyTypes', 'https://www.typescriptlang.org/tsconfig/exactOptionalPropertyTypes.html'),
    'strict': ('TSConfig: strict', 'https://www.typescriptlang.org/tsconfig/strict.html'),
    'strict_null_checks': ('TSConfig: strictNullChecks', 'https://www.typescriptlang.org/tsconfig/strictNullChecks.html'),
    'narrowing': ('Handbook: narrowing', 'https://www.typescriptlang.org/docs/handbook/2/narrowing.html'),
    'functions': ('Handbook: funciones', 'https://www.typescriptlang.org/docs/handbook/2/functions.html'),
    'generics': ('Handbook: genéricos', 'https://www.typescriptlang.org/docs/handbook/2/generics.html'),
    'types_from_types': ('Handbook: creación de tipos a partir de tipos', 'https://www.typescriptlang.org/docs/handbook/2/types-from-types.html'),
    'utility': ('Handbook: tipos de utilidad', 'https://www.typescriptlang.org/docs/handbook/utility-types.html'),
    'classes': ('Handbook: clases', 'https://www.typescriptlang.org/docs/handbook/2/classes.html'),
    'modules': ('Handbook: módulos', 'https://www.typescriptlang.org/docs/handbook/2/modules.html'),
    'tsconfig': ('Referencia oficial de TSConfig', 'https://www.typescriptlang.org/tsconfig/'),
    'migration': ('Handbook: migrar desde JavaScript', 'https://www.typescriptlang.org/docs/handbook/migrating-from-javascript.html'),
    'jsdoc': ('Handbook: tipos JSDoc', 'https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html'),
    'declarations': ('Handbook: archivos de declaración', 'https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html'),
    'allow_js': ('TSConfig: allowJs', 'https://www.typescriptlang.org/tsconfig/allowJs.html'),
    'check_js': ('TSConfig: checkJs', 'https://www.typescriptlang.org/tsconfig/checkJs.html'),
    'react': ('React: usar TypeScript', 'https://react.dev/learn/typescript'),
    'node_typescript': ('Node.js: TypeScript en ejecución', 'https://nodejs.org/api/typescript.html'),
}

TS_ROUTE = [
    {
        'title': 'Del JavaScript al verificador de TypeScript',
        'concept': 'TypeScript analiza estáticamente programas JavaScript y permite describir sus valores con tipos. El análisis ayuda a detectar incompatibilidades antes de ejecutar; no inspecciona ni valida por sí solo los datos que llegan en tiempo de ejecución.',
        'objective': 'Distinguir verificación estática, ejecución JavaScript y opciones del proyecto; reconocer qué cambia al activar strict.',
        'practice': 'Toma una función JavaScript que calcule el total de una compra. Añade tipos gradualmente, configura un tsconfig mínimo con strict y registra qué defectos detecta el compilador y cuáles requieren comprobaciones en ejecución.',
        'criterion': 'Explica un hallazgo estático y un riesgo que sigue en tiempo de ejecución.',
        'sources': ['intro', 'tsconfig', 'strict'],
    },
    {
        'title': 'Inferencia, anotaciones y tipos básicos',
        'concept': 'El compilador puede inferir un tipo a partir del valor inicial y del contexto. Las anotaciones son útiles cuando aclaran una frontera o un contrato; no hace falta repetir automáticamente información que ya está bien inferida.',
        'objective': 'Leer tipos inferidos y usar string, number, boolean y tipos literales donde aclaren el contrato.',
        'practice': 'Convierte una función de descuento de JS: acepta un precio y un código promocional limitado a "ESTUDIANTE" o "GENERAL". Anota solo las fronteras necesarias y compara los errores con la versión sin tipos.',
        'criterion': 'Predice qué llamadas son aceptadas sin recurrir a any.',
        'sources': ['everyday'],
    },
    {
        'title': 'Arrays, tuplas y colecciones de solo lectura',
        'concept': 'Los arrays representan secuencias de elementos de un tipo; las tuplas expresan una secuencia con posiciones y tipos conocidos. Las variantes readonly limitan las operaciones de escritura disponibles desde esa referencia.',
        'objective': 'Elegir entre array y tupla según si importa el tamaño o el significado de cada posición.',
        'practice': 'Modela productos de inventario como pares [codigo, unidades], con codigo string y unidades number. Escribe una función que sume las unidades por código y explica por qué su entrada es una colección y cada fila una tupla.',
        'criterion': 'Detecta una fila incompleta y evita mutar la entrada si el contrato la declara readonly.',
        'sources': ['everyday', 'objects'],
    },
    {
        'title': 'Tipos de objeto y propiedades opcionales',
        'concept': 'Un tipo de objeto describe las propiedades que una operación puede leer. `?` permite omitir una propiedad y al leerla se debe contemplar `undefined`; `exactOptionalPropertyTypes` cambia si también se permite asignar `undefined` explícitamente. `readonly` restringe la asignación a través de esa referencia, pero no convierte todo el objeto en inmutable.',
        'objective': 'Describir registros con propiedades requeridas, opcionales y de solo lectura.',
        'practice': 'Define `Modulo` con identificador readonly, nombre, curso opcional y plazas. Presenta el curso ausente como "sin asignar"; compara la asignación explícita de `undefined` con `exactOptionalPropertyTypes` activado y desactivado, y revisa un objeto literal con una propiedad mal escrita.',
        'criterion': 'Al leer `curso`, contempla `undefined` y explica qué cambia al asignarlo explícitamente.',
        'sources': ['objects', 'exact_optional'],
    },
    {
        'title': 'Uniones y narrowing del flujo de control',
        'concept': 'Una unión expresa varios estados posibles. Comprobaciones como typeof, in y una propiedad discriminante permiten al compilador estrechar esa unión dentro de una rama; la lógica de ejecución sigue siendo necesaria.',
        'objective': 'Representar alternativas sin campos contradictorios y estrecharlas antes de usar propiedades específicas.',
        'practice': 'Modela el resultado de buscar un módulo con los estados encontrado, no encontrado y error. Usa `kind` y, en `default`, asigna el valor restante a una variable de tipo `never`; añade un estado y comprueba que el compilador señala esa asignación hasta que incluyas su rama.',
        'criterion': 'Cada rama accede solo a los datos presentes en ese estado.',
        'sources': ['narrowing', 'everyday'],
    },
    {
        'title': 'Funciones, callbacks y contratos',
        'concept': 'Los tipos de función describen parámetros y resultado. Los callbacks pueden recibir sus propios contratos; parámetros opcionales y rest deben reflejar las llamadas que el código realmente permite.',
        'objective': 'Tipar entradas, salidas y callbacks sin usar Function ni debilitar el contrato con any.',
        'practice': 'Escribe `filtrarModulos` con una lista y un predicado `(modulo: Modulo) => boolean`; úsalo para filtrar por curso. Después define `buscarModulos(lista, curso?: string)` para que, si se omite el curso, devuelva todos los módulos. Comprueba también el resultado con una lista vacía.',
        'criterion': '`filtrarModulos` entrega un módulo al predicado y recibe un booleano; `buscarModulos` acepta que se omita el curso.',
        'sources': ['functions'],
    },
    {
        'title': 'type, interface y composición de contratos',
        'concept': 'Los alias dan nombre a tipos y pueden representar uniones, primitivas u objetos. Las interfaces describen formas de objeto y pueden extender otras interfaces. La compatibilidad de objetos de TypeScript se basa normalmente en la forma requerida.',
        'objective': 'Escoger una forma legible de compartir y ampliar contratos de datos.',
        'practice': 'Define `Persona` y `Docente`; expresa que un docente conserva nombre e identificador y añade departamento. Crea una función que reciba `Persona` y analiza por qué también acepta un docente.',
        'criterion': 'Justifica la composición por los campos requeridos, no por el nombre del tipo.',
        'sources': ['objects'],
    },
    {
        'title': 'null, unknown y límites de confianza',
        'concept': 'Con strictNullChecks, null y undefined deben tratarse explícitamente. unknown admite un valor no conocido, pero exige estrecharlo antes de operar. Un tipo estático no demuestra que una respuesta JSON cumpla el esquema esperado.',
        'objective': 'Modelar ausencia y estrechar valores externos antes de tratarlos como datos de dominio.',
        'practice': 'Escribe `leerModulo(valor: unknown)` que acepte solo un objeto con `id` string y `nombre` string. Comprueba null, una cadena, un objeto incompleto y uno válido; devuelve un resultado explícito para cada caso.',
        'criterion': 'La función valida en ejecución y no convierte datos con una aserción ciega.',
        'sources': ['everyday', 'narrowing', 'strict_null_checks'],
    },
    {
        'title': 'Genéricos y restricciones',
        'concept': 'Un parámetro genérico conserva la relación entre tipos de entrada y salida. Una restricción expresa qué propiedades necesita una operación sin eliminar el tipo concreto del valor recibido.',
        'objective': 'Crear funciones reutilizables que preserven el tipo de su entrada y limiten solo lo necesario.',
        'practice': 'Implementa `buscarPorId<T extends { id: string }>` para una colección de módulos o profesores. Devuelve el elemento con su tipo original y representa explícitamente el caso sin coincidencia.',
        'criterion': 'El resultado mantiene campos propios de T sin añadir aserciones.',
        'sources': ['generics'],
    },
    {
        'title': 'Tipos derivados y operadores de tipos',
        'concept': '`keyof` obtiene claves de un tipo y el acceso indexado consulta el tipo asociado a una clave. Los tipos de utilidad Pick y Partial expresan transformaciones comunes sobre esos contratos.',
        'objective': 'Derivar una forma de actualización sin duplicar el tipo completo del dominio.',
        'practice': 'Construye `CambiosDeModulo` a partir de `Modulo`: solo se pueden cambiar nombre y plazas, ambos opcionales. Usa el tipo en una función de actualización y provoca un error intentando editar el id.',
        'criterion': 'El tipo derivado acepta cambios permitidos y rechaza `id` en un objeto literal comprobado.',
        'sources': ['types_from_types', 'utility'],
    },
    {
        'title': 'Clases y compatibilidad estructural',
        'concept': 'Las clases añaden constructores, campos y métodos; no son la única forma de describir objetos. El sistema de tipos estructural permite que valores distintos sean compatibles cuando ofrecen los miembros requeridos.',
        'objective': 'Separar un contrato de servicio de una implementación concreta y evitar jerarquías sin una relación de sustitución clara.',
        'practice': 'Declara un contrato `RepositorioModulo` y crea una clase que lo implemente. Pasa también un objeto literal con los mismos métodos; compara qué garantiza el contrato y qué comportamiento debe comprobarse aparte.',
        'criterion': 'El consumidor depende del contrato y no de campos internos de la clase.',
        'sources': ['classes', 'objects'],
    },
    {
        'title': 'Módulos TypeScript en un proyecto Node',
        'concept': 'import y export describen dependencias entre módulos. En TypeScript, module define el formato que se interpreta y emite, mientras moduleResolution guía cómo se resuelven importaciones durante el análisis. El cargador de Node ejecuta y resuelve con sus propias reglas. La ejecución nativa de .ts depende de la versión y la sintaxis; el soporte integrado de Node no admite .tsx, y su type stripping no comprueba tipos ni aplica tsconfig al runtime.',
        'objective': 'Comparar la resolución de TypeScript con el formato de módulo, las extensiones y el comportamiento del Node objetivo.',
        'practice': 'Separa un modelo de módulo, una función de búsqueda y el punto de entrada en archivos distintos. Sigue cada importación y compara la resolución de tsc con la de Node. Si ejecutas archivos .ts directamente, verifica qué sintaxis admite esa versión y separa esa ejecución de la comprobación de tipos con tsc.',
        'criterion': 'Distingue una comprobación del compilador de la resolución real del cargador.',
        'sources': ['modules', 'tsconfig', 'node_typescript'],
    },
    {
        'title': 'Migración gradual de JavaScript y declaraciones',
        'concept': 'La migración puede admitir archivos JS junto a TS mediante allowJs; JSDoc aporta información de tipos a archivos JavaScript. Los archivos .d.ts describen una API existente y no implementan su comportamiento.',
        'objective': 'Planificar una conversión por módulos y decidir cuándo basta JSDoc o hace falta una declaración.',
        'practice': 'Elige un helper JS sin dependencias externas. Activa `allowJs` y `checkJs`, incluye el archivo en tsconfig y añade JSDoc para sus parámetros y retorno; después conviértelo a TS conservando las llamadas. Redacta una declaración mínima para una dependencia sin tipos.',
        'criterion': 'La migración mantiene la API y separa descripción de implementación.',
        'sources': ['migration', 'jsdoc', 'declarations', 'allow_js', 'check_js'],
    },
    {
        'title': 'React con TSX: props, children y eventos',
        'concept': 'Los archivos que contienen JSX usan .tsx y necesitan opciones JSX válidas. TypeScript puede inferir el tipo del evento por el contexto del handler JSX; los tipos de React ofrecen ChangeEvent y ReactNode para children.',
        'objective': 'Definir props explícitas y tratar el evento adecuado sin anotar cada expresión por costumbre.',
        'practice': 'Crea `FiltroModulo.tsx` con props para texto, valor y callback. Compara el evento inferido en un handler inline con un handler extraído tipado como `React.ChangeEvent<HTMLInputElement>`; ofrece `children` opcionales como `React.ReactNode` y consulta la guía para `@types/react`, `@types/react-dom` y una opción `jsx` válida en tsconfig.',
        'criterion': 'Una llamada JSX inválida se detecta y el callback expone el valor correcto.',
        'sources': ['react'],
    },
    {
        'title': 'React con estado tipado y estados de petición',
        'concept': 'useState suele inferir su tipo inicial. Una unión discriminada puede representar estados mutuamente excluyentes de una petición; useReducer acepta un estado y acciones que pueden describirse con tipos.',
        'objective': 'Evitar combinaciones de estado imposibles y estrechar el estado antes de mostrar datos o errores.',
        'practice': 'Construye una pantalla de módulos con idle, loading, success y error. Tipifica estado y acciones, implementa un reducer con switch y renderiza los datos solo en success; añade una acción para volver a intentar.',
        'criterion': 'Cada transición conserva los campos que corresponden a su estado.',
        'sources': ['react', 'narrowing'],
    },
]


def typescript_route_footer(canvas, doc):
    """Dibuja un pie propio de la ruta sin modificar el generador principal."""
    canvas.saveState()
    width, _ = A4
    canvas.setStrokeColor(colors.HexColor('#d9dee8'))
    canvas.line(1.8 * cm, 1.35 * cm, width - 1.8 * cm, 1.35 * cm)
    canvas.setFont(FONT, 7)
    canvas.setFillColor(colors.HexColor('#667085'))
    canvas.drawString(1.8 * cm, .95 * cm, 'CódigoClaro · Ruta complementaria de TypeScript · Fuentes oficiales')
    canvas.drawRightString(width - 1.8 * cm, .95 * cm, f'Página {doc.page}')
    canvas.restoreState()


def build_typescript_route():
    """Genera solo la ruta TypeScript y sus dos copias documentales."""
    filename = 'Ruta_TypeScript_JavaScript_React_Node_15_Temas.pdf'
    output_paths = [ROOT / 'docs' / 'temarios' / filename, PUB / 'temarios' / filename]
    for output_path in output_paths:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        story = [
            para('CÓDIGOCLARO · RUTA COMPLEMENTARIA', 'H2CC'),
            para('TypeScript: de JavaScript a React y Node', 'CoverTitleCC'),
            para('15 temas · Para quienes ya conocen JavaScript · Revisión documental: 27 de octubre de 2026', 'SubCC'),
            para('Propósito de la ruta', 'H1CC'),
            para('El recorrido parte de funciones y objetos JavaScript y añade, paso a paso, el sistema de tipos de TypeScript. Termina usando los contratos en módulos orientados a Node y en componentes React con TSX. La documentación oficial enlazada guía cada tema; los ejemplos y prácticas de este material están redactados para este curso.', 'BodyCC'),
            para('Cómo trabajar', 'H2CC'),
            para('En cada tema, predice primero qué acepta el verificador. Después resuelve la práctica y compara el resultado con el criterio de dominio. Las comprobaciones estáticas describen el programa; valida en ejecución las entradas externas y consulta la configuración del proyecto antes de aplicar opciones a Node o React.', 'BodyCC'),
            Spacer(1, 5),
        ]

        for index, topic in enumerate(TS_ROUTE, start=1):
            source_links = []
            for source_key in topic['sources']:
                label, url = TS_ROUTE_SOURCES[source_key]
                source_links.append(f'<link href="{url}" color="#087f8c">{esc(label)}</link>')
            topic_block = [
                para(f"Tema {index:02d} · {topic['title']}", 'H2CC'),
                para(topic['concept']),
                Paragraph(f"<b>Objetivo:</b> {esc(topic['objective'])}", styles['BodyCC']),
                Paragraph(f"<b>Práctica:</b> {esc(topic['practice'])}", styles['BodyCC']),
                Paragraph(f"<b>Criterio de dominio:</b> {esc(topic['criterion'])}", styles['SmallCC']),
                Paragraph('<b>Documentación:</b> ' + ' · '.join(source_links), styles['SmallCC']),
                Spacer(1, 4),
            ]
            story.append(KeepTogether(topic_block))
            if index in (4, 8, 12):
                story.append(PageBreak())

        story.append(KeepTogether([
            para('Laboratorio integrador · catálogo de módulos', 'H2CC'),
            para('Organiza una solución en tres piezas: un módulo compartido con el tipo `Modulo` y funciones puras; una entrada Node que importe esas funciones; y un componente React que reciba resultados mediante props y represente estados de petición con una unión discriminada. Antes de aceptar JSON como `Modulo`, valida sus campos en tiempo de ejecución. Entrega los tres módulos, un caso normal, uno vacío y uno inválido, y explica qué garantiza el verificador y qué comprobación protege la frontera de datos.'),
            Paragraph('<b>Documentación:</b> <link href="https://www.typescriptlang.org/docs/handbook/2/modules.html" color="#087f8c">Handbook: módulos</link> · <link href="https://react.dev/learn/typescript" color="#087f8c">React: usar TypeScript</link> · <link href="https://www.typescriptlang.org/docs/handbook/2/narrowing.html" color="#087f8c">Handbook: narrowing</link>', styles['SmallCC']),
        ]))

        doc = SimpleDocTemplate(
            str(output_path), pagesize=A4,
            rightMargin=1.8 * cm, leftMargin=1.8 * cm,
            topMargin=1.35 * cm, bottomMargin=1.8 * cm,
            title='TypeScript: de JavaScript a React y Node · 15 temas',
            author='CódigoClaro',
            subject='Ruta complementaria de aprendizaje de TypeScript',
        )
        doc.build(story, onFirstPage=typescript_route_footer, onLaterPages=typescript_route_footer)
    # Ambas ubicaciones se publican como una misma versión del documento.
    shutil.copyfile(output_paths[0], output_paths[1])
    print(f'Generadas {len(TS_ROUTE)} unidades en {len(output_paths)} copias de la ruta TypeScript.')

AUTO_DESCRIPTION_SUFFIX = 'Temario ampliado con 10 secciones: fundamentos, ejemplos, depuración, pruebas y prácticas.'


def clean_auto_description(description):
    """Quita únicamente las copias finales del sufijo añadido por el generador."""
    cleaned = str(description).rstrip()
    while cleaned.endswith(AUTO_DESCRIPTION_SUFFIX):
        cleaned = cleaned[:-len(AUTO_DESCRIPTION_SUFFIX)].rstrip()
    return cleaned


def main():
    """Regenera los 75 temas del catálogo y sincroniza sus copias documentales."""
    global TOPIC_CONTENT
    catalog = json.loads(CATALOG.read_text(encoding='utf-8'))
    TOPIC_CONTENT = load_topic_content(catalog)
    docs_catalog_path = ROOT / 'docs' / 'catalogo_temas.json'
    docs_catalog = json.loads(docs_catalog_path.read_text(encoding='utf-8'))

    catalog_files = [item['file'] for item in catalog]
    docs_catalog_files = [item['file'] for item in docs_catalog]
    if catalog_files != docs_catalog_files:
        raise ValueError('Los catálogos docs/public no contienen los mismos archivos y en el mismo orden.')

    page_counts = {}
    temporary_root = ROOT / 'tmp' / 'pdfs'
    temporary_root.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='temarios-', dir=temporary_root) as directory:
        workspace = Path(directory)
        for item in catalog:
            filename = item['file']
            relative_path = Path(filename)
            if relative_path.name != filename or relative_path.suffix.lower() != '.pdf':
                raise ValueError(f'Nombre de PDF inesperado en el catálogo: {filename!r}')

            # Limpia el sufijo heredado antes de componer prácticas con description.
            item['description'] = clean_auto_description(item['description'])
            root_pdf, page_count = build_pdf(item, workspace)
            mirror_pdf = ROOT / 'docs' / 'temarios' / filename
            mirror_pdf.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(root_pdf, mirror_pdf)
            item['pages'] = page_count
            page_counts[filename] = page_count
            item['version'] = '2.0'

    for item in docs_catalog:
        item['description'] = clean_auto_description(item['description'])
        item['pages'] = page_counts[item['file']]

    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    docs_catalog_path.write_text(json.dumps(docs_catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Generados {len(catalog)} temarios compactados ({min(page_counts.values())}-{max(page_counts.values())} páginas por documento) y dos copias organizadas por tema.')


def validate_only():
    """Comprueba cobertura y campos didácticos sin escribir ningún PDF."""
    catalog = json.loads(CATALOG.read_text(encoding='utf-8'))
    content = load_topic_content(catalog)
    docs_catalog = json.loads((ROOT / 'docs' / 'catalogo_temas.json').read_text(encoding='utf-8'))
    if [item['file'] for item in catalog] != [item['file'] for item in docs_catalog]:
        raise ValueError('Los catálogos docs/public no contienen los mismos archivos y en el mismo orden.')
    cases = sum(len(item['exercise']['cases']) for item in content.values())
    print(f'Validación correcta: {len(content)} temas, {cases} casos de práctica y fuentes HTTPS con host; sin generar archivos.')


if __name__ == '__main__':
    if sys.argv[1:] == ['--typescript-route']:
        build_typescript_route()
    elif sys.argv[1:] == ['--validate-only']:
        validate_only()
    else:
        main()
