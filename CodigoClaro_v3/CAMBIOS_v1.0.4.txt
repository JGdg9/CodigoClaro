CódigoClaro v1.0.4 — Tests estrictos por tecnología

Corrección principal:
- Un test de una tecnología concreta (por ejemplo, Java) ya no incorpora preguntas de otras tecnologías si el banco no tiene suficientes preguntas para el número solicitado.
- Los repasos de varias tecnologías solo usan las tecnologías seleccionadas.
- Si el filtro de nivel no tiene suficientes preguntas, se amplían los niveles dentro de la tecnología seleccionada; nunca se amplía a otras tecnologías de forma automática.
- Si siguen faltando preguntas, se muestran las disponibles y se explica el motivo, en vez de mezclar tecnologías silenciosamente.

Backend existente conservado:
- Servidor HTTP local en Node.js.
- Base de datos SQLite local para cuentas, sesiones, progreso, intentos, repasos espaciados, actividad y feedback.
- API de tests con corrección en servidor y respuestas correctas no expuestas en la descarga de preguntas.

Pruebas ejecutadas en esta entrega: npm test (9/9 superadas).
