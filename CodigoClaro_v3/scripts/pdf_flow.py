"""Shared flowing layout for the long-form CódigoClaro learning routes."""

from html import escape
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, KeepTogether, PageBreak, Paragraph, Preformatted, SimpleDocTemplate, Spacer


INK = colors.HexColor("#17243A")
MUTED = colors.HexColor("#526477")
TEAL = colors.HexColor("#087E8B")
LINE = colors.HexColor("#D6E1E8")
PALE = colors.HexColor("#F1F6F8")

EYEBROW = ParagraphStyle(
    "CCFlowEyebrow", fontName="Helvetica-Bold", fontSize=8,
    leading=10, textColor=TEAL, spaceAfter=3,
)
TITLE = ParagraphStyle(
    "CCFlowTitle", fontName="Helvetica-Bold", fontSize=23,
    leading=27, textColor=INK, spaceAfter=5,
)
SUBTITLE = ParagraphStyle(
    "CCFlowSubtitle", fontName="Helvetica", fontSize=10,
    leading=13, textColor=MUTED, spaceAfter=8,
)
H1 = ParagraphStyle(
    "CCFlowH1", fontName="Helvetica-Bold", fontSize=15,
    leading=18.5, textColor=INK, backColor=PALE,
    borderColor=LINE, borderWidth=0.45, borderPadding=2,
    spaceBefore=7, spaceAfter=3,
    keepWithNext=True,
)
H2 = ParagraphStyle(
    "CCFlowH2", fontName="Helvetica-Bold", fontSize=10,
    leading=12.5, textColor=TEAL, spaceBefore=5, spaceAfter=2,
    keepWithNext=True,
)
BODY = ParagraphStyle(
    "CCFlowBody", fontName="Helvetica", fontSize=11,
    leading=14.5, textColor=INK, spaceAfter=4,
    alignment=TA_LEFT,
)
SMALL = ParagraphStyle(
    "CCFlowSmall", fontName="Helvetica", fontSize=9,
    leading=11.5, textColor=MUTED, spaceAfter=3,
)
CODE = ParagraphStyle(
    "CCFlowCode", fontName="Courier", fontSize=8.2,
    leading=10.8, textColor=INK, backColor=PALE,
    borderColor=LINE, borderWidth=0.6, borderPadding=6,
    leftIndent=5, rightIndent=5, spaceBefore=2, spaceAfter=5,
)


def _paragraph(text, style=BODY):
    return Paragraph(escape(str(text), quote=False).replace("\n", "<br/>"), style)


def _sources_paragraph(sources):
    links = [
        f'<link href="{escape(str(url), quote=True)}" color="#087E8B">'
        f'{escape(str(label), quote=False)}</link>'
        for label, url in sources
    ]
    return Paragraph("Fuentes enlazadas: " + " · ".join(links), SMALL)


def _footer(route_name):
    def draw(canvas, doc):
        canvas.saveState()
        width, height = A4
        canvas.setFont("Helvetica-Bold", 7)
        canvas.setFillColor(MUTED)
        canvas.drawString(18 * mm, height - 9 * mm, "CódigoClaro · Material de estudio")
        canvas.drawRightString(width - 18 * mm, height - 9 * mm, route_name)
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.6)
        canvas.line(18 * mm, height - 13 * mm, width - 18 * mm, height - 13 * mm)
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.7)
        canvas.line(18 * mm, 13 * mm, width - 18 * mm, 13 * mm)
        canvas.setFillColor(TEAL)
        canvas.roundRect(18 * mm, 8.1 * mm, 2 * mm, 2 * mm, 0.6 * mm, fill=1, stroke=0)
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(MUTED)
        canvas.drawString(22 * mm, 8.5 * mm, f"CódigoClaro · {route_name} · fuentes enlazadas")
        canvas.setFont("Helvetica-Bold", 7)
        canvas.setFillColor(TEAL)
        canvas.drawRightString(width - 18 * mm, 8.5 * mm, f"PÁGINA {doc.page}")
        canvas.restoreState()
    return draw


