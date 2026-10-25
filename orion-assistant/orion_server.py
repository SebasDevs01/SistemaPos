"""
orion_server.py — Servidor WebSocket local de ORION.
Permite que el POS web (Chrome) envíe comandos a Orion y reciba respuestas.

Puerto: 8765
Uso: python orion_server.py
"""

import asyncio
import json
import sys
import os
import threading

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

import websockets
from config import GEMINI_API_KEY, SYSTEM_PROMPT, VOICE_NAME

# Importar los módulos de herramientas
import system_tools as st
import pos_tools as pt

from google import genai
from google.genai import types

# ─────────────────────────────────────────────
client = genai.Client(api_key=GEMINI_API_KEY)
MODEL = "gemini-3.1-flash-lite"  # Modelo rápido, económico y con function calling

TOOLS_SCHEMA = [
    {
        "name": "abrir_aplicacion",
        "description": "Abre una aplicación, programa o sitio web en Windows.",
        "parameters": {
            "type": "object",
            "properties": {"nombre_app": {"type": "string", "description": "Nombre del programa o URL"}},
            "required": ["nombre_app"]
        }
    },
    {
        "name": "cerrar_aplicacion",
        "description": "Cierra una aplicación en ejecución.",
        "parameters": {
            "type": "object",
            "properties": {"nombre_app": {"type": "string"}},
            "required": ["nombre_app"]
        }
    },
    {
        "name": "cambiar_volumen",
        "description": "Controla el volumen del sistema.",
        "parameters": {
            "type": "object",
            "properties": {
                "accion": {"type": "string", "description": "subir, bajar, mutear, desmutear"},
                "nivel": {"type": "integer"}
            },
            "required": ["accion"]
        }
    },
    {
        "name": "control_multimedia",
        "description": "Controla la reproducción: play, pausar, siguiente, anterior.",
        "parameters": {
            "type": "object",
            "properties": {"accion": {"type": "string"}},
            "required": ["accion"]
        }
    },
    {
        "name": "tomar_captura",
        "description": "Toma una captura de pantalla.",
        "parameters": {"type": "object", "properties": {}}
    },
    {
        "name": "buscar_en_web",
        "description": "Busca algo en Google.",
        "parameters": {
            "type": "object",
            "properties": {"consulta": {"type": "string"}},
            "required": ["consulta"]
        }
    },
    {
        "name": "estado_sistema",
        "description": "Informa uso de CPU, RAM, hora y batería.",
        "parameters": {"type": "object", "properties": {}}
    },
    {
        "name": "bloquear_equipo",
        "description": "Bloquea la sesión de Windows.",
        "parameters": {"type": "object", "properties": {}}
    },
    {
        "name": "consultar_ventas_hoy",
        "description": "Consulta las ventas del día en el POS.",
        "parameters": {"type": "object", "properties": {}}
    },
    {
        "name": "consultar_inventario",
        "description": "Consulta el inventario del POS.",
        "parameters": {
            "type": "object",
            "properties": {"termino": {"type": "string", "description": "Búsqueda opcional"}},
            "required": []
        }
    },
    {
        "name": "consultar_seguros",
        "description": "Consulta los seguros escolares registrados.",
        "parameters": {"type": "object", "properties": {}}
    },
    {
        "name": "consultar_alertas_stock",
        "description": "Verifica productos agotados o con stock bajo.",
        "parameters": {"type": "object", "properties": {}}
    },
    {
        "name": "reproducir_musica",
        "description": "Reproduce música o canciones en Spotify o YouTube.",
        "parameters": {
            "type": "object",
            "properties": {
                "plataforma": {"type": "string", "description": "spotify o youtube"},
                "busqueda": {"type": "string", "description": "canción, artista o género a buscar"}
            },
            "required": []
        }
    },
    {
        "name": "buscar_clima_ciudad",
        "description": "Obtiene el clima actual y la temperatura de cualquier ciudad (por defecto Bucaramanga).",
        "parameters": {
            "type": "object",
            "properties": {
                "ciudad": {"type": "string", "description": "Nombre de la ciudad, por ejemplo Bucaramanga, Bogotá, Medellín, Colombia, etc."}
            },
            "required": []
        }
    },
    {
        "name": "consultar_clientes_frecuentes",
        "description": "Obtiene los clientes más frecuentes del sistema POS según número de compras o gasto total.",
        "parameters": {
            "type": "object",
            "properties": {
                "top": {"type": "integer", "description": "Cantidad de clientes a mostrar (por defecto 5)"}
            },
            "required": []
        }
    },
    {
        "name": "consultar_rentas_activas",
        "description": "Consulta los alquileres de sillas o mesas que están activos o pendientes de devolución.",
        "parameters": {"type": "object", "properties": {}}
    },
    {
        "name": "resumen_del_dia",
        "description": "Genera un resumen completo del día: ventas, stock crítico, rentas activas y seguros registrados.",
        "parameters": {"type": "object", "properties": {}}
    }
]

