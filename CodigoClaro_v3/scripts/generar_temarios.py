#!/usr/bin/env python3
"""Genera y valida los temarios PDF desde contenido versionado.

Las rutas se resuelven respecto al proyecto para permitir ejecutar este
generador desde cualquier directorio.
"""
from pathlib import Path
import json
import re
import shutil
import sys
import tempfile
from urllib.parse import urlparse
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Preformatted, Table, TableStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parents[1]
PUB = ROOT / 'public'
CATALOG = PUB / 'catalogo_temas.json'
CONTENT_FILE = Path(__file__).resolve().parent / 'temarios_contenido.json'
COMPLEMENTARY_GUIDES_FILE = Path(__file__).resolve().parent / 'guias_complementarias_contenido.json'
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
styles.add(ParagraphStyle(name='CoverTitleCC', fontName=BOLD, fontSize=24, leading=28, textColor=colors.HexColor('#243b80'), spaceAfter=12, alignment=TA_LEFT))
styles.add(ParagraphStyle(name='SubCC', fontName=FONT, fontSize=11, leading=13, textColor=colors.HexColor('#475467'), spaceAfter=4))
styles.add(ParagraphStyle(name='H1CC', fontName=BOLD, fontSize=16, leading=18, textColor=colors.HexColor('#243b80'), spaceBefore=2, spaceAfter=3, keepWithNext=True))
styles.add(ParagraphStyle(name='H2CC', fontName=BOLD, fontSize=10.5, leading=12, textColor=colors.HexColor('#087f8c'), spaceBefore=2, spaceAfter=1, keepWithNext=True))
styles.add(ParagraphStyle(name='BodyCC', fontName=FONT, fontSize=10.2, leading=14.2, textColor=colors.HexColor('#263244'), spaceAfter=6))
styles.add(ParagraphStyle(name='SmallCC', fontName=FONT, fontSize=9, leading=11.6, textColor=colors.HexColor('#596579'), spaceAfter=3))
styles.add(ParagraphStyle(name='SourcesCC', fontName=FONT, fontSize=7.8, leading=9.8, textColor=colors.HexColor('#596579'), spaceAfter=3))
styles.add(ParagraphStyle(name='CodeCC', fontName=CODE, fontSize=7.6, leading=9.7, leftIndent=8, rightIndent=8, backColor=colors.HexColor('#f3f5f9'), borderColor=colors.HexColor('#d8deea'), borderWidth=.5, borderPadding=5, spaceBefore=3, spaceAfter=5))
styles.add(ParagraphStyle(name='BulletCC', parent=styles['BodyCC'], leftIndent=13, firstLineIndent=-8, bulletIndent=0, spaceAfter=4))
styles.add(ParagraphStyle(name='BodyLastCC', fontName=FONT, fontSize=10.2, leading=14.2, textColor=colors.HexColor('#263244'), spaceAfter=6))
styles.add(ParagraphStyle(name='BulletLastCC', parent=styles['BodyLastCC'], leftIndent=13, firstLineIndent=-8, bulletIndent=0, spaceAfter=4))


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
        blocks.append(Preformatted(code, styles['CodeCC'], maxLineLength=84))
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
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]),
    )


def study_table(headers, rows, widths=(5.2 * cm, 11.8 * cm)):
    data = [[para(value, 'SmallCC') for value in headers]]
    data.extend([[para(value, 'SmallCC') for value in row] for row in rows])
    return Table(data, colWidths=list(widths), style=TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#eaf0ff')),
        ('GRID', (0, 0), (-1, -1), .4, colors.HexColor('#d9dee8')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))


TRACK_FOUNDATIONS = {
    'Java': 'En este itinerario se trabaja Java con tipos estáticos y ejecución sobre la JVM. El compilador comprueba muchos errores de tipos antes de ejecutar y genera bytecode; la JVM lo carga y ejecuta. Distingue los ocho tipos primitivos de las referencias a objetos. Para texto, compara el contenido con equals(), no la identidad con ==. Las conversiones numéricas pueden perder precisión o desbordar si no se elige el tipo adecuado.',
    'JavaScript': 'JavaScript es un lenguaje dinámico definido por ECMAScript. El navegador y Node.js ejecutan el mismo núcleo del lenguaje, pero ofrecen APIs distintas: el DOM pertenece al navegador y el acceso al sistema de archivos corresponde al entorno servidor. Distingue los valores primitivos de los objetos, usa comparaciones estrictas cuando no quieras coerción y recuerda que JSON es un formato de intercambio, no el modelo de objetos del lenguaje.',
    'Python': 'Python asocia los tipos a los objetos y permite que una variable nombre valores de tipos distintos. int, float, str, bool y None aparecen desde el inicio; list, dict y set son mutables, mientras que tuple y str no se modifican en el sitio. La indentación delimita bloques. input() devuelve texto, por lo que convertir y validar son pasos diferentes.',
    'Kotlin': 'El itinerario usa Kotlin/JVM: el compilador infiere muchos tipos, pero el programa sigue teniendo comprobación estática. val impide reasignar el nombre, aunque el objeto referenciado pueda ser mutable; var permite reasignar. Los tipos nullable se escriben con ? y obligan a tratar la ausencia. La biblioteca distingue interfaces de solo lectura de interfaces mutables.',
    'React': 'React organiza interfaces en componentes que describen lo que debe mostrarse. JSX combina expresiones de JavaScript con marcado; no es HTML procesado directamente por el navegador. Las props son entradas del componente y el estado representa datos que pueden cambiar. Actualizar estado programa un nuevo render: no se debe modificar el estado directamente ni usar un efecto para calcular un valor que ya se deriva de otras props o estados.',
}

