(function (root) {
  "use strict";

  const POLICY = "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:; child-src blob:; connect-src 'none'; img-src 'none'; media-src 'none'; font-src 'none'; style-src 'unsafe-inline'; form-action 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'";
  const MAX_WORKER_SOURCE = 120000;
  const MAX_OUTPUT_CHARS = 20000;

  function scriptLiteral(value) {
    return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  }

  function run(workerSource, payload, options) {
    const settings = options || {};
    if (typeof workerSource !== "string" || workerSource.length > MAX_WORKER_SOURCE) {
      return Promise.reject(new Error("El evaluador supera el límite de tamaño local."));
    }
    const timeoutMs = Math.min(30000, Math.max(500, Number(settings.timeoutMs) || 5000));
    const maxOutputChars = Math.min(MAX_OUTPUT_CHARS, Math.max(1000, Number(settings.maxOutputChars) || MAX_OUTPUT_CHARS));
    const requestId = "cc-sandbox-" + (++run.sequence);

    return new Promise(function (resolve, reject) {
      const frame = document.createElement("iframe");
      frame.setAttribute("sandbox", "allow-scripts");
      frame.setAttribute("aria-hidden", "true");
      frame.tabIndex = -1;
      frame.style.cssText = "position:fixed;width:1px;height:1px;left:-10000px;top:0;border:0";
      let settled = false;
      const cleanup = function () {
        root.removeEventListener("message", onMessage);
        root.clearTimeout(timer);
        frame.remove();
      };
      const finish = function (error, value) {
        if (settled) return;
        settled = true;
        cleanup();
        if (error) reject(error);
        else resolve(value);
      };
      const onMessage = function (event) {
        const message = event.data;
        if (event.source !== frame.contentWindow || !message || message.type !== "cc-sandbox-result" || message.id !== requestId) return;
        const result = message.result;
        if (!result || typeof result !== "object" || Array.isArray(result)) {
          finish(new Error("El evaluador devolvió un resultado no válido."));
        } else if (result.ok === false) {
          finish(new Error(String(result.error || result.output || "Falló la evaluación local.").slice(0, 500)));
        } else if (Object.prototype.hasOwnProperty.call(result, "value")) {
          finish(null, result.value);
        } else if (typeof result.output === "string") {
          finish(null, result);
        } else {
          finish(null, undefined);
        }
      };
      const timer = root.setTimeout(function () {
        finish(new Error("La ejecución local superó el tiempo límite y se detuvo."));
      }, timeoutMs);

      root.addEventListener("message", onMessage);
      const bootstrap = `
        (function () {
          "use strict";
          const workerSource = ${scriptLiteral(workerSource)};
          const payload = ${scriptLiteral(payload)};
          const requestId = ${scriptLiteral(requestId)};
          const outputLimit = ${maxOutputChars};
          let workerUrl = "";
          let worker;
          let channel;
          let sent = false;
          function finish(result) {
            if (sent) return;
            sent = true;
            if (worker) worker.terminate();
            if (workerUrl) URL.revokeObjectURL(workerUrl);
            if (channel) {
              channel.port1.close();
              channel.port2.close();
            }
            let safeResult = result;
            try {
              if (JSON.stringify(safeResult).length > outputLimit) {
                safeResult = { ok: false, error: "La salida supera el límite de 20 KB." };
              }
            } catch (_) {
              safeResult = { ok: false, error: "El resultado no se puede transferir de forma segura." };
            }
            parent.postMessage({ type: "cc-sandbox-result", id: requestId, result: safeResult }, "*");
          }
          try {
            workerUrl = URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" }));
            worker = new Worker(workerUrl);
            channel = new MessageChannel();
            channel.port1.onmessage = function (event) { finish(event.data); };
            channel.port1.start();
            worker.onerror = function () { finish({ ok: false, error: "Falló el worker local." }); };
            worker.postMessage(payload, [channel.port2]);
          } catch (_) {
            finish({ ok: false, error: "Este navegador no ha podido iniciar el entorno aislado." });
          }
        })();
      `;
      frame.srcdoc = "<!doctype html><meta charset=\"utf-8\"><meta http-equiv=\"Content-Security-Policy\" content=\"" + POLICY + "\"><script>" + bootstrap + "</script>";
      document.body.appendChild(frame);
    });
  }

  run.sequence = 0;
  root.CCSandbox = Object.freeze({ run: run });
  if (typeof module === "object" && module.exports) module.exports = root.CCSandbox;
})(typeof window !== "undefined" ? window : globalThis);
