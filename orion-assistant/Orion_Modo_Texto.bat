@echo off
title ORION — Modo Texto
color 0B
cd /d "%~dp0"
echo  Iniciando ORION en modo TEXTO (sin microfono)...
echo.
python orion.py --texto
pause