TRACK_FAMILY_DETAILS = {
    ('Java', 'values'): 'Java define ocho tipos primitivos: byte, short, int y long para enteros; float y double para aproximaciones decimales binarias; char para una unidad de código UTF-16; y boolean para true o false. String, arrays y objetos son referencias. Un cast de narrowing puede perder información; para cantidades decimales que deban ser exactas, como importes, estudia BigDecimal y no redondees en cada operación.',
    ('Java', 'control'): 'En Java una condición debe producir boolean; no existe la conversión implícita de cualquier número a verdadero o falso. Los operadores && y || cortocircuitan. Un switch moderno puede devolver un valor, pero hay que comprobar qué versión del JDK admite esa sintaxis. Para comparar String usa equals() o equalsIgnoreCase() cuando corresponda.',
    ('Java', 'loops'): 'for resulta claro cuando el recorrido o contador está a la vista; while sirve cuando la repetición depende de una condición; do-while ejecuta el cuerpo al menos una vez. En un array los índices van de 0 a length - 1. El for-each reduce errores de índice, pero no proporciona por sí solo la posición del elemento.',
    ('Java', 'collections'): 'ArrayList mantiene orden y admite repetidos; HashSet modela pertenencia sin duplicados; HashMap relaciona claves únicas con valores. List, Set y Map describen contratos, mientras las clases concretas aportan implementaciones. No cambies una colección estructuralmente mientras la recorres con un iterador salvo que uses la operación admitida por ese iterador.',
    ('Java', 'functions'): 'Un método declara tipo de retorno, nombre y parámetros. La sobrecarga distingue firmas por nombre y parámetros, no por tipo de retorno. Los argumentos primitivos se pasan como valores; los objetos permiten observar mutaciones del mismo objeto, aunque la referencia también se pasa por valor. Mantén métodos pequeños y nombra acciones con verbos.',
    ('Java', 'objects'): 'Un constructor prepara un objeto para que sus invariantes sean válidas. Los campos privados protegen el estado; los métodos públicos expresan operaciones permitidas. Herencia permite despacho dinámico cuando una subclase sobrescribe un método; composición suele acoplar menos. La anotación @Override deja que el compilador detecte errores al intentar sobrescribir.',
    ('Java', 'io'): 'Path representa rutas; Files ofrece operaciones sobre archivos; try-with-resources cierra recursos que implementan AutoCloseable. Distingue ruta relativa al directorio de trabajo y ruta absoluta. Al leer texto, fija la codificación. Captura excepciones donde puedas aportar contexto o recuperación, en vez de esconder cualquier error con un catch vacío.',
    ('JavaScript', 'values'): 'Los primitivos incluyen string, number, bigint, boolean, undefined, symbol y null; los objetos incluyen arrays y funciones. Number usa coma flotante binaria, por lo que algunas fracciones no son exactas. null significa ausencia intencional y undefined suele indicar valor no asignado. typeof null devuelve "object" por una particularidad histórica; no uses typeof como validador universal.',
    ('JavaScript', 'control'): 'JavaScript evalúa valores como truthy o falsy en condiciones; eso no significa que el valor sea boolean. `||` devuelve uno de sus operandos y puede reemplazar falsamente 0 o ""; `??` solo usa el lado derecho para null o undefined. === evita conversiones implícitas de igualdad y hace la intención más visible.',
    ('JavaScript', 'loops'): 'for...of recorre valores iterables; for...in recorre nombres de propiedades enumerables y normalmente no es la elección para arrays. map transforma elementos, filter conserva los que cumplen una condición y reduce combina en un acumulador. Elige la operación que describe el propósito y evita mutar la colección original si otra parte la comparte.',
    ('JavaScript', 'collections'): 'Array conserva orden e índice; Map asocia claves sin convertirlas necesariamente a texto; Set mantiene valores únicos. Un objeto ordinario suele representar campos de una entidad. Destructuring extrae datos y spread crea una copia superficial: los objetos anidados siguen compartidos. Comprueba la mutabilidad antes de reutilizar referencias.',
    ('JavaScript', 'functions'): 'Una función puede conservar variables del ámbito donde se creó: eso forma un closure. Las arrow functions capturan `this` del contexto y no son intercambiables con funciones tradicionales que reciben su propio `this`. Los valores por defecto se activan con undefined, no con null. Documenta efectos cuando una función lee o modifica el DOM.',
    ('JavaScript', 'async'): 'Una función async devuelve una Promise. await pausa esa función hasta que la promesa se resuelve o rechaza; no bloquea el hilo del navegador. fetch rechaza ante ciertos fallos de red, pero una respuesta HTTP 404 normalmente llega resuelta: comprueba response.ok. Usa AbortController cuando una consulta deje de ser necesaria.',
    ('JavaScript', 'ui'): 'querySelector devuelve el primer elemento que coincide o null. addEventListener permite registrar y retirar manejadores sin reemplazar los de otras partes. Usa textContent para insertar texto y evita innerHTML con contenido no confiable. Los formularios deben asociar label e input y comunicar errores además del atributo visual.',
    ('Python', 'values'): 'int representa enteros de precisión arbitraria en la implementación habitual; float es binario y puede aproximar decimales. bool es una subclase de int, aunque conviene tratarlo semánticamente como booleano. input() entrega str y la conversión puede lanzar ValueError. Para importes exactos puede ser más adecuado Decimal que float.',
    ('Python', 'loops'): 'for recorre un iterable y no necesita un contador manual; range(stop) excluye el límite superior. enumerate aporta índice y valor sin gestionar el contador a mano. while exige actualizar el estado para terminar. break interrumpe el bucle más cercano y continue salta al siguiente ciclo.',
    ('Python', 'collections'): 'list es una secuencia mutable; tuple es una secuencia inmutable; dict asocia claves hashables con valores; set representa elementos únicos. Una asignación puede crear otro nombre para la misma lista, no una copia. `in` comprueba pertenencia y su coste depende de la estructura elegida.',
    ('Python', 'functions'): 'def crea una función y return termina su ejecución con un resultado; sin return explícito, el resultado es None. Los valores por defecto se evalúan una vez al definir la función, por eso evita usar una lista mutable como valor por defecto. *args recoge argumentos posicionales extra y **kwargs los nombrados.',
    ('Python', 'io'): 'with gestiona la apertura y cierre del archivo aunque falle el bloque. pathlib separa la manipulación de rutas de las operaciones de lectura. Usa encoding="utf-8" para declarar la codificación del texto. json.loads() analiza texto y json.load() lee desde un archivo; ambos pueden fallar ante contenido mal formado.',
    ('Kotlin', 'values'): 'Kotlin separa String y String? como tipos distintos. `?.` llama solo cuando hay valor; `?:` ofrece un valor alternativo; `!!` fuerza una aserción y puede lanzar una excepción, por lo que conviene evitarlo si existe una comprobación mejor. `val` impide reasignar la variable, no vuelve inmutable automáticamente al objeto.',
    ('Kotlin', 'control'): 'if es una expresión que puede devolver un valor. when puede elegir entre valores, rangos, tipos o condiciones; usa else cuando debas cubrir exhaustivamente el dominio. Los smart casts se aplican tras una comprobación cuando el compilador puede garantizar que el valor no cambió.',
    ('Kotlin', 'loops'): 'Los rangos `..`, `until`, `downTo` y `step` expresan límites distintos; hasta incluye el extremo y until lo excluye. repeat ejecuta un número de veces. En recorridos de listas prefiere iterar elementos cuando no necesitas el índice; si lo necesitas, usa withIndex() o índices válidos.',
    ('Kotlin', 'collections'): 'List y Set son interfaces de solo lectura; MutableList y MutableSet exponen operaciones de cambio. Una referencia de solo lectura no garantiza que nadie cambie el objeto desde otra referencia. map transforma, filter selecciona y groupBy organiza según una clave; comprueba la estructura resultante antes de convertirla a mutable.',
    ('Kotlin', 'functions'): 'Kotlin admite parámetros nombrados y valores por defecto. Una lambda puede ser el último argumento fuera de los paréntesis. let, run y apply cambian cómo se refiere al receptor, no la lógica de la operación; elige la función de alcance que haga el flujo más claro y evita encadenamientos que oculten el resultado.',
    ('Kotlin', 'objects'): 'Las propiedades pueden generar getters y setters según su declaración. data class aporta operaciones basadas en sus parámetros principales, como copy y destructuring. La herencia requiere declarar open; las interfaces describen contratos. sealed class limita las subclases conocidas y permite comprobaciones exhaustivas con when.',
    ('Kotlin', 'async'): 'suspend marca una función que puede suspenderse, pero no inicia por sí sola una coroutine. launch crea trabajo sin resultado directo; async produce un Deferred que se consulta con await. El alcance enlaza trabajo con su ciclo de vida; cancelar el padre debe propagar cancelación a sus tareas hijas.',
    ('React', 'ui'): 'Un componente función devuelve una descripción de UI. Las props fluyen desde el componente padre; un cambio de estado pide un render nuevo. El estado es una instantánea de cada render, por lo que para actualizar en función del valor anterior conviene el actualizador funcional. Las keys deben identificar elementos estables, no solo ocupar cualquier posición.',
    ('React', 'async'): 'Una petición a una API tiene estados distintos: pendiente, éxito, vacío y error. Evita que una respuesta vieja reemplace resultados más recientes; cancela con AbortController o invalida la respuesta al desmontar, según el patrón utilizado. Comprueba códigos HTTP y valida la forma de los datos antes de mostrarlos.',
    ('React', 'quality'): 'Testing Library propone comprobar lo que el usuario puede encontrar y hacer, en vez de inspeccionar detalles internos del componente. Busca por rol y nombre accesible, ejecuta la interacción y verifica el cambio visible. Añade los casos de carga, error y vacío cuando el componente depende de datos externos.',
}

