#!/usr/bin/env python3
"""Genera la ruta didáctica de POO en Java y sus dos copias organizadas."""

from io import BytesIO
from html import escape
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from pdf_flow import build_route_pdf_bytes


ROOT = Path(__file__).resolve().parents[1]
OUT = (
    ROOT / "docs" / "temarios" / "Ruta_POO_Principios_15_Temas.pdf",
    ROOT / "public" / "temarios" / "Ruta_POO_Principios_15_Temas.pdf",
)

JAVA = "https://dev.java/learn/"
OOP = JAVA + "language/oop/"
INK = colors.HexColor("#17243A")
MUTED = colors.HexColor("#58677D")
TEAL = colors.HexColor("#087E8B")
PALE_BLUE = colors.HexColor("#EEF3FA")
PALE_GOLD = colors.HexColor("#FFF5DF")
LINE = colors.HexColor("#D9E1EB")
WHITE = colors.white
PAGE_W, PAGE_H = A4
LEFT, RIGHT, BOTTOM = 46, PAGE_W - 46, 50
CONTENT_W = RIGHT - LEFT

BODY = ParagraphStyle("Body", fontName="Helvetica", fontSize=9.1, leading=12,
                      textColor=INK, alignment=TA_LEFT, spaceAfter=0)
SMALL = ParagraphStyle("Small", fontName="Helvetica", fontSize=8.2, leading=10.4,
                       textColor=INK, alignment=TA_LEFT, spaceAfter=0)
SOURCES = ParagraphStyle("Sources", fontName="Helvetica", fontSize=7.5, leading=9.4,
                         textColor=MUTED, alignment=TA_LEFT, spaceAfter=0)
TITLE = ParagraphStyle("Title", fontName="Helvetica-Bold", fontSize=20,
                       leading=23.5, textColor=INK, alignment=TA_LEFT, spaceAfter=0)


