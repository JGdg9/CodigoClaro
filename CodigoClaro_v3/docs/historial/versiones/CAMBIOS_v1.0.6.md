CódigoClaro v1.0.6 — Backend de catálogo y banco de preguntas

- Añadidas tablas SQLite normalizadas learning_topics y learning_questions con claves foráneas e índices.
- Inicialización automática del catálogo de temas y del banco de preguntas existente.
- Los endpoints de selección, corrección y entrega de tests leen las preguntas desde SQLite.
- Nuevo endpoint GET /api/learning/topics con total de preguntas y distribución por dificultad.
- Nuevo endpoint GET /api/learning/topics/:slug con información de disponibilidad por tema.
- La API de salud informa la versión 1.0.6 y las nuevas capacidades.
- Pruebas de regresión para catálogo, conteos, temas inexistentes y flujo existente.

Pruebas ejecutadas: npm test (9/9 superadas); node --check server.js; node --check tests/api.test.js.
Requisito: Node.js >= 22.5. La base de datos se crea en data/codigoclaro.sqlite salvo que DB_PATH esté configurada.
