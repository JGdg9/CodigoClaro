# Guía editorial de los temarios

## Alcance

La biblioteca principal contiene 75 documentos: 15 temas por cada ruta de Java, JavaScript, Python, Kotlin y React. Cada PDF tiene diez páginas organizadas en objetivos, fundamentos, modelo mental, sintaxis, ejemplo, casos límite, depuración, pruebas, laboratorio, autoevaluación y fuentes.

## Cómo interpretar las fuentes

Las referencias se eligen para llegar a documentación primaria o mantenida por el proyecto de cada tecnología. Son puntos de contraste para sintaxis, APIs y diferencias entre versiones; no constituyen una certificación externa del contenido. Si una explicación resumida difiere de la documentación de la versión utilizada, prevalece la fuente oficial.

## Revisión de ejemplos

Los ejemplos son didácticos y deben ejecutarse en un entorno compatible antes de incorporarlos a código de producción. Para revisar un ejemplo:

1. Anota la versión de lenguaje/runtime y el sistema operativo.
2. Copia el ejemplo a un archivo mínimo independiente.
3. Compila o ejecuta y registra el resultado esperado y el observado.
4. Añade al menos un caso límite.
5. Abre una incidencia con el nombre del PDF, página, versión y mensaje de error; no adjuntes secretos.

## Fuentes primarias

- Java: [dev.java](https://dev.java/learn/) y [Oracle Java Documentation](https://docs.oracle.com/en/java/).
- JavaScript: [MDN JavaScript Guide](https://developer.mozilla.org/es/docs/Web/JavaScript/Guide) y [Node.js API](https://nodejs.org/docs/latest/api/).
- Python: [Tutorial oficial](https://docs.python.org/es/3/tutorial/) y [biblioteca estándar](https://docs.python.org/es/3/library/).
- Kotlin: [Kotlin Documentation](https://kotlinlang.org/docs/home.html) y [Kotlin Coroutines](https://kotlinlang.org/docs/coroutines-guide.html).
- React: [React Learn](https://react.dev/learn) y [React Reference](https://react.dev/reference/react).

## Principios de calidad

- Explicar el porqué además de la sintaxis.
- Diferenciar ejemplos ilustrativos de código verificado en ejecución.
- Evitar copiar capítulos completos o reproducir contenido de terceros sin permiso.
- Mantener los ejemplos pequeños, comprensibles y comprobables.
- Corregir errores mediante cambios trazables en el repositorio.
