"""
orion.py — Cerebro principal de ORION.
Asistente de voz con IA para Windows y el Sistema POS Miscelánea María José.

Uso: python orion.py
Activación: Di "Orion" + tu comando.
"""

import asyncio
import threading
import queue
import time
import sys
import os
import re
import json
import tempfile
import subprocess
import datetime

import speech_recognition as sr
import edge_tts
from google import genai
from google.genai import types

from config import GEMINI_API_KEY, WAKE_WORDS, VOICE_NAME, SYSTEM_PROMPT
import system_tools as st
import pos_tools as pt

# ─────────────────────────────────────────────
#  CLIENTE GEMINI
# ─────────────────────────────────────────────
client = genai.Client(api_key=GEMINI_API_KEY)
MODEL = "gemini-3.8-flash"

# Cola de texto para reproducción de audio (evita bloqueos)
tts_queue: queue.Queue = queue.Queue()
listening_event = threading.Event()

# ─────────────────────────────────────────────
#  HERRAMIENTAS DISPONIBLES PARA GEMINI
# ─────────────────────────────────────────────
TOOLS_SCHEMA = [
    {
        "name": "abrir_aplicacion",
        "description": "Abre una aplicación, programa o sitio web en Windows. Úsalo cuando el usuario pida abrir algo.",
        "parameters": {
            "type": "object",
            "properties": {
                "nombre_app": {"type": "string", "description": "Nombre del programa o URL a abrir. Ej: 'chrome', 'spotify', 'sistema pos'"}
            },
            "required": ["nombre_app"]
        }
    },
    {
        "name": "cerrar_aplicacion",
        "description": "Cierra una aplicación en ejecución en Windows.",
        "parameters": {
            "type": "object",
            "properties": {
                "nombre_app": {"type": "string", "description": "Nombre del proceso a cerrar. Ej: 'chrome', 'spotify'"}
            },
            "required": ["nombre_app"]
        }
    },
    {
        "name": "cambiar_volumen",
        "description": "Controla el volumen del sistema: subir, bajar o silenciar.",
        "parameters": {
            "type": "object",
            "properties": {
                "accion": {"type": "string", "description": "Acción: subir, bajar, mutear, desmutear"},
                "nivel": {"type": "integer", "description": "Número de pasos (1-15). Por defecto 5."}
            },
            "required": ["accion"]
        }
    },
    {
        "name": "control_multimedia",
        "description": "Controla la reproducción: play, pausa, siguiente, anterior.",
        "parameters": {
            "type": "object",
            "properties": {
                "accion": {"type": "string", "description": "Acción: play, pausar, siguiente, anterior"}
            },
            "required": ["accion"]
        }
    },
    {
        "name": "tomar_captura",
        "description": "Toma una captura de pantalla y la guarda.",
        "parameters": {"type": "object", "properties": {}}
    },
    {
        "name": "buscar_en_web",
        "description": "Busca algo en Google Chrome.",
        "parameters": {
            "type": "object",
            "properties": {
                "consulta": {"type": "string", "description": "Texto a buscar en Google"}
            },
            "required": ["consulta"]
        }
    },
    {
        "name": "estado_sistema",
        "description": "Informa el uso de CPU, RAM, hora actual y estado de la batería.",
        "parameters": {"type": "object", "properties": {}}
    },
    {
        "name": "bloquear_equipo",
        "description": "Bloquea la sesión de Windows de inmediato.",
        "parameters": {"type": "object", "properties": {}}
    },
    {
        "name": "consultar_ventas_hoy",
        "description": "Consulta las ventas del día de hoy en el sistema POS de la Miscelánea.",
        "parameters": {"type": "object", "properties": {}}
    },
    {
        "name": "consultar_inventario",
        "description": "Busca o resume el inventario de productos en el POS.",
        "parameters": {
            "type": "object",
            "properties": {
                "termino": {"type": "string", "description": "Palabra clave del producto a buscar. Vacío = resumen general."}
            },
            "required": []
        }
    },
    {
        "name": "consultar_seguros",
        "description": "Consulta los seguros escolares registrados en el sistema POS.",
        "parameters": {"type": "object", "properties": {}}
    },
    {
        "name": "consultar_alertas_stock",
        "description": "Verifica productos agotados o con stock crítico en el inventario.",
        "parameters": {"type": "object", "properties": {}}
    }
]

