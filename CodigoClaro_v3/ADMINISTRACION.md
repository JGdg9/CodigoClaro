# Administración de cuentas

El registro público siempre crea una cuenta de estudiante. Escribir el correo configurado en `ADMIN_EMAIL` no concede permisos.

Para designar una cuenta administradora:

1. Define `ADMIN_EMAIL` en `.env` o en la configuración protegida del servicio.
2. Registra esa cuenta como cualquier otra cuenta.
3. Verifica que controlas esa cuenta. La aplicación todavía no verifica direcciones de correo.
4. Desde la carpeta de la aplicación, con acceso a la misma base SQLite, ejecuta:

   ```powershell
   node scripts/promote-admin.js tu-correo@example.com --confirm
   ```

El comando solo promueve la cuenta que coincide con `ADMIN_EMAIL`, exige `--confirm`, no crea una base de datos ni una cuenta, y registra el cambio en la actividad. Requiere acceso autorizado al ordenador o servicio que contiene la base de datos. No compartas `.env` ni introduzcas secretos en Git.
