CódigoClaro v1.2.0 — octubre de 2026

- Se han ampliado los 75 temarios individuales: 15 por tecnología (Java, JavaScript, Python, Kotlin y React), con exactamente diez páginas cada uno.
- Cada temario incorpora objetivos, fundamentos, ejemplo, decisiones de diseño, casos límite, depuración, pruebas, laboratorio, rúbrica y referencias oficiales/mantenidas por los proyectos.
- El catálogo API usa títulos y descripciones reales del catálogo editorial y expone el número de páginas.
- La biblioteca muestra títulos descriptivos, resumen del contenido y extensión de cada PDF.
- La portada y el README se han orientado a presentar CódigoClaro como proyecto educativo independiente y de portfolio.
- Se añaden guía editorial accesible desde la web, guía de contribución, licencia MIT y generador reproducible de PDFs.
- Se amplía verificar_entrega.py para comprobar las diez páginas por documento cuando está disponible pdfinfo.
- Actualizada versión del paquete a 1.2.0.

Verificaciones ejecutadas:
- node --check server.js
- node --check lib/quizzes.js
- node --test tests/*.test.js: 17/17 pruebas superadas.
- python -m py_compile scripts/generar_temarios.py verificar_entrega.py
- python verificar_entrega.py: 89 PDF válidos; 75 temarios de diez páginas; catálogo, HTML, enlaces y prueba de integración verificados.

Limitación editorial: los documentos enlazan fuentes primarias para contrastar los conceptos, pero no se afirma que cada ejemplo se haya compilado o ejecutado en todas las versiones de cada runtime. Deben comprobarse antes de utilizarse en producción.
