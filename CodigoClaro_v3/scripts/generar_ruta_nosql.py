#!/usr/bin/env python3
"""Genera la ruta MongoDB/Cloud Firestore en sus dos ubicaciones organizadas."""
from pathlib import Path
from shutil import copyfile
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, KeepTogether, PageBreak, PageTemplate, Paragraph,
    Spacer, Table, TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
DOC_OUTPUT = ROOT / "docs" / "temarios" / "Ruta_NoSQL_Firebase_MongoDB_15_Temas.pdf"
PUBLIC_OUTPUT = ROOT / "public" / "temarios" / "Ruta_NoSQL_Firebase_MongoDB_15_Temas.pdf"
NAVY = colors.HexColor("#18354A")
TEAL = colors.HexColor("#167A78")
VIOLET = colors.HexColor("#6651A5")
INK = colors.HexColor("#26323A")
MUTED = colors.HexColor("#596873")
PALE = colors.HexColor("#EAF4F2")
LILAC = colors.HexColor("#F1EFF8")
LINE = colors.HexColor("#D8E0E2")

SOURCES = {
    "MongoDB - modelado de datos": "https://www.mongodb.com/docs/manual/data-modeling/",
    "MongoDB - buenas prácticas de modelado": "https://www.mongodb.com/docs/manual/data-modeling/best-practices/",
    "MongoDB - datos embebidos": "https://www.mongodb.com/docs/manual/data-modeling/embedding/",
    "MongoDB - referencias": "https://www.mongodb.com/docs/manual/data-modeling/referencing/",
    "MongoDB - operaciones CRUD": "https://www.mongodb.com/docs/manual/crud/",
    "MongoDB - consultas": "https://www.mongodb.com/docs/manual/tutorial/query-documents/",
    "MongoDB - índices": "https://www.mongodb.com/docs/manual/indexes/",
    "MongoDB - agregación": "https://www.mongodb.com/docs/manual/aggregation/",
    "MongoDB - validación de esquema": "https://www.mongodb.com/docs/manual/core/schema-validation/",
    "MongoDB - transacciones": "https://www.mongodb.com/docs/manual/core/transactions/",
    "MongoDB - usuarios y roles": "https://www.mongodb.com/docs/manual/reference/database-users/",
    "MongoDB - lista de seguridad": "https://www.mongodb.com/docs/manual/administration/security-checklist/",
    "Firebase - modelo de Cloud Firestore": "https://firebase.google.com/docs/firestore/data-model",
    "Firebase - escritura de datos en Firestore": "https://firebase.google.com/docs/firestore/manage-data/add-data",
    "Firebase - lectura de datos en Firestore": "https://firebase.google.com/docs/firestore/query-data/get-data",
    "Firebase - elegir estructura de Firestore": "https://firebase.google.com/docs/firestore/manage-data/structure-data",
    "Firebase - consultas de Firestore": "https://firebase.google.com/docs/firestore/query-data/queries",
    "Firebase - índices de Firestore": "https://firebase.google.com/docs/firestore/query-data/index-overview",
    "Firebase - agregaciones de Firestore": "https://firebase.google.com/docs/firestore/query-data/aggregation-queries",
    "Firebase - condiciones de Security Rules": "https://firebase.google.com/docs/firestore/security/rules-conditions",
    "Firebase - consultas y reglas": "https://firebase.google.com/docs/firestore/security/rules-query",
    "Firebase - transacciones y escrituras por lotes": "https://firebase.google.com/docs/firestore/manage-data/transactions",
    "Firebase - acceso sin conexión": "https://firebase.google.com/docs/firestore/manage-data/enable-offline",
    "Firebase - Emulator Suite": "https://firebase.google.com/docs/emulator-suite",
    "Firebase - Firestore y Realtime Database": "https://firebase.google.com/docs/database/rtdb-vs-firestore",
}

