import os
import subprocess
import webbrowser
import psutil
import datetime
import pyautogui
import time
import re
from pathlib import Path

# ─── Mapa extendido de aplicaciones de Windows ─────────────────────────────
APP_MAP = {
    # Navegadores
    "chrome": "chrome",
    "google chrome": "chrome",
    "edge": "msedge",
    "firefox": "firefox",
    "navegador": "chrome",
    # Productividad Office
    "word": "winword",
    "microsoft word": "winword",
    "excel": "excel",
    "microsoft excel": "excel",
    "powerpoint": "powerpnt",
    "power point": "powerpnt",
    "outlook": "outlook",
    "onenote": "onenote",
    # Sistema Windows
    "calculadora": "calc",
    "calc": "calc",
    "bloc de notas": "notepad",
    "notepad": "notepad",
    "notas": "notepad",
    "explorador": "explorer",
    "archivos": "explorer",
    "explorador de archivos": "explorer",
    "paint": "mspaint",
    "terminal": "wt",
    "cmd": "cmd",
    "powershell": "powershell",
    "configuracion": "ms-settings:",
    "configuración": "ms-settings:",
    "panel de control": "control",
    "administrador de tareas": "taskmgr",
    "task manager": "taskmgr",
    # Comunicación
    "whatsapp": "whatsapp",
    "teams": "teams",
    "zoom": "zoom",
    "discord": "discord",
    "telegram": "telegram",
    # Música
    "spotify": "spotify",
    "musica": "spotify",
    "música": "spotify",
    # Utilidades
    "vlc": "vlc",
    "7zip": "7zfm",
    # POS
    "sistema pos": "https://sistema-pos-miselanea.web.app",
    "pos": "https://sistema-pos-miselanea.web.app",
}


def _launch_app(cmd: str) -> bool:
    """Lanza una aplicación en Windows de forma robusta."""
    try:
        if cmd.startswith("http"):
            webbrowser.open(cmd)
            return True
        elif cmd.startswith("ms-settings"):
            os.system(f"start {cmd}")
            return True
        else:
            if os.path.exists(cmd) or (" " in cmd and "\\" in cmd):
                os.system(f'start "" "{cmd}"')
            else:
                os.system(f'start {cmd}')
            return True
    except Exception:
        return False


