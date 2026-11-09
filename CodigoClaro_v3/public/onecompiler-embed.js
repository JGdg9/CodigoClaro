(function () {
  "use strict";

  const PANEL_ID = "ccOneCompilerPanel";
  const EMBED_URL = "https://onecompiler.com/embed/python";

  function closeEditor(panel) {
    const frameHost = panel.querySelector("#ccOneCompilerFrameHost");
    const frameArea = panel.querySelector("#ccOneCompilerFrameArea");
    const consentArea = panel.querySelector("#ccOneCompilerConsentArea");
    const status = panel.querySelector("#ccOneCompilerStatus");
    frameHost.replaceChildren();
    frameArea.classList.add("hide");
    consentArea.classList.remove("hide");
    status.textContent = "Editor externo cerrado. Sus cambios no se copiaron a CódigoClaro; para volver a abrirlo, acepta de nuevo.";
    panel.querySelector("#ccOneCompilerConsentButton").focus();
  }

  function loadEditor(panel) {
    const frameHost = panel.querySelector("#ccOneCompilerFrameHost");
    const frameArea = panel.querySelector("#ccOneCompilerFrameArea");
    const consentArea = panel.querySelector("#ccOneCompilerConsentArea");
    const status = panel.querySelector("#ccOneCompilerStatus");
    if (frameHost.querySelector("iframe")) return;
    const frame = document.createElement("iframe");

    frame.className = "cc-onecompiler-frame";
    frame.title = "Editor multilenguaje de OneCompiler, iniciado en Python";
    frame.referrerPolicy = "no-referrer";
    frame.loading = "eager";
    consentArea.classList.add("hide");
    frameArea.classList.remove("hide");
    status.textContent = "Cargando OneCompiler en Python sin copiar contenido de CódigoClaro.";
    frame.addEventListener("load", () => {
      status.textContent = "Editor de OneCompiler cargado en Python. Usa su selector para cambiar de lenguaje; al ejecutar, el código escrito allí se envía al proveedor.";
    }, {once: true});
    frame.src = EMBED_URL;
    frameHost.replaceChildren(frame);
    panel.querySelector("#ccOneCompilerCloseButton").focus();
  }

  window.ideInitOneCompilerEmbed = function ideInitOneCompilerEmbed() {
    const mountPoint = document.getElementById("ccOneCompilerMount");
    if (!mountPoint || document.getElementById(PANEL_ID)) return;

    const panel = document.createElement("section");
    panel.className = "panel cc-onecompiler-panel";
    panel.id = PANEL_ID;
    panel.innerHTML = [
      "<h3>Editor multilenguaje externo (opcional)</h3>",
      "<p class=\"muted tiny cc-onecompiler-consent\">",
      "El editor y la ejecución los presta OneCompiler. Al aceptar se carga en Python sin copiar contenido de CódigoClaro; ",
      "puedes elegir otros lenguajes en el selector integrado. CódigoClaro ",
      "no lee ni envía el código o el reto que tengas abiertos aquí. El código que escribas en OneCompiler ",
      "se enviará a ese proveedor cuando lo ejecutes. No introduzcas datos personales, credenciales ni ",
      "código privado. Los cambios del editor externo no vuelven automáticamente a CódigoClaro.",
      "</p>",
      "<p class=\"tiny\"><a href=\"https://onecompiler.com/privacy-policy\" target=\"_blank\" rel=\"noopener noreferrer\">Política de privacidad de OneCompiler</a></p>",
      "<div id=\"ccOneCompilerConsentArea\">",
      "<button id=\"ccOneCompilerConsentButton\" class=\"btn primary\" type=\"button\">Acepto cargar OneCompiler en Python</button>",
      "</div>",
      "<p id=\"ccOneCompilerStatus\" class=\"tiny muted\" role=\"status\" aria-live=\"polite\" aria-atomic=\"true\">El editor externo no se carga hasta que aceptes. CódigoClaro no transfiere el código local.</p>",
      "<div id=\"ccOneCompilerFrameArea\" class=\"hide\">",
      "<div id=\"ccOneCompilerFrameHost\" class=\"cc-onecompiler-frame-host\"></div>",
      "<button id=\"ccOneCompilerCloseButton\" class=\"btn\" type=\"button\">Cerrar editor externo</button>",
      "</div>"
    ].join("");

    mountPoint.append(panel);
    panel.querySelector("#ccOneCompilerConsentButton").addEventListener("click", () => loadEditor(panel));
    panel.querySelector("#ccOneCompilerCloseButton").addEventListener("click", () => closeEditor(panel));
  };
})();
