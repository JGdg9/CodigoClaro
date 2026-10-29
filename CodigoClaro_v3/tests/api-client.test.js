"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const api = require("../public/api-client.js");

function response(status, contentType, body, options = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: name => name.toLowerCase() === "content-type" ? contentType : null },
    json: async () => {
      if (options.invalidJson) throw new SyntaxError("internal parser detail");
      return body;
    }
  };
}

test("el cliente devuelve objetos JSON con el tipo estándar", async () => {
  const data = await api.request("/api/me", {}, async () => response(200, "application/json; charset=utf-8", { user: null }));
  assert.deepEqual(data, { user: null });
});

test("acepta tipos JSON de proveedor con sufijo +json", async () => {
  const data = await api.request("/api/problem", {}, async () => response(200, "application/problem+json", { ok: true }));
  assert.deepEqual(data, { ok: true });
});

test("rechaza una respuesta HTTP 200 que contiene HTML", async () => {
  await assert.rejects(
    api.request("/api/catalog", {}, async () => response(200, "text/html; charset=utf-8", "<html>fallback</html>")),
    /respuesta inesperada/
  );
});

test("rechaza JSON mal formado aunque HTTP responda 200", async () => {
  await assert.rejects(
    api.request("/api/progress", {}, async () => response(200, "application/json", null, { invalidJson: true })),
    /respuesta inesperada/
  );
});

test("rechaza arrays y escalares cuando la API promete un objeto", async () => {
  for (const body of [[], "correcto", 5, null]) {
    await assert.rejects(
      api.request("/api/config", {}, async () => response(200, "application/json", body)),
      /respuesta inesperada/
    );
  }
});

test("acepta 204 como respuesta vacía explícita", async () => {
  const data = await api.request("/api/no-content", {}, async () => response(204, "", null));
  assert.equal(data, null);
});

test("conserva mensajes seguros de validación 4xx", async () => {
  await assert.rejects(
    api.request("/api/login", {}, async () => response(401, "application/json", { error: "Credenciales incorrectas." })),
    error => error.message === "Credenciales incorrectas."
  );
});

test("oculta detalles internos en errores 4xx y 5xx", async () => {
  await assert.rejects(
    api.request("/api/login", {}, async () => response(400, "application/json", { error: "Fallo en http://localhost:3000/api/login: TypeError" })),
    error => {
      assert.equal(error.message, "No se pudo completar la solicitud. Revisa los datos e inténtalo de nuevo.");
      assert.doesNotMatch(error.message, /localhost|3000|TypeError/);
      return true;
    }
  );
  await assert.rejects(
    api.request("/api/login", {}, async () => response(500, "application/json", { error: "SQLITE_ERROR at C:\\app\\server.js" })),
    error => {
      assert.equal(error.message, "CódigoClaro no pudo completar la solicitud. Inténtalo de nuevo más tarde.");
      assert.doesNotMatch(error.message, /SQLITE|server\.js/);
      return true;
    }
  );
});

test("no revela la excepción devuelta por fetch", async () => {
  await assert.rejects(
    api.request("/api/me", {}, async () => { throw new Error("secret path C:\\server\\main.js"); }),
    error => error.message === "No se pudo conectar con CódigoClaro. Comprueba tu conexión e inténtalo de nuevo."
  );
});

test("conserva cookies del mismo origen y marca JSON cuando envía un cuerpo", async () => {
  let received;
  await api.request("/api/logout", { method: "POST", body: "{}" }, async (_url, options) => {
    received = options;
    return response(200, "application/json", { ok: true });
  });
  assert.equal(received.credentials, "same-origin");
  assert.equal(received.headers["Content-Type"], "application/json");
});
