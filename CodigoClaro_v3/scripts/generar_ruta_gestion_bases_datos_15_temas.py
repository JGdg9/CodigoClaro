#!/usr/bin/env python3
"""Genera la ruta didáctica de bases de datos en dos ubicaciones organizadas."""

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
    ROOT / "docs" / "temarios" / "Ruta_Gestion_Bases_Datos_15_Temas.pdf",
    ROOT / "public" / "temarios" / "Ruta_Gestion_Bases_Datos_15_Temas.pdf",
)

PG = "https://www.postgresql.org/docs/18/"
ORACLE = "https://docs.oracle.com/en/database/oracle/oracle-database/26/dwhsg/data-warehouse-logical-design.html"
INK = colors.HexColor("#17243A")
MUTED = colors.HexColor("#526477")
TEAL = colors.HexColor("#087E8B")
PALE_BLUE = colors.HexColor("#F1F6F8")
PALE_GOLD = colors.HexColor("#FFF5DF")
LINE = colors.HexColor("#D6E1E8")
WHITE = colors.white
PAGE_W, PAGE_H = A4
LEFT, RIGHT, BOTTOM = 46, A4[0] - 46, 50
CONTENT_W = RIGHT - LEFT

BODY = ParagraphStyle("Body", fontName="Helvetica", fontSize=9.05, leading=11.8,
                      textColor=INK, alignment=TA_LEFT, spaceAfter=0)
SMALL = ParagraphStyle("Small", fontName="Helvetica", fontSize=8.15, leading=10.1,
                       textColor=INK, alignment=TA_LEFT, spaceAfter=0)
SOURCES = ParagraphStyle("Sources", fontName="Helvetica", fontSize=7.45, leading=9.2,
                         textColor=MUTED, alignment=TA_LEFT, spaceAfter=0)
TITLE = ParagraphStyle("Title", fontName="Helvetica-Bold", fontSize=20,
                       leading=23.5, textColor=INK, alignment=TA_LEFT, spaceAfter=0)


