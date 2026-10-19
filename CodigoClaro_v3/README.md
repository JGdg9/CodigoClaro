# CódigoClaro

**Plataforma educativa independiente para aprender programación practicando.** CódigoClaro nace como una idea de apoyo al alumnado de DAM y DAW: reunir rutas de aprendizaje, temarios propios, ejercicios, tests y seguimiento del progreso en un mismo proyecto.

> Estado: proyecto en desarrollo. Algunas funciones requieren servidor local y los motores del IDE tienen limitaciones documentadas. No se presenta como una plataforma de producción ni como un compilador universal.

## Qué incluye

- **75 temarios ampliados**, organizados en cinco rutas: Java, JavaScript, Python, Kotlin y React.
- **Diez páginas por temario**, con fundamentos, modelo mental, sintaxis, ejemplos, buenas prácticas, depuración, pruebas, ejercicios, rúbrica y referencias oficiales.
- Biblioteca de guías complementarias en PDF.
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
4. Define `SESSION_SECRET` con una cadena aleatoria de al menos 32 caracteres y configura `ADMIN_EMAIL` antes de registrar la cuenta administradora.
5. Ejecuta `INICIAR_CODIGOCLARO.bat`.
6. Abre `http://localhost:3000`.

El proyecto no requiere `npm install` para ejecutar el servidor en su configuración actual. La base de datos se crea localmente. **No publiques el archivo `.env` ni la base SQLite.**

## Publicación online: aplicación completa y demo estática

CódigoClaro tiene dos formas de publicación distintas:

- **Aplicación completa (recomendada si quieres que funcionen el registro, las sesiones y el progreso):** necesita un servicio que ejecute Node.js y una ruta de almacenamiento persistente para SQLite. Se incluye `render.yaml` como plantilla de despliegue en Render. El disco persistente de Render requiere un plan compatible de pago; consulta sus precios antes de desplegar.
- **GitHub Pages (`docs/`):** demo estática de la biblioteca y los PDF. No ejecuta el servidor Node.js ni la base de datos, así que no ofrece las funciones de cuentas, sesiones, administración ni progreso persistente.

### Desplegar la aplicación completa en Render

1. Sube el proyecto a GitHub y asegúrate de que `render.yaml` esté en la raíz del repositorio.
2. En Render, selecciona **New → Blueprint** y conecta el repositorio de GitHub.
3. Render leerá `render.yaml`. Revisa el servicio, el plan y el disco persistente antes de confirmar. El disco persistente no suele estar incluido en el nivel gratuito.
4. Cuando Render solicite `ADMIN_EMAIL`, introduce el correo exacto que usarás para crear tu cuenta administradora. Crea esa cuenta con ese mismo correo después del despliegue; las cuentas existentes no cambian automáticamente de rol.
5. Comprueba que `SESSION_SECRET` se haya generado automáticamente y que `DB_PATH` sea `/var/data/codigoclaro.sqlite`. No reutilices secretos de ejemplo ni publiques credenciales.
6. Espera a que el despliegue termine y abre la URL `onrender.com` que Render asigne. Comprueba `/api/health` y prueba el registro, inicio de sesión y guardado de progreso.

**Importante sobre la estructura del repositorio:** el `render.yaml` de esta entrega usa como `rootDir` `CodigoClaro_v1.2.1/CodigoClaro_Piloto_Actualizado`, porque la copia actual del proyecto está anidada en esa ruta. Si organizas los archivos del proyecto directamente en la raíz del repositorio, cambia `rootDir` a `.` antes de desplegar.

**Importante sobre SQLite:** usa un disco persistente montado en `/var/data`; sin almacenamiento persistente, los datos pueden perderse al reiniciar o redeplegar el servicio. No configures el servidor con una base de datos dentro de una carpeta temporal.

### Publicar la demo estática en GitHub Pages

1. En el repositorio abre **Settings → Pages** y selecciona **GitHub Actions** como fuente.
2. El workflow `.github/workflows/pages.yml` publica `docs/` desde la raíz del proyecto. Si el proyecto permanece anidado en una carpeta, el workflow de Pages y el de verificación deben ajustarse a esa ruta o conviene mover el contenido del proyecto a la raíz.
3. Comprueba que la ejecución termine en verde y usa la URL que GitHub muestre en **Settings → Pages**.

