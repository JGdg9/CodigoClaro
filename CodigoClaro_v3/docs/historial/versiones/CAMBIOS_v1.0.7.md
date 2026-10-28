CódigoClaro v1.0.7 — API administrativa CRUD de contenidos

- GET/POST /api/admin/learning/topics: listado de temas y creación.
- PATCH/DELETE /api/admin/learning/topics/:id: edición y eliminación protegida; no permite borrar temas que contengan preguntas.
- GET/POST /api/admin/learning/questions: listado paginado con filtros y creación validada.
- PATCH/DELETE /api/admin/learning/questions/:id: edición y desactivación lógica de preguntas.
- Todas las rutas requieren sesión; escritura solo para rol admin. Los estudiantes reciben 403.
- Validación de opciones, respuesta correcta, dificultad, tema y límites de texto.
- Registro de eventos administrativos y consultas SQL parametrizadas.
- Pruebas de integración añadidas para permisos, CRUD, validación, duplicados, filtros y prevención de borrado accidental.

Verificación ejecutada en Node.js: npm test (9/9 superadas), node --check server.js, node --check tests/api.test.js.
Requisito: Node.js >= 22.5. La API CRUD está disponible; la interfaz visual de gestión de contenidos aún está pendiente.
