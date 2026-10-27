'use strict';

// Preguntas que el banco del servidor no cubre y que la demo estática necesita.
// Se convierten al formato compacto del aula mediante scripts/generar_banco_aula.js.
module.exports = [
  {
    id: 'xml-local-01', topic: 'XML y XPath', difficulty: 'basic',
    q: '¿Qué devuelve count(//libro) en XPath?',
    o: ['El número de elementos libro encontrados', 'El texto del primer libro', 'Los atributos codigo', 'La posición del nodo raíz'], a: 0,
    e: 'count() devuelve el número de nodos seleccionados por la expresión XPath.'
  },
  {
    id: 'xml-local-02', topic: 'XML y XPath', difficulty: 'basic',
    q: 'En XPath, ¿qué selecciona /biblioteca/libro[1]?',
    o: ['Todos los libros del documento', 'El primer libro hijo directo de biblioteca', 'El atributo biblioteca', 'El padre de biblioteca'], a: 1,
    e: 'La ruta absoluta limita la búsqueda a los hijos libro de biblioteca; [1] selecciona la primera posición.'
  },
  {
    id: 'xml-local-03', topic: 'XML y XPath', difficulty: 'intermediate',
    q: '¿Qué debe hacer XPath para seleccionar un elemento que usa un espacio de nombres XML?',
    o: ['Eliminar el espacio de nombres del documento', 'Asociar un prefijo XPath con su URI', 'Usar siempre el nombre local sin prefijo', 'Convertir el XML a HTML'], a: 1,
    e: 'En XPath 1.0 se vincula un prefijo de consulta con el URI del espacio de nombres y se usa ese prefijo en la expresión.'
  },
  {
    id: 'xml-local-04', topic: 'XML y XPath', difficulty: 'basic',
    q: '¿Qué selecciona la función text() en XPath?',
    o: ['Los atributos del elemento', 'Los nodos de texto hijos', 'El documento completo', 'Los comentarios solamente'], a: 1,
    e: 'text() selecciona nodos de texto, por ejemplo el contenido textual hijo de un elemento.'
  },
  {
    id: 'xml-local-05', topic: 'XML y XPath', difficulty: 'basic',
    q: '¿Qué representa el paso .. en una ruta XPath?',
    o: ['El nodo padre', 'El nodo raíz', 'El último atributo', 'Todos los descendientes'], a: 0,
    e: '.. es la abreviatura del eje parent y selecciona el nodo padre.'
  },
  {
    id: 'xml-local-06', topic: 'XML y XPath', difficulty: 'intermediate',
    q: '¿Qué condición XPath encuentra libros cuyo precio sea menor que 20?',
    o: ['//libro[precio < 20]', '//libro/ precio = 20', '//libro{precio<20}', '//libro[@precio:20]'], a: 0,
    e: 'Un predicado entre corchetes filtra los libros usando la comparación del elemento precio.'
  },
  {
    id: 'xml-local-07', topic: 'XML y XPath', difficulty: 'advanced',
    q: 'Una expresión XPath no encuentra <x:libro> aunque el prefijo existe en el XML. ¿Qué revisar primero?',
    o: ['Que el prefijo XPath esté vinculado al mismo URI', 'Que el archivo tenga extensión .html', 'Que el atributo id sea numérico', 'Que se elimine el nodo raíz'], a: 0,
    e: 'El nombre del prefijo puede diferir, pero la consulta debe asociarlo al URI correcto del espacio de nombres.'
  },
  {
    id: 'xml-local-08', topic: 'XML y XPath', difficulty: 'intermediate',
    q: 'En XSD, ¿qué implica xs:sequence?',
    o: ['Que los elementos hijos deben aparecer en el orden declarado', 'Que todos los hijos son opcionales', 'Que el elemento puede repetirse sin límite', 'Que se ignora el tipo de cada hijo'], a: 0,
    e: 'xs:sequence define un grupo cuyos elementos deben aparecer en el orden especificado.'
  },
  {
    id: 'xml-local-09', topic: 'XML y XPath', difficulty: 'basic',
    q: 'En una declaración XSD, ¿qué controla minOccurs="0"?',
    o: ['El elemento es opcional', 'El elemento debe repetirse dos veces', 'El valor solo acepta cero', 'El atributo se vuelve clave primaria'], a: 0,
    e: 'minOccurs establece el número mínimo de apariciones; 0 permite omitir el elemento.'
  },
  {
    id: 'xml-local-10', topic: 'XML y XPath', difficulty: 'basic',
    q: '¿Qué tipo XSD es apropiado para un precio con decimales?',
    o: ['xs:boolean', 'xs:decimal', 'xs:date', 'xs:hexBinary'], a: 1,
    e: 'xs:decimal representa valores numéricos decimales sin tratarlos como texto.'
  },
  {
    id: 'xml-local-11', topic: 'XML y XPath', difficulty: 'basic',
    q: '¿Cómo se representa un signo menor que literal dentro del texto XML?',
    o: ['<', '&lt;', '&less;', '\\lt;'], a: 1,
    e: 'El signo menor que se escapa como &lt; para que no se interprete como inicio de etiqueta.'
  },
  {
    id: 'xml-local-12', topic: 'XML y XPath', difficulty: 'advanced',
    q: '¿Qué medida reduce el riesgo de XXE al procesar XML no confiable?',
    o: ['Permitir entidades externas por defecto', 'Desactivar la resolución de entidades externas', 'Aceptar cualquier DTD remota', 'Reemplazar todos los atributos por CDATA'], a: 1,
    e: 'Deshabilitar DTD y entidades externas en el parser evita que el XML provoque lecturas de archivos o solicitudes no deseadas.'
  },
  {
    id: 'xml-local-13', topic: 'XML y XPath', difficulty: 'advanced',
    q: '¿Qué opción conviene para recorrer XML grande sin cargar todo el árbol en memoria?',
    o: ['Un parser de flujo como SAX o StAX', 'Concatenar el archivo en una cadena global', 'Duplicar cada nodo antes de leerlo', 'Usar solo una hoja CSS'], a: 0,
    e: 'SAX y StAX procesan eventos o tokens de forma secuencial y reducen el uso de memoria frente a un DOM completo.'
  },
  {
    id: 'xml-local-14', topic: 'XML y XPath', difficulty: 'basic',
    q: '¿Qué permite una sección CDATA?',
    o: ['Incluir texto con signos como < sin interpretarlos como marcado', 'Definir una clave foránea', 'Cambiar el espacio de nombres de todo el archivo', 'Validar el documento contra un XSD'], a: 0,
    e: 'CDATA presenta su contenido como texto sin analizar los marcadores XML habituales, salvo el cierre de la propia sección.'
  },
  {
    id: 'xml-local-15', topic: 'XML y XPath', difficulty: 'basic',
    q: '¿Qué debe coincidir en el atributo encoding de la declaración XML?',
    o: ['La codificación real de los bytes del archivo', 'El nombre del elemento raíz', 'La versión de XPath', 'El número de atributos'], a: 0,
    e: 'Declarar una codificación distinta de la usada al guardar el archivo puede corromper caracteres al leerlo.'
  },
  {
    id: 'hibernate-local-01', topic: 'Hibernate', difficulty: 'basic',
    q: '¿Qué objeto de JPA busca una entidad por su tipo e identificador?',
    o: ['EntityManager.find()', 'ResultSet.next()', 'Schema.create()', 'Session.close()'], a: 0,
    e: 'EntityManager.find(Tipo.class, id) busca una entidad por su clave primaria.'
  },
  {
    id: 'hibernate-local-02', topic: 'Hibernate', difficulty: 'intermediate',
    q: '¿Qué es el contexto de persistencia de JPA?',
    o: ['Un conjunto que gestiona entidades e identidad durante una unidad de trabajo', 'Una carpeta para guardar PDFs', 'Un índice SQL temporal', 'Una plantilla HTML'], a: 0,
    e: 'El contexto de persistencia mantiene entidades gestionadas y coordina su sincronización con la base de datos.'
  },
  {
    id: 'hibernate-local-03', topic: 'Hibernate', difficulty: 'basic',
    q: '¿Para qué sirve @GeneratedValue en una entidad?',
    o: ['Configurar la generación del identificador', 'Nombrar una consulta JPQL', 'Convertir una relación en JSON', 'Desactivar el mapeo de una columna'], a: 0,
    e: '@GeneratedValue indica que el proveedor genera el identificador según una estrategia configurada.'
  },
  {
    id: 'hibernate-local-04', topic: 'Hibernate', difficulty: 'basic',
    q: '¿Qué expresa @Column(nullable = false)?',
    o: ['La columna no debe aceptar valores nulos', 'La entidad no se guarda', 'La tabla debe ser temporal', 'El campo siempre es una clave primaria'], a: 0,
    e: 'nullable=false declara la nulabilidad del mapeo y puede reflejarse en el DDL generado; una tabla existente necesita una migración o restricción real para imponerlo.'
  },
  {
    id: 'hibernate-local-05', topic: 'Hibernate', difficulty: 'intermediate',
    q: 'En una relación bidireccional @OneToMany, ¿qué indica mappedBy?',
    o: ['El atributo que posee la relación en el otro lado', 'El nombre del dialecto SQL', 'Que se debe borrar toda la tabla', 'El generador de claves'], a: 0,
    e: 'mappedBy señala el atributo del lado propietario que mantiene la clave foránea.'
  },
  {
    id: 'hibernate-local-06', topic: 'Hibernate', difficulty: 'intermediate',
    q: '¿Qué lado suele ser el propietario de una relación muchos-a-uno en JPA?',
    o: ['El lado @ManyToOne que contiene la clave foránea', 'El lado @OneToMany siempre', 'Ambos lados por igual', 'El repositorio'], a: 0,
    e: 'El lado con la clave foránea suele ser el propietario; actualizarlo mantiene la relación en la base de datos.'
  },
  {
    id: 'hibernate-local-07', topic: 'Hibernate', difficulty: 'intermediate',
    q: '¿Qué efecto tiene cascade = PERSIST?',
    o: ['Propaga la operación de persistir a las entidades relacionadas', 'Borra las entidades al cerrar el navegador', 'Convierte una consulta en caché', 'Activa siempre la carga anticipada'], a: 0,
    e: 'PERSIST propaga la persistencia a las entidades relacionadas incluidas en la operación.'
  },
  {
    id: 'hibernate-local-08', topic: 'Hibernate', difficulty: 'intermediate',
    q: '¿Qué hace orphanRemoval = true en una relación compatible?',
    o: ['Elimina la entidad dependiente que se retira de la relación', 'Elimina la base de datos completa', 'Desactiva las claves foráneas', 'Convierte la relación en ManyToMany'], a: 0,
    e: 'orphanRemoval elimina la fila dependiente cuando deja de estar asociada conforme al mapeo.'
  },
  {
    id: 'hibernate-local-09', topic: 'Hibernate', difficulty: 'basic',
    q: '¿Qué significa FetchType.LAZY?',
    o: ['La relación se carga cuando se accede a ella, si el contexto lo permite', 'La entidad nunca se puede cargar', 'La consulta se ejecuta sin transacción en todos los casos', 'Se desactiva el caché'], a: 0,
    e: 'En JPA, LAZY es una indicación al proveedor, que puede cargar antes. Hibernate suele diferir la carga hasta el acceso; el contexto debe seguir disponible.'
  },
  {
    id: 'hibernate-local-10', topic: 'Hibernate', difficulty: 'intermediate',
    q: '¿Qué estrategia puede evitar consultas N+1 para una relación concreta?',
    o: ['Una consulta fetch join bien acotada', 'Iterar y ejecutar una consulta nueva por elemento', 'Desactivar todas las claves primarias', 'Usar SELECT * en cada getter'], a: 0,
    e: 'Un fetch join puede cargar la relación en una consulta; debe diseñarse con cuidado para no duplicar filas ni paginar mal.'
  },
  {
    id: 'hibernate-local-11', topic: 'Hibernate', difficulty: 'basic',
    q: 'En JPQL, ¿qué nombre se usa normalmente en FROM?',
    o: ['El nombre de la entidad Java', 'El nombre físico de un índice', 'El nombre del esquema de Git', 'El nombre del fichero .java'], a: 0,
    e: 'JPQL consulta entidades y sus atributos; SQL consulta tablas y columnas físicas.'
  },
  {
    id: 'hibernate-local-12', topic: 'Hibernate', difficulty: 'intermediate',
    q: '¿Para qué se usa @Transactional en una operación de persistencia?',
    o: ['Delimitar una unidad de trabajo transaccional', 'Convertir una entidad en DTO automáticamente', 'Crear una clave primaria compuesta', 'Hacer pública la contraseña de conexión'], a: 0,
    e: 'Una transacción agrupa cambios para que se confirmen o reviertan según el resultado de la operación.'
  },
  {
    id: 'hibernate-local-13', topic: 'Hibernate', difficulty: 'advanced',
    q: '¿Qué permite @Version en una entidad?',
    o: ['Detectar conflictos de actualización optimista', 'Elegir el orden de las columnas', 'Configurar el idioma SQL', 'Reemplazar la clave primaria'], a: 0,
    e: 'El proveedor compara la versión durante la actualización y detecta modificaciones concurrentes incompatibles.'
  },
  {
    id: 'hibernate-local-14', topic: 'Hibernate', difficulty: 'intermediate',
    q: '¿Qué anotación puede mapear una clave primaria compuesta embebida?',
    o: ['@EmbeddedId', '@Transient', '@Lob', '@OrderBy'], a: 0,
    e: '@EmbeddedId usa un tipo embebible para representar una clave compuesta.'
  },
  {
    id: 'hibernate-local-15', topic: 'Hibernate', difficulty: 'intermediate',
    q: '¿Qué hace flush() en el contexto de persistencia?',
    o: ['Sincroniza cambios pendientes con la base de datos sin equivaler necesariamente a commit', 'Cierra siempre la conexión y confirma', 'Elimina las entidades nuevas', 'Borra el caché de segundo nivel siempre'], a: 0,
    e: 'flush sincroniza el estado pendiente con la base de datos; la transacción aún puede requerir commit o rollback.'
  },
  {
    id: 'hibernate-local-16', topic: 'Hibernate', difficulty: 'intermediate',
    q: '¿Por qué proyectar una consulta a un DTO?',
    o: ['Para devolver solo los datos necesarios sin exponer la entidad completa', 'Para desactivar SQL', 'Para convertir el DTO en tabla', 'Para saltarse la validación de tipos'], a: 0,
    e: 'Una proyección limita los campos leídos y separa el modelo de persistencia de la respuesta de la aplicación.'
  },
  {
    id: 'hibernate-local-17', topic: 'Hibernate', difficulty: 'advanced',
    q: '¿Qué efecto busca @BatchSize(size = 16) en una asociación lazy de Hibernate?',
    o: ['Cargar asociaciones de varias entidades en lotes para reducir consultas repetidas', 'Crear 16 tablas nuevas', 'Desactivar todas las consultas preparadas', 'Confirmar una transacción cada 16 filas'], a: 0,
    e: '@BatchSize permite que Hibernate inicialice varias asociaciones o proxies en una misma consulta por lotes; el tamaño debe ajustarse al patrón de acceso.'
  },
  {
    id: 'hibernate-local-18', topic: 'Hibernate', difficulty: 'advanced',
    q: '¿Qué distingue principalmente a StatelessSession de Hibernate Session?',
    o: ['No mantiene el contexto de persistencia ni aplica dirty checking automático', 'Siempre crea una transacción por campo', 'Solo puede ejecutar JPQL', 'Es una caché compartida entre procesos'], a: 0,
    e: 'StatelessSession no mantiene un contexto de persistencia ni realiza dirty checking o cascadas a entidades asociadas; también omite el modelo de eventos y las colecciones. Puede servir para operaciones por lotes con menos funciones automáticas.'
  },
  {
    id: 'hibernate-local-19', topic: 'Hibernate', difficulty: 'intermediate',
    q: '¿Para qué sirve @NaturalId, propia de Hibernate?',
    o: ['Marcar un atributo o conjunto de atributos como identificador natural de negocio', 'Declarar una columna JSON obligatoria', 'Convertir una consulta en procedimiento almacenado', 'Eliminar la clave primaria técnica'], a: 0,
    e: '@NaturalId identifica uno o varios campos de negocio que distinguen una entidad. Es inmutable por defecto; si el dominio permite cambios, puede declararse @NaturalId(mutable = true).'
  },
  {
    id: 'hibernate-local-20', topic: 'Hibernate', difficulty: 'advanced',
    q: '¿Qué diferencia hay entre la caché de primer nivel y la de segundo nivel de Hibernate?',
    o: ['La primera pertenece a una Session; la segunda puede compartirse entre Sessions de una SessionFactory', 'La primera está en PostgreSQL y la segunda en Git', 'La segunda sustituye las transacciones', 'No existe diferencia de alcance'], a: 0,
    e: 'El contexto de una Session es la caché de primer nivel; la caché de segundo nivel es opcional y puede compartirse entre sesiones.'
  }
];