# Mapa de nombre de función → función Python real
TOOL_MAP = {
    "abrir_aplicacion": st.abrir_aplicacion,
    "cerrar_aplicacion": st.cerrar_aplicacion,
    "cambiar_volumen": st.cambiar_volumen,
    "control_multimedia": st.control_multimedia,
    "tomar_captura": st.tomar_captura,
    "buscar_en_web": st.buscar_en_web,
    "estado_sistema": st.estado_sistema,
    "bloquear_equipo": st.bloquear_equipo,
    "consultar_ventas_hoy": pt.consultar_ventas_hoy,
    "consultar_inventario": pt.consultar_inventario,
    "consultar_seguros": pt.consultar_seguros,
    "consultar_alertas_stock": pt.consultar_alertas_stock,
}

# ─────────────────────────────────────────────
#  HISTORIAL DE CONVERSACIÓN
# ─────────────────────────────────────────────
conversation_history = []

# ─────────────────────────────────────────────
#  TTS — SINTETIZADOR DE VOZ (edge-tts)
# ─────────────────────────────────────────────
async def _speak_async(text: str):
    """Convierte texto a audio con edge-tts y lo reproduce."""
    try:
        # Limpiar el texto de emojis y caracteres especiales
        clean = re.sub(r'[^\w\s\.,;:!?\-\'áéíóúñüÁÉÍÓÚÑÜ$%()]', '', text)
        if not clean.strip():
            return
        
        communicate = edge_tts.Communicate(clean, VOICE_NAME)
        
        # Guardar en archivo temporal
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            tmp_path = tmp.name
        
        await communicate.save(tmp_path)
        
        # Reproducir con el reproductor por defecto de Windows
        subprocess.Popen(
            ["powershell", "-c", f"(New-Object Media.SoundPlayer \"{tmp_path}\").PlaySync()"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        ).wait()
        
        # Limpiar temporal
        try:
            os.unlink(tmp_path)
        except Exception:
            pass
    except Exception as e:
        print(f"  [TTS Error] {e}")


def speak(text: str):
    """Habla de forma sincrónica desde cualquier hilo."""
    print(f"\n  🔊 ORION: {text}\n")
    asyncio.run(_speak_async(text))


def tts_worker():
    """Worker en hilo separado que procesa la cola de TTS."""
    while True:
        text = tts_queue.get()
        if text is None:
            break
        asyncio.run(_speak_async(text))
        print(f"\n  🔊 ORION: {text}\n")
        tts_queue.task_done()


# ─────────────────────────────────────────────
#  PROCESAMIENTO CON GEMINI + FUNCTION CALLING
# ─────────────────────────────────────────────
def process_with_gemini(user_text: str) -> str:
    """Envía el texto a Gemini con function calling y devuelve la respuesta final."""
    global conversation_history
    
    # Añadir mensaje del usuario al historial
    conversation_history.append({
        "role": "user",
        "parts": [{"text": user_text}]
    })
    
    # Mantener historial manejable (últimas 10 rondas)
    if len(conversation_history) > 20:
        conversation_history = conversation_history[-18:]
    
    # Construir el prompt completo con historial
    messages_payload = [{"role": "user", "parts": [{"text": SYSTEM_PROMPT}]}]
    messages_payload.extend(conversation_history)
    
    max_iterations = 5  # Evitar loops infinitos de function calling
    iteration = 0
    
    while iteration < max_iterations:
        iteration += 1
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=messages_payload,
                config=types.GenerateContentConfig(
                    tools=[types.Tool(function_declarations=[
                        types.FunctionDeclaration(**tool) for tool in TOOLS_SCHEMA
                    ])],
                    temperature=0.4,
                )
            )
        except Exception as e:
            return f"Error de conexión con Gemini: {str(e)}"
        
        # Procesar la respuesta
        candidate = response.candidates[0] if response.candidates else None
        if not candidate:
            return "No obtuve respuesta del sistema."
        
        content = candidate.content
        parts = content.parts if content else []
        
        # Verificar si hay function calls
        function_calls = [p for p in parts if hasattr(p, 'function_call') and p.function_call]
        text_parts = [p.text for p in parts if hasattr(p, 'text') and p.text]
        
        if function_calls:
            # Ejecutar todas las function calls
            tool_results = []
            for part in function_calls:
                fc = part.function_call
                fn_name = fc.name
                fn_args = dict(fc.args) if fc.args else {}
                
                print(f"  ⚡ Ejecutando: {fn_name}({fn_args})")
                
                fn = TOOL_MAP.get(fn_name)
                if fn:
                    try:
                        result = fn(**fn_args)
                    except Exception as e:
                        result = f"Error ejecutando {fn_name}: {str(e)}"
                else:
                    result = f"Herramienta '{fn_name}' no disponible."
                
                tool_results.append({
                    "function_response": {
                        "name": fn_name,
                        "response": {"result": result}
                    }
                })
                print(f"  ✅ Resultado: {result}")
            
            # Añadir la respuesta del modelo y los resultados al payload
            messages_payload.append({"role": "model", "parts": [{"text": t} for t in text_parts] + [{"function_call": {"name": fc.function_call.name, "args": dict(fc.function_call.args)}} for fc in function_calls]})
            messages_payload.append({"role": "user", "parts": tool_results})
            continue  # Siguiente iteración para que Gemini formule respuesta final
        
        # No hay más function calls — es la respuesta final
        final_text = " ".join(text_parts).strip()
        if not final_text:
            final_text = "Listo."
        
        # Guardar la respuesta del modelo en el historial
        conversation_history.append({
            "role": "model",
            "parts": [{"text": final_text}]
        })
        
        return final_text
    
    return "He completado las acciones solicitadas."