FAMILY_DETAILS = {
    'foundations': 'Empieza separando el archivo fuente, la herramienta que lo procesa y el entorno que ejecuta el resultado. Anota la versión del runtime y el comando usado: dos equipos pueden obtener resultados distintos si ejecutan otra versión o desde otra carpeta. La primera comprobación útil es el programa mínimo que imprime un valor conocido; después incorpora una sola pieza cada vez.',
    'values': 'Un nombre permite acceder a un valor; el tipo determina qué operaciones tienen sentido y cómo se representa el dato. Distingue asignación, conversión y validación. Convertir texto a número no demuestra que el dato pertenezca al dominio: también hay que decidir qué ocurre con una cadena vacía, un valor fuera de rango o una entrada mal formada. Mantén explícita la unidad y precisión cuando el número represente tiempo, dinero o medidas.',
    'control': 'Una condición expresa una decisión del dominio y debe poder leerse como una pregunta con respuesta definida. Comprueba los casos frontera: igualdad, límite inferior, límite superior y valor que no pertenece a ninguna opción. En una cadena de condiciones, el orden puede cambiar el resultado; usa paréntesis o variables con nombres descriptivos cuando la regla no sea evidente.',
    'loops': 'Un bucle necesita un inicio, una condición de continuación y un avance que acerque al fin. Antes de ejecutarlo, predice cuántas veces se repetirá. Revisa especialmente el primer y último índice: muchos errores son de una unidad. Si la colección puede cambiar durante el recorrido, decide si se permite esa modificación o si debe trabajarse sobre una copia.',
    'collections': 'Elige la estructura de datos según la operación que el programa necesite: una secuencia conserva posición, un conjunto representa pertenencia sin duplicados y un mapa asocia claves con valores. Distingue acceso por índice de acceso por clave y observa si la estructura es mutable. Si dos variables apuntan al mismo objeto mutable, cambiarlo desde una puede afectar a la otra.',
    'functions': 'Una función tiene un contrato: entradas admitidas, resultado, efectos y errores posibles. Mantén el cálculo principal independiente de lectura de teclado, red, reloj y almacenamiento siempre que puedas; esa separación permite probarlo con datos pequeños. El nombre debe describir el resultado o la acción, y cada parámetro debe tener una responsabilidad comprensible.',
    'objects': 'Un objeto reúne datos y operaciones que deben permanecer coherentes. Encapsular no significa ocultarlo todo: significa proteger las invariantes y ofrecer operaciones claras. Composición permite construir un comportamiento usando colaboradores; herencia expresa una relación de sustitución y no solo la reutilización de código. Prueba la creación del objeto y sus estados válidos e inválidos.',
    'modules': 'Un módulo establece un límite de organización: qué nombres expone, qué depende de otros y qué detalle permanece interno. Mantén dependencias dirigidas de forma comprensible y evita ciclos innecesarios. Separa configuración del código, registra cómo se instala el proyecto y comprueba que una importación funciona desde el punto de entrada real, no solo desde el directorio del editor.',
    'io': 'La entrada y salida conectan el programa con archivos, APIs o procesos que pueden fallar fuera de su control. Valida forma, tamaño y significado antes de usar los datos. Distingue error de red, respuesta HTTP no satisfactoria, JSON inválido y dato válido con contenido inesperado. En ficheros declara la codificación y cierra los recursos incluso si ocurre una excepción.',
    'async': 'La asincronía permite esperar a una operación sin bloquear el flujo principal; no vuelve instantánea la operación ni garantiza que termine bien. Define qué ocurre en éxito, error, cancelación y respuesta tardía. Evita actualizar la interfaz con una respuesta antigua después de que el usuario haya cambiado de pantalla o de consulta. Propaga los errores hasta el punto que pueda mostrarlos o recuperarse.',
    'quality': 'Una prueba útil hace visible una regla: prepara una entrada, ejecuta una unidad y compara el resultado con una expectativa. Incluye un caso habitual, uno límite y uno inválido cuando el contrato lo permita. Depurar consiste en reducir el problema, observar el valor real y comprobar una hipótesis; no en añadir cambios al azar hasta que desaparezca el síntoma.',
    'security': 'Trata todo dato recibido como no confiable, incluso si la interfaz ya lo validó. La validación del servidor sigue siendo necesaria. Codifica la salida según el contexto, no insertes texto de usuario como HTML y no incluyas secretos en el código que llega al navegador. CORS regula qué orígenes pueden leer ciertas respuestas; no sustituye autenticación ni autorización.',
    'ui': 'En una interfaz, separa los datos recibidos, el estado que cambia y el resultado visual. Cada acción debe tener una respuesta perceptible y accesible. Evita duplicar fuentes de verdad: si una lista filtrada se calcula desde otra lista y un criterio, normalmente puede derivarse en lugar de almacenarse por separado. Comprueba carga, vacío, error y éxito, además del caso habitual.',
    'generics': 'Un parámetro de tipo conserva información del tipo entre una entrada y una salida, para que el compilador pueda comprobar su relación. Una restricción expresa qué operaciones puede usar el código genérico. No añadas abstracciones solo por evitar repetir pocas líneas: define el contrato que realmente comparten los casos y conserva errores claros cuando un tipo no lo cumple.',
    'crosscut': 'El objetivo es aprender a justificar una decisión, no memorizar una receta. Escribe primero qué garantiza el programa y después elige la sintaxis. Una solución alternativa es válida si mantiene el mismo contrato, cubre los casos límite relevantes y puede mantenerse con claridad. Si cambia una dependencia o versión, vuelve a verificar el comportamiento en la fuente oficial.',
}