LESSONS = [
    {
        "title": "Requisitos y modelo de datos",
        "goal": "Traducir necesidades operativas en reglas de datos antes de escoger tablas, tipos o índices.",
        "explain": [
            "Empieza por quién registra y consulta datos, qué eventos deben conservarse, qué relaciones existen y qué significa que un dato sea válido. Distingue el modelo conceptual y lógico de las decisiones físicas de almacenamiento y rendimiento.",
            "Usaremos una biblioteca de práctica. La regla de que un ejemplar solo puede tener un préstamo activo se asume para el ejercicio; una organización real debe confirmar sus políticas, retención y recuperación esperada con sus responsables.",
        ],
        "code_label": "Ficha de requisitos antes del DDL · modelo didáctico",
        "code": [
            "Entidades: Socio, Ejemplar, Prestamo",
            "Evento: apertura y devolucion de un prestamo",
            "Regla asumida: un ejemplar tiene como maximo",
            "            un prestamo activo a la vez",
            "Pendiente: confirmar plazos y datos que se retienen",
        ],
        "reading": "Cada regla debe convertirse en una decisión que pueda revisarse: una relación, una restricción, una transacción o un procedimiento operativo. Separa los requisitos confirmados de las hipótesis del ejercicio.",
        "note": "El modelado lógico no decide por sí solo el motor, el particionado, la estrategia de backup ni los controles de privacidad. Esas decisiones se contrastan con carga, plataforma y requisitos de la organización.",
        "practice": "Entrevista a un usuario hipotético de biblioteca. Anota actores, búsquedas, cambios permitidos, excepciones y cuánto tiempo debe conservarse cada dato.",
        "check": "Puedes señalar qué afirmaciones son requisitos confirmados y qué preguntas siguen abiertas antes de crear el esquema.",
        "sources": [
            ("Diseño lógico y físico · Oracle", ORACLE),
            ("Definición de datos · PostgreSQL", PG + "ddl.html"),
        ],
    },
    {
        "title": "Modelo entidad-relación",
        "goal": "Representar entidades, atributos, identificadores y cardinalidades antes de transformarlos en tablas.",
        "explain": [
            "Una entidad representa algo sobre lo que se conserva información; sus atributos describen ese objeto y una relación expresa cómo se asocia con otros. En el caso de préstamos, un socio puede tener varios préstamos a lo largo del tiempo y cada préstamo se refiere a un socio y un ejemplar.",
            "La cardinalidad describe cuántos elementos pueden relacionarse. La regla temporal de un solo préstamo activo por ejemplar exige una restricción adicional: no queda expresada únicamente con el dibujo 1:N.",
        ],
        "code_label": "Relaciones del caso de biblioteca · esquema conceptual",
        "code": [
            "SOCIO    (1) ---- (N) PRESTAMO",
            "EJEMPLAR (1) ---- (N) PRESTAMO",
            "Cada PRESTAMO apunta a un socio y un ejemplar",
            "Regla aparte: 0..1 prestamo activo por ejemplar",
        ],
        "reading": "En el modelo relacional, la clave foránea suele ubicarse en el lado N: prestamo guarda referencias al socio y al ejemplar. Las cardinalidades y opcionalidades deben corresponder a reglas del dominio, no a una conveniencia del diagrama.",
        "note": "El dibujo es una notación textual abreviada, no un diagrama ER completo. Antes de implantarlo, aclara participación opcional, historial, borrados y si los identificadores son naturales o sustitutos.",
        "practice": "Añade la entidad Sede si los ejemplares pertenecen a una sucursal. Especifica si una sede puede existir sin ejemplares y qué relación expresa esa regla.",
        "check": "Puedes leer cada relación en ambos sentidos y justificar dónde quedará cada referencia al pasar de entidades a tablas.",
        "sources": [
            ("Modelado entidad-relación · Oracle", ORACLE),
            ("Claves foráneas · PostgreSQL", PG + "tutorial-fk.html"),
        ],
    },
    {
        "title": "Normalización: 1FN, 2FN y 3FN",
        "goal": "Detectar grupos repetidos y dependencias que generan duplicación y anomalías al insertar, cambiar o borrar datos.",
        "explain": [
            "En una introducción relacional, 1FN evita grupos repetidos y guarda un valor por atributo. 2FN requiere 1FN y elimina dependencias parciales respecto de una clave candidata compuesta. 3FN reduce dependencias transitivas de atributos no clave sobre la clave.",
            "Ejemplo: si id_socio determina nombre_socio, guardar el nombre en cada préstamo repite el mismo hecho. Separa Socio(id_socio, nombre) de Prestamo(id_prestamo, id_socio, fecha). La normalización reduce anomalías, aunque el diseño debe considerar también las consultas y su carga.",
        ],
        "code_label": "Señales para descomponer una tabla · conceptos relacionales",
        "code": [
            "1FN: sin columnas repetidas ni listas en una celda",
            "2FN: atributos no clave dependen de la clave completa",
            "     (importa cuando la clave candidata es compuesta)",
            "3FN: separa dependencias transitivas no clave",
            "Socio(id_socio, nombre) <- Prestamo(id_socio, fecha)",
        ],
        "reading": "La última línea indica que Prestamo conserva la clave de Socio, mientras el nombre vive una sola vez en Socio. En una tabla de líneas con clave (pedido, numero_linea), un nombre de producto que depende solo de producto_id es una señal de dependencia parcial.",
        "note": "Las definiciones introductorias pueden simplificarse; la teoría formal se expresa con claves candidatas y dependencias funcionales. No desnormalices por intuición: identifica primero una necesidad medida y conserva una fuente de verdad clara.",
        "practice": "Revisa una tabla Pedido(pedido_id, cliente_id, nombre_cliente, fecha, producto_id, nombre_producto, cantidad). Propón descomposición y señala qué atributo depende de qué clave.",
        "check": "Puedes describir al menos una anomalía que evita cada separación y explicar por qué 2FN exige atención especial con claves compuestas.",
        "sources": [
            ("Normalización · Oracle Database 26", ORACLE),
            ("Restricciones y claves · PostgreSQL", PG + "ddl-constraints.html"),
        ],
    },
    {
        "title": "Claves primarias y foráneas",
        "goal": "Identificar filas de forma estable y enlazar tablas con integridad referencial.",
        "explain": [
            "Una clave primaria identifica una fila y no admite duplicados ni NULL. Una clave foránea exige que cada valor referenciado tenga una fila correspondiente en la tabla destino, salvo cuando la relación es opcional y la columna admite NULL.",
            "PostgreSQL crea un índice para la clave primaria, pero no crea automáticamente un índice en todas las columnas que referencian una clave foránea. El índice hijo depende de las consultas y del coste de actualizar o borrar filas padre.",
        ],
        "code_label": "Dos tablas vinculadas · PostgreSQL 18",
        "code": [
            "CREATE TABLE socio (",
            "  id_socio bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,",
            "  nombre text NOT NULL",
            ");",
            "CREATE TABLE prestamo (",
            "  id_prestamo bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,",
            "  id_socio bigint NOT NULL REFERENCES socio(id_socio),",
            "  fecha_prestamo date NOT NULL DEFAULT CURRENT_DATE",
            ");",
        ],
        "reading": "La segunda tabla no puede almacenar un id_socio inexistente. La columna REFERENCES apunta a la clave de socio; PRIMARY KEY también declara unicidad y ausencia de NULL. DEFAULT CURRENT_DATE completa fecha_prestamo al insertar si se omite, usando la fecha de inicio de la transacción.",
        "note": "La sintaxis del ejemplo usa columnas identity de PostgreSQL. Otros motores y versiones ofrecen mecanismos de generación de claves con sintaxis y detalles distintos.",
        "practice": "Decide si id_ejemplar debe ser clave natural o sustituta. Añade la relación de Prestamo con Ejemplar y analiza qué debe pasar si se intenta borrar un ejemplar con historial.",
        "check": "Prueba mentalmente un duplicado de clave primaria, un NULL y una referencia inexistente; puedes explicar qué regla rechaza cada caso.",
        "sources": [
            ("Primary keys y foreign keys · PostgreSQL", PG + "ddl-constraints.html"),
            ("Tutorial de claves foráneas · PostgreSQL", PG + "tutorial-fk.html"),
            ("Valores por defecto · PostgreSQL", PG + "ddl-default.html"),
            ("Fecha y hora actuales · PostgreSQL", PG + "functions-datetime.html"),
        ],
    },
    {
        "title": "Restricciones de integridad",
        "goal": "Expresar reglas locales de validez en el esquema y distinguirlas de reglas que requieren coordinación entre filas.",
        "explain": [
            "NOT NULL exige un valor; UNIQUE impide duplicados; CHECK evalúa una condición de la fila; una clave foránea protege referencias. Poner la regla cerca de los datos evita que una ruta de escritura alternativa la omita.",
            "En PostgreSQL, un CHECK que evalúa a NULL no rechaza la fila. Por eso una columna obligatoria suele requerir además NOT NULL. Un CHECK no es el mecanismo para garantizar condiciones que dependen de otras filas o tablas.",
        ],
        "code_label": "Restringir valores de ejemplar · PostgreSQL 18",
        "code": [
            "CREATE TABLE ejemplar (",
            "  id_ejemplar bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,",
            "  codigo text NOT NULL UNIQUE,",
            "  estado text NOT NULL CHECK",
            "    (estado IN ('disponible', 'baja'))",
            ");",
        ],
        "reading": "La clave primaria identifica la fila; el código debe estar presente y ser único; el estado solo puede tomar uno de los dos valores enumerados. Si estado omitiera NOT NULL, el CHECK por sí solo permitiría NULL.",
        "note": "La lista de estados es una política de ejemplo. CHECK en PostgreSQL está pensado para la fila actual; usa claves foráneas o restricciones únicas para relaciones y unicidad, y diseña transacciones para reglas concurrentes más amplias.",
        "practice": "Añade fecha_alta NOT NULL y una condición que impida una fecha posterior a la fecha de hoy solo si la regla debe ser evaluada al insertar; analiza qué pasa si el día cambia después.",
        "check": "Cada regla tiene un mecanismo adecuado y sabes identificar el caso NULL que una condición CHECK podría dejar pasar.",
        "sources": [
            ("CHECK, NOT NULL, UNIQUE y claves · PostgreSQL", PG + "ddl-constraints.html"),
            ("CREATE TABLE · PostgreSQL", PG + "sql-createtable.html"),
        ],
    },
    {
        "title": "Transacciones y propiedades ACID",
        "goal": "Agrupar cambios que forman una sola operación y saber cuándo confirmar o revertirlos.",
        "explain": [
            "Una transacción hace que varios pasos se confirmen como una unidad o se reviertan si la operación no puede completarse. ACID resume atomicidad, consistencia, aislamiento y durabilidad; las garantías concretas dependen también del motor, su configuración y el nivel de aislamiento.",
            "Una transferencia actualiza dos cuentas. Si solo se guarda el débito o solo el abono, el resultado es incorrecto. BEGIN abre el trabajo, COMMIT lo confirma y ROLLBACK solicita deshacer los cambios pendientes.",
        ],
        "code_label": "Agrupar dos actualizaciones · PostgreSQL 18",
        "code": [
            "BEGIN;",
            "UPDATE cuenta SET saldo = saldo - 20 WHERE id = 1;",
            "UPDATE cuenta SET saldo = saldo + 20 WHERE id = 2;",
            "COMMIT;",
            "-- Si la operacion no es valida: ROLLBACK;",
        ],
        "reading": "El ejemplo muestra el límite transaccional, no toda la lógica de una transferencia. La aplicación debe comprobar que existen las cuentas, que el saldo es suficiente y que el número de filas actualizado coincide con lo esperado.",
        "note": "Una transacción no arregla por sí sola una regla de negocio mal definida. La durabilidad y el aislamiento son garantías del motor bajo sus condiciones documentadas, no sustituyen backups ni tratamiento de errores.",
        "practice": "Simula una biblioteca: inserta el préstamo y cambia la disponibilidad del ejemplar en la misma transacción. Decide qué hacer si el ejemplar ya no está disponible.",
        "check": "Puedes indicar qué cambios se revierten si falla el segundo paso y qué comprobaciones necesita el caso de uso antes de confirmar.",
        "sources": [
            ("Transacciones · PostgreSQL", PG + "tutorial-transactions.html"),
            ("Aislamiento de transacciones · PostgreSQL", PG + "transaction-iso.html"),
        ],
    },
    {
        "title": "Bloqueos y concurrencia",
        "goal": "Coordinar transacciones que compiten por una misma fila sin asumir que las lecturas serializan los cambios.",
        "explain": [
            "PostgreSQL usa MVCC para que las sesiones puedan leer versiones consistentes mientras otras transacciones trabajan. Cuando una regla exige tomar una fila y modificarla como unidad, SELECT FOR UPDATE puede bloquear cambios incompatibles hasta que termine la transacción.",
            "Los bloqueos duran hasta COMMIT o ROLLBACK. Mantén la transacción corta: esperas largas reducen concurrencia y bloqueos cruzados pueden producir deadlocks, que el motor detecta y resuelve abortando una transacción.",
        ],
        "code_label": "Reservar un ejemplar con bloqueo de fila · PostgreSQL 18",
        "code": [
            "BEGIN;",
            "SELECT disponible FROM ejemplar",
            "WHERE id_ejemplar = 7 FOR UPDATE;",
            "-- La aplicacion valida que disponible sea true",
            "UPDATE ejemplar SET disponible = false",
            "WHERE id_ejemplar = 7;",
            "COMMIT;",
        ],
        "reading": "La fila seleccionada queda protegida frente a otros escritores y sesiones que intenten bloquearla con modos incompatibles. Las lecturas ordinarias no quedan bloqueadas por un row lock; la aplicación debe tratar el caso de que no haya fila.",
        "note": "El ejemplo muestra una secuencia educativa y omite el control de errores del cliente. Un bloqueo explícito no reemplaza una restricción de integridad ni una estrategia de reintento ante deadlocks o fallos de serialización.",
        "practice": "Abre dos sesiones sobre el mismo ejemplar y describe cuál espera. Repite la operación sobre ejemplares distintos y observa por qué un bloqueo a nivel de fila permite más concurrencia que bloquear toda la tabla.",
        "check": "Sabes cuándo se libera el bloqueo, qué operaciones pueden esperar y por qué una transacción no debe quedarse abierta mientras el usuario decide.",
        "sources": [
            ("Control de concurrencia y MVCC · PostgreSQL", PG + "mvcc.html"),
            ("Bloqueos explícitos y deadlocks · PostgreSQL", PG + "explicit-locking.html"),
        ],
    },
    {
        "title": "Índices y planes de ejecución",
        "goal": "Relacionar un índice con un patrón de consulta y revisar el plan que el optimizador eligió.",
        "explain": [
            "Un índice puede ayudar a encontrar filas o producir un orden sin recorrer toda la tabla, pero consume espacio y añade trabajo a inserciones, cambios y borrados. El optimizador decide si le conviene según consulta, distribución de datos y estadísticas.",
            "EXPLAIN muestra el plan estimado. EXPLAIN ANALYZE ejecuta la consulta y añade medidas reales; úsalo aquí con un SELECT de solo lectura y entiende primero sus efectos si lo aplicas a una sentencia que modifica datos.",
        ],
        "code_label": "Índice y diagnóstico de una consulta · PostgreSQL 18",
        "code": [
            "CREATE INDEX ix_prestamo_socio_fecha",
            "  ON prestamo (id_socio, fecha_prestamo);",
            "EXPLAIN (ANALYZE, BUFFERS)",
            "SELECT id_prestamo FROM prestamo",
            "WHERE id_socio = 42",
            "ORDER BY fecha_prestamo DESC;",
        ],
        "reading": "El índice compuesto empieza por id_socio y luego fecha_prestamo, coherente con el filtro y orden del ejemplo. No garantiza que el planificador lo use: inspecciona filas estimadas y reales antes de decidir si el índice aporta.",
        "note": "Los costes y planes dependen del conjunto de datos, estadísticas, configuración y hardware. No copies una recomendación de índice sin comparar consultas representativas y el coste de escritura.",
        "practice": "Compara EXPLAIN para una consulta por socio con y sin el índice. Guarda el plan y explica qué nodo cambia; evita medir sobre datos diminutos como si fueran carga real.",
        "check": "Puedes distinguir un plan estimado de una ejecución medida y justificar qué consulta concreta pretende acelerar el índice.",
        "sources": [
            ("Índices · PostgreSQL", PG + "indexes.html"),
            ("EXPLAIN y EXPLAIN ANALYZE · PostgreSQL", PG + "using-explain.html"),
        ],
    },
    {
        "title": "Usuarios, roles y privilegios",
        "goal": "Separar propiedad de objetos, identidad de conexión y permisos concedidos a cada función.",
        "explain": [
            "En PostgreSQL, los roles pueden representar usuarios, grupos o ambos. El propietario de un objeto tiene facultades propias; los demás reciben permisos explícitos con GRANT y pueden perderlos con REVOKE.",
            "Asigna al rol de una aplicación solo los permisos que necesita. Para usar una tabla dentro de un esquema hacen falta permisos adecuados en el esquema y en el objeto; USAGE sobre el esquema no concede por sí solo lectura de la tabla.",
        ],
        "code_label": "Permiso de lectura limitado · PostgreSQL 18",
        "code": [
            "CREATE ROLE informes NOLOGIN;",
            "GRANT USAGE ON SCHEMA biblioteca TO informes;",
            "GRANT SELECT ON biblioteca.prestamo TO informes;",
            "-- Sin INSERT, UPDATE ni DELETE",
        ],
        "reading": "El rol puede resolver objetos del esquema y leer la tabla indicada, pero no recibe permisos de escritura por estas instrucciones. Un rol NOLOGIN puede servir como grupo de privilegios que luego se concede a roles de conexión.",
        "note": "El ejemplo no revoca permisos preexistentes ni configura acceso a la base de datos o secuencias. Revisa privilegios predeterminados, membresías y propiedad de objetos al desplegar en un entorno real.",
        "practice": "Diseña tres roles: propietario de migraciones, aplicación de escritura y analista de solo lectura. Enumera qué tablas y operaciones necesita cada uno.",
        "check": "Puedes explicar por qué USAGE en un esquema no equivale a SELECT y qué acciones evita cada privilegio omitido.",
        "sources": [
            ("Roles de base de datos · PostgreSQL", PG + "user-manag.html"),
            ("Privilegios · PostgreSQL", PG + "ddl-priv.html"),
            ("GRANT · PostgreSQL", PG + "sql-grant.html"),
        ],
    },
    {
        "title": "Copias de seguridad",
        "goal": "Elegir una estrategia de backup de acuerdo con el alcance de recuperación y conservar una copia verificable.",
        "explain": [
            "PostgreSQL describe tres enfoques distintos: volcado SQL, copia del sistema de archivos y archivado continuo de WAL. pg_dump exporta una base de datos de forma consistente mientras se usa; no incluye por sí solo todos los objetos globales del clúster, como roles.",
            "Una política debe definir frecuencia, retención, ubicación separada del servidor, cifrado y objetivos de recuperación. El resultado no se considera suficiente hasta que se ha probado una restauración y se han revisado sus permisos y contenido.",
        ],
        "code_label": "Volcado lógico en formato de archivo · PostgreSQL 18",
        "code": [
            "pg_dump -Fc -f biblioteca.dump biblioteca",
            "# -Fc crea un archivo de formato custom",
            "# El destino y la retencion se definen aparte",
        ],
        "reading": "El formato custom se restaura con pg_restore y permite seleccionar objetos. El comando se limita a una base; revisa pg_dumpall u otro procedimiento para roles y demás objetos globales.",
        "note": "Un volcado lógico puede no ser la estrategia adecuada para backups regulares de producción de gran tamaño. Compara recuperación lógica, copia física y PITR con la documentación y el tamaño real del servicio.",
        "practice": "Escribe un calendario de backup para una base de práctica: qué se copia, a qué medio separado, quién puede leerlo y qué prueba periódica confirmará que el archivo es utilizable.",
        "check": "Puedes distinguir un backup por base de uno del clúster y explicar cómo probarías una copia sin sobrescribir el origen.",
        "sources": [
            ("Estrategias de backup y restore · PostgreSQL", PG + "backup.html"),
            ("pg_dump · PostgreSQL", PG + "app-pgdump.html"),
        ],
    },
    {
        "title": "Restauración y recuperación",
        "goal": "Diferenciar restaurar un archivo lógico de reconstruir un servidor y recuperar hasta un punto en el tiempo.",
        "explain": [
            "Un archivo pg_dump en formato custom se reconstruye con pg_restore. PITR requiere una copia base compatible y una secuencia archivada de WAL; no se obtiene solo porque exista un volcado SQL.",
            "Una prueba útil restaura en un destino aislado, comprueba tablas y conteos relevantes, ejecuta una consulta de negocio y documenta cuánto tardó. Restaurar sobre el único original sin validar el objetivo puede aumentar el daño.",
        ],
        "code_label": "Ensayo de restauración en una base nueva · PostgreSQL 18",
        "code": [
            "createdb biblioteca_prueba",
            "pg_restore --no-owner --no-privileges -d biblioteca_prueba biblioteca.dump",
            "# Verificar objetos y consultas antes de aceptar",
        ],
        "reading": "El ejemplo presupone que biblioteca.dump se creó con pg_dump -Fc. La opción omite propietarios y ACL del archivo, lo que evita exigir que existan esos roles durante el ensayo; el entorno final puede requerir restaurar también permisos.",
        "note": "Para PITR, define un objetivo temporal alcanzable después del fin de la copia base y conserva la cadena necesaria de WAL. El procedimiento exacto incluye configuración del servidor y no se reduce a pg_restore.",
        "practice": "Restaura el archivo de práctica en otra base y redacta un acta con versión del motor, hora, errores, conteos y consulta de aceptación; no ejecutes el ensayo sobre datos de producción.",
        "check": "Puedes decidir si una incidencia exige restaurar objetos de un dump, una base completa o una copia base más WAL hasta un instante objetivo.",
        "sources": [
            ("pg_restore · PostgreSQL", PG + "app-pgrestore.html"),
            ("Recuperación PITR · PostgreSQL", PG + "continuous-archiving.html"),
            ("Backup y restauración · PostgreSQL", PG + "backup.html"),
        ],
    },
    {
        "title": "Migraciones de esquema",
        "goal": "Cambiar el esquema con pasos versionados, revisables y compatibles con los datos y la aplicación.",
        "explain": [
            "Una migración es un cambio controlado del esquema y, a veces, de los datos. Guarda cada paso con versión y una descripción; revisa precondiciones, orden, reversión posible, ventana de ejecución, backup y compatibilidad con las versiones de la aplicación que estarán activas.",
            "En PostgreSQL, ALTER TABLE tiene subformas con niveles de bloqueo distintos. Añadir una restricción puede recorrer filas existentes; una migración pequeña no siempre tiene coste pequeño en una tabla grande.",
        ],
        "code_label": "Migración aditiva y acotada · PostgreSQL 18",
        "code": [
            "BEGIN;",
            "ALTER TABLE prestamo",
            "  ADD COLUMN fecha_devolucion date;",
            "COMMIT;",
        ],
        "reading": "El cambio agrega una columna opcional y no borra información existente. La aplicación debe tolerar que esa columna esté vacía durante el despliegue; el control externo debe registrar qué versión de migración quedó aplicada.",
        "note": "No todas las operaciones de DDL tienen el mismo bloqueo, duración o reversibilidad. Inspecciona la forma exacta en el manual de la versión destino y prueba con volumen y concurrencia representativos.",
        "practice": "Añade estado_devuelto en una migración nueva. Planifica cómo desplegar primero el lector tolerante, rellenar datos antiguos y luego imponer una restricción sin interrumpir el servicio.",
        "check": "Puedes describir el estado del esquema antes y después, cómo detectar si el paso ya se aplicó y qué riesgo operativo tiene la instrucción.",
        "sources": [
            ("ALTER TABLE y bloqueos · PostgreSQL", PG + "sql-altertable.html"),
            ("Definición y restricciones · PostgreSQL", PG + "ddl.html"),
        ],
    },
    {
        "title": "Auditoría, logs y trazabilidad",
        "goal": "Registrar eventos operativos útiles sin tratar cualquier log SQL como un historial de auditoría completo.",
        "explain": [
            "Los logs de PostgreSQL pueden registrar DDL, modificaciones, errores y esperas de bloqueo. La configuración permite escoger destino y formato; CSV facilita el análisis estructurado cuando el recolector de logs está habilitado.",
            "El log_statement puede registrar texto de sentencias y parámetros; ciertos registros pueden revelar información sensible o contraseñas en claro. Registra lo necesario, limita acceso y retención, y decide por separado qué identidad y evento necesita una auditoría de negocio.",
        ],
        "code_label": "Configuración ilustrativa del servidor · PostgreSQL 18",
        "code": [
            "# En postgresql.conf; no es una sentencia SQL",
            "logging_collector = on",
            "log_destination = 'csvlog'",
            "log_statement = 'ddl'",
        ],
        "reading": "CSV requiere logging_collector. ddl registra sentencias de definición como CREATE, ALTER y DROP, no todas las modificaciones de filas. Cambiar esta configuración requiere revisar permisos y estrategia de rotación de logs.",
        "note": "La captura de sentencias no prueba por sí sola quién autorizó una operación ni cubre los eventos de la aplicación. PostgreSQL advierte que los logs pueden contener datos sensibles; protégelos como datos del sistema.",
        "practice": "Define qué evento de préstamo debe poder reconstruirse, qué identificador de usuario lo vincula y qué dato no debe copiarse al log. Compara el registro de aplicación con el log del servidor.",
        "check": "Puedes identificar qué registra ddl, por qué csv necesita el recolector y qué riesgos presenta habilitar el registro indiscriminado.",
        "sources": [
            ("Error reporting y logging · PostgreSQL", PG + "runtime-config-logging.html"),
            ("Mantenimiento de logs · PostgreSQL", PG + "logfile-maintenance.html"),
        ],
    },
    {
        "title": "Protección de datos y secretos",
        "goal": "Reducir la exposición de datos mediante permisos precisos y tratar las credenciales como secretos operativos.",
        "explain": [
            "Guarda solo los atributos que el servicio necesita, separa roles por función y concede acceso a columnas cuando el conjunto de datos lo permita. Los registros, volcados y copias también pueden contener datos personales y requieren controles de acceso y retención.",
            "PostgreSQL ofrece autenticación SCRAM-SHA-256 entre sus métodos por contraseña. Evita incluir credenciales en scripts compartidos; si se usa el archivo de contraseñas de libpq, restringe su acceso según el sistema operativo y la guía oficial.",
        ],
        "code_label": "Conceder solo lectura de campos necesarios · PostgreSQL 18",
        "code": [
            "CREATE ROLE consulta_publica NOLOGIN;",
            "GRANT USAGE ON SCHEMA biblioteca TO consulta_publica;",
            "GRANT SELECT (id_socio, nombre)",
            "  ON biblioteca.socio TO consulta_publica;",
        ],
        "reading": "El rol puede leer dos columnas de socio, pero no recibe permiso de lectura de email ni de modificación en virtud de estas instrucciones. La autenticación y la provisión de credenciales se configuran por separado.",
        "note": "El ejemplo de permisos no constituye una evaluación legal ni una política universal de privacidad. Verifica la finalidad, los plazos y los controles que exige la organización y la normativa aplicable al despliegue.",
        "practice": "Añade email a Socio y decide qué roles pueden leerlo. Revisa también si un dump, un log de consultas o un entorno de desarrollo podría copiar ese dato fuera de su finalidad.",
        "check": "Puedes describir qué columna queda fuera del permiso y cómo protegerías una credencial y una copia de datos de prueba.",
        "sources": [
            ("Privilegios por columna · PostgreSQL", PG + "ddl-priv.html"),
            ("Autenticación por contraseña · PostgreSQL", PG + "auth-password.html"),
            ("Archivo de contraseñas libpq · PostgreSQL", PG + "libpq-pgpass.html"),
        ],
    },
    {
        "title": "Proyecto: operar un registro de préstamos",
        "goal": "Integrar modelo, restricciones, recuperación, permisos y cambios versionados en un ejercicio verificable.",
        "explain": [
            "Este esquema de práctica conserva socios, ejemplares y el historial de préstamos. La fecha de devolución puede quedar vacía mientras el préstamo está activo; un índice único parcial impide dos préstamos activos para el mismo ejemplar.",
            "La solución necesita además una transacción para prestar, roles separados, migraciones revisadas, backup y un ensayo de restauración. El DDL implementa reglas de ejemplo y no sustituye requisitos de una biblioteca real.",
        ],
        "code_label": "Esqueleto integrador · PostgreSQL 18",
        "code": [
            "CREATE TABLE socio (",
            "  id_socio bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,",
            "  nombre text NOT NULL, email text UNIQUE",
            ");",
            "CREATE TABLE ejemplar (",
            "  id_ejemplar bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,",
            "  codigo text NOT NULL UNIQUE",
            ");",
            "CREATE TABLE prestamo (",
            "  id_prestamo bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,",
            "  id_socio bigint NOT NULL REFERENCES socio(id_socio),",
            "  id_ejemplar bigint NOT NULL REFERENCES ejemplar(id_ejemplar),",
            "  fecha_prestamo date NOT NULL DEFAULT CURRENT_DATE, devuelto_en date,",
            "  CHECK (devuelto_en IS NULL OR devuelto_en >= fecha_prestamo)",
            ");",
            "CREATE UNIQUE INDEX un_prestamo_activo",
            "  ON prestamo (id_ejemplar) WHERE devuelto_en IS NULL;",
        ],
        "reading": "La clave foránea enlaza cada préstamo con sus entidades. Si se omite fecha_prestamo, CURRENT_DATE toma la fecha de inicio de la transacción. CHECK valida el orden entre fecha_prestamo y devuelto_en; el índice único parcial conserva el historial y limita a uno los préstamos sin fecha de devolución por ejemplar.",
        "note": "El SQL aplica reglas deliberadamente escogidas para el ejercicio. Antes de producción faltarían gestión de errores, autorización, política de retención, observabilidad, límites de carga y un plan probado de continuidad.",
        "practice": "Entrega diagrama ER, migración inicial, transacción de préstamo, roles de lectura y escritura, comando de backup y acta de restauración en una base aislada. Incluye una consulta de aceptación y prueba que el rol de lectura no puede escribir.",
        "check": "Puedes demostrar cómo se rechaza una referencia inválida, un segundo préstamo activo y una devolución anterior a la fecha del préstamo; la copia se restaura en otro destino y responde la consulta de aceptación.",
        "sources": [
            ("Restricciones · PostgreSQL", PG + "ddl-constraints.html"),
            ("Índices parciales · PostgreSQL", PG + "indexes-partial.html"),
            ("Valores predeterminados · PostgreSQL", PG + "ddl-default.html"),
            ("Fecha actual · PostgreSQL", PG + "functions-datetime.html"),
            ("Backup y restauración · PostgreSQL", PG + "backup.html"),
        ],
    },
]


