/**
 * notificationService.js
 * Servicio de Notificaciones Push del Navegador para el Sistema POS.
 * Maneja permisos, envío de notificaciones y seguimiento de alertas ya enviadas.
 * 100% aditivo — no modifica ninguna lógica existente.
 */

const NOTIF_KEY = "pos_notif_sent_ids";
const NOTIF_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutos entre la misma alerta

/**
 * Solicita permiso de notificaciones al usuario.
 * @returns {Promise<boolean>} true si se concedió el permiso
 */
export async function requestNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

/**
 * Verifica si el navegador soporta notificaciones y si el permiso está activo.
 */
export function isNotificationsEnabled() {
  return "Notification" in window && Notification.permission === "granted";
}

/**
 * Envía una notificación push del navegador.
 * @param {string} title   - Título de la notificación
 * @param {string} body    - Cuerpo del mensaje
 * @param {object} options - Opciones adicionales (icon, badge, tag, data)
 */
export function sendNotification(title, body, options = {}) {
  if (!isNotificationsEnabled()) return null;
  try {
    const notif = new Notification(title, {
      body,
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      tag: options.tag || "pos-alert",
      requireInteraction: options.requireInteraction || false,
      silent: options.silent || false,
      data: options.data || {},
      ...options,
    });
    // Auto-cerrar notificaciones no críticas después de 8 segundos
    if (!options.requireInteraction) {
      setTimeout(() => notif.close(), 8000);
    }
    return notif;
  } catch (err) {
    console.warn("[NotificationService] Error enviando notificación:", err);
    return null;
  }
}

/**
 * Carga el historial de notificaciones enviadas (para evitar spam).
 * @returns {object} mapa de { id -> timestamp }
 */
function _loadSentIds() {
  try {
    return JSON.parse(localStorage.getItem(NOTIF_KEY) || "{}");
  } catch {
    return {};
  }
}

function _saveSentIds(map) {
  try {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(map));
  } catch {}
}

/**
 * Verifica si una notificación ya fue enviada recientemente (cooldown).
 * @param {string} id - Identificador único de la alerta (ej: product ID)
 * @returns {boolean} true si ya fue enviada y aún está en cooldown
 */
function _isInCooldown(id) {
  const sent = _loadSentIds();
  const ts = sent[id];
  if (!ts) return false;
  return Date.now() - ts < NOTIF_COOLDOWN_MS;
}

function _markSent(id) {
  const sent = _loadSentIds();
  sent[id] = Date.now();
  // Limpiar IDs más viejos de 24 horas para no acumular basura
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const key of Object.keys(sent)) {
    if (sent[key] < cutoff) delete sent[key];
  }
  _saveSentIds(sent);
}

/**
 * Revisa la lista de productos y envía notificaciones para los que
 * tienen stock crítico (≤ umbral), evitando duplicados por cooldown.
 *
 * @param {Array}  products        - Lista de productos del estado global
 * @param {number} [threshold=3]   - Stock mínimo antes de notificar
 */
export function checkAndNotifyLowStock(products, threshold = 3) {
  if (!isNotificationsEnabled()) return;
  if (!Array.isArray(products) || products.length === 0) return;

  const agotados = [];
  const bajos = [];

  for (const p of products) {
    if (!p || p.activo === false || p.stockIlimitado) continue;
    const stock = Number(p.stock) || 0;
    const nombre = p.nombre || "Producto sin nombre";
    const id = String(p.id || p.codigo || nombre);

    if (stock === 0) {
      if (!_isInCooldown(`agotado-${id}`)) {
        agotados.push({ id, nombre });
      }
    } else if (stock <= threshold) {
      if (!_isInCooldown(`bajo-${id}`)) {
        bajos.push({ id, nombre, stock });
      }
    }
  }

  // Notificación agrupada de agotados (máximo 1 notificación por lote)
  if (agotados.length > 0) {
    const nombres = agotados.slice(0, 3).map((p) => p.nombre).join(", ");
    const extra = agotados.length > 3 ? ` y ${agotados.length - 3} más` : "";
    sendNotification(
      `⚠️ ${agotados.length} producto${agotados.length > 1 ? "s" : ""} sin stock`,
      `${nombres}${extra} — Reabastecer urgente`,
      { tag: "stock-agotado", requireInteraction: true }
    );
    agotados.forEach((p) => _markSent(`agotado-${p.id}`));
  }

  // Notificación agrupada de stock bajo (separada de agotados)
  if (bajos.length > 0) {
    const nombres = bajos
      .slice(0, 3)
      .map((p) => `${p.nombre} (${p.stock} uds)`)
      .join(", ");
    const extra = bajos.length > 3 ? ` y ${bajos.length - 3} más` : "";
    sendNotification(
      `📦 Stock bajo en ${bajos.length} producto${bajos.length > 1 ? "s" : ""}`,
      `${nombres}${extra}`,
      { tag: "stock-bajo" }
    );
    bajos.forEach((p) => _markSent(`bajo-${p.id}`));
  }
}

/**
 * Envía una notificación de bienvenida/test para verificar que funcionan.
 */
export function sendWelcomeNotification(storeName = "Sistema POS") {
  sendNotification(
    `✅ ${storeName} — Notificaciones activas`,
    "Recibirás alertas de stock bajo y eventos importantes.",
    { tag: "welcome", silent: true }
  );
}