FAMILY_TERMS = {
    'foundations': [('Código fuente', 'Instrucciones escritas en el lenguaje antes de ejecutarlas.'), ('Compilador o intérprete', 'Herramienta que transforma, comprueba o ejecuta el programa según el entorno.'), ('Runtime', 'Entorno que aporta las reglas y APIs disponibles durante la ejecución.'), ('Versión', 'Identificador del conjunto concreto de herramientas y comportamiento usado.')],
    'values': [('Variable', 'Nombre que permite leer o actualizar un valor según las reglas del lenguaje.'), ('Tipo', 'Categoría que determina operaciones y valores admitidos.'), ('Conversión', 'Transformación de una representación a otra; puede fallar o perder información.'), ('Validación', 'Comprobación de que el dato satisface las reglas del problema.')],
    'control': [('Condición', 'Expresión que decide si se ejecuta una rama.'), ('Rama', 'Camino seleccionado por una decisión.'), ('Cortocircuito', 'Evaluación que deja de leer operandos cuando el resultado ya se conoce.'), ('Caso frontera', 'Entrada justo en el límite donde puede cambiar el resultado.')],
    'loops': [('Iteración', 'Una repetición del cuerpo del bucle.'), ('Estado del bucle', 'Valores que cambian o se consultan en cada repetición.'), ('Terminación', 'Condición demostrable que hace que el bucle finalice.'), ('Índice', 'Posición de un elemento, normalmente desde cero en arrays y listas.')],
    'collections': [('Secuencia', 'Estructura ordenada a la que se suele acceder por posición.'), ('Clave', 'Dato usado para localizar un valor en un mapa o diccionario.'), ('Mutabilidad', 'Posibilidad de cambiar un objeto después de crearlo.'), ('Duplicado', 'Elemento repetido que una estructura puede conservar o descartar.')],
    'functions': [('Parámetro', 'Nombre que recibe un valor al declarar una función.'), ('Argumento', 'Valor concreto que se proporciona en una llamada.'), ('Retorno', 'Resultado entregado al punto que llamó a la función.'), ('Efecto secundario', 'Cambio observable fuera del valor retornado.')],
    'objects': [('Clase', 'Definición usada para crear objetos con un contrato común.'), ('Instancia', 'Objeto concreto creado según una clase.'), ('Invariante', 'Regla que el objeto debe mantener en sus estados válidos.'), ('Composición', 'Construcción de un objeto a partir de colaboradores.')],
    'modules': [('Módulo', 'Unidad de código que puede exponer nombres y depender de otros.'), ('Importación', 'Acceso a nombres definidos en otro módulo.'), ('Dependencia', 'Componente externo o interno que otro necesita para funcionar.'), ('Punto de entrada', 'Lugar desde el que comienza el programa o una herramienta.')],
    'io': [('Entrada', 'Dato recibido desde una fuente que puede estar fuera del programa.'), ('Serialización', 'Representación de datos para guardarlos o transmitirlos.'), ('Codificación', 'Regla para representar caracteres como bytes, por ejemplo UTF-8.'), ('Fallo externo', 'Error de red, disco, permiso o servicio que el programa debe gestionar.')],
    'async': [('Operación pendiente', 'Trabajo que todavía no ha devuelto un resultado.'), ('Await', 'Punto donde el flujo espera el resultado de una tarea asincrónica.'), ('Cancelación', 'Solicitud para dejar de esperar o detener trabajo que ya no se necesita.'), ('Carrera', 'Resultado dependiente del orden temporal de operaciones concurrentes.')],
    'quality': [('Caso de prueba', 'Entrada y expectativa que verifican una regla concreta.'), ('Regresión', 'Fallo que reaparece después de un cambio.'), ('Traza', 'Secuencia de llamadas y valores que ayuda a localizar el fallo.'), ('Reproducción mínima', 'Ejemplo reducido que muestra el problema de forma repetible.')],
    'security': [('Validación', 'Comprobación de formato y reglas de negocio en el límite de confianza.'), ('Escape contextual', 'Codificación segura de salida según el lugar donde se inserta.'), ('Autenticación', 'Comprobación de quién inicia una sesión.'), ('Autorización', 'Comprobación de qué acciones puede realizar una identidad.')],
    'ui': [('Componente', 'Unidad de interfaz que describe una parte de lo que se muestra.'), ('Propiedad o prop', 'Dato de entrada que un componente recibe de su padre.'), ('Estado', 'Dato que puede cambiar y afecta al renderizado.'), ('Renderizado', 'Cálculo de la interfaz visible a partir de los datos actuales.')],
    'generics': [('Parámetro de tipo', 'Nombre de tipo que se concreta al usar una función o clase genérica.'), ('Restricción', 'Regla que limita los tipos que puede aceptar el parámetro.'), ('Inferencia', 'Deducción del tipo a partir de valores o contexto.'), ('Seguridad de tipos', 'Comprobación de que las operaciones respetan los contratos de tipo.')],
    'crosscut': [('Contrato', 'Comportamiento esperado y límites explícitos de una pieza de software.'), ('Precondición', 'Requisito que debe cumplirse antes de una operación.'), ('Postcondición', 'Garantía que debe cumplirse cuando la operación termina.'), ('Caso límite', 'Situación extrema o poco común que prueba los bordes del contrato.')],
}


def topic_family(item):
    """Clasifica el objetivo del tema para añadir profundización pertinente."""
    text = f"{item['title']} {item['description']}".casefold()
    patterns = [
        ('security', ('seguridad', 'xss', 'cors', 'secretos', 'validación de formularios')),
        ('async', ('async', 'await', 'promesa', 'coroutine', 'asincron', 'suspend')),
        ('generics', ('genérico', 'generics', 'variance', 'parametrizado')),
        ('quality', ('pruebas', 'depuración', 'debug', 'excepciones', 'errores', 'testing')),
        ('io', ('ficheros', 'archivos', 'json', 'api', 'http', 'serialización', 'red')),
        ('modules', ('módulos', 'paquetes', 'import', 'entornos', 'node.js', 'arquitectura')),
        ('ui', ('react', 'jsx', 'props', 'estado', 'hooks', 'efectos', 'formularios', 'dom', 'eventos', 'router', 'renderizado', 'keys')),
        ('objects', ('clases', 'objetos', 'poo', 'constructores', 'herencia', 'polimorfismo', 'interfaces', 'dataclass')),
        ('functions', ('métodos', 'funciones', 'lambdas', 'closures', 'parámetros', 'funciones de orden superior')),
        ('collections', ('arrays', 'colecciones', 'listas', 'tuplas', 'diccionarios', 'conjuntos', 'mapas', 'iteradores', 'generadores')),
        ('loops', ('bucles', 'iteración', 'recorridos')),
        ('control', ('operadores', 'condiciones', 'condicionales', 'expresiones')),
        ('values', ('variables', 'tipos', 'null safety', 'coerción', 'primitivos')),
        ('foundations', ('instalación', 'primer programa', 'sintaxis y consola')),
    ]
    for family, words in patterns:
        if any(word in text for word in words):
            return family
    return 'crosscut'


def glossary_table(family):
    rows = [[para('Término', 'SmallCC'), para('Significado en este recorrido', 'SmallCC')]]
    rows.extend([[para(term, 'SmallCC'), para(definition, 'SmallCC')] for term, definition in FAMILY_TERMS[family]])
    return Table(rows, colWidths=[4.3 * cm, 12.7 * cm], style=TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#eaf0ff')),
        ('GRID', (0, 0), (-1, -1), .4, colors.HexColor('#d9dee8')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))


def java_primitive_table():
    rows = [
        [para('Tipo', 'SmallCC'), para('Uso y rango o precisión aproximada', 'SmallCC')],
        [para('byte', 'SmallCC'), para('Entero con signo de 8 bits: de -128 a 127.', 'SmallCC')],
        [para('short', 'SmallCC'), para('Entero con signo de 16 bits: de -32 768 a 32 767.', 'SmallCC')],
        [para('int', 'SmallCC'), para('Entero con signo de 32 bits; opción habitual para contadores y cantidades enteras.', 'SmallCC')],
        [para('long', 'SmallCC'), para('Entero con signo de 64 bits; añade el sufijo L a literales cuando sea necesario.', 'SmallCC')],
        [para('float', 'SmallCC'), para('Coma flotante binaria de 32 bits; alrededor de 6–7 cifras significativas.', 'SmallCC')],
        [para('double', 'SmallCC'), para('Coma flotante binaria de 64 bits; alrededor de 15–16 cifras significativas.', 'SmallCC')],
        [para('char', 'SmallCC'), para('Una unidad de código UTF-16 de 16 bits; no siempre representa un carácter Unicode completo.', 'SmallCC')],
        [para('boolean', 'SmallCC'), para('Solo representa true o false; no es un tipo numérico.', 'SmallCC')],
    ]
    return Table(rows, colWidths=[2.3 * cm, 14.7 * cm], style=TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#eaf0ff')),
        ('GRID', (0, 0), (-1, -1), .4, colors.HexColor('#d9dee8')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))


