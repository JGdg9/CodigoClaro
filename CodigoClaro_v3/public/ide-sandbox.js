(function (root) {
  "use strict";

  const MAX_CODE_CHARS = 50000;
  const MAX_OUTPUT_CHARS = 12000;

  const WORKER_SOURCE = `
    "use strict";
    try { Object.defineProperty(self, "close", {value:function(){},writable:false,configurable:false}); } catch (_) {}
    const MAX_OUTPUT = 12000;
    let output = "";

    function format(value) {
      if (typeof value === "string") return value;
      try { return JSON.stringify(value, null, 2); }
      catch (_) { return String(value); }
    }

    function append(kind, values) {
      if (output.length >= MAX_OUTPUT) return;
      const line = kind + ": " + values.map(format).join(" ");
      output += (output ? "\\n" : "") + line.slice(0, MAX_OUTPUT - output.length);
    }

    const consoleApi = {
      log: (...values) => append("SALIDA", values),
      info: (...values) => append("SALIDA", values),
      warn: (...values) => append("AVISO", values),
      error: (...values) => append("ERROR", values),
      table: value => append("SALIDA", [value])
    };

    function createMongoDemo() {
      const data = {
        alumnos: [{_id:1,nombre:"Ana",nota:8.5},{_id:2,nombre:"Luis",nota:4.2},{_id:3,nombre:"Marta",nota:9.1},{_id:4,nombre:"Pablo",nota:6.7}],
        cursos: [{_id:1,titulo:"Java",nivel:"inicial"},{_id:2,titulo:"SQL",nivel:"medio"}]
      };
      function matches(document, query) {
        return Object.entries(query || {}).every(([key, value]) => {
          const actual = document[key];
          if (value && typeof value === "object" && !Array.isArray(value)) {
            return Object.entries(value).every(([operator, expected]) =>
              operator === "$gte" ? actual >= expected : operator === "$gt" ? actual > expected :
              operator === "$lte" ? actual <= expected : operator === "$lt" ? actual < expected :
              operator === "$ne" ? actual !== expected : operator === "$in" ? expected.includes(actual) :
              operator === "$eq" ? actual === expected : false);
          }
          return actual === value;
        });
      }
      return new Proxy({}, { get: (_, collection) => ({
        find(query = {}, projection = {}) {
          let rows = (data[collection] || []).filter(row => matches(row, query)).map(row => ({...row}));
          if (Object.keys(projection).length) {
            const included = Object.entries(projection).filter(([, value]) => value === 1).map(([key]) => key);
            const excluded = Object.entries(projection).filter(([, value]) => value === 0).map(([key]) => key);
            rows = rows.map(row => included.length
              ? Object.fromEntries(included.filter(key => key in row).map(key => [key, row[key]]))
              : Object.fromEntries(Object.entries(row).filter(([key]) => !excluded.includes(key))));
          }
          const cursor = {
            sort(spec) {
              rows.sort((a, b) => {
                for (const [key, direction] of Object.entries(spec)) {
                  if (a[key] < b[key]) return -1 * direction;
                  if (a[key] > b[key]) return direction;
                }
                return 0;
              });
              return cursor;
            },
            limit(count) { rows = rows.slice(0, Math.max(0, Number(count) || 0)); return cursor; },
            toArray() { return rows; },
            forEach(callback) { rows.forEach(callback); }
          };
          return cursor;
        },
        async insertOne(document) {
          const rows = data[collection] || (data[collection] = []);
          const id = Math.max(0, ...rows.map(row => Number(row._id) || 0)) + 1;
          rows.push({_id:id, ...document});
          return {insertedId:id};
        },
        findOne(query) { return (data[collection] || []).find(row => matches(row, query)) || null; }
      })});
    }

    function createFirestoreDemo() {
      const data = {cursos:[{id:"c1",titulo:"Java",nivel:"inicial"},{id:"c2",titulo:"SQL",nivel:"medio"}]};
      return {
        add: async (collection, document) => {
          const rows = data[collection] || (data[collection] = []);
          const id = "cc" + (rows.length + 1);
          rows.push({id, ...document});
          return id;
        },
        get: async collection => JSON.parse(JSON.stringify(data[collection] || [])),
        where: async (collection, key, operator, value) => (data[collection] || []).filter(row =>
          operator === "==" ? row[key] === value : operator === ">" ? row[key] > value :
          operator === ">=" ? row[key] >= value : operator === "<" ? row[key] < value :
          operator === "<=" ? row[key] <= value : false),
        update: async (collection, id, patch) => {
          const row = (data[collection] || []).find(item => item.id === id);
          if (row) Object.assign(row, patch);
          return Boolean(row);
        },
        remove: async (collection, id) => { data[collection] = (data[collection] || []).filter(row => row.id !== id); }
      };
    }

    const denied = () => Promise.reject(new Error("Las conexiones de red no están disponibles en el entorno local."));
    for (const name of ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "importScripts", "Worker", "SharedWorker", "BroadcastChannel", "indexedDB", "caches"]) {
      try { Object.defineProperty(self, name, {value: denied, writable: false, configurable: false}); } catch (_) {}
    }

    self.onmessage = async event => {
      const replyPort = event.ports && event.ports[0];
      if (!replyPort) return;
      const send = replyPort.postMessage.bind(replyPort);
      const data = event.data || {};
      const code = String(data.code || "");
      const kind = String(data.kind || "javascript");
      try {
        const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
        let args = ["console"];
        let values = [consoleApi];
        if (kind === "mongo") {
          args.push("db"); values.push(createMongoDemo());
        } else if (kind === "firestore") {
          args.push("firestoreDemo"); values.push(createFirestoreDemo());
        } else if (kind === "backend") {
          args.push("app", "obtenerCursos");
          values.push({get: (route) => consoleApi.log("Ruta registrada para prueba:", route, "(sin servidor real)")}, () => [{id:1,titulo:"Java"},{id:2,titulo:"SQL"}]);
        }
        const result = await new AsyncFunction(...args, code)(...values);
        if (result !== undefined) append("SALIDA", [result]);
        send({ok:true, output:output.slice(0, MAX_OUTPUT)});
      } catch (error) {
        append("ERROR", [error && error.name ? error.name + ": " + error.message : String(error)]);
        send({ok:false, output:output.slice(0, MAX_OUTPUT)});
      }
    };
  `;

  async function run(kind, code) {
    if (typeof code !== "string" || code.length > MAX_CODE_CHARS) {
      throw new Error("El código supera el límite local de 50 KB.");
    }
    if (!root.CCSandbox || typeof root.CCSandbox.run !== "function") {
      throw new Error("No se ha podido iniciar el entorno aislado del IDE.");
    }
    const result = await root.CCSandbox.run(WORKER_SOURCE, {kind, code}, {timeoutMs:5000, maxOutputChars:MAX_OUTPUT_CHARS});
    return {ok:true, output:String(result && result.output || "").slice(0, MAX_OUTPUT_CHARS)};
  }

  root.CCIdeSandbox = Object.freeze({run:run});
  if (typeof module === "object" && module.exports) module.exports = root.CCIdeSandbox;
})(typeof window !== "undefined" ? window : globalThis);
