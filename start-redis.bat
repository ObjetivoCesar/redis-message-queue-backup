@echo off
echo ===================================
echo Iniciando Redis Server
echo ===================================

:: Verificar si Redis está instalado
where redis-server.exe >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Redis no está instalado.
    echo Por favor, ejecuta install-redis.bat primero.
    pause
    exit /b 1
)

:: Verificar si Redis ya está corriendo
netstat -an | find "6379" >nul
if %errorlevel% equ 0 (
    echo Redis ya está corriendo en el puerto 6379.
    goto :end
)

:: Verificar si existe el archivo de configuración
if not exist redis.conf (
    echo Error: No se encuentra el archivo redis.conf
    echo Creando archivo de configuración...
    (
        echo port 6379
        echo bind 127.0.0.1
        echo maxmemory 256mb
        echo maxmemory-policy allkeys-lru
        echo appendonly yes
        echo appendfilename "appendonly.aof"
        echo dir ./
    ) > redis.conf
)

:: Iniciar Redis
echo Iniciando Redis Server...
start /B redis-server.exe redis.conf

:: Esperar a que Redis inicie
timeout /t 5

:: Verificar si Redis está corriendo
netstat -an | find "6379" >nul
if %errorlevel% equ 0 (
    echo Redis se ha iniciado correctamente.
) else (
    echo Error: Redis no se pudo iniciar.
    pause
    exit /b 1
)

:end
echo.
echo ===================================
echo Estado de Redis
echo ===================================
echo.
echo Para verificar que Redis está funcionando, ejecuta:
echo redis-cli ping
echo.
echo Deberías recibir "PONG" como respuesta.
echo.
pause 