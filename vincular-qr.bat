@echo off
title Kyoto WhatsApp Bot - Vinculacion QR
cd /d "%~dp0"
echo ==============================================
echo   VINCULACION DE KYOTO BOT CON WHATSAPP
echo ==============================================
echo 1. Deteniendo PM2 para vincular en primer plano...
call pm2 stop Kyoto >nul 2>&1
echo 2. Generando codigo QR...
echo.
echo Escanea el codigo QR desde tu WhatsApp:
echo (Ajustes / Tres puntos -> Dispositivos vinculados -> Vincular dispositivo)
echo.
echo Una vez que veas "¡Conexion establecida con exito!", puedes cerrar esta
echo ventana y ejecutar "iniciar-bot-pm2.bat" para dejarlo en segundo plano.
echo ==============================================
call npm start
pause
