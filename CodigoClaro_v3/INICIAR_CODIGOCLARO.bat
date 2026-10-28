REM CódigoClaro: inicia el servidor local en Windows.
@echo off
setlocal
cd /d "%~dp0"
echo ================================================
echo   CODIGOCLARO - INICIO LOCAL
echo ================================================
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Necesitas instalar Node.js 22.5 o superior.
  echo Descarga Node.js LTS desde https://nodejs.org/
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
  echo Define SESSION_SECRET antes de continuar.
  notepad .env
)
findstr /B /C:"SESSION_SECRET=CAMBIA_ESTO_POR_UN_SECRETO_LARGO_Y_ALEATORIO" .env >nul
if not errorlevel 1 (
  echo ERROR: Cambia SESSION_SECRET por un valor aleatorio largo.
  pause
  exit /b 1
)
echo.
echo Abre http://localhost:3000 en este ordenador.
echo Para detener el servidor, pulsa Ctrl+C en esta ventana.
echo.
node server.js
pause