TOPICS = [
    {
        "title": "Qué cubre una base de documentos",
        "objective": "Distinguir una base de documentos de la plataforma que la ofrece y fijar el alcance de esta ruta.",
        "points": [
            "NoSQL agrupa modelos distintos; los conceptos de documentos de MongoDB y Cloud Firestore no describen todos los productos NoSQL.",
            "Firebase es una plataforma con varios servicios. Esta ruta estudia Cloud Firestore; Realtime Database es otro producto con estructura y reglas propias.",
            "Un esquema flexible permite variar documentos, pero la aplicación sigue necesitando convenciones estables para campos y tipos.",
        ],
        "practice": "Elige una aplicación pequeña y escribe qué lecturas y escrituras necesita. Indica si estudiarás MongoDB o Cloud Firestore y por qué.",
        "check": "Puedes explicar qué producto usarás y no confundes Firebase con una base de datos única.",
        "sources": ["MongoDB - modelado de datos", "Firebase - modelo de Cloud Firestore", "Firebase - Firestore y Realtime Database"],
    },
    {
        "title": "Documentos, colecciones y tipos",
        "objective": "Leer y diseñar la unidad básica de almacenamiento de cada producto.",
        "points": [
            "MongoDB organiza documentos BSON en colecciones; un documento puede incluir valores, arrays y documentos anidados.",
            "Firestore organiza campos clave-valor en documentos agrupados en colecciones; admite mapas, arrays y subcolecciones.",
            "Firestore alterna rutas de colección y documento. Una colección no contiene directamente campos ni otra colección.",
        ],
        "practice": "Representa un curso y sus lecciones en ambos productos. Dibuja la ruta de un documento concreto de Firestore.",
        "check": "Puedes señalar la colección, el documento, sus campos y la diferencia entre un campo anidado y una subcolección.",
        "sources": ["MongoDB - modelado de datos", "Firebase - modelo de Cloud Firestore"],
    },
    {
        "title": "Diseñar según las lecturas",
        "objective": "Elegir entre datos embebidos, referencias o subcolecciones en función del uso previsto.",
        "points": [
            "MongoDB recomienda considerar juntas las operaciones de lectura y escritura; embebe datos que suelen consultarse y actualizarse juntos.",
            "Las referencias pueden convenir para relaciones de alta cardinalidad, muchos-a-muchos o entidades que se consultan por separado.",
            "En Firestore, mapas y arrays sirven para datos pequeños y acotados; una lista que crece puede encajar mejor en una subcolección.",
            "Borrar un documento padre de Firestore no elimina automáticamente sus subcolecciones; planifica esa limpieza por separado.",
        ],
        "practice": "Modela una sala con mensajes. Compara un array fijo de etiquetas con una colección de mensajes que crecerá con el tiempo.",
        "check": "La elección se apoya en las lecturas previstas, el crecimiento y el ciclo de vida; no solo en que una forma parezca más simple.",
        "sources": ["MongoDB - buenas prácticas de modelado", "MongoDB - datos embebidos", "MongoDB - referencias", "Firebase - elegir estructura de Firestore", "Firebase - modelo de Cloud Firestore"],
    },
    {
        "title": "CRUD básico en MongoDB",
        "objective": "Crear, consultar, actualizar y borrar documentos con filtros explícitos.",
        "points": [
            "Las operaciones de colección incluyen insertOne/insertMany, find/findOne, updateOne/updateMany y deleteOne/deleteMany.",
            "Un filtro selecciona los documentos afectados. Antes de actualizar o borrar, comprueba que el filtro representa el conjunto esperado.",
            "Los operadores de actualización expresan cambios de campos; una operación de reemplazo tiene semántica distinta de una actualización parcial.",
        ],
        "practice": "Crea tres cursos, consulta los publicados, cambia el estado de uno mediante su identificador y borra solo un registro de prueba.",
        "check": "Puedes explicar qué documentos coincide cada filtro y revisar el resultado antes y después de cada escritura.",
        "sources": ["MongoDB - operaciones CRUD", "MongoDB - consultas"],
    },
    {
        "title": "Leer y escribir en Cloud Firestore",
        "objective": "Trabajar con referencias de documentos y distinguir las rutas que usa la aplicación.",
        "points": [
            "Una referencia identifica una ubicación; crearla no implica que el documento ya exista ni que se haya hecho una petición de red.",
            "En la SDK web, setDoc() escribe en una ruta elegida y puede sobrescribir el documento; usa la opción merge cuando quieras combinar campos.",
            "addDoc() asigna un ID generado. Ese ID no ordena los documentos por fecha: guarda una marca temporal si la consulta necesita orden cronológico.",
            "updateDoc() cambia campos; getDoc() lee un documento y getDocs() recupera una consulta. Un listener permite recibir cambios posteriores.",
        ],
        "practice": "Define las rutas de cursos y matrículas. Escribe un documento con ID elegido y otro con ID generado por la SDK; explica la diferencia para el cliente.",
        "check": "Puedes reconstruir la ruta de cada documento y separar la referencia en código de la operación que lee o escribe.",
        "sources": ["Firebase - modelo de Cloud Firestore", "Firebase - escritura de datos en Firestore", "Firebase - lectura de datos en Firestore", "Firebase - elegir estructura de Firestore"],
    },
    {
        "title": "Filtros, orden y páginas",
        "objective": "Formular consultas acotadas y comprobar sus límites en el producto elegido.",
        "points": [
            "MongoDB combina filtros de campo con operadores de comparación; la consulta puede incluir proyección y orden.",
            "Firestore compone filtros, ordenación y límites. Las combinaciones admitidas y sus índices dependen de las capacidades documentadas del producto.",
            "Añade un límite o paginación cuando una pantalla muestra una parte de una colección; evita descargar todo el conjunto para filtrar en el cliente.",
        ],
        "practice": "Consulta cursos activos ordenados por fecha, con un límite pequeño. Repite la consulta con un filtro y registra qué índice solicita Firestore si hace falta.",
        "check": "La consulta expresa los criterios en el servidor y devuelve solo la página que la interfaz necesita.",
        "sources": ["MongoDB - consultas", "Firebase - consultas de Firestore"],
    },
    {
        "title": "Índices y coste de consulta",
        "objective": "Relacionar índices con patrones de consulta y observar su coste de mantenimiento.",
        "points": [
            "MongoDB ofrece índices de campo único y compuestos, entre otros; el orden de campos de un compuesto afecta a los prefijos que puede servir.",
            "Firestore mantiene índices automáticos para consultas básicas y requiere índices adecuados para determinadas consultas compuestas.",
            "Un índice acelera consultas compatibles, pero también ocupa almacenamiento y debe actualizarse con los documentos.",
        ],
        "practice": "Anota las tres consultas más frecuentes de tu aplicación. Diseña un índice para cada patrón y comprueba el plan o la sugerencia del producto.",
        "check": "Puedes justificar el índice con una consulta observada y explicar un coste de mantenerlo.",
        "sources": ["MongoDB - índices", "Firebase - índices de Firestore"],
    },
    {
        "title": "Agregación y resúmenes",
        "objective": "Elegir una operación de resumen que corresponda a las capacidades del motor.",
        "points": [
            "La agregación de MongoDB procesa documentos mediante etapas encadenadas, por ejemplo filtrar, agrupar y proyectar resultados.",
            "Firestore ofrece agregaciones count(), sum() y average() sobre consultas e índices; no equivale a una canalización general de agregación.",
            "En Firestore estas agregaciones consultan el backend y no admiten listeners en tiempo real ni consultas sin conexión.",
        ],
        "practice": "Cuenta matrículas por curso. Implementa un resumen en el producto elegido y explica qué datos recorre según su documentación.",
        "check": "El resumen usa una capacidad disponible del motor y se entiende su relación con los índices y los datos leídos.",
        "sources": ["MongoDB - agregación", "Firebase - agregaciones de Firestore"],
    },
    {
        "title": "Validación y consistencia de documentos",
        "objective": "Evitar que campos con tipos o valores inesperados rompan la aplicación.",
        "points": [
            "MongoDB permite configurar validación de esquema para exigir tipos, rangos u otras condiciones; por defecto puede rechazar escrituras que incumplen la regla.",
            "Firestore permite expresar condiciones para operaciones de cliente mediante Security Rules; estas reglas deben corresponder al contrato de escritura.",
            "Un cliente puede saltarse la validación de la interfaz. Valida las entradas en el servidor y define qué capa es responsable de cada regla.",
        ],
        "practice": "Define los campos obligatorios y tipos de un curso. Prueba un título vacío, una fecha con formato incorrecto y un campo adicional no previsto.",
        "check": "La aplicación rechaza datos inválidos en una frontera de confianza y deja claro qué reglas protegen las escrituras.",
        "sources": ["MongoDB - validación de esquema", "Firebase - condiciones de Security Rules"],
    },
    {
        "title": "Atomicidad y transacciones",
        "objective": "Agrupar cambios relacionados para no dejar un estado parcial.",
        "points": [
            "En MongoDB, una escritura sobre un documento es atómica; hay transacciones para casos que requieren atomicidad entre documentos.",
            "Las transacciones de Firestore aplican todas las escrituras o ninguna; ante una edición concurrente, la función puede ejecutarse otra vez.",
            "Las funciones de transacción no deben producir efectos externos repetibles. Las escrituras por lotes no realizan lecturas previas y pueden ejecutarse sin conexión en SDK compatibles.",
        ],
        "practice": "Crea una matrícula que actualiza dos documentos. Fuerza un conflicto y comprueba si el flujo puede repetirse sin duplicar efectos externos.",
        "check": "La operación mantiene la consistencia ante un fallo o reintento y no mezcla garantías distintas de ambos productos.",
        "sources": ["MongoDB - transacciones", "Firebase - transacciones y escrituras por lotes"],
    },
    {
        "title": "Usuarios, roles y acceso en MongoDB",
        "objective": "Separar la autenticación de la autorización y asignar permisos con alcance limitado.",
        "points": [
            "MongoDB admite mecanismos de autenticación y usa control de acceso basado en roles para autorizar acciones sobre recursos.",
            "Crea usuarios con los privilegios necesarios para su tarea; evita credenciales compartidas y roles más amplios de lo requerido.",
            "La autorización de la base no sustituye la comprobación de propiedad que la aplicación necesita hacer sobre cada recurso solicitado.",
        ],
        "practice": "Diseña una cuenta de aplicación con permisos de lectura y escritura para una base de práctica. Enumera una acción administrativa que no debería poder realizar.",
        "check": "Puedes distinguir quién se autentica, qué rol tiene y qué permiso adicional evalúa la aplicación para un objeto.",
        "sources": ["MongoDB - usuarios y roles", "MongoDB - lista de seguridad"],
    },
    {
        "title": "Autenticación y reglas de Firestore",
        "objective": "Restringir las operaciones de cliente mediante identidad y condiciones sobre los datos.",
        "points": [
            "Las Security Rules pueden comprobar la identidad disponible en request.auth y validar condiciones sobre una lectura o escritura.",
            "Escribe reglas para cada ruta y operación necesaria; prueba también las operaciones que deben denegarse.",
            "Las bibliotecas de servidor de Cloud Firestore omiten Security Rules y usan IAM; el backend necesita una política de acceso de servidor.",
        ],
        "practice": "Permite que una persona lea su propio perfil y rechaza el perfil de otro ID. Añade una condición para validar el formato de un campo escrito.",
        "check": "La regla limita acceso en el servidor y la configuración distingue clientes web/móviles de bibliotecas de servidor.",
        "sources": ["Firebase - condiciones de Security Rules", "Firebase - Emulator Suite"],
    },
    {
        "title": "Consultas seguras y reglas",
        "objective": "Construir consultas que respeten las restricciones definidas para el cliente.",
        "points": [
            "Firestore Security Rules no filtra documentos después de una consulta: la consulta completa se acepta o se deniega.",
            "Diseña el filtro para que todo documento que pudiera aparecer en el resultado cumpla la regla de acceso.",
            "Limita la consulta y prueba tanto una petición permitida como otra que podría incluir datos de otra persona.",
        ],
        "practice": "Crea una colección de tareas por propietario. Prueba la consulta del usuario actual y una búsqueda sin el filtro de propietario.",
        "check": "La consulta permitida satisface las reglas por su forma y la prueba no depende de ocultar resultados en la interfaz.",
        "sources": ["Firebase - consultas y reglas", "Firebase - condiciones de Security Rules"],
    },
    {
        "title": "Sin conexión y cambios en tiempo real",
        "objective": "Explicar qué datos puede usar una aplicación Firestore cuando pierde la red.",
        "points": [
            "La persistencia sin conexión puede usar una copia en caché de los datos que la aplicación consultó mientras tenía acceso.",
            "Al recuperar la conexión, el SDK sincroniza cambios locales; si varias escrituras modifican el mismo documento, la política indicada es que prevalece la última escritura.",
            "La disponibilidad y configuración dependen de la plataforma y del SDK; una transacción requiere conexión con el backend.",
        ],
        "practice": "Desconecta una aplicación de práctica, cambia el mismo campo en dos clientes y vuelve a conectar. Documenta el resultado observado.",
        "check": "Puedes separar caché local, operación pendiente y estado confirmado por el backend.",
        "sources": ["Firebase - acceso sin conexión", "Firebase - transacciones y escrituras por lotes"],
    },
    {
        "title": "Proyecto: catálogo con reglas y consultas",
        "objective": "Integrar modelado, consultas, validación, permisos y manejo de fallos en un caso acotado.",
        "points": [
            "Diseña colecciones o colecciones/subcolecciones para cursos, autores y matrículas según las pantallas que implementarás.",
            "Define validación, índices y permisos antes de cargar datos de prueba; no uses reglas abiertas para resolver errores de consulta.",
            "Automatiza pruebas positivas y negativas con las herramientas del producto elegido; separa el entorno de prueba de datos reales.",
        ],
        "practice": "Entrega una pequeña API o aplicación con listado paginado, detalle, alta autenticada y consulta de matrículas propias. Incluye el modelo, reglas y un conjunto de pruebas en el Emulator Suite o entorno local.",
        "check": "Otra persona puede seguir el modelo, ejecutar las consultas previstas y comprobar que una identidad ajena recibe denegación.",
        "sources": ["MongoDB - buenas prácticas de modelado", "Firebase - Emulator Suite", "Firebase - condiciones de Security Rules"],
    },
]