## Ejecutar y comprobar

```bash
node --check server.js
npm test
python verificar_entrega.py
```

`npm test` ejecuta la suite automatizada del servidor y regresiones. `verificar_entrega.py` comprueba estructura, catálogo, PDFs y enlaces internos. Estas pruebas no equivalen a una auditoría de seguridad ni a una prueba visual de todos los motores del IDE.

## Regenerar los temarios PDF

Requisitos: Python 3.10+ y ReportLab. Instala la dependencia opcional:

```bash
python -m pip install -r requirements-docs.txt
python scripts/generar_temarios.py
```

El generador lee `public/catalogo_temas.json` y vuelve a producir los 75 PDFs de la ruta. Los documentos incluyen enlaces a documentación oficial/mantenida por cada tecnología. **La presencia de una fuente oficial no significa que cada ejemplo se haya ejecutado en todas las versiones**: comprueba los ejemplos con el runtime de tu proyecto y abre una incidencia si detectas una errata.

## Estructura del repositorio

```text
.
├── docs/                    # Demo estática para GitHub Pages y sus PDF
├── public/
│   ├── index.html             # Portal y biblioteca
│   ├── aula.html              # Aula e IDE didáctico
│   ├── catalogo_temas.json   # Fuente de títulos y descripciones
│   └── *_Tema_*.pdf          # 75 temarios ampliados
├── lib/quizzes.js             # Banco de preguntas del servidor
├── tests/                    # Pruebas automatizadas
├── scripts/                  # Generación reproducible de temarios
├── server.js                 # API, sesiones y servidor local
├── GUIA_TEMARIOS.md          # Criterios editoriales y fuentes
├── CONTRIBUTING.md           # Guía de contribución
└── verificar_entrega.py      # Verificaciones de entrega
```

## Temarios y verificación editorial

Los documentos son material didáctico original, no traducciones ni copias de capítulos de manuales. Cada uno contiene objetivos, conceptos, ejemplo de referencia, ejercicios, pruebas y enlaces a fuentes primarias. Consulta [`GUIA_TEMARIOS.md`](GUIA_TEMARIOS.md) para conocer el alcance y cómo informar de errores.

## Límites conocidos

- CódigoClaro está en desarrollo y no debe exponerse a Internet sin una revisión de seguridad, privacidad, configuración HTTPS, permisos y copias de seguridad.
- No hay recuperación automática de contraseña ni verificación por correo.
- El correo configurado en `ADMIN_EMAIL` obtiene rol de administración al registrarse; protege `.env` y no compartas esa configuración.
- Algunos motores del IDE cargan herramientas desde CDN y necesitan Internet. Java, Kotlin y PL/SQL no deben anunciarse como compilados/ejecutados si la interfaz solo realiza análisis estático o simulación.
- La biblioteca educativa y los tests siguen creciendo; la cantidad y cobertura de preguntas puede variar por tecnología.
- La documentación y las APIs de terceros evolucionan. Las referencias oficiales enlazadas son el punto de partida para comprobar compatibilidad.

## Roadmap orientativo

- [x] Biblioteca de 75 temas y guías complementarias.
- [x] Temarios ampliados con estructura editorial consistente.
- [x] Catálogo con títulos, descripciones y número de páginas.
- [x] Verificación automatizada del paquete.
- [ ] Ejecutar y registrar pruebas de ejemplo por versión de runtime.
- [ ] Añadir capturas reales, demo breve y backlog público.
- [ ] Revisión externa de accesibilidad, seguridad y privacidad.
- [ ] Ampliar el banco de preguntas con revisión técnica por tecnología.

## Licencia

El código y los materiales originales de este repositorio se distribuyen bajo MIT, salvo que un archivo indique otra licencia. Los nombres, logotipos y documentación enlazada de terceros siguen perteneciendo a sus titulares. Consulta [`LICENSE`](LICENSE).