# ─────────────────────────────────────────────
#  RECONOCIMIENTO DE VOZ
# ─────────────────────────────────────────────
def contains_wake_word(text: str) -> bool:
    """Verifica si el texto contiene la palabra de activación."""
    text_lower = text.lower().strip()
    for w in WAKE_WORDS:
        if w in text_lower:
            return True
    return False


def extract_command(text: str) -> str:
    """Extrae el comando quitando la palabra de activación."""
    text_lower = text.lower()
    for w in sorted(WAKE_WORDS, key=len, reverse=True):
        if w in text_lower:
            idx = text_lower.find(w) + len(w)
            cmd = text[idx:].strip(" ,.")
            return cmd if cmd else text
    return text


def listen_once(recognizer: sr.Recognizer, microphone: sr.Microphone, timeout: int = 5) -> str | None:
    """Escucha una sola vez y retorna el texto reconocido, o None."""
    try:
        listening_event.set()
        with microphone as source:
            audio = recognizer.listen(source, timeout=timeout, phrase_time_limit=12)
        listening_event.clear()
        text = recognizer.recognize_google(audio, language="es-CO")
        return text
    except sr.WaitTimeoutError:
        return None
    except sr.UnknownValueError:
        return None
    except sr.RequestError as e:
        print(f"  [SR Error] {e}")
        return None
    except Exception:
        return None


# ─────────────────────────────────────────────
#  MODO TEXTO (fallback)
# ─────────────────────────────────────────────
def text_mode():
    """Modo de solo texto cuando no hay micrófono disponible."""
    print("\n" + "═"*60)
    print("  🌌  ORION — Modo Texto (sin micrófono)")
    print("  Escribe tu comando. Escribe 'salir' para cerrar.")
    print("═"*60 + "\n")
    
    while True:
        try:
            user_input = input("  Tú: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\n  🌌 ORION desconectado. Hasta pronto.")
            break
        
        if not user_input:
            continue
        if user_input.lower() in ["salir", "exit", "quit", "apagar"]:
            speak("Sistemas desconectados. Hasta pronto.")
            break
        
        # En modo texto no requiere wake word
        cmd = extract_command(user_input) if contains_wake_word(user_input) else user_input
        response = process_with_gemini(cmd)
        speak(response)


