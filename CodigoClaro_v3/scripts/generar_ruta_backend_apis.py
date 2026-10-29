#!/usr/bin/env python3
"""Genera la ruta Backend y APIs en sus dos ubicaciones organizadas."""
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
DOC_OUTPUT = ROOT / "docs" / "temarios" / "Ruta_Backend_APIs_15_Temas.pdf"
PUBLIC_OUTPUT = ROOT / "public" / "temarios" / "Ruta_Backend_APIs_15_Temas.pdf"
NAVY = colors.HexColor("#18354A")
TEAL = colors.HexColor("#167A78")
VIOLET = colors.HexColor("#6651A5")
INK = colors.HexColor("#26323A")
MUTED = colors.HexColor("#596873")
PAPER = colors.HexColor("#F6F4EF")
PALE = colors.HexColor("#EAF4F2")
LILAC = colors.HexColor("#F1EFF8")
LINE = colors.HexColor("#D8E0E2")
WHITE = colors.white

SOURCES = {
    "RFC 9110 - Semántica HTTP": "https://www.rfc-editor.org/rfc/rfc9110.html",
    "RFC 6585 - 429 Too Many Requests": "https://www.rfc-editor.org/rfc/rfc6585.html",
    "RFC 5789 - método PATCH": "https://www.rfc-editor.org/rfc/rfc5789.html",
    "Node.js - módulo HTTP": "https://nodejs.org/api/http.html",
    "Node.js - trabajo asíncrono": "https://nodejs.org/learn/asynchronous-work/overview-of-blocking-vs-non-blocking",
    "OpenAPI Specification 3.1.0": "https://spec.openapis.org/oas/v3.1.0.html",
    "OWASP - validación de entradas": "https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html",
    "OWASP API4:2023 - consumo de recursos": "https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/",
    "OWASP API1:2023 - autorización por objeto": "https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/",
    "OWASP - gestión de sesiones": "https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html",
    "OWASP - prevención de CSRF": "https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html",
    "WHATWG - Fetch y CORS": "https://fetch.spec.whatwg.org/#cors-protocol",
    "OWASP - prevención de inyección SQL": "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html",
    "PostgreSQL - restricciones": "https://www.postgresql.org/docs/current/ddl-constraints.html",
    "PostgreSQL - consultas": "https://www.postgresql.org/docs/current/queries.html",
    "PostgreSQL - transacciones": "https://www.postgresql.org/docs/current/tutorial-transactions.html",
    "OWASP - gestión de secretos": "https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html",
    "OWASP - errores en API REST": "https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html",
    "OWASP - registro seguro": "https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html",
    "Node.js - test runner": "https://nodejs.org/api/test.html",
}

