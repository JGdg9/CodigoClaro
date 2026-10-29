# Prototipo Premium sin cobro

La página `public/premium-piloto.html` presenta un proyecto guiado de API de tareas para estudiar el interés por un beneficio Premium práctico.

- No integra Stripe, PayPal ni otro proveedor de pagos.
- No solicita tarjeta, no crea una suscripción y no genera cargos.
- Activar la prueba solo marca el proyecto como iniciado en el navegador.
- Las casillas de avance se guardan en `localStorage`; no se envían al servidor ni se asocian a una cuenta.
- El botón «Borrar mi avance local» elimina ese estado del navegador.
- La versión básica y sus funciones no se modifican.

## Probar el prototipo

1. Inicia la aplicación desde `CodigoClaro_v3` según la guía del proyecto.
2. Abre `/premium-piloto.html` directamente o pulsa «Probar Premium · sin cobro» en la página pública.
3. Pulsa «Activar demo local · sin pago», marca una o más entregas y recarga la página para comprobar que el avance continúa en ese navegador.
4. Pulsa «Borrar mi avance local» para reiniciar la prueba.

## Límite de la prueba

El prototipo permite valorar el formato y el proyecto. No valida disposición a pagar, no ofrece contenido de solución completo ni crea un estado de Premium en la cuenta. El progreso local se puede borrar al limpiar los datos del navegador o usar otro dispositivo.