def build_route_pdf_bytes(*, route_name, title, subtitle, lessons, author, subject,
                          editorial_note=None, closing_project=None):
    """Render a sequence of sourced lessons continuously, without one-page-per-topic breaks."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=17 * mm,
        bottomMargin=19 * mm,
        title=title,
        author=author,
        subject=subject,
    )
    story = [
        _paragraph(f"CÓDIGOCLARO · RUTA {route_name.upper()}", EYEBROW),
        _paragraph(title, TITLE),
        _paragraph(subtitle, SUBTITLE),
        HRFlowable(width="100%", thickness=0.7, color=LINE, spaceBefore=1, spaceAfter=7),
    ]
    if editorial_note:
        story.extend([_paragraph(editorial_note, SMALL), Spacer(1, 3)])

    project_insert_lesson = (
        closing_project.get("before_lesson_number")
        if closing_project and closing_project.get("before_lesson_number")
        else len(lessons) if closing_project and closing_project.get("before_last_lesson") else None
    )
    page_break_before_lesson = (
        closing_project.get("page_break_before_lesson_number") if closing_project else None
    )

    def project_flowables():
        if not closing_project:
            return []
        flowables = [
            _paragraph(closing_project["title"], H1),
            _paragraph("Objetivo", H2),
            _paragraph(closing_project["objective"]),
            _paragraph("Pasos de trabajo", H2),
        ]
        flowables.extend(
            _paragraph(f"{index}. {step}")
            for index, step in enumerate(closing_project["steps"], start=1)
        )
        flowables.append(_paragraph("Comprobaciones", H2))
        flowables.extend(_paragraph(f"- {check}") for check in closing_project["checks"])
        if closing_project.get("test_cases"):
            flowables.append(_paragraph("Casos mínimos de prueba", H2))
            flowables.extend(
                _paragraph(f"- {case}") for case in closing_project["test_cases"]
            )
        if closing_project.get("deliverable"):
            flowables.extend([
                _paragraph("Entrega esperada", H2),
                _paragraph(closing_project["deliverable"]),
            ])
        flowables.extend([
            _paragraph("Explicación final", H2),
            _paragraph(closing_project["reflection"]),
        ])
        if closing_project.get("sources"):
            flowables.append(_sources_paragraph(closing_project["sources"]))
        return flowables

    for lesson_index, lesson in enumerate(lessons):
        number = lesson_index + 1
        if project_insert_lesson == number:
            story.extend(project_flowables())
        if page_break_before_lesson == number:
            story.append(PageBreak())
        story.append(_paragraph(f"Tema {number:02d} · {lesson['title']}", H1))
        story.extend([_paragraph("Objetivo", H2), _paragraph(lesson["goal"])])
        story.append(_paragraph("Explicación", H2))
        story.extend(_paragraph(part) for part in lesson["explain"])
        story.append(_paragraph("Ejemplo guiado", H2))
        story.append(_paragraph(lesson["code_label"], SMALL))
        code = "\n".join(lesson["code"])
        if code.strip():
            story.append(Preformatted(code, CODE, maxLineLength=110))
        story.extend([_paragraph("Lectura", H2), _paragraph(lesson["reading"])])
        story.extend([_paragraph("Alcance y precisión", H2), _paragraph(lesson["note"])])
        story.extend([_paragraph("Práctica", H2), _paragraph(lesson["practice"])])
        story.extend([_paragraph("Comprobación", H2), _paragraph(lesson["check"])])
        story.append(_sources_paragraph(lesson["sources"]))
        story.append(Spacer(1, 4))

    if closing_project and project_insert_lesson is None:
        if closing_project.get("start_new_page"):
            story.append(PageBreak())
        # Mantén el cierre junto para que no queden solo las últimas
        # comprobaciones y la reflexión en una hoja aparte.
        story.append(KeepTogether(project_flowables()))

    doc.build(story, onFirstPage=_footer(route_name), onLaterPages=_footer(route_name))
    return buffer.getvalue()
