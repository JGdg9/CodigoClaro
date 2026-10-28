# Guía rápida de CódigoClaro (versión piloto)

**Importante:** para usar registro, inicio de sesión, tests sincronizados, panel de administración y progreso por cuenta, inicia el servidor desde `INICIAR_CODIGOCLARO.bat` en la carpeta raíz del proyecto. No abras `index.html` mediante doble clic ni desde dentro del ZIP.

## 1. Probar la plataforma con una cuenta

1. Abre `http://localhost:3000`.
2. Crea una cuenta normal. El registro siempre concede el rol de estudiante; `ADMIN_EMAIL` solo permite una promoción local confirmada. Para administrar, sigue `ADMINISTRACION.md` y ejecuta el comando desde el equipo que tiene la base SQLite.
3. En Temarios, filtra por tecnología, abre un PDF y marca un tema como visto.
4. Haz un test y revisa las explicaciones.
5. En Plan de estudio, añade una tarea, márcala y recarga.
6. En Feedback, manda una idea o comunica un error.
7. Abre Cuenta y prueba exportar JSON, cambiar contraseña o eliminar la cuenta de prueba.
8. Abre el aula completa mediante «Abrir aula» o `http://localhost:3000/aula.html`. La barra superior indica si se sincroniza el progreso con tu cuenta.

## 2. Probar con un segundo dispositivo

Usa solo una red Wi-Fi de confianza. En el ordenador servidor ejecuta `ipconfig`, encuentra la IP local y desde el otro dispositivo abre `http://IP-LOCAL:3000`. Permite el acceso de Node.js en el firewall solo para esa red privada si fuera necesario. No abras puertos al exterior.

## 3. Motores del IDE

- JavaScript puede ejecutarse en el navegador.
- Python y React cargan bibliotecas desde CDN y requieren Internet en la primera ejecución.
- SQL usa SQLite en WebAssembly: no es un servidor Oracle, MySQL ni PostgreSQL.
- MongoDB y Firestore son simuladores didácticos; no conectan a servicios cloud reales.
- Java compila en Judge0 por HTTPS después del consentimiento explícito de la sesión. Al ejecutar se envían el código y `stdin` al servicio externo, que puede limitar solicitudes; usa ejemplos sin secretos ni datos personales. Kotlin ofrece análisis estático. Node.js usa un simulador de backend.
- PL/SQL no se ejecuta sin Oracle Database.

No introduzcas contraseñas, tokens, claves API, información personal ni código confidencial en el IDE.

## 4. Comprobación del paquete

Desde PowerShell en la carpeta raíz del proyecto, ejecuta:

```powershell
npm test
python verificar_entrega.py
```

Estas pruebas revisan rutas principales, autenticación, aislamiento por usuario, progreso, tests, contraseñas, feedback, permisos y archivos. No sustituyen pruebas visuales manuales de cada motor externo.
