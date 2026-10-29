#!/usr/bin/env python3
"""Genera la ruta SQL de 15 temas a partir de contenido versionado aquí.

Los ejemplos principales declaran PostgreSQL como dialecto. Las diferencias
entre PostgreSQL, MySQL y Oracle se etiquetan y enlazan a manuales oficiales.
El mismo PDF se escribe en docs/temarios y public/temarios.
"""

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
    ROOT / "docs" / "temarios" / "Ruta_SQL_Oracle_MySQL_PostgreSQL_15_Temas.pdf",
    ROOT / "public" / "temarios" / "Ruta_SQL_Oracle_MySQL_PostgreSQL_15_Temas.pdf",
)

PG = "https://www.postgresql.org/docs/current/"
PG18 = "https://www.postgresql.org/docs/18/"
MYSQL = "https://dev.mysql.com/doc/refman/8.4/en/"
ORACLE = "https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/"

INK = colors.HexColor("#17243A")
MUTED = colors.HexColor("#58677D")
TEAL = colors.HexColor("#087E8B")
PALE = colors.HexColor("#EAF5F6")
PALE_BLUE = colors.HexColor("#EEF3FA")
PALE_GOLD = colors.HexColor("#FFF5DF")
LINE = colors.HexColor("#D9E1EB")
WHITE = colors.white
PAGE_W, PAGE_H = A4
LEFT = 46
RIGHT = PAGE_W - 46
CONTENT_W = RIGHT - LEFT
BOTTOM = 50

BODY = ParagraphStyle(
    "Body", fontName="Helvetica", fontSize=9.15, leading=12.1,
    textColor=INK, alignment=TA_LEFT, spaceAfter=0,
)
SMALL = ParagraphStyle(
    "Small", fontName="Helvetica", fontSize=8.25, leading=10.4,
    textColor=INK, alignment=TA_LEFT, spaceAfter=0,
)
SOURCES = ParagraphStyle(
    "Sources", fontName="Helvetica", fontSize=7.6, leading=9.5,
    textColor=MUTED, alignment=TA_LEFT, spaceAfter=0,
)
TITLE = ParagraphStyle(
    "Title", fontName="Helvetica-Bold", fontSize=20, leading=23.5,
    textColor=INK, alignment=TA_LEFT, spaceAfter=0,
)