# ─────────────────────────────────────────────
#  BUCLE PRINCIPAL DE VOZ
# ─────────────────────────────────────────────
def voice_loop():
    """Bucle principal de escucha de voz."""
    recognizer = sr.Recognizer()
    recognizer.dynamic_energy_threshold = True
    recognizer.energy_threshold = 300
    recognizer.pause_threshold = 0.8
    
    try:
        microphone = sr.Microphone()
    except OSError:
        print("  ⚠️  No se detectó micrófono. Cambiando a modo texto.")
        text_mode()
        return
    
    # Calibrar con ruido ambiental
    print("  🎙️  Calibrando micrófono...")
    with microphone as source:
        recognizer.adjust_for_ambient_noise(source, duration=1.5)
    print("  ✅ Micrófono listo.\n")
    
    print("  💬 Di \"Orion\" seguido de tu comando para activarme.\n")
    speak("Sistemas en línea. Di Orion para activarme.")
    
    active_mode = False       # True = ya se activó, esperando comando
    active_timeout = 0        # Timestamp límite para modo activo
    ACTIVE_DURATION = 8       # segundos de modo activo después de wake word
    
    while True:
        try:
            # Escucha rápida en modo pasivo (buscando wake word)
            if not active_mode:
                text = listen_once(recognizer, microphone, timeout=4)
            else:
                # En modo activo, esperar más tiempo para el comando
                elapsed = time.time() - active_timeout + ACTIVE_DURATION
                remaining = max(1, ACTIVE_DURATION - (time.time() - active_timeout))
                text = listen_once(recognizer, microphone, timeout=int(remaining))
                if time.time() > active_timeout:
                    active_mode = False
            
            if not text:
                continue
            
            print(f"  👂 Escuchado: {text}")
            
            has_wake = contains_wake_word(text)
            
            if not active_mode and not has_wake:
                continue  # Ignorar sin wake word
            
            # Determinar el comando
            if has_wake:
                cmd = extract_command(text)
                active_mode = True
                active_timeout = time.time()
            else:
                # En modo activo, el texto completo es el comando
                cmd = text
                active_timeout = time.time()  # Resetear timeout
            
            if not cmd:
                speak("¿En qué puedo ayudarle?")
                continue
            
            # Comandos de apagado
            if any(w in cmd.lower() for w in ["apagar", "desconectar", "cerrar orion", "hasta luego", "adiós"]):
                speak("Hasta pronto. Sistemas desconectados.")
                break
            
            # Procesar con Gemini
            print(f"  🧠 Procesando: {cmd}")
            response = process_with_gemini(cmd)
            speak(response)
            
            # Mantener modo activo un poco más
            active_timeout = time.time()
            
        except KeyboardInterrupt:
            print("\n  🌌 Interrumpido por el usuario.")
            speak("Orion desconectado. Hasta pronto.")
            break
        except Exception as e:
            print(f"  [Loop Error] {e}")
            time.sleep(0.5)


# ─────────────────────────────────────────────
#  PUNTO DE ENTRADA
# ─────────────────────────────────────────────
def print_banner():
    banner = """
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║    ██████  ██████  ██  ██████  ███    ██                     ║
║   ██    ██ ██   ██ ██ ██    ██ ████   ██                     ║
║   ██    ██ ██████  ██ ██    ██ ██ ██  ██                     ║
║   ██    ██ ██   ██ ██ ██    ██ ██  ██ ██                     ║
║    ██████  ██   ██ ██  ██████  ██   ████                     ║
║                                                              ║
║         Asistente de Inteligencia Artificial                 ║
║         Sistema POS — Miscelánea María José                  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    """
    print(banner)


def main():
    print_banner()
    print(f"  📅 {datetime.datetime.now().strftime('%A, %d de %B de %Y — %I:%M %p')}")
    print(f"  🤖 Modelo: Gemini 3.8 Flash")
    print(f"  🎙️  Voz: {VOICE_NAME}")
    print(f"  🔑 API conectada: {'✅' if GEMINI_API_KEY else '❌'}\n")
    
    # Iniciar TTS worker en hilo separado (para no bloquear)
    tts_thread = threading.Thread(target=tts_worker, daemon=True)
    tts_thread.start()
    
    # Verificar si hay argumento --texto para modo texto
    if "--texto" in sys.argv or "--text" in sys.argv:
        text_mode()
    else:
        voice_loop()
    
    # Señal de cierre al worker de TTS
    tts_queue.put(None)


if __name__ == "__main__":
    main()
