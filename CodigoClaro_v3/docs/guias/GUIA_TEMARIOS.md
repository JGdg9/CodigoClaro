# Guía editorial de los temarios

## Alcance

La biblioteca principal reúne 75 temas: 15 por cada ruta de Java, JavaScript, Python, Kotlin y React. Cada tema ocupa como mínimo diez páginas físicas: objetivos y estrategia de estudio; modelo mental; vocabulario y reglas de la tecnología; lectura guiada de un ejemplo; decisiones de diseño; errores y depuración; práctica guiada; solución razonada; laboratorio; y síntesis con fuentes oficiales. Cada apartado empieza en página nueva para que el material se pueda usar como cuaderno de estudio.

La biblioteca incluye además seis rutas de 15 temas y nueve guías de referencia anteriores. Los 90 PDF de `public/temarios/` tienen al menos diez páginas; las copias documentales de `docs/temarios/` se mantienen idénticas. El control de entrega comprueba ese mínimo para todos los archivos y también comprueba que cada una de las 75 fichas principales tenga texto didáctico extraíble en todas sus páginas.

El catálogo público declara el número real de páginas de cada PDF. La verificación de entrega exige al menos diez páginas y texto didáctico extraíble en cada página, y comprueba que las copias públicas y documentales sean idénticas. El número de páginas por sí solo no demuestra la calidad pedagógica; por eso cada versión debe revisarse visualmente y por muestreo de contenido antes de publicarse.

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
