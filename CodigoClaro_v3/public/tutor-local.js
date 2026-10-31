(() => {
  'use strict';

  const DISCLOSURE = 'Ayuda local de estudio: no es IA generativa. La pregunta solo queda en el historial temporal de esta página; no se envía ni se guarda en almacenamiento.';
  const STOP_WORDS = new Set([
    'que', 'como', 'cuando', 'donde', 'para', 'por', 'con', 'sin', 'una', 'uno',
    'unos', 'unas', 'del', 'las', 'los', 'cual', 'cuales', 'puedo', 'quiero',
    'hace', 'hacer', 'usar', 'uso', 'es', 'son', 'ser', 'hay', 'mi', 'me', 'de',
    'la', 'el', 'y', 'o', 'a', 'en', 'un', 'al', 'explica', 'explicar', 'dime',
    'duda', 'ayuda', 'saber', 'funciona', 'funcionar', 'ejemplo', 'ejemplos',
    'pasos', 'diferencia', 'diferencias', 'entre', 'sobre', 'puede', 'pueden',
    'sirve', 'sirven', 'seria', 'porfa', 'favor'
  ]);

  // Estas respuestas están redactadas a partir de conceptos estables y se enlazan
  // con temas que ya existen en el temario local de la aplicación.
  const KNOWLEDGE = [
    {
      id: 'java-primitives', courseId: 'java', sourceTopic: 'Control de flujo', title: 'Tipos primitivos de Java',
      keywords: ['tipos primitivos', 'datos primitivos', 'primitivos java', 'byte', 'short', 'int', 'long', 'float', 'double', 'char', 'boolean'],
      answer: 'Java tiene ocho tipos primitivos: boolean, byte, short, int, long, char, float y double. Los numéricos enteros usan byte, short, int o long; float y double representan decimales aproximados; char guarda una unidad de código UTF-16 y boolean representa true o false. String, los arrays y las clases son tipos de referencia, no primitivos.',
      example: 'int edad = 20;\nboolean aprobado = true;\nString nombre = "Ana";',
      steps: ['Elige primero si el dato es lógico, entero, decimal o texto.', 'Para enteros, escoge el tipo cuyo rango cubra los valores posibles.', 'Para dinero, no uses float/double si necesitas aritmética decimal exacta; considera BigDecimal.'],
      comparison: 'Un primitivo contiene un valor del tipo correspondiente. Una variable de referencia apunta a un objeto; por eso == compara valores en primitivos y referencias en objetos.'
    },
    {
      id: 'java-equality', courseId: 'java', sourceTopic: 'POO y colecciones', title: '== y equals() en Java',
      keywords: ['comparar strings', 'comparar cadenas', 'igualdad java', 'referencias', 'equals', 'doble igual'],
      answer: 'En Java, == compara valores cuando ambos operandos son primitivos. Con objetos compara si las referencias señalan al mismo objeto. Para comparar el contenido de String, usa equals(); si cualquiera puede ser null, Objects.equals(a, b) evita una excepción.',
      example: 'String a = new String("hola");\nString b = new String("hola");\nboolean mismoTexto = a.equals(b); // true',
      steps: ['Comprueba si comparas un primitivo o un objeto.', 'Para el contenido de String, usa equals().', 'Si puede haber null, usa Objects.equals(a, b).'],
      comparison: '== pregunta si dos referencias son la misma; equals() pregunta por igualdad de contenido según la implementación de la clase.'
    },
    {
      id: 'python-collections', courseId: 'python', sourceTopic: 'Colecciones', title: 'Listas, diccionarios y conjuntos en Python',
      keywords: ['lista python', 'list', 'diccionario', 'dict', 'conjunto', 'set', 'colecciones python', 'duplicados'],
      answer: 'Una lista mantiene una secuencia ordenada y puede contener repetidos; un diccionario asocia claves únicas con valores; un set conserva elementos únicos. Elige según la operación principal: recorrer una secuencia, buscar por clave o eliminar duplicados.',
      example: 'notas = [7, 7, 9]\nalumno = {"nombre": "Ana", "nota": 9}\nnotas_unicas = set(notas)',
      steps: ['¿Necesitas conservar el orden y los repetidos? Usa list.', '¿Necesitas buscar un valor por una clave? Usa dict.', '¿Necesitas unicidad? Usa set.'],
      comparison: 'La lista se consulta por posición; el diccionario por clave; el set sirve para pertenencia y unicidad, no para acceder por índice.'
    },
    {
      id: 'javascript-variables', courseId: 'js', sourceTopic: 'Variables', title: 'const y let en JavaScript',
      keywords: ['const', 'let', 'var', 'variables javascript', 'reasignar', 'constante'],
      answer: 'Usa const cuando no vayas a reasignar el identificador y let cuando sí necesites asignarle otro valor. const no vuelve inmutable un objeto: impide reasignar la variable, pero sus propiedades aún pueden cambiar.',
      example: 'const persona = { nombre: "Ana" };\npersona.nombre = "Luis"; // permitido\n// persona = {}; // TypeError',
      steps: ['Declara con const por defecto.', 'Cambia a let solo si después reasignas el identificador.', 'Si necesitas evitar cambios internos, diseña el objeto como inmutable; const por sí solo no lo hace.'],
      comparison: 'const fija la asociación entre nombre y valor; no congela recursivamente el objeto guardado en ese valor.'
    },
    {
      id: 'javascript-arrays', courseId: 'js', sourceTopic: 'Arrays', title: 'filter, map y reduce',
      keywords: ['filter', 'map', 'reduce', 'arrays javascript', 'filtrar', 'transformar', 'acumular'],
      answer: 'filter conserva los elementos cuyo predicado devuelve true; map transforma cada elemento y devuelve otro array; reduce combina los elementos para producir un acumulado. Los tres recorren el array sin que tengas que escribir un bucle manual.',
      example: 'const aprobadas = notas.filter(n => n >= 5);\nconst conIva = precios.map(p => p * 1.21);\nconst total = precios.reduce((suma, p) => suma + p, 0);',
      steps: ['Escribe qué dato quieres obtener.', 'Si quieres menos elementos, usa filter.', 'Si quieres un valor transformado por cada elemento, usa map; si quieres un acumulado, usa reduce.'],
      comparison: 'filter devuelve una selección, map devuelve una transformación del mismo número de posiciones y reduce devuelve el acumulado que definas.'
    },
    {
      id: 'sql-where-having', courseId: 'sql', sourceTopic: 'JOIN y agregación', title: 'WHERE, GROUP BY y HAVING',
      keywords: ['where', 'having', 'group by', 'agrupar sql', 'filtrar grupos', 'agregaciones', 'count', 'avg'],
      answer: 'WHERE filtra filas antes de formar grupos. GROUP BY reúne filas con el mismo valor en las columnas indicadas. HAVING filtra esos grupos, por ejemplo usando COUNT o AVG.',
      example: 'SELECT curso_id, AVG(nota) AS media\nFROM alumnos\nWHERE nota IS NOT NULL\nGROUP BY curso_id\nHAVING AVG(nota) >= 5;',
      steps: ['Filtra filas individuales con WHERE.', 'Agrupa con GROUP BY las columnas que identifican cada grupo.', 'Aplica condiciones sobre COUNT, AVG u otra agregación con HAVING.'],
      comparison: 'WHERE se evalúa antes de agrupar y normalmente no filtra por un resultado agregado; HAVING se aplica después de GROUP BY.'
    },
    {
      id: 'sql-joins', courseId: 'sql', sourceTopic: 'JOIN y agregación', title: 'INNER JOIN y LEFT JOIN',
      keywords: ['inner join', 'left join', 'join sql', 'unir tablas', 'filas sin coincidencia'],
      answer: 'INNER JOIN devuelve filas que encuentran coincidencia en ambos lados. LEFT JOIN conserva todas las filas de la tabla izquierda y añade las coincidentes de la derecha; si no hay coincidencia, las columnas derechas quedan en NULL.',
      example: 'SELECT a.nombre, c.titulo\nFROM alumnos a\nLEFT JOIN cursos c ON c.id = a.curso_id;',
      steps: ['Identifica qué tabla debe conservar todas sus filas.', 'Usa LEFT JOIN si esa tabla va a la izquierda.', 'Usa INNER JOIN si solo quieres coincidencias en ambas tablas.'],
      comparison: 'La diferencia clave es el tratamiento de filas sin pareja: INNER JOIN las elimina; LEFT JOIN las mantiene con NULL en la parte derecha.'
    },
    {
      id: 'sql-cte', courseId: 'sql', sourceTopic: 'JOIN y agregación', title: 'CTE no recursiva en SQL',
      keywords: ['cte', 'common table expression', 'with sql', 'with as', 'consulta con nombre', 'subconsulta con nombre'],
      answer: 'Una CTE no recursiva es el resultado temporal con nombre de una consulta, declarado con WITH y disponible dentro de una única sentencia. Ayuda a separar una consulta compleja en pasos legibles; no crea una tabla permanente.',
      example: 'WITH aprobados AS (\n  SELECT id, nombre FROM alumnos WHERE nota >= 5\n)\nSELECT nombre FROM aprobados;',
      steps: ['Escribe WITH y un nombre para el resultado.', 'Entre paréntesis, coloca una consulta SELECT.', 'Usa ese nombre en la consulta que sigue.'],
      comparison: 'Una CTE organiza una sentencia y desaparece al terminarla; CREATE TABLE crea un objeto persistente del esquema.'
    },
    {
      id: 'sql-transactions', courseId: 'sql', sourceTopic: 'Modelo y transacciones', title: 'Transacciones: COMMIT y ROLLBACK',
      keywords: ['transacción', 'transacciones sql', 'commit', 'rollback', 'atomicidad', 'begin'],
      answer: 'Una transacción agrupa cambios que deben tratarse como una unidad lógica. COMMIT confirma los cambios; ROLLBACK deshace los cambios pendientes desde el inicio de la transacción.',
      example: 'BEGIN;\nUPDATE cuentas SET saldo = saldo - 20 WHERE id = 1;\nUPDATE cuentas SET saldo = saldo + 20 WHERE id = 2;\nCOMMIT;',
      steps: ['Inicia la transacción.', 'Ejecuta y valida todos los cambios relacionados.', 'Confirma solo si todos son correctos; ante un error, revierte.'],
      comparison: 'COMMIT hace permanentes los cambios de la transacción; ROLLBACK los cancela antes de confirmarlos.'
    },
    {
      id: 'html-semantics', courseId: 'html', sourceTopic: 'Semántica', title: 'HTML semántico y accesibilidad',
      keywords: ['html semantico', 'main', 'nav', 'article', 'section', 'etiquetas semanticas', 'accesibilidad web'],
      answer: 'El HTML semántico describe la función del contenido. Usa main para el contenido principal, nav para un bloque de navegación, article para una pieza independiente y section para agrupar contenido relacionado. Las etiquetas con significado ayudan a lectores de pantalla y hacen el documento más claro.',
      example: '<main><article><h2>Curso Java</h2><p>Introducción a clases.</p></article></main>',
      steps: ['Identifica el propósito del bloque.', 'Elige el elemento semántico que expresa ese propósito.', 'Comprueba títulos, etiquetas de formulario y alternativas textuales.'],
      comparison: 'Un div no comunica una función semántica por sí mismo; main, nav y article sí expresan el papel de cada bloque.'
    },
    {
      id: 'css-layout', courseId: 'css', sourceTopic: 'Responsive', title: 'Flexbox y Grid',
      keywords: ['flexbox', 'display flex', 'css grid', 'display grid', 'maquetar css', 'responsive'],
      answer: 'Flexbox organiza elementos principalmente en una dimensión: una fila o una columna. Grid organiza filas y columnas a la vez. Ambos se adaptan a distintos anchos combinándolos con unidades flexibles y media queries cuando hagan falta.',
      example: '.barra { display: flex; gap: 1rem; }\n.tarjetas { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }',
      steps: ['Decide si organizas una fila/columna o una cuadrícula bidimensional.', 'Elige Flexbox para la primera y Grid para la segunda.', 'Prueba el diseño en un ancho estrecho y con zoom.'],
      comparison: 'Flexbox distribuye elementos a lo largo de un eje principal; Grid controla filas y columnas como una cuadrícula.'
    },
    {
      id: 'xml-xpath', courseId: 'xml', sourceTopic: 'XPath', title: 'Rutas y predicados XPath',
      keywords: ['xpath', 'consulta xml', 'atributo xml', 'predicado xpath', '//', 'sintaxis xpath'],
      answer: 'En XPath, / empieza desde la raíz del documento y // busca descendientes en cualquier nivel. @ selecciona atributos y los corchetes aplican predicados para filtrar nodos.',
      example: '//alumno[nota >= 5]/nombre\n//libro[@id="2"]',
      steps: ['Selecciona el nodo que buscas, como alumno o libro.', 'Añade un predicado entre corchetes para filtrar.', 'Termina con el hijo o atributo que necesitas.'],
      comparison: '/libro busca una ruta directa desde la raíz; //libro busca elementos libro a cualquier profundidad.'
    },
    {
      id: 'react-state', courseId: 'react', sourceTopic: 'Estado', title: 'Props y estado en React',
      keywords: ['props', 'state', 'estado react', 'usestate', 'componente react', 'datos padre hijo'],
      answer: 'Las props son datos que un componente recibe de su padre. El estado representa datos que el componente mantiene y que pueden cambiar con la interacción. Actualizar el estado con el setter de useState solicita un nuevo render.',
      example: 'const [contador, setContador] = useState(0);\n<button onClick={() => setContador(n => n + 1)}>{contador}</button>',
      steps: ['Usa props para recibir datos desde el componente padre.', 'Usa estado para valores que cambian en el componente.', 'Actualiza el estado con su setter, sin mutar el valor directamente.'],
      comparison: 'El padre pasa props hacia abajo; el componente actualiza su propio estado mediante su función setter.'
    },
    {
      id: 'node-http', courseId: 'node', sourceTopic: 'HTTP', title: 'Métodos y códigos HTTP',
      keywords: ['http', 'get', 'post', 'put', 'patch', 'delete', '404', '400', '401', '403', '500', 'api rest'],
      answer: 'En una API, GET suele leer un recurso, POST suele crear o iniciar una operación, PUT reemplaza o establece un recurso, PATCH modifica parte y DELETE solicita eliminarlo. Códigos frecuentes: 201 creado, 400 petición inválida, 401 autenticación no válida o ausente, 403 prohibido, 404 no encontrado y 500 error interno.',
      example: 'GET /api/tareas/7 → 200\nPOST /api/tareas → 201\nGET /api/no-existe → 404',
      steps: ['Elige el método según la intención de la operación.', 'Valida la entrada en el servidor.', 'Devuelve un código que describa el resultado y un cuerpo útil.'],
      comparison: '401 indica que falta autenticación válida; 403 indica que el servidor entiende quién eres, pero no autoriza esa acción.'
    },
    {
      id: 'node-secrets', courseId: 'node', sourceTopic: 'Seguridad', title: 'Variables de entorno y secretos',
      keywords: ['process.env', 'variables de entorno', 'secretos node', 'api key', 'clave secreta', 'credenciales'],
      answer: 'En Node.js, process.env permite leer configuración del proceso, como una clave que el servidor recibió de su entorno. No pongas secretos en HTML, JavaScript del navegador ni en el repositorio: el código del cliente es visible para quien carga la página.',
      example: 'const port = Number(process.env.PORT || 3000);\nconst apiKey = process.env.API_KEY;',
      steps: ['Guarda el secreto en la configuración protegida del servidor.', 'Léelo con process.env en código que solo se ejecuta en el servidor.', 'Comprueba que el valor no se incluya en respuestas, logs públicos o archivos del cliente.'],
      comparison: 'Una variable de entorno del servidor no es lo mismo que una variable JavaScript de la página: el navegador no debe recibir el secreto.'
    }
  ];

  const CATEGORY_TO_COURSE = {
    web: 'html', frontend: 'react', programming: 'java', programacion: 'java',
    database: 'sql', db: 'sql', api: 'node', security: 'node', backend: 'node',
    xpath: 'xml', firestore: 'mongo'
  };
  const TRACK_TO_COURSE = { java: 'java', javascript: 'js', python: 'python', react: 'react', kotlin: 'kotlin' };
  const COURSE_TOPIC_ALIASES = {
    python: {
      'bucles': 'Sintaxis',
      'listas y tuplas': 'Colecciones',
      'diccionarios y conjuntos': 'Colecciones',
      'comprensiones y generadores': 'Colecciones',
      'ficheros y json': 'Archivos'
    },
    java: {
      'condicionales': 'Control de flujo',
      'clases y objetos': 'POO y colecciones',
      'constructores y this': 'POO y colecciones',
      'herencia y polimorfismo': 'POO y colecciones',
      'interfaces y abstractas': 'POO y colecciones'
    },
    js: { 'tipos y coercion': 'Variables' },
    react: { 'eventos y formularios': 'Efectos' }
  };

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function tokenize(value) {
    return normalize(value).match(/[a-z0-9+#]+(?:[.-][a-z0-9+#]+)*/g)?.filter(term => term.length > 1 && !STOP_WORDS.has(term)) || [];
  }

  function stemTerm(value) {
    if (value.length > 6 && value.endsWith('es')) return value.slice(0, -2);
    if (value.length > 5 && value.endsWith('s')) return value.slice(0, -1);
    return value;
  }

  function localCourses() {
    return typeof C !== 'undefined' && Array.isArray(C) ? C : [];
  }

  function localExercises() {
    return typeof E !== 'undefined' && Array.isArray(E) ? E : [];
  }

  function localQuestions() {
    return typeof Q !== 'undefined' && Array.isArray(Q) ? Q : [];
  }

  function localRichTopics() {
    return typeof window !== 'undefined' && Array.isArray(window.CC_TUTOR_KNOWLEDGE)
      ? window.CC_TUTOR_KNOWLEDGE
      : [];
  }

  function courseSource(courses, courseId, preferredTopic) {
    const course = courses.find(item => item[0] === courseId);
    if (!course) return {};
    const topics = Array.isArray(course[4]) ? course[4] : [];
    let topicIndex = preferredTopic
      ? topics.findIndex(topic => normalize(topic[0]) === normalize(preferredTopic))
      : -1;
    if (topicIndex < 0 && preferredTopic) {
      const alias = COURSE_TOPIC_ALIASES[courseId]?.[normalize(preferredTopic)];
      if (alias) topicIndex = topics.findIndex(topic => normalize(topic[0]) === normalize(alias));
    }
    if (topicIndex < 0 && preferredTopic) {
      const wanted = new Set(tokenize(preferredTopic).map(stemTerm));
      let bestScore = 0;
      let bestTitleScore = 0;
      topics.forEach((topic, index) => {
        const titleTokens = new Set(tokenize(topic[0]).map(stemTerm));
        const contentTokens = new Set(tokenize(`${topic[1] || ''} ${topic[2] || ''}`).map(stemTerm));
        const titleScore = [...wanted].filter(term => titleTokens.has(term)).length;
        const score = [...wanted].filter(term => titleTokens.has(term) || contentTokens.has(term)).length;
        if (score > bestScore) {
          bestScore = score;
          bestTitleScore = titleScore;
          topicIndex = index;
        }
      });
      if (!bestTitleScore && bestScore < Math.min(2, wanted.size)) topicIndex = -1;
    }
    if (topicIndex < 0 && !preferredTopic && topics.length) topicIndex = 0;
    if (topicIndex < 0) return {};
    return {
      sourceCourseId: course[0],
      sourceCourseName: course[1],
      sourceTopicIndex: topicIndex,
      sourceTopicTitle: topicIndex >= 0 ? topics[topicIndex][0] : ''
    };
  }

  function exerciseHints(exercise) {
    if (exercise.kind === 'rich' && exercise.exercise) {
      const firstCase = exercise.exercise.cases?.[0];
      return [
        `Empieza por concretar qué debe conseguir el ejercicio: ${exercise.exercise.statement}`,
        firstCase ? `Prueba este caso y sigue el cambio de entrada a salida: ${firstCase.input} → ${firstCase.expected}` : 'Separa la solución en pasos pequeños y comprueba cada uno.',
        Array.isArray(exercise.mistakes) && exercise.mistakes.length
          ? `Antes de terminar, revisa estos errores comunes: ${exercise.mistakes.slice(0, 2).join('; ')}`
          : 'Prueba también una entrada vacía y otra en el límite.'
      ];
    }
    const criteria = Array.isArray(exercise[4])
      ? exercise[4].map(item => item && item[0]).filter(Boolean).slice(0, 4)
      : [];
    return [
      exercise[6] || 'Separa el problema en pasos pequeños y revisa qué debe devolver cada paso.',
      criteria.length
        ? `Comprueba estos puntos por separado: ${criteria.join('; ')}.`
        : 'Escribe primero la entrada, el resultado esperado y una operación que los conecte.',
      'Prueba un caso normal y uno límite. Después compara tu solución con la referencia del reto si necesitas más ayuda.'
    ];
  }

  function buildIndex(courses = localCourses(), exercises = localExercises(), questions = localQuestions(), knowledge = KNOWLEDGE, richTopics = localRichTopics()) {
    const entries = [];
    for (const item of knowledge) {
      const source = courseSource(courses, item.courseId, item.sourceTopic);
      const course = courses.find(courseItem => courseItem[0] === item.courseId);
      entries.push({
        ...item,
        kind: 'knowledge',
        courseName: course ? course[1] : item.courseId,
        keywords: item.keywords || [],
        ...source
      });
    }

    for (const course of courses) {
      const [courseId, courseName, track, description, topics] = course;
      if (!Array.isArray(topics)) continue;
      topics.forEach((topic, index) => {
        entries.push({
          kind: 'lesson', courseId, courseName, track, index,
          title: topic[0], description: topic[1], example: topic[2] || '', keywords: [],
          ...courseSource(courses, courseId, topic[0])
        });
      });
    }

    for (const question of questions) {
      if (!Array.isArray(question) || typeof question[1] !== 'string' || !question[1].trim()) continue;
      const category = normalize(question[0]);
      const courseId = CATEGORY_TO_COURSE[category] || category;
      const source = courseSource(courses, courseId, question[1]);
      const course = courses.find(courseItem => courseItem[0] === courseId);
      entries.push({
        kind: 'quiz', courseId: '', courseName: course ? course[1] : `${question[0]} · banco local`,
        title: question[1], description: question[4] || 'Consulta el tema relacionado para repasar este concepto.',
        example: '', keywords: [], ...source
      });
    }

    const exerciseCourseIds = { oop: 'java', xpath: 'xml', database: 'sql', api: 'node', backend: 'node' };
    for (const exercise of exercises) {
      if (!Array.isArray(exercise) || typeof exercise[1] !== 'string') continue;
      const courseId = exerciseCourseIds[exercise[0]] || exercise[0];
      const source = courseSource(courses, courseId, exercise[1].split(' · ').slice(1).join(' · '));
      entries.push({
        kind: 'exercise', courseId: '', courseName: `${exercise[0]} · práctica`, track: exercise[0],
        title: exercise[1], description: exercise[2] || '', example: '', keywords: [],
        hints: exerciseHints(exercise), ...source
      });
    }

    for (const topic of richTopics) {
      if (!topic || typeof topic.title !== 'string' || typeof topic.explanation !== 'string') continue;
      const courseId = TRACK_TO_COURSE[normalize(topic.track)];
      const source = courseId ? courseSource(courses, courseId, topic.title) : {};
      const entriesForTopic = {
        ...topic,
        kind: 'rich',
        courseId: '',
        courseName: topic.track,
        description: topic.explanation,
        answer: topic.explanation,
        keywords: topic.keywords || [topic.track, topic.title],
        hints: exerciseHints({ ...topic, kind: 'rich' }),
        ...source
      };
      entries.push(entriesForTopic);
    }
    return entries;
  }

  function rank(item, terms, question) {
    const heading = new Set(tokenize(`${item.courseName} ${item.track || ''} ${item.title}`));
    const keywords = new Set(tokenize((item.keywords || []).join(' ')));
    const exerciseText = item.exercise ? `${item.exercise.statement || ''} ${(item.exercise.cases || []).map(testCase => `${testCase.input} ${testCase.expected}`).join(' ')} ${(item.exercise.alternatives || []).join(' ')}` : '';
    const body = new Set(tokenize(`${item.description || ''} ${item.answer || ''} ${item.example || ''} ${item.exampleContext || ''} ${item.output || ''} ${(item.mistakes || []).join(' ')} ${exerciseText} ${(item.hints || []).join(' ')} ${(item.sources || []).map(source => source.label).join(' ')} ${item.kind === 'exercise' ? 'reto practica pista pistas' : ''}`));
    let score = 0;
    let matched = 0;
    for (const term of new Set(terms)) {
      if (heading.has(term)) {
        score += 8;
        matched += 1;
      } else if (keywords.has(term)) {
        score += 7;
        matched += 1;
      } else if (body.has(term)) {
        score += 2;
        matched += 1;
      }
    }
    const phraseMatch = (item.keywords || []).some(keyword => {
      const phrase = normalize(keyword).trim();
      return phrase.length > 2 && question.includes(phrase);
    });
    if (phraseMatch) score += 8;
    if (item.kind === 'knowledge' || item.kind === 'rich') score += 1.5;
    if (item.kind === 'lesson') score += 0.5;
    const termCount = new Set(terms).size;
    if (!matched || (termCount === 1 && !heading.has(terms[0]) && !keywords.has(terms[0]))) return 0;
    if (termCount > 1 && matched / termCount < 0.5) return 0;
    return score;
  }

  function search(question, context = {}) {
    const query = normalize(question).trim();
    const terms = [...new Set(tokenize(query))];
    if (!terms.length) return [];
    return buildIndex(context.courses, context.exercises, context.questions, context.knowledge, context.richTopics)
      .map(item => ({ ...item, score: rank(item, terms, query) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || (a.kind === 'knowledge' ? -1 : b.kind === 'knowledge' ? 1 : 0))
      .slice(0, 3);
  }

  function loadTutorCorpus() {
    if (typeof document === 'undefined' || typeof window === 'undefined') return Promise.resolve([]);
    if (Array.isArray(window.CC_TUTOR_KNOWLEDGE)) return Promise.resolve(window.CC_TUTOR_KNOWLEDGE);
    return new Promise(resolve => {
      const url = new window.URL('./tutor-conocimiento.js', window.location.href);
      if (url.origin !== window.location.origin) return resolve([]);
      const script = document.createElement('script');
      script.async = true;
      script.dataset.ccTutorKnowledge = 'true';
      script.src = url.href;
      script.onload = () => resolve(Array.isArray(window.CC_TUTOR_KNOWLEDGE) ? window.CC_TUTOR_KNOWLEDGE : []);
      script.onerror = () => resolve([]);
      document.head.append(script);
    });
  }

  function followUpIntent(question) {
    const query = normalize(question).trim();
    const startsAsFollowUp = /^(?:y\b|eso\b|esto\b|esa parte\b|ese tema\b|lo anterior\b|no entiendo\b|puedes ampliar\b|podrias ampliar\b|amplia\b|explica mejor\b|como lo practico\b)/.test(query);
    const compact = tokenize(query);
    const namesTechnology = /\b(?:java|javascript|python|kotlin|react|sql|xpath|xml|node|html|css)\b/.test(query);
    let intent = '';
    if (/\b(?:ejemplo|ejemplos|codigo)\b/.test(query)) intent = 'example';
    else if (/\b(?:salida|output|resultado esperado)\b/.test(query)) intent = 'output';
    else if (/\b(?:errores comunes|errores|fallos|equivocaciones)\b/.test(query)) intent = 'mistakes';
    else if (/\b(?:practica|practico|practicar|ejercicio|casos de prueba|casos)\b/.test(query)) intent = 'practice';
    else if (/\b(?:pista|pistas|ayuda paso a paso)\b/.test(query)) intent = 'hint';
    else if (/\b(?:solucion|codigo completo|respuesta completa)\b/.test(query)) intent = 'solution';
    else if (/\b(?:fuente|fuentes|referencias|documentacion)\b/.test(query)) intent = 'sources';
    else if (/\b(?:mas detalle|amplia|ampliar|explica mejor|no entiendo|por que)\b/.test(query)) intent = 'detail';
    if (!intent) return '';
    if (namesTechnology) return '';
    if (startsAsFollowUp) return intent;
    return compact.length <= 3 && !namesTechnology ? intent : '';
  }

  function followUpAnswer(context, question) {
    if (!context || !context.item) return null;
    const intent = followUpIntent(question);
    if (!intent) return null;
    const original = context.item;
    const item = { ...original, hintState: context.hintState };
    item.showExample = false;
    item.showOutput = false;
    item.showMistakes = false;
    item.showPractice = false;
    item.showSolutionButton = false;
    if (intent === 'example') {
      if (!item.example) return { text: 'Este tema no tiene un ejemplo de código en el corpus local.', item };
      item.showExample = true;
      return { text: `Aquí tienes el ejemplo de ${item.track || item.courseName} · ${item.title}.`, item };
    }
    if (intent === 'output') {
      if (!item.output) return { text: 'No hay una salida de ejemplo para este resultado. Revisa el tema relacionado.', item: { ...item, showExample: false } };
      item.showExample = false;
      item.showOutput = true;
      return { text: `La salida esperada para ${item.title} es:`, item };
    }
    if (intent === 'mistakes') {
      if (!Array.isArray(item.mistakes) || !item.mistakes.length) return { text: 'No hay errores frecuentes adicionales guardados para este tema. Puedo mostrarte el ejemplo o abrir la fuente.', item: { ...item, showExample: false } };
      item.showExample = false;
      item.showMistakes = true;
      return { text: `Errores comunes en ${item.title}:`, item };
    }
    if (intent === 'practice') {
      if (!item.exercise && item.kind !== 'exercise') return { text: 'No hay una práctica asociada a esta entrada del corpus. Abre el tema relacionado para continuar.', item: { ...item, showExample: false } };
      item.showExample = false;
      item.showPractice = true;
      return { text: `Vamos a practicar ${item.title}. Las pistas se revelan una a una.`, item };
    }
    if (intent === 'hint') {
      const hints = Array.isArray(item.hints) && item.hints.length
        ? item.hints
        : item.kind === 'knowledge' && Array.isArray(item.steps)
          ? item.steps
          : item.kind === 'rich' && item.exercise
            ? exerciseHints(item)
            : [];
      if (!hints.length) return { text: 'Esta entrada no tiene una práctica con pistas graduadas. Puedo ampliar la explicación o mostrar el tema relacionado.', item };
      const state = context.hintState || (context.hintState = { index: 0 });
      item.hints = hints;
      item.hintState = state;
      item.showExample = false;
      item.showPractice = !!item.exercise || item.kind === 'exercise';
      if (state.index >= hints.length) return { text: 'Ya has visto las pistas disponibles. Si quieres, puedes abrir el tema o solicitar la solución de referencia de forma explícita.', item };
      const index = state.index++;
      return { text: `Pista ${index + 1} de ${hints.length}: ${hints[index]}`, item };
    }
    if (intent === 'solution') {
      if (!item.exercise || !item.exercise.solution) return { text: 'Esta entrada no incluye una solución de referencia. Puedo volver a explicar el concepto o mostrar sus fuentes.', item: { ...item, showExample: false } };
      item.showExample = false;
      item.showPractice = true;
      item.showSolutionButton = true;
      return { text: 'La solución de referencia solo aparecerá si pulsas el botón. Antes, intenta resolver los casos de prueba.', item };
    }
    if (intent === 'sources') {
      item.showExample = false;
      return { text: Array.isArray(item.sources) && item.sources.length ? 'He usado las fuentes enlazadas al final de esta respuesta; se abrirán solo si pulsas un enlace.' : 'No hay fuentes externas asociadas a esta entrada; puedes abrir el tema local relacionado.', item };
    }
    item.showExample = false;
    item.showMistakes = Array.isArray(item.mistakes) && item.mistakes.length > 0;
    item.showPractice = !!item.exercise;
    return { text: item.explanation || item.answer || item.description || 'No tengo más detalle local para este tema.', item };
  }

  function runtimeAnswer(question, runtimeInfo, availableLanguages) {
    const normalizedQuestion = normalize(question);
    if (!/\b(?:ide|editor|ejecut\w*|compil\w*|runtime|motor|instal\w*)\b/.test(normalizedQuestion)) return '';
    const languages = Array.isArray(availableLanguages)
      ? availableLanguages
      : (typeof IDE_LANGS !== 'undefined' && Array.isArray(IDE_LANGS) ? IDE_LANGS : []);
    const requested = languages
      .filter(language => [language.id, language.label].some(value => value && normalizedQuestion.includes(normalize(value))))
      .sort((a, b) => Math.max(String(b.id || '').length, String(b.label || '').length) - Math.max(String(a.id || '').length, String(a.label || '').length))[0];
    if (requested && runtimeInfo && requested.id !== runtimeInfo.id) {
      return `Para revisar ${requested.label}, selecciónalo en el IDE interno. El motor y sus límites aparecen junto al editor; ahora está seleccionado ${runtimeInfo.label}.`;
    }
    if (runtimeInfo && runtimeInfo.description) {
      return `En el IDE interno, el lenguaje seleccionado es ${runtimeInfo.label}. ${runtimeInfo.description}`;
    }
    return 'El motor depende del lenguaje. Abre «IDE interno», selecciona una tecnología y consulta la etiqueta «Motor» y su descripción. Esta ayuda no ejecuta código.';
  }

  function formatAnswer(item, question) {
    const normalizedQuestion = normalize(question);
    if (item.kind === 'rich') {
      if (/\b(?:errores comunes|errores|fallos|equivocaciones)\b/.test(normalizedQuestion) && Array.isArray(item.mistakes) && item.mistakes.length) {
        item.showExample = false;
        item.showMistakes = true;
        return `Errores que conviene evitar en ${item.track} · ${item.title}:`;
      }
      if (/\b(?:practica|ejercicio|casos de prueba|pista|pistas)\b/.test(normalizedQuestion) && item.exercise) {
        item.showExample = false;
        item.showPractice = true;
        return `Práctica relacionada con ${item.track} · ${item.title}. Las pistas se revelan una a una.`;
      }
      if (/\b(?:solucion|codigo completo|respuesta completa)\b/.test(normalizedQuestion) && item.exercise?.solution) {
        item.showExample = false;
        item.showPractice = true;
        item.showSolutionButton = true;
        return 'La solución de referencia está protegida hasta que pulses el botón; primero puedes probar los casos de práctica.';
      }
      if (/\b(?:fuente|fuentes|referencias|documentacion)\b/.test(normalizedQuestion)) {
        item.showExample = false;
        return 'Estas fuentes respaldan el tema y se abren solo cuando pulsas uno de sus enlaces.';
      }
      if (/\b(?:salida|output|resultado esperado)\b/.test(normalizedQuestion)) {
        item.showExample = false;
        item.showOutput = true;
        return `Salida de ejemplo para ${item.track} · ${item.title}:`;
      }
      item.showExample = true;
      item.showOutput = true;
      return `${item.track} · ${item.title}: ${item.explanation}`;
    }
    if (item.kind === 'knowledge') {
      let answer = item.answer;
      if (/\b(?:diferencia|diferencias|comparar|compara|versus|vs)\b/.test(normalizedQuestion) && item.comparison) {
        answer += `\n\nDiferencia clave: ${item.comparison}`;
      } else if (/\b(?:pasos|paso a paso|como|por donde empiezo)\b/.test(normalizedQuestion) && Array.isArray(item.steps)) {
        answer += `\n\nPara abordarlo:\n${item.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}`;
      }
      return answer;
    }
    if (item.kind === 'quiz') return `Idea clave: ${item.description}`;
    if (item.kind === 'exercise') return `Reto relacionado: ${item.description}\nPuedo darte pistas de una en una, sin mostrar la solución completa.`;
    return `En el temario de ${item.courseName}, «${item.title}»: ${item.description}`;
  }

  function runtimeInfoFromPage() {
    if (typeof document === 'undefined') return null;
    const select = document.getElementById('ideLang');
    const description = document.getElementById('runDescription');
    if (!select || !description) return null;
    const option = select.options[select.selectedIndex];
    return {
      id: select.value,
      label: option ? option.textContent.replace(/^.*?·\s*/, '') : select.value,
      description: description.textContent.trim()
    };
  }

  function createMessage(text, item, isUser = false) {
    const article = document.createElement('article');
    article.className = `cc-tutor-message${isUser ? ' cc-tutor-user' : ''}`;
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    article.append(paragraph);

    if (item?.example && (item.kind !== 'rich' || item.showExample)) {
      const code = document.createElement('pre');
      code.textContent = item.example;
      article.append(code);
      if (item.exampleContext) {
        const context = document.createElement('p');
        context.textContent = `Contexto del ejemplo: ${item.exampleContext}`;
        article.append(context);
      }
    }

    if (item?.kind === 'rich' && item.showOutput && item.output) {
      const output = document.createElement('p');
      output.textContent = `Salida esperada: ${item.output}`;
      article.append(output);
    }

    if (item?.showMistakes && Array.isArray(item.mistakes)) {
      const list = document.createElement('ul');
      for (const mistake of item.mistakes) {
        const entry = document.createElement('li');
        entry.textContent = mistake;
        list.append(entry);
      }
      article.append(list);
    }

    if (item?.showPractice && item.exercise && typeof item.exercise === 'object') {
      const practice = document.createElement('p');
      practice.textContent = `Práctica: ${item.exercise.statement || ''}`;
      article.append(practice);
      if (Array.isArray(item.exercise.cases) && item.exercise.cases.length) {
        const cases = document.createElement('ul');
        for (const testCase of item.exercise.cases.slice(0, 4)) {
          const entry = document.createElement('li');
          entry.textContent = `${testCase.input} → ${testCase.expected}`;
          cases.append(entry);
        }
        article.append(cases);
      }
    }

    if (item?.showSolutionButton && item.exercise?.solution) {
      const solutionButton = document.createElement('button');
      solutionButton.type = 'button';
      solutionButton.className = 'cc-tutor-open';
      solutionButton.textContent = 'Mostrar solución de referencia';
      solutionButton.setAttribute('aria-expanded', 'false');
      const solution = document.createElement('pre');
      solution.hidden = true;
      solution.textContent = item.exercise.solution;
      solutionButton.addEventListener('click', () => {
        solution.hidden = !solution.hidden;
        solutionButton.setAttribute('aria-expanded', String(!solution.hidden));
        solutionButton.textContent = solution.hidden ? 'Mostrar solución de referencia' : 'Ocultar solución de referencia';
      });
      article.append(solutionButton, solution);
    }

    if (item) {
      const source = document.createElement('p');
      if (item.kind === 'exercise') source.textContent = `Fuente: reto local «${item.title}».`;
      else if (item.kind === 'quiz') source.textContent = `Fuente: banco local · ${item.title}.`;
      else if (item.kind === 'rich') source.textContent = `Fuente: temario local · ${item.track} · ${item.title}.`;
      else source.textContent = `Fuente: ${item.sourceCourseName || item.courseName} · ${item.sourceTopicTitle || item.title}.`;
      article.append(source);

      if (item.sourceCourseId && item.sourceTopicIndex >= 0) {
        const open = document.createElement('button');
        open.type = 'button';
        open.className = 'cc-tutor-open';
        open.textContent = 'Abrir tema del aula';
        open.addEventListener('click', () => {
          if (typeof courseId === 'undefined' || typeof page !== 'function') return;
          courseId = item.sourceCourseId;
          topicId = item.sourceTopicIndex;
          page('lesson');
        });
        article.append(open);
      } else if (item.kind === 'rich' && item.pdfPath) {
        const pdf = document.createElement('a');
        pdf.className = 'cc-tutor-open';
        pdf.href = item.pdfPath;
        pdf.target = '_blank';
        pdf.rel = 'noopener noreferrer';
        pdf.textContent = `Abrir PDF: ${item.track} · ${item.title}`;
        article.append(pdf);
      }

      if (Array.isArray(item.sources) && item.sources.length) {
        const sourceList = document.createElement('ul');
        for (const reference of item.sources) {
          if (!reference || typeof reference.url !== 'string' || typeof reference.label !== 'string') continue;
          const entry = document.createElement('li');
          const link = document.createElement('a');
          link.href = reference.url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = reference.label;
          entry.append(link);
          sourceList.append(entry);
        }
        if (sourceList.children.length) {
          const label = document.createElement('p');
          label.textContent = 'Fuentes de referencia:';
          article.append(label, sourceList);
        }
      }

      const canShowHints = item.kind === 'exercise' || (item.kind === 'rich' && item.showPractice);
      if (canShowHints && Array.isArray(item.hints) && item.hints.length) {
        const hintButton = document.createElement('button');
        hintButton.type = 'button';
        hintButton.className = 'cc-tutor-open cc-tutor-hint';
        const hintState = item.hintState || (item.hintState = { index: 0 });
        const allHintsShown = hintState.index >= item.hints.length;
        hintButton.setAttribute('aria-expanded', 'false');
        const hintId = `ccTutorHint${++hintSequence}`;
        hintButton.setAttribute('aria-controls', hintId);
        const hintText = document.createElement('p');
        hintText.id = hintId;
        hintText.className = 'cc-tutor-hint-text';
        hintText.hidden = true;
        hintText.setAttribute('role', 'status');
        hintButton.disabled = allHintsShown;
        hintButton.textContent = allHintsShown ? 'Has visto todas las pistas' : `Mostrar pista ${hintState.index + 1} de ${item.hints.length}`;
        hintButton.addEventListener('click', () => {
          const hintIndex = hintState.index;
          hintText.hidden = false;
          hintText.textContent = `Pista ${hintIndex + 1} de ${item.hints.length}: ${item.hints[hintIndex]}`;
          hintState.index += 1;
          hintButton.setAttribute('aria-expanded', 'true');
          if (hintState.index < item.hints.length) hintButton.textContent = `Mostrar pista ${hintState.index + 1} de ${item.hints.length}`;
          else {
            hintButton.textContent = 'Has visto todas las pistas';
            hintButton.disabled = true;
          }
        });
        article.append(hintButton, hintText);
      }
    }
    return article;
  }

  let hintSequence = 0;

  function init() {
    if (!document.body || document.getElementById('ccTutorToggle')) return;
    const styles = `
      #ccTutorToggle{position:fixed;right:18px;bottom:18px;z-index:20;border:1px solid #111;background:#111;color:#fff;padding:12px 16px;font:inherit;font-size:14px;cursor:pointer}
      #ccTutorPanel{position:fixed;right:18px;bottom:76px;z-index:21;width:min(410px,calc(100vw - 24px));height:min(620px,calc(100dvh - 105px));display:flex;flex-direction:column;background:#fff;color:#111;border:1px solid #dedbd6;box-shadow:0 8px 32px #0002}
      #ccTutorPanel[hidden]{display:none}
      .cc-tutor-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:14px;border-bottom:1px solid #dedbd6}
      .cc-tutor-head h2{font-size:20px;margin:0 0 4px;font-weight:500}
      .cc-tutor-head p{font-size:12px;color:#454545;margin:0;max-width:290px;line-height:1.45}
      .cc-tutor-head-actions{display:flex;gap:6px;align-items:flex-start}
      .cc-tutor-close,.cc-tutor-clear,.cc-tutor-open,.cc-tutor-suggestions button{border:1px solid #777;background:#fff;color:#111;padding:7px 9px;font:inherit;cursor:pointer}
      #ccTutorMessages{flex:1;overflow:auto;padding:12px;background:#faf9f6}
      .cc-tutor-message{margin:0 0 12px;padding:12px;background:#fff;border:1px solid #dedbd6;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5}
      .cc-tutor-message.cc-tutor-user{background:#f1eee9}
      .cc-tutor-message p{margin:0 0 8px}
      .cc-tutor-message pre{margin:8px 0 0;max-height:180px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;background:#f4f6fa;padding:10px;font:12px/1.5 ui-monospace,monospace}
      .cc-tutor-open{margin:6px 6px 0 0}
      .cc-tutor-hint-text{margin-top:8px!important;background:#f4f6fa;padding:9px}
      .cc-tutor-suggestions{display:flex;gap:6px;flex-wrap:wrap;padding:0 12px 10px}
      .cc-tutor-suggestions button{font-size:12px}
      #ccTutorForm{display:flex;gap:8px;padding:12px;border-top:1px solid #dedbd6}
      #ccTutorQuestion{min-width:0;flex:1;border:1px solid #777;padding:10px;font:inherit}
      #ccTutorForm button{border:1px solid #111;background:#111;color:#fff;padding:9px 12px;font:inherit;cursor:pointer}
      #ccTutorToggle:focus-visible,#ccTutorPanel button:focus-visible,#ccTutorQuestion:focus-visible{outline:3px solid #0007cb;outline-offset:2px}
      #ccTutorPanel button:disabled{cursor:default;color:#454545;background:#eee}
      @media(max-width:720px){#ccTutorToggle{bottom:76px;right:12px}#ccTutorPanel{right:8px;bottom:132px;width:calc(100vw - 16px);height:min(620px,calc(100dvh - 155px))}}
      @media(prefers-reduced-motion:reduce){#ccTutorPanel{scroll-behavior:auto}}
    `;
    const style = document.createElement('style');
    style.textContent = styles;
    document.head.append(style);

    const toggle = document.createElement('button');
    toggle.id = 'ccTutorToggle';
    toggle.type = 'button';
    toggle.textContent = 'Tutor local';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'ccTutorPanel');

    const panel = document.createElement('section');
    panel.id = 'ccTutorPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-labelledby', 'ccTutorTitle');
    panel.setAttribute('aria-describedby', 'ccTutorNote');
    panel.hidden = true;

    const header = document.createElement('header');
    header.className = 'cc-tutor-head';
    const heading = document.createElement('div');
    const title = document.createElement('h2');
    title.id = 'ccTutorTitle';
    title.textContent = 'Tutor local de estudio';
    const note = document.createElement('p');
    note.id = 'ccTutorNote';
    note.textContent = DISCLOSURE;
    heading.append(title, note);
    const headerActions = document.createElement('div');
    headerActions.className = 'cc-tutor-head-actions';
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'cc-tutor-clear';
    clear.textContent = 'Borrar';
    clear.setAttribute('aria-label', 'Borrar la conversación local');
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'cc-tutor-close';
    close.textContent = 'Cerrar';
    close.setAttribute('aria-label', 'Cerrar ayuda para estudiar');
    headerActions.append(clear, close);
    header.append(heading, headerActions);

    const messages = document.createElement('div');
    messages.id = 'ccTutorMessages';
    messages.setAttribute('role', 'log');
    messages.setAttribute('aria-label', 'Mensajes de ayuda');
    messages.setAttribute('aria-live', 'polite');
    messages.setAttribute('aria-relevant', 'additions text');
    const welcome = 'Escribe una duda o elige un ejemplo. Buscaré en los temas, el banco de preguntas y las prácticas locales. Si no encuentro una fuente adecuada, te lo diré.';
    messages.append(createMessage(welcome));

    const suggestions = document.createElement('div');
    suggestions.className = 'cc-tutor-suggestions';
    suggestions.setAttribute('role', 'group');
    suggestions.setAttribute('aria-label', 'Preguntas de ejemplo');
    for (const text of ['tipos primitivos Java', 'INNER JOIN y LEFT JOIN', 'pista para Python', 'XPath', 'CTE en SQL']) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = text;
      suggestions.append(button);
    }

    const form = document.createElement('form');
    form.id = 'ccTutorForm';
    const input = document.createElement('input');
    input.id = 'ccTutorQuestion';
    input.name = 'question';
    input.type = 'search';
    input.maxLength = 240;
    input.placeholder = 'Ej. ¿Para qué sirve una lista?';
    input.setAttribute('aria-label', 'Escribe una duda sobre programación');
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.textContent = 'Buscar';
    form.append(input, submit);

    panel.append(header, messages, suggestions, form);
    document.body.append(toggle, panel);
    let richCorpusPromise = null;
    let lastContext = null;
    let clearRevision = 0;

    function ensureRichCorpus() {
      if (!richCorpusPromise) richCorpusPromise = loadTutorCorpus();
      return richCorpusPromise;
    }

    function setOpen(open) {
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (open) input.focus();
      else toggle.focus();
    }

    async function ask(question) {
      const clean = String(question || '').trim();
      if (!clean) return;
      const revision = clearRevision;
      messages.append(createMessage(clean, null, true));
      if (clean.length > 240) {
        messages.append(createMessage('La duda supera el límite de 240 caracteres. Resume el concepto o el error que quieres revisar.'));
        return;
      }
      const runtime = runtimeAnswer(clean, runtimeInfoFromPage());
      if (runtime) {
        lastContext = null;
        messages.append(createMessage(runtime));
      } else {
        const contextual = lastContext ? followUpAnswer(lastContext, clean) : null;
        if (contextual) {
          messages.append(createMessage(contextual.text, contextual.item));
        } else {
          const pending = createMessage('Buscando en el contenido local…');
          messages.append(pending);
          const richTopics = await ensureRichCorpus();
          pending.remove();
          if (revision !== clearRevision) return;
          const matches = search(clean, { richTopics });
          if (matches.length) {
            const best = matches[0];
            let answer = formatAnswer(best, clean);
            const alternatives = matches.slice(1).filter(item => item.score >= best.score - 5);
            if (alternatives.length) answer += `\n\nTambién relacionados: ${alternatives.map(item => `${item.courseName} · ${item.title}`).join('; ')}.`;
            if (!richTopics.length) answer += '\n\nEl corpus ampliado no se ha podido cargar; esta respuesta procede del resto del material local.';
            lastContext = { item: best, hintState: { index: 0 } };
            messages.append(createMessage(answer, { ...best, hintState: lastContext.hintState }));
          } else {
            lastContext = null;
            messages.append(createMessage('No encuentro una fuente local suficientemente relacionada. Prueba con un nombre de tecnología o concepto, por ejemplo «tipos primitivos Java», «LEFT JOIN» o «XPath». No voy a inventar una respuesta fuera del contenido incluido.'));
          }
        }
      }
      while (messages.children.length > 41) messages.removeChild(messages.children[1]);
      messages.scrollTop = messages.scrollHeight;
      input.value = '';
    }

    toggle.addEventListener('click', () => {
      const open = panel.hidden;
      setOpen(open);
      if (open) ensureRichCorpus();
    });
    close.addEventListener('click', () => setOpen(false));
    clear.addEventListener('click', () => {
      clearRevision += 1;
      messages.replaceChildren(createMessage(welcome));
      lastContext = null;
      input.value = '';
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      ask(input.value);
    });
    suggestions.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (button) ask(button.textContent);
    });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') setOpen(false);
    });
  }

  const api = { DISCLOSURE, KNOWLEDGE, buildIndex, search, exerciseHints, formatAnswer, followUpAnswer, runtimeAnswer };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
  }
})();
