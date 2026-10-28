CódigoClaro v1.0.3 — Tests con corrección inmediata

Cambios:
- El test muestra corrección inmediata al seleccionar una respuesta, con explicación y respuesta correcta si se falla.
- Al finalizar muestra aciertos, errores, porcentaje y nota sobre 10.
- Si el filtro de tecnología/nivel no tiene suficientes preguntas, amplía automáticamente el conjunto sin repetir preguntas dentro del intento y avisa al usuario.
- Añadido POST /api/quiz/check para corregir una pregunta sin guardar un intento separado.
- Conserva el tema claro y el modo local de la versión 1.0.2.

Pruebas: npm test (9/9 superadas) y node --check server.js.
