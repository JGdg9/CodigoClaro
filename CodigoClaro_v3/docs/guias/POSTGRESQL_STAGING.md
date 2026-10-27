# Backend PostgreSQL de CódigoClaro — staging v1.4.0

## Seguridad y compatibilidad

- `server.js` y `render.yaml` no se han sustituido: el backend SQLite existente sigue siendo el inicio predeterminado.
- El nuevo backend es opt-in: `npm run start:postgres` exige `DATABASE_URL` y, en producción, `SESSION_SECRET` de al menos 32 caracteres.
- Las migraciones `migrations/001_postgres_core.sql` y `migrations/002_postgres_question_rewards.sql` crean y amplían el esquema en orden; no contienen DROP/TRUNCATE ni migran datos SQLite automáticamente. La segunda registra aciertos históricos para evitar volver a conceder XP por las mismas preguntas, sin recalcular los saldos existentes.
- `npm run migrate:postgres` aplica las migraciones SQL numeradas. No apuntes el script a producción durante las pruebas; crea una base PostgreSQL separada para staging.

## Tablas

`users`, `sessions`, `courses`, `course_lessons`, `questions`, `quiz_attempts`, `quiz_question_rewards`, `lesson_progress`, `study_tasks`, `study_sessions`, `schema_migrations`.

## Rutas añadidas en el backend PostgreSQL

- Cuentas: `POST /api/register`, `POST /api/login`, `POST /api/logout`, `GET /api/me`.
- Cursos: `GET /api/courses`, `GET /api/courses/:slug`, creación/edición de cursos para admin y creación de lecciones para admin.
- Tests: `GET /api/quiz`, `POST /api/quiz/submit`.
- Progreso: `GET /api/progress`, `PUT /api/progress` (sincroniza solo lecciones completadas; conserva posiciones, XP e intentos validados), `PUT /api/progress/lesson`. Las dos escrituras bloquean la fila del usuario en una transacción para dar un orden a cambios simultáneos del progreso.
- Tareas: `GET/POST /api/tasks`, `PATCH/DELETE /api/tasks/:id`.
- Estudio y estadísticas: `GET/POST /api/study/sessions`, `POST /api/study/sessions/stop`, `GET /api/stats/overview`.

El backend PostgreSQL nuevo cubre el núcleo, pero no sustituye automáticamente todos los endpoints específicos del servidor SQLite (p. ej. feedback y panel de gestión del banco de preguntas). No cambies el servicio de producción hasta completar la paridad de endpoints y una prueba de aceptación de las pantallas existentes.

## Preparar staging

1. Crea la rama `feature/postgresql-backend` desde la rama estable.
2. Crea un servicio web de staging y una base PostgreSQL de staging independientes en Render. No cambies el servicio `codigoclaro` actual.
3. Configura en el servicio de staging `DATABASE_URL` con la URL interna de la base, `NODE_ENV=production`, `SESSION_SECRET` generado en Render y `ADMIN_EMAIL`.
4. Instala dependencias con `npm install`, ejecuta `npm run migrate:postgres` con `DATABASE_URL` apuntando exclusivamente a staging, y configura el comando de inicio `npm run start:postgres`.
5. Prueba el healthcheck y los flujos desde un navegador de staging. El endpoint `/api/health` verifica la conexión real a PostgreSQL.

El archivo `render-postgres.yaml` es una propuesta separada de blueprint; revísalo en el dashboard y confirma los planes antes de crear recursos que puedan tener coste.

## Pruebas

- `npm test`: suite de regresión SQLite y pruebas de contrato PostgreSQL.
- `node --check server-postgres.js` y `node --check scripts/migrate-postgres.js`.
- `npm run test:postgres`: pruebas de integración reales; por seguridad se omiten si no se define `TEST_DATABASE_URL`, si el nombre de base no contiene `test`, o si no se define `RUN_POSTGRES_INTEGRATION=1`.

Para habilitar las pruebas de integración, instala dependencias y configura una base de datos desechable cuyo nombre incluya `test`. **Nunca uses la URL de producción**. Ejemplo en PowerShell:

```powershell
$env:TEST_DATABASE_URL="postgresql://usuario:clave@host/base_test"
$env:RUN_POSTGRES_INTEGRATION="1"
npm run test:postgres
```

El test aplica el esquema a esa base y crea/borra exclusivamente usuarios con email `integration-*`; usa una base vacía y desechable.

## Validación documentada antes de la migración 002

- La ejecución anterior de la suite registró 55 pruebas pasadas y 5 pruebas de integración PostgreSQL omitidas por no haber una base de test configurada. Esa ejecución no incluye los cambios actuales de XP y la migración 002.
- La migración 002 y la ruta de envío requieren una nueva revisión en staging; no se ejecutaron pruebas automatizadas tras esos cambios.
- No se validó una conexión real a PostgreSQL desde este entorno ni se modificó o desplegó el servicio de Render.