LESSONS = [
    {
        "title": "Modelo relacional y tipos",
        "goal": "Diseñar tablas pequeñas, elegir tipos que describan los datos y expresar las relaciones entre alumnos, cursos y matrículas.",
        "explain": [
            "Una tabla representa filas con atributos definidos por columnas. En una relación muchos-a-muchos, una tercera tabla, aquí matrícula, conecta las entidades y puede guardar datos propios de esa relación, como la fecha de alta.",
            "El tipo limita qué valores tienen sentido: un precio requiere un decimal exacto, un recuento suele ser entero y una fecha de calendario no es texto libre. La elección concreta del tipo depende del motor; no hay que asumir que DATE o los tipos de texto significan exactamente lo mismo en todos los dialectos.",
        ],
        "code_label": "Esquema didáctico · PostgreSQL",
        "code": [
            "CREATE TABLE alumno (",
            "  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,",
            "  nombre varchar(100) NOT NULL,",
            "  email varchar(254) UNIQUE",
            ");",
            "CREATE TABLE curso (",
            "  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,",
            "  titulo text NOT NULL,",
            "  activo boolean NOT NULL DEFAULT true,",
            "  precio numeric(8,2) NOT NULL CHECK (precio >= 0)",
            ");",
            "CREATE TABLE matricula (",
            "  alumno_id integer REFERENCES alumno(id),",
            "  curso_id integer REFERENCES curso(id),",
            "  fecha date NOT NULL, fecha_finalizacion date,",
            "  PRIMARY KEY (alumno_id, curso_id)",
            ");",
        ],
        "reading": "La clave compuesta impide duplicar la matrícula de la misma persona en el mismo curso. Las referencias impiden que matrícula apunte a un alumno o curso inexistente. email admite NULL: UNIQUE no equivale a NOT NULL.",
        "note": "Correspondencias aproximadas, no equivalencias completas: PostgreSQL ofrece numeric/text/date; MySQL ofrece DECIMAL/VARCHAR/DATE; Oracle ofrece NUMBER/VARCHAR2/DATE. En Oracle, DATE incluye hora hasta segundos. Verifica precisión, límites y zona horaria en el motor elegido.",
        "practice": "Añade una tabla de docente y relaciona cada curso con un docente. Decide si un curso puede tener cero docentes, uno o varios y traduce esa regla a claves y restricciones.",
        "check": "Una matrícula es una entidad separada porque relaciona dos entidades y almacena fecha. Comprueba si tu diseño permite repetir una matrícula por curso y si esa posibilidad es intencionada.",
        "sources": [
            ("Tipos PostgreSQL", PG + "datatype.html"),
            ("Tipos MySQL 8.4", MYSQL + "data-types.html"),
            ("Tipos Oracle 26", ORACLE + "Data-Types.html"),
        ],
    },
    {
        "title": "SELECT: columnas, expresiones y alias",
        "goal": "Construir una salida deliberada: escoger columnas, calcular expresiones y dar nombres comprensibles al resultado.",
        "explain": [
            "SELECT proyecta columnas y expresiones de las filas que aporta FROM. El alias cambia el nombre de una columna en el resultado; no renombra la columna almacenada. Seleccionar solo lo necesario hace explícito el contrato de salida de la consulta.",
            "Para ejercicios rápidos, SELECT * es cómodo; en consultas que alimentan una aplicación, una lista explícita evita que añadir una columna a la tabla altere accidentalmente la forma del resultado.",
        ],
        "code_label": "Consulta de lectura · PostgreSQL",
        "code": [
            "SELECT c.id,",
            "       c.titulo AS curso,",
            "       c.precio,",
            "       c.precio * 1.10 AS precio_con_recargo",
            "FROM curso AS c;",
        ],
        "reading": "c es un alias de tabla que permite escribir c.titulo sin repetir el nombre completo. precio_con_recargo es una expresión calculada para el resultado; el ejemplo usa un 10 % ficticio y no representa una regla fiscal.",
        "note": "Las expresiones se evalúan con las reglas de tipos y conversiones del motor. Si una columna usa un tipo entero, decimal o aproximado, consulta la documentación del dialecto antes de depender de precisión o redondeo.",
        "practice": "Muestra id y título de cada curso, y calcula un indicador de si el precio supera 50. Usa un alias que se entienda leyendo solo el resultado.",
        "check": "La consulta devuelve una fila por fila fuente de curso; el alias cambia el encabezado del resultado, no actualiza la tabla.",
        "sources": [
            ("Tutorial SELECT PostgreSQL", PG + "tutorial-select.html"),
            ("SELECT MySQL 8.4", MYSQL + "select.html"),
        ],
    },
    {
        "title": "WHERE, operadores y NULL",
        "goal": "Filtrar filas con condiciones booleanas y tratar explícitamente los valores ausentes.",
        "explain": [
            "WHERE conserva las filas cuya condición resulta verdadera. Las condiciones pueden combinarse con AND, OR y NOT; los paréntesis ayudan a expresar la intención cuando se mezclan. En PostgreSQL, BETWEEN incluye ambos extremos del intervalo.",
            "NULL significa que falta o no se conoce un valor. Compararlo con = NULL no produce verdadero: la comparación resulta desconocida. Usa IS NULL o IS NOT NULL. Por eso una fila con NULL no pasa un filtro como precio = 0 ni tampoco pasa su negación precio <> 0.",
        ],
        "code_label": "Dos filtros separados · PostgreSQL",
        "code": [
            "SELECT id, titulo FROM curso",
            "WHERE activo = true AND precio BETWEEN 20 AND 60;",
            "",
            "SELECT alumno_id, curso_id FROM matricula",
            "WHERE fecha_finalizacion IS NULL;",
        ],
        "reading": "La primera condición usa el estado y el intervalo del precio. La segunda encuentra matrículas sin fecha de finalización. No escribas fecha_finalizacion = NULL: IS NULL es la prueba definida para ese caso.",
        "note": "Los ejemplos usan boolean de PostgreSQL. MySQL y Oracle tienen diferencias de tipos y literales; además, Oracle trata actualmente una cadena de longitud cero como NULL y advierte que no se dependa de ello como equivalencia futura.",
        "practice": "Busca cursos activos cuyo precio sea menor de 30 o mayor de 100. Después añade una condición que descarte los títulos NULL, si el esquema permitiera esos valores.",
        "check": "Antes de evaluar el filtro, confirma si cada columna puede ser NULL. Recuerda que UNKNOWN en WHERE tampoco incluye una fila.",
        "sources": [
            ("Filtros y SELECT PostgreSQL", PG + "tutorial-select.html"),
            ("Comparaciones y NULL PostgreSQL", PG + "functions-comparison.html"),
            ("NULL en Oracle", ORACLE + "Nulls.html"),
        ],
    },
    {
        "title": "Ordenación y paginación",
        "goal": "Ordenar resultados de forma legible y paginar sin depender de un orden accidental.",
        "explain": [
            "SQL no promete un orden si no se especifica ORDER BY. Si dos filas empatan en el primer criterio, el orden entre ellas sigue sin quedar fijado; añade una clave única como último criterio cuando necesites una página reproducible.",
            "LIMIT/OFFSET y FETCH/OFFSET limitan filas, pero no hacen que la consulta sea más barata por sí solos. En PostgreSQL, saltar un OFFSET grande sigue requiriendo computar las filas saltadas; para conjuntos grandes se suele diseñar paginación por clave.",
        ],
        "code_label": "Primeros 10 cursos desde el desplazamiento 20 · PostgreSQL",
        "code": [
            "SELECT id, titulo",
            "FROM curso",
            "ORDER BY titulo ASC, id ASC",
            "LIMIT 10 OFFSET 20;",
        ],
        "reading": "titulo fija el orden principal; id resuelve empates. Cambia 10 y 20 para probar otras páginas. Sin ORDER BY, incluso la primera página puede variar entre planes o ejecuciones.",
        "note": "PostgreSQL y MySQL aceptan LIMIT 10 OFFSET 20. Oracle usa OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY. En los tres casos, usa ORDER BY con un criterio que resuelva empates si el orden debe ser determinista.",
        "practice": "Devuelve la página siguiente de cursos ordenada por precio y, en caso de empate, id. Escribe qué ocurre si eliminas el criterio id.",
        "check": "Hay 10 como máximo en la página; el desplazamiento empieza después de saltar 20 filas ordenadas. No supongas que la base devuelve las filas en orden de inserción.",
        "sources": [
            ("LIMIT/OFFSET PostgreSQL", PG + "queries-limit.html"),
            ("SELECT y LIMIT MySQL 8.4", MYSQL + "select.html"),
            ("FETCH/OFFSET Oracle 26", ORACLE + "SELECT.html"),
        ],
    },
    {
        "title": "Funciones de agregación",
        "goal": "Resumir filas con COUNT, SUM, AVG, MIN y MAX, distinguiendo filas de valores no nulos.",
        "explain": [
            "Una agregación transforma varias filas en un valor de resumen. COUNT(*) cuenta filas del conjunto; COUNT(columna) cuenta las filas cuyo valor en esa columna no es NULL. Esa diferencia es clave cuando el campo admite valores ausentes.",
            "AVG, SUM, MIN y MAX aplican sus reglas de tipo y NULL por función y motor. En PostgreSQL, los agregados comunes ignoran entradas NULL; salvo COUNT, devuelven NULL cuando no hay filas. En PostgreSQL y MySQL, COUNT(*) cuenta filas y COUNT(columna) valores no NULL. No sustituyas automáticamente NULL por cero: decide si cero significa lo mismo en el dominio.",
        ],
        "code_label": "Total de matrículas y finalizaciones conocidas · PostgreSQL",
        "code": [
            "SELECT COUNT(*) AS matriculas,",
            "       COUNT(fecha_finalizacion) AS finalizadas",
            "FROM matricula;",
        ],
        "reading": "matriculas cuenta todas las filas. finalizadas cuenta solo las que tienen fecha_finalizacion. En este esquema, una fecha nula representa una matrícula aún no finalizada; si la regla del negocio fuese otra, el cálculo tendría que cambiar.",
        "note": "El tipo de retorno puede variar según función y tipos de entrada. Revisa la documentación del producto antes de asumir precisión, tipo de resultado o comportamiento de una agregación vacía.",
        "practice": "Calcula el precio medio y el precio máximo de los cursos. Decide qué debería mostrarse si todavía no hay cursos.",
        "check": "Con una tabla vacía, COUNT(*) produce 0 en los motores documentados; AVG no es un cero implícito. Comprueba la salida real en tu dialecto.",
        "sources": [
            ("Agregados PostgreSQL", PG + "functions-aggregate.html"),
            ("Agregados MySQL 8.4", MYSQL + "aggregate-functions.html"),
            ("COUNT Oracle 26", ORACLE + "COUNT.html"),
        ],
    },
    {
        "title": "GROUP BY y HAVING",
        "goal": "Agrupar filas para obtener resúmenes por categoría y filtrar los grupos después de agregarlos.",
        "explain": [
            "GROUP BY forma grupos que comparten los valores de las columnas indicadas. Una consulta de resumen puede incluir las columnas agrupadas y expresiones de agregación. HAVING filtra el resultado agrupado; WHERE filtra filas antes de que se formen los grupos.",
            "Si necesitas incluir cursos que todavía no tienen matrículas, agrupar solo matricula no basta: el conjunto de entrada debe partir de curso y usar LEFT JOIN. Es importante distinguir ausencia de filas de una agregación cuyo resultado es cero.",
        ],
        "code_label": "Cursos con al menos diez matrículas · PostgreSQL",
        "code": [
            "SELECT curso_id, COUNT(*) AS total",
            "FROM matricula",
            "GROUP BY curso_id",
            "HAVING COUNT(*) >= 10",
            "ORDER BY total DESC, curso_id;",
        ],
        "reading": "Cada fila de salida representa un curso_id presente en matrícula. HAVING COUNT(*) >= 10 conserva grupos que alcanzan el umbral; ORDER BY solo organiza la salida y no cambia qué grupos existen.",
        "note": "Al portar consultas, evita depender de seleccionar columnas que no estén agrupadas ni agregadas: las reglas y extensiones pueden variar por motor y configuración. La forma mostrada sigue la regla explícita y portable.",
        "practice": "Obtén el total de matrículas por curso, pero solo para matrículas cuya fecha sea de 2026. ¿La condición de fecha va en WHERE o HAVING?",
        "check": "La condición sobre cada fila va en WHERE antes de agrupar; HAVING se reserva aquí para condiciones como COUNT(*) >= 10.",
        "sources": [
            ("SELECT, GROUP BY y HAVING PostgreSQL", PG + "sql-select.html"),
            ("GROUP BY y HAVING Oracle 26", ORACLE + "SELECT.html"),
            ("Agregados MySQL 8.4", MYSQL + "aggregate-functions.html"),
        ],
    },
    {
        "title": "JOIN: combinar tablas relacionadas",
        "goal": "Relacionar filas mediante claves y elegir entre coincidencias obligatorias y conservación de filas sin pareja.",
        "explain": [
            "JOIN combina filas según una condición. INNER JOIN conserva las parejas que cumplen ON. LEFT JOIN también conserva cada fila de la tabla izquierda que no encontró pareja; en las columnas del lado derecho aparecen NULL.",
            "La condición de emparejamiento se escribe en ON. Con un outer join, mover una condición del lado derecho a WHERE puede descartar las filas extendidas con NULL y cambiar el resultado práctico. Lee el ejemplo con cursos sin matrículas para notar la diferencia.",
        ],
        "code_label": "Mostrar también cursos sin matrícula · PostgreSQL",
        "code": [
            "SELECT c.id, c.titulo, m.alumno_id",
            "FROM curso AS c",
            "LEFT JOIN matricula AS m",
            "  ON m.curso_id = c.id",
            "ORDER BY c.id, m.alumno_id;",
        ],
        "reading": "Un curso con tres matrículas aparece en tres filas. Un curso sin ninguna aparece una vez con alumno_id NULL. Si solo quieres cursos con matrículas, cambia a JOIN o INNER JOIN.",
        "note": "Evita NATURAL JOIN en material didáctico introductorio: empareja automáticamente todas las columnas con igual nombre y el resultado puede cambiar al modificar el esquema. ON deja la relación visible.",
        "practice": "Añade el nombre del alumno y limita la salida a cursos con un título concreto. Prueba mover el filtro del curso a WHERE y luego a ON; observa por separado el efecto sobre los cursos sin pareja.",
        "check": "Antes de ejecutar, cuenta qué filas deben sobrevivir sin pareja. Esa decisión determina si necesitas INNER o LEFT y dónde se coloca cada predicado.",
        "sources": [
            ("Expresiones de tablas y JOIN PostgreSQL", PG + "queries-table-expressions.html"),
            ("Sintaxis SELECT y JOIN MySQL 8.4", MYSQL + "select.html"),
        ],
    },
    {
        "title": "Subconsultas y EXISTS",
        "goal": "Plantear preguntas de pertenencia y ausencia sin duplicar las filas externas.",
        "explain": [
            "Una subconsulta puede expresar una condición dentro de otra consulta. EXISTS resulta verdadero cuando su subconsulta devuelve al menos una fila. Una subconsulta correlacionada puede referirse a la fila exterior mediante su alias.",
            "Para saber si un alumno tiene alguna matrícula, EXISTS describe directamente la pregunta y mantiene como máximo una fila por alumno, aunque haya muchas coincidencias internas. NOT EXISTS expresa la ausencia. La base puede transformar internamente la consulta; el código describe el resultado, no obliga a un plan concreto.",
        ],
        "code_label": "Alumnos con al menos una matrícula · PostgreSQL",
        "code": [
            "SELECT a.id, a.nombre",
            "FROM alumno AS a",
            "WHERE EXISTS (",
            "  SELECT 1 FROM matricula AS m",
            "  WHERE m.alumno_id = a.id",
            ");",
        ],
        "reading": "La condición interna comprueba cada alumno. SELECT 1 comunica que solo interesa la existencia de una fila; el valor seleccionado no es el dato que se devuelve al usuario.",
        "note": "NOT IN y NOT EXISTS no siempre son intercambiables si la subconsulta puede contener NULL: SQL usa lógica de tres valores. Para preguntas de existencia, EXISTS/NOT EXISTS evita esa ambigüedad semántica.",
        "practice": "Escribe una consulta de alumnos sin matrículas usando NOT EXISTS. Después crea un caso con dos matrículas para un alumno: ¿cuántas veces aparece con EXISTS?",
        "check": "El alumno aparece una sola vez por cada fila exterior que satisface la existencia; EXISTS no multiplica esa fila por cada matrícula encontrada.",
        "sources": [
            ("Subquery Expressions PostgreSQL", PG + "functions-subquery.html"),
            ("EXISTS Oracle 26", ORACLE + "EXISTS-Condition.html"),
        ],
    },
    {
        "title": "CTE y consultas recursivas",
        "goal": "Dividir una consulta compleja en pasos con WITH y entender el caso iterativo de una consulta recursiva.",
        "explain": [
            "Una expresión de tabla común (CTE) da un nombre a una subconsulta disponible durante una sentencia. Ayuda a separar etapas y a explicar una consulta; no es, por el mero hecho de usar WITH, una promesa de que se guarde físicamente ni de que la consulta sea más rápida.",
            "Una CTE recursiva combina un caso inicial (ancla) con un paso que vuelve a consultar el resultado anterior. El paso debe tener una condición de terminación. Es útil para jerarquías; sin un límite o condición correcta puede producir demasiadas filas o no terminar según el caso.",
        ],
        "code_label": "Generar la secuencia 1 a 5 · PostgreSQL",
        "code": [
            "WITH RECURSIVE numeros(n) AS (",
            "  SELECT 1",
            "  UNION ALL",
            "  SELECT n + 1 FROM numeros WHERE n < 5",
            ")",
            "SELECT n FROM numeros ORDER BY n;",
        ],
        "reading": "El ancla produce 1. Cada paso emite el número siguiente mientras n < 5; al llegar a 5 deja de producir filas. ORDER BY fija el orden que se muestra, no el orden intrínseco de evaluación.",
        "note": "PostgreSQL y MySQL escriben WITH RECURSIVE para este patrón. Oracle usa factorización recursiva con WITH y una cláusula recursiva, sin esa palabra clave. La sintaxis de ciclo y búsqueda también difiere.",
        "practice": "Adapta el ejemplo para generar de 1 a 10 y declara en una frase cuál es el ancla, cuál el paso y cuál la condición que detiene la expansión.",
        "check": "La secuencia esperada contiene cinco filas. Si quitas WHERE n < 5, retira la ejecución y revisa el límite de recursión de tu motor antes de experimentar.",
        "sources": [
            ("CTE PostgreSQL", PG + "queries-with.html"),
            ("CTE MySQL 8.4", MYSQL + "with.html"),
            ("Subconsulta recursiva Oracle 26", ORACLE + "SELECT.html"),
        ],
    },
    {
        "title": "INSERT, UPDATE y DELETE",
        "goal": "Modificar datos indicando las columnas y filas afectadas, y verificar el alcance antes de confirmar cambios.",
        "explain": [
            "INSERT crea filas, UPDATE modifica las que satisface WHERE y DELETE elimina las que satisface WHERE. En UPDATE y DELETE, omitir WHERE afecta a todas las filas; la sentencia es legal y puede ser intencionada, por lo que hay que revisar el filtro antes de ejecutarla.",
            "Usa listas explícitas de columnas en INSERT para no depender del orden del esquema. El ejemplo muestra RETURNING de PostgreSQL para observar filas afectadas en la misma operación; esa cláusula no tiene sintaxis idéntica en todos los motores.",
        ],
        "code_label": "Plantillas independientes · PostgreSQL",
        "code": [
            "INSERT INTO curso (titulo, precio)",
            "VALUES ('SQL inicial', 25.00) RETURNING id;",
            "",
            "UPDATE curso SET precio = 19.90",
            "WHERE id = 42 RETURNING id, precio;",
            "",
            "DELETE FROM curso WHERE id = 42",
            "RETURNING id;",
        ],
        "reading": "Son alternativas de ejemplo, no un único guion: si ejecutas las tres en secuencia, el DELETE elimina el curso actualizado. Antes de un cambio real, prueba primero el predicado con SELECT y confirma que identifica las filas esperadas.",
        "note": "RETURNING está documentado como extensión de PostgreSQL para estas sentencias. Los mecanismos para obtener el identificador generado y las formas de upsert cambian entre PostgreSQL, MySQL y Oracle.",
        "practice": "Escribe un UPDATE que desactive un curso solo cuando su id sea el elegido y esté activo. Antes, convierte la condición WHERE en un SELECT para estimar las filas afectadas.",
        "check": "Una respuesta segura contiene un filtro por id; si la vista previa devuelve más de una fila, no ejecutes el cambio hasta entender el motivo.",
        "sources": [
            ("INSERT PostgreSQL", PG + "sql-insert.html"),
            ("UPDATE PostgreSQL", PG + "sql-update.html"),
            ("DELETE PostgreSQL", PG + "sql-delete.html"),
        ],
    },
    {
        "title": "Transacciones y ACID",
        "goal": "Agrupar cambios relacionados y elegir entre COMMIT y ROLLBACK según el resultado comprobado.",
        "explain": [
            "Una transacción permite tratar una unidad de cambios de forma controlada: COMMIT la confirma; ROLLBACK revierte el trabajo no confirmado. ACID nombra atomicidad, consistencia, aislamiento y durabilidad, pero las capacidades dependen del motor de almacenamiento y de la configuración.",
            "En MySQL, InnoDB soporta transacciones ACID; no generalices automáticamente esa garantía a cualquier motor de almacenamiento. Oracle emite COMMIT implícitos alrededor de sentencias DDL; por ello, no traslades literalmente secuencias de DDL transaccionales entre motores.",
        ],
        "code_label": "Revisar un cambio antes de confirmarlo · PostgreSQL",
        "code": [
            "BEGIN;",
            "UPDATE curso SET precio = 19.90 WHERE id = 42;",
            "SELECT id, precio FROM curso WHERE id = 42;",
            "-- Si el resultado es correcto: COMMIT;",
            "-- Si no lo es: ROLLBACK;",
        ],
        "reading": "Las líneas de COMMIT y ROLLBACK son decisiones alternativas. El ejemplo mantiene la transacción abierta mientras verificas el resultado; una aplicación debe cerrar correctamente cada transacción incluso ante errores.",
        "note": "En PostgreSQL, BEGIN inicia un bloque de transacción. MySQL 8.4 documenta ACID para InnoDB. La documentación de Oracle describe COMMIT y ROLLBACK y advierte de los commits implícitos para DDL.",
        "practice": "Añade dos cambios que deban tener éxito juntos. Indica qué comprobación realizarías antes de COMMIT y qué caso debería provocar ROLLBACK.",
        "check": "Si uno de los cambios deja el conjunto de datos en un estado inválido, no confirmes solo la mitad: revierte la unidad y corrige la causa.",
        "sources": [
            ("Transacciones PostgreSQL", PG + "tutorial-transactions.html"),
            ("InnoDB y ACID MySQL 8.4", MYSQL + "innodb-introduction.html"),
            ("Transacciones Oracle 26", "https://docs.oracle.com/en/database/oracle/oracle-database/26/cncpt/transactions.html"),
            ("COMMIT Oracle 26", ORACLE + "COMMIT.html"),
        ],
    },
    {
        "title": "Claves y restricciones",
        "goal": "Declarar reglas de integridad en el esquema para que los datos válidos no dependan solo del código de aplicación.",
        "explain": [
            "PRIMARY KEY identifica de forma única cada fila y no admite NULL en sus columnas. FOREIGN KEY exige que la referencia apunte a una clave válida de la tabla relacionada. NOT NULL requiere un valor; UNIQUE evita duplicados según las reglas del motor; CHECK valida una condición sobre los valores sometidos a la restricción.",
            "Las restricciones viven junto a los datos y se comprueban al insertar o cambiar filas. En PostgreSQL, CHECK no debe usarse para validar otras filas o tablas: la documentación explica que esa suposición no garantiza consistencia ante cambios posteriores.",
        ],
        "code_label": "Reglas de integridad · PostgreSQL",
        "code": [
            "CREATE TABLE curso (",
            "  id integer PRIMARY KEY,",
            "  titulo text NOT NULL,",
            "  precio numeric(8,2) CHECK (precio >= 0),",
            "  codigo text UNIQUE",
            ");",
            "CREATE TABLE matricula (",
            "  alumno_id integer REFERENCES alumno(id),",
            "  curso_id integer REFERENCES curso(id),",
            "  PRIMARY KEY (alumno_id, curso_id)",
            ");",
        ],
        "reading": "La primera tabla prohíbe precios negativos y códigos duplicados. La segunda usa clave compuesta para evitar dos matrículas de la misma pareja. Si una referencia debe ser obligatoria, añade NOT NULL a cada columna de la clave foránea.",
        "note": "El soporte de restricciones puede depender del motor o almacenamiento. En MySQL 8.4, las claves foráneas se implementan por motores como InnoDB; no asumas el mismo comportamiento con cualquier storage engine.",
        "practice": "Añade una regla que limite el título a contenido obligatorio y otra que prohíba precio negativo. Describe qué error de datos bloquea cada una.",
        "check": "Las reglas de una fila caben en CHECK; la existencia de una fila relacionada corresponde a FOREIGN KEY; la identidad corresponde a PRIMARY KEY.",
        "sources": [
            ("Constraints PostgreSQL", PG + "ddl-constraints.html"),
            ("Foreign keys MySQL 8.4", MYSQL + "create-table-foreign-keys.html"),
            ("Constraints Oracle 26", ORACLE + "constraint.html"),
        ],
    },
    {
        "title": "Índices y EXPLAIN",
        "goal": "Relacionar índices con patrones de consulta y leer el plan como una estimación que debe contrastarse.",
        "explain": [
            "Un índice es una estructura auxiliar que puede ayudar a localizar filas o satisfacer partes de una consulta. No es una orden para el planificador: según el tamaño, la selectividad, las estadísticas y los costes, el motor puede preferir un escaneo secuencial.",
            "Los índices ocupan espacio y hay que mantenerlos al insertar, actualizar o eliminar. Añadir uno por intuición puede encarecer escrituras sin beneficiar consultas reales. EXPLAIN permite inspeccionar el plan previsto; las variantes que ejecutan y miden también ejecutan la consulta, por lo que hay que conocer sus efectos antes de usarlas con DML.",
        ],
        "code_label": "Crear un índice de búsqueda y consultar el plan · PostgreSQL",
        "code": [
            "CREATE INDEX idx_matricula_curso",
            "  ON matricula (curso_id);",
            "",
            "EXPLAIN",
            "SELECT alumno_id FROM matricula",
            "WHERE curso_id = 4;",
        ],
        "reading": "El índice puede servir a filtros y uniones por curso_id. La salida de EXPLAIN muestra nodos del plan y estimaciones; que no aparezca un Index Scan no prueba por sí solo un error.",
        "note": "PostgreSQL documenta EXPLAIN y EXPLAIN ANALYZE por separado; las variantes ANALYZE ejecutan la sentencia. MySQL 8.4 tiene su propio alcance y salida. Oracle EXPLAIN PLAN guarda el plan estimado en una tabla y puede diferir del plan de ejecución real. No compares literalmente nombres de nodos entre motores.",
        "practice": "Busca una consulta frecuente del proyecto. Anota el filtro o unión, predice qué índice podría ayudar y luego inspecciona el plan con datos representativos.",
        "check": "Una mejora real compara el mismo caso antes y después, considera tiempo y escrituras, y confirma que el plan usa una estrategia razonable para ese volumen.",
        "sources": [
            ("Introducción a índices PostgreSQL", PG + "indexes-intro.html"),
            ("EXPLAIN PostgreSQL", PG + "using-explain.html"),
            ("EXPLAIN MySQL 8.4", MYSQL + "explain.html"),
            ("EXPLAIN PLAN Oracle 26", ORACLE + "EXPLAIN-PLAN.html"),
        ],
    },
    {
        "title": "Vistas y lógica en el servidor",
        "goal": "Usar vistas para dar un nombre a consultas reutilizables y reconocer que rutinas y triggers son específicos del motor.",
        "explain": [
            "Una vista normal define una consulta con un nombre reutilizable. En PostgreSQL, la vista no se materializa físicamente: la consulta se ejecuta cuando se referencia. Una vista materializada es otro objeto y guarda resultados que deben actualizarse según las reglas del motor.",
            "Procedimientos, funciones y disparadores permiten lógica cercana a los datos, pero su lenguaje, delimitadores, tipos de retorno y reglas de ejecución no se portan automáticamente. Antes de diseñar esa lógica, define qué debe garantizar la base y qué pertenece a la aplicación; después consulta el manual exacto de la versión.",
        ],
        "code_label": "Vista reutilizable · PostgreSQL",
        "code": [
            "CREATE VIEW detalle_matriculas AS",
            "SELECT a.id AS alumno_id, a.nombre,",
            "       c.id AS curso_id, c.titulo, m.fecha",
            "FROM matricula AS m",
            "JOIN alumno AS a ON a.id = m.alumno_id",
            "JOIN curso AS c ON c.id = m.curso_id;",
            "",
            "SELECT * FROM detalle_matriculas;",
        ],
        "reading": "La vista proporciona un nombre y una forma de salida a la unión; no copia por defecto esas filas a una tabla independiente en PostgreSQL.",
        "note": "No presentes CREATE PROCEDURE ni la sintaxis de triggers como SQL universal. PostgreSQL, MySQL y Oracle documentan sintaxis y capacidades distintas para rutinas y disparadores.",
        "practice": "Crea una vista que muestre solo cursos activos. Explica quién puede consultarla y qué cambios en las tablas base afectarían su resultado.",
        "check": "Una vista normal vuelve a consultar las tablas subyacentes; si necesitas datos almacenados, investiga materialized views o el objeto equivalente de tu motor.",
        "sources": [
            ("CREATE VIEW PostgreSQL", PG18 + "sql-createview.html"),
            ("CREATE VIEW MySQL 8.4", MYSQL + "create-view.html"),
            ("CREATE VIEW Oracle 26", ORACLE + "CREATE-VIEW.html"),
            ("Vista materializada PostgreSQL", PG18 + "rules-materializedviews.html"),
            ("Rutinas MySQL 8.4", MYSQL + "create-procedure.html"),
            ("Procedimientos Oracle 26", "https://docs.oracle.com/en/database/oracle/oracle-database/26/lnpls/CREATE-PROCEDURE-statement.html"),
            ("CREATE TRIGGER PostgreSQL", PG + "sql-createtrigger.html"),
        ],
    },
    {
        "title": "Proyecto integrador y portabilidad",
        "goal": "Resolver un caso completo y separar reglas relacionales comunes de sintaxis propia de cada producto.",
        "explain": [
            "Diseña el catálogo y sus matrículas con claves y restricciones; escribe una consulta de lectura, otra de resumen y una modificación protegida por transacción. Documenta el resultado esperado con datos de ejemplo pequeños, incluyendo ausencia de matrículas, valores NULL y duplicados que deban rechazarse.",
            "Al pasar la solución de PostgreSQL a MySQL u Oracle, revisa tipos, generación de claves, paginación, funciones, DDL, transacciones y extensiones. Una consulta parecida no implica que cada detalle del resultado, precisión, bloqueo o plan sea idéntico.",
        ],
        "code_label": "Comparación puntual de sintaxis",
        "code": [
            "-- PostgreSQL / MySQL: pagina ordenada",
            "SELECT id, titulo FROM curso",
            "ORDER BY titulo, id LIMIT 10 OFFSET 20;",
            "",
            "-- Oracle: la misma idea de paginación",
            "SELECT id, titulo FROM curso",
            "ORDER BY titulo, id",
            "OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;",
        ],
        "reading": "El código está separado en dos alternativas; ejecútalo solo en el motor indicado. El orden por id desempata títulos repetidos. Las cláusulas de paginación son parecidas entre PostgreSQL y MySQL en esta forma, pero Oracle usa FETCH/OFFSET.",
        "note": "Generación automática de id: PostgreSQL y Oracle tienen columnas IDENTITY; MySQL usa AUTO_INCREMENT. Tipos, excepciones y opciones difieren: trata el esquema como una migración revisable, no como sustitución de palabras.",
        "practice": "Entrega un diagrama con tres tablas, el DDL de PostgreSQL, una consulta LEFT JOIN, un resumen con GROUP BY, una consulta NOT EXISTS y una modificación transaccional. Marca qué fragmentos cambiarían para MySQL y Oracle.",
        "check": "Revisión final: integridad referencial, filtro NULL correcto, orden total para paginar, condición WHERE comprobada antes de DML, y plan contrastado con datos representativos.",
        "sources": [
            ("LIMIT PostgreSQL", PG + "queries-limit.html"),
            ("SELECT MySQL 8.4", MYSQL + "select.html"),
            ("Row limiting Oracle 26", ORACLE + "SELECT.html"),
            ("Identity PostgreSQL", PG + "ddl-identity-columns.html"),
            ("AUTO_INCREMENT MySQL 8.4", MYSQL + "create-table.html"),
            ("Identity Oracle 26", ORACLE + "CREATE-TABLE.html"),
        ],
    },
]


