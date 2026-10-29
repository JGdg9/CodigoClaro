# CódigoClaro

**Plataforma educativa independiente para aprender programación practicando.**

CódigoClaro ofrece materiales y herramientas didácticas para alumnado de DAM y DAW. La versión 1.4.2 está en desarrollo; sus simuladores y correcciones no sustituyen a un entorno profesional ni a fuentes oficiales.

## Contenido

- 75 temarios individuales en cinco rutas: Java, JavaScript, Python, Kotlin y React.
- Seis rutas complementarias de 15 temas y nueve PDF anteriores.
- Biblioteca, búsqueda, seguimiento del progreso, tests, planificación y feedback.
- Aula con ejercicios y un IDE educativo que diferencia motores ejecutables de simulaciones y análisis estático.

## Empezar en local

1. Instala Node.js 22.5 o posterior.
2. En esta carpeta, instala las dependencias con `npm ci`.
3. En Windows, ejecuta `INICIAR_CODIGOCLARO.bat`. En otros sistemas, crea `.env` a partir de `.env.example`, define `SESSION_SECRET` con un valor aleatorio y ejecuta `npm start`.
4. Abre `http://localhost:3000`.

El servidor SQLite usa módulos integrados en Node.js. El servicio de Render está en piloto abierto y permite crear cuentas de estudiante. Usa únicamente datos ficticios: no verifica el correo ni permite restablecer la contraseña. Consulta la [información de privacidad](public/privacidad.html), las [condiciones](public/condiciones.html) y la [guía para empezar](EMPEZAR_AQUI.md). Para conceder permisos de administración, consulta [ADMINISTRACION.md](ADMINISTRACION.md).

## Demo estática

La carpeta `docs/` contiene una demo estática de la biblioteca y sus PDF. No ejecuta el servidor Node.js ni ofrece cuentas, sesiones o progreso sincronizado.

## Aplicación completa en Render

Selecciona `CodigoClaro_v3/render.yaml` como **Blueprint Path**; usa `rootDir: CodigoClaro_v3`, SQLite persistente en `/var/data` y un secreto de sesión generado. Revisa el plan y el disco antes de sincronizar recursos.

El Blueprint configura `PUBLIC_REGISTRATION_ENABLED=true` y `REGISTRATION_OPEN=true`. El servicio de Render está en piloto abierto; usa datos ficticios porque no verifica el correo ni ofrece recuperación de contraseña. `/api/health` y `npm run test:render` permiten hacer comprobaciones de solo lectura. Las navegaciones HTML reciben páginas 404/500 genéricas; los errores de API siguen siendo JSON.

## Comprobaciones de desarrollo

- `node --check server.js` comprueba la sintaxis del servidor.
- `npm test` ejecuta las pruebas automatizadas.
- `python verificar_entrega.py` revisa recursos, catálogo, enlaces y sintaxis.

Las pruebas automatizadas no sustituyen una revisión visual de todos los motores, navegadores o servicios externos.

## Generar los temarios

Requiere Python 3.10 o posterior y ReportLab. Instala la dependencia con `python -m pip install -r requirements-docs.txt` y ejecuta `python scripts/generar_temarios.py`. Para la ruta de TypeScript, añade `--typescript-route`.

Los temarios son síntesis didácticas con referencias a documentación primaria. Comprueba los ejemplos en el runtime de tu proyecto y comunica las erratas con la [guía editorial](GUIA_TEMARIOS.md).

## Estructura

- `public/`: aplicación, materiales y ayuda para usuarios.
- `docs/`: demo estática, documentación y catálogo.
- `lib/`: lógica compartida y banco de preguntas.
- `tests/`: pruebas automatizadas.
- `scripts/`: generación y mantenimiento de recursos.
- `server.js`: servidor SQLite y API local.

## Límites conocidos

- No hay recuperación automática de contraseña ni verificación del correo.
- Algunas bibliotecas del IDE se cargan desde CDN y requieren conexión a Internet.
- Java, Kotlin, Node.js, Python y TypeScript envían código y, cuando proceda, `stdin` a un endpoint Judge0 compatible por HTTPS solo después del consentimiento explícito de la sesión. Comprueba qué runtimes ofrece el endpoint. No envíes datos personales, secretos ni código confidencial.
- JavaScript se ejecuta en un worker local. React compila JSX con versiones fijadas de Babel y React dentro de un iframe con acceso de red bloqueado; el código permanece en el navegador.
- PostgreSQL se ejecuta localmente con PGlite/WASM en un worker y persiste en IndexedDB. La base no se sincroniza con la cuenta. SQL.js ofrece SQLite separado para el modo de gestión de bases.
- Oracle SQL y PL/SQL se practican en Oracle FreeSQL mediante un enlace manual. La compatibilidad MySQL se ofrece con TiDB Playground, que no equivale a MySQL y no admite todos sus procedimientos, funciones ni triggers.
- MongoDB, Firestore y backend son simuladores didácticos; HTML/CSS tiene vista previa aislada. XML y XPath usan validación local.
- `server-postgres.js` es experimental: no tiene paridad completa con SQLite ni migra sus datos. Consulta la [guía técnica de PostgreSQL](docs/guias/POSTGRESQL.md).

## Licencia

El código y los materiales originales se distribuyen bajo MIT, salvo que un archivo indique otra licencia. Los nombres y documentos de terceros pertenecen a sus respectivos titulares. Consulta [LICENSE](LICENSE).

Consulta el [mapa del repositorio](docs/ESTRUCTURA_PROYECTO.md) y el [índice de documentación](docs/README.md).