def make_pages(item):
    """Construye diez páginas de explicación, práctica, depuración y repaso."""
    track, num, title = item['track'], item['num'], item['title']
    family = topic_family(item)
    try:
        content = TOPIC_CONTENT[(track, title)]
    except KeyError as exc:
        raise ValueError(f'Falta contenido didáctico para {track}: {title}') from exc

    source_links = [
        f'<link href="{esc(source["url"])}" color="#087f8c">{esc(source["label"])}</link>'
        for source in content['sources']
    ]
    foundation = TRACK_FOUNDATIONS[track]
    detail = FAMILY_DETAILS[family]
    specific_detail = TRACK_FAMILY_DETAILS.get((track, family))
    exercise = content['exercise']
    terms = [part.strip(' .;:') for part in re.split(r',|\band\b|\by\b', item['description'], flags=re.I) if len(part.strip()) > 3][:4]
    if not terms:
        terms = [title]
    short_example = '\n'.join(content['example'].splitlines()[:18])
    short_solution = '\n'.join(exercise['solution'].splitlines()[:22])

    pages = [
        [
            para(f'CÓDIGOCLARO · RUTA {track.upper()}', 'H2CC'),
            para(f'Tema {num:02d} · {title}', 'CoverTitleCC'),
            para('Cuaderno de estudio para DAM/DAW · 10 lecciones', 'SubCC'),
            para('Qué vas a aprender', 'H1CC'),
            para(item['description']),
            para(f'Este cuaderno trabaja {title.lower()} en pasos cortos. La meta no es repetir palabras de memoria: es reconocer el problema, elegir una herramienta adecuada, explicar por qué funciona y comprobarla con datos distintos. Reserva una sesión para leer el modelo, otra para resolver el ejercicio y una tercera para intentar el laboratorio sin mirar la solución.', 'BodyCC'),
            para('Resultados de aprendizaje', 'H2CC'),
            bullet(f'Explicar con tus palabras qué problema resuelve {title.lower()} y en qué parte de una aplicación DAM/DAW aparece.'),
            bullet('Leer el ejemplo, predecir el resultado y justificar cada decisión relevante.'),
            bullet('Resolver una práctica, comprobar casos normales y límite, y depurar un fallo con un método reproducible.'),
            para('Cómo estudiar este tema', 'H2CC'),
            para('Ten a mano un editor compatible con la tecnología y copia los ejemplos en un archivo nuevo. Antes de ejecutar, escribe tu predicción. Si no coincide con la salida, no borres el intento: anota qué supuesto era incorrecto y prueba una variación mínima. Al terminar, explica el concepto a otra persona usando un ejemplo propio.'),
            para('Punto de control inicial', 'H2CC'),
            para('Antes de avanzar, escribe dos ideas que ya conoces sobre este tema y una pregunta que todavía no sabes responder. Vuelve a ellas al final de la lección 10. Si cambias de respuesta, explica qué ejemplo o prueba hizo que cambiaras de opinión.'),
        ],
        [
            para('Lección 1 · El modelo mental', 'H1CC'),
            para('Idea central', 'H2CC'), para(content['explanation']),
            para(f'Para razonar sobre {title.lower()}, separa cuatro preguntas: qué datos existen al empezar, qué regla se aplica, qué cambia durante el proceso y qué resultado debe observar quien usa el programa. Esta separación ayuda a no confundir la sintaxis con la finalidad. Una línea puede compilar y aun así resolver mal el problema si el dato representa otra cosa o falta un caso.', 'BodyCC'),
            para(f'En {track}, ten presente este marco', 'H2CC'),
            para(foundation),
            para('Comprueba tu comprensión', 'H2CC'),
            bullet(f'¿Qué parte de la explicación define la regla principal de {title.lower()}?'),
            bullet('¿Qué dato puede cambiar y qué dato debería permanecer estable?'),
            bullet('¿Qué observación concreta demostraría que tu programa cumple el objetivo?'),
        ],
        [
            para('Lección 2 · Vocabulario y reglas', 'H1CC'),
            para(f'Reglas de {track} que afectan a este tema', 'H2CC'),
            para(specific_detail or foundation),
            para(f'Ideas específicas de {title.lower()}', 'H2CC'), para(detail),
            *([para('Los ocho tipos primitivos de Java', 'H2CC'),
               para('Elige el tipo por el dominio del dato. Los enteros tienen capacidad limitada; las operaciones aritméticas con byte, short y char suelen promocionarse a int. float y double aproximan decimales, así que una comparación exacta puede sorprender. String es una clase de referencia, no un noveno primitivo; compara su contenido con equals().', 'BodyCC'),
               java_primitive_table()]
              if track == 'Java' and family == 'values' else []),
            para('Glosario de trabajo', 'H2CC'), glossary_table(family),
            para('No memorices la tabla como definiciones aisladas. Relaciona cada término con una línea del ejemplo o una decisión del ejercicio. Si una palabra aparece con otro significado en una API o en otra versión del lenguaje, anótalo junto a la fuente oficial antes de aplicarla al proyecto.'),
        ],
        [
            para('Lección 3 · Lectura guiada del ejemplo', 'H1CC'),
            para('Primero identifica la entrada, luego sigue el valor por el programa. No supongas que una asignación transforma el dato: a veces solo enlaza un nombre con el mismo objeto. Observa dónde empieza cada bloque, qué condición activa una rama y qué instrucción produce la salida. Si el ejemplo tiene varias líneas, ejecútalo por partes y añade temporalmente observaciones seguras para ver los valores intermedios.', 'BodyCC'),
            *code_panel(short_example),
            para('Salida esperada', 'H2CC'), Preformatted(content['output'], styles['CodeCC'], maxLineLength=84),
            para('Registro de la traza', 'H2CC'),
            study_table(['Momento', 'Qué anotar'], [
                ('Antes de ejecutar', 'Valores iniciales, sus tipos y qué operación esperas que ocurra.'),
                ('Después de cada paso', 'Nombre afectado, valor nuevo y regla que produjo el cambio.'),
                ('Al encontrar una decisión', 'Condición evaluada y camino que se ejecutó.'),
                ('Al terminar', 'Salida real, diferencia respecto a tu predicción y causa.'),
                ('Con una entrada distinta', 'Qué resultado cambia y qué parte del contrato permanece igual.'),
            ]),
            para('Traza en papel', 'H2CC'),
            bullet('Antes de la primera instrucción: apunta los valores iniciales y sus tipos.'),
            bullet('Después de cada operación: anota solo los nombres que hayan cambiado y la razón.'),
            bullet(f'Al final: compara tu predicción con «{content["output"]}» y explica la diferencia si la hay.'),
            para('Cambia un dato de entrada y vuelve a hacer la traza. Una buena explicación debe anticipar el nuevo resultado, no limitarse a repetir la salida original.'),
        ],
        [
            para('Lección 4 · Decidir cuándo usarlo', 'H1CC'),
            para(detail),
            para(f'Caso aplicado: en un proyecto de DAM/DAW, una pantalla de matrículas necesita {title.lower()}. Describe qué datos de la matrícula intervienen, qué regla del tema usarías y qué resultado verá el usuario. Mantén el cálculo o decisión separado de la lectura de interfaz cuando sea posible; así podrás comprobar la regla sin abrir la pantalla.', 'BodyCC'),
            para('Compara antes de elegir', 'H2CC'),
            bullet('¿La solución más directa deja claro el propósito o requiere conocer demasiados detalles internos?'),
            bullet('¿Qué coste aparece si crece el volumen de datos o se añade un nuevo caso?'),
            bullet('¿Qué comprobación automatizada detectaría una modificación accidental?'),
            para('Enfoques relacionados', 'H2CC'),
            *[bullet(approach) for approach in exercise['alternatives']],
            para('No existe una alternativa mejor en todos los contextos. Elige una y escribe su ventaja y su límite para el tamaño, la versión y los requisitos del ejercicio. Si dos enfoques cumplen exactamente el mismo contrato y ambos son legibles, pueden considerarse válidos.'),
        ],
        [
            para('Lección 5 · Errores y diagnóstico', 'H1CC'),
            para('Fallos que conviene reconocer', 'H2CC'),
            *[bullet(f'{mistake} Para localizarlo, reduce el caso a la menor entrada que lo reproduce, observa el valor implicado y verifica la regla antes de cambiar el código.') for mistake in content['mistakes']],
            para('Rutina de depuración', 'H2CC'),
            para('1. Describe el resultado esperado y el resultado real sin mezclar ambos. 2. Reproduce el fallo con una entrada fija. 3. Reduce el programa hasta dejar la primera operación que se comporta distinto. 4. Formula una hipótesis comprobable y cambia una sola cosa. 5. Añade una prueba que impida que el mismo fallo vuelva. Este orden también funciona cuando el error aparece en una API, una interfaz o un archivo.'),
            para('Preguntas de revisión', 'H2CC'),
            bullet('¿El error está en los datos, en la regla o en cómo se presenta el resultado?'),
            bullet('¿Qué caso límite no estaba cubierto por el ejemplo inicial?'),
            bullet('¿La solución corrige la causa o solo oculta el síntoma?'),
        ],
        [
            para('Lección 6 · Práctica guiada', 'H1CC'),
            para('Situación de DAM/DAW', 'H2CC'), para(exercise['scenario']),
            para('Enunciado', 'H2CC'), para(exercise['statement']),
            para('Convierte el enunciado en requisitos verificables', 'H2CC'),
            bullet('Escribe qué entradas acepta la solución y qué debe devolver o mostrar.'),
            bullet('Enumera las reglas de negocio y separa las que son obligatorias de las decisiones de presentación.'),
            bullet('Antes de programar, completa la tabla de pruebas y predice cada resultado.'),
            para('Casos que debe superar', 'H2CC'), case_table(exercise['cases']),
            para('Qué demuestra cada caso', 'H2CC'),
            para('Clasifica cada fila de la tabla como caso habitual, límite o variación importante. Si el enunciado no define qué hacer con una entrada fuera de contrato, no inventes un resultado silencioso: anota la ambigüedad y propone una regla antes de programar. En la práctica profesional, acordar esa regla evita que dos implementaciones parezcan correctas y se comporten de forma incompatible.'),
            para('Plan de solución', 'H2CC'),
            bullet('Divide la tarea en pasos pequeños que puedan comprobarse por separado.'),
            bullet('Implementa primero el caso habitual y después añade los límites y errores previstos.'),
            bullet('Ejecuta cada caso tras un cambio; no esperes al final para descubrir qué parte falló.'),
        ],
        [
            para('Lección 7 · Solución explicada', 'H1CC'),
            para('Una solución no se justifica solo porque la salida coincida en un ejemplo. Debe respetar el contrato para todas las entradas admitidas. Lee el código siguiente y vincula cada operación con una frase del enunciado. Si no puedes señalar esa relación, revisa el diseño antes de continuar.', 'BodyCC'),
            *code_panel(short_solution),
            para('Por qué se sigue este razonamiento', 'H2CC'), para(exercise['reasoning']),
            para('Comprobación de corrección', 'H2CC'),
            para('Comprueba cada caso de la tabla y explica qué parte de la solución lo cubre. Después revisa el caso mínimo, el máximo razonable y una entrada inválida si el contrato la permite. Comprueba también los tipos de entrada y salida: una coincidencia textual puede ocultar un valor mal tipado o una conversión con pérdida.'),
            study_table(['Paso', 'Justificación que debes poder dar'], [
                ('Contrato', 'Qué valores acepta el ejercicio y qué resultado promete.'),
                ('Regla', 'Qué operación transforma la entrada en la salida.'),
                ('Pruebas', 'Qué caso comprueba lo normal y cuál descubre un límite.'),
            ]),
            para('Alternativas válidas', 'H2CC'),
            *[bullet(approach) for approach in exercise['alternatives']],
            para('Al comparar soluciones, prioriza contrato correcto, legibilidad y pruebas. Una alternativa que cambia la representación interna puede ser válida; una que cambia silenciosamente el significado de la salida no lo es.'),
        ],
        [
            para('Lección 8 · Laboratorio de aplicación', 'H1CC'),
            para(f'Retoma el ejercicio de {title.lower()} y amplíalo como una pequeña funcionalidad de una aplicación de gestión académica. Conserva el requisito original y añade una regla nueva que tenga sentido para los datos. Antes de modificar el código, escribe la regla en lenguaje natural, un ejemplo que la cumpla y otro que la incumpla.', 'BodyCC'),
            para('Variación para transferir lo aprendido', 'H2CC'), para(exercise['extension']),
            para('Desafíos progresivos', 'H2CC'),
            bullet('Nivel 1: añade un caso límite que no aparecía en la tabla y registra el resultado esperado.'),
            bullet('Nivel 2: cambia la forma de recibir o recorrer los datos sin cambiar el contrato externo.'),
            bullet('Nivel 3: separa la regla principal de su entrada/salida y prueba ambas partes de forma independiente.'),
            para('Criterios de entrega', 'H2CC'),
            bullet('La solución conserva el resultado esperado del ejercicio original.'),
            bullet('El nuevo comportamiento queda cubierto por una prueba que falla antes del cambio.'),
            bullet('Los nombres permiten seguir el flujo sin comentarios que repitan la sintaxis.'),
            bullet('La entrada inválida o el error externo tiene una respuesta definida.'),
            para('Prueba de regresión', 'H2CC'),
            para('Guarda los casos originales antes de añadir la regla nueva. Ejecuta la batería completa después de cada cambio, no solo el nuevo caso. Si una prueba deja de pasar, decide si encontraste un defecto o si cambió el contrato y hay que actualizar la expectativa con una explicación. Termina con una nota breve: qué cambió, qué comprobaste y qué límite sigue abierto.'),
            para('Anota qué parte se puede reutilizar en otro módulo y qué parte depende del contexto de la aplicación. Esa distinción ayuda a decidir si merece la pena extraer una función o componente.'),
        ],
        [
            para('Lección 9 · Repaso activo', 'H1CC'),
            para('Cierra el material y responde sin copiar frases. Si dudas, vuelve a la página indicada, comprueba la fuente primaria y reescribe la respuesta con tus palabras. La recuperación activa ayuda a detectar qué parte aún depende de memorizar un ejemplo concreto.', 'BodyCC'),
            para('Preguntas', 'H2CC'),
            bullet(f'¿Qué problema aborda {title.lower()} y qué dato necesita?'),
            bullet('¿Qué diferencia hay entre una solución que funciona en el ejemplo y una que cumple el contrato?'),
            bullet('¿Qué error frecuente te parece más probable y cómo lo reproducirías?'),
            bullet('¿Qué alternativa elegirías en un proyecto pequeño y por qué?'),
            para('Respuestas de comprobación', 'H2CC'),
            bullet(f'La idea clave se resume en esta explicación: {content["explanation"]}'),
            bullet(f'Una fuente inicial de fallo descrita en el tema es: {content["mistakes"][0]}'),
            bullet('Una alternativa es válida si mantiene las entradas, salidas y reglas acordadas y supera las mismas pruebas.'),
            para('Si tu respuesta no menciona un caso o una condición concreta, añade un ejemplo propio y vuelve a comprobarlo.'),
        ],
        [
            para('Lección 10 · Síntesis y fuentes', 'H1CC'),
            para('Resumen del tema', 'H2CC'),
            para(f'Has estudiado {title.lower()} desde el modelo conceptual hasta una práctica comprobable. La secuencia de trabajo es: identificar entradas y contrato, elegir la operación adecuada, seguir el flujo, comprobar casos límite y conservar una prueba para la siguiente modificación. Aplica las reglas de {track} sin confundir una característica del lenguaje con una API concreta del entorno.'),
            para('Lista de control antes de avanzar', 'H2CC'),
            bullet('Puedo explicar el concepto con un ejemplo propio y predecir su salida.'),
            bullet('Puedo identificar al menos un caso límite y un error habitual.'),
            bullet('Puedo comparar dos enfoques y justificar mi elección.'),
            bullet('Puedo verificar una solución sin depender de mirar el resultado una sola vez.'),
            para('Fuentes oficiales para ampliar', 'H2CC'),
            Paragraph(' · '.join(source_links), styles['SourcesCC']),
            para('Consulta la sección de la fuente que corresponda a la versión de tu proyecto. Este cuaderno resume conceptos para estudiar; cuando haya una diferencia de detalle, prevalece la documentación oficial del lenguaje o biblioteca.'),
        ],
    ]
    return pages


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
        minimum_exercise_text = {'scenario': 50, 'reasoning': 120, 'extension': 50}
        if any(
            not isinstance(exercise.get(field), str) or len(exercise[field].strip()) < minimum
            for field, minimum in minimum_exercise_text.items()
        ):
            raise ValueError(f'Falta contexto, razonamiento o variación sustantiva en {key[0]}: {key[1]}')
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
    pages = make_pages(item)
    story = []
    for page_number, page in enumerate(pages):
        if page_number:
            story.append(PageBreak())
        story.extend(page)

    def create_doc():
        return SimpleDocTemplate(
            str(work_pdf), pagesize=A4, rightMargin=1.7*cm, leftMargin=1.7*cm,
            topMargin=1.4*cm, bottomMargin=1.6*cm,
            title=f"{item['track']} · Tema {item['num']:02d}: {item['title']}",
            author='CódigoClaro · síntesis basada en fuentes oficiales',
            subject=f"Temario didáctico de {item['track']} para DAM y DAW",
        )

    doc = create_doc()
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    if doc.page < 10:
        raise ValueError(f'El temario {item["file"]} debe ocupar al menos diez páginas; se generaron {doc.page}.')
    shutil.copyfile(work_pdf, dest)
    return dest, doc.page


