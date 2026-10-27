# CódigoClaro v1.3.2 — Espacio de estudio adicional

## Principio de esta entrega

Esta versión añade un espacio independiente en `public/estudio.html` y su lógica en `public/estudio.js`. No sustituye ni elimina las páginas, APIs, base de datos, autenticación, temarios o herramientas anteriores. El acceso directo será `/estudio.html` después de desplegar esta rama.

## Funcionalidades nuevas

- Temporizador de concentración de 25 minutos y descanso de 5 minutos, con pausa y reinicio.
- Lista local de tareas con duración estimada, completar, eliminar y filtros.
- Estadísticas diarias de sesiones, minutos y tareas completadas.
- Importación y exportación de copia JSON con validación de formato y límites de tamaño.
- Diseño editorial claro siguiendo la referencia Intercom: crema, lino, bordes cálidos, tipografía ligera, violeta puntual y esquinas de 4 px.
- Accesibilidad básica: etiquetas, estados de botones, anuncios `aria-live`, foco visible y respeto por movimiento reducido.
- Los datos se guardan en `localStorage` de este navegador; no se sincronizan con la cuenta ni se envían al servidor.

## Pruebas realizadas localmente

- `npm test`: 48 pruebas superadas, 0 fallidas.
- `node --check public/estudio.js`: correcto.
- `node --check server.js`: correcto.
- Smoke test HTTP de solo lectura contra una instancia local: 10/10 rutas correctas, incluyendo `/estudio.html` y `/estudio.js`.

La prueba HTTP local no equivale a confirmar un despliegue real en Render. Tras subir la rama y esperar a que termine el despliegue de prueba, ejecutar `npm run test:render` con `RENDER_BASE_URL` configurada para el entorno que se quiera comprobar.

## Cómo probar

Abrir `/estudio.html`. La función es independiente y no requiere cambios en la base de datos ni variables de entorno nuevas.