def draw_wrapped(c, text, style, y, x=LEFT, width=CONTENT_W):
    p = Paragraph(escape(text, quote=False), style)
    w, h = p.wrap(width, PAGE_H)
    if y - h < BOTTOM:
        raise ValueError(f"Contenido fuera de página: {text[:70]!r}; y={y:.1f}, h={h:.1f}")
    p.drawOn(c, x, y - h)
    return y - h


def draw_label(c, text, y, color=TEAL):
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", 8.2)
    c.drawString(LEFT, y - 8.3, text.upper())
    return y - 17


def draw_card(c, text, y, fill, style=SMALL, pad_x=11, pad_y=9):
    p = Paragraph(escape(text, quote=False), style)
    w, h = p.wrap(CONTENT_W - 2 * pad_x, PAGE_H)
    card_h = h + 2 * pad_y
    if y - card_h < BOTTOM:
        raise ValueError(f"Tarjeta fuera de página: {text[:70]!r}; y={y:.1f}, h={card_h:.1f}")
    c.setFillColor(fill)
    c.setStrokeColor(LINE)
    c.roundRect(LEFT, y - card_h, CONTENT_W, card_h, 7, fill=1, stroke=1)
    p.drawOn(c, LEFT + pad_x, y - pad_y - h)
    return y - card_h


