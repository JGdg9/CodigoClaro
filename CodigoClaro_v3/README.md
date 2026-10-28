# CódigoClaro

**Plataforma educativa independiente para aprender programación practicando.** CódigoClaro nace como una idea de apoyo al alumnado de DAM y DAW: reunir rutas de aprendizaje, temarios propios, ejercicios, tests y seguimiento del progreso en un mismo proyecto.

> Estado: proyecto en desarrollo. Algunas funciones requieren servidor local y los motores del IDE tienen limitaciones documentadas. No se presenta como una plataforma de producción ni como un compilador universal.

## Qué incluye

- **75 temarios individuales de tres páginas**, organizados en cinco rutas: Java, JavaScript, Python, Kotlin y React.
- **Seis rutas complementarias de 15 temas**: TypeScript, SQL, NoSQL, backend/APIs, POO y gestión de bases de datos; se conservan nueve PDF anteriores.
- Los temas individuales incluyen fundamentos, modelo mental, sintaxis, ejemplos, buenas prácticas, depuración, pruebas, ejercicios, rúbrica y referencias oficiales.
- Portal con búsqueda y filtros por tecnología, biblioteca de contenidos y progreso.
- Aula didáctica con ejercicios, formatos de test y un IDE educativo que distingue motores de ejecución de simulaciones/análisis estático.
- Tests corregidos en servidor, registro de intentos, progreso personal, planificación de estudio y feedback.
- Código organizado en módulos, pruebas automáticas e instrucciones para Windows.

## Capturas para el portfolio

Antes de publicar el repositorio, se recomienda añadir capturas propias en `docs/capturas/`:

1. Portada de CódigoClaro.
2. Biblioteca de temarios filtrada por tecnología.
3. Una página de un PDF ampliado.
4. Aula/IDE con un ejercicio.
5. Resultado de un test y progreso.

No incluyas correos reales, datos de alumnos, contraseñas, tokens ni bases de datos en las capturas.

## Tecnologías

- HTML, CSS y JavaScript para la interfaz.
- Node.js para el servidor HTTP y la API.
- SQLite para cuentas, sesiones y progreso local.
- Python y ReportLab para generar los temarios PDF.
- `node:test` para pruebas de integración y regresión.

## Ejecutar en Windows

