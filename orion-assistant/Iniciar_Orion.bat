@echo off
title ORION — Asistente IA
color 0B
cls
echo.
echo  ==========================================
echo    ORION — Iniciando sistemas...
echo  ==========================================
echo.

cd /d "%~dp0"

REM Verificar si Python esta instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Python no encontrado. Instala Python 3.10 o superior.
    pause
    exit /b 1
)

REM Verificar dependencias
python -c "import google.genai, speech_recognition, edge_tts, pyautogui, psutil" >nul 2>&1
if errorlevel 1 (
    echo  Instalando dependencias de ORION...
    python -m pip install -r requirements.txt --quiet
)

echo  Iniciando ORION en modo VOZ...
echo  (Di "Orion" seguido de tu comando)
echo.
python orion.py %*

echo.
echo  ORION desconectado.
pause
