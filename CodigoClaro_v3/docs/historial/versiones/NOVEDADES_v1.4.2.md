# CódigoClaro v1.4.2 — Reorganización real de archivos

## Cambios

- PDF públicos agrupados en `public/temarios/` en lugar de mezclarse con las páginas web.
- Guías descargables agrupadas en `public/ayuda/`.
- Catálogo de la API y página pública de temarios actualizados para usar `/temarios/<archivo>.pdf`.
- Compatibilidad interna del servidor para las URL antiguas de PDF y guías.
- Comentarios de módulo y documentación de funciones críticas en los servidores y scripts.
- Comentarios de propósito en las páginas principales y cabeceras de las suites de pruebas.
- Verificador de entrega actualizado para la nueva estructura.

## Validación

- `npm test`: 60 pruebas contabilizadas, 55 superadas y 5 de integración PostgreSQL omitidas por no existir base de pruebas configurada.
- `python verificar_entrega.py`: superado; comprueba los 75 temarios individuales y 89 PDF totales.
- `node --check`: servidores y scripts JavaScript comprobados.
- `python -m py_compile`: scripts Python comprobados.

No se ha ejecutado ninguna migración ni se ha publicado nada en GitHub o Render.