def draw_wrapped(c, text, style, y):
    paragraph = Paragraph(escape(text, quote=False), style)
    _, height = paragraph.wrap(CONTENT_W, PAGE_H)
    if y - height < BOTTOM:
        raise ValueError(f"Texto fuera de página: {text[:70]!r}; y={y:.1f}, h={height:.1f}")
    paragraph.drawOn(c, LEFT, y - height)
    return y - height


def draw_label(c, label, y, color=TEAL):
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", 8.1)
    c.drawString(LEFT, y - 8, label.upper())
    return y - 17


def draw_card(c, text, y, fill, style=SMALL):
    paragraph = Paragraph(escape(text, quote=False), style)
    _, height = paragraph.wrap(CONTENT_W - 22, PAGE_H)
    box_height = height + 18
    if y - box_height < BOTTOM:
        raise ValueError(f"Tarjeta fuera de página: {text[:70]!r}; y={y:.1f}, h={box_height:.1f}")
    c.setFillColor(fill)
    c.setStrokeColor(LINE)
    c.roundRect(LEFT, y - box_height, CONTENT_W, box_height, 5, fill=1, stroke=1)
    paragraph.drawOn(c, LEFT + 11, y - 9 - height)
    return y - box_height


def draw_code(c, label, lines, y):
    font_size, leading = 7.35, 9.35
    max_width = max((stringWidth(line, "Courier", font_size) for line in lines), default=0)
    if max_width > CONTENT_W - 25:
        raise ValueError(f"Línea de código demasiado larga ({max_width:.1f} pt): {label}")
    box_height = len(lines) * leading + 30
    if y - box_height < BOTTOM:
        raise ValueError(f"Código fuera de página: {label}; y={y:.1f}, h={box_height:.1f}")
    c.setFillColor(INK)
    c.roundRect(LEFT, y - box_height, CONTENT_W, box_height, 5, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#81D2D4"))
    c.setFont("Helvetica-Bold", 7.7)
    c.drawString(LEFT + 12, y - 15, label.upper())
    c.setFillColor(WHITE)
    c.setFont("Courier", font_size)
    code_y = y - 28
    for line in lines:
        c.drawString(LEFT + 12, code_y, line)
        code_y -= leading
    return y - box_height


def draw_sources(c, sources, y):
    links = [
        f'<link href="{escape(url, quote=True)}" color="#087E8B">{escape(label, quote=False)}</link>'
        for label, url in sources
    ]
    paragraph = Paragraph(" · ".join(links), SOURCES)
    _, height = paragraph.wrap(CONTENT_W, PAGE_H)
    if y - height < BOTTOM:
        raise ValueError(f"Fuentes fuera de página; y={y:.1f}, h={height:.1f}")
    paragraph.drawOn(c, LEFT, y - height)
    return y - height


def draw_page(c, lesson, number):
    c.setFillColor(WHITE)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(INK)
    c.rect(0, PAGE_H - 3, PAGE_W, 3, fill=1, stroke=0)
    c.setFillColor(TEAL)
    c.rect(0, PAGE_H - 3, PAGE_W * number / len(LESSONS), 3, fill=1, stroke=0)
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(LEFT, PAGE_H - 31, "CÓDIGOCLARO  /  RUTA GESTIÓN BD")
    c.setFont("Helvetica", 8)
    c.drawRightString(RIGHT, PAGE_H - 31, f"TEMA {number:02d} / {len(LESSONS)}")

    y = PAGE_H - 56
    title = Paragraph(escape(lesson["title"], quote=False), TITLE)
    _, height = title.wrap(CONTENT_W, 80)
    title.drawOn(c, LEFT, y - height)
    y -= height + 9
    y = draw_label(c, "Objetivo", y)
    y = draw_wrapped(c, lesson["goal"], BODY, y) - 7
    y = draw_label(c, "Explicación", y)
    for paragraph in lesson["explain"]:
        y = draw_wrapped(c, paragraph, BODY, y) - 5
    y = draw_label(c, "Ejemplo guiado", y)
    y = draw_code(c, lesson["code_label"], lesson["code"], y) - 8
    y = draw_label(c, "Lectura del ejemplo", y)
    y = draw_wrapped(c, lesson["reading"], SMALL, y) - 7
    y = draw_label(c, "Alcance y cautela", y, color=colors.HexColor("#A26300"))
    y = draw_card(c, lesson["note"], y, PALE_GOLD) - 7
    y = draw_label(c, "Practica y comprueba", y)
    y = draw_card(c, lesson["practice"] + "\n\nComprobación: " + lesson["check"], y, PALE_BLUE) - 7
    y = draw_label(c, "Fuentes oficiales · enlaces clicables", y, color=MUTED)
    draw_sources(c, lesson["sources"], y)

    c.setStrokeColor(LINE)
    c.line(LEFT, 38, RIGHT, 38)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 7.4)
    c.drawString(LEFT, 25, "Sintaxis y comandos de ejemplo para PostgreSQL 18.")
    c.drawRightString(RIGHT, 25, "Gestión de bases de datos · Material de estudio")
    c.showPage()


