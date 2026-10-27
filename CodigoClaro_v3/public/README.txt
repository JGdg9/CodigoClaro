CODIGOCLARO - AULA EDUCATIVA
============================

La página de inicio del piloto es /index.html, servida por el servidor Node.js que está en la carpeta raíz del proyecto. No abras index.html mediante doble clic: el registro, los tests sincronizados y el progreso multiusuario necesitan que el servidor esté activo.

AULA COMPLETA
- /aula.html: temarios interactivos, ejercicios con corrección heurística, prácticas, tests locales, plan de estudio y entorno IDE.
- /temarios.html: catálogo ampliado de temas.
- /diagnostico.html: diagnóstico de navegador y almacenamiento.
- /privacidad y /condiciones: información del piloto.

MOTORES DEL IDE
- JavaScript: ejecución aislada en navegador.
- Python: Pyodide/WebAssembly cargado desde CDN; primera ejecución requiere Internet.
- React/JSX: React y Babel desde CDN; no instala paquetes npm arbitrarios.
- SQL: SQLite en WebAssembly; no es Oracle, MySQL ni PostgreSQL.
- Java/Kotlin: editor y análisis estático, sin compilación remota en esta versión. Node.js: simulador didáctico de backend, no un runtime de Node real.
- MongoDB y Firestore: simuladores didácticos, no conexiones reales a servicios cloud.
- PL/SQL no se ejecuta sin Oracle Database.

No introduzcas contraseñas, tokens, claves API ni código confidencial en el editor. Para probar el piloto, consulta el README.md de la carpeta raíz y PRUEBA_USUARIOS.md.
