# Migraciones de base de datos

Las migraciones versionadas de SQLite están en `migrations/*.js`. El servidor las aplica al iniciar, dentro de transacciones, y `npm run db:migrate` permite aplicarlas explícitamente. No edites una migración que ya se haya aplicado: añade otra numerada. Antes de migrar una base con cuentas reales, crea y verifica una copia de seguridad.

La variante PostgreSQL experimental usa `migrations/*.sql` y `npm run migrate:postgres`. El script aplica los archivos numerados en orden; cada archivo gestiona su propia transacción. Ejecútalo primero contra una base de staging y crea una copia de seguridad antes de actualizar datos reales. Esta variante aún no tiene paridad completa con SQLite ni transfiere sus datos.

La migración `002_*_question_rewards` registra los aciertos previos para que una pregunta no vuelva a conceder XP. No recalcula los XP históricos existentes. Desde esa migración, cada pregunta correcta solo concede XP la primera vez; la bonificación perfecta requiere al menos dos preguntas nuevas en el mismo intento.