STYLES = {
    "eyebrow": ParagraphStyle("eyebrow", fontName="Helvetica-Bold", fontSize=9, leading=12, textColor=TEAL, spaceAfter=5),
    "cover_title": ParagraphStyle("cover_title", fontName="Helvetica-Bold", fontSize=28, leading=33, textColor=NAVY, spaceAfter=8),
    "cover_sub": ParagraphStyle("cover_sub", fontName="Helvetica", fontSize=12.5, leading=18, textColor=MUTED, spaceAfter=11),
    "h1": ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=21, leading=26, textColor=NAVY, spaceAfter=12),
    "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=TEAL, spaceBefore=7, spaceAfter=5),
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=10, leading=13.8, textColor=INK, spaceAfter=5),
    "bullet": ParagraphStyle("bullet", fontName="Helvetica", fontSize=9.6, leading=13.2, textColor=INK, leftIndent=11, firstLineIndent=-9, spaceAfter=4),
    "small": ParagraphStyle("small", fontName="Helvetica", fontSize=8.5, leading=11, textColor=MUTED, spaceAfter=3),
    "source": ParagraphStyle("source", fontName="Helvetica", fontSize=8.2, leading=11, textColor=VIOLET, spaceAfter=2),
    "label": ParagraphStyle("label", fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=TEAL),
}


