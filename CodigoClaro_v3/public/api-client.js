(function (root) {
  "use strict";

  const messages = {
    network: "No se pudo conectar con CódigoClaro. Comprueba tu conexión e inténtalo de nuevo.",
    protocol: "El servidor devolvió una respuesta inesperada. Recarga la página e inténtalo de nuevo.",
    server: "CódigoClaro no pudo completar la solicitud. Inténtalo de nuevo más tarde.",
    request: "No se pudo completar la solicitud. Revisa los datos e inténtalo de nuevo."
  };
  const jsonType = /^(?:application\/json|application\/[a-z0-9.+-]+\+json)(?:\s*;|$)/i;
  const internalDetails = /(?:[a-z][a-z0-9+.-]*:\/\/|\/(?:api|auth|internal|server)(?:\/|\b)|\b(?:localhost|127\.0\.0\.1|::1)(?::\d+)?\b|\b(?:stack trace|traceback|internal server|\bintern(?:al|o|os|as)\b|ECONNREFUSED|ENOENT|SQLITE_[A-Z_]*|TypeError|ReferenceError)\b|\bat\s+\S+\s*\(|(?:^|[\s("'=])(?:[a-z0-9-]+\.)+[a-z]{2,63}(?::\d+)?\b|[A-Za-z]:[\\/][^\s]+)/i;

  async function parse(response) {
    if (response.status === 204) return null;
    const contentType = response.headers && response.headers.get("content-type") || "";
    if (!jsonType.test(contentType)) {
      if (response.ok) throw new Error(messages.protocol);
      return null;
    }
    let data;
    try {
      data = await response.json();
    } catch (_) {
      if (response.ok) throw new Error(messages.protocol);
      return null;
    }
    if (response.ok && (!data || typeof data !== "object" || Array.isArray(data))) {
      throw new Error(messages.protocol);
    }
    return data;
  }

  async function request(url, opts, fetcher) {
    const options = opts || {};
    const send = typeof fetcher === "function" ? fetcher : root.fetch;
    if (typeof send !== "function") throw new Error(messages.network);
    let response;
    try {
      response = await send(url, {
        credentials: "same-origin",
        ...options,
        headers: {
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(options.headers || {})
        }
      });
    } catch (_) {
      throw new Error(messages.network);
    }

    const data = await parse(response);
    if (!response.ok) {
      const fallback = response.status >= 500 ? messages.server : messages.request;
      const candidate = data && typeof data.error === "string" ? data.error.trim() : "";
      if (response.status >= 500 || !candidate || candidate.length > 240 || internalDetails.test(candidate)) {
        throw new Error(fallback);
      }
      throw new Error(candidate);
    }
    return data;
  }

  const api = Object.freeze({ request: request, parse: parse });
  root.CodigoClaroApi = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