1. Instala Node.js 22.5 o superior desde [nodejs.org](https://nodejs.org/).
2. Descarga el ZIP del repositorio o clónalo.
3. Copia `.env.example` a `.env` cuando el lanzador lo solicite.
4. Define `SESSION_SECRET` con una cadena aleatoria de al menos 32 caracteres. `ADMIN_EMAIL` solo autoriza una promoción manual; el registro público siempre crea cuentas de estudiante. Consulta [`ADMINISTRACION.md`](ADMINISTRACION.md).
5. Ejecuta `INICIAR_CODIGOCLARO.bat`.
6. Abre `http://localhost:3000`.

El servidor SQLite usa módulos integrados en Node.js. El backend PostgreSQL experimental requiere las dependencias de `package.json`. La base de datos SQLite se crea localmente. **No publiques el archivo `.env` ni la base SQLite.**

## Publicación online: aplicación completa y demo estática

CódigoClaro tiene dos destinos de publicación:

- **Aplicación completa (Render):** servidor Node.js y SQLite con almacenamiento persistente. El Blueprint está en la ruta del repositorio `CodigoClaro_v3/render.yaml` y define `rootDir: CodigoClaro_v3`.
- **Demo estática (GitHub Pages):** biblioteca y PDF en `CodigoClaro_v3/docs/`; no incluye servidor, cuentas ni sincronización de progreso.

### Desplegar la aplicación completa en Render

1. Conecta el repositorio desde Render y selecciona `CodigoClaro_v3/render.yaml` como **Blueprint Path**. Render busca `render.yaml` en la raíz si no se indica una ruta personalizada.
2. Revisa el diff del Blueprint antes de sincronizarlo. Declara el servicio web `codigoclaro`, el disco persistente `codigoclaro-data` y `rootDir: CodigoClaro_v3`; revisa los recursos y costes que muestra Render antes de crearlos o modificarlos.
3. El servicio inicia con `npm start`, guarda SQLite en `/var/data/codigoclaro.sqlite` y usa `/api/health` como health check. Conserva el disco montado en `/var/data`.
4. Render genera `SESSION_SECRET`; `ADMIN_EMAIL` se solicita en el panel si se necesita. No guardes valores de entorno ni secretos en Git.
5. El Blueprint fija `PUBLIC_REGISTRATION_ENABLED=false` para el servidor actual y declara también `REGISTRATION_OPEN=false` para la transición prevista en PR #13. El registro queda cerrado; `/api/health` informa el valor efectivo. No lo abras hasta completar la información de privacidad.
6. Tras un despliegue autorizado, comprueba que `/api/health` responda `ok: true`. `npm run test:render` consulta el servicio público con solicitudes GET y un reintento por ruta por defecto; no crea cuentas ni modifica datos.

### Publicar la demo estática en GitHub Pages

1. En GitHub, abre **Settings → Pages** y selecciona **GitHub Actions** como fuente.
2. El workflow `.github/workflows/pages.yml` ya verifica y publica `CodigoClaro_v3/docs/`; se activa con cambios en esa carpeta en `main` o `master`.

## Ejecutar y comprobar

```bash
node --check server.js
npm test
npm run test:coverage
python verificar_entrega.py
```

`npm test` ejecuta la suite de integración y regresión. `npm run test:coverage` repite la suite y muestra cobertura de líneas, ramas y funciones. `verificar_entrega.py` comprueba estructura, catálogo, PDFs, enlaces internos y ejecuta toda la suite. Para comprobar el servicio público de Render con peticiones de solo lectura, ejecuta `npm run test:render`; puedes indicar otra URL con `RENDER_BASE_URL`. También puedes abrir **Actions → Comprobación segura de Render → Run workflow** en GitHub para ejecutarlo después de un despliegue. Estas comprobaciones no equivalen a una auditoría de seguridad ni a una prueba visual de todos los navegadores y motores del IDE.

## Regenerar los temarios PDF

Requisitos: Python 3.10+ y ReportLab. Instala la dependencia opcional:

```bash
python -m pip install -r requirements-docs.txt
python scripts/generar_temarios.py
```

El generador lee `public/catalogo_temas.json` y vuelve a producir los 75 PDFs individuales. Para crear la ruta complementaria de TypeScript, ejecuta `python scripts/generar_temarios.py --typescript-route`. Los PDFs del catálogo incluyen enlaces a documentación oficial o mantenida por cada tecnología. **La presencia de una fuente oficial no significa que cada ejemplo se haya ejecutado en todas las versiones**: comprueba los ejemplos con el runtime de tu proyecto y abre una incidencia si detectas una errata.

## Estructura del repositorio

```text
.
├── docs/                    # Demo estática para GitHub Pages y sus PDF
├── public/
│   ├── index.html             # Portal y biblioteca
│   ├── aula.html              # Aula e IDE didáctico
│   ├── catalogo_temas.json   # Fuente de títulos y descripciones
│   ├── temarios/              # 75 temas individuales y rutas PDF complementarias
│   └── *_Tema_*.pdf          # Copias de compatibilidad de los 75 temas
├── lib/quizzes.js             # Banco de preguntas del servidor
├── tests/                    # Pruebas automatizadas
├── scripts/                  # Generación reproducible de temarios
├── server.js                 # API, sesiones y servidor local
├── GUIA_TEMARIOS.md          # Criterios editoriales y fuentes
├── CONTRIBUTING.md           # Guía de contribución
└── verificar_entrega.py      # Verificaciones de entrega
```

## Temarios y verificación editorial

Los documentos son síntesis didácticas en español con enlaces a documentación primaria y atribución a los equipos que la mantienen. No reproducen capítulos completos ni sustituyen esas fuentes. Cada PDF incluye objetivos, conceptos, ejemplos, ejercicios, pruebas y referencias relacionadas con el tema. Consulta GUIA_TEMARIOS.md para conocer el alcance y cómo informar de errores.

## Límites conocidos

- CódigoClaro está en desarrollo y no debe exponerse a Internet sin una revisión de seguridad, privacidad, configuración HTTPS, permisos y copias de seguridad.
- No hay recuperación automática de contraseña ni verificación por correo.
- El registro público crea cuentas de estudiante, aunque el correo coincida con `ADMIN_EMAIL`. Promueve administradores con el procedimiento local de [`ADMINISTRACION.md`](ADMINISTRACION.md).
- Algunos motores del IDE cargan herramientas desde CDN y necesitan Internet. Java compila en Judge0 mediante HTTPS solo después del consentimiento explícito de cada sesión; se envían el código y `stdin` al servicio externo, así que no incluyas secretos ni datos personales. El endpoint puede limitar solicitudes. Kotlin ofrece análisis estático y Node.js se simula.
- La biblioteca educativa y los tests siguen creciendo; la cantidad y cobertura de preguntas puede variar por tecnología.
- La documentación y las APIs de terceros evolucionan. Las referencias oficiales enlazadas son el punto de partida para comprobar compatibilidad.

## Roadmap orientativo

- [x] Biblioteca de 75 temas individuales y seis rutas complementarias de 15 temas.
- [x] Temarios ampliados con estructura editorial consistente.
- [x] Catálogo con títulos, descripciones y número de páginas.
- [x] Verificación automatizada del paquete.
- [ ] Ejecutar y registrar pruebas de ejemplo por versión de runtime.
- [ ] Añadir capturas reales, demo breve y backlog público.
- [ ] Revisión externa de accesibilidad, seguridad y privacidad.
- [ ] Ampliar el banco de preguntas con revisión técnica por tecnología.

## Licencia

El código y los materiales originales de este repositorio se distribuyen bajo MIT, salvo que un archivo indique otra licencia. Los nombres, logotipos y documentación enlazada de terceros siguen perteneciendo a sus titulares. Consulta [`LICENSE`](LICENSE).


## Mapa del código

Consulta [`docs/ESTRUCTURA_PROYECTO.md`](docs/ESTRUCTURA_PROYECTO.md) para conocer la organización de carpetas y las convenciones de comentarios. Los PDF públicos están en `public/temarios/` y las guías descargables en `public/ayuda/`; las rutas antiguas de PDF se conservan mediante compatibilidad en el servidor.

## PostgreSQL y Neon (experimental)

`server-postgres.js` y las migraciones `migrations/001_postgres_core.sql` y `migrations/002_postgres_question_rewards.sql` son una variante optativa de staging; aún no tienen paridad con la API SQLite ni transfieren sus datos. Las pruebas de PostgreSQL se omiten si no se configura explícitamente una base de pruebas. No uses esta variante con Neon ni en producción hasta completar la paridad, las migraciones y las pruebas de integración.
