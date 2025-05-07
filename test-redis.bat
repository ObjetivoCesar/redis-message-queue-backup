@echo off
echo Probando Redis...
echo.

:: Intentar ejecutar redis-cli
redis-cli ping

echo.
echo Si ves "PONG" arriba, Redis está funcionando.
echo Si ves un error, Redis no está instalado o no está en el PATH.
echo.
pause 