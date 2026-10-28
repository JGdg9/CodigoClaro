# Variante PostgreSQL (experimental)

`server.js` con SQLite sigue siendo el servidor predeterminado. `server-postgres.js` es una variante experimental para evaluación técnica y no migra datos desde SQLite.

## Alcance y límites

La variante cubre cuentas y sesiones, catálogo, tests, progreso, tareas y sesiones de estudio. No tiene paridad con todos los endpoints de SQLite; entre las diferencias están el feedback y la administración del banco de preguntas. No la uses como sustituto de SQLite en producción.

Las migraciones están en `migrations/001_postgres_core.sql` y `migrations/002_postgres_question_rewards.sql`. Se aplican en orden con `npm run migrate:postgres`.

## Pruebas de integración

Las pruebas PostgreSQL requieren `TEST_DATABASE_URL` conectado a una base desechable. Configura el esquema de prueba y ejecuta `npm run test:postgres`. No uses una base con datos reales. Sin esa variable, las pruebas de integración no validan el comportamiento contra PostgreSQL.

Antes de considerar esta variante para un despliegue, completa la paridad de endpoints, el plan de migración, la revisión de seguridad y una prueba de aceptación de la aplicación.