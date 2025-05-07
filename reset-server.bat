@echo off
echo ===================================
echo Reiniciando servicios
echo ===================================

:: Matar proceso en puerto 3001
echo Liberando puerto 3001...
npx kill-port 3001

:: Detener Redis si está corriendo
echo Deteniendo Redis...
taskkill /F /IM redis-server.exe 2>nul

:: Esperar un momento
timeout /t 2 /nobreak > nul

:: Iniciar Redis
echo Iniciando Redis...
start /B redis-server.exe redis.conf

:: Esperar a que Redis inicie
timeout /t 3 /nobreak > nul

echo ===================================
echo Servicios reiniciados
echo ===================================
echo.
echo Para iniciar el servidor, ejecute:
echo npm run dev
echo. 