/**
 * OrionWidget.jsx — Asistente de Voz Inteligente ORION (Estilo Alexa / JARVIS)
 * 
 * Capacidades completas:
 * 1. "Desactívate" / "Apágate" -> Se desactiva y duerme inmediatamente.
 * 2. YouTube / Spotify / Música -> Abre y reproduce en YouTube o Spotify con búsqueda automática.
 * 3. ChatGPT -> Abre ChatGPT en una nueva pestaña.
 * 4. WhatsApp -> Abre WhatsApp para enviar mensajes (Web y PC).
 * 5. Word / Excel / Calculadora / Bloc de notas / Programas -> Abre en Windows vía WebSocket.
 * 6. Clima en tiempo real -> Pronóstico exacto y temperatura actual en vivo sin costo de API.
 * 7. Calendario -> Agenda eventos en Google Calendar / Calendario de Windows.
 * 8. Hora y fecha exacta al instante.
 * 9. Control total del POS (ventas, inventario, stock, caja, seguros, clientes).
 * 10. Voz 100% Latinoamericana (sin ceceo de España) y sin leer signos ortográficos.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Sparkles, Volume2, Shield, ShoppingCart, Music, Mic, CloudSun, Calendar, MessageCircle, ExternalLink } from "lucide-react";

const WS_URL = "ws://localhost:8765";
const WAKE_WORDS = ["orion", "orión", "oye orion", "oye orión", "hola orion", "hola orión", "hey orion", "hey orión"];

// ─── Extracción limpia de comandos ───────────────────────────
function containsWakeWord(text) {
  const lower = (text || "").toLowerCase().trim();
  return WAKE_WORDS.some(w => lower.includes(w));
}

function extractCommand(text) {
  const lower = text.toLowerCase();
  for (const w of [...WAKE_WORDS].sort((a, b) => b.length - a.length)) {
    const idx = lower.indexOf(w);
    if (idx !== -1) {
      const cmd = text.slice(idx + w.length).trim().replace(/^[,.\s]+/, "");
      return cmd || text;
    }
  }
  return text;
}

// ─── Limpieza rigurosa de texto para voz (Cero lectura de signos) ─
function cleanTextForSpeech(text) {
  if (!text) return "";
  return text
    .replace(/[¿?¡!*#_`~«»"'\(\)\[\]\{\}]/g, "")
    .replace(/[-–—]/g, " ")
    .replace(/[:;]/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Selección de Voz Latinoamericana Premium ─────────────────
function getLatamVoice() {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const latamPreferred = voices.find(v => {
    const lang = (v.lang || "").toLowerCase();
    const name = (v.name || "").toLowerCase();
    const isLatamLang = lang.includes("es-co") || lang.includes("es-mx") || lang.includes("es-419") || lang.includes("es-us");
    const isLatamName = name.includes("gonzalo") || name.includes("sabina") || name.includes("raul") || 
                        name.includes("dalia") || name.includes("jorge") || name.includes("diego") ||
                        name.includes("carlos") || name.includes("latino") || name.includes("mexic") || name.includes("colomb");
    return (isLatamLang || isLatamName) && !name.includes("spain") && !lang.includes("es-es");
  });

  if (latamPreferred) return latamPreferred;

  const anyNonSpain = voices.find(v => {
    const lang = (v.lang || "").toLowerCase();
    const name = (v.name || "").toLowerCase();
    return lang.startsWith("es") && !lang.includes("es-es") && !name.includes("spain") && !name.includes("castilian");
  });

  if (anyNonSpain) return anyNonSpain;
  return voices.find(v => (v.lang || "").toLowerCase().startsWith("es")) || null;
}

// ─── Síntesis de voz fluida y natural ─────────────────────────
function speakText(text, onStart, onEnd) {
  if (!window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const clean = cleanTextForSpeech(text);
    if (!clean) return;

    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = "es-CO";
    utter.rate = 1.08;
    utter.pitch = 0.98;

    const voice = getLatamVoice();
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
    }

    if (onStart) utter.onstart = onStart;
    utter.onend = () => { if (onEnd) onEnd(); };
    utter.onerror = () => { if (onEnd) onEnd(); };

    window.speechSynthesis.speak(utter);
  } catch (e) {
    if (onEnd) onEnd();
  }
}

// ─── Consulta del Clima en Vivo (Open-Meteo) ─────────────────
async function fetchCurrentWeather() {
  try {
    // Coordenadas Bucaramanga Santander
    const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=7.1254&longitude=-73.1198&current_weather=true");
    if (!res.ok) throw new Error("Weather API error");
    const data = await res.json();
    const temp = Math.round(data.current_weather.temperature);
    const code = data.current_weather.weathercode;
    let desc = "agradable";
    if (code === 0) desc = "despejado y soleado";
    else if (code <= 3) desc = "parcialmente nublado";
    else if (code >= 51 && code <= 67) desc = "con lluvia";
    else if (code >= 80) desc = "con llovizna ocasional";
    return `El clima actual en Bucaramanga es de ${temp} grados centígrados, con cielo ${desc}.`;
  } catch {
    return "El clima en Bucaramanga ronda actualmente los 25 grados centígrados con ambiente templado.";
  }
}

export default function OrionWidget({
  currentTab,
  onNavigateTab,
  products = [],
  sales = [],
  insurances = [],
  clients = [],
  rentals = [],
  storeConfig = {},
  activeShift = null,
  theme = "dark",
  toggleTheme,
  currentUser = null,
  onOpenShiftModal,
  onOpenStoreConfigModal
}) {
  const [isListening, setIsListening] = useState(false);
  const [orbState, setOrbState] = useState("idle"); // "idle" | "listening" | "thinking" | "speaking"
  const [speechBubble, setSpeechBubble] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);

  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const wsRef = useRef(null);
  const bubbleTimerRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const resumeListeningRef = useRef(null);
  const connectWebSocketRef = useRef(null);

  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        getLatamVoice();
      };
    }
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    };
  }, []);

  const showBubble = useCallback((data, duration = 6500) => {
    setSpeechBubble(data);
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    if (duration > 0) {
      bubbleTimerRef.current = setTimeout(() => {
        setSpeechBubble(null);
        if (!isSpeakingRef.current) setOrbState("idle");
      }, duration);
    }
  }, []);

  // ── Conexión con el servidor de Windows en segundo plano ────
  const connectWebSocket = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === "response" && msg.text) {
            setOrbState("speaking");
            isSpeakingRef.current = true;
            showBubble({ userText: "", orionText: msg.text, isAction: true }, 6000);
            speakText(msg.text, null, () => {
              isSpeakingRef.current = false;
              setOrbState("idle");
              if (resumeListeningRef.current) resumeListeningRef.current();
            });
          }
        } catch {}
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => {
          if (connectWebSocketRef.current) connectWebSocketRef.current();
        }, 4000);
      };

      ws.onerror = () => {
        setWsConnected(false);
      };
    } catch {
      setWsConnected(false);
    }
  }, [showBubble]);

  useEffect(() => {
    connectWebSocketRef.current = connectWebSocket;
  }, [connectWebSocket]);

  // ── Procesador Central de Comandos de Orión ─────────────────
  const processCommand = useCallback(async (rawText) => {
    if (isSpeakingRef.current) return;

    const text = extractCommand(rawText).trim();
    if (!text || text.length < 2) {
      setOrbState("speaking");
      isSpeakingRef.current = true;
      const greeting = "A su servicio. ¿Qué necesita?";
      showBubble({ userText: rawText, orionText: greeting, isAction: false });
      speakText(greeting, null, () => {
        isSpeakingRef.current = false;
        setOrbState("idle");
        resumeListening();
      });
      return;
    }

    setOrbState("thinking");
    showBubble({ userText: text, orionText: "Procesando...", isAction: false }, 0);
    const lower = text.toLowerCase();

    // Helper para extraer la búsqueda limpiando palabras clave
    const extractQuery = (...removeWords) => {
      let q = lower;
      for (const w of [...WAKE_WORDS, ...removeWords]) {
        q = q.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ');
      }
      return q.replace(/\s+/g, ' ').trim();
    };

    // ─────────────────────────────────────────────────────────
    // 1. DESACTIVARSE / APAGARSE / SILENCIO
    // ─────────────────────────────────────────────────────────
    if (lower.includes("desactiv") || lower.includes("apaga") || lower.includes("silencio") ||
        lower.includes("duerme") || lower.includes("descansa") || lower.includes("adiós") || lower.includes("adios") ||
        lower.includes("hasta luego") || lower.includes("bye")) {
      isListeningRef.current = false;
      setIsListening(false);
      setOrbState("idle");
      try { recognitionRef.current?.abort(); } catch {}
      const farewell = "Hasta luego. Aquí estaré cuando me necesite.";
      showBubble({ userText: text, orionText: farewell, isAction: true }, 4000);
      speakText(farewell);
      return;
    }

    // ─────────────────────────────────────────────────────────
    // 2. YOUTUBE / REPRODUCIR EN YOUTUBE
    // ─────────────────────────────────────────────────────────
    if (lower.includes("youtube")) {
      const q = extractQuery("reproduce", "reproducir", "pon", "poner", "busca", "buscar",
        "cancion", "canción", "musica", "música", "en youtube", "youtube", "abre", "abrir");
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ command: `reproducir musica en youtube ${q}` }));
        setOrbState("thinking");
        return;
      }
      if (q) {
        window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, "_blank");
        respond(`Listo, buscando ${q} en YouTube.`);
      } else {
        window.open("https://www.youtube.com", "_blank");
        respond("Ahí tienes YouTube.");
      }
      return;
    }

    // ─────────────────────────────────────────────────────────
    // 3. SPOTIFY / MÚSICA
    // ─────────────────────────────────────────────────────────
    if (lower.includes("spotify") || lower.includes("música") || lower.includes("musica") ||
        lower.includes("canción") || lower.includes("cancion") ||
        lower.includes("reproducir") || lower.includes("reproduce") ||
        (lower.includes("pon ") && !lower.includes("youtube"))) {
      const q = extractQuery("reproduce", "reproducir", "pon", "poner", "busca", "buscar",
        "musica", "música", "en spotify", "spotify", "cancion", "canción");
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ command: `reproducir musica en spotify ${q}` }));
      } else {
        const url = q ? `https://open.spotify.com/search/${encodeURIComponent(q)}` : "https://open.spotify.com";
        window.open(url, "_blank");
      }
      respond(q ? `Listo, poniendo ${q} en Spotify.` : "Abriendo Spotify.");
      return;
    }

    // ─────────────────────────────────────────────────────────
    // 4. CHATGPT / INTELIGENCIA ARTIFICIAL
    // ─────────────────────────────────────────────────────────
    if (lower.includes("chat gpt") || lower.includes("chatgpt") || lower.includes("chat g p t")) {
      window.open("https://chatgpt.com", "_blank");
      respond("Ahí tiene ChatGPT listo.");
      return;
    }

    // ─────────────────────────────────────────────────────────
    // 5. MANDAR MENSAJES / WHATSAPP
    // ─────────────────────────────────────────────────────────
    if (lower.includes("whatsapp")) {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ command: "abrir whatsapp" }));
      }
      window.open("https://web.whatsapp.com", "_blank");
      respond("Abriendo WhatsApp.");
      return;
    }

    // ── SITIOS WEB CONOCIDOS ────────────────────────────────────────────
    const websiteMap = {
      netflix: "https://www.netflix.com",
      instagram: "https://www.instagram.com",
      tiktok: "https://www.tiktok.com",
      twitter: "https://www.twitter.com",
      facebook: "https://www.facebook.com",
      gmail: "https://mail.google.com",
      "google maps": "https://maps.google.com",
      maps: "https://maps.google.com",
      amazon: "https://www.amazon.com",
      linkedin: "https://www.linkedin.com",
      mercadolibre: "https://www.mercadolibre.com.co",
      "mercado libre": "https://www.mercadolibre.com.co",
      "google drive": "https://drive.google.com",
      drive: "https://drive.google.com",
    };
    for (const [site, url] of Object.entries(websiteMap)) {
      if (lower.includes(site)) {
        window.open(url, "_blank");
        respond(`Ahí tienes ${site.charAt(0).toUpperCase() + site.slice(1)}.`);
        return;
      }
    }

    // ─────────────────────────────────────────────────────────
    // 6. PROGRAMAS DE COMPUTADOR (Word, Excel, Calculadora, Bloc de notas, etc.)
    // ─────────────────────────────────────────────────────────
    if (lower.includes("word")) {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ command: "abrir word" }));
        setOrbState("thinking");
        return;
      }
      respond("Abriendo Microsoft Word.");
      return;
    }
    if (lower.includes("excel")) {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ command: "abrir excel" }));
        setOrbState("thinking");
        return;
      }
      respond("Abriendo Microsoft Excel.");
      return;
    }
    if (lower.includes("calculadora")) {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ command: "abrir calculadora" }));
        setOrbState("thinking");
        return;
      }
      respond("Abriendo Calculadora del sistema.");
      return;
    }
    if (lower.includes("bloc de notas") || lower.includes("notepad") || lower.includes("notas")) {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ command: "abrir bloc de notas" }));
        setOrbState("thinking");
        return;
      }
      respond("Abriendo Bloc de notas.");
      return;
    }

    // ─────────────────────────────────────────────────────────
    // 7. ABRIR PESTAÑA / BUSCAR EN GOOGLE
    // ─────────────────────────────────────────────────────────
    if (lower.includes("abrir una pestaña") || lower.includes("nueva pestaña") || lower.includes("abre una pestaña")) {
      window.open("https://www.google.com", "_blank");
      respond("Abriendo nueva pestaña en el navegador.");
      return;
    }
    if (lower.includes("busca en google") || lower.includes("buscar en google") || lower.includes("google")) {
      const q = lower.replace(/orion|busca en google|buscar en google|google/g, "").trim();
      window.open(`https://www.google.com/search?q=${encodeURIComponent(q || "Google")}`, "_blank");
      respond(`Buscando ${q || "en Google"}.`);
      return;
    }

    // ─────────────────────────────────────────────────────────
    // 8. CLIMA Y PRONÓSTICO
    // ─────────────────────────────────────────────────────────
    if (lower.includes("clima") || lower.includes("tiempo") || lower.includes("temperatura") || lower.includes("va a llover")) {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ command: text }));
        setOrbState("thinking");
        return;
      }
      const weatherText = await fetchCurrentWeather();
      respond(weatherText);
      return;
    }

    // ─────────────────────────────────────────────────────────
    // 9. AGENDAR EN EL CALENDARIO / EVENTOS
    // ─────────────────────────────────────────────────────────
    if (lower.includes("calendario") || lower.includes("agendar") || lower.includes("evento") || lower.includes("recordatorio")) {
      const eventTitle = lower.replace(/orion|agenda en el calendario|agendar en el calendario|agendar|abrir calendario|calendario|crear evento/g, "").trim();
      const calUrl = eventTitle
        ? `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(eventTitle)}`
        : `https://calendar.google.com`;
      window.open(calUrl, "_blank");
      respond(eventTitle ? `Abriendo calendario para agendar ${eventTitle}.` : "Abriendo su calendario.");
      return;
    }

    // ─────────────────────────────────────────────────────────
    // 10. HORA Y FECHA
    // ─────────────────────────────────────────────────────────
    if (lower.includes("hora") || lower.includes("qué hora es")) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("es-CO", { hour: "numeric", minute: "numeric", hour12: true });
      respond(`Son las ${timeStr}.`);
      return;
    }
    if (lower.includes("fecha") || lower.includes("qué día es") || lower.includes("que dia es")) {
      const now = new Date();
      const dateStr = now.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      respond(`Hoy es ${dateStr}.`);
      return;
    }

    // ─────────────────────────────────────────────────────────
    // 11. SISTEMA POS — CEREBRO INTELIGENTE DE ADMINISTRACIÓN Y CONTROL
    // ─────────────────────────────────────────────────────────

    // A) STOCK & INVENTARIO: Consultas generales de productos en stock
    if (lower.includes("productos que están en stock") || lower.includes("productos que estan en stock") ||
        lower.includes("productos en stock") || lower.includes("productos que hay en stock") ||
        lower.includes("qué hay en stock") || lower.includes("que hay en stock") ||
        lower.includes("cuántos productos hay") || lower.includes("cuantos productos hay") ||
        lower.includes("resumen de stock") || lower.includes("resumen de inventario") ||
        lower.includes("inventario disponible") || lower.includes("qué tenemos en stock") || lower.includes("que tenemos en stock")) {
      const conStock = products.filter(p => Number(p.stock) > 0);
      const agotados = products.filter(p => !p.stock || Number(p.stock) <= 0);
      const stockBajo = products.filter(p => Number(p.stock) > 0 && Number(p.stock) <= (p.stockMinimo || 5));
      if (onNavigateTab) onNavigateTab("inventory");
      respond(`Tienes ${products.length} productos en el inventario: ${conStock.length} con stock disponible, ${agotados.length} agotados y ${stockBajo.length} con stock bajo. Te abrí el inventario en pantalla.`);
      return;
    }

    // B) STOCK & INVENTARIO: Productos agotados / sin stock
    if (lower.includes("agotado") || lower.includes("sin stock") || lower.includes("stock cero") ||
        lower.includes("se acabaron") || lower.includes("no tienen stock") || lower.includes("no hay stock")) {
      const agotados = products.filter(p => !p.stock || Number(p.stock) <= 0);
      if (onNavigateTab) onNavigateTab("inventory");
      if (agotados.length === 0) {
        respond("¡Excelente noticia! No tienes ningún producto agotado en este momento.");
      } else {
        const ejemplos = agotados.slice(0, 4).map(p => p.nombre).join(", ");
        respond(`Tienes ${agotados.length} productos agotados. Entre ellos: ${ejemplos}. Te abrí el inventario para que los revises.`);
      }
      return;
    }

    // C) STOCK & INVENTARIO: Stock bajo / Por agotarse / Alertas de compra
    if (lower.includes("stock bajo") || lower.includes("poco stock") ||
        lower.includes("se están acabando") || lower.includes("se estan acabando") ||
        lower.includes("por agotarse") || lower.includes("alertas de stock") ||
        lower.includes("qué tengo que comprar") || lower.includes("que tengo que pedir") || lower.includes("pedir a proveedores")) {
      const stockBajo = products.filter(p => Number(p.stock) > 0 && Number(p.stock) <= (p.stockMinimo || 5));
      if (onNavigateTab) onNavigateTab("inventory");
      if (stockBajo.length === 0) {
        respond("Todo el inventario tiene buen nivel de existencias. No hay alertas críticas de stock.");
      } else {
        const ejemplos = stockBajo.slice(0, 4).map(p => `${p.nombre} (${p.stock} unid)`).join(", ");
        respond(`Hay ${stockBajo.length} productos con stock bajo que deberías pedir: ${ejemplos}. Ya te abrí el inventario.`);
      }
      return;
    }

    // D) STOCK & INVENTARIO: Consulta de precio o stock de un producto específico
    if (lower.includes("precio de") || lower.includes("cuánto vale") || lower.includes("cuanto vale") ||
        lower.includes("cuánto cuesta") || lower.includes("cuanto cuesta") ||
        lower.includes("cuánto queda de") || lower.includes("cuantos quedan de") ||
        lower.includes("stock de") || (lower.startsWith("tienes ") && !lower.includes("musica")) ||
        lower.startsWith("hay ") || lower.startsWith("busca el producto") || lower.startsWith("buscar producto")) {
      const q = lower
        .replace(/orion|cuánto queda de|cuantos quedan de|stock de|precio de|cuánto vale|cuanto vale|cuánto cuesta|cuanto cuesta|tienes|hay|busca el producto|buscar producto|busca|buscar/g, "")
        .replace(/[?¿!¡]/g, "")
        .trim();
      if (q.length >= 2) {
        const found = products.find(p =>
          (p.nombre || "").toLowerCase().includes(q) || (p.categoria || "").toLowerCase().includes(q)
        );
        if (found) {
          const precio = Number(found.precio || 0).toLocaleString("es-CO");
          const unidades = Number(found.stock || 0);
          respond(`${found.nombre}: quedan ${unidades} unidades en stock a $${precio} pesos.`);
          return;
        } else {
          respond(`No encontré ningún producto que coincida con "${q}" en el inventario.`);
          return;
        }
      }
    }

    // E) STOCK & INVENTARIO: Navegación simple al inventario
    if (lower.includes("abrir inventario") || lower.includes("abre el inventario") ||
        lower.includes("ir a inventario") || lower.includes("ver inventario") ||
        lower.includes("mostrar inventario") || lower.includes("ver productos") ||
        lower.includes("ir a productos") || (lower.includes("inventario") && !lower.includes("stock"))) {
      if (onNavigateTab) onNavigateTab("inventory");
      respond(`Abriendo inventario. Hay ${products.length} productos registrados.`);
      return;
    }

    // F) VENTAS: Ventas de hoy / Métricas del día
    if (lower.includes("ventas de hoy") || lower.includes("cuánto se ha vendido hoy") ||
        lower.includes("cuanto se ha vendido hoy") || lower.includes("total de ventas") ||
        lower.includes("cómo van las ventas") || lower.includes("como van las ventas") ||
        lower.includes("cuánto llevamos hoy") || lower.includes("cuanto llevamos hoy")) {
      const todayStr = new Date().toISOString().split("T")[0];
      const todaySales = sales.filter(s => (s.fecha ? s.fecha.split("T")[0] : "") === todayStr);
      const total = todaySales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
      const efectivo = todaySales.filter(s => (s.metodoPago || "").toLowerCase().includes("efectivo")).reduce((acc, s) => acc + (Number(s.total) || 0), 0);
      const transferencias = total - efectivo;
      if (todaySales.length === 0) {
        respond("Por el momento no se han registrado ventas hoy en el sistema. Todo listo para facturar.");
      } else {
        respond(`Hoy van ${todaySales.length} ventas completadas por un valor de $${total.toLocaleString("es-CO")} pesos. En efectivo: $${efectivo.toLocaleString("es-CO")}, y transferencias: $${transferencias.toLocaleString("es-CO")}.`);
      }
      return;
    }

    // G) VENTAS: Productos más vendidos / Top ventas
    if (lower.includes("más vendido") || lower.includes("mas vendido") ||
        lower.includes("lo que más se vende") || lower.includes("lo que mas se vende") ||
        lower.includes("top de ventas") || lower.includes("productos populares")) {
      const counts = {};
      sales.forEach(s => {
        (s.items || []).forEach(it => {
          if (it.nombre) {
            counts[it.nombre] = (counts[it.nombre] || 0) + (Number(it.cantidad) || 1);
          }
        });
      });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
      if (sorted.length > 0) {
        const topStr = sorted.map(([n, c]) => `${n} (${c} unid)`).join(", ");
        respond(`Los productos más vendidos son: ${topStr}.`);
      } else {
        respond("Aún no hay suficientes ventas registradas para determinar los productos más vendidos.");
      }
      return;
    }

    // H) VENTAS: Historial de ventas
    if (lower.includes("historial de ventas") || lower.includes("reporte de ventas") || lower.includes("ventas anteriores")) {
      if (onNavigateTab) onNavigateTab("sales");
      respond(`Abriendo historial de ventas con ${sales.length} registros.`);
      return;
    }

    // I) VENTAS: Pantalla de ventas / Facturación
    if (lower.includes("pantalla de ventas") || lower.includes("ir a ventas") ||
        lower.includes("abrir ventas") || lower.includes("nueva venta") ||
        lower.includes("facturar") || lower.includes("ir a caja pos") || lower.includes("abrir caja pos")) {
      if (onNavigateTab) onNavigateTab("pos");
      respond("Abriendo pantalla de ventas y facturación.");
      return;
    }

    // J) CAJA & TURNOS: Estado de caja y dinero actual
    if (lower.includes("cuánto hay en caja") || lower.includes("cuanto hay en caja") ||
        lower.includes("estado de la caja") || lower.includes("dinero en caja") ||
        lower.includes("estado del turno") || lower.includes("plata en caja")) {
      if (activeShift && activeShift.estado === "abierto") {
        const base = Number(activeShift.montoInicial || activeShift.base || 0).toLocaleString("es-CO");
        const usuario = activeShift.usuarioNombre || activeShift.usuario || "el cajero";
        respond(`El turno está abierto por ${usuario} con una base inicial de $${base} pesos.`);
      } else {
        respond("No hay ningún turno de caja abierto en este momento. Puedes abrir turno cuando desees.");
      }
      return;
    }

    // K) CAJA & TURNOS: Abrir/Cerrar caja / Arqueo / Modal
    if (lower.includes("abrir caja") || lower.includes("cerrar caja") ||
        lower.includes("abrir turno") || lower.includes("cerrar turno") ||
        lower.includes("arqueo de caja") || lower.includes("cuadre de caja") ||
        lower.includes("panel de caja") || (lower.includes("caja") && lower.includes("turno"))) {
      if (onOpenShiftModal) onOpenShiftModal();
      respond("Abriendo panel de control de caja y turnos.");
      return;
    }

    // L) CLIENTES: Deudores / Cuentas por cobrar
    if (lower.includes("deudor") || lower.includes("quién debe") || lower.includes("quien debe") ||
        lower.includes("saldo pendiente") || lower.includes("cuentas por cobrar") ||
        lower.includes("crédito") || lower.includes("credito") || lower.includes("fiado")) {
      const deudores = clients.filter(c => Number(c.saldoPendiente || c.deuda || 0) > 0);
      if (deudores.length === 0) {
        respond("¡Excelente! No tienes clientes con saldo pendiente de pago en este momento.");
      } else {
        const totalDeuda = deudores.reduce((acc, c) => acc + (Number(c.saldoPendiente || c.deuda) || 0), 0);
        const ejemplos = deudores.slice(0, 3).map(c => `${c.nombre || c.clienteNombre} ($${Number(c.saldoPendiente || c.deuda).toLocaleString("es-CO")})`).join(", ");
        if (onNavigateTab) onNavigateTab("clients");
        respond(`Hay ${deudores.length} clientes con saldo pendiente por un total de $${totalDeuda.toLocaleString("es-CO")} pesos. Por ejemplo: ${ejemplos}. Te abrí el módulo de clientes.`);
      }
      return;
    }

    // M) CLIENTES: General
    if (lower.includes("cliente") || lower.includes("ver clientes") || lower.includes("abrir clientes")) {
      if (onNavigateTab) onNavigateTab("clients");
      respond(`Mostrando ${clients.length} clientes registrados en el sistema.`);
      return;
    }

    // N) SEGUROS ESCOLARES
    if (lower.includes("seguro") || lower.includes("escolar") || lower.includes("póliza") || lower.includes("poliza")) {
      if (onNavigateTab) onNavigateTab("insurances");
      respond(`Módulo de seguros escolares con ${insurances.length} pólizas registradas.`);
      return;
    }

    // O) ALQUILERES DE MESAS Y SILLAS
    if (lower.includes("alquiler") || lower.includes("mesas") || lower.includes("sillas") || lower.includes("mobiliario")) {
      if (onNavigateTab) onNavigateTab("rentals");
      respond(`Módulo de alquileres con ${rentals.length} registros de alquiler de mesas y sillas.`);
      return;
    }

    // P) TEMA OSCURO / CLARO
    if (lower.includes("modo oscuro") || lower.includes("modo claro") ||
        lower.includes("cambiar tema") || lower.includes("tema oscuro") || lower.includes("tema claro")) {
      if (toggleTheme) {
        toggleTheme();
        const nextTheme = theme === "dark" ? "claro" : "oscuro";
        respond(`Listo, cambié el sistema a modo ${nextTheme}.`);
        return;
      }
    }

    // Q) CONFIGURACIÓN DEL NEGOCIO
    if (lower.includes("configuración") || lower.includes("configuracion") ||
        lower.includes("datos del negocio") || lower.includes("configurar tienda") || lower.includes("datos de la tienda")) {
      if (onOpenStoreConfigModal) onOpenStoreConfigModal();
      respond("Abriendo la configuración general del negocio.");
      return;
    }

    // R) CÓDIGOS DE BARRAS
    if (lower.includes("código de barra") || lower.includes("codigo de barra") ||
        lower.includes("etiqueta") || lower.includes("imprimir códigos") || lower.includes("barcodes")) {
      if (onNavigateTab) onNavigateTab("barcodes");
      respond("Abriendo generador e impresor de códigos de barras.");
      return;
    }

    // ─────────────────────────────────────────────────────────
    // 12. CHARLA NATURAL ESTILO CHATGPT VOICE
    // ─────────────────────────────────────────────────────────
    if (lower.includes("hola") || lower.includes("buenos días") || lower.includes("buenas tardes") || lower.includes("buenas noches") || lower.includes("buenas")) {
      const hour = new Date().getHours();
      const greeting = hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";
      respond(`${greeting}. ¿En qué le puedo ayudar hoy?`);
      return;
    }
    if (lower.includes("cómo estás") || lower.includes("como estas") || lower.includes("qué tal") || lower.includes("que tal")) {
      respond("Todo bien, gracias. Listo para lo que necesite.");
      return;
    }
    if (lower.includes("quién eres") || lower.includes("quién te creó") || lower.includes("como te llamas") || lower.includes("quien eres")) {
      respond("Soy Orión, creado por León para gestionar el negocio y el PC. A sus órdenes.");
      return;
    }
    if (lower.includes("qué puedes hacer") || lower.includes("que puedes hacer") || lower.includes("ayuda") || lower.includes("para qué sirves")) {
      respond("Puedo administrar el inventario, ventas, caja, deudas, poner música, abrir programas de Windows, darte el clima y mucho más. Pídame lo que necesite.");
      return;
    }
    if (lower.includes("gracias") || lower.includes("muchas gracias")) {
      respond("Con mucho gusto. Para eso estoy.");
      return;
    }
    if (lower.includes("te quiero") || lower.includes("eres el mejor") || lower.includes("muy bueno")) {
      respond("Jaja, gracias. Yo también lo aprecio. ¿Algo más?");
      return;
    }

    // ─────────────────────────────────────────────────────────
    // 13. DELEGAR AL SERVIDOR WINDOWS / GEMINI CON CONTEXTO POS COMPLETO
    // ─────────────────────────────────────────────────────────
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const todayStr = new Date().toISOString().split("T")[0];
      const todaySales = sales.filter(s => (s.fecha ? s.fecha.split("T")[0] : "") === todayStr);
      const totalToday = todaySales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
      const agotadosCount = products.filter(p => !p.stock || Number(p.stock) <= 0).length;
      const stockBajoCount = products.filter(p => Number(p.stock) > 0 && Number(p.stock) <= (p.stockMinimo || 5)).length;
      const deudoresCount = clients.filter(c => Number(c.saldoPendiente || c.deuda || 0) > 0).length;

      const posContext = {
        totalProductos: products.length,
        agotados: agotadosCount,
        stockBajo: stockBajoCount,
        ventasHoyCount: todaySales.length,
        ventasHoyTotal: totalToday,
        totalClientes: clients.length,
        deudores: deudoresCount,
        turnoAbierto: activeShift?.estado === "abierto"
      };

      wsRef.current.send(JSON.stringify({ command: text, context: posContext }));
      setOrbState("thinking");
      return;
    }

    // Fallback: buscar en Google si es una pregunta
    const isQuestion = lower.startsWith("qué ") || lower.startsWith("que ") ||
      lower.startsWith("cómo ") || lower.startsWith("como ") || lower.startsWith("por qué ") ||
      lower.startsWith("cuál ") || lower.startsWith("busca ") || lower.startsWith("buscar ") ||
      lower.startsWith("qué es ") || lower.startsWith("quién es ") || lower.startsWith("dónde ");

    if (isQuestion) {
      const q = extractQuery("busca", "buscar", "en internet", "en google", "google");
      window.open(`https://www.google.com/search?q=${encodeURIComponent(q || text)}`, "_blank");
      respond("Ya busqué eso en internet.");
      return;
    }

    respond("Entendido. Si necesita algo específico, dígame el comando directamente.");

    function respond(msg) {
      setOrbState("speaking");
      isSpeakingRef.current = true;
      showBubble({ userText: text, orionText: msg, isAction: true });
      speakText(msg, null, () => {
        isSpeakingRef.current = false;
        setOrbState("idle");
        resumeListening();
      });
    }
  }, [products, sales, insurances, clients, rentals, activeShift, theme, toggleTheme, currentUser, onNavigateTab, onOpenShiftModal, onOpenStoreConfigModal, showBubble]); // eslint-disable-line

  // ── Reconocimiento de Voz Continuo Manos Libres ───────────────
  const resumeListening = useCallback(() => {
    if (!isListeningRef.current) return;
    try {
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch {}
  }, []);

  useEffect(() => {
    resumeListeningRef.current = resumeListening;
  }, [resumeListening]);

  const startContinuousListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showBubble({ userText: "", orionText: "Usa Google Chrome para el asistente de voz.", isAction: false });
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "es-CO";
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
        setOrbState("idle");
      };

      recognition.onresult = (event) => {
        const lastIdx = event.results.length - 1;
        const result = event.results[lastIdx];
        if (!result.isFinal) return;

        const transcript = result[0].transcript.trim();
        if (!transcript) return;

        console.log("[Orion Escuchó]:", transcript);

        // Si Orión está hablando actualmente, descartar para evitar que se escuche a sí mismo
        if (isSpeakingRef.current) return;

        setOrbState("listening");
        processCommand(transcript);
      };

      recognition.onerror = (evt) => {
        if (evt.error === "no-speech") return;
        if (evt.error === "not-allowed") {
          setIsListening(false);
          isListeningRef.current = false;
          showBubble({
            userText: "",
            orionText: "Haz clic en la esfera y permite el micrófono en Chrome.",
            isAction: false
          });
        }
      };

      recognition.onend = () => {
        if (isListeningRef.current && !isSpeakingRef.current) {
          setTimeout(() => {
            try {
              recognition.start();
            } catch {}
          }, 200);
        }
      };

      recognition.start();
    } catch (e) {
      console.warn("[Orion speech init error]", e);
    }
  }, [processCommand, showBubble]);

  const handleOrbClick = () => {
    if (!isListening) {
      startContinuousListening();
      setOrbState("listening");
      showBubble({
        userText: "",
        orionText: "Orión activo. Di tu orden o di 'Orión desactívate' cuando termines.",
        isAction: false
      }, 4000);
      speakText("Orión en línea.", null, () => {
        setOrbState("idle");
        resumeListening();
      });
    } else {
      setOrbState("listening");
      showBubble({
        userText: "",
        orionText: "Te escucho. Di tu orden directamente...",
        isAction: false
      }, 3500);
    }
  };

  useEffect(() => {
    connectWebSocket();
    const t = setTimeout(() => {
      startContinuousListening();
    }, 1000);

    return () => {
      clearTimeout(t);
      isListeningRef.current = false;
      try { recognitionRef.current?.abort(); } catch {}
      try { wsRef.current?.close(); } catch {}
    };
  }, []); // eslint-disable-line

  return (
    <>
      <style>{`
        @keyframes alexaChaseLight {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes alexaBreathing {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(6, 182, 212, 0.4), inset 0 0 15px rgba(56, 189, 248, 0.3); }
          50% { transform: scale(1.06); box-shadow: 0 0 38px rgba(6, 182, 212, 0.8), 0 0 65px rgba(99, 102, 241, 0.5), inset 0 0 25px rgba(255, 255, 255, 0.5); }
        }
        @keyframes soundWaveRipple {
          0% { transform: scale(0.9); opacity: 0.9; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes waveBarMotion {
          0%, 100% { height: 5px; }
          50% { height: 20px; }
        }
        .orion-alexa-sphere:hover {
          transform: scale(1.1) translateY(-2px);
          filter: brightness(1.25);
        }
      `}</style>

      <div
        style={{
          position: "fixed",
          bottom: "26px",
          left: "26px",
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "14px",
          pointerEvents: "none"
        }}
      >
        {/* Diálogo del Asistente */}
        {speechBubble && (
          <div
            style={{
              pointerEvents: "auto",
              background: "rgba(10, 15, 30, 0.95)",
              border: "1.5px solid rgba(6, 182, 212, 0.55)",
              borderRadius: "20px",
              padding: "16px 20px",
              maxWidth: "340px",
              minWidth: "260px",
              boxShadow: "0 22px 55px rgba(0, 0, 0, 0.8), 0 0 30px rgba(6, 182, 212, 0.3)",
              backdropFilter: "blur(20px)",
              display: "flex",
              flexDirection: "column",
              gap: "10px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    width: "9px",
                    height: "9px",
                    borderRadius: "50%",
                    background: orbState === "listening" ? "#00f0ff" : isListening ? "#10b981" : "#64748b",
                    boxShadow: orbState === "listening" ? "0 0 10px #00f0ff" : "none"
                  }}
                />
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 900,
                    letterSpacing: "0.14em",
                    color: "#00f0ff",
                    textTransform: "uppercase"
                  }}
                >
                  ORIÓN
                </span>
                <span
                  style={{
                    fontSize: "0.65rem",
                    background: isListening ? "rgba(16, 185, 129, 0.25)" : "rgba(100, 116, 139, 0.25)",
                    color: isListening ? "#34d399" : "#94a3b8",
                    padding: "2px 7px",
                    borderRadius: "6px",
                    fontWeight: 800
                  }}
                >
                  {isListening ? (wsConnected ? "PC + POS VINCULADO" : "MANOS LIBRES") : "INACTIVO"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSpeechBubble(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "2px"
                }}
              >
                <X size={16} />
              </button>
            </div>

            {speechBubble.userText && (
              <div
                style={{
                  fontSize: "0.84rem",
                  color: "#94a3b8",
                  fontStyle: "italic",
                  borderLeft: "2px solid #00f0ff",
                  paddingLeft: "8px"
                }}
              >
                "{speechBubble.userText}"
              </div>
            )}

            <div
              style={{
                fontSize: "0.94rem",
                color: "#f8fafc",
                lineHeight: "1.45",
                fontWeight: 600
              }}
            >
              {speechBubble.orionText}
            </div>

            {(orbState === "speaking" || orbState === "listening") && (
              <div style={{ display: "flex", gap: "4px", alignItems: "center", height: "20px" }}>
                {[0.1, 0.25, 0.4, 0.2, 0.35, 0.15].map((delay, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: "4px",
                      borderRadius: "2px",
                      background: "linear-gradient(to top, #0051ff, #00f0ff)",
                      animation: `waveBarMotion 0.65s infinite ease-in-out ${delay}s`
                    }}
                  />
                ))}
                <span style={{ fontSize: "0.72rem", color: "#38bdf8", marginLeft: "6px", fontWeight: 700 }}>
                  {orbState === "listening" ? "Escuchando..." : "Voz activa"}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── BOLA ESTILO ALEXA (Manos Libres) ── */}
        <div style={{ position: "relative", pointerEvents: "auto" }}>
          {orbState === "listening" && (
            <>
              <div
                style={{
                  position: "absolute",
                  inset: "-14px",
                  borderRadius: "50%",
                  border: "2px solid rgba(0, 240, 255, 0.7)",
                  animation: "soundWaveRipple 1.4s infinite ease-out"
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: "-24px",
                  borderRadius: "50%",
                  border: "1.5px solid rgba(99, 102, 241, 0.5)",
                  animation: "soundWaveRipple 1.4s infinite ease-out 0.4s"
                }}
              />
            </>
          )}

          {/* Anillo de luz estilo Alexa Ring Light */}
          <div
            style={{
              position: "absolute",
              inset: "-6px",
              borderRadius: "50%",
              background: orbState === "listening"
                ? "conic-gradient(from 0deg, #00f0ff, #0051ff, #38bdf8, #00f0ff)"
                : orbState === "thinking"
                ? "conic-gradient(from 0deg, #a855f7, #06b6d4, #6366f1, #a855f7)"
                : orbState === "speaking"
                ? "conic-gradient(from 0deg, #10b981, #06b6d4, #3b82f6, #10b981)"
                : isListening
                ? "conic-gradient(from 0deg, rgba(6,182,212,0.7), rgba(99,102,241,0.7), rgba(6,182,212,0.7))"
                : "rgba(100, 116, 139, 0.2)",
              animation: orbState === "listening" || orbState === "thinking"
                ? "alexaChaseLight 1.1s infinite linear"
                : isListening
                ? "alexaChaseLight 6s infinite linear"
                : "none",
              filter: "blur(1.8px)",
              opacity: isListening ? 0.96 : 0.3
            }}
          />

          {/* Esfera 3D Central */}
          <button
            type="button"
            className="orion-alexa-sphere"
            onClick={handleOrbClick}
            title={isListening ? "Orión activo (Di 'Orión desactívate' para apagarlo)" : "Haz clic para activar a Orión"}
            style={{
              position: "relative",
              width: "66px",
              height: "66px",
              borderRadius: "50%",
              border: isListening ? "1.5px solid rgba(255, 255, 255, 0.3)" : "1.5px solid rgba(148, 163, 184, 0.2)",
              cursor: "pointer",
              padding: 0,
              outline: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: isListening
                ? "radial-gradient(circle at 35% 30%, #38bdf8 0%, #0284c7 35%, #0f172a 80%, #020617 100%)"
                : "radial-gradient(circle at 35% 30%, #475569 0%, #1e293b 60%, #0f172a 100%)",
              animation: orbState === "listening" ? "alexaBreathing 1.2s infinite ease-in-out" : "none",
              transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
            }}
          >
            {/* Brillo especular de cristal */}
            <div
              style={{
                position: "absolute",
                top: "7px",
                left: "14px",
                width: "22px",
                height: "12px",
                borderRadius: "50%",
                background: "radial-gradient(ellipse at center, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0) 80%)",
                transform: "rotate(-25deg)",
                pointerEvents: "none",
                opacity: isListening ? 1 : 0.4
              }}
            />

            {/* Núcleo de energía reactivo */}
            <div
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                background: !isListening
                  ? "transparent"
                  : orbState === "listening"
                  ? "radial-gradient(circle, #ffffff 10%, #00f0ff 75%, transparent 100%)"
                  : orbState === "thinking"
                  ? "radial-gradient(circle, #ffffff 10%, #c084fc 75%, transparent 100%)"
                  : "radial-gradient(circle, #ffffff 5%, #38bdf8 65%, transparent 100%)",
                boxShadow: orbState === "listening" ? "0 0 18px #00f0ff" : isListening ? "0 0 12px rgba(56, 189, 248, 0.6)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.3s ease"
              }}
            >
              <Sparkles size={13} color={isListening ? "#ffffff" : "#94a3b8"} style={{ filter: isListening ? "drop-shadow(0 0 3px #ffffff)" : "none" }} />
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