def draw_code(c, label, lines, y):
    font_size = 7.7
    leading = 9.8
    max_w = max((stringWidth(line, "Courier", font_size) for line in lines), default=0)
    if max_w > CONTENT_W - 28:
        raise ValueError(f"Línea de código demasiado larga en {label}: {max_w:.1f} pt")
    code_h = len(lines) * leading
    box_h = code_h + 31
    if y - box_h < BOTTOM:
        raise ValueError(f"Ejemplo fuera de página: {label}; y={y:.1f}, h={box_h:.1f}")
    c.setFillColor(INK)
    c.roundRect(LEFT, y - box_h, CONTENT_W, box_h, 7, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#81D2D4"))
    c.setFont("Helvetica-Bold", 7.8)
    c.drawString(LEFT + 12, y - 15, label.upper())
    c.setFillColor(WHITE)
    c.setFont("Courier", font_size)
    code_y = y - 29
    for line in lines:
        c.drawString(LEFT + 12, code_y, line)
        code_y -= leading
    return y - box_h


def draw_sources(c, sources, y):
    items = []
    for name, url in sources:
        items.append(f'<link href="{escape(url, quote=True)}" color="#087E8B">{escape(name, quote=False)}</link>')
    p = Paragraph(" · ".join(items), SOURCES)
    w, h = p.wrap(CONTENT_W, PAGE_H)
    if y - h < BOTTOM:
        raise ValueError(f"Fuentes fuera de página: y={y:.1f}, h={h:.1f}")
    p.drawOn(c, LEFT, y - h)
    return y - h


def draw_page(c, lesson, number):
    c.setFillColor(colors.HexColor("#F8FAFC"))
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(INK)
    c.rect(0, PAGE_H - 8, PAGE_W, 8, fill=1, stroke=0)
    c.setFillColor(TEAL)
    c.rect(0, PAGE_H - 8, PAGE_W * (number / len(LESSONS)), 8, fill=1, stroke=0)

    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(LEFT, PAGE_H - 31, "CÓDIGOCLARO  /  RUTA SQL")
    c.setFont("Helvetica", 8)
    c.drawRightString(RIGHT, PAGE_H - 31, f"TEMA {number:02d} / {len(LESSONS)}")

    y = PAGE_H - 56
    title = Paragraph(escape(lesson["title"], quote=False), TITLE)
    _, h = title.wrap(CONTENT_W, 80)
    title.drawOn(c, LEFT, y - h)
    y -= h + 9

    y = draw_label(c, "Objetivo", y)
    y = draw_wrapped(c, lesson["goal"], BODY, y)
    y -= 7

    y = draw_label(c, "Explicación", y)
    for paragraph in lesson["explain"]:
        y = draw_wrapped(c, paragraph, BODY, y)
        y -= 5

    y = draw_label(c, "Ejemplo guiado", y)
    y = draw_code(c, lesson["code_label"], lesson["code"], y)
    y -= 8

    y = draw_label(c, "Lectura del ejemplo", y)
    y = draw_wrapped(c, lesson["reading"], SMALL, y)
    y -= 7

    y = draw_label(c, "Portabilidad", y, color=colors.HexColor("#A26300"))
    y = draw_card(c, lesson["note"], y, PALE_GOLD)
    y -= 7

    y = draw_label(c, "Practica y comprueba", y)
    y = draw_card(c, lesson["practice"] + "\n\nComprobación: " + lesson["check"], y, PALE_BLUE)
    y -= 7

    y = draw_label(c, "Fuentes oficiales · enlaces clicables", y, color=MUTED)
    y = draw_sources(c, lesson["sources"], y)

    c.setStrokeColor(LINE)
    c.line(LEFT, 38, RIGHT, 38)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 7.5)
    c.drawString(LEFT, 25, "Ejemplos PostgreSQL salvo que el bloque indique otro dialecto.")
    c.drawRightString(RIGHT, 25, "SQL relacional · Material de estudio")
    c.showPage()


