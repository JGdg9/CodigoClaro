# IDE integrado

El IDE está pensado para prácticas didácticas. Cada selector muestra el motor que usa y si ejecuta código, analiza texto o abre una herramienta externa.

## Motores

- **JavaScript:** se ejecuta en un Web Worker local sin acceso de red, con límites de tiempo y salida.
- **HTML y CSS:** muestran una vista previa local aislada; no ejecutan scripts de HTML ni cargan recursos externos.
- **React/JSX:** compila JSX y muestra HTML estático con assets locales en un worker que se detiene al superar el tiempo límite. La salida pasa por DOMPurify y se muestra en un iframe aislado con scripts y red bloqueados. Los eventos y efectos no se ejecutan; la vista previa no es interactiva.
- **React local:** el editor limita el código a 32 KB, el worker a 5 segundos y la salida a 64 KB. React, ReactDOMServer, Babel y DOMPurify se empaquetan dentro de `public/`; no se usa CDN ni se envía el código. `npm run build:react-preview` reconstruye los assets y `public/THIRD_PARTY_LICENSES.md` conserva las licencias.
- **Java, Kotlin, Node.js, Python y TypeScript:** se ejecutan en un endpoint compatible con Judge0 después de marcar el consentimiento de la sesión. El código y, cuando proceda, `stdin` salen del navegador.
- **PostgreSQL:** PGlite ejecuta PostgreSQL real en WebAssembly dentro de un Web Worker. La primera carga trae el motor desde jsDelivr; la base persiste en IndexedDB de este navegador y no se sincroniza con la cuenta.
- **Gestión de bases de datos:** SQL.js ejecuta SQLite local. No equivale a Oracle, MySQL ni PostgreSQL.
- **Oracle SQL y PL/SQL:** abren Oracle FreeSQL en otra pestaña. El usuario debe pegar el código allí; al ejecutarlo, Oracle lo recibe.
- **SQL compatible con MySQL:** ofrece TiDB Playground. TiDB entiende parte de la sintaxis MySQL, pero no es un servidor MySQL y no admite todas sus funciones, procedimientos o triggers.
- **XML y XPath:** validan XML y prueban XPath localmente con una muestra didáctica fija.
- **MongoDB, Firestore y backend:** son simuladores didácticos; no conectan con servicios ni abren un servidor HTTP.

## Privacidad al ejecutar código

El IDE guarda un borrador local del IDE en el almacenamiento del navegador. Ese borrador no se sincroniza por sí solo con la cuenta.

Si pulsas **Comprobar conexión**, el navegador consulta el endpoint configurado para leer los lenguajes disponibles. La petición puede incluir el token opcional que hayas introducido, pero no incluye tu código ni el texto de entrada (`stdin`).

Para ejecutar Java, Kotlin, Node.js, Python o TypeScript, marca el consentimiento de esta sesión y pulsa **Ejecutar**. El código y `stdin` se envían al endpoint HTTPS mostrado en el IDE (por defecto, `https://ce.judge0.com`). Si has escrito un token, también se envía para autenticar la petición. El servicio remoto puede aplicar sus propias condiciones y límites.

Los enlaces a Oracle FreeSQL y TiDB Playground no transfieren el contenido del editor. Si copias el código y lo pegas en esos servicios, el proveedor externo lo recibirá y aplicará sus condiciones de uso.

No introduzcas contraseñas, tokens, claves API, datos personales ni código confidencial. Los retos se evalúan con criterios didácticos y no sustituyen pruebas unitarias. La vista previa HTML/CSS usa un iframe con restricciones, pero no debe tratarse como una frontera de seguridad profesional.
