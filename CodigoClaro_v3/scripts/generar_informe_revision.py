#!/usr/bin/env python3
"""Build the review report from the current branch's verified scope."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from xml.sax.saxutils import escape


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "INFORME_CAMBIOS_Y_FUNCIONALIDADES.pdf"
INK = colors.HexColor("#17243A")
MUTED = colors.HexColor("#58677D")
TEAL = colors.HexColor("#087E8B")
LINE = colors.HexColor("#D9E1EB")
PALE = colors.HexColor("#F3F6FA")

FONT = "Helvetica"
BOLD = "Helvetica-Bold"
for regular, bold in (
    (Path("C:/Windows/Fonts/arial.ttf"), Path("C:/Windows/Fonts/arialbd.ttf")),
    (
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ),
):
    if regular.is_file() and bold.is_file():
        pdfmetrics.registerFont(TTFont("CCReport", str(regular)))
        pdfmetrics.registerFont(TTFont("CCReport-Bold", str(bold)))
        FONT, BOLD = "CCReport", "CCReport-Bold"
        break

styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        "ReportEyebrow", fontName=BOLD, fontSize=8, leading=10,
        textColor=TEAL, spaceAfter=4,
    )
)
styles.add(
    ParagraphStyle(
        "ReportTitle", fontName=BOLD, fontSize=26, leading=30,
        textColor=INK, spaceAfter=4,
    )
)
styles.add(
    ParagraphStyle(
        "ReportSubtitle", fontName=FONT, fontSize=10, leading=14,
        textColor=MUTED, spaceAfter=12,
    )
)
styles.add(
    ParagraphStyle(
        "ReportH1", fontName=BOLD, fontSize=15, leading=18,
        textColor=INK, spaceBefore=8, spaceAfter=4, keepWithNext=True,
    )
)
styles.add(
    ParagraphStyle(
        "ReportH2", fontName=BOLD, fontSize=10, leading=12,
        textColor=TEAL, spaceBefore=5, spaceAfter=2, keepWithNext=True,
    )
)
styles.add(
    ParagraphStyle(
        "ReportBody", fontName=FONT, fontSize=9, leading=12,
        textColor=INK, spaceAfter=5, alignment=TA_LEFT,
    )
)
styles.add(
    ParagraphStyle(
        "ReportSmall", fontName=FONT, fontSize=8, leading=10,
        textColor=MUTED, spaceAfter=3,
    )
)
styles.add(
    ParagraphStyle(
        "ReportCell", fontName=FONT, fontSize=8, leading=10,
        textColor=INK, spaceAfter=0,
    )
)
styles.add(
    ParagraphStyle(
        "ReportCellHead", fontName=BOLD, fontSize=8, leading=10,
        textColor=INK, spaceAfter=0,
    )
)


def para(text, style="ReportBody"):
    return Paragraph(escape(text), styles[style])


def bullet(text):
    return Paragraph("• " + escape(text), styles["ReportBody"])


def footer(canvas, doc):
    canvas.saveState()
    width, _ = A4
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.6)
    canvas.line(18 * mm, 13 * mm, width - 18 * mm, 13 * mm)
    canvas.setFont(FONT, 7)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 8.5 * mm, "CódigoClaro · revisión de la rama candidata")
    canvas.drawRightString(width - 18 * mm, 8.5 * mm, f"Página {doc.page}")
    canvas.restoreState()


def build_report():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=16 * mm, bottomMargin=19 * mm,
        title="CódigoClaro · Cambios y funcionalidades",
        author="CódigoClaro",
        subject="Alcance y verificación de la rama candidata",
    )

    story = [
        para("CÓDIGOCLARO", "ReportEyebrow"),
        para("Cambios y funcionalidades", "ReportTitle"),
        para("Versión candidata · 29 de octubre de 2026", "ReportSubtitle"),
        para("PROPÓSITO", "ReportH2"),
        para(
            "Apoyar a estudiantes de DAM y DAW con explicaciones breves, ejercicios prácticos "
            "y herramientas para comprobar su propio código."
        ),
        para("Qué incluye esta revisión", "ReportH1"),
        bullet(
            "Temarios: 75 guías PDF reconstruidas desde contenido estructurado. Incluyen "
            "explicación, ejemplo, resultado, errores frecuentes, ejercicio con casos, solución, "
            "alternativas y fuentes oficiales. El banco contiene 225 casos de práctica. "
            "72 guías ocupan una página y tres ocupan dos páginas con la práctica completa "
            "separada para evitar cortes de código."
        ),
        bullet(
            "Aula: conserva temarios, ejercicios, prácticas, tests, seguimiento y accesos al IDE. "
            "La portada concentra las tareas habituales y respeta la preferencia de movimiento reducido."
        ),
        bullet(
            "Corrección: algunos retos JavaScript ejecutan casos y aceptan algoritmos equivalentes. "
            "La biblioteca ejecuta tres consultas de solo lectura en una SQLite temporal. Las rúbricas "
            "estructurales se identifican como tales y no conceden XP de ejecución."
        ),
        bullet(
            "Ayuda: el asistente local busca términos en el material del curso y muestra fuentes; "
            "no genera respuestas con un modelo ni envía la consulta a un servicio externo."
        ),
        para("Cuenta y sesión", "ReportH1"),
        para(
            "El aula diferencia los errores de red y de respuesta de la API y solo confirma el cierre "
            "de sesión cuando el servidor lo confirma. El progreso sincronizado sigue la configuración "
            "actual del servidor. Esta rama no modifica el registro ni la base de datos de producción."
        ),
        para("ENTORNOS DE PROGRAMACIÓN", "ReportEyebrow"),
        para("El editor y sus motores", "ReportTitle"),
        para(
            "El IDE conserva plantillas, autoguardado local, carga y descarga de archivos, consejos "
            "y análisis estático. La ejecución disponible depende del lenguaje.",
            "ReportSubtitle",
        ),
    ]

    rows = [
        [para("Lenguaje", "ReportCellHead"), para("Comportamiento actual", "ReportCellHead")],
        [para("Java, Kotlin, Node.js y Python", "ReportCellHead"), para(
            "Compilación o ejecución remota opcional en un endpoint HTTPS compatible. Antes de "
            "ejecutar, la persona confirma el envío del código y de stdin. El servicio remoto puede "
            "registrar o limitar ejecuciones.", "ReportCell")],
        [para("JavaScript", "ReportCellHead"), para(
            "Ejecución local en un worker con límite de tiempo y de salida, sin acceso de red.", "ReportCell")],
        [para("HTML y CSS", "ReportCellHead"), para(
            "Vista previa local en un iframe aislado; se bloquean scripts, formularios, navegación "
            "y recursos externos.", "ReportCell")],
        [para("SQL", "ReportCellHead"), para(
            "Motor SQLite en el navegador, con base de ejemplo local. No sustituye a Oracle, MySQL "
            "ni PostgreSQL.", "ReportCell")],
        [para("MongoDB y Firestore", "ReportCellHead"), para(
            "Simuladores locales de operaciones básicas; no conectan con bases cloud.", "ReportCell")],
        [para("XML y XPath", "ReportCellHead"), para(
            "Validador de XML sin DTD externo y consultas XPath sobre datos de ejemplo fijos.", "ReportCell")],
        [para("React / JSX", "ReportCellHead"), para(
            "Vista previa estática del marcado inicial; no ejecuta componentes, eventos ni paquetes.", "ReportCell")],
        [para("PL/SQL", "ReportCellHead"), para(
            "Análisis estático. Para ejecutar procedimientos o triggers hace falta una base Oracle.", "ReportCell")],
    ]
    def make_table(table_rows):
        table = Table(table_rows, colWidths=[48 * mm, 126 * mm], repeatRows=1, hAlign="LEFT")
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), PALE),
                    ("GRID", (0, 0), (-1, -1), 0.5, LINE),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 7),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        return table

    first_table = make_table(rows[:5])
    second_table = make_table([rows[0], *rows[5:]])
    story.extend(
        [
            first_table,
            PageBreak(),
            para("ENTORNOS DE PROGRAMACIÓN · CONTINUACIÓN", "ReportEyebrow"),
            para("Otras herramientas y alcance", "ReportTitle"),
            second_table,
            Spacer(1, 7),
            para("Aislamiento de la ejecución local", "ReportH1"),
            para(
                "El evaluador JavaScript limita tiempo y salida. Los resultados del worker usan un "
                "canal privado separado de los mensajes del código evaluado. El corrector SQL rechaza "
                "escrituras, comentarios y funciones no permitidas, y limita tamaño, estructura y filas "
                "devueltas. SQLite aún se ejecuta de forma sincrónica en el hilo de la página; el límite "
                "de filas se comprueba después de ejecutar la consulta."
            ),
            para("COMPROBACIONES Y LÍMITES", "ReportEyebrow"),
            para("Estado de verificación", "ReportTitle"),
            para("Validaciones ejecutadas en esta rama", "ReportH1"),
            bullet(
                "npm test: 168 pruebas superadas, 0 fallidas y 5 pruebas de integración PostgreSQL "
                "omitidas localmente porque no hay una base de pruebas configurada."
            ),
            bullet(
                "Verificación de contenido: 75 temas, 225 casos de práctica y fuentes HTTPS válidas."
            ),
            bullet(
                "Verificador de entrega y comprobación de GitHub Pages: correctos; los 75 temas "
                "y sus PDF están disponibles."
            ),
            para("Pendiente de verificación o alcance", "ReportH1"),
            bullet(
                "Java, Kotlin, Node.js y Python dependen de un endpoint remoto configurado. Se "
                "comprobaron respuestas simuladas, no una compilación remota con un endpoint en vivo."
            ),
            bullet(
                "El IDE aún no ofrece un runtime local completo para todos los lenguajes; React muestra "
                "una vista previa estática y PL/SQL requiere Oracle para ejecutarse."
            ),
            bullet(
                "Una consulta SQL costosa puede bloquear la interfaz: todavía no existe aislamiento en "
                "un worker con un límite de ejecución efectivo."
            ),
            bullet(
                "La ayuda actual es una búsqueda local, no un chatbot generativo. La suscripción Premium "
                "y sus permisos de pago no forman parte de esta rama."
            ),
            bullet(
                "No se completó una revisión visual de toda la aplicación en un navegador. La información "
                "de privacidad sigue pendiente de revisión humana antes de publicar condiciones definitivas."
            ),
            para("ESTADO", "ReportH2"),
            para(
                "Este documento describe una rama candidata. No acredita que los cambios estén fusionados "
                "ni desplegados en producción."
            ),
        ]
    )

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(f"Informe generado: {OUTPUT} ({doc.page} páginas)")


if __name__ == "__main__":
    build_report()