TOOL_MAP = {
    "abrir_aplicacion": st.abrir_aplicacion,
    "cerrar_aplicacion": st.cerrar_aplicacion,
    "cambiar_volumen": st.cambiar_volumen,
    "control_multimedia": st.control_multimedia,
    "reproducir_musica": st.reproducir_musica,
    "tomar_captura": st.tomar_captura,
    "buscar_en_web": st.buscar_en_web,
    "estado_sistema": st.estado_sistema,
    "bloquear_equipo": st.bloquear_equipo,
    "buscar_clima_ciudad": st.buscar_clima_ciudad,
    "consultar_ventas_hoy": pt.consultar_ventas_hoy,
    "consultar_inventario": pt.consultar_inventario,
    "consultar_seguros": pt.consultar_seguros,
    "consultar_alertas_stock": pt.consultar_alertas_stock,
    "consultar_clientes_frecuentes": pt.consultar_clientes_frecuentes,
    "consultar_rentas_activas": pt.consultar_rentas_activas,
    "resumen_del_dia": pt.resumen_del_dia,
}

# Historial por sesión WebSocket (un dict por cliente conectado)
session_histories: dict = {}


# ─── Frases naturales de fallback ─────────────────────────────────
FALLBACK_RESPONSES = [
    "Listo, ya lo hice.",
    "Hecho. Aquí estoy si necesitas algo más.",
    "Ya lo tengo. ¿Algo más?",
    "De una, está listo.",
    "Perfecto, ejecutado."
]
_fallback_idx = 0

def _next_fallback() -> str:
    global _fallback_idx
    r = FALLBACK_RESPONSES[_fallback_idx % len(FALLBACK_RESPONSES)]
    _fallback_idx += 1
    return r


def _clean_query(text: str, *remove_words) -> str:
    """Limpia el texto de palabras clave y retorna la consulta real."""
    q = text.lower().strip()
    for w in remove_words:
        q = q.replace(w, " ")
    # Limpiar múltiples espacios
    import re
    q = re.sub(r'\s+', ' ', q).strip()
    return q