def reproducir_musica(plataforma: str = "spotify", busqueda: str = "") -> str:
    """Reproduce música en Spotify o YouTube directamente."""
    import urllib.request
    import urllib.parse

    plat = plataforma.lower().strip()
    query = busqueda.strip()

    if "youtube" in plat or "youtube" in query.lower():
        q = re.sub(r'\b(youtube|reproduce|reproducir|pon|poner|musica|música|cancion|canción)\b', '', query, flags=re.IGNORECASE).strip()
        q = q or "música"
        # Obtener el primer video directamente de YouTube para reproducirlo de inmediato
        try:
            search_url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(q)}"
            req = urllib.request.Request(search_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                html = resp.read().decode('utf-8', errors='ignore')
            video_ids = re.findall(r"watch\?v=([a-zA-Z0-9_-]{11})", html)
            if video_ids:
                direct_url = f"https://www.youtube.com/watch?v={video_ids[0]}"
                webbrowser.open(direct_url)
                return f"Listo, reproduciendo {q} en YouTube."
        except Exception:
            pass

        # Fallback si no encuentra el ID directo
        url = f"https://www.youtube.com/results?search_query={q.replace(' ', '+')}"
        webbrowser.open(url)
        return f"Abriendo {q} en YouTube."

    # Spotify
    try:
        if query:
            uri = f"spotify:search:{query.replace(' ', '%20')}"
            os.system(f"start {uri}")
        else:
            os.system("start spotify:")
        time.sleep(1.5)
        pyautogui.press("playpause")
        return f"Listo, ya te puse {query or 'Spotify'}."
    except Exception:
        url = f"https://open.spotify.com/search/{query.replace(' ', '%20')}" if query else "https://open.spotify.com"
        webbrowser.open(url)
        return f"Abrí Spotify con {query or 'tu música'}."


def abrir_aplicacion(nombre_app: str) -> str:
    """Abre un programa, aplicación o URL en Windows."""
    app_clean = nombre_app.lower().strip()

    # Manejar spotify directamente
    if any(k in app_clean for k in ["spotify", "musica", "música"]):
        return reproducir_musica("spotify", "")

    # URL directa
    if app_clean.startswith("http://") or app_clean.startswith("https://"):
        webbrowser.open(app_clean)
        return f"Abriendo {app_clean}."

    # Buscar en mapa
    cmd = APP_MAP.get(app_clean)

    # Si no está en el mapa, buscar parcialmente
    if not cmd:
        for key, val in APP_MAP.items():
            if key in app_clean or app_clean in key:
                cmd = val
                break

    # Si aún no, usar el nombre directo
    if not cmd:
        cmd = app_clean.replace("el ", "").replace("la ", "").strip()

    if _launch_app(cmd):
        return f"Listo, abriendo {nombre_app}."
    return f"No pude abrir {nombre_app}. Verifica que esté instalado."


def cerrar_aplicacion(nombre_app: str) -> str:
    """Cierra un proceso o aplicación en ejecución."""
    app_clean = nombre_app.lower().strip().replace(".exe", "")
    # Mapear nombres comunes a nombres de proceso
    process_map = {
        "word": "winword", "excel": "excel", "chrome": "chrome",
        "spotify": "spotify", "notepad": "notepad", "calc": "calculator",
        "calculadora": "calculator", "edge": "msedge", "firefox": "firefox",
        "whatsapp": "whatsapp", "discord": "discord",
    }
    target = process_map.get(app_clean, app_clean)
    closed = False
    try:
        for proc in psutil.process_iter(['pid', 'name']):
            p_name = (proc.info['name'] or '').lower().replace(".exe", "")
            if target in p_name or p_name in target:
                proc.terminate()
                closed = True
        return f"Listo, cerré {nombre_app}." if closed else f"No encontré {nombre_app} abierto."
    except Exception:
        return f"No pude cerrar {nombre_app}."


def cambiar_volumen(accion: str, nivel: int = None) -> str:
    """Controla el volumen del sistema."""
    accion_clean = accion.lower().strip()
    pasos = max(1, min(20, nivel or 8))

    if accion_clean in ["subir", "aumentar", "arriba"]:
        for _ in range(pasos):
            pyautogui.press("volumeup")
        return "Volumen subido."
    elif accion_clean in ["bajar", "disminuir", "abajo"]:
        for _ in range(pasos):
            pyautogui.press("volumedown")
        return "Volumen bajado."
    elif accion_clean in ["mutear", "silenciar", "silencio", "mute"]:
        pyautogui.press("volumemute")
        return "Audio silenciado."
    elif accion_clean in ["desmutear", "activar", "unmute"]:
        pyautogui.press("volumemute")
        return "Audio activado."
    return "Comando de volumen no reconocido."


def control_multimedia(accion: str) -> str:
    """Controla reproducción: play/pausa, siguiente, anterior."""
    act = accion.lower().strip()
    if act in ["play", "pausa", "pausar", "reproducir", "reanudar"]:
        pyautogui.press("playpause")
        return "Reproducción alternada."
    elif act in ["siguiente", "next", "adelantar"]:
        pyautogui.press("nexttrack")
        return "Siguiente pista."
    elif act in ["anterior", "prev", "atrás", "atras"]:
        pyautogui.press("prevtrack")
        return "Pista anterior."
    return "Acción multimedia no reconocida."


def tomar_captura() -> str:
    """Toma una captura de pantalla y la guarda."""
    try:
        pictures_dir = Path.home() / "Pictures" / "Orion_Capturas"
        pictures_dir.mkdir(parents=True, exist_ok=True)
        filename = f"Captura_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        filepath = pictures_dir / filename
        screenshot = pyautogui.screenshot()
        screenshot.save(filepath)
        return f"Captura guardada como {filename}."
    except Exception as e:
        return f"Error al tomar captura: {str(e)}"


def buscar_en_web(consulta: str) -> str:
    """Realiza una búsqueda en Google."""
    url = f"https://www.google.com/search?q={consulta.replace(' ', '+')}"
    webbrowser.open(url)
    return f"Buscando en Google: {consulta}."


def estado_sistema() -> str:
    """Informa CPU, RAM, hora y batería."""
    cpu = psutil.cpu_percent(interval=0.5)
    ram = psutil.virtual_memory().percent
    now = datetime.datetime.now().strftime("%I:%M %p, %d de %B de %Y")
    battery = psutil.sensors_battery()
    bat_info = ""
    if battery:
        bat_info = f" Batería al {round(battery.percent)}%{' cargando' if battery.power_plugged else ''}."
    return f"Son las {now}. CPU al {cpu}%, RAM al {ram}%.{bat_info}"


def bloquear_equipo() -> str:
    """Bloquea la sesión de Windows."""
    os.system("rundll32.exe user32.dll,LockWorkStation")
    return "Equipo bloqueado."


def buscar_clima_ciudad(ciudad: str = "Bucaramanga") -> str:
    """Obtiene el clima de una ciudad usando wttr.in (sin API key)."""
    import urllib.request
    import json
    ciudad_clean = ciudad.strip().replace(" ", "+")
    try:
        url = f"https://wttr.in/{ciudad_clean}?format=j1"
        req = urllib.request.Request(url, headers={"User-Agent": "curl/7.68.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read())
        current = data["current_condition"][0]
        temp_c = current["temp_C"]
        desc = current["weatherDesc"][0]["value"]
        feels = current["FeelsLikeC"]
        # Traducir descripción
        desc_map = {
            "sunny": "soleado", "clear": "despejado", "partly cloudy": "parcialmente nublado",
            "cloudy": "nublado", "overcast": "muy nublado", "mist": "con neblina", "fog": "con niebla",
            "light rain": "con lluvia ligera", "heavy rain": "con lluvia fuerte", "moderate rain": "con lluvia moderada",
            "thundery outbreaks": "con tormentas", "thundery outbreaks in nearby": "con tormentas cercanas",
            "patchy rain": "con lluvia dispersa", "patchy rain nearby": "con probabilidad de lluvia dispersa",
            "patchy light drizzle": "con llovizna ligera", "light drizzle": "con llovizna ligera",
            "patchy light rain": "con lluvia ligera dispersa",
        }
        desc_es = desc_map.get(desc.lower(), desc)
        return f"En {ciudad} hay {temp_c}°C, {desc_es}. Sensación térmica de {feels}°C."
    except Exception:
        return f"No pude obtener el clima de {ciudad} en este momento."
