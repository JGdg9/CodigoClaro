# Guía editorial de los temarios

## Alcance

La biblioteca principal reúne 75 temas: 15 por cada ruta de Java, JavaScript, Python, Kotlin y React. Cada tema ocupa tres páginas físicas y conserva diez apartados numerados: objetivo, base conceptual, ejemplo, decisiones de diseño, límites, práctica, verificación, laboratorio, autoevaluación y fuentes. El texto fluye entre páginas sin reservar una página para cada apartado.

## Fuentes y atribución

Cada PDF identifica las entidades que mantienen las fuentes citadas y enlaza documentación primaria relacionada con la tecnología. El material se presenta como una síntesis didáctica en español; no como una cita literal ni como sustituto del manual oficial. Si una explicación resumida difiere de la documentación de la versión instalada, prevalece la fuente primaria.

- Java: Dev.java, Oracle Java Language Specification y, para pruebas, JUnit 5.
- JavaScript: MDN Contributors y la especificación ECMAScript de Ecma International.
- Python: Python Software Foundation, documentación de la biblioteca estándar y, cuando aplica, pytest.
- Kotlin: documentación y biblioteca estándar mantenidas por JetBrains.
- React: documentación del equipo de React; React Router y React Testing Library cuando corresponda.

Las referencias de esta edición se revisaron el 28 de octubre de 2026. Los enlaces pueden actualizarse; consulta siempre la versión que use tu proyecto.

## Revisión de ejemplos

Los ejemplos son didácticos y deben comprobarse en un entorno compatible antes de incorporarlos a código de producción. Para revisar uno:

1. Anota la versión del lenguaje, runtime, dependencias y sistema operativo.
2. Copia el ejemplo a un archivo mínimo independiente.
3. Compila o ejecuta y compara el resultado esperado con el observado.
4. Añade al menos un caso límite y una prueba repetible.
5. Si detectas una errata, informa del PDF, página, versión y mensaje; no adjuntes secretos.

## Principios de calidad

- Explicar el porqué además de la sintaxis.
- Distinguir las reglas del lenguaje de las APIs de cada entorno.
- Evitar reproducir capítulos completos de obras de terceros.
- Mantener ejemplos pequeños, legibles y comprobables.
- Enlazar fuentes primarias junto a los temas que respaldan.