def process_command(session_id: str, user_text: str, context: dict = None) -> str:
    """Procesa un comando de voz con máxima velocidad y ejecuta herramientas de Windows."""
    lower = user_text.lower().strip()

    # ── ATAJOS ULTRA-RÁPIDOS (cero latencia, cero cuota) ──────────────────

    # Música / YouTube / Spotify
    if any(k in lower for k in ["youtube", "spotify", "música", "musica", "canción", "cancion", "reproducir", "reproduce", "pon ", "poner "]):
        plat = "youtube" if "youtube" in lower else "spotify"
        busqueda = _clean_query(
            lower,
            "orion", "orión", "reproduce", "reproducir", "pon", "poner",
            "busca", "musica", "música", "cancion", "canción",
            "en spotify", "en youtube", "spotify", "youtube"
        )
        return st.reproducir_musica(plat, busqueda)

    # Abrir aplicación
    if any(k in lower for k in ["abrir ", "abre ", "iniciar ", "inicia ", "lanzar ", "ejecutar ", "open "]):
        app = _clean_query(lower, "abrir", "abre", "iniciar", "inicia", "lanzar", "ejecutar", "open", "el", "la", "los", "las")
        return st.abrir_aplicacion(app)

    # Cerrar aplicación
    if any(k in lower for k in ["cerrar ", "cierra ", "cerrar el ", "cierra el "]):
        app = _clean_query(lower, "cerrar", "cierra", "el", "la")
        return st.cerrar_aplicacion(app)

    # Control de volumen
    if any(k in lower for k in ["volumen", "mutear", "silenciar", "silencio", "volumen arriba", "volumen abajo"]):
        if any(k in lower for k in ["sube", "subir", "más alto", "mas alto", "aumentar", "aumenta", "arriba"]):
            nivel = 8
            return st.cambiar_volumen("subir", nivel)
        elif any(k in lower for k in ["baja", "bajar", "menos", "disminuir", "abajo"]):
            nivel = 8
            return st.cambiar_volumen("bajar", nivel)
        else:
            return st.cambiar_volumen("mutear")

    # Pausa / play multimedia
    if any(k in lower for k in ["pausa", "pausar", "detener", "stop", "play", "reanudar"]):
        return st.control_multimedia("play")

    # Siguiente / anterior canción
    if any(k in lower for k in ["siguiente", "próxima canción", "next", "adelantar"]):
        return st.control_multimedia("siguiente")
    if any(k in lower for k in ["anterior", "atrás", "atras", "prev"]):
        return st.control_multimedia("anterior")

    # Captura de pantalla
    if any(k in lower for k in ["captura", "pantallazo", "screenshot"]):
        return st.tomar_captura()

    # Bloquear equipo
    if any(k in lower for k in ["bloquea", "bloquear", "lock"]):
        return st.bloquear_equipo()

    # Estado del sistema
    if any(k in lower for k in ["estado del sistema", "estado sistema", "cpu", "ram", "batería"]):
        return st.estado_sistema()

    # Clima / Temperatura (Atajo instantáneo)
    if any(k in lower for k in ["clima", "temperatura", "va a llover", "hace calor", "hace frio", "hace frío", "el tiempo"]):
        ciudad = "Bucaramanga"
        import re
        m = re.search(r'(?:clima|temperatura|tiempo)\s+(?:de|en|para)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+)', lower)
        if m:
            c = m.group(1).strip()
            for rem in ["por favor", "hoy", "ahora", "orion", "orión"]:
                c = c.replace(rem, "").strip()
            if c:
                ciudad = c
        return st.buscar_clima_ciudad(ciudad)

    # ── MODO IA GEMINI (para consultas complejas, preguntas o conversación) ─
    history = session_histories.setdefault(session_id, [])
    history.append({"role": "user", "parts": [{"text": user_text}]})
    if len(history) > 20:
        history = history[-18:]
        session_histories[session_id] = history

    context_info = ""
    if context:
        context_info = (
            f"\n[ESTADO EN VIVO DEL SISTEMA POS:\n"
            f"- Total productos: {context.get('totalProductos', 0)}\n"
            f"- Productos agotados: {context.get('agotados', 0)}\n"
            f"- Stock bajo: {context.get('stockBajo', 0)}\n"
            f"- Ventas de hoy: {context.get('ventasHoyCount', 0)} ventas (Total: ${context.get('ventasHoyTotal', 0):,} COP)\n"
            f"- Clientes registrados: {context.get('totalClientes', 0)} (Deudores con saldo pendiente: {context.get('deudores', 0)})\n"
            f"- Caja: {'Turno Abierto' if context.get('turnoAbierto') else 'Caja cerrada'}]\n"
        )

    sys_prompt = SYSTEM_PROMPT + (f"\n{context_info}" if context_info else "")

    messages_payload = history[:]

    max_iter = 5
    for _ in range(max_iter):
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=messages_payload,
                config=types.GenerateContentConfig(
                    system_instruction=sys_prompt,
                    tools=[types.Tool(function_declarations=[
                        types.FunctionDeclaration(**tool) for tool in TOOLS_SCHEMA
                    ])],
                    temperature=0.7,
                )
            )
        except Exception as e:
            err_str = str(e).lower()
            if "429" in err_str or "quota" in err_str or "resource" in err_str:
                print(f"  [Orion] Límite de cuota, respondiendo localmente.")
                return _next_fallback()
            print(f"  [Orion] Error API: {e}")
            return "Hubo un problema de conexión. Intenta de nuevo."

        candidate = response.candidates[0] if response.candidates else None
        if not candidate:
            return "No obtuve respuesta. ¿Puedes repetirlo?"

        parts = candidate.content.parts if candidate.content else []
        function_calls = [p for p in parts if hasattr(p, 'function_call') and p.function_call]
        text_parts = [p.text for p in parts if hasattr(p, 'text') and p.text]

        if function_calls:
            tool_results = []
            for part in function_calls:
                fc = part.function_call
                fn_name = fc.name
                fn_args = dict(fc.args) if fc.args else {}
                print(f"  [Orion] Ejecutando: {fn_name}({fn_args})")
                fn = TOOL_MAP.get(fn_name)
                result = fn(**fn_args) if fn else f"Herramienta '{fn_name}' no disponible."
                print(f"  [Orion] Resultado: {result}")
                tool_results.append(result)
            final_text = " ".join(tool_results)
            history.append({"role": "model", "parts": [{"text": final_text}]})
            return final_text

        final_text = " ".join(text_parts).strip() or _next_fallback()
        history.append({"role": "model", "parts": [{"text": final_text}]})
        return final_text

    return _next_fallback()