LESSONS = [
    {
        "title": "Clases, objetos y estado",
        "goal": "Distinguir la definición de una clase de cada objeto creado a partir de ella y localizar estado y comportamiento.",
        "explain": [
            "Una clase declara miembros como campos, constructores y métodos. Un objeto es una instancia concreta: dos objetos de Libro comparten la misma estructura, pero cada uno mantiene su propio título e ISBN. Los métodos describen operaciones que se pueden pedir a la instancia.",
            "En la ruta usaremos una biblioteca como dominio conductor. El modelo es didáctico: sus reglas (por ejemplo, el máximo de préstamos) se proponen como decisiones del ejercicio, no como políticas bibliotecarias universales.",
        ],
        "code_label": "Declarar una clase y crear una instancia · Java",
        "code": [
            "class Libro {",
            "  private final String isbn;",
            "  private final String titulo;",
            "  private boolean prestado;",
            "  Libro(String isbn, String titulo) {",
            "    this.isbn = isbn; this.titulo = titulo;",
            "  }",
            "  boolean estaPrestado() { return prestado; }",
            "}",
            "Libro manual = new Libro(\"978-1\", \"POO\");",
        ],
        "reading": "Libro es la clase; manual es una referencia a un objeto concreto. isbn, titulo y prestado son estado de cada instancia; estaPrestado() expone una operación sobre ese estado.",
        "note": "Es un fragmento Java: se han omitido paquete y clase ejecutable. El acceso private oculta campos; el objeto se crea con new y una llamada al constructor.",
        "practice": "Crea dos libros con ISBN distintos. Añade un método que cambie el estado de prestado y comprueba que cambiar un libro no altera el otro.",
        "check": "Cada instancia conserva sus propios campos de instancia. No uses static para datos que deban variar de un libro a otro.",
        "sources": [
            ("POO en Java · Dev.java", OOP),
            ("Clases y objetos", OOP + "classes-objects/"),
            ("Crear objetos", OOP + "classes-objects/creating-objects/"),
        ],
    },
    {
        "title": "Encapsulación e invariantes",
        "goal": "Proteger el estado interno y hacer que las operaciones públicas mantengan reglas coherentes del objeto.",
        "explain": [
            "Encapsular no consiste solo en poner campos private y crear getters. También significa decidir qué operaciones ofrece el objeto y evitar que el resto del programa pueda dejarlo en un estado inválido mediante asignaciones arbitrarias.",
            "En este ejemplo, el límite de tres préstamos es una regla inventada para practicar. El método registra el cambio o informa que no puede hacerlo; no expone un setter para que cualquier cliente altere el contador sin validar la regla.",
        ],
        "code_label": "Una operación que protege el estado · Java",
        "code": [
            "class LimitePrestamos {",
            "  private int activos;",
            "  boolean registrar() {",
            "    if (activos >= 3) return false;",
            "    activos++;",
            "    return true;",
            "  }",
            "  int total() { return activos; }",
            "}",
        ],
        "reading": "El campo no se puede cambiar directamente desde código externo. registrar() concentra la comprobación y la modificación; false comunica que el límite del ejercicio ya se alcanzó.",
        "note": "Los modificadores de acceso controlan qué código puede usar cada miembro. No sustituyen validación de entradas, autorización de usuarios ni controles de seguridad del sistema.",
        "practice": "Añade devolver(). Debe reducir el contador solo si hay un préstamo activo; define qué devuelve o comunica cuando no hay ninguno que devolver.",
        "check": "La regla debe seguir siendo cierta después de cada operación pública: activos nunca queda negativo ni supera tres.",
        "sources": [
            ("Control de acceso a miembros", OOP + "classes-objects/more-on-classes/"),
            ("Clases, estado y comportamiento", OOP + "classes-objects/"),
        ],
    },
    {
        "title": "Constructores e inicialización",
        "goal": "Crear objetos en un estado inicial completo y comprender la sobrecarga y el constructor por defecto.",
        "explain": [
            "En Java, un constructor tiene el nombre de la clase y no declara tipo de retorno. Se ejecuta al crear la instancia y puede recibir argumentos para inicializar sus campos. Varios constructores pueden coexistir si sus listas de parámetros son distintas.",
            "Si una clase no declara ningún constructor, el compilador proporciona un constructor sin argumentos. En cuanto la clase declara uno, ese constructor por defecto ya no se añade. Diseña el constructor según los estados válidos que necesita el objeto.",
        ],
        "code_label": "Inicializar todos los datos necesarios · Java",
        "code": [
            "import java.time.LocalDate;",
            "import java.util.Objects;",
            "class Prestamo {",
            "  private final Libro libro;",
            "  private final LocalDate inicio;",
            "  Prestamo(Libro libro, LocalDate inicio) {",
            "    this.libro = Objects.requireNonNull(libro);",
            "    this.inicio = Objects.requireNonNull(inicio);",
            "  }",
            "}",
        ],
        "reading": "Los campos final se asignan en el constructor y no se reasignan después. requireNonNull falla de inmediato si falta un argumento requerido, en vez de dejar el préstamo parcialmente inicializado.",
        "note": "Objects.requireNonNull lanza NullPointerException cuando recibe null. Esta precondición falla pronto; si el dominio exige otro contrato, elige y documenta otro error.",
        "practice": "Añade un segundo constructor que reciba un ISBN y resuelva el Libro con un repositorio. Decide si esa resolución pertenece al constructor o a un servicio externo.",
        "check": "Prueba la ruta normal y una entrada nula. Revisa qué constructores existen antes de instanciar la clase sin argumentos.",
        "sources": [
            ("Constructores en Dev.java", OOP + "classes-objects/defining-constructors/"),
            ("Crear y usar objetos", OOP + "classes-objects/creating-objects/"),
            ("API Objects · Java SE 17", "https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Objects.html"),
        ],
    },
    {
        "title": "Abstracción y clases abstractas",
        "goal": "Separar la operación común de sus detalles y saber cuándo una clase abstracta expresa una base compartida.",
        "explain": [
            "Una abstracción publica lo que el cliente necesita saber y deja los detalles detrás de un contrato. Una clase abstract puede combinar métodos implementados con métodos abstractos que las subclases concretas deben completar.",
            "Una clase abstracta no se instancia directamente. Tiene sentido cuando los tipos relacionados comparten estado o implementación; si solo se necesita declarar una capacidad sin estado común, una interfaz puede encajar mejor.",
        ],
        "code_label": "Fijar un algoritmo y delegar un paso · Java",
        "code": [
            "abstract class FormatoFicha {",
            "  final String renderizar(Libro libro) {",
            "    return encabezado() + cuerpo(libro);",
            "  }",
            "  abstract String encabezado();",
            "  abstract String cuerpo(Libro libro);",
            "}",
            "class FichaBreve extends FormatoFicha {",
            "  String encabezado() { return \"LIBRO\"; }",
            "  String cuerpo(Libro l) { return l.titulo(); }",
            "}",
        ],
        "reading": "La base define renderizar y deja dos pasos que cada formato decide. El fragmento presupone un método titulo() en Libro; el esqueleto omite detalles no relevantes para la abstracción.",
        "note": "La clase abstracta puede contener campos no estáticos y métodos con acceso privado o protegido. Una clase Java solo puede extender una clase directa.",
        "practice": "Diseña dos formatos de ficha. Mantén en la base solo el flujo que realmente comparten; si no comparten estado ni implementación, prueba la alternativa con interfaz.",
        "check": "No marques abstracta una clase solo para impedir new: pregunta qué contrato o implementación común representa y quién completará cada operación.",
        "sources": [
            ("Clases abstractas · Dev.java", "https://dev.java/learn/inheritance/abstract-classes/"),
            ("Interfaces y clases abstractas", "https://dev.java/learn/language/oop/interfaces/defining-interfaces/"),
        ],
    },
    {
        "title": "Herencia: relación y límites",
        "goal": "Usar extends para especializar un tipo cuando la relación de sustitución y el contrato lo justifican.",
        "explain": [
            "Una subclase hereda miembros accesibles de una superclase y puede añadir o redefinir comportamiento. En Java una clase tiene una sola superclase directa; las interfaces ofrecen otra forma de compartir contratos.",
            "Usa herencia cuando un Libro pueda tratarse donde se espera un MaterialBiblioteca sin romper las expectativas del cliente. Compartir unos campos por sí solo no demuestra esa relación. La subclase debe respetar el comportamiento prometido por la base.",
        ],
        "code_label": "Especializar una clase del dominio · Java",
        "code": [
            "class MaterialBiblioteca {",
            "  private final String titulo;",
            "  MaterialBiblioteca(String titulo) { this.titulo = titulo; }",
            "  String titulo() { return titulo; }",
            "}",
            "class Libro extends MaterialBiblioteca {",
            "  Libro(String titulo) { super(titulo); }",
            "}",
        ],
        "reading": "extends declara la subclase. super(titulo) llama al constructor de la base; Java no hereda constructores automáticamente. Los campos privados siguen siendo parte de la clase base, no se acceden directamente desde Libro.",
        "note": "No heredes solo para reutilizar código: la subclase queda vinculada al contrato y a futuras decisiones de la base. Comprueba que se pueda sustituir de forma razonable.",
        "practice": "Decide si Revista debe extender MaterialBiblioteca o contener uno. Explica si representa un subtipo o una relación entre objetos y qué operaciones compartiría.",
        "check": "Una clase extiende como máximo una clase. Si necesitas compartir varias capacidades, revisa interfaces o composición antes de crear una jerarquía artificial.",
        "sources": [
            ("Herencia en Dev.java", OOP + "inheritance/"),
            ("Clases e interfaces Java", OOP + "classes-objects/creating-classes/"),
        ],
    },
    {
        "title": "Polimorfismo y sobrescritura",
        "goal": "Invocar una operación común sobre varios subtipos y distinguir sobrescritura de sobrecarga.",
        "explain": [
            "Cuando una referencia de tipo base apunta a un objeto de una subclase, una llamada a un método de instancia sobrescrito ejecuta la implementación asociada al objeto real en tiempo de ejecución. Esto permite escribir clientes que operan sobre el tipo base.",
            "La anotación @Override ayuda al compilador a comprobar que se está sobrescribiendo un método existente. Sobrecargar es declarar métodos con el mismo nombre y distintos parámetros; no es el mismo mecanismo que redefinir el comportamiento heredado.",
        ],
        "code_label": "Despachar según el objeto real · Java",
        "code": [
            "abstract class Material {",
            "  abstract String tipo();",
            "}",
            "class Libro extends Material {",
            "  @Override String tipo() { return \"libro\"; }",
            "}",
            "class Revista extends Material {",
            "  @Override String tipo() { return \"revista\"; }",
            "}",
            "Material m = new Revista();",
            "String etiqueta = m.tipo(); // \"revista\"",
        ],
        "reading": "La variable m se declara como Material, por eso el cliente depende de la operación tipo(). El objeto creado es Revista y su implementación sobrescrita determina el resultado.",
        "note": "Métodos static no se despachan igual que métodos de instancia sobrescritos: su resolución se asocia a la clase declarada. Este ejemplo solo trata métodos de instancia.",
        "practice": "Añade Audiolibro y llama tipo() desde una función que reciba Material. No añadas una cadena de if por subtipo al código cliente.",
        "check": "Si m se declara Material, solo puedes llamar miembros visibles en Material; cuál implementación se ejecuta depende del objeto, no del nombre de la variable.",
        "sources": [
            ("Polimorfismo Java", OOP + "inheritance/"),
            ("Sobrescritura de métodos", "https://dev.java/learn/inheritance/overriding/"),
        ],
    },
    {
        "title": "Interfaces como contratos",
        "goal": "Separar lo que un cliente necesita de cómo una clase concreta lo proporciona.",
        "explain": [
            "Una interfaz Java es un tipo de referencia que declara operaciones. Una clase que la implementa promete ofrecer esos métodos; el cliente puede depender de la interfaz sin conocer la implementación concreta.",
            "Las interfaces también pueden declarar métodos default y static con reglas propias. Para el ejercicio básico, usa la forma mínima: contrato, implementación y una llamada por la interfaz.",
        ],
        "code_label": "Un contrato de identificación · Java",
        "code": [
            "interface Identificable {",
            "  String id();",
            "}",
            "class Libro implements Identificable {",
            "  private final String isbn;",
            "  Libro(String isbn) { this.isbn = isbn; }",
            "  @Override public String id() { return isbn; }",
            "}",
            "Identificable item = new Libro(\"978-1\");",
        ],
        "reading": "En esta interfaz, id() no declara modificadores ni cuerpo, así que es implícitamente public abstract. La implementación debe declarar public para no reducir la visibilidad. item permite usar id() sin exigir que el cliente conozca Libro.",
        "note": "Implementar una interfaz no obliga a usar un contenedor de dependencias. Java admite que una clase implemente varias interfaces, aunque solo extienda una clase.",
        "practice": "Define una interfaz RepositorioLibros con buscarPorIsbn. Implementa una versión en memoria y otra alternativa simulada; haz que el servicio hable con el contrato.",
        "check": "El contrato debe expresar lo que el cliente necesita, no todos los métodos internos de la implementación.",
        "sources": [
            ("Interfaces en Java · Dev.java", OOP + "interfaces/defining-interfaces/"),
            ("Implementar una interfaz", OOP + "interfaces/examples/"),
        ],
    },
    {
        "title": "Composición y delegación",
        "goal": "Modelar relaciones entre objetos mediante campos y delegación cuando no exista un subtipo real.",
        "explain": [
            "Componer es mantener una referencia a otro objeto y coordinarse con él. Si Biblioteca contiene un Catalogo, eso expresa una relación tiene-un; no hace falta afirmar que Biblioteca es un tipo de Catalogo.",
            "La composición facilita cambiar el colaborador sin crear una jerarquía. No es una regla absoluta contra la herencia: usa cada mecanismo para la relación que representa y considera el ciclo de vida y la propiedad de los objetos.",
        ],
        "code_label": "Una biblioteca delega la búsqueda al catálogo · Java",
        "code": [
            "import java.util.List;",
            "class Catalogo {",
            "  List<Libro> buscar(String texto) { return List.of(); }",
            "}",
            "class Biblioteca {",
            "  private final Catalogo catalogo;",
            "  Biblioteca(Catalogo catalogo) { this.catalogo = catalogo; }",
            "  List<Libro> buscar(String q) { return catalogo.buscar(q); }",
            "}",
        ],
        "reading": "Biblioteca no extiende Catalogo. Conserva una referencia y delega la operación. List.of() es solo un resultado vacío de ejemplo para que el fragmento compile; una búsqueda real tendría que consultar los datos.",
        "note": "El ejemplo usa List.of(), disponible desde Java 9. Si tu proyecto usa una versión anterior, sustituye la lista vacía por una colección compatible.",
        "practice": "Añade un ServicioPrestamos que reciba una interfaz de catálogo en su constructor. Explica qué implementación podrías sustituir sin cambiar la lógica del servicio.",
        "check": "Usa extends si el tipo derivado respeta el contrato del tipo base; usa un campo y delegación si el objeto colabora con otro objeto.",
        "sources": [
            ("Objetos y clases", OOP + "classes-objects/"),
            ("Herencia y límites de Java", OOP + "inheritance/"),
        ],
    },
    {
        "title": "SRP: responsabilidad única",
        "goal": "Separar código que cambia por motivos distintos sin convertir el principio en una regla de un método por clase.",
        "explain": [
            "El Single Responsibility Principle (SRP) es una guía de diseño, no una regla de Java. Robert C. Martin lo formula alrededor de agrupar lo que cambia por las mismas razones y separar lo que cambia por motivos diferentes.",
            "Una clase puede tener varios métodos si todos responden al mismo conjunto de responsabilidades. El ejemplo separa la creación de un préstamo de su representación CSV: el cambio en un formato de exportación no obliga por sí mismo a modificar la regla que crea el préstamo.",
        ],
        "code_label": "Dos motivos de cambio, dos colaboradores · Java",
        "code": [
            "class Prestamo {",
            "  private final String isbn;",
            "  Prestamo(String isbn) { this.isbn = isbn; }",
            "  String isbn() { return isbn; }",
            "}",
            "class ServicioPrestamos {",
            "  Prestamo crear(String isbn) { return new Prestamo(isbn); }",
            "}",
            "class ExportadorCsv {",
            "  String fila(Prestamo p) { return p.isbn(); }",
            "}",
        ],
        "reading": "El CSV mostrado es intencionadamente mínimo: representa el dato central y no una especificación completa de escapado CSV. La idea es identificar dos actores y dos motivos de cambio.",
        "note": "SRP no exige una clase por método ni predice una estructura universal. Revisa cohesión, acoplamiento, tamaño del cambio y quién solicita esa modificación.",
        "practice": "Si Prestamo calcula una multa, guarda en una base de datos y prepara una pantalla, identifica quién pide cada cambio y decide si una responsabilidad debe salir de la entidad.",
        "check": "No dividas solo por contar métodos. La separación se justifica cuando hay razones de cambio distintas y el nuevo límite mejora claridad sin crear capas vacías.",
        "sources": [
            ("Robert C. Martin · SRP", "https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html"),
            ("Java: estado y comportamiento", OOP + "classes-objects/"),
        ],
    },
    {
        "title": "OCP: extender sin dispersar cambios",
        "goal": "Usar una abstracción cuando existe una variación esperada y mantener estable el código que coordina esa variación.",
        "explain": [
            "El Open-Closed Principle es una guía de diseño: ciertos módulos pueden quedar abiertos a extensiones previsibles y cerrados a cambios repetidos en su núcleo. No significa que el código nunca deba modificarse ni que haya que crear una interfaz para cada clase.",
            "Aquí ServicioRenovacion delega la decisión a una política. Añadir una nueva política para un caso esperado puede añadir una implementación sin introducir un if por cada tipo dentro del servicio. Si solo existe una regla estable, una abstracción extra puede no aportar valor.",
        ],
        "code_label": "Una política variable detrás de interfaz · Java",
        "code": [
            "interface PoliticaRenovacion {",
            "  boolean permite(Prestamo prestamo);",
            "}",
            "class ServicioRenovacion {",
            "  private final PoliticaRenovacion politica;",
            "  ServicioRenovacion(PoliticaRenovacion p) { politica = p; }",
            "  boolean renovar(Prestamo p) { return politica.permite(p); }",
            "}",
        ],
        "reading": "El servicio conoce el contrato, no las reglas concretas. Cada política nueva debe respetar el significado acordado de permite; cambiar la semántica del contrato puede requerir modificar clientes.",
        "note": "OCP es un objetivo estratégico para cambios esperados, no una garantía formal del compilador. Elige qué dimensión conviene estabilizar y revisa el coste de extensión.",
        "practice": "Añade dos políticas de renovación con condiciones distintas. Mantén la decisión fuera de ServicioRenovacion y escribe el criterio de cada implementación.",
        "check": "Una extensión real añade un comportamiento coherente sin llenar el servicio de casos especiales; las reglas deben quedar comprobables por separado.",
        "sources": [
            ("Robert C. Martin · Open-Closed", "https://blog.cleancoder.com/uncle-bob/2014/05/12/TheOpenClosedPrinciple.html"),
            ("Interfaces Java", OOP + "interfaces/defining-interfaces/"),
        ],
    },
    {
        "title": "Inyección de dependencias",
        "goal": "Entregar las colaboraciones a un objeto desde fuera y mantener explícito qué necesita para funcionar.",
        "explain": [
            "Un objeto tiene una dependencia cuando necesita otro objeto para cumplir su trabajo. Con inyección por constructor, recibe esa dependencia al crearse en lugar de buscarla o construirla internamente. En Java puede hacerse manualmente; un contenedor como Spring automatiza el cableado de sus beans.",
            "Constructorizar dependencias requeridas deja visible el contrato de creación. La abstracción Clock permite sustituir el reloj del sistema por otro controlado en una prueba, sin que el servicio tenga que consultar el tiempo globalmente.",
        ],
        "code_label": "Pasar el reloj al servicio · Java",
        "code": [
            "import java.time.Clock;",
            "import java.time.LocalDate;",
            "class ServicioPrestamos {",
            "  private final Clock reloj;",
            "  ServicioPrestamos(Clock reloj) { this.reloj = reloj; }",
            "  LocalDate fechaActual() { return LocalDate.now(reloj); }",
            "}",
            "var servicio = new ServicioPrestamos(Clock.systemUTC());",
        ],
        "reading": "Clock se entrega por el constructor y el servicio lo conserva. En una prueba se puede proporcionar otra implementación de Clock; el ejemplo de creación usa el reloj UTC de Java.",
        "note": "La última línea usa var (Java 10+). Si tu proyecto usa una versión anterior, declara explícitamente ServicioPrestamos. El ejemplo no necesita Spring; la inyección es una forma de ensamblar objetos.",
        "practice": "Pasa un repositorio por constructor junto con Clock. Identifica cuáles dependencias son obligatorias y cuáles podrían tener una configuración opcional.",
        "check": "Si el servicio construye un repositorio concreto dentro de cada método, sustituirlo para probar o cambiar implementación se vuelve más difícil.",
        "sources": [
            ("Inyección de dependencias · Spring", "https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html"),
            ("API Clock · Java", "https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/time/Clock.html"),
        ],
    },
    {
        "title": "Factory y Strategy",
        "goal": "Distinguir la creación de un objeto de la estrategia intercambiable que el objeto representa.",
        "explain": [
            "Strategy encapsula una decisión o algoritmo detrás de un contrato para que el cliente pueda trabajar con varias alternativas. Una fábrica es una operación que decide y devuelve qué objeto crear. Son nombres de patrones de diseño, no palabras clave ni mecanismos especiales de Java.",
            "El ejemplo devuelve un Formateador y oculta la elección entre dos implementaciones sencillas. Las fábricas estáticas también aparecen en las APIs Java, por ejemplo List.of; el método crear de aquí es una versión mínima para el dominio.",
        ],
        "code_label": "Elegir una estrategia mediante una fábrica · Java",
        "code": [
            "interface Formateador { String aplicar(String texto); }",
            "class FormatoPlano implements Formateador {",
            "  public String aplicar(String s) { return s; }",
            "}",
            "class FormatoMarcado implements Formateador {",
            "  public String aplicar(String s) { return \"[\" + s + \"]\"; }",
            "}",
            "class Formateadores {",
            "  static Formateador crear(boolean marcado) {",
            "    return marcado ? new FormatoMarcado() : new FormatoPlano();",
            "  }",
            "}",
        ],
        "reading": "Formateador es Strategy: las implementaciones son sustituibles desde el cliente. Formateadores.crear centraliza la elección de una instancia; no hace falta una fábrica si la construcción sigue siendo trivial.",
        "note": "Evita convertir un ejemplo de patrón en una receta universal. Compara el coste de la abstracción con el número y la probabilidad de variaciones reales.",
        "practice": "Añade un formato que muestre el ISBN con un prefijo. Cambia la fábrica para seleccionarlo y verifica que el cliente sigue llamando aplicar(String).",
        "check": "La fábrica decide qué crear; la estrategia define el comportamiento intercambiable. No confundas el contrato de comportamiento con el mecanismo de construcción.",
        "sources": [
            ("Interfaces Java", OOP + "interfaces/defining-interfaces/"),
            ("Fábricas de colecciones Java", "https://dev.java/learn/api/collections-and-streams/collections-framework/factory-methods/"),
        ],
    },
    {
        "title": "Excepciones y contratos",
        "goal": "Comunicar errores excepcionales y especificar qué entradas acepta una operación y qué resultado promete.",
        "explain": [
            "Una excepción interrumpe el flujo normal y transporta información sobre un error. Las excepciones checked están sujetas al requisito de capturar o declarar; RuntimeException y Error y sus subclases son unchecked. No conviertas todas las entradas inválidas en una excepción sin pensar en el contrato.",
            "Valida en la frontera adecuada y deja que una capa responsable decida cómo presentar o recuperar el error. No captures una excepción solo para ocultarla; conserva la causa o tradúcela con contexto si la nueva capa puede actuar sobre ella.",
        ],
        "code_label": "Traducir texto externo a un entero válido · Java",
        "code": [
            "int leerDias(String entrada) {",
            "  try {",
            "    return Integer.parseInt(entrada);",
            "  } catch (NumberFormatException causa) {",
            "    throw new IllegalArgumentException(\"Días inválidos\", causa);",
            "  }",
            "}",
        ],
        "reading": "parseInt puede lanzar NumberFormatException si el texto no representa un entero. La función comunica al llamador un error de argumento y conserva la causa original para depuración.",
        "note": "La recomendación concreta entre checked y unchecked depende del contexto y de la capacidad real de recuperación. Documenta el comportamiento observable de la API.",
        "practice": "Define qué ocurre si los días son negativos. ¿Es inválido el argumento, un resultado permitido o un error de estado? Implementa y escribe esa decisión en la documentación del método.",
        "check": "Una excepción no es una salida normal para un caso esperado que el llamador debe elegir; para ese caso suele convenir representar el resultado de manera explícita.",
        "sources": [
            ("Excepciones en Java · Dev.java", "https://dev.java/learn/language/annotations-exceptions/exceptions/"),
            ("Excepciones checked · JLS 17", "https://docs.oracle.com/javase/specs/jls/se17/html/jls-11.html#jls-11.1.1"),
            ("Integer.parseInt · Java SE 17 API", "https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Integer.html#parseInt(java.lang.String)"),
            ("IllegalArgumentException · Java SE 17 API", "https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/IllegalArgumentException.html"),
        ],
    },
    {
        "title": "Pruebas unitarias con JUnit",
        "goal": "Comprobar un comportamiento observable de una clase con una prueba pequeña y repetible.",
        "explain": [
            "Una prueba unitaria prepara una condición, invoca una operación y compara el resultado observado con el esperado. JUnit Jupiter ofrece anotaciones y aserciones para escribir esos casos; una prueba no demuestra que un programa entero esté libre de defectos.",
            "El ejemplo comprueba el estado inicial expuesto por Libro, no la visibilidad de sus campos. El manual oficial consultado corresponde a JUnit 6.1.3, que requiere Java 17 o superior en tiempo de ejecución.",
        ],
        "code_label": "Comprobar el estado inicial de un libro · JUnit 6",
        "code": [
            "import static org.junit.jupiter.api.Assertions.assertFalse;",
            "import org.junit.jupiter.api.Test;",
            "class LibroTest {",
            "  @Test",
            "  void comienzaSinPrestamo() {",
            "    Libro libro = new Libro(\"978-1\", \"POO\");",
            "    assertFalse(libro.estaPrestado());",
            "  }",
            "}",
        ],
        "reading": "La anotación @Test identifica el método de prueba; assertFalse falla si la condición no es falsa. LibroTest debe poder acceder a los miembros del ejemplo, por ejemplo al estar en el mismo paquete.",
        "note": "JUnit 6.1.3 requiere Java 17 o superior en tiempo de ejecución. Comprueba qué versión de JUnit admite el JDK y el sistema de construcción de tu proyecto.",
        "practice": "Añade una prueba que compruebe que prestar un libro cambia el resultado observable de estaPrestado(). Añade otro caso para devolverlo.",
        "check": "Cada prueba debe fallar por una razón útil cuando cambia el comportamiento y pasar cuando se cumple la expectativa que documenta.",
        "sources": [
            ("Escribir pruebas con JUnit Jupiter · 6.1.3", "https://docs.junit.org/6.1.3/writing-tests/intro.html"),
            ("JUnit 6.1.3 · requisitos Java", "https://docs.junit.org/6.1.3/overview.html"),
        ],
    },
    {
        "title": "Diseñar un dominio completo",
        "goal": "Integrar estado, contratos, colaboraciones, reglas y ejemplos de prueba en un pequeño modelo orientado a objetos.",
        "explain": [
            "Diseña el dominio desde las reglas que debe respetar, no desde una lista de sustantivos. En una biblioteca de práctica, Libro mantiene su identidad, Prestamo representa la relación temporal, ServicioPrestamos coordina el caso de uso y un repositorio abstrae cómo se guardan los datos.",
            "No todas las clases necesitan herencia, interfaces o un patrón. Introduce abstracciones cuando exista una variación o un límite útil; mantén las reglas cerca del objeto o servicio que puede hacerlas cumplir y prueba resultados observables.",
        ],
        "code_label": "Un servicio depende del contrato de almacenamiento · Java",
        "code": [
            "interface RepositorioPrestamos {",
            "  void guardar(Prestamo prestamo);",
            "}",
            "class ServicioPrestamos {",
            "  private final RepositorioPrestamos repositorio;",
            "  ServicioPrestamos(RepositorioPrestamos r) { repositorio = r; }",
            "  void registrar(Prestamo p) { repositorio.guardar(p); }",
            "}",
        ],
        "reading": "El servicio expresa la operación de aplicación y recibe el colaborador al construirse. La implementación concreta del repositorio queda fuera del fragmento para centrar el ejercicio en el límite entre política y almacenamiento.",
        "note": "Este esqueleto no es una arquitectura obligatoria ni un sistema de producción: faltan persistencia, validación, concurrencia y reglas específicas de la organización.",
        "practice": "Entrega un diagrama de clases y una prueba para registrar un préstamo. Especifica precondiciones, resultado esperado, libro ya prestado, repositorio simulado y las decisiones que deliberadamente no modelaste.",
        "check": "Puedes explicar quién posee cada dato, qué regla protege cada clase, qué interfaz necesita el cliente y cómo comprobarías cada caso límite.",
        "sources": [
            ("POO en Java · Dev.java", OOP),
            ("Interfaces Java", OOP + "interfaces/defining-interfaces/"),
            ("Escribir pruebas con JUnit Jupiter · 6.1.3", "https://docs.junit.org/6.1.3/writing-tests/intro.html"),
        ],
    },
]


