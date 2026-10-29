(function (root) {
  "use strict";

  const MAX_SOURCE_LENGTH = 20000;
  const MAX_TIMEOUT_MS = 5000;
  const MAX_OUTPUT_CHARS = 12000;
  const MAX_SQL_QUERY_CHARS = 4000;
  const PRACTICES = {
    "JavaScript · filtrar aprobados": {
      language: "js", input: "notas", output: "aprobadas",
      cases: [
        {input:[4,7,3,9,5],expected:[7,9,5]},
        {input:[],expected:[]},
        {input:[0,4,4.99],expected:[]},
        {input:[5,6,10],expected:[5,6,10]}
      ]
    },
    "JavaScript · contar frecuencias": {
      language: "js", input: "palabras", output: "frecuencia",
      cases: [
        {input:["sol","luna","sol"],expected:{sol:2,luna:1}},
        {input:[],expected:{}},
        {input:["a","a","b","c","b"],expected:{a:2,b:2,c:1}}
      ]
    },
    "Python · máximo de una lista": {
      language: "python", input: "numeros", callable: "maximo",
      cases: [
        {input:[4,7,9,3],expected:9},
        {input:[-8,-2,-5],expected:-2},
        {input:[6],expected:6},
        {input:[2,2,1],expected:2}
      ]
    },
    "Python · validar nota": {
      language: "python", input: "nota", callable: "validar_nota",
      cases: [
        {input:0,expected:true},{input:10,expected:true},{input:5,expected:true},
        {input:-0.01,expected:false},{input:10.01,expected:false}
      ]
    },
    "SQL · listar aprobados": {
      language: "sql", tables:["alumnos"], orderedBy: ["nota", "grade", "score"],
      requiredColumnGroups:[["nombre","name","student_name"],["nota","grade","score"]],
      cases: [
        {setup:["CREATE TABLE alumnos(id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, nota REAL)","INSERT INTO alumnos VALUES (1,'Ana',8.5),(2,'Bea',5),(3,'Ciro',4.99),(4,'Dora',10),(5,'Eli',5)"],expected:[
          {id:4,alumno_id:4,student_id:4,nombre:"Dora",name:"Dora",student_name:"Dora",nota:10,grade:10,score:10},
          {id:1,alumno_id:1,student_id:1,nombre:"Ana",name:"Ana",student_name:"Ana",nota:8.5,grade:8.5,score:8.5},
          {id:2,alumno_id:2,student_id:2,nombre:"Bea",name:"Bea",student_name:"Bea",nota:5,grade:5,score:5},
          {id:5,alumno_id:5,student_id:5,nombre:"Eli",name:"Eli",student_name:"Eli",nota:5,grade:5,score:5}
        ]},
        {setup:["CREATE TABLE alumnos(id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, nota REAL)","INSERT INTO alumnos VALUES (1,'Fátima',6),(2,'Gus',4),(3,'Hugo',9),(4,'Inés',0)"],expected:[
          {id:3,alumno_id:3,student_id:3,nombre:"Hugo",name:"Hugo",student_name:"Hugo",nota:9,grade:9,score:9},
          {id:1,alumno_id:1,student_id:1,nombre:"Fátima",name:"Fátima",student_name:"Fátima",nota:6,grade:6,score:6}
        ]}
      ]
    },
    "SQL · media por curso": {
      language: "sql", tables:["alumnos"],
      requiredColumnGroups:[["curso_id","course_id","id_curso"],["media","promedio","average","avg","avg_nota"]],
      cases: [
        {setup:["CREATE TABLE alumnos(id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, nota REAL, curso_id INTEGER)","INSERT INTO alumnos VALUES (1,'Ana',7,10),(2,'Bea',9,10),(3,'Ciro',4,20),(4,'Dora',6,20),(5,'Eli',3,30),(6,'Fran',4,30),(7,'Gus',NULL,40)"],expected:[
          {curso_id:10,course_id:10,id_curso:10,media:8,promedio:8,average:8,avg:8,avg_nota:8},
          {curso_id:20,course_id:20,id_curso:20,media:5,promedio:5,average:5,avg:5,avg_nota:5}
        ]},
        {setup:["CREATE TABLE alumnos(id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, nota REAL, curso_id INTEGER)","INSERT INTO alumnos VALUES (1,'Hana',4,1),(2,'Ivo',6,1),(3,'Jana',4.9,2),(4,'Kiko',5.08,2),(5,'Luz',7,3),(6,'Mara',7.5,3)"],expected:[
          {curso_id:1,course_id:1,id_curso:1,media:5,promedio:5,average:5,avg:5,avg_nota:5},
          {curso_id:3,course_id:3,id_curso:3,media:7.25,promedio:7.25,average:7.25,avg:7.25,avg_nota:7.25}
        ]}
      ]
    },
    "SQL · detectar registros sin relación": {
      language: "sql", tables:["clientes","pedidos"],
      requiredColumnGroups:[["id","cliente_id","client_id","nombre","name","client_name"]],
      cases: [
        {setup:["CREATE TABLE clientes(id INTEGER PRIMARY KEY, nombre TEXT NOT NULL)","CREATE TABLE pedidos(id INTEGER PRIMARY KEY, cliente_id INTEGER)","INSERT INTO clientes VALUES (1,'Ana'),(2,'Luis'),(3,'Marta'),(4,'Zoe')","INSERT INTO pedidos VALUES (1,1),(2,3),(3,NULL)"],expected:[
          {id:2,cliente_id:2,client_id:2,nombre:"Luis",name:"Luis",client_name:"Luis"},
          {id:4,cliente_id:4,client_id:4,nombre:"Zoe",name:"Zoe",client_name:"Zoe"}
        ]},
        {setup:["CREATE TABLE clientes(id INTEGER PRIMARY KEY, nombre TEXT NOT NULL)","CREATE TABLE pedidos(id INTEGER PRIMARY KEY, cliente_id INTEGER)","INSERT INTO clientes VALUES (10,'Ada'),(11,'Beto'),(12,'Cora')","INSERT INTO pedidos VALUES (1,10)"],expected:[
          {id:11,cliente_id:11,client_id:11,nombre:"Beto",name:"Beto",client_name:"Beto"},
          {id:12,cliente_id:12,client_id:12,nombre:"Cora",name:"Cora",client_name:"Cora"}
        ]}
      ]
    }
  };

  function sourceText(answer) {
    return typeof answer === "string" ? answer : String(answer == null ? "" : answer);
  }

  function structuralReport(exercise, answer) {
    const criteria = Array.isArray(exercise) ? exercise[4] : exercise && exercise.criteria;
    const source = sourceText(answer);
    const checked = [];
    if (Array.isArray(criteria)) {
      criteria.forEach(function (entry) {
        if (!Array.isArray(entry) || entry.length < 2) return;
        try {
          const expression = entry[1] instanceof RegExp ? entry[1] : new RegExp(String(entry[1]));
          expression.lastIndex = 0;
          checked.push({label:String(entry[0]),passed:expression.test(source)});
        } catch (_) {
          checked.push({label:String(entry[0]),passed:false});
        }
      });
    }
    const percent = checked.length
      ? Math.round(checked.filter(function (item) { return item.passed; }).length / checked.length * 100)
      : 0;
    return {percent:percent,checks:checked};
  }

  function resultOnly(exercise, answer, reason, message) {
    const structural = structuralReport(exercise, answer);
    return {
      mode:"structural-only",executed:false,reason:reason,
      message:message || "Se han comprobado patrones del texto; no se ejecutó la solución.",
      percent:structural.percent,structuralPercent:structural.percent,behaviorPercent:null,
      checks:structural.checks,passed:structural.checks.filter(function (item) { return item.passed; }).length,
      total:structural.checks.length,cases:[]
    };
  }

  function getLanguage(exercise) {
    return String(Array.isArray(exercise) ? exercise[0] || "" : exercise && (exercise.language || exercise.lang) || "").toLowerCase();
  }

  function getTitle(exercise) {
    return String(Array.isArray(exercise) ? exercise[1] || "" : exercise && exercise.title || "");
  }

  function makeJsWorkerSource() {
    return `
      self.onmessage = function (event) {
        const replyPort = event.ports && event.ports[0];
        if (!replyPort) return;
        const send = replyPort.postMessage.bind(replyPort);
        try { Object.defineProperty(self, "close", {value:function(){},writable:false,configurable:false}); } catch (_) {}
        for (const name of ["fetch","XMLHttpRequest","WebSocket","EventSource","importScripts","Worker","SharedWorker","BroadcastChannel","indexedDB","caches","document","process","require"]) {
          try { Object.defineProperty(self, name, {value:undefined,writable:false,configurable:false}); } catch (_) {}
        }
        try {
          const data = event.data;
          if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(data.inputName) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(data.outputName)) {
            throw new Error("La práctica tiene nombres de variable no válidos.");
          }
          const declaration = new RegExp("(\\\\b(?:const|let|var)\\\\s+" + data.inputName + "\\\\s*=\\\\s*)(\\\\[[^\\\\[\\\\]]*\\\\])");
          const hasDeclaration = declaration.test(data.source);
          const uninitialized = new RegExp("\\\\b(?:let|var)\\\\s+" + data.inputName + "\\\\s*(?:;|(?=\\\\r?\\\\n|$))").exec(data.source);
          const assignment = new RegExp("(^\\\\s*|[;{}\\\\n]\\\\s*)(" + data.inputName + "\\\\s*=\\\\s*)(\\\\[[^\\\\[\\\\]]*\\\\])");
          const assignmentOffset = uninitialized ? uninitialized.index + uninitialized[0].length : 0;
          const separateAssignment = !hasDeclaration && uninitialized
            ? assignment.exec(data.source.slice(assignmentOffset))
            : null;
          const hasSeparateAssignment = !!separateAssignment;
          const runners = data.cases.map(function (test) {
            let source = data.source;
            if (hasDeclaration) {
              source = source.replace(declaration, function (match, prefix) {
                  return prefix + JSON.stringify(test.input);
              });
            } else if (hasSeparateAssignment) {
              const before = source.slice(0, assignmentOffset);
              const after = source.slice(assignmentOffset).replace(assignment, function (match, statementPrefix, assignmentPrefix) {
                return statementPrefix + assignmentPrefix + JSON.stringify(test.input);
              });
              source = before + after;
            }
            const readResult = "\\n;return typeof " + data.outputName + " === 'undefined' ? null : " + data.outputName + ";";
            return hasDeclaration || hasSeparateAssignment
              ? new Function(source + readResult)
              : new Function(data.inputName, source + readResult);
          });
          const values = data.cases.map(function (test, index) {
            try {
              const value = hasDeclaration || hasSeparateAssignment ? runners[index]() : runners[index](test.input);
              return {value:value};
            } catch (error) {
              return {error:String(error && error.message || error).slice(0,500)};
            }
          });
          send({ok:true,value:values});
        } catch (error) {
          send({ok:false,error:String(error && error.message || error).slice(0,500)});
        }
      };
    `;
  }

  function equalValues(actual, expected) {
    if (actual === expected) return true;
    if (actual == null || expected == null || typeof actual !== typeof expected) return false;
    if (Array.isArray(actual) || Array.isArray(expected)) {
      return Array.isArray(actual) && Array.isArray(expected) && actual.length === expected.length && actual.every(function (value, index) {
        return equalValues(value, expected[index]);
      });
    }
    if (typeof actual === "object") {
      const aKeys = Object.keys(actual).sort();
      const bKeys = Object.keys(expected).sort();
      return aKeys.length === bKeys.length && aKeys.every(function (key, index) {
        return key === bKeys[index] && equalValues(actual[key], expected[key]);
      });
    }
    return false;
  }

  const LIBRARY_TEST_DATA = `
    CREATE TABLE usuarios(id INTEGER PRIMARY KEY, nombre TEXT NOT NULL);
    CREATE TABLE libros(id INTEGER PRIMARY KEY, titulo TEXT NOT NULL, autor TEXT NOT NULL);
    CREATE TABLE prestamos(id INTEGER PRIMARY KEY, libro_id INTEGER NOT NULL, usuario_id INTEGER NOT NULL, fecha_devolucion TEXT, FOREIGN KEY(libro_id) REFERENCES libros(id), FOREIGN KEY(usuario_id) REFERENCES usuarios(id));
    INSERT INTO usuarios VALUES (1, 'Ana'), (2, 'Luis'), (3, 'Marta');
    INSERT INTO libros VALUES (1, 'Java', 'Irene'), (2, 'SQL', 'Pablo'), (3, 'Kotlin', 'Nora'), (4, 'XML', 'Leo');
    INSERT INTO prestamos VALUES (1, 1, 1, '2026-10-01'), (2, 2, 1, NULL), (3, 3, 2, NULL), (4, 1, 2, '2026-10-05');
  `;

  function sqlPolicyError(message) {
    const error = new Error(message);
    error.policyRejected = true;
    return error;
  }

  function sqlReferencesOnlyAllowedTables(query, allowedTables) {
    const allowed = new Set((allowedTables || ["usuarios","libros","prestamos"]).map(function (name) { return name.toLowerCase(); }));
    const ctes = Array.from(query.matchAll(/(?:\bWITH\b|,)\s*(?:"?([a-z_][a-z0-9_]*)"?)\s*(?:\([^)]*\)\s*)?AS\s*\(/gi), function (match) { return match[1].toLowerCase(); });
    ctes.forEach(function (name) { allowed.add(name); });
    const references = Array.from(query.matchAll(/\b(?:FROM|JOIN)\s+(?:"([^"]+)"|`([^`]+)`|\[([^\]]+)\]|([a-z_][a-z0-9_]*))/gi), function (match) {
      return String(match[1] || match[2] || match[3] || match[4] || "").toLowerCase();
    });
    return references.every(function (name) { return allowed.has(name); });
  }

  function normalizedSqlHeader(value) {
    return String(value || '').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  }

  function normalizedSqlValue(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function sqlHasBoundedStructure(query) {
    let depth = 0;
    let quote = '';
    for (let index = 0; index < query.length; index += 1) {
      const character = query[index];
      if (quote) {
        if (character === quote) {
          if (query[index + 1] === quote) index += 1;
          else quote = '';
        }
        continue;
      }
      if (character === "'" || character === '"') {
        quote = character;
      } else if (character === '(') {
        depth += 1;
        if (depth > 12) return false;
      } else if (character === ')') {
        depth -= 1;
        if (depth < 0) return false;
      }
    }
    return depth === 0 && (query.match(/\bSELECT\b/gi) || []).length <= 3;
  }

  function runReadOnlySql(database, source, onQuery, allowedTables) {
    const query = sourceText(source).trim();
    if (!query || query.length > MAX_SQL_QUERY_CHARS) throw sqlPolicyError('Escribe una consulta de hasta 4 KB.');
    if (!/^(?:select\b|with\b(?!\s+recursive\b))/i.test(query) || /;|--|\/\*|\*\/|\b(?:recursive|pragma|attach|detach|insert|update|delete|drop|alter|create|vacuum|load_extension|randomblob|zeroblob|values)\b/i.test(query)) {
      throw sqlPolicyError('Para proteger la prueba local, usa una consulta SELECT o un CTE no recursivo, sin comentarios ni cambios de datos.');
    }
    if (!sqlReferencesOnlyAllowedTables(query, allowedTables)) {
      throw sqlPolicyError('La consulta usa una tabla que no está habilitada para esta práctica.');
    }
    if (!sqlHasBoundedStructure(query)) {
      throw sqlPolicyError('La consulta supera el límite de anidamiento o de subconsultas permitido en esta práctica.');
    }
    if ((query.match(/\bJOIN\b/gi) || []).length > 2 || (query.match(/\bFROM\b/gi) || []).length > 2 || (query.match(/\bUNION\b/gi) || []).length > 2) {
      throw sqlPolicyError('La práctica admite hasta dos JOIN y dos consultas SELECT anidadas.');
    }
    const fromClauses = query.split(/\bFROM\b/i).slice(1);
    if (fromClauses.some(function (part) {
      const clause = part.split(/\b(?:WHERE|GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|UNION)\b/i)[0];
      return clause.includes(',');
    })) throw sqlPolicyError('Usa JOIN explícito en lugar de listas de tablas separadas por comas.');
    const calls = Array.from(query.matchAll(/\b([a-z_][a-z0-9_]*)\s*\(/gi), function (match) { return match[1].toLowerCase(); });
    const safeFunctions=['as','count','avg','sum','min','max','exists','in','coalesce','ifnull','lower','upper','trim','length','round','abs'];
    if (calls.some(function (name) { return !safeFunctions.includes(name); })) {
      throw sqlPolicyError('La práctica permite agregaciones y funciones escalares comunes; otras funciones SQL no están habilitadas en esta prueba.');
    }
    if (typeof onQuery === 'function') onQuery();
    const results = database.exec(query);
    if (!Array.isArray(results) || results.length !== 1 || !Array.isArray(results[0].columns) || !Array.isArray(results[0].values)) {
      throw new Error('La consulta debe devolver una única tabla de resultados.');
    }
    if (results[0].values.length > 50) throw new Error('La consulta devuelve más de 50 filas; limita el resultado.');
    return {
      columns:results[0].columns.map(normalizedSqlHeader),
      rows:results[0].values
    };
  }

  function projectedRowsMatch(result, expectedRows) {
    if (result.rows.length !== expectedRows.length) return false;
    const useful = result.columns.map(function (key, index) { return {key:key,index:index}; }).filter(function (column) {
      return column.key && expectedRows.every(function (row) { return Object.prototype.hasOwnProperty.call(row, column.key); });
    });
    if (!useful.length) return false;
    const rowMatches = function (values, expected) {
      return useful.every(function (column) {
        const actual = values[column.index], wanted = expected[column.key];
        if (typeof actual === "number" && typeof wanted === "number") return Math.abs(actual - wanted) <= 1e-7;
        return actual === wanted;
      });
    };
    const remaining = expectedRows.slice();
    for (const values of result.rows) {
      const index = remaining.findIndex(function (expected) { return rowMatches(values, expected); });
      if (index < 0) return false;
      remaining.splice(index, 1);
    }
    return remaining.length === 0;
  }

  function gradeSqlAssignment(queries, createDatabase) {
    if (typeof createDatabase !== 'function') return {executed:false,percent:0,tests:[],message:'El motor SQLite del navegador aún no está disponible.'};
    let database;
    const tests = [];
    try {
      database = createDatabase();
      LIBRARY_TEST_DATA.split(';').map(function (statement) { return statement.trim(); }).filter(Boolean).forEach(function (statement) {
        database.run(statement);
      });
      const runTest = function (label, key, check, passedMessage, failedMessage) {
        try {
          const result = runReadOnlySql(database, queries && queries[key]);
          const passed = check(result);
          tests.push({label:label,passed:passed,message:passed ? passedMessage : failedMessage});
        } catch (error) {
          tests.push({label:label,passed:false,message:String(error && error.message || error).slice(0,300)});
        }
      };
      runTest('Préstamos activos','active',function (active) { return projectedRowsMatch(active,[
        {id:2,prestamo_id:2,loan_id:2,libro_id:2,usuario_id:1,nombre:'Ana',usuario:'Ana',titulo:'SQL',libro:'SQL',fecha_devolucion:null},
        {id:3,prestamo_id:3,loan_id:3,libro_id:3,usuario_id:2,nombre:'Luis',usuario:'Luis',titulo:'Kotlin',libro:'Kotlin',fecha_devolucion:null}
      ]);},'Devuelve las dos filas activas. Se aceptan proyecciones con id, libro, usuario o fecha de devolución.','Revisa el filtro de devoluciones: deben aparecer los préstamos de SQL y Kotlin, sin incluir los ya devueltos.');

      runTest('Número de préstamos por usuario, también quien tiene cero','counts',function (counts) {
        const userKeyIndex = counts.columns.findIndex(function (name) { return ['id','usuario_id','user_id','id_usuario','nombre','usuario','nombre_usuario','user_name','borrower_name'].includes(name); });
        const countIndex = counts.columns.findIndex(function (name, index) { return index !== userKeyIndex && /count|cantidad|total|prestamo|loan|cuenta/.test(name); });
        const resolvedCountIndex = countIndex >= 0 ? countIndex : counts.columns.findIndex(function (name, index) {
          return index !== userKeyIndex && counts.rows.every(function (row) { return Number.isFinite(Number(row[index])); });
        });
      const expectedCounts = new Map([['1',2],['2',2],['3',0],['ana',2],['luis',2],['marta',0]]);
      const seen = new Set();
      let countsPassed = userKeyIndex >= 0 && resolvedCountIndex >= 0 && counts.rows.length === 3;
      for (const row of counts.rows) {
        const rawKey = row[userKeyIndex];
        const key = typeof rawKey === 'number' ? String(rawKey) : normalizedSqlValue(rawKey);
        if (!expectedCounts.has(key) || seen.has(key) || Number(row[resolvedCountIndex]) !== expectedCounts.get(key)) countsPassed = false;
        seen.add(key);
      }
        return countsPassed;
      },'Incluye a los tres usuarios y las cantidades correctas; valen JOIN, subconsulta y formas equivalentes.','Comprueba el agrupamiento y usa un LEFT JOIN para conservar a Marta, que todavía no tiene préstamos.');

      runTest('Libro que nunca se ha prestado','unborrowed',function (unborrowed) {
        const itemKeyIndex = unborrowed.columns.findIndex(function (name) { return ['id','libro_id','book_id','titulo','title','libro','book_title','nombre'].includes(name); });
        if (itemKeyIndex < 0 || unborrowed.rows.length !== 1) return false;
        const value = unborrowed.rows[0][itemKeyIndex];
        return value === 4 || normalizedSqlValue(value) === 'xml';
      },'Devuelve el libro XML, el único sin préstamos.','La consulta debe encontrar exactamente el libro XML. NOT EXISTS y LEFT JOIN con IS NULL son válidos.');
    } catch (error) {
      tests.push({label:'Preparar base de prueba',passed:false,message:String(error && error.message || error).slice(0,300)});
    } finally {
      try { if (database) database.close(); } catch (_) {}
    }
    const passed = tests.filter(function (item) { return item.passed; }).length;
    return {
      executed:true,percent:Math.round(passed / 3 * 100),passed:passed,total:3,tests:tests,
      message:passed === 3 ? 'Las tres consultas superan los casos locales. Se aceptan JOIN, NOT EXISTS y otras consultas que produzcan los mismos resultados.' : 'Las consultas se ejecutaron en una base SQLite temporal del navegador. Ajusta las pruebas fallidas; no se envía ni se guarda el código.'
    };
  }

  function sqlResultHasRequiredColumns(result, groups) {
    return (groups || []).every(function (aliases) {
      return result.columns.some(function (name) { return aliases.includes(name); });
    });
  }

  function descendingColumnMatches(result, aliases) {
    const index = result.columns.findIndex(function (name) { return aliases.includes(name); });
    if (index < 0) return false;
    for (let row = 1; row < result.rows.length; row += 1) {
      if (Number(result.rows[row - 1][index]) + 1e-7 < Number(result.rows[row][index])) return false;
    }
    return true;
  }

  function compactSqlResult(result) {
    return {
      columns:result.columns.slice(0,8),
      rows:result.rows.slice(0,5).map(function (row) {
        return row.slice(0,8).map(function (value) { return typeof value === 'string' ? value.slice(0,100) : value; });
      })
    };
  }

  function gradeSqlPractice(exercise, source, practice, createDatabase) {
    if (typeof createDatabase !== 'function') {
      return resultOnly(exercise, source, 'runtime-unavailable', 'SQLite no está disponible; se muestran solo los criterios estructurales y no se envía el código.');
    }
    const cases = [];
    let attempted = false;
    try {
      practice.cases.forEach(function (scenario) {
        let database;
        try {
          database = createDatabase();
          scenario.setup.forEach(function (statement) { database.run(statement); });
          const result = runReadOnlySql(database, source, function () { attempted = true; }, practice.tables);
          const passed = sqlResultHasRequiredColumns(result, practice.requiredColumnGroups)
            && projectedRowsMatch(result, scenario.expected)
            && (!practice.orderedBy || descendingColumnMatches(result, practice.orderedBy));
          cases.push({expected:scenario.expected,actual:compactSqlResult(result),passed:passed,error:null});
        } catch (error) {
          if (error && error.policyRejected && !attempted) throw error;
          cases.push({expected:scenario.expected,actual:null,passed:false,error:String(error && error.message || error).slice(0,300)});
        } finally {
          try { if (database) database.close(); } catch (_) {}
        }
      });
    } catch (error) {
      if (!attempted) {
        return resultOnly(exercise, source, 'local-policy', 'La consulta no llegó a SQLite: ' + String(error && error.message || error).slice(0,250));
      }
    }
    if (!attempted) {
      return resultOnly(exercise, source, 'runtime-unavailable', 'No se pudo preparar una base SQLite temporal; se muestran solo los criterios estructurales.');
    }
    const passed = cases.filter(function (item) { return item.passed; }).length;
    const behaviorPercent = cases.length ? Math.round(passed / cases.length * 100) : 0;
    const structural = structuralReport(exercise, source);
    return {
      mode:'behavioral',executed:true,reason:null,
      message:passed === cases.length && cases.length
        ? 'La consulta supera los casos de SQLite locales; se aceptan resultados equivalentes con JOIN, CTE o subconsultas.'
        : 'La consulta se probó en bases SQLite temporales del navegador. Revisa las filas que fallaron; no se envió ni se guardó el código.',
      percent:behaviorPercent,behaviorPercent:behaviorPercent,structuralPercent:structural.percent,
      passed:passed,total:cases.length,cases:cases,checks:structural.checks
    };
  }

  function requiresSqlDatabase(exercise) {
    const practice = PRACTICES[getTitle(exercise)];
    return !!practice && practice.language === 'sql' && getLanguage(exercise) === 'sql';
  }

  async function grade(exercise, answer, options) {
    const source = sourceText(answer);
    const practice = PRACTICES[getTitle(exercise)];
    const language = getLanguage(exercise);
    const settings = options || {};
    if (!practice || practice.language !== language) {
      const reason = language === "plsql" ? "runtime-unavailable" : "runtime-not-integrated";
      const message = language === "plsql"
        ? "PL/SQL requiere Oracle; solo se muestran comprobaciones estructurales locales."
        : "Este lenguaje aún no tiene ejecución conductual local en este ejercicio; se muestran criterios estructurales y no se envía código a ningún servicio.";
      return resultOnly(exercise, source, reason, message);
    }
    if (source.length > MAX_SOURCE_LENGTH) return resultOnly(exercise, source, "local-policy", "La respuesta supera el límite local de longitud.");
    if (practice.language === "sql") return gradeSqlPractice(exercise, source, practice, settings.createDatabase);
    if (practice.language !== "js") {
      return resultOnly(exercise, source, "runtime-unavailable", "Python necesita un intérprete aislado para comprobar resultados. Esta revisión no descarga el runtime ni envía tu código a un servicio.");
    }
    const timeoutMs = Math.max(1000, Math.min(Number(settings.timeoutMs) || MAX_TIMEOUT_MS, MAX_TIMEOUT_MS));
    try {
      if (!root.CCSandbox || typeof root.CCSandbox.run !== "function") throw new Error("No se ha iniciado el worker local protegido.");
      const actual = await root.CCSandbox.run(makeJsWorkerSource(), {
        source:source,inputName:practice.input,outputName:practice.output,
        cases:practice.cases
      }, {timeoutMs:timeoutMs,maxOutputChars:MAX_OUTPUT_CHARS});
      const results = Array.isArray(actual) ? actual : [];
      const cases = practice.cases.map(function (item, index) {
        const entry = results[index] || {};
        const value = entry && Object.prototype.hasOwnProperty.call(entry,"value") ? entry.value : null;
        return {input:item.input,expected:item.expected,actual:value,error:entry.error || null,passed:!entry.error && equalValues(value,item.expected)};
      });
      const passed = cases.filter(function (item) { return item.passed; }).length;
      const behaviorPercent = Math.round(passed / cases.length * 100);
      const structural = structuralReport(exercise, source);
      return {
        mode:"behavioral",executed:true,reason:null,
        message:passed === cases.length ? "La solución supera todos los casos locales." : "La solución se ejecutó en un worker local; revisa los casos que fallaron.",
        percent:behaviorPercent,behaviorPercent:behaviorPercent,structuralPercent:structural.percent,
        passed:passed,total:cases.length,cases:cases,checks:structural.checks
      };
    } catch (error) {
      return resultOnly(exercise, source, "runtime-unavailable", "No se pudo ejecutar localmente: " + String(error && error.message || error).slice(0,300));
    }
  }

  function contracts() {
    return {
      version:"1.2.0",method:"CCPracticeGrader.grade(E[index], respuesta, opciones)",
      behavioralPractices:["JavaScript · filtrar aprobados","JavaScript · contar frecuencias","SQL · listar aprobados","SQL · media por curso","SQL · detectar registros sin relación"],
      behavioralAssignments:["Biblioteca relacional · consultas SQLite de préstamos"],
      behavioralLimits:"La corrección compara resultados solo en los casos locales incluidos; no demuestra que una solución sea correcta para todas las entradas. El worker de JavaScript reconoce inicializadores simples de array y asignaciones directas a una variable let/var previamente declarada para inyectar cada caso; si no puede compilar o reconocer la forma de entrada, la evaluación pasa a revisión estructural. SQL admite SELECT y CTE no recursivos en bases SQLite temporales con datos distintos por caso. La consulta se limita a 4 KB, 3 SELECT, 2 FROM/JOIN/UNION, anidamiento 12, funciones permitidas y tablas conocidas; no admite VALUES, recursión ni escrituras, y devuelve como máximo 50 filas. Así, el trabajo síncrono solo opera sobre los fixtures pequeños del corrector. Las consultas rechazadas por la política no llegan a SQLite. Los informes estructurales comprueban patrones del texto y nunca equivalen a una aprobación conductual.",
      otherLanguages:"Comprobación estructural hasta integrar un runtime seguro; behaviorPercent es null y executed es false.",
      privacy:{sendsAnswerToService:false,telemetry:false,persistentStorage:false,networkAccessInBehavioralRunner:false}
    };
  }

  root.CCPracticeGrader = Object.freeze({grade:grade,gradePractice:grade,gradeSqlAssignment:gradeSqlAssignment,requiresSqlDatabase:requiresSqlDatabase,contracts:contracts});
  if (typeof module === "object" && module.exports) module.exports = root.CCPracticeGrader;
})(typeof window !== "undefined" ? window : typeof self !== "undefined" ? self : globalThis);
