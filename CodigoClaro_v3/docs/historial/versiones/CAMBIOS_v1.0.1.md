CódigoClaro v1.0.1 — correcciones

Corregido:
1. Error `activeReviewTopics is not defined` en Tests/repaso.
2. Criterio de suma Java: ahora detecta `a + b` y `b + a`.
3. Los ejercicios muestran saltos de línea reales en vez de `\n` literal.
4. El feedback de los criterios se presenta en líneas separadas.
5. Las llamadas fetch del panel y del aula muestran mensajes más útiles cuando falla la conexión o la respuesta HTTP.
6. Añadidas pruebas de regresión.

Validación realizada en el entorno de desarrollo:
- `node --check server.js`: correcto.
- `npm test`: 5 pruebas superadas.
- Comprobación sintáctica de los scripts JavaScript inline de `public/index.html` y `public/aula.html`: correcta.

Limitación conocida:
El compilador remoto Java/Kotlin (Judge0) y librerías CDN de Python/React/CodeMirror requieren Internet y dependen del proveedor. Una caída, bloqueo CORS, límites o necesidad de token del proveedor no se puede eliminar desde el código local; ahora la app muestra mejor el error.

Arranque:
1. Extrae el ZIP entero en una carpeta nueva.
2. Conserva tu `.env` de la versión anterior y cópialo a la carpeta nueva si ya tenías configurados ADMIN_EMAIL y SESSION_SECRET. No compartas ese archivo.
3. Ejecuta `INICIAR_CODIGOCLARO.bat`.
4. Abre `http://localhost:3000`.
5. Para detener el servidor: Ctrl+C en la consola.
