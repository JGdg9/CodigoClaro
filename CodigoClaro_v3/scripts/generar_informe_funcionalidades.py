from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "docs" / "INFORME_CAMBIOS_Y_FUNCIONALIDADES.pdf"
FONT_REGULAR = Path(r"C:\Windows\Fonts\arial.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\arialbd.ttf")

INK = colors.HexColor("#172b36")
MUTED = colors.HexColor("#5d7077")
TEAL = colors.HexColor("#0d766e")
TEAL_PALE = colors.HexColor("#e2f0ec")
CREAM = colors.HexColor("#f7f4ed")
PAPER = colors.white
LINE = colors.HexColor("#d8ded9")


def register_fonts():
    if FONT_REGULAR.exists() and FONT_BOLD.exists():
        pdfmetrics.registerFont(TTFont("CCArial", str(FONT_REGULAR)))
        pdfmetrics.registerFont(TTFont("CCArial-Bold", str(FONT_BOLD)))
        return "CCArial", "CCArial-Bold"
    return "Helvetica", "Helvetica-Bold"


BODY_FONT, BOLD_FONT = register_fonts()


def build_styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "CCTitle", parent=base["Title"], fontName=BOLD_FONT,
            fontSize=31, leading=36, textColor=INK, alignment=TA_LEFT,
            spaceAfter=8,
        ),
        "subtitle": ParagraphStyle(
            "CCSubtitle", parent=base["Normal"], fontName=BODY_FONT,
            fontSize=14, leading=20, textColor=MUTED, spaceAfter=15,
        ),
        "section": ParagraphStyle(
            "CCSection", parent=base["Heading1"], fontName=BOLD_FONT,
            fontSize=20, leading=25, textColor=INK, spaceBefore=1,
            spaceAfter=10, keepWithNext=True,
        ),
        "subsection": ParagraphStyle(
            "CCSubsection", parent=base["Heading2"], fontName=BOLD_FONT,
            fontSize=11.3, leading=15, textColor=TEAL, spaceBefore=8,
            spaceAfter=4, keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "CCBody", parent=base["BodyText"], fontName=BODY_FONT,
            fontSize=9.2, leading=13, textColor=INK, spaceAfter=5,
        ),
        "small": ParagraphStyle(
            "CCSmall", parent=base["BodyText"], fontName=BODY_FONT,
            fontSize=8.1, leading=11.2, textColor=MUTED, spaceAfter=3,
        ),
        "bullet": ParagraphStyle(
            "CCBullet", parent=base["BodyText"], fontName=BODY_FONT,
            fontSize=9, leading=12.4, textColor=INK, leftIndent=11,
            firstLineIndent=-8, bulletIndent=0, spaceAfter=3,
        ),
        "metric_value": ParagraphStyle(
            "CCMetricValue", parent=base["Normal"], fontName=BOLD_FONT,
            fontSize=22, leading=25, textColor=TEAL, alignment=TA_CENTER,
        ),
        "metric_label": ParagraphStyle(
            "CCMetricLabel", parent=base["Normal"], fontName=BODY_FONT,
            fontSize=8.2, leading=11, textColor=MUTED, alignment=TA_CENTER,
        ),
        "table_head": ParagraphStyle(
            "CCTableHead", parent=base["Normal"], fontName=BOLD_FONT,
            fontSize=8.6, leading=11, textColor=TEAL,
        ),
        "table_body": ParagraphStyle(
            "CCTableBody", parent=base["Normal"], fontName=BODY_FONT,
            fontSize=8.35, leading=11, textColor=INK,
        ),
        "table_label": ParagraphStyle(
            "CCTableLabel", parent=base["Normal"], fontName=BOLD_FONT,
            fontSize=8.5, leading=11, textColor=INK,
        ),
        "callout": ParagraphStyle(
            "CCCallout", parent=base["BodyText"], fontName=BODY_FONT,
            fontSize=9, leading=13, textColor=INK, spaceAfter=0,
        ),
        "cover_tag": ParagraphStyle(
            "CCCoverTag", parent=base["Normal"], fontName=BOLD_FONT,
            fontSize=8.5, leading=12, textColor=TEAL, alignment=TA_LEFT,
        ),
    }


def page_chrome(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(CREAM)
    canvas.rect(0, 0, width, height, fill=1, stroke=0)
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.65)
    canvas.line(17 * mm, height - 17 * mm, width - 17 * mm, height - 17 * mm)
    canvas.setFont(BOLD_FONT, 7.4)
    canvas.setFillColor(TEAL)
    canvas.drawString(17 * mm, height - 13 * mm, "CÓDIGOCLARO  /  INFORME DE PRODUCTO")
    canvas.setStrokeColor(LINE)
    canvas.line(17 * mm, 14 * mm, width - 17 * mm, 14 * mm)
    canvas.setFont(BODY_FONT, 7.4)
    canvas.setFillColor(MUTED)
    canvas.drawString(17 * mm, 9.5 * mm, "Rama codex/impeccable-style-pass")
    canvas.drawRightString(width - 17 * mm, 9.5 * mm, f"{doc.page}")
    canvas.restoreState()


