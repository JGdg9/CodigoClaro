CódigoClaro v1.1.2 — evolución, comparación por tecnología y objetivos semanales

Novedades
- GET /api/stats/overview: evolución diaria de tests, precisión y comparación por tecnología a partir de los intentos guardados en SQLite.
- GET/PUT /api/goals/weekly: guardar objetivos semanales por cuenta (tests y minutos), con validación de límites.
- Panel Estadísticas: gráficos de barras ligeros, comparación por tecnología y formulario para fijar objetivos.
- El progreso de tests semanales se calcula desde los intentos reales de la semana actual (UTC).
- Los minutos son un objetivo manual; esta versión no cronometra automáticamente el tiempo de estudio.
- Endpoints protegidos por sesión y datos aislados por usuario.

Verificación
- Ejecutar: npm test
- Requisitos: Node.js >= 22.5.0.