TOPICS = [
    {
        "title": "La conversación HTTP",
        "objective": "Describir una petición y una respuesta HTTP, e identificar qué parte pertenece al protocolo y cuál al contrato de la aplicación.",
        "points": [
            "Una petición contiene método, destino, cabeceras y, cuando corresponde, contenido.",
            "Una respuesta contiene código de estado, cabeceras y, salvo casos definidos, una representación.",
            "HTTP define semántica para los mensajes; la API define los recursos y datos concretos que intercambia.",
        ],
        "practice": "Dibuja el intercambio para consultar un curso y para crear una matrícula. Anota método, ruta, cabeceras relevantes, cuerpo y respuesta esperada.",
        "check": "Otra persona puede reconstruir ambos intercambios y distinguir petición, respuesta y reglas propias de la aplicación.",
        "sources": ["RFC 9110 - Semántica HTTP", "Node.js - módulo HTTP"],
    },
    {
        "title": "Métodos: semántica e idempotencia",
        "objective": "Elegir un método según el efecto solicitado y razonar sobre reintentos seguros.",
        "points": [
            "GET recupera una representación y debe ser seguro: no se diseña para cambiar el estado solicitado.",
            "POST solicita procesar el contenido; PUT crea o reemplaza el estado del recurso objetivo; PATCH aplica cambios parciales.",
            "PUT y DELETE son idempotentes en su efecto previsto: repetir la petición no acumula ese efecto, aunque las respuestas o los registros puedan variar.",
        ],
        "practice": "Diseña operaciones para crear una matrícula, cambiar su estado y eliminarla. Simula dos envíos idénticos de PUT y anota el estado final.",
        "check": "Puedes explicar por qué un método encaja con cada operación y cuándo un cliente puede repetir una petición tras un fallo de red.",
        "sources": ["RFC 9110 - Semántica HTTP", "RFC 5789 - método PATCH"],
    },
    {
        "title": "Códigos de estado y cabeceras",
        "objective": "Comunicar el resultado de una operación con un código y las cabeceras que el cliente necesita.",
        "points": [
            "2xx indica éxito; 4xx señala un problema de petición o acceso; 5xx señala que el servidor no pudo completar una petición aparentemente válida.",
            "201 Created confirma la creación; identifica el recurso primario mediante Location si está presente, o mediante la URI objetivo si no se envía esa cabecera. 204 No Content no incluye una representación.",
            "405 Method Not Allowed requiere Allow. Distingue 401 (falta autenticación válida) de 403 (operación no permitida) y usa 404 para un recurso ausente según el contrato.",
            "429 puede comunicar que se alcanzó un límite; documenta cómo reintentar, por ejemplo respetando Retry-After si se devuelve.",
        ],
        "practice": "Completa una tabla para creación, lectura, dato inválido, falta de sesión, recurso inexistente, conflicto y exceso de solicitudes. Añade Location o Allow donde aplique.",
        "check": "Cada caso tiene un resultado coherente con HTTP y el cliente puede decidir qué hacer sin interpretar texto ambiguo.",
        "sources": ["RFC 9110 - Semántica HTTP", "RFC 6585 - 429 Too Many Requests", "OWASP API4:2023 - consumo de recursos"],
    },
    {
        "title": "Recursos, rutas y contrato de API",
        "objective": "Diseñar rutas centradas en recursos y describir operaciones de forma consistente.",
        "points": [
            "Usa identificadores estables y rutas comprensibles, por ejemplo /api/cursos/{cursoId}/matriculas.",
            "El método expresa la operación; evita codificar cambios de estado dentro de un GET.",
            "OpenAPI puede describir rutas, operaciones, parámetros, cuerpos, respuestas y esquemas para que personas y herramientas compartan el contrato.",
        ],
        "practice": "Define las rutas para consultar cursos, recuperar uno por ID, matricular a una persona y cancelar la matrícula. Especifica parámetros y respuestas.",
        "check": "Dos clientes pueden implementar la API a partir de la descripción sin adivinar nombres, formatos o códigos.",
        "sources": ["OpenAPI Specification 3.1.0", "RFC 9110 - Semántica HTTP"],
    },
    {
        "title": "JSON, esquemas y validación",
        "objective": "Definir entradas explícitas y rechazarlas en el servidor cuando incumplen el contrato.",
        "points": [
            "Valida tipos, campos requeridos, rangos numéricos, formatos, opciones permitidas y límites de longitud.",
            "Valida también cantidad de elementos y estructura de objetos anidados; un formulario del navegador no es una barrera de seguridad.",
            "Limita el tamaño del cuerpo antes de procesarlo. Un esquema OpenAPI ayuda a expresar la forma válida, pero el servidor debe aplicarla.",
        ],
        "practice": "Escribe el esquema de una matrícula con cursoId, email y fecha. Añade ejemplos válidos, vacíos, de tipo incorrecto y fuera de rango.",
        "check": "Los casos inválidos se rechazan antes de modificar datos y los mensajes identifican el campo sin devolver información interna.",
        "sources": ["OWASP - validación de entradas", "OpenAPI Specification 3.1.0"],
    },
    {
        "title": "Node.js: rutas y ciclo de una petición",
        "objective": "Relacionar el flujo de una ruta con las interfaces HTTP de bajo nivel de Node.js.",
        "points": [
            "node:http expone objetos IncomingMessage y ServerResponse; permite trabajar con cabeceras y flujos.",
            "El módulo HTTP no interpreta por sí mismo el contrato JSON de la aplicación: el servidor debe leer y validar el cuerpo.",
            "Separa resolución de ruta, validación, lógica de negocio, acceso a datos y construcción de respuesta. Mantén acotado el trabajo síncrono.",
        ],
        "practice": "Implementa GET /api/cursos y POST /api/cursos en un servidor de práctica. Rechaza cuerpos demasiado grandes y envía una sola respuesta por petición.",
        "check": "La ruta distingue método y destino, maneja errores de lectura y no bloquea el proceso con trabajo síncrono innecesario.",
        "sources": ["Node.js - módulo HTTP", "Node.js - trabajo asíncrono"],
    },
    {
        "title": "Errores, registros y diagnóstico",
        "objective": "Dar al cliente un error útil y mantener detalles internos en los registros controlados del servidor.",
        "points": [
            "Usa una forma estable para errores, por ejemplo código legible, mensaje breve e identificador de solicitud.",
            "No devuelvas trazas, consultas, rutas del sistema, credenciales ni detalles de implementación al cliente.",
            "Registra contexto suficiente para diagnosticar, con cuidado de no guardar contraseñas, tokens ni cuerpos sensibles.",
        ],
        "practice": "Diseña respuestas para JSON mal formado, error de validación y fallo interno. Comprueba qué ve el cliente y qué información útil conserva el registro.",
        "check": "El cliente recibe una respuesta consistente y el registro permite investigar sin exponer secretos o datos que no hacen falta.",
        "sources": ["OWASP - errores en API REST", "OWASP - registro seguro", "Node.js - módulo HTTP"],
    },
    {
        "title": "Autenticación, autorización y sesiones",
        "objective": "Separar la identidad de la persona de sus permisos sobre una operación y un recurso concretos.",
        "points": [
            "Autenticación valida quién presenta la sesión; autorización decide qué acción puede realizar sobre cada objeto.",
            "Aplica la comprobación de acceso en el servidor para cada recurso indicado por un ID; no confíes en IDs, roles o permisos enviados por el cliente.",
            "Define caducidad de sesión en el servidor y configura cookies de sesión con atributos apropiados, como HttpOnly, Secure bajo HTTPS y SameSite.",
        ],
        "practice": "Crea dos cuentas y dos matrículas. Prueba si la cuenta A puede leer, cambiar o borrar la matrícula de B alterando el ID.",
        "check": "Cada intento sobre un objeto ajeno se rechaza y una sesión vencida deja de autorizar aunque el navegador conserve una copia de la cookie.",
        "sources": ["OWASP API1:2023 - autorización por objeto", "OWASP - gestión de sesiones"],
    },
    {
        "title": "CORS y CSRF",
        "objective": "Explicar dos controles distintos del navegador para que no se confundan con la autenticación de una API.",
        "points": [
            "CORS regula si un navegador permite que una página de otro origen lea una respuesta; no concede permisos de negocio.",
            "Las peticiones no simples pueden activar una comprobación previa OPTIONS; para solicitudes con credenciales, el servidor debe permitir explícitamente el origen.",
            "CSRF intenta inducir al navegador autenticado a enviar una acción no deseada. Usa una defensa adecuada, como token o validación de origen; SameSite es defensa en profundidad.",
        ],
        "practice": "Dibuja una petición same-origin y otra cross-origin con cookie. Marca qué valida CORS, qué valida CSRF y qué permiso sigue comprobando el servidor.",
        "check": "Puedes mostrar un caso donde CORS bloquea la lectura pero no sustituye la autorización ni una defensa CSRF.",
        "sources": ["WHATWG - Fetch y CORS", "OWASP - prevención de CSRF"],
    },
    {
        "title": "SQL injection y acceso a datos",
        "objective": "Mantener los datos de usuario fuera de la sintaxis SQL y limitar el alcance de cada consulta.",
        "points": [
            "Usa consultas parametrizadas para los valores. No unas texto recibido del cliente dentro de la consulta.",
            "Si una parte estructural no admite parámetros, como una columna de ORDER BY, elige entre opciones fijas permitidas por la aplicación.",
            "Concede a la cuenta de base de datos los permisos mínimos que necesita y valida los permisos del usuario antes de consultar o cambiar un objeto.",
        ],
        "practice": "Implementa una búsqueda por nombre con parámetros. Prueba comillas y caracteres SQL como datos literales, y revisa que no cambien la consulta.",
        "check": "Los valores externos siempre llegan como datos enlazados y el usuario de la aplicación no tiene permisos innecesarios.",
        "sources": ["OWASP - prevención de inyección SQL", "PostgreSQL - consultas", "OWASP API1:2023 - autorización por objeto"],
    },
    {
        "title": "Modelo de datos e integridad",
        "objective": "Expresar reglas de consistencia en el esquema de la base de datos además de validarlas en la aplicación.",
        "points": [
            "Una clave primaria identifica filas; una clave foránea representa una relación y puede impedir referencias inexistentes.",
            "NOT NULL, UNIQUE y CHECK expresan reglas diferentes: presencia, unicidad y una condición sobre valores.",
            "Las restricciones de la base protegen la integridad frente a rutas, importaciones o procesos distintos que escriban los mismos datos.",
        ],
        "practice": "Modela alumno, curso y matrícula. Impide duplicar una pareja alumno-curso y crea una clave foránea para cada relación.",
        "check": "La base rechaza una matrícula repetida o una referencia a un alumno inexistente, incluso si se omite la validación de interfaz.",
        "sources": ["PostgreSQL - restricciones"],
    },
    {
        "title": "Transacciones y consistencia",
        "objective": "Agrupar escrituras relacionadas cuando el sistema debe aplicar todas o ninguna.",
        "points": [
            "Una transacción delimita una unidad de trabajo: confirma con COMMIT o descarta con ROLLBACK.",
            "Usa transacciones cuando un caso de negocio modifica varias filas que deben quedar coherentes entre sí.",
            "Mantén el alcance claro y breve; maneja errores y define qué respuesta recibe el cliente si la operación no se confirma.",
        ],
        "practice": "Implementa la matrícula que inserta una relación y actualiza un contador. Fuerza un error en la segunda escritura y comprueba que no quede un estado parcial.",
        "check": "Tras éxito aparecen todos los cambios; tras fallo no queda ninguno de los cambios que pertenecen a la unidad.",
        "sources": ["PostgreSQL - transacciones"],
    },
    {
        "title": "Límites, paginación y frecuencia",
        "objective": "Acotar trabajo, memoria y coste que una petición puede exigir al servicio.",
        "points": [
            "Define máximos para cuerpo, cadenas, arrays, tamaño de página y operaciones por solicitud.",
            "Usa paginación y límites del lado del servidor; no permitas que un parámetro controle un conjunto sin tope.",
            "Aplica límites de frecuencia y tiempos máximos acordes con el endpoint; comunica el límite alcanzado con una respuesta clara.",
        ],
        "practice": "Define límites para GET /api/cursos y POST /api/cursos/importar. Prueba una página grande, un array largo y solicitudes repetidas.",
        "check": "Cada límite se valida en servidor, se prueba en sus bordes y no depende de que el cliente use la interfaz oficial.",
        "sources": ["OWASP API4:2023 - consumo de recursos", "OWASP - validación de entradas"],
    },
    {
        "title": "Configuración y secretos",
        "objective": "Separar configuración y credenciales del código y reducir quién puede leerlas o usarlas.",
        "points": [
            "No incluyas claves de API, contraseñas o claves de firma en el repositorio, el JavaScript del navegador ni registros.",
            "Entrega secretos mediante el mecanismo aprobado para el entorno; limita su alcance, revisa acceso, y define cómo revocarlos o rotarlos.",
            "Si una credencial se expone, considera que ya no es secreta: revócala o rótala y revisa dónde se copió.",
        ],
        "practice": "Mueve una credencial ficticia fuera del código, agrega una plantilla sin valores secretos y documenta quién puede acceder y cómo se rota.",
        "check": "El repositorio contiene nombres de variables y pasos de configuración, pero ninguna credencial utilizable.",
        "sources": ["OWASP - gestión de secretos"],
    },
    {
        "title": "Pruebas, contrato y proyecto integrador",
        "objective": "Comprobar el comportamiento observable de una API y entregar un contrato que otro cliente pueda seguir.",
        "points": [
            "Combina pruebas del caso normal con límites, entradas inválidas, permisos, IDs ajenos, conflictos y fallos de persistencia.",
            "En Node.js, node:test ofrece un ejecutor integrado; prueba la API mediante sus peticiones y respuestas observables.",
            "Mantén la descripción OpenAPI alineada con rutas, parámetros, esquemas y códigos que el servidor realmente implementa.",
        ],
        "practice": "Proyecto: API de cursos con CRUD, validación, base relacional, autorización por objeto, límites y errores consistentes. Entrega especificación OpenAPI y una suite de pruebas.",
        "check": "Las pruebas cubren éxito, error y abuso razonable; una persona ajena al código puede ejecutar el contrato y entender cada resultado.",
        "sources": ["Node.js - test runner", "OpenAPI Specification 3.1.0", "RFC 9110 - Semántica HTTP"],
    },
]

