# Migraciones de SQLite

Las migraciones versionadas de SQLite están en `migrations/`. El servidor las aplica al iniciar, dentro de transacciones, y `npm run db:migrate` permite aplicarlas explícitamente.

`001_initial_schema.js` crea las tablas e índices con `IF NOT EXISTS`. Si una base SQLite ya tiene el esquema actual pero todavía no tiene historial, la migración registra esa versión sin borrar filas. Si detecta tablas o columnas incompatibles, se detiene antes de aplicar la migración; no intenta reconstruir ni vaciar la base.

Antes de migrar una base con cuentas reales, crea y verifica una copia de seguridad. No edites una migración que ya se haya aplicado: añade una nueva migración numerada y prueba la actualización sobre una copia restaurada.

Este paso cubre SQLite local. La capa de PostgreSQL/Neon y sus migraciones compatibles todavía no están implementadas ni probadas.

