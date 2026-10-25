@echo off
title ORION — Servidor WebSocket (POS Mode)
color 0B
cls
echo.
echo  ==========================================
echo    ORION SERVIDOR — Para uso con Chrome POS
echo  ==========================================
echo.
echo  Este modo conecta Orion con el Sistema POS
echo  en Google Chrome via WebSocket local.
echo.
echo  Mantén esta ventana ABIERTA mientras uses
echo  el Sistema POS con Orion activado.
echo.

cd /d "%~dp0"

python -c "import google.genai, speech_recognition, edge_tts, pyautogui, psutil, websockets" >nul 2>&1
if errorlevel 1 (
    echo  Instalando dependencias...
    python -m pip install -r requirements.txt --quiet
)

echo  Iniciando servidor Orion en ws://localhost:8765...
echo  (Ctrl+C para detener)
echo.
python orion_server.py

pause
