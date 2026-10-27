REM CódigoClaro: Acceso rápido de Windows para iniciar la aplicación local desde la carpeta de recursos.
@echo off
setlocal
cd /d "%~dp0"
start "" "%~dp0index.html"
echo.
echo CodigoClaro se ha abierto en el navegador.
echo Si no se abre, haz doble clic en index.html.
echo Para revisar archivos, ejecuta: python verificar_entrega.py
pause
