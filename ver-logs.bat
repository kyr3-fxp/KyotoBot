@echo off
title Kyoto WhatsApp Bot - Logs
cd /d "%~dp0"
call pm2 logs Kyoto
pause
