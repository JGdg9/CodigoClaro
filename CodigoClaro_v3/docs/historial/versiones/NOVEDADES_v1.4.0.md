# CódigoClaro v1.4.0 — backend PostgreSQL opt-in

- Nuevo servidor PostgreSQL separado (`server-postgres.js`) para pruebas en staging.
- Migración SQL idempotente para usuarios, sesiones, cursos, lecciones, banco de preguntas, intentos, progreso, tareas y sesiones de estudio.
- Endpoints de cuentas, cursos, tests, progreso, tareas y estadísticas.
- Pruebas de contrato y pruebas de integración opt-in con base de datos de test.
- Blueprint de Render alternativo (`render-postgres.yaml`), sin cambiar el `render.yaml` actual.
- Documentación de preparación y validación de staging en `POSTGRESQL_STAGING.md`.

No se ha cambiado el servidor SQLite por defecto, no se ha hecho commit ni se ha desplegado en producción. PostgreSQL debe probarse en un servicio/base de staging antes de plantear la migración definitiva.