def bullet(text, styles):
    return Paragraph(f"• {text}", styles["bullet"])


def metric(value, label, styles):
    return [Paragraph(value, styles["metric_value"]), Paragraph(label, styles["metric_label"])]


def feature_table(rows, styles, widths):
    data = []
    for label, detail in rows:
        data.append([
            Paragraph(label, styles["table_label"]),
            Paragraph(detail, styles["table_body"]),
        ])
    table = Table(data, colWidths=widths, hAlign="LEFT", repeatRows=0)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), TEAL_PALE),
        ("BACKGROUND", (1, 0), (1, -1), PAPER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LINEBELOW", (0, 0), (-1, -1), 0.45, LINE),
        ("BOX", (0, 0), (-1, -1), 0.55, LINE),
    ]))
    return table


def make_story(styles):
    story = []
    story.extend([
        Spacer(1, 17 * mm),
        Paragraph("INFORME DE CAMBIOS", styles["cover_tag"]),
        Spacer(1, 4 * mm),
        Paragraph("CódigoClaro", styles["title"]),
        Paragraph("Cambios recientes y funcionalidades de la aplicación", styles["subtitle"]),
    ])

    intro = Table([[
        Paragraph(
            "Esta edición resume cambios de seguridad y confianza en el IDE Java, el banco de preguntas y los temarios. Describe las funciones de CódigoClaro y las comprobaciones realizadas en la copia local de esta rama.",
            styles["callout"],
        )
    ]], colWidths=[174 * mm])
    intro.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PAPER),
        ("BOX", (0, 0), (-1, -1), 0.7, LINE),
        ("LINEBEFORE", (0, 0), (0, -1), 3, TEAL),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.extend([intro, Spacer(1, 7 * mm)])

    metrics = Table([
        [metric("113", "pruebas automatizadas", styles), metric("108", "aprobadas", styles)],
        [metric("20+", "preguntas únicas por filtro", styles), metric("75", "temarios individuales", styles)],
    ], colWidths=[87 * mm, 87 * mm], rowHeights=[25 * mm, 25 * mm])
    metrics.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PAPER),
        ("BOX", (0, 0), (-1, -1), 0.7, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.45, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.extend([metrics, Spacer(1, 7 * mm), Paragraph("Cambios de esta rama", styles["section"])])
    for item in [
        "El aula ofrece al menos 20 preguntas distintas en cada uno de sus 19 filtros individuales. El banco generado coincide con las fuentes y las preguntas conservan opciones, respuesta válida y explicación.",
        "La ejecución Java remota usa un endpoint HTTPS y exige consentimiento por sesión antes de enviar código y entrada estándar. El botón de comprobación no envía código, cancela intentos anteriores y termina tras 10 segundos; si se ha escrito, transmite el token opcional con la solicitud. Cambiar endpoint o token cancela peticiones; el token no se guarda.",
        "Las 75 guías individuales se regeneraron con explicaciones, ejemplos, práctica y referencias primarias. Los catálogos de public y docs reflejan el número real de páginas y sus copias coinciden.",
        "La portada presenta el aviso de cuenta piloto durante el registro, asociado al formulario. Los errores de API ocultan rutas técnicas y el texto de navegación tiene más contraste. En producción, el registro nuevo queda cerrado hasta completar la información de privacidad; el cierre no afecta a la ruta de login, que requiere que el servicio esté disponible. Ambos backends limitan intentos con contadores por proceso y capacidad acotada. CF-Connecting-IP solo se confía si TRUST_CF_CONNECTING_IP=true; los blueprints de Render lo activan para su proxy Cloudflare. La capacidad llena rechaza claves nuevas hasta que caduquen entradas; los contadores no se comparten entre instancias ni sobreviven a reinicios. PostgreSQL también rechaza el secreto de ejemplo.",
        "El healthcheck SQLite consulta la base. La carga de salud y catálogo no bloquea la restauración de sesión; PostgreSQL renueva la caducidad y la cookie de las sesiones activas.",
    ]:
        story.append(bullet(item, styles))
    story.extend([
        Spacer(1, 3 * mm),
        Paragraph("Rama revisada: codex/impeccable-style-pass · cambios locales sin publicar", styles["small"]),
        Paragraph("Fecha del informe: 28 de octubre de 2026", styles["small"]),
    ])

    story.append(Paragraph("Qué ofrece CódigoClaro", styles["section"]))
    rows = [
        ("Temarios y catálogo", "75 temarios individuales para Java, JavaScript, Python, Kotlin y React, con 10 secciones por tema. El catálogo muestra títulos, enlaces y número real de páginas; también hay rutas complementarias."),
        ("Tests y simulacros", "Selección múltiple, verdadero/falso, examen mixto y retos de código corregidos mediante rúbrica. Hay filtros por tecnología, modos agrupados y explicaciones para revisar respuestas."),
        ("Prácticas", "Ejercicios guiados con plantillas, pistas y soluciones. Se puede guardar el progreso local del aula y completar actividades asociadas al aprendizaje."),
        ("IDE de aprendizaje", "Editor local para practicar. JavaScript se ejecuta en un iframe aislado; Python usa Pyodide; SQL practica sobre SQLite; React ofrece vista previa; MongoDB y Firestore usan simuladores didácticos; Java puede usar Judge0 con consentimiento. Kotlin y PL/SQL conservan análisis estático."),
        ("Estudio y seguimiento", "Espacio de estudio con tareas, temporizador, filtros, importación/exportación y resumen de sesiones. El panel presenta cursos, progreso, resultados y estadísticas por tecnología."),
        ("Cuentas y administración", "Registro e inicio de sesión permiten sincronizar datos de aprendizaje admitidos por el servidor. El panel administrativo gestiona temarios y preguntas con validación y controles de acceso."),
        ("Datos y despliegue", "SQLite es la opción local. PostgreSQL está disponible como backend separado para producción. GitHub Actions valida cambios y Render aloja el servicio configurado."),
    ]
    story.append(feature_table(rows, styles, [39 * mm, 135 * mm]))
    story.extend([
        Spacer(1, 5 * mm),
        Paragraph("Cambios del IDE Java", styles["subsection"]),
        Paragraph(
            "La compilación remota no se activa por defecto. La casilla de consentimiento se limita al endpoint HTTPS elegido y el token opcional permanece solo en el campo de la página. La comprobación de conexión termina tras 10 segundos y no permite que una respuesta anterior sobrescriba la más reciente. Si el servicio rechaza la ejecución o no responde en 30 segundos, el aula cancela el flujo y muestra el error; también depende de la disponibilidad y límites del endpoint.",
            styles["body"],
        ),
    ])

    story.append(Paragraph("Verificación y estado de publicación", styles["section"]))
    story.append(feature_table([
        ("Pruebas automatizadas", "Local: npm test contabiliza 113; 108 aprobadas, 0 fallidas y 5 integraciones PostgreSQL omitidas por falta de base. CI configura PostgreSQL 16 efímera para ejecutar esas cinco; el resultado de esta rama está pendiente."),
        ("Cobertura de cuestionarios", "Se comprueban preguntas únicas por tecnología, opciones distintas, índices de respuesta válidos, explicaciones y que el banco estático generado coincida con sus fuentes."),
        ("Verificador de entrega", "Superado. Comprueba los 75 temas, la paginación declarada, 90 PDF en public/temarios, los recursos, los enlaces locales, la sintaxis y la suite automatizada."),
        ("PDF y catálogos", "Se comprobó que las 75 copias en public/temarios coinciden con docs/temarios y que cada PDF concuerda con el número de páginas del catálogo."),
        ("Estado de publicación", "Esta rama contiene cambios locales sin publicar. No se creó un commit ni un PR desde esta copia y no se cambió main ni producción. La demo pública existente en main es independiente."),
        ("Límites de verificación", "La prueba del IDE Java usa un servicio simulado; no se envió código real a Judge0. No se conectó a Neon ni a PostgreSQL real y no se probaron los motores externos/CDN en un navegador real. La política de privacidad aún necesita identidad y contacto del responsable. El registro está cerrado en producción hasta completar esos datos y revisar la información del piloto antes de invitar a participantes externos."),
    ], styles, [39 * mm, 135 * mm]))
    return story


def generate():
    DEST.parent.mkdir(parents=True, exist_ok=True)
    page_width, page_height = A4
    doc = BaseDocTemplate(
        str(DEST), pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=24 * mm, bottomMargin=20 * mm,
        title="CódigoClaro - Informe de cambios y funcionalidades",
        author="CódigoClaro",
        subject="Mejoras de cuestionarios, IDE Java y temarios PDF",
    )
    frame = Frame(
        doc.leftMargin, doc.bottomMargin,
        page_width - doc.leftMargin - doc.rightMargin,
        page_height - doc.topMargin - doc.bottomMargin,
        id="main", leftPadding=0, rightPadding=0,
        topPadding=0, bottomPadding=0,
    )
    doc.addPageTemplates([PageTemplate(id="cc", frames=[frame], onPage=page_chrome)])
    doc.build(make_story(build_styles()))
    return DEST


if __name__ == "__main__":
    print(generate())
