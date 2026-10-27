# CódigoClaro v1.4.1 — Organización y comentarios

## Objetivo

Ordenar la documentación sin cambiar las rutas de ejecución y añadir comentarios de mantenimiento al código existente.

## Cambios

- Agrupadas las notas de versiones anteriores en `docs/historial/versiones/`.
- Agrupadas las guías de temarios y pruebas en `docs/guias/`.
- Añadido `docs/ESTRUCTURA_PROYECTO.md` con el mapa de carpetas, convenciones y reglas para evitar cambios destructivos.
- Añadidos comentarios de módulo y documentación de funciones en JavaScript y Python.
- Añadidos comentarios descriptivos a las tablas SQL, workflows, configuraciones de despliegue y secciones HTML/CSS/JavaScript.
- Actualizada la versión del paquete a 1.4.1.
- No se ha cambiado el comando de inicio ni se ha activado PostgreSQL como servidor predeterminado.

## Validación

- `npm test`: 60 pruebas contabilizadas, 55 superadas, 0 fallos y 5 pruebas de integración PostgreSQL omitidas porque no hay una base de datos de pruebas configurada.
- `python scripts/verificar_pages.py`: correcto; 75 temarios y sus PDF disponibles.
- `python verificar_entrega.py`: correcto; 75 temarios de diez páginas, 89 PDF válidos, estructura HTML y suite automatizada.
- `node --check` en todos los archivos JavaScript: correcto.
- `python -m py_compile` en los scripts Python: correcto.

## Límites

Las pruebas PostgreSQL requieren una base de datos de pruebas real. Estas comprobaciones no sustituyen la validación visual manual en los navegadores ni un smoke test remoto de Render.
