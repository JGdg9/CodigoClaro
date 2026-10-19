@echo off
setlocal
cd /d "%~dp0"
echo ================================================
echo   CODIGOCLARO - PILOTO DE USUARIOS
echo ================================================
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Necesitas instalar Node.js 22.5 o superior.
  echo Descarga la version LTS desde https://nodejs.org/
  pause
  exit /b 1
)
node -e "const {DatabaseSync}=require('node:sqlite'); if(!DatabaseSync)process.exit(1)" >nul 2>nul
if errorlevel 1 (
  echo ERROR: Tu version de Node no incluye node:sqlite.
  echo Instala Node.js LTS 22.5 o superior y vuelve a intentarlo.
  pause
  exit /b 1
)
if not exist .env (
  copy .env.example .env >nul
  echo Se ha creado .env a partir de .env.example.
  echo Configura ADMIN_EMAIL y SESSION_SECRET antes de continuar.
  notepad .env
)
findstr /B /C:"ADMIN_EMAIL=tu-correo-de-administracion@example.com" .env >nul
if not errorlevel 1 (
  echo ERROR: Edita .env y sustituye ADMIN_EMAIL por tu propio correo.
  echo La primera cuenta con ese correo recibira permisos de administracion.
  pause
  exit /b 1
)
findstr /B /C:"SESSION_SECRET=CAMBIA_ESTO_POR_UN_SECRETO_LARGO_Y_ALEATORIO" .env >nul
if not errorlevel 1 (
  echo ERROR: Edita .env y cambia SESSION_SECRET por un secreto aleatorio largo.
  pause
  exit /b 1
)
echo.
echo No requiere npm install. El servidor guardara los datos en data\codigoclaro.sqlite.
echo Abre http://localhost:3000 en este ordenador.
echo Para otros dispositivos de la misma red, sigue PRUEBA_USUARIOS.md.
echo Para detener el servidor, pulsa Ctrl+C en esta ventana.
echo.
node server.js
pause
