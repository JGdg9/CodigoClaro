# IDE integrado

El IDE está pensado para prácticas didácticas. Algunos motores requieren Internet para cargar bibliotecas y no todos ejecutan código real.

## Motores

- **JavaScript:** se ejecuta en un iframe aislado del documento principal.
- **Python:** usa Pyodide sobre WebAssembly en un Web Worker; la primera ejecución necesita descargar Pyodide desde un CDN.
- **SQL:** ejecuta una selección de SQL sobre SQLite en WebAssembly. No equivale a Oracle, MySQL o PostgreSQL.
- **React/JSX:** usa React y Babel desde CDN dentro de un iframe; no instala paquetes npm arbitrarios.
- **Java:** compila y ejecuta mediante Judge0 con consentimiento explícito por sesión.
- **Kotlin y PL/SQL:** ofrecen editor y análisis estático; no ejecutan un runtime completo.
- **MongoDB, Firestore y backend:** son simuladores didácticos.
- **Node.js:** ejecuta una simulación aislada, no las APIs reales de Node.js.

## Privacidad al ejecutar código

El IDE guarda un borrador local del IDE en el almacenamiento del navegador. Ese borrador no se sincroniza por sí solo con la cuenta.

Si pulsas **Comprobar conexión**, el navegador consulta el endpoint de Java para leer los lenguajes disponibles. La petición puede incluir el token opcional que hayas introducido, pero no incluye tu código ni el texto de entrada (`stdin`).

Para compilar Java, marca el consentimiento de esta sesión y pulsa **Ejecutar**. Se envían el código y `stdin` al endpoint HTTPS mostrado en el IDE (por defecto, `https://ce.judge0.com`). Si has escrito un token, también se envía en la petición de ejecución. El servicio remoto puede aplicar sus propias condiciones y límites.

No introduzcas contraseñas, tokens, claves API, datos personales ni código confidencial. Los retos se evalúan con criterios didácticos y no sustituyen pruebas unitarias. Los iframes aislados no son una frontera de seguridad profesional.