def make_pdf():
    if len(LESSONS) != 15:
        raise ValueError(f"Se esperaban 15 temas; hay {len(LESSONS)}")
    return build_route_pdf_bytes(
        route_name="Gestión de bases de datos",
        title="Gestión de bases de datos con PostgreSQL",
        subtitle="15 temas · modelado, administración, seguridad y recuperación",
        lessons=LESSONS,
        author="CódigoClaro · síntesis basada en la documentación oficial de PostgreSQL",
        subject="Modelado, administración y recuperación de bases de datos",
        editorial_note="Las prácticas se contrastan con la documentación oficial de PostgreSQL 18; revisa la versión de tu instalación antes de aplicarlas.",
        closing_project={
            "before_lesson_number": 14,
            "title": "Proyecto integrador · copia y restauración verificadas",
            "objective": "Practica un plan de copia y recuperación en una instancia local o de pruebas. No ejecutes estas operaciones sobre producción: primero identifica el entorno y confirma que puedes restaurar sin sobrescribir datos ajenos.",
            "steps": [
                "Crea un esquema de prueba con un alumno y varias matrículas; anota la cantidad de filas y las restricciones que deben conservarse.",
                "Genera una copia en formato adecuado y registra la versión del cliente y del servidor que utilizaste.",
                "Restaura en una base nueva y aislada. Comprueba tablas, restricciones, índices, secuencias y permisos necesarios.",
                "Simula una fila dañada solo en la copia de prueba y redacta cómo detectarías el problema antes de aceptar la restauración.",
            ],
            "checks": [
                "La base restaurada contiene el número esperado de filas.",
                "Las claves y restricciones rechazan datos inválidos después de restaurar.",
                "La copia original permanece intacta y el procedimiento deja pasos repetibles.",
            ],
            "reflection": "Un archivo de copia no prueba por sí solo que el plan funciona. Documenta cuánto tardó la recuperación, qué permisos fueron imprescindibles y qué evidencia tendría que revisar otra persona antes de declarar el servicio recuperado.",
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
