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

El servidor SQLite usa módulos integrados en Node.js. El registro público crea cuentas de estudiante. Esta versión no verifica el correo ni permite restablecer la contraseña. Consulta la [información de privacidad](public/privacidad.html), las [condiciones](public/condiciones.html) y la [guía para empezar](EMPEZAR_AQUI.md). Para conceder permisos de administración, consulta [ADMINISTRACION.md](ADMINISTRACION.md).

## Demo estática

La carpeta `docs/` contiene una demo estática de la biblioteca y sus PDF. No ejecuta el servidor Node.js ni ofrece cuentas, sesiones o progreso sincronizado.

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
- Java envía el código y la entrada estándar a Judge0 por HTTPS únicamente después del consentimiento explícito de la sesión. No envíes datos personales, secretos ni código confidencial.
- Kotlin y PL/SQL ofrecen análisis estático; Node.js, MongoDB y Firestore se presentan como simuladores didácticos.
- `server-postgres.js` es experimental: no tiene paridad completa con SQLite ni migra sus datos. Consulta la [guía técnica de PostgreSQL](docs/guias/POSTGRESQL.md).

## Licencia

El código y los materiales originales se distribuyen bajo MIT, salvo que un archivo indique otra licencia. Los nombres y documentos de terceros pertenecen a sus respectivos titulares. Consulta [LICENSE](LICENSE).

Consulta el [mapa del repositorio](docs/ESTRUCTURA_PROYECTO.md) y el [índice de documentación](docs/README.md).