def para(text, style="body"):
    return Paragraph(text, STYLES[style])


def source_paragraph(name):
    url = SOURCES[name]
    return para(f'<link href="{escape(url)}" color="#6651A5"><u>{escape(name)}</u></link>', "source")


def callout(label, text, background=PALE):
    table = Table([[para(escape(label.upper()), "label"), para(escape(text), "body")]], colWidths=[34 * mm, 130 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), background),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.6)
    canvas.line(19 * mm, height - 17 * mm, width - 19 * mm, height - 17 * mm)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.setFillColor(NAVY)
    canvas.drawString(19 * mm, height - 13 * mm, "CÓDIGOCLARO  /  RUTA MONGODB Y FIRESTORE")
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(width - 19 * mm, 12 * mm, f"15 temas  ·  {doc.page}")
    canvas.restoreState()


def build_story():
    story = [Spacer(1, 24 * mm), para("RUTA FORMATIVA · BASES DE DATOS DOCUMENTALES", "eyebrow"),
             para("MongoDB y Cloud Firestore", "cover_title"),
             para("15 temas para modelar documentos, consultar datos y definir accesos", "cover_sub"),
             Spacer(1, 4 * mm),
             callout("Alcance", "Ruta complementaria sobre MongoDB y Cloud Firestore. Firebase es una plataforma con varios servicios; aquí se estudia Firestore, no se generalizan sus reglas a Realtime Database.", LILAC),
             Spacer(1, 8 * mm), para("Recorrido", "h2")]
    stages = [
        ("01-03  Modelo", "Alcance, documentos, colecciones y estructura según las lecturas."),
        ("04-08  Consultas", "CRUD, filtros, índices y agregaciones en cada producto."),
        ("09-13  Consistencia y seguridad", "Validación, transacciones, roles, Security Rules y consultas seguras."),
        ("14-15  Aplicación", "Trabajo sin conexión y proyecto integrador."),
    ]
    for title, description in stages:
        story.append(KeepTogether([para(escape(title), "h2"), para(escape(description), "body")]))
    story += [Spacer(1, 7 * mm), para("Cómo estudiar", "h2"),
              para("Lee el objetivo, consulta las fuentes oficiales enlazadas y realiza la práctica en una base de prueba. Compara el resultado con el criterio de comprobación. Los conceptos se atribuyen al producto correspondiente: MongoDB y Firestore comparten algunas ideas, pero no todas sus operaciones ni garantías.", "body"),
              para("Las capacidades, límites y sintaxis pueden depender de la versión, edición o SDK. Confirma la documentación de la instancia que estés usando antes de trasladar el ejercicio a un entorno real.", "small")]
    for index, topic in enumerate(TOPICS, 1):
        story.extend([para(f"TEMA {index:02d}  /  15", "eyebrow"), para(escape(topic["title"]), "h1"),
                      callout("Al terminar", topic["objective"]), Spacer(1, 4 * mm), para("Conceptos clave", "h2")])
        for point in topic["points"]:
            story.append(para("-  " + escape(point), "bullet"))
        story += [Spacer(1, 1 * mm), callout("Práctica", topic["practice"], LILAC),
                  Spacer(1, 3 * mm), callout("Comprueba", topic["check"], PALE),
                  Spacer(1, 3 * mm), para("Fuentes fiables", "h2")]
        for source in topic["sources"]:
            story.append(source_paragraph(source))
    story += [para("Referencias de la ruta", "h1"),
              para("Cada tema enlaza las fuentes más cercanas a sus afirmaciones. MongoDB y Firebase mantienen esta documentación primaria para sus productos.", "body"), Spacer(1, 3 * mm)]
    for name in SOURCES:
        story.append(source_paragraph(name))
    story += [Spacer(1, 6 * mm), callout("Criterio editorial", "Separamos capacidades de MongoDB, Cloud Firestore y Firebase. Los ejemplos son ejercicios de aprendizaje; permisos, índices y estructura deben ajustarse al producto y versión usados.", LILAC)]
    return story


def write_pdf(output):
    output.parent.mkdir(parents=True, exist_ok=True)
    page_width, page_height = A4
    doc = BaseDocTemplate(str(output), pagesize=A4, leftMargin=23 * mm, rightMargin=23 * mm,
                          topMargin=25 * mm, bottomMargin=22 * mm,
                          title="Ruta MongoDB y Cloud Firestore - 15 temas", author="CódigoClaro",
                          subject="Ruta de aprendizaje con documentación oficial de MongoDB y Firebase")
    frame = Frame(doc.leftMargin, doc.bottomMargin, page_width - doc.leftMargin - doc.rightMargin,
                  page_height - doc.topMargin - doc.bottomMargin, id="main", leftPadding=0,
                  rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=header_footer)])
    doc.build(build_story())


if __name__ == "__main__":
    write_pdf(DOC_OUTPUT)
    copyfile(DOC_OUTPUT, PUBLIC_OUTPUT)
    print(f"Generado: {DOC_OUTPUT}")
    print(f"Copia sincronizada: {PUBLIC_OUTPUT}")
