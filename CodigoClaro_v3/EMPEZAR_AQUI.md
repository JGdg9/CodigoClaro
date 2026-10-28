# Empezar en local

## Requisitos

- Node.js 22.5 o posterior.
- Windows: usa el iniciador incluido. En otros sistemas, puedes iniciar el servidor desde una terminal.

## Inicio

1. Instala las dependencias con `npm ci`.
2. En Windows, ejecuta `INICIAR_CODIGOCLARO.bat`; en otros sistemas, copia `.env.example` a `.env` y define `SESSION_SECRET` con un valor aleatorio.
3. Ejecuta `npm start` si no usas el iniciador de Windows.
4. Abre `http://localhost:3000`.

Para detener el servidor, usa `Ctrl+C` en la terminal.

## Cuentas y datos

El registro público crea cuentas de estudiante. Esta versión no verifica el correo ni permite restablecer la contraseña. Revisa la [información de privacidad](public/privacidad.html) y las [condiciones](public/condiciones.html) antes de crear una cuenta. El progreso se guarda en la base de datos de la instalación.

Para administración, sigue la guía de [ADMINISTRACION.md](ADMINISTRACION.md). Para más detalles sobre materiales, pruebas y límites, consulta el [README](README.md).