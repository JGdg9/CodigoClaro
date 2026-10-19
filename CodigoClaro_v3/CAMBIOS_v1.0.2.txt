CódigoClaro v1.0.2 — modo local y tema claro

- La página Temarios y práctica (incluido el IDE) usa un tema claro de fondo blanco.
- El editor utiliza el textarea nativo local; no descarga CodeMirror ni sus temas desde CDN.
- El uso normal de contenido, tests y progreso sigue trabajando con el servidor de localhost.
- JavaScript y los simuladores didácticos MongoDB/Firestore/Backend siguen funcionando en un iframe local aislado.
- Python, Java, Kotlin, Node.js, React/JSX y SQL mantienen editor, plantillas y análisis estático, pero su ejecución real está desactivada en esta versión para evitar que envíen código a servicios externos o descarguen runtimes al ejecutarse.
- La ejecución real local de esos lenguajes se planifica para la fase de runtimes/backend; no se presenta como una funcionalidad ya completada.
- No incluye secretos ni archivo .env real.
