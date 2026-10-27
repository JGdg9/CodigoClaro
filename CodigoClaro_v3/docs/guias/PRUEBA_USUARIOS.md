# Guion de prueba con participantes (30–45 minutos)

## Preparación de la persona que organiza

1. Edita `.env`; configura `ADMIN_EMAIL` y una `SESSION_SECRET` aleatoria. Hazlo antes de crear la primera cuenta.
2. Inicia `INICIAR_CODIGOCLARO.bat` y crea la cuenta de administración con el correo configurado.
3. Para probar desde otros dispositivos, comparte solo la IP privada del ordenador anfitrión dentro de la misma Wi-Fi. No publiques el servidor directamente en Internet.
4. Utiliza correos controlados de prueba. No solicites nombre completo real, teléfono, dirección, notas académicas identificables u otros datos que no hagan falta.
5. Explica a quienes participen que es una versión piloto, que pueden borrar su cuenta y que sus comentarios los leerá la administración. Completa la política de privacidad antes de un piloto externo formal.

## Guion por participante

- [ ] Abrir la página en escritorio o móvil y crear una cuenta nueva.
- [ ] Cerrar sesión y volver a entrar con la misma cuenta.
- [ ] Abrir `Temarios`, filtrar por Java/Python/React y abrir un PDF.
- [ ] Marcar un tema como visto y comprobar que suma XP.
- [ ] Hacer un test de cinco preguntas y revisar las explicaciones.
- [ ] Ir al plan, añadir una sesión, marcarla hecha y recargar la página.
- [ ] Abrir el aula completa, hacer un ejercicio y comprobar que la barra superior indica sincronización (el progreso se sincroniza al guardar).
- [ ] Exportar el progreso JSON; opcionalmente restaurarlo tras cambiar temporalmente los datos.
- [ ] Enviar un comentario indicando qué fue fácil, qué no se entendió y qué error encontraron.
- [ ] Cerrar sesión; volver a entrar y comprobar que los datos persisten.

## Comprobaciones de la persona administradora

- [ ] El panel muestra cuentas, actividad reciente y tests enviados.
- [ ] El comentario aparece en Administración y se puede marcar como «En revisión» y «Resuelto».
- [ ] CSV de usuarios solo responde desde la sesión de administrador.
- [ ] Al iniciar sesión con un usuario estudiante, no aparece Administración y la API devuelve 403 si intenta entrar directamente.
- [ ] Una cuenta no puede leer el progreso de otra.
- [ ] En Cuenta se puede cambiar contraseña, exportar/importar progreso y eliminar cuenta.

## Preguntas rápidas de satisfacción

1. ¿Qué intentabas conseguir y lo encontraste?
2. ¿Qué parte te hizo dudar o te bloqueó?
3. ¿El feedback de los tests te ayuda a entender el error?
4. ¿Volverías a usarla para estudiar? ¿Por qué?
5. Si solo pudiéramos arreglar una cosa, ¿cuál debería ser?

No guardes las respuestas de forma identificable salvo que sea necesario y los participantes hayan sido informados.