STYLES = {
    "eyebrow": ParagraphStyle("eyebrow", fontName="Helvetica-Bold", fontSize=9, leading=12, textColor=TEAL, spaceAfter=5),
    "cover_title": ParagraphStyle("cover_title", fontName="Helvetica-Bold", fontSize=30, leading=35, textColor=NAVY, spaceAfter=8),
    "cover_sub": ParagraphStyle("cover_sub", fontName="Helvetica", fontSize=13, leading=19, textColor=MUTED, spaceAfter=11),
    "h1": ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=22, leading=27, textColor=NAVY, spaceAfter=12),
    "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=TEAL, spaceBefore=7, spaceAfter=5),
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=10.2, leading=14.2, textColor=INK, spaceAfter=5),
    "bullet": ParagraphStyle("bullet", fontName="Helvetica", fontSize=9.8, leading=13.8, textColor=INK, leftIndent=11, firstLineIndent=-9, spaceAfter=4),
    "small": ParagraphStyle("small", fontName="Helvetica", fontSize=8.6, leading=11.2, textColor=MUTED, spaceAfter=3),
    "source": ParagraphStyle("source", fontName="Helvetica", fontSize=8.2, leading=11, textColor=VIOLET, spaceAfter=2),
    "label": ParagraphStyle("label", fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=TEAL, uppercase=True),
}