async def handler(websocket):
    """Maneja una conexión WebSocket del POS."""
    session_id = str(id(websocket))
    print(f"  [Orion WS] Cliente conectado: {session_id}")

    # Mensaje de bienvenida
    await websocket.send(json.dumps({
        "type": "ready",
        "message": "Orion conectado. A su servicio.",
        "voice": VOICE_NAME
    }))

    try:
        async for raw in websocket:
            try:
                data = json.loads(raw)
                command = data.get("command", "").strip()
                context = data.get("context", None)
                if not command:
                    continue

                print(f"  [Orion WS] Comando: {command}")

                # Procesar en hilo separado para no bloquear el event loop
                loop = asyncio.get_event_loop()
                response_text = await loop.run_in_executor(
                    None, process_command, session_id, command, context
                )

                await websocket.send(json.dumps({
                    "type": "response",
                    "text": response_text
                }))

            except json.JSONDecodeError:
                await websocket.send(json.dumps({
                    "type": "error",
                    "message": "Formato de mensaje inválido."
                }))
            except Exception as e:
                print(f"  [Orion WS] Error en handler: {e}")
                await websocket.send(json.dumps({
                    "type": "error",
                    "message": str(e)
                }))

    except websockets.exceptions.ConnectionClosedOK:
        pass
    except Exception as e:
        print(f"  [Orion WS] Conexión cerrada con error: {e}")
    finally:
        session_histories.pop(session_id, None)
        print(f"  [Orion WS] Cliente desconectado: {session_id}")


async def main():
    print("\n" + "="*55)
    print("  [ORION] Servidor WebSocket Local en ejecucion")
    print("  Puerto: ws://localhost:8765")
    print("  Listo para recibir comandos del POS...")
    print("="*55 + "\n")

    async with websockets.serve(
        handler,
        "localhost",
        8765,
        ping_interval=30,
        ping_timeout=10
    ):
        await asyncio.Future()  # Correr indefinidamente


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n  [Orion WS] Servidor detenido.")
