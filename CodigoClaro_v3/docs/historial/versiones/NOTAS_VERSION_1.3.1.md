# CódigoClaro 1.3.1 — Calidad, pruebas y verificación de despliegue

## Cambios
- El endpoint `/api/health` lee la versión desde `package.json`, evitando una versión obsoleta escrita a mano.
- Nueva suite de calidad frontend: idioma, viewport, sistema visual editorial, catálogo y presencia de recursos.
- Nuevas pruebas de endurecimiento: cabeceras de seguridad, páginas y tipos MIME, exposición de ficheros internos, métodos HTTP, autenticación, origen de escritura y consistencia del banco de preguntas.
- Nuevo `scripts/smoke-render.js`: comprueba portada, aula, temarios, health, catálogo, temas y un PDF de muestra usando exclusivamente peticiones GET; no crea usuarios ni escribe en la base de datos.
- Nuevo comando `npm run test:coverage` para mostrar cobertura de líneas, ramas y funciones.
- Nuevo comando `npm run test:render` para probar la instancia pública.
- Nuevo workflow manual de GitHub Actions para lanzar las comprobaciones de Render después de un despliegue.
- `verificar_entrega.py` ejecuta ahora todas las pruebas automatizadas, no solo la prueba de API.

## Verificación local realizada
- `npm test`: 35 pruebas superadas.
- `npm run test:coverage`: 35 pruebas superadas; cobertura reportada por Node: 98,74 % de líneas, 69,97 % de ramas y 96,12 % de funciones en los archivos instrumentados.
- `python verificar_entrega.py`: catálogo, PDFs, HTML, enlaces y suite automatizada superados.
- Prueba de Render desde el entorno de creación: no verificable aquí porque el entorno no pudo resolver/conectar con `codigoclaro.onrender.com`. El test remoto se incluye para ejecutarlo desde GitHub Actions o desde tu ordenador.

## Límites
- La cobertura de Node no representa cobertura de ejecución del JavaScript del navegador.
- El smoke test remoto solo comprueba disponibilidad básica y recursos públicos; no inicia sesión, no cambia datos y no certifica la persistencia SQLite.
- No se ha desplegado esta versión en GitHub ni en Render. El paquete debe subirse y probarse primero en una rama/commit controlado.