def para(text, style="body"):
    return Paragraph(text, STYLES[style])


def source_paragraph(name):
    url = SOURCES[name]
    label = escape(name)
    return para(f'<link href="{escape(url)}" color="#6651A5"><u>{label}</u></link>', "source")


def callout(label, text, background=PALE):
    tbl = Table([[para(escape(label.upper()), "label"), para(escape(text), "body")]], colWidths=[34 * mm, 130 * mm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), background),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return tbl


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.6)
    canvas.line(19 * mm, height - 17 * mm, width - 19 * mm, height - 17 * mm)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.setFillColor(NAVY)
    canvas.drawString(19 * mm, height - 13 * mm, "CÓDIGOCLARO  /  RUTA BACKEND Y APIs")
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(width - 19 * mm, 12 * mm, f"15 temas  ·  {doc.page}")
    canvas.restoreState()


def build_story():
    story = [Spacer(1, 26 * mm), para("RUTA FORMATIVA · DESARROLLO BACKEND", "eyebrow"),
             para("Backend y APIs", "cover_title"),
             para("15 temas para diseñar, implementar y comprobar servicios HTTP", "cover_sub"),
             Spacer(1, 4 * mm),
             callout("Propósito", "Avanzar desde los fundamentos HTTP hasta una API con contrato, controles de seguridad, persistencia y pruebas.", LILAC),
             Spacer(1, 10 * mm), para("Recorrido", "h2")]
    stages = [
        ("01-04  Fundamentos", "Mensajes HTTP, métodos, estados y diseño de recursos."),
        ("05-07  Implementación", "Validación, rutas Node.js, errores y diagnóstico."),
        ("08-14  Datos y seguridad", "Sesiones, CORS/CSRF, SQL, integridad, transacciones, límites y secretos."),
        ("15  Entrega", "Pruebas de API, contrato OpenAPI y proyecto integrador."),
    ]
    for title, desc in stages:
        story.append(KeepTogether([para(escape(title), "h2"), para(escape(desc), "body")]))
    story += [Spacer(1, 8 * mm), para("Cómo estudiar cada tema", "h2"),
              para("Lee el objetivo, contrasta los conceptos en las fuentes enlazadas y realiza la práctica. Usa el criterio de comprobación para explicar qué funciona y qué caso límite falta. Los estándares definen el protocolo; OWASP mantiene guías de seguridad, y cada organismo o proyecto documenta sus herramientas. Comprueba la versión y el contexto antes de aplicar una recomendación.", "body"),
              para("Las recomendaciones de seguridad dependen del contexto del sistema. Esta ruta enseña controles verificables; no fija valores universales de producción.", "small")]
    for index, topic in enumerate(TOPICS, 1):
        story.extend([para(f"TEMA {index:02d}  /  15", "eyebrow"), para(escape(topic["title"]), "h1"),
                      callout("Al terminar", topic["objective"]), Spacer(1, 5 * mm),
                      para("Conceptos clave", "h2")])
        for point in topic["points"]:
            story.append(para("-  " + escape(point), "bullet"))
        story += [Spacer(1, 2 * mm), callout("Práctica", topic["practice"], LILAC),
                  Spacer(1, 4 * mm), callout("Comprueba", topic["check"], PALE),
                  Spacer(1, 5 * mm), para("Fuentes fiables", "h2")]
        for source in topic["sources"]:
            story.append(source_paragraph(source))
    story += [para("Referencias de la ruta", "h1"),
              para("Las fuentes de cada tema enlazan a la sección más relevante. Consulta la versión indicada por el organismo cuando cambie el runtime o la norma.", "body"), Spacer(1, 3 * mm)]
    for name, url in SOURCES.items():
        story.append(para(f'<link href="{escape(url)}" color="#6651A5"><u>{escape(name)}</u></link>', "source"))
    return story


def write_pdf(output):
    output.parent.mkdir(parents=True, exist_ok=True)
    page_width, page_height = A4
    doc = BaseDocTemplate(str(output), pagesize=A4, leftMargin=23 * mm, rightMargin=23 * mm,
                          topMargin=25 * mm, bottomMargin=22 * mm,
                          title="Ruta Backend y APIs - 15 temas", author="CódigoClaro",
                          subject="Ruta de aprendizaje con referencias oficiales")
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
