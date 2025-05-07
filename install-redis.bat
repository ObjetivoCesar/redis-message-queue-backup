@echo off
echo ===================================
echo Instalador de Redis para Windows
echo ===================================

:: Verificar si Redis ya está instalado
where redis-server.exe >nul 2>nul
if %errorlevel% equ 0 (
    echo Redis ya está instalado en el sistema.
    echo Ubicación: 
    where redis-server.exe
    goto :end
)

:: Crear directorio temporal
echo Creando directorio temporal...
if not exist temp mkdir temp
cd temp

:: Descargar Redis
echo Descargando Redis...
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/microsoftarchive/redis/releases/download/win-3.0.504/Redis-x64-3.0.504.msi' -OutFile 'Redis-x64-3.0.504.msi'}"

if not exist Redis-x64-3.0.504.msi (
    echo Error: No se pudo descargar Redis.
    cd ..
    rmdir /s /q temp
    exit /b 1
)

:: Instalar Redis
echo Instalando Redis...
echo Por favor, espera mientras se instala Redis...
msiexec /i Redis-x64-3.0.504.msi /qn

:: Esperar a que la instalación termine
echo Esperando a que la instalación termine...
timeout /t 30

:: Verificar la instalación
echo Verificando la instalación...
where redis-server.exe >nul 2>nul
if %errorlevel% equ 0 (
    echo Redis se ha instalado correctamente.
    echo Ubicación: 
    where redis-server.exe
) else (
    echo Error: Redis no se instaló correctamente.
    cd ..
    rmdir /s /q temp
    exit /b 1
)

:: Limpiar
cd ..
rmdir /s /q temp

:end
echo.
echo ===================================
echo Instalación completada
echo ===================================
echo.
echo Para iniciar Redis, ejecuta start-redis.bat
echo.
pause 