COMPLEMENTARY_GUIDE_FILES = {
    '01_Java_POO.pdf',
    '02_SQL_MySQL_PL-SQL.pdf',
    '03_HTML_CSS_JavaScript.pdf',
    '04_Python_desde_cero.pdf',
    '05_XML_XPath_JSON_MongoDB.pdf',
    '06_XML_XPath_Avanzado.pdf',
    '07_PL_SQL_Cursores_Paquetes.pdf',
    '08_Java_Ejercicios_Examen.pdf',
    '09_Simulacros_DAM_Modulos.pdf',
    'Ruta_TypeScript_JavaScript_React_Node_15_Temas.pdf',
}


def load_complementary_guides():
    """Valida que las guías complementarias tengan contenido suficiente por página."""
    if not COMPLEMENTARY_GUIDES_FILE.is_file():
        raise FileNotFoundError(f'Falta el contenido de las guías complementarias: {COMPLEMENTARY_GUIDES_FILE}')
    payload = json.loads(COMPLEMENTARY_GUIDES_FILE.read_text(encoding='utf-8'))
    if payload.get('version') != 1 or not isinstance(payload.get('guides'), list):
        raise ValueError('Las guías complementarias necesitan version 1 y una lista guides.')

    indexed = {}
    for guide in payload['guides']:
        filename = guide.get('file')
        if filename in indexed:
            raise ValueError(f'Guía complementaria duplicada: {filename}')
        if filename not in COMPLEMENTARY_GUIDE_FILES:
            raise ValueError(f'Nombre de guía complementaria inesperado: {filename!r}')
        if not isinstance(guide.get('title'), str) or not guide['title'].strip():
            raise ValueError(f'Falta el título de {filename}.')
        pages = guide.get('pages')
        if not isinstance(pages, list) or len(pages) < 10:
            raise ValueError(f'{filename} necesita al menos diez páginas de contenido.')
        headings = []
        for page_number, page in enumerate(pages, start=1):
            if not isinstance(page, dict):
                raise ValueError(f'La página {page_number} de {filename} debe ser un objeto JSON.')
            blocks = page.get('blocks')
            if not isinstance(page.get('heading'), str) or not page['heading'].strip() or not isinstance(blocks, list):
                raise ValueError(f'La página {page_number} de {filename} necesita título y bloques.')
            headings.append(page['heading'].strip().casefold())
            words = 0
            for block in blocks:
                kind = block.get('type') if isinstance(block, dict) else None
                if kind in ('paragraph', 'code', 'callout'):
                    text = block.get('text')
                    if not isinstance(text, str) or not text.strip():
                        raise ValueError(f'Bloque vacío en la página {page_number} de {filename}.')
                    words += len(re.findall(r'\w+', text, flags=re.UNICODE))
                elif kind in ('bullets', 'steps'):
                    items = block.get('items')
                    if not isinstance(items, list) or not items or any(not isinstance(value, str) or not value.strip() for value in items):
                        raise ValueError(f'Lista vacía o incorrecta en la página {page_number} de {filename}.')
                    words += sum(len(re.findall(r'\w+', value, flags=re.UNICODE)) for value in items)
                elif kind == 'heading':
                    if not isinstance(block.get('text'), str) or not block['text'].strip():
                        raise ValueError(f'Encabezado vacío en la página {page_number} de {filename}.')
                else:
                    raise ValueError(f'Tipo de bloque desconocido {kind!r} en {filename}.')
            if words < 100:
                raise ValueError(f'La página {page_number} de {filename} necesita al menos 100 palabras de contenido didáctico.')
        if len(set(headings)) != len(headings):
            raise ValueError(f'{filename} repite el título de una o más páginas didácticas.')

        sources = guide.get('sources')
        if not isinstance(sources, list) or not sources or any(
            not isinstance(source, dict)
            or not isinstance(source.get('label'), str)
            or not source['label'].strip()
            or not isinstance(source.get('url'), str)
            or urlparse(source['url']).scheme != 'https'
            or not urlparse(source['url']).hostname
            for source in sources
        ):
            raise ValueError(f'{filename} necesita referencias HTTPS directas.')
        indexed[filename] = guide

    if indexed.keys() != COMPLEMENTARY_GUIDE_FILES:
        raise ValueError(f'Cobertura incorrecta de guías complementarias: faltan {sorted(COMPLEMENTARY_GUIDE_FILES - indexed.keys())}.')
    return indexed