def make_pdf():
    if len(LESSONS) != 15:
        raise ValueError(f"Se esperaban 15 temas y hay {len(LESSONS)}")
    return build_route_pdf_bytes(
        route_name="SQL · Oracle, MySQL y PostgreSQL",
        title="SQL relacional: Oracle, MySQL y PostgreSQL",
        subtitle="15 temas · ejemplos etiquetados por dialecto · documentación oficial enlazada",
        lessons=LESSONS,
        author="CódigoClaro · síntesis basada en los manuales oficiales de PostgreSQL, MySQL y Oracle",
        subject="Guía de estudio de SQL relacional con ejemplos etiquetados por dialecto",
        editorial_note="Las diferencias entre motores se señalan en cada tema y se enlazan a la documentación del producto correspondiente.",
        closing_project={
            "title": "Proyecto integrador · matrículas de módulos",
            "objective": "Diseña una base pequeña para gestionar alumnos, módulos y matrículas. La práctica se ejecuta en una base local desechable; antes de cambiar un sistema real, revisa permisos, copias y dialecto.",
            "steps": [
                "Dibuja las tablas alumno, modulo y matricula; marca claves primarias, claves foráneas y la regla que impide duplicar la misma matrícula.",
                "Escribe el DDL para el motor elegido y etiqueta cualquier diferencia de identity, tipos de texto o generación de claves.",
                "Inserta dos alumnos y dos módulos. Añade matrículas dentro de una transacción y consulta el resultado con JOIN.",
                "Prepara una consulta parametrizada para buscar matrículas por alumno; no unas valores de usuario mediante concatenación de cadenas.",
            ],
            "checks": [
                "Un id de alumno inexistente se rechaza por la clave foránea.",
                "Una matrícula duplicada no crea una segunda relación.",
                "El informe muestra cero, una o varias matrículas sin cambiar el esquema.",
            ],
            "reflection": "Compara el SQL común con el dialecto concreto que ejecutaste. Anota qué sintaxis depende de PostgreSQL, MySQL u Oracle y comprueba las diferencias en la documentación oficial enlazada antes de reutilizarla.",
        },
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