def draw_wrapped(c, text, style, y):
    p = Paragraph(escape(text, quote=False), style)
    _, h = p.wrap(CONTENT_W, PAGE_H)
    if y - h < BOTTOM:
        raise ValueError(f"Texto fuera de página: {text[:70]!r}; y={y:.1f}; h={h:.1f}")
    p.drawOn(c, LEFT, y - h)
    return y - h


def draw_label(c, label, y, color=TEAL):
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", 8.1)
    c.drawString(LEFT, y - 8, label.upper())
    return y - 17


def draw_card(c, text, y, fill, style=SMALL):
    p = Paragraph(escape(text, quote=False), style)
    _, h = p.wrap(CONTENT_W - 22, PAGE_H)
    box_h = h + 18
    if y - box_h < BOTTOM:
        raise ValueError(f"Tarjeta fuera de página: {text[:70]!r}; y={y:.1f}; h={box_h:.1f}")
    c.setFillColor(fill)
    c.setStrokeColor(LINE)
    c.roundRect(LEFT, y - box_h, CONTENT_W, box_h, 7, fill=1, stroke=1)
    p.drawOn(c, LEFT + 11, y - 9 - h)
    return y - box_h


def draw_code(c, label, lines, y):
    font_size, leading = 7.6, 9.7
    max_w = max((stringWidth(line, "Courier", font_size) for line in lines), default=0)
    if max_w > CONTENT_W - 26:
        raise ValueError(f"Línea de código demasiado larga ({max_w:.1f} pt): {label}")
    box_h = len(lines) * leading + 30
    if y - box_h < BOTTOM:
        raise ValueError(f"Código fuera de página: {label}; y={y:.1f}; h={box_h:.1f}")
    c.setFillColor(INK)
    c.roundRect(LEFT, y - box_h, CONTENT_W, box_h, 7, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#81D2D4"))
    c.setFont("Helvetica-Bold", 7.8)
    c.drawString(LEFT + 12, y - 15, label.upper())
    c.setFillColor(WHITE)
    c.setFont("Courier", font_size)
    yy = y - 28
    for line in lines:
        c.drawString(LEFT + 12, yy, line)
        yy -= leading
    return y - box_h


def draw_sources(c, sources, y):
    links = [f'<link href="{escape(url, quote=True)}" color="#087E8B">{escape(label, quote=False)}</link>'
             for label, url in sources]
    p = Paragraph(" · ".join(links), SOURCES)
    _, h = p.wrap(CONTENT_W, PAGE_H)
    if y - h < BOTTOM:
        raise ValueError(f"Fuentes fuera de página; y={y:.1f}; h={h:.1f}")
    p.drawOn(c, LEFT, y - h)
    return y - h


def draw_page(c, lesson, number):
    c.setFillColor(colors.HexColor("#F8FAFC"))
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(INK)
    c.rect(0, PAGE_H - 8, PAGE_W, 8, fill=1, stroke=0)
    c.setFillColor(TEAL)
    c.rect(0, PAGE_H - 8, PAGE_W * number / len(LESSONS), 8, fill=1, stroke=0)
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(LEFT, PAGE_H - 31, "CÓDIGOCLARO  /  RUTA POO")
    c.setFont("Helvetica", 8)
    c.drawRightString(RIGHT, PAGE_H - 31, f"TEMA {number:02d} / {len(LESSONS)}")

    y = PAGE_H - 56
    title = Paragraph(escape(lesson["title"], quote=False), TITLE)
    _, h = title.wrap(CONTENT_W, 80)
    title.drawOn(c, LEFT, y - h)
    y -= h + 9
    y = draw_label(c, "Objetivo", y)
    y = draw_wrapped(c, lesson["goal"], BODY, y) - 7
    y = draw_label(c, "Explicación", y)
    for paragraph in lesson["explain"]:
        y = draw_wrapped(c, paragraph, BODY, y) - 5
    y = draw_label(c, "Ejemplo guiado", y)
    y = draw_code(c, lesson["code_label"], lesson["code"], y) - 8
    y = draw_label(c, "Lectura del ejemplo", y)
    y = draw_wrapped(c, lesson["reading"], SMALL, y) - 7
    y = draw_label(c, "Alcance y precisión", y, color=colors.HexColor("#A26300"))
    y = draw_card(c, lesson["note"], y, PALE_GOLD) - 7
    y = draw_label(c, "Practica y comprueba", y)
    y = draw_card(c, lesson["practice"] + "\n\nComprobación: " + lesson["check"], y, PALE_BLUE) - 7
    y = draw_label(c, "Fuentes enlazadas", y, color=MUTED)
    draw_sources(c, lesson["sources"], y)

    c.setStrokeColor(LINE)
    c.line(LEFT, 38, RIGHT, 38)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 7.4)
    c.drawString(LEFT, 25, "Ejemplos Java SE 17+; verifica la versión objetivo de tu proyecto.")
    c.drawRightString(RIGHT, 25, "POO · Material de estudio")
    c.showPage()


def make_pdf():
    if len(LESSONS) != 15:
        raise ValueError(f"Se esperaban 15 temas; hay {len(LESSONS)}")
    return build_route_pdf_bytes(
        route_name="POO en Java",
        title="Ruta POO en Java · Principios y diseño",
        subtitle="15 temas · Java SE 17+ · ejemplos y prácticas con documentación enlazada",
        lessons=LESSONS,
        author="CódigoClaro · síntesis basada en Dev.java y Oracle",
        subject="Programación orientada a objetos en Java SE 17+",
        editorial_note="Las explicaciones se apoyan en documentación primaria; los ejemplos y prácticas se identifican como material didáctico del curso.",
    )


def main():
    payload = make_pdf()
    for path in OUT:
        path.parent.mkdir(parents=True, exist_ok=True)
    for path in OUT:
        path.write_bytes(payload)
        print(path, len(payload))


if __name__ == "__main__":
    main()
