/**
 * auditService.js
 * Servicio de auditoría para registro y trazabilidad de cambios en precios y costos.
 * Permite saber quién, cuándo y cuánto cambió el precio o costo de cualquier producto.
 * 100% aditivo y tolerante a fallos offline.
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
} from "firebase/firestore";
import { db } from "../firebase/config";

const AUDIT_COLLECTION = "auditoria_precios";
const LOCAL_STORAGE_KEY = "pos_price_audit_log";

/**
 * Obtiene el log local en localStorage
 */
function getLocalAuditLog() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Guarda en localStorage de respaldo
 */
function saveLocalAuditLog(entries) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries.slice(0, 300)));
  } catch (e) {
    console.warn("No se pudo guardar auditoría local:", e);
  }
}

/**
 * Registra un cambio de precio o costo en la auditoría
 * @param {object} params
 * @param {object} params.previousProduct  - Estado anterior del producto
 * @param {object} params.updatedProduct   - Nuevo estado del producto
 * @param {object} params.currentUser      - Usuario autenticado
 * @param {string} [params.motivo]         - Razón del cambio (opcional)
 */
export async function recordPriceChange({
  previousProduct,
  updatedProduct,
  currentUser,
  motivo = "Actualización manual",
}) {
  if (!previousProduct || !updatedProduct) return null;

  const oldPrice = Number(previousProduct.precio) || 0;
  const newPrice = Number(updatedProduct.precio) || 0;
  const oldCost = Number(previousProduct.costo || previousProduct.precioCompra) || 0;
  const newCost = Number(updatedProduct.costo || updatedProduct.precioCompra) || 0;

  const priceChanged = Math.abs(oldPrice - newPrice) > 0.001;
  const costChanged = Math.abs(oldCost - newCost) > 0.001;

  // Si no cambiaron ni precio ni costo, no generamos evento de auditoría
  if (!priceChanged && !costChanged) {
    return null;
  }

  const entry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    productId: updatedProduct.id || updatedProduct.codigo || "sin-id",
    productName: updatedProduct.nombre || "Producto sin nombre",
    codigo: updatedProduct.codigo || "-",
    categoria: updatedProduct.categoria || "General",
    precioAnterior: oldPrice,
    precioNuevo: newPrice,
    costoAnterior: oldCost,
    costoNuevo: newCost,
    cambioPrecio: newPrice - oldPrice,
    cambioCosto: newCost - oldCost,
    priceChanged,
    costChanged,
    usuario: currentUser?.nombre || currentUser?.username || "Usuario POS",
    usuarioId: currentUser?.id || currentUser?.uid || "user",
    rolUsuario: currentUser?.rol || "Operador",
    motivo,
    fecha: new Date().toISOString(),
  };

  // Guardar en caché local inmediatamente
  const currentLocal = getLocalAuditLog();
  saveLocalAuditLog([entry, ...currentLocal]);

  // Persistir en Firestore de manera asíncrona y resiliente
  try {
    if (db) {
      await addDoc(collection(db, AUDIT_COLLECTION), entry);
    }
  } catch (err) {
    console.warn("No se pudo sincronizar auditoría a Firestore (guardado localmente):", err);
  }

  return entry;
}

/**
 * Consulta el historial de auditoría de precios
 * @param {object} [options]
 * @param {string} [options.productId] - Filtrar por ID de producto específico
 * @param {number} [options.limitCount=50] - Máximo número de registros
 */
export async function fetchPriceAuditLog({ productId = null, limitCount = 50 } = {}) {
  const localEntries = getLocalAuditLog();
  let firestoreEntries = [];

  try {
    if (db) {
      let q;
      if (productId) {
        q = query(
          collection(db, AUDIT_COLLECTION),
          where("productId", "==", productId),
          limit(limitCount)
        );
      } else {
        q = query(
          collection(db, AUDIT_COLLECTION),
          orderBy("fecha", "desc"),
          limit(limitCount)
        );
      }
      const snapshot = await getDocs(q);
      firestoreEntries = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
  } catch (err) {
    console.warn("Fallo al consultar auditoría en Firestore (usando caché):", err);
  }

  // Mezclar y deduplicar por id
  const map = new Map();
  [...firestoreEntries, ...localEntries].forEach((e) => {
    const key = e.id || `${e.productId}_${e.fecha}`;
    if (!map.has(key)) {
      map.set(key, e);
    }
  });

  let combined = Array.from(map.values());

  // Filtrar por producto si se solicitó y ordenar por fecha descendente
  if (productId) {
    combined = combined.filter((e) => e.productId === productId || e.codigo === productId);
  }

  combined.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));

  return combined.slice(0, limitCount);
}
