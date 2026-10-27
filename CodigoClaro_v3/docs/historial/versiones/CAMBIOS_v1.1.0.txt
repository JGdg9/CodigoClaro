CódigoClaro v1.1.0 — Importación y exportación del banco de preguntas

- Añade exportación JSON del banco completo de preguntas desde el panel de administración.
- Añade importación JSON con formato codigoclaro-questions-v1.
- La vista previa valida el archivo y calcula altas, actualizaciones y temas nuevos sin escribir en SQLite.
- La importación rechaza archivos con preguntas inválidas o IDs duplicados dentro del propio archivo, sin guardar parcialmente.
- Los IDs ya existentes se actualizan; los nuevos se crean. Los temas nuevos se crean automáticamente.
- La importación se ejecuta dentro de una transacción SQLite.
- Solo administradores autenticados pueden importar/exportar.
- El panel muestra el resultado y solicita confirmación antes de aplicar los cambios.
- Se mantienen las funciones previas, los tests filtrados por tecnología y el modo local.
