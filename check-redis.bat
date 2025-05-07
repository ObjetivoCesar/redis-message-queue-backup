@echo off
echo ===================================
echo Verificando instalación de Redis
echo ===================================

:: Verificar si Redis está instalado
where redis-server.exe >nul 2>nul
if %errorlevel% equ 0 (
    echo Redis está instalado en:
    where redis-server.exe
) else (
    echo Redis NO está instalado en el sistema
    goto :end
)

:: Verificar si Redis está corriendo
netstat -an | find "6379" >nul
if %errorlevel% equ 0 (
    echo Redis está corriendo en el puerto 6379
) else (
    echo Redis NO está corriendo
)

:end
echo.
echo ===================================
pause 