def guide_block_flowables(block):
    """Convierte un bloque editorial de guía en elementos ReportLab."""
    kind = block['type']
    if kind == 'heading':
        return [para(block['text'], 'H2CC')]
    if kind == 'paragraph':
        return [para(block['text'], 'BodyCC')]
    if kind == 'callout':
        return [para(block['text'], 'BodyLastCC')]
    if kind == 'code':
        return [para('Código · ' + block.get('language', 'ejemplo'), 'SmallCC'),
                Preformatted(block['text'], styles['CodeCC'], maxLineLength=84)]
    if kind == 'bullets':
        return [bullet(value) for value in block['items']]
    if kind == 'steps':
        return [Paragraph(f'<b>{index}.</b> {esc(value)}', styles['BodyCC'])
                for index, value in enumerate(block['items'], start=1)]
    raise ValueError(f'Tipo de bloque desconocido: {kind!r}')


def build_complementary_guides(workspace, only=None):
    """Regenera y sincroniza guías complementarias con explicaciones extensas."""
    guides = load_complementary_guides()
    if only is not None:
        unknown = set(only) - guides.keys()
        if unknown:
            raise ValueError(f'No hay contenido para estas guías complementarias: {sorted(unknown)}')
        guides = {filename: guide for filename, guide in guides.items() if filename in only}
    page_counts = {}
    for filename, guide in guides.items():
        work_pdf = workspace / filename
        story = [
            para('CÓDIGOCLARO · MATERIAL DE ESTUDIO', 'H2CC'),
            para(guide['title'], 'CoverTitleCC'),
            para(guide.get('subtitle', 'Guía de estudio · DAM/DAW'), 'SubCC'),
        ]
        for index, page in enumerate(guide['pages']):
            if index:
                story.append(PageBreak())
            story.append(para(page['heading'], 'H1CC'))
            for block in page['blocks']:
                story.extend(guide_block_flowables(block))
        source_links = [
            f'<link href="{esc(source["url"])}" color="#087f8c">{esc(source["label"])}</link>'
            for source in guide['sources']
        ]
        story.extend([
            para('Fuentes oficiales', 'H2CC'),
            Paragraph(' · '.join(source_links), styles['SourcesCC']),
        ])
        doc = SimpleDocTemplate(
            str(work_pdf), pagesize=A4,
            rightMargin=1.7 * cm, leftMargin=1.7 * cm,
            topMargin=1.4 * cm, bottomMargin=1.6 * cm,
            title=guide['title'],
            author='CódigoClaro · síntesis basada en fuentes oficiales',
            subject='Guía didáctica para DAM y DAW',
        )
        doc.build(story, onFirstPage=footer, onLaterPages=footer)
        if doc.page < 10:
            raise ValueError(f'La guía {filename} debe ocupar al menos diez páginas; se generaron {doc.page}.')
        for destination in (PUB / 'temarios' / filename, ROOT / 'docs' / 'temarios' / filename):
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(work_pdf, destination)
        page_counts[filename] = doc.page
    return page_counts


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
            story.extend(topic_block)

        story.extend([
            para('Laboratorio integrador · catálogo de módulos', 'H2CC'),
            para('Organiza una solución en tres piezas: un módulo compartido con el tipo `Modulo` y funciones puras; una entrada Node que importe esas funciones; y un componente React que reciba resultados mediante props y represente estados de petición con una unión discriminada. Antes de aceptar JSON como `Modulo`, valida sus campos en tiempo de ejecución. Entrega los tres módulos, un caso normal, uno vacío y uno inválido, y explica qué garantiza el verificador y qué comprobación protege la frontera de datos.'),
            Paragraph('<b>Documentación:</b> <link href="https://www.typescriptlang.org/docs/handbook/2/modules.html" color="#087f8c">Handbook: módulos</link> · <link href="https://react.dev/learn/typescript" color="#087f8c">React: usar TypeScript</link> · <link href="https://www.typescriptlang.org/docs/handbook/2/narrowing.html" color="#087f8c">Handbook: narrowing</link>', styles['SmallCC']),
        ])

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
    """Regenera los 75 temas y las diez guías complementarias con copias sincronizadas."""
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
    guide_page_counts = {}
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
            item['version'] = '3.0'
        guide_page_counts = build_complementary_guides(workspace)

    public_by_file = {item['file']: item for item in catalog}
    for item in docs_catalog:
        item['description'] = clean_auto_description(item['description'])
        item['pages'] = page_counts[item['file']]
        item['version'] = public_by_file[item['file']]['version']

    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    docs_catalog_path.write_text(json.dumps(docs_catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    if min(page_counts.values()) < 10 or (guide_page_counts and min(guide_page_counts.values()) < 10):
        raise ValueError('Todos los temarios individuales y las guías complementarias generadas deben ocupar al menos diez páginas.')
    print(f'Generados {len(catalog)} temarios individuales y {len(guide_page_counts)} guías complementarias; mínimo {min([*page_counts.values(), *guide_page_counts.values()])} páginas por PDF.')


def validate_only():
    """Comprueba cobertura y campos didácticos sin escribir ningún PDF."""
    catalog = json.loads(CATALOG.read_text(encoding='utf-8'))
    content = load_topic_content(catalog)
    docs_catalog = json.loads((ROOT / 'docs' / 'catalogo_temas.json').read_text(encoding='utf-8'))
    if [item['file'] for item in catalog] != [item['file'] for item in docs_catalog]:
        raise ValueError('Los catálogos docs/public no contienen los mismos archivos y en el mismo orden.')
    if any((public.get('pages'), public.get('version')) != (docs.get('pages'), docs.get('version'))
           for public, docs in zip(catalog, docs_catalog)):
        raise ValueError('Los catálogos docs/public declaran páginas o versiones distintas.')
    cases = sum(len(item['exercise']['cases']) for item in content.values())
    guides = load_complementary_guides()
    print(f'Validación correcta: {len(content)} temas, {cases} casos de práctica, {len(guides)} guías complementarias y fuentes HTTPS con host; sin generar archivos.')


if __name__ == '__main__':
    if sys.argv[1:] == ['--typescript-route']:
        temporary_root = ROOT / 'tmp' / 'pdfs'
        temporary_root.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='typescript-', dir=temporary_root) as directory:
            page_counts = build_complementary_guides(
                Path(directory), only={'Ruta_TypeScript_JavaScript_React_Node_15_Temas.pdf'}
            )
        print(f'Ruta TypeScript generada: {page_counts}')
    elif sys.argv[1:] == ['--validate-only']:
        validate_only()
    else:
        main()
