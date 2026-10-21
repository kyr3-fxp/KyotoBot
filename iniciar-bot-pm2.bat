@echo off
title Kyoto WhatsApp Bot - PM2 Runner
cd /d "%~dp0"
echo ==============================================
echo  Iniciando Kyoto WhatsApp Bot con PM2...
echo ==============================================
call pm2 start ecosystem.config.cjs
call pm2 save
echo.
echo ==============================================
echo  Estado actual del proceso:
echo ==============================================
call pm2 status
echo.
echo Abriendo registros en tiempo real (Presiona Ctrl+C para salir de la vista sin detener el bot)...
call pm2 logs Kyoto
