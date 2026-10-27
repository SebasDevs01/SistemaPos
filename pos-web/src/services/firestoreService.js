import { 
  collection, 
  getDocs, 
  getDoc,
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit,
  where,
  serverTimestamp, 
  writeBatch,
  onSnapshot,
  enableNetwork,
  disableNetwork
} from "firebase/firestore";
import { db } from "../firebase/config";
import { INITIAL_CLIENTS, STORE_CONFIG, INITIAL_USERS } from "../data/initialData";

// INITIAL_PRODUCTS se carga desde /products.json en runtime (no en el bundle)
// Esto reduce el bundle de build de ~2.5MB a ~1MB y evita crashes de memoria al compilar
let _cachedInitialProducts = null;
const getInitialProducts = async () => {
  if (_cachedInitialProducts) return _cachedInitialProducts;
  try {
    const res = await fetch('/products.json');
    if (res.ok) {
      _cachedInitialProducts = await res.json();
      return _cachedInitialProducts;
    }
  } catch (_) {}
  // Fallback: retornar array vacío si no se puede cargar
  _cachedInitialProducts = [];
  return _cachedInitialProducts;
};

const PRODUCTS_COLLECTION = "productos";
const SALES_COLLECTION = "ventas";
const RENTALS_COLLECTION = "alquileres";
const CLIENTS_COLLECTION = "clientes";
const CONFIG_COLLECTION = "configuracion";
const USERS_COLLECTION = "usuarios";
const INSURANCES_COLLECTION = "seguros";
const MERMAS_COLLECTION = "mermas";

// ─── COLA OFFLINE: operaciones pendientes cuando no hay internet ───────────────
const PENDING_OPS_KEY = "pos_pending_ops";

const getPendingOps = () => getLocal(PENDING_OPS_KEY, []);
const setPendingOps = (ops) => setLocal(PENDING_OPS_KEY, ops);

const enqueuePendingOp = (op) => {
  const ops = getPendingOps();
  ops.push({ ...op, enqueuedAt: new Date().toISOString() });
  setPendingOps(ops);
};

// Sincronizar operaciones pendientes con Firestore cuando vuelve la conexión
export const flushPendingOps = async () => {
  const ops = getPendingOps();
  if (!ops || ops.length === 0) return { flushed: 0, failed: 0 };
  let flushed = 0;
  let failed = 0;
  const remaining = [];
  for (const op of ops) {
    try {
      if (op.type === "set") {
        const docRef = doc(db, op.collection, op.id);
        await setDoc(docRef, op.data, { merge: true });
        flushed++;
      } else if (op.type === "delete") {
        const docRef = doc(db, op.collection, op.id);
        await deleteDoc(docRef);
        flushed++;
      }
    } catch (err) {
      console.warn("[OfflineQueue] Error sincronizando op pendiente:", err);
      failed++;
      remaining.push(op);
    }
  }
  setPendingOps(remaining);
  if (flushed > 0) console.log(`[OfflineQueue] ✅ ${flushed} operaciones sincronizadas con Firebase.`);
  return { flushed, failed };
};

export const getPendingOpsCount = () => getPendingOps().length;

// ─── COMPROBACIÓN ACTIVA EN TIEMPO REAL DE CONEXIÓN A INTERNET (Heartbeat Ultra Rápido) ───
// Respuesta instantánea (< 1s) cuando se pierde o recupera la red
export const checkRealConnectivity = async () => {
  // 1. Detección inmediata a nivel de sistema operativo / navegador (0 ms)
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return false;
  }

  try {
    const controller = new AbortController();
    // Timeout ultra-rápido de 650ms (en condiciones normales 204 responde en 40-100ms)
    const timeout = setTimeout(() => controller.abort(), 650);

    await fetch(`https://www.gstatic.com/generate_204?_t=${Date.now()}`, {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal
    });
    clearTimeout(timeout);
    return true;
  } catch (_) {
    return false;
  }
};

// ─── CANAL DE COMUNICACIÓN EN TIEMPO REAL ENTRE PESTAÑAS (BroadcastChannel Singleton) ───
let _sharedSendChannel = null;
const getSendChannel = () => {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!_sharedSendChannel) {
    try {
      _sharedSendChannel = new BroadcastChannel("pos_system_sync_bus");
    } catch (_) {}
  }
  return _sharedSendChannel;
};

export const broadcastSync = (key, data) => {
  try {
    const bc = getSendChannel();
    if (bc) {
      bc.postMessage({ key, data, timestamp: Date.now() });
    }
  } catch (_) {}
};

export const onBroadcastSync = (callback) => {
  if (typeof BroadcastChannel !== "undefined") {
    try {
      const bc = new BroadcastChannel("pos_system_sync_bus");
      bc.onmessage = (event) => {
        if (event && event.data) {
          callback(event.data);
        }
      };
      return () => {
        try { bc.close(); } catch (_) {}
      };
    } catch (_) {}
  }
  return () => {};
};

// Helper de almacenamiento local seguro como respaldo inmediato
const getLocal = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
};

const setLocal = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`[Storage] Excepción en localStorage.setItem('${key}'):`, e);
    // Si la cuota de 5MB fue excedida, podar ventas antiguas en cache local para no bloquear la app
    if (e && (e.name === "QuotaExceededError" || e.code === 22 || e.code === 1014)) {
      try {
        if (key === "pos_sales" && Array.isArray(data)) {
          const pruned = data.slice(0, 150);
          localStorage.setItem(key, JSON.stringify(pruned));
        } else {
          const rawSales = localStorage.getItem("pos_sales");
          if (rawSales) {
            const parsedSales = JSON.parse(rawSales);
            if (Array.isArray(parsedSales) && parsedSales.length > 100) {
              localStorage.setItem("pos_sales", JSON.stringify(parsedSales.slice(0, 100)));
              localStorage.setItem(key, JSON.stringify(data));
            }
          }
        }
      } catch (innerErr) {
        console.warn("[Storage] No se pudo recuperar espacio en localStorage:", innerErr);
      }
    }
  }

  // Garantizar siempre la emisión de sincronización entre pestañas
  try {
    broadcastSync(key, data);
  } catch (_) {}
};

// Sanitizar datos para Firestore: elimina propiedades 'undefined' y valores 'NaN' que provocan excepciones en setDoc
export const sanitizeFirestoreData = (data) => {
  if (data === null || data === undefined) return null;
  if (typeof data === "number" && isNaN(data)) return 0;
  if (Array.isArray(data)) {
    return data
      .filter(item => item !== undefined)
      .map(item => {
        if (typeof item === "number" && isNaN(item)) return 0;
        return (typeof item === "object" && item !== null ? sanitizeFirestoreData(item) : item);
      });
  }
  if (typeof data === "object") {
    const res = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        if (typeof val === "number" && isNaN(val)) {
          res[key] = 0;
        } else if (typeof val === "object" && val !== null && !(val instanceof Date)) {
          res[key] = sanitizeFirestoreData(val);
        } else {
          res[key] = val;
        }
      }
    }
    return res;
  }
  return data;
};

// Deduplicar productos por código o ID para evitar que duplicados previos en Firestore ensucien el catálogo
export const deduplicateProducts = (productsList) => {
  if (!Array.isArray(productsList)) return [];
  const map = new Map();
  for (const prod of productsList) {
    if (!prod) continue;
    const codeKey = prod.codigo ? String(prod.codigo).trim() : null;
    const idKey = prod.id ? String(prod.id).trim() : null;
    const key = codeKey || idKey || `KEY-${Math.random()}`;

    if (!map.has(key)) {
      map.set(key, prod);
    } else {
      const existing = map.get(key);
      const existingTime = new Date(existing.updatedAt || existing.createdAt || existing.seededAt || 0).getTime();
      const prodTime = new Date(prod.updatedAt || prod.createdAt || prod.seededAt || 0).getTime();
      // Si el nuevo tiene fecha más reciente o conserva id canónico, priorizar el más actualizado
      if (prodTime >= existingTime) {
        map.set(key, { ...existing, ...prod });
      }
    }
  }
  return Array.from(map.values());
};

// ------------------- PRODUCTOS -------------------
export const fetchProducts = async () => {
  try {
    const colRef = collection(db, PRODUCTS_COLLECTION);
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const cleanList = deduplicateProducts(list);
      setLocal("pos_products", cleanList);
      return cleanList;
    }
  } catch (err) {
    console.warn("Firestore fetch error, usando respaldo local:", err);
  }
  const initialProducts = await getInitialProducts();
  const fallback = deduplicateProducts(getLocal("pos_products", initialProducts));
  return fallback;
};

// Suscripción en tiempo real a productos (actualiza UI automáticamente)
export const subscribeToProducts = (callback) => {
  try {
    const colRef = collection(db, PRODUCTS_COLLECTION);
    const unsub = onSnapshot(colRef, (snapshot) => {
      if (!snapshot.empty) {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const cleanList = deduplicateProducts(list);
        setLocal("pos_products", cleanList);
        callback(cleanList);
      }
    }, (err) => {
      console.warn("[Realtime] Error en listener de productos:", err);
      // En caso de error, devolver datos locales
      const localList = getLocal("pos_products", []);
      if (localList.length > 0) callback(localList);
    });
    return unsub;
  } catch (err) {
    console.warn("[Realtime] No se pudo iniciar listener de productos:", err);
    return () => {};
  }
};

// Suscripción en tiempo real a ventas (últimas 200)
export const subscribeToSales = (callback, limitCount = 200) => {
  try {
    const colRef = collection(db, SALES_COLLECTION);
    const q = query(colRef, orderBy("fecha", "desc"), limit(limitCount));
    const unsub = onSnapshot(q, (snapshot) => {
      // Deduplicar por ID para evitar registros repetidos cuando el optimistic update
      // y el listener de Firestore disparan al mismo tiempo
      const seen = new Set();
      const list = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(s => {
          if (seen.has(s.id)) return false;
          seen.add(s.id);
          return true;
        });
      setLocal("pos_sales", list);
      callback(list);
    }, (err) => {
      console.warn("[Realtime] Error en listener de ventas:", err);
      callback(getLocal("pos_sales", []));
    });
    return unsub;
  } catch (err) {
    console.warn("[Realtime] No se pudo iniciar listener de ventas:", err);
    return () => {};
  }
};

// Suscripción en tiempo real a clientes
export const subscribeToClients = (callback) => {
  try {
    const colRef = collection(db, CLIENTS_COLLECTION);
    const unsub = onSnapshot(colRef, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setLocal("pos_clients", list);
      callback(list);
    }, (err) => {
      console.warn("[Realtime] Error en listener de clientes:", err);
      callback(getLocal("pos_clients", []));
    });
    return unsub;
  } catch (err) {
    console.warn("[Realtime] No se pudo iniciar listener de clientes:", err);
    return () => {};
  }
};

export const saveProduct = async (product) => {
  const initialProducts = await getInitialProducts();
  const current = getLocal("pos_products", initialProducts);

  // Buscar si ya existe por ID, código o legacyId
  const existingIndex = current.findIndex(p => {
    if (product.id && p.id && String(p.id).trim() === String(product.id).trim()) return true;
    if (product.codigo && p.codigo && String(p.codigo).trim() === String(product.codigo).trim()) return true;
    if (product.legacyId && p.legacyId && Number(p.legacyId) === Number(product.legacyId)) return true;
    return false;
  });

  const existingProd = existingIndex >= 0 ? current[existingIndex] : null;
  const isNew = !existingProd;
  const now = new Date().toISOString();

  // ID canónico y seguro
  const prodId = product.id || existingProd?.id || (product.codigo ? `PROD-${String(product.codigo).trim()}` : `PROD-${Date.now()}`);

  // Base timestamp histórica para catálogo SQL: 1 de enero de 2024
  const baseLegacyTime = 1704067200000;
  const numLegacy = Number(product.legacyId || existingProd?.legacyId);
  const legacyCreatedAt = (!isNaN(numLegacy) && numLegacy > 0)
    ? new Date(baseLegacyTime + numLegacy * 60000).toISOString()
    : null;

  // Fecha de creación:
  // 1. Si el producto entrante trae createdAt, usarlo.
  // 2. Si ya existía y tenía createdAt, conservarlo.
  // 3. Si es un producto nuevo creado ahora, usar `now`.
  // 4. Si es del catálogo legacy, usar su fecha base legacy.
  const resolvedCreatedAt = product.createdAt 
    || (existingProd && (existingProd.createdAt || existingProd.fechaCreacion || existingProd.seededAt))
    || (isNew ? now : (legacyCreatedAt || now));

  const rawProdData = {
    ...(existingProd || {}),
    ...product,
    id: prodId,
    updatedAt: now,
    createdAt: resolvedCreatedAt
  };

  const prodData = sanitizeFirestoreData(rawProdData);

  // Guardar en Firestore (con soporte offline: si falla, encola para sincronizar al volver)
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, prodId);
    await setDoc(docRef, prodData, { merge: true });
    console.log("✅ Producto sincronizado con Firestore:", prodId);
  } catch (err) {
    console.warn("⚠️ Sin conexión. Producto encolado para sincronizar después:", prodId);
    enqueuePendingOp({ type: "set", collection: PRODUCTS_COLLECTION, id: prodId, data: prodData });
  }

  // Sincronizar respaldo local
  if (existingIndex >= 0) {
    current[existingIndex] = prodData;
  } else {
    current.unshift(prodData);
  }
  const cleanList = deduplicateProducts(current);
  setLocal("pos_products", cleanList);
  return prodData;
};

export const deleteProductById = async (id) => {
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Error eliminando en Firestore:", err);
  }
  const initialProducts = await getInitialProducts();
  const current = getLocal("pos_products", initialProducts).filter(p => p.id !== id);
  setLocal("pos_products", current);
};

export const seedDatabaseFromSql = async (onProgress) => {
  let added = 0;
  let skipped = 0;
  const initialJson = await getInitialProducts();
  const localList = getLocal("pos_products", []);

  // Combinar productos locales y catálogo JSON sin duplicados
  const combined = deduplicateProducts([...localList, ...initialJson]);
  const allCatalog = combined.length > 0 ? combined : initialJson;

  try {
    const now = new Date().toISOString();
    const baseLegacyTime = 1704067200000; // 2024-01-01T00:00:00.000Z

    // Preparar y sanitizar cada producto
    const preparedProducts = allCatalog.map((prod, idx) => {
      const docId = prod.id || (prod.codigo ? `PROD-${String(prod.codigo).trim()}` : `PROD-${prod.legacyId || idx + 1}`);
      const numLegacy = Number(prod.legacyId);
      const legacyCreatedAt = (!isNaN(numLegacy) && numLegacy > 0)
        ? new Date(baseLegacyTime + numLegacy * 60000).toISOString()
        : new Date(baseLegacyTime + (idx + 1) * 60000).toISOString();

      const createdAt = prod.createdAt || prod.fechaCreacion || prod.seededAt || (prod.legacyId ? legacyCreatedAt : now);

      return sanitizeFirestoreData({
        ...prod,
        id: docId,
        createdAt,
        updatedAt: prod.updatedAt || createdAt,
        seededAt: prod.seededAt || now
      });
    });

    if (preparedProducts.length === 0) {
      if (onProgress) onProgress(100);
      return { total: 0, added: 0, skipped: 0 };
    }

    // Subir en lotes de 50 documentos con merge:true
    const chunkSize = 50;
    for (let i = 0; i < preparedProducts.length; i += chunkSize) {
      const batch = writeBatch(db);
      const chunk = preparedProducts.slice(i, i + chunkSize);

      chunk.forEach(prod => {
        const docRef = doc(db, PRODUCTS_COLLECTION, prod.id);
        batch.set(docRef, prod, { merge: true });
      });

      await batch.commit();
      added += chunk.length;
      if (onProgress) onProgress(Math.round((added / preparedProducts.length) * 100));
    }

    // Refrescar caché local desde Firestore
    try {
      const colRef2 = collection(db, PRODUCTS_COLLECTION);
      const updatedSnapshot = await getDocs(colRef2);
      if (!updatedSnapshot.empty) {
        const allProducts = updatedSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const cleanList = deduplicateProducts(allProducts);
        setLocal("pos_products", cleanList);
        return { total: preparedProducts.length, added: cleanList.length, skipped };
      }
    } catch (_) { }

    return { total: preparedProducts.length, added, skipped };
  } catch (err) {
    console.error("Error al sembrar datos en Firestore:", err);
    return { total: allCatalog.length, added, skipped, error: err.message };
  }
};

// ------------------- ALQUILER DE SILLAS Y MOBILIARIO -------------------
export const fetchRentals = async () => {
  try {
    const colRef = collection(db, RENTALS_COLLECTION);
    const snapshot = await getDocs(query(colRef, orderBy("fechaInicio", "desc")));
    if (!snapshot.empty) {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLocal("pos_rentals", list);
      return list;
    }
  } catch (err) {
    console.warn("Firestore rentals error:", err);
  }
  return getLocal("pos_rentals", [
    {
      id: "ALQ-DEMO-1",
      clienteNombre: "Claudia Martínez",
      clienteTelefono: "3124567890",
      item: "Sillas Alquiler",
      cantidad: 15,
      precioTotal: 22500,
      deposito: 20000,
      fechaInicio: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(), // Hace 26 horas (Vencido!)
      duracionHoras: 24,
      estado: "vencido", // 'activo', 'vencido', 'devuelto'
      observaciones: "Alquiler para fiesta de cumpleaños familiar"
    },
    {
      id: "ALQ-DEMO-2",
      clienteNombre: "Carlos Gómez",
      clienteTelefono: "3158901234",
      item: "Sillas Alquiler + Mesa",
      cantidad: 10,
      precioTotal: 25000,
      deposito: 30000,
      fechaInicio: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), // Hace 10 horas (Activo)
      duracionHoras: 24,
      estado: "activo",
      observaciones: "Devuelve mañana en la mañana"
    }
  ]);
};

export const saveRental = async (rental) => {
  const rentalId = rental.id || `ALQ-${Date.now()}`;
  const rentalData = {
    ...rental,
    id: rentalId,
    fechaInicio: rental.fechaInicio || new Date().toISOString(),
    duracionHoras: rental.duracionHoras || 24,
    estado: rental.estado || "activo"
  };

  try {
    const docRef = doc(db, RENTALS_COLLECTION, rentalId);
    await setDoc(docRef, rentalData, { merge: true });
  } catch (err) {
    console.warn("Error guardando alquiler en Firestore:", err);
  }

  const current = getLocal("pos_rentals", []);
  const index = current.findIndex(r => r.id === rentalId);
  if (index >= 0) {
    current[index] = rentalData;
  } else {
    current.unshift(rentalData);
  }
  setLocal("pos_rentals", current);
  return rentalData;
};

export const deleteRentalById = async (rentalId) => {
  try {
    const docRef = doc(db, RENTALS_COLLECTION, rentalId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Error eliminando alquiler en Firestore:", err);
  }
  const current = getLocal("pos_rentals", []);
  const updated = current.filter(r => r.id !== rentalId);
  setLocal("pos_rentals", updated);
  return updated;
};

export const deleteMultipleRentals = async (rentalIds) => {
  if (!rentalIds || rentalIds.length === 0) return [];
  try {
    const batch = writeBatch(db);
    rentalIds.forEach(id => {
      const docRef = doc(db, RENTALS_COLLECTION, id);
      batch.delete(docRef);
    });
    await batch.commit();
  } catch (err) {
    console.warn("Error eliminando alquileres por lote en Firestore:", err);
  }
  const current = getLocal("pos_rentals", []);
  const idSet = new Set(rentalIds);
  const updated = current.filter(r => !idSet.has(r.id));
  setLocal("pos_rentals", updated);
  return updated;
};

// Suscripción en tiempo real a alquileres (se actualiza automáticamente en todas las sesiones)
export const subscribeToRentals = (callback) => {
  try {
    const colRef = collection(db, RENTALS_COLLECTION);
    const unsub = onSnapshot(colRef, (snapshot) => {
      if (!snapshot.empty) {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => new Date(b.fechaInicio || 0) - new Date(a.fechaInicio || 0));
        setLocal("pos_rentals", list);
        callback(list);
      } else {
        const local = getLocal("pos_rentals", []);
        callback(local);
      }
    }, (err) => {
      console.warn("[Realtime] Error en listener de alquileres:", err);
      callback(getLocal("pos_rentals", []));
    });
    return unsub;
  } catch (err) {
    console.warn("[Realtime] No se pudo iniciar listener de alquileres:", err);
    return () => {};
  }
};

// ------------------- SEGUROS ESCOLARES -------------------
export const fetchInsurances = async () => {
  try {
    const colRef = collection(db, INSURANCES_COLLECTION);
    const snapshot = await getDocs(query(colRef, orderBy("fechaRegistro", "desc")));
    if (!snapshot.empty) {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLocal("pos_insurances", list);
      return list;
    }
  } catch (err) {
    console.warn("Firestore insurances error:", err);
  }
  return getLocal("pos_insurances", []);
};

export const saveInsurance = async (insurance) => {
  const insuranceId = insurance.id || `SEG-${Date.now()}`;
  const insuranceData = {
    ...insurance,
    id: insuranceId,
    fechaRegistro: insurance.fechaRegistro || new Date().toISOString(),
    reportado: Boolean(insurance.reportado),
    fechaReporte: insurance.fechaReporte || null,
    loteReporte: insurance.loteReporte || null
  };

  try {
    const docRef = doc(db, INSURANCES_COLLECTION, insuranceId);
    await setDoc(docRef, insuranceData, { merge: true });
  } catch (err) {
    console.warn("Error guardando seguro escolar en Firestore:", err);
    enqueuePendingOp({ type: "set", collection: INSURANCES_COLLECTION, id: insuranceId, data: insuranceData });
  }

  const current = getLocal("pos_insurances", []);
  const index = current.findIndex(s => s.id === insuranceId);
  if (index >= 0) {
    current[index] = insuranceData;
  } else {
    current.unshift(insuranceData);
  }
  setLocal("pos_insurances", current);
  broadcastSync("insurances_updated", insuranceData);
  return insuranceData;
};

export const deleteInsuranceById = async (insuranceId) => {
  try {
    const docRef = doc(db, INSURANCES_COLLECTION, insuranceId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Error eliminando seguro escolar en Firestore:", err);
    enqueuePendingOp({ type: "delete", collection: INSURANCES_COLLECTION, id: insuranceId });
  }
  const current = getLocal("pos_insurances", []);
  const updated = current.filter(s => s.id !== insuranceId);
  setLocal("pos_insurances", updated);
  broadcastSync("insurances_deleted", insuranceId);
  return updated;
};

export const deleteMultipleInsurances = async (insuranceIds) => {
  if (!insuranceIds || insuranceIds.length === 0) return [];
  try {
    const batch = writeBatch(db);
    insuranceIds.forEach(id => {
      const docRef = doc(db, INSURANCES_COLLECTION, id);
      batch.delete(docRef);
    });
    await batch.commit();
  } catch (err) {
    console.warn("Error eliminando seguros escolares por lote en Firestore:", err);
  }
  const current = getLocal("pos_insurances", []);
  const idSet = new Set(insuranceIds);
  const updated = current.filter(s => !idSet.has(s.id));
  setLocal("pos_insurances", updated);
  broadcastSync("insurances_bulk_deleted", insuranceIds);
  return updated;
};

export const markInsurancesAsReported = async (insuranceIds, loteNombre = "") => {
  if (!insuranceIds || insuranceIds.length === 0) return [];
  const now = new Date().toISOString();
  const lote = loteNombre || `Reporte-${new Date().toLocaleDateString('es-CO').replace(/\//g, '-')}-${Date.now().toString().slice(-4)}`;

  try {
    const batch = writeBatch(db);
    insuranceIds.forEach(id => {
      const docRef = doc(db, INSURANCES_COLLECTION, id);
      batch.update(docRef, {
        reportado: true,
        fechaReporte: now,
        loteReporte: lote
      });
    });
    await batch.commit();
  } catch (err) {
    console.warn("Error marcando seguros como reportados en Firestore:", err);
  }

  const current = getLocal("pos_insurances", []);
  const idSet = new Set(insuranceIds);
  const updated = current.map(s => {
    if (idSet.has(s.id)) {
      return {
        ...s,
        reportado: true,
        fechaReporte: now,
        loteReporte: lote
      };
    }
    return s;
  });
  setLocal("pos_insurances", updated);
  broadcastSync("insurances_reported", { ids: insuranceIds, lote });
  return updated;
};

export const subscribeToInsurances = (callback) => {
  try {
    const colRef = collection(db, INSURANCES_COLLECTION);
    const unsub = onSnapshot(colRef, (snapshot) => {
      if (!snapshot.empty) {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => new Date(b.fechaRegistro || 0) - new Date(a.fechaRegistro || 0));
        setLocal("pos_insurances", list);
        callback(list);
      } else {
        const local = getLocal("pos_insurances", []);
        callback(local);
      }
    }, (err) => {
      console.warn("[Realtime] Error en listener de seguros escolares:", err);
      callback(getLocal("pos_insurances", []));
    });
    return unsub;
  } catch (err) {
    console.warn("[Realtime] No se pudo iniciar listener de seguros escolares:", err);
    return () => {};
  }
};

// ------------------- VENTAS -------------------
export const fetchSales = async (limitCount = 200) => {
  try {
    const colRef = collection(db, SALES_COLLECTION);
    const q = limitCount > 0 
      ? query(colRef, orderBy("fecha", "desc"), limit(limitCount))
      : query(colRef, orderBy("fecha", "desc"));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLocal("pos_sales", list);
      return list;
    }
  } catch (err) {
    console.warn("Firestore sales error:", err);
  }
  return getLocal("pos_sales", []);
};

export const recordSale = async (sale) => {
  const saleId = sale.id || `VTA-${Date.now()}`;
  const rawSaleData = {
    ...sale,
    id: saleId,
    fecha: sale.fecha || new Date().toISOString()
  };
  const saleData = sanitizeFirestoreData(rawSaleData);

  try {
    const docRef = doc(db, SALES_COLLECTION, saleId);
    await setDoc(docRef, saleData);
    console.log("✅ Venta registrada en Firestore con éxito:", saleId);
  } catch (err) {
    console.warn("⚠️ Error registrando venta en Firestore (offline/reintento):", err);
    enqueuePendingOp({ type: "set", collection: SALES_COLLECTION, id: saleId, data: saleData });
  }

  const current = getLocal("pos_sales", []);
  const updated = [saleData, ...current.filter(s => s.id !== saleId)];
  setLocal("pos_sales", updated);
  broadcastSync("pos_sales", updated);
  return saleData;
};

export const recordSaleWithStockBatch = async (sale, updatedProductsList = []) => {
  const saleId = sale.id || `VTA-${Date.now()}`;
  const rawSaleData = {
    ...sale,
    id: saleId,
    fecha: sale.fecha || new Date().toISOString()
  };
  const saleData = sanitizeFirestoreData(rawSaleData);

  // 1. Ejecución atómica en Firestore con writeBatch
  try {
    const batch = writeBatch(db);
    const saleDocRef = doc(db, SALES_COLLECTION, saleId);
    batch.set(saleDocRef, saleData);

    for (const prod of updatedProductsList) {
      if (prod && (prod.id || prod.codigo)) {
        const prodId = String(prod.id || (prod.codigo ? `PROD-${String(prod.codigo).trim()}` : `PROD-${Date.now()}`));
        const prodDocRef = doc(db, PRODUCTS_COLLECTION, prodId);
        batch.set(prodDocRef, sanitizeFirestoreData({ ...prod, id: prodId, updatedAt: new Date().toISOString() }), { merge: true });
      }
    }

    await batch.commit();
    console.log(`✅ [writeBatch] Venta ${saleId} y ${updatedProductsList.length} producto(s) sincronizados atómicamente en Firestore.`);
  } catch (err) {
    console.warn("⚠️ Error en batch Firestore (modo offline / encolando):", err);
    enqueuePendingOp({ type: "set", collection: SALES_COLLECTION, id: saleId, data: saleData });
    for (const prod of updatedProductsList) {
      if (prod && (prod.id || prod.codigo)) {
        const prodId = String(prod.id || (prod.codigo ? `PROD-${String(prod.codigo).trim()}` : `PROD-${Date.now()}`));
        enqueuePendingOp({ 
          type: "set", 
          collection: PRODUCTS_COLLECTION, 
          id: prodId, 
          data: sanitizeFirestoreData({ ...prod, id: prodId, updatedAt: new Date().toISOString() }) 
        });
      }
    }
  }

  // 2. Actualizar almacenamiento local una sola vez (alto rendimiento / 0 latencia)
  const currentSales = getLocal("pos_sales", []);
  const updatedSales = [saleData, ...currentSales.filter(s => s.id !== saleId)];
  setLocal("pos_sales", updatedSales);

  if (updatedProductsList.length > 0) {
    const currentProducts = getLocal("pos_products", []);
    const updatedMap = new Map();
    updatedProductsList.forEach(p => {
      if (p.id) updatedMap.set(String(p.id).trim(), p);
      if (p.codigo) updatedMap.set(String(p.codigo).trim(), p);
    });

    const nextProducts = currentProducts.map(p => {
      const match = (p.id && updatedMap.get(String(p.id).trim())) || (p.codigo && updatedMap.get(String(p.codigo).trim()));
      return match ? { ...p, ...match } : p;
    });
    setLocal("pos_products", nextProducts);
  }

  return saleData;
};

export const updateSale = recordSale;

export const deleteSaleById = async (saleId) => {
  try {
    const docRef = doc(db, SALES_COLLECTION, String(saleId));
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Error eliminando venta en Firestore:", err);
    enqueuePendingOp({ type: "delete", collection: SALES_COLLECTION, id: String(saleId) });
  }
  const current = getLocal("pos_sales", []);
  const updated = current.filter(s => s.id !== saleId);
  setLocal("pos_sales", updated);
  broadcastSync("pos_sales", updated);
  return updated;
};

// ------------------- MERMAS / BAJAS DE INVENTARIO -------------------
export const fetchMermas = async () => {
  try {
    const colRef = collection(db, MERMAS_COLLECTION);
    const q = query(colRef, orderBy("fecha", "desc"), limit(200));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLocal("pos_mermas_log", list);
      return list;
    }
  } catch (err) {
    console.warn("Firestore mermas error:", err);
  }
  return getLocal("pos_mermas_log", []);
};

export const saveMerma = async (merma) => {
  const mermaId = merma.id || `MRM-${Date.now()}`;
  const rawData = {
    ...merma,
    id: mermaId,
    fecha: merma.fecha || new Date().toISOString()
  };
  const mermaData = sanitizeFirestoreData(rawData);

  try {
    const docRef = doc(db, MERMAS_COLLECTION, mermaId);
    await setDoc(docRef, mermaData);
  } catch (err) {
    console.warn("Error guardando merma en Firestore (offline queue):", err);
    enqueuePendingOp({ type: "set", collection: MERMAS_COLLECTION, id: mermaId, data: mermaData });
  }

  const current = getLocal("pos_mermas_log", []);
  const updated = [mermaData, ...current.filter(m => m.id !== mermaId)];
  setLocal("pos_mermas_log", updated);
  broadcastSync("pos_mermas_log", updated);
  return mermaData;
};

export const deleteMermaById = async (mermaId) => {
  try {
    const docRef = doc(db, MERMAS_COLLECTION, String(mermaId));
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Error eliminando merma en Firestore:", err);
    enqueuePendingOp({ type: "delete", collection: MERMAS_COLLECTION, id: String(mermaId) });
  }
  const current = getLocal("pos_mermas_log", []);
  const updated = current.filter(m => m.id !== mermaId);
  setLocal("pos_mermas_log", updated);
  broadcastSync("pos_mermas_log", updated);
  return updated;
};

export const clearAllMermas = async () => {
  try {
    const colRef = collection(db, MERMAS_COLLECTION);
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (err) {
    console.warn("Error limpiando mermas en Firestore:", err);
  }
  setLocal("pos_mermas_log", []);
  broadcastSync("pos_mermas_log", []);
};

export const subscribeToMermas = (callback) => {
  try {
    const colRef = collection(db, MERMAS_COLLECTION);
    const q = query(colRef, orderBy("fecha", "desc"), limit(200));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setLocal("pos_mermas_log", list);
      callback(list);
    }, (err) => {
      console.warn("[Realtime] Error en listener de mermas:", err);
      callback(getLocal("pos_mermas_log", []));
    });
    return unsub;
  } catch (err) {
    console.warn("[Realtime] No se pudo iniciar listener de mermas:", err);
    return () => {};
  }
};

// ------------------- CLIENTES -------------------
export const fetchClients = async () => {
  try {
    const colRef = collection(db, CLIENTS_COLLECTION);
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLocal("pos_clients", list);
      return list;
    }
  } catch (err) {
    console.warn("Firestore clients error:", err);
  }
  return getLocal("pos_clients", INITIAL_CLIENTS);
};

export const saveClient = async (client) => {
  const clientId = client.id || `CLI-${Date.now()}`;
  const clientData = { ...client, id: clientId };
  try {
    const docRef = doc(db, CLIENTS_COLLECTION, clientId);
    await setDoc(docRef, clientData, { merge: true });
  } catch (err) {
    console.warn("Error guardando cliente:", err);
  }
  const current = getLocal("pos_clients", INITIAL_CLIENTS);
  const idx = current.findIndex(c => c.id === clientId || c.dni === client.dni);
  if (idx >= 0) current[idx] = clientData;
  else current.unshift(clientData);
  setLocal("pos_clients", current);
  return clientData;
};

// ------------------- CONFIGURACIÓN -------------------
export const fetchStoreConfig = async () => {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, "general");
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      const merged = { ...STORE_CONFIG, ...data };
      setLocal("pos_store_config", merged);
      return merged;
    }
  } catch (err) {
    console.warn("Error leyendo configuración de tienda de Firestore:", err);
  }
  return getLocal("pos_store_config", STORE_CONFIG);
};

export const getStoreConfig = () => {
  return getLocal("pos_store_config", STORE_CONFIG);
};

export const saveStoreConfig = async (newConfig) => {
  const cleanData = sanitizeFirestoreData(newConfig);
  // 1. Inmediatamente actualizar estado local y pestañas
  setLocal("pos_store_config", cleanData);
  broadcastSync("pos_store_config", cleanData);

  // 2. Persistir en Firestore
  try {
    const docRef = doc(db, CONFIG_COLLECTION, "general");
    await setDoc(docRef, cleanData, { merge: true });
    console.log("✅ Configuración de comercio guardada en Firestore");
  } catch (err) {
    console.warn("⚠️ Error guardando configuración en Firestore (offline/reintento):", err);
    enqueuePendingOp({ type: "set", collection: CONFIG_COLLECTION, id: "general", data: cleanData });
  }
  return cleanData;
};

// Suscripción en tiempo real a la configuración del comercio
export const subscribeToStoreConfig = (callback) => {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, "general");
    const unsub = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const merged = { ...STORE_CONFIG, ...snapshot.data() };
        setLocal("pos_store_config", merged);
        callback(merged);
      }
    }, (err) => {
      console.warn("[Realtime] Error en listener de configuración:", err);
      callback(getLocal("pos_store_config", STORE_CONFIG));
    });
    return unsub;
  } catch (err) {
    console.warn("[Realtime] No se pudo iniciar listener de config:", err);
    return () => {};
  }
};

// ------------------- CAJA Y ARQUEO DE TURNOS -------------------
const SHIFTS_COLLECTION = "turnos_caja";
const MOVEMENTS_COLLECTION = "movimientos_caja";
const CLOSINGS_COLLECTION = "cierres_caja";

// Comprobar si el usuario actual es el titular que abrió el turno de caja
export const isShiftOwner = (shift, user) => {
  if (!shift || !user) return false;
  if (shift.cajeroId && user.id && String(shift.cajeroId) === String(user.id)) return true;
  if (shift.cajeroCorreo && user.correo && shift.cajeroCorreo.toLowerCase() === user.correo.toLowerCase()) return true;
  if (shift.cajero && user.nombre && shift.cajero.trim().toLowerCase() === user.nombre.trim().toLowerCase()) return true;
  return false;
};

// Suscribirse a cambios en tiempo real del turno activo
export const subscribeToActiveShift = (callback) => {
  try {
    const colRef = collection(db, SHIFTS_COLLECTION);
    const unsub = onSnapshot(colRef, (snapshot) => {
      if (!snapshot.empty) {
        const active = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .find(s => s.estado === "abierto");
        if (active) {
          setLocal("pos_active_shift", active);
          callback(active);
          return;
        }
      }
      setLocal("pos_active_shift", null);
      callback(null);
    }, (err) => {
      console.warn("Error en realtime listener de turnos:", err);
    });
    return unsub;
  } catch (err) {
    console.warn("No se pudo iniciar listener realtime:", err);
    return () => {};
  }
};

// Obtener el turno activo actual
export const getActiveShift = async () => {
  try {
    const colRef = collection(db, SHIFTS_COLLECTION);
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const active = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .find(s => s.estado === "abierto");
      if (active) {
        setLocal("pos_active_shift", active);
        return active;
      } else {
        // En Firestore todos los turnos están cerrados: limpiar local storage
        setLocal("pos_active_shift", null);
        return null;
      }
    } else {
      setLocal("pos_active_shift", null);
      return null;
    }
  } catch (err) {
    console.warn("Error leyendo turno activo de Firestore:", err);
  }
  return getLocal("pos_active_shift", null);
};

// Reasignar titular de un turno activo (ej. Administrador que toma control del turno)
export const reassignShiftOwner = async (shiftId, newOwner) => {
  const isObj = typeof newOwner === "object" && newOwner !== null;
  const cajeroName = isObj ? (newOwner.nombre || newOwner.name || "Usuario") : (newOwner || "Usuario");
  const cajeroId = isObj ? (newOwner.id || null) : null;
  const cajeroRol = isObj ? (newOwner.rol || "Administrador") : "Administrador";
  const cajeroCorreo = isObj ? (newOwner.correo || null) : null;

  const updatePayload = {
    cajero: cajeroName,
    cajeroId,
    cajeroRol,
    cajeroCorreo,
    reassignedAt: new Date().toISOString()
  };

  try {
    if (shiftId) {
      const shiftRef = doc(db, SHIFTS_COLLECTION, shiftId);
      await setDoc(shiftRef, updatePayload, { merge: true });
    }
  } catch (err) {
    console.warn("Error reasignando titular en Firestore:", err);
  }

  const currentLocal = getLocal("pos_active_shift", null);
  const merged = currentLocal ? { ...currentLocal, ...updatePayload } : updatePayload;
  setLocal("pos_active_shift", merged);
  return merged;
};

// Abrir un nuevo turno de caja con base inicial (valida estrictamente si ya hay otra caja abierta)
export const openShift = async ({ cajero, baseInicial = 0, notas = "" }) => {
  // 1. Validar si ya existe un turno abierto en el sistema
  const existingShift = await getActiveShift();
  if (existingShift && existingShift.estado === "abierto") {
    const error = new Error(`El usuario "${existingShift.cajero}" tiene la caja abierta en su sesión. Comunícate con él para que cierre la caja y te permita abrir turno.`);
    error.activeShift = existingShift;
    throw error;
  }

  const shiftId = `TURNO-${Date.now()}`;
  const now = new Date().toISOString();

  const isObj = typeof cajero === "object" && cajero !== null;
  const cajeroName = isObj ? (cajero.nombre || cajero.name || "Cajero") : (cajero || "Cajero");
  const cajeroId = isObj ? (cajero.id || null) : null;
  const cajeroRol = isObj ? (cajero.rol || null) : null;
  const cajeroCorreo = isObj ? (cajero.correo || null) : null;

  const shiftData = {
    id: shiftId,
    cajero: cajeroName,
    cajeroId: cajeroId,
    cajeroRol: cajeroRol,
    cajeroCorreo: cajeroCorreo,
    baseInicial: Number(baseInicial) || 0,
    fechaApertura: now,
    estado: "abierto", // "abierto" | "cerrado"
    notasApertura: notas || "",
    movimientos: []
  };

  try {
    const docRef = doc(db, SHIFTS_COLLECTION, shiftId);
    await setDoc(docRef, shiftData);
  } catch (err) {
    console.warn("Error guardando apertura de turno en Firestore:", err);
  }

  setLocal("pos_active_shift", shiftData);
  broadcastSync("pos_active_shift", shiftData);
  return shiftData;
};

// Registrar un movimiento de dinero en caja (Ingreso adicional o Egreso/Gasto)
export const addCashMovement = async ({ shiftId, tipo, monto, motivo, cajero }) => {
  const currentShift = getLocal("pos_active_shift", null);
  const existingMovs = currentShift?.movimientos || [];
  
  // Guardia contra envíos dobles idénticos (dentro de 15 segundos)
  const isDuplicate = existingMovs.some(m => {
    const diff = Math.abs(Date.now() - new Date(m.fecha || 0).getTime());
    return diff < 15000 &&
      m.tipo === (tipo === "ingreso" ? "ingreso" : "egreso") &&
      Number(m.monto) === Number(monto) &&
      String(m.motivo || "").trim().toLowerCase() === String(motivo || "").trim().toLowerCase();
  });

  if (isDuplicate) {
    console.warn("⚠️ Movimiento de caja duplicado ignorado (doble click evitado).");
    return existingMovs[existingMovs.length - 1];
  }

  const movId = `MOV-${Date.now()}`;
  const now = new Date().toISOString();
  const movData = {
    id: movId,
    shiftId: shiftId || "general",
    tipo: tipo === "ingreso" ? "ingreso" : "egreso",
    monto: Number(monto) || 0,
    motivo: motivo || "Movimiento de caja",
    cajero: cajero?.nombre || cajero || "Cajero",
    fecha: now
  };

  // 1. Actualizar estado local y sincronizar pestañas AL INSTANTE (0 ms)
  const updatedMovs = [...existingMovs, movData];
  if (currentShift && (!shiftId || currentShift.id === shiftId)) {
    const updatedShift = { ...currentShift, movimientos: updatedMovs };
    setLocal("pos_active_shift", updatedShift);
    broadcastSync("pos_active_shift", updatedShift);
  }

  const allMovs = getLocal("pos_cash_movements", []);
  allMovs.unshift(movData);
  setLocal("pos_cash_movements", allMovs);

  // 2. Persistir en Firestore en paralelo y en segundo plano sin bloquear la UI
  const targetShiftId = (shiftId && shiftId !== "general") ? shiftId : currentShift?.id;
  Promise.all([
    (async () => {
      try {
        const docRef = doc(db, MOVEMENTS_COLLECTION, movId);
        await setDoc(docRef, movData);
      } catch (err) {
        console.warn("Error guardando movimiento de caja en Firestore:", err);
        enqueuePendingOp({ type: "set", collection: MOVEMENTS_COLLECTION, id: movId, data: movData });
      }
    })(),
    (async () => {
      if (targetShiftId) {
        try {
          const shiftRef = doc(db, SHIFTS_COLLECTION, targetShiftId);
          await setDoc(shiftRef, { movimientos: updatedMovs }, { merge: true });
        } catch (e) {
          console.warn("Error sincronizando movimiento en turno de Firestore:", e);
        }
      }
    })()
  ]).catch(err => {
    console.warn("Error en sincronización en segundo plano de movimientos:", err);
  });

  return movData;
};

// Eliminar un movimiento manual de caja (actualiza el turno y Firestore)
export const deleteCashMovement = async (shiftId, movementId) => {
  const currentShift = getLocal("pos_active_shift", null);
  const targetShiftId = (shiftId && shiftId !== "general") ? shiftId : currentShift?.id;

  // 1. Actualizar estado local del turno activo
  let updatedMovs = [];
  if (currentShift) {
    updatedMovs = (currentShift.movimientos || []).filter(m => m.id !== movementId);
    const updatedShift = { ...currentShift, movimientos: updatedMovs };
    setLocal("pos_active_shift", updatedShift);
    broadcastSync("pos_active_shift", updatedShift);
  }

  // 2. Actualizar lista general de movimientos
  const allMovs = getLocal("pos_cash_movements", []).filter(m => m.id !== movementId);
  setLocal("pos_cash_movements", allMovs);

  // 3. Persistir en Firestore en segundo plano
  Promise.all([
    (async () => {
      try {
        const docRef = doc(db, MOVEMENTS_COLLECTION, movementId);
        await deleteDoc(docRef);
      } catch (err) {
        console.warn("Error eliminando movimiento en Firestore:", err);
      }
    })(),
    (async () => {
      if (targetShiftId) {
        try {
          const shiftRef = doc(db, SHIFTS_COLLECTION, targetShiftId);
          await setDoc(shiftRef, { movimientos: updatedMovs }, { merge: true });
        } catch (e) {
          console.warn("Error actualizando turno en Firestore tras eliminar movimiento:", e);
        }
      }
    })()
  ]).catch(console.warn);

  return updatedMovs;
};

// Editar un movimiento manual de caja
export const updateCashMovement = async (shiftId, updatedMovement) => {
  const currentShift = getLocal("pos_active_shift", null);
  const targetShiftId = (shiftId && shiftId !== "general") ? shiftId : currentShift?.id;

  // 1. Actualizar estado local del turno activo
  let updatedMovs = [];
  if (currentShift) {
    updatedMovs = (currentShift.movimientos || []).map(m => m.id === updatedMovement.id ? { ...m, ...updatedMovement } : m);
    const updatedShift = { ...currentShift, movimientos: updatedMovs };
    setLocal("pos_active_shift", updatedShift);
    broadcastSync("pos_active_shift", updatedShift);
  }

  // 2. Actualizar lista general de movimientos
  const allMovs = getLocal("pos_cash_movements", []).map(m => m.id === updatedMovement.id ? { ...m, ...updatedMovement } : m);
  setLocal("pos_cash_movements", allMovs);

  // 3. Persistir en Firestore en segundo plano
  Promise.all([
    (async () => {
      try {
        const docRef = doc(db, MOVEMENTS_COLLECTION, updatedMovement.id);
        await setDoc(docRef, updatedMovement, { merge: true });
      } catch (err) {
        console.warn("Error actualizando movimiento en Firestore:", err);
      }
    })(),
    (async () => {
      if (targetShiftId) {
        try {
          const shiftRef = doc(db, SHIFTS_COLLECTION, targetShiftId);
          await setDoc(shiftRef, { movimientos: updatedMovs }, { merge: true });
        } catch (e) {
          console.warn("Error actualizando turno en Firestore tras editar movimiento:", e);
        }
      }
    })()
  ]).catch(console.warn);

  return updatedMovement;
};

// Obtener movimientos de caja de un turno
export const fetchCashMovements = async (shiftId = null) => {
  try {
    const colRef = collection(db, MOVEMENTS_COLLECTION);
    const snapshot = await getDocs(query(colRef, orderBy("fecha", "desc")));
    if (!snapshot.empty) {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setLocal("pos_cash_movements", list);
      return shiftId ? list.filter(m => m.shiftId === shiftId) : list;
    }
  } catch (err) {
    console.warn("Error leyendo movimientos de caja de Firestore:", err);
  }
  const localList = getLocal("pos_cash_movements", []);
  return shiftId ? localList.filter(m => m.shiftId === shiftId) : localList;
};

// Cerrar turno de caja y guardar arqueo
export const closeShift = async (closingData) => {
  const closingId = `CIERRE-${Date.now()}`;
  const now = new Date().toISOString();
  // Saneamiento de datos para Firestore (evitar undefined)
  const sanitized = JSON.parse(JSON.stringify(closingData, (k, v) => (v === undefined ? null : v)));
  const record = {
    ...sanitized,
    id: closingId,
    fechaCierre: now,
    estado: "cerrado"
  };

  // Guardar en colección de cierres históricos
  try {
    const docRef = doc(db, CLOSINGS_COLLECTION, closingId);
    await setDoc(docRef, record);

    // Marcar el turno original como cerrado en Firestore
    const cleanShiftId = typeof record.shiftId === "string" ? record.shiftId.trim() : null;
    if (cleanShiftId) {
      const shiftRef = doc(db, SHIFTS_COLLECTION, cleanShiftId);
      await setDoc(shiftRef, { estado: "cerrado", fechaCierre: now, closingId }, { merge: true });
    }
  } catch (err) {
    console.warn("Error guardando cierre de turno en Firestore:", err);
  }

  // Guardar en histórico local y limpiar turno activo
  try {
    const closings = getLocal("pos_cash_closings", []);
    closings.unshift(record);
    setLocal("pos_cash_closings", closings);
    setLocal("pos_active_shift", null);
  } catch (e) {
    console.warn("Error guardando localmente el cierre:", e);
  }

  return record;
};

// Obtener histórico de cierres de caja
export const fetchShiftClosings = async () => {
  try {
    const colRef = collection(db, CLOSINGS_COLLECTION);
    const snapshot = await getDocs(query(colRef, orderBy("fechaCierre", "desc")));
    if (!snapshot.empty) {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setLocal("pos_cash_closings", list);
      return list;
    }
  } catch (err) {
    console.warn("Error leyendo cierres de caja de Firestore:", err);
  }
  return getLocal("pos_cash_closings", []);
};

// Suscripción en tiempo real a los cierres y arqueos de caja
export const subscribeToShiftClosings = (callback) => {
  try {
    const colRef = collection(db, CLOSINGS_COLLECTION);
    const q = query(colRef, orderBy("fechaCierre", "desc"), limit(100));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setLocal("pos_cash_closings", list);
      callback(list);
    }, (err) => {
      console.warn("[Realtime] Error en listener de cierres:", err);
      callback(getLocal("pos_cash_closings", []));
    });
    return unsub;
  } catch (err) {
    console.warn("[Realtime] No se pudo iniciar listener de cierres:", err);
    return () => {};
  }
};

// ------------------- USUARIOS Y GESTIÓN DE ACCESOS -------------------
export const fetchUsers = async () => {
  try {
    const colRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
      setLocal("pos_users_v1", list);
      return list;
    } else {
      // Colección vacía: migrar usuarios iniciales a Firestore para compartirlos
      const initial = getLocal("pos_users_v1", INITIAL_USERS);
      const batch = writeBatch(db);
      initial.forEach(u => {
        const docRef = doc(db, USERS_COLLECTION, String(u.id));
        batch.set(docRef, sanitizeFirestoreData(u));
      });
      await batch.commit();
      return initial;
    }
  } catch (err) {
    console.warn("Error leyendo usuarios de Firestore:", err);
  }
  return getLocal("pos_users_v1", INITIAL_USERS);
};

export const subscribeToUsers = (callback) => {
  try {
    const colRef = collection(db, USERS_COLLECTION);
    const unsub = onSnapshot(colRef, (snapshot) => {
      if (!snapshot.empty) {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
        setLocal("pos_users_v1", list);
        callback(list);
      }
    }, (err) => {
      console.warn("[Realtime] Error en listener de usuarios:", err);
      callback(getLocal("pos_users_v1", INITIAL_USERS));
    });
    return unsub;
  } catch (err) {
    console.warn("[Realtime] No se pudo iniciar listener de usuarios:", err);
    return () => {};
  }
};

export const saveUsersList = async (users) => {
  setLocal("pos_users_v1", users);
  try {
    const batch = writeBatch(db);
    for (const u of users) {
      const docRef = doc(db, USERS_COLLECTION, String(u.id));
      batch.set(docRef, sanitizeFirestoreData(u), { merge: true });
    }
    await batch.commit();
  } catch (err) {
    console.warn("Error guardando usuarios en Firestore:", err);
  }
  return users;
};

export const deleteUserFromFirestore = async (userId) => {
  try {
    const docRef = doc(db, USERS_COLLECTION, String(userId));
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Error eliminando usuario en Firestore:", err);
  }
};

// ------------------- HORARIO DE CAJA Y TIEMPO COLOMBIA -------------------
// La caja abre a las 5:00 AM y cierra a las 10:00 PM hora Colombia (America/Bogota, UTC-5)
export const CASH_SCHEDULE = {
  OPEN_HOUR: 5,
  OPEN_MINUTE: 0,
  CLOSE_HOUR: 22,
  CLOSE_MINUTE: 0,
  TIMEZONE: "America/Bogota",
  DESCRIPTION: "5:00 AM – 10:00 PM (Hora Colombia)"
};

export const getColombiaTimeInfo = (date = new Date()) => {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;

  const timeFormatter = new Intl.DateTimeFormat("es-CO", {
    timeZone: CASH_SCHEDULE.TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: true
  });

  const hour24Formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: CASH_SCHEDULE.TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23"
  });

  const parts = hour24Formatter.formatToParts(d);
  const hourPart = parts.find(p => p.type === "hour");
  const minPart = parts.find(p => p.type === "minute");
  const hour = hourPart ? parseInt(hourPart.value, 10) : 0;
  const minute = minPart ? parseInt(minPart.value, 10) : 0;

  const dateFormatter = new Intl.DateTimeFormat("es-CO", {
    timeZone: CASH_SCHEDULE.TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  const dateParts = dateFormatter.formatToParts(d);
  const day = dateParts.find(p => p.type === "day")?.value || "01";
  const month = dateParts.find(p => p.type === "month")?.value || "01";
  const year = dateParts.find(p => p.type === "year")?.value || "2026";
  const dateStr = `${year}-${month}-${day}`;

  const totalMinutes = hour * 60 + minute;
  const openMinutes = CASH_SCHEDULE.OPEN_HOUR * 60 + CASH_SCHEDULE.OPEN_MINUTE; // 300 (5:00 AM)
  const closeMinutes = CASH_SCHEDULE.CLOSE_HOUR * 60 + CASH_SCHEDULE.CLOSE_MINUTE; // 1320 (10:00 PM)

  const isOperatingHours = totalMinutes >= openMinutes && totalMinutes < closeMinutes;
  const isPastClosing = totalMinutes >= closeMinutes || totalMinutes < openMinutes;
  const isNearClosing = totalMinutes >= (closeMinutes - 30) && totalMinutes < closeMinutes; // 9:30 PM a 9:59 PM
  const minutesUntilClose = isOperatingHours ? (closeMinutes - totalMinutes) : 0;

  return {
    hour,
    minute,
    totalMinutes,
    timeFormatted: timeFormatter.format(d),
    timeShort: new Intl.DateTimeFormat("es-CO", { timeZone: CASH_SCHEDULE.TIMEZONE, hour: "numeric", minute: "numeric", hour12: true }).format(d),
    dateStr,
    day,
    month,
    year,
    fullFormatted: `${day}/${month}/${year}, ${timeFormatter.format(d)}`,
    isOperatingHours,
    isPastClosing,
    isNearClosing,
    minutesUntilClose,
    scheduleDescription: CASH_SCHEDULE.DESCRIPTION
  };
};

// ─── GESTIÓN Y MONITOREO DE DISPOSITIVOS ACTIVOS EN TIEMPO REAL ───
const DEVICES_COLLECTION = "dispositivos_activos";

export const getDeviceId = () => {
  let id = localStorage.getItem("pos_device_id");
  if (!id) {
    id = `DEV-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    localStorage.setItem("pos_device_id", id);
  }
  return id;
};

// ── Geolocalización IP en tiempo real (ipwho.is con caché en sessionStorage) ──
let _cachedGeoInfo = null;
let _geoFetchPromise = null;

export const fetchDeviceGeoAndIP = async () => {
  if (_cachedGeoInfo) return _cachedGeoInfo;

  try {
    const stored = sessionStorage.getItem("pos_device_geo");
    if (stored) {
      _cachedGeoInfo = JSON.parse(stored);
      return _cachedGeoInfo;
    }
  } catch (_) {}

  if (_geoFetchPromise) return _geoFetchPromise;

  _geoFetchPromise = (async () => {
    try {
      const res = await fetch("https://ipwho.is/", { cache: "force-cache" });
      if (res.ok) {
        const data = await res.json();
        if (data.success !== false) {
          _cachedGeoInfo = {
            ip: data.ip || "—",
            ciudad: data.city || "—",
            departamento: data.region || "—",
            pais: data.country || "Colombia",
            paisCodigo: data.country_code || "CO",
            isp: data.connection?.isp || data.connection?.org || "—",
            lat: data.latitude,
            lon: data.longitude
          };
          try { sessionStorage.setItem("pos_device_geo", JSON.stringify(_cachedGeoInfo)); } catch (_) {}
          return _cachedGeoInfo;
        }
      }
    } catch (_) {}

    // Fallback: ipify
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      if (res.ok) {
        const data = await res.json();
        _cachedGeoInfo = {
          ip: data.ip || "—",
          ciudad: "Colombia",
          departamento: "—",
          pais: "Colombia",
          paisCodigo: "CO",
          isp: "—"
        };
        try { sessionStorage.setItem("pos_device_geo", JSON.stringify(_cachedGeoInfo)); } catch (_) {}
        return _cachedGeoInfo;
      }
    } catch (_) {}

    _cachedGeoInfo = {
      ip: "Local",
      ciudad: "Colombia",
      departamento: "—",
      pais: "Colombia",
      paisCodigo: "CO",
      isp: "—"
    };
    return _cachedGeoInfo;
  })();

  return _geoFetchPromise;
};

// ── Detección detallada de tipo, marca, modelo y navegador ──
export const getDetailedDeviceInfo = () => {
  const ua = (typeof navigator !== "undefined" && navigator.userAgent) ? navigator.userAgent : "";

  // 1. Tipo de Dispositivo
  let tipoDispositivo = "Computador (PC / Laptop)";
  const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /(iPad|Tablet|(Android(?!.*Mobile)))/i.test(ua);
  if (isTablet) {
    tipoDispositivo = "Tablet";
  } else if (isMobile) {
    tipoDispositivo = "Celular Móvil";
  }

  // 2. Sistema Operativo
  let os = "Dispositivo Web";
  if (ua.includes("Windows NT 10.0") || ua.includes("Windows NT 11.0")) os = "PC Windows 10/11";
  else if (ua.includes("Windows")) os = "PC Windows";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone")) os = "Apple iPhone (iOS)";
  else if (ua.includes("iPad")) os = "Apple iPad (iPadOS)";
  else if (ua.includes("Macintosh") || ua.includes("Mac OS")) os = "Apple Mac (macOS)";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("CrOS")) os = "ChromeOS";

  // 3. Marca y Modelo específico
  let marca = "PC";
  let modelo = "";

  if (/iPhone/i.test(ua)) {
    marca = "Apple";
    modelo = "iPhone";
  } else if (/iPad/i.test(ua)) {
    marca = "Apple";
    modelo = "iPad";
  } else if (/Macintosh/i.test(ua)) {
    marca = "Apple";
    modelo = "MacBook / Mac";
  } else if (/Samsung|SM-[A-Za-z0-9]+/i.test(ua)) {
    marca = "Samsung";
    const smMatch = ua.match(/SM-([A-Za-z0-9]+)/i);
    modelo = smMatch ? `Galaxy (${smMatch[0]})` : "Galaxy";
  } else if (/Xiaomi|Redmi|POCO/i.test(ua)) {
    marca = "Xiaomi";
    const miMatch = ua.match(/(Redmi [A-Za-z0-9 ]+|POCO [A-Za-z0-9 ]+|Mi [A-Za-z0-9 ]+)/i);
    modelo = miMatch ? miMatch[0] : "Redmi / Xiaomi";
  } else if (/Motorola|Moto/i.test(ua)) {
    marca = "Motorola";
    const motoMatch = ua.match(/Moto[A-Za-z0-9 -]+/i);
    modelo = motoMatch ? motoMatch[0] : "Moto";
  } else if (/Huawei|Honor/i.test(ua)) {
    marca = "Huawei";
    modelo = "Huawei";
  } else if (/Windows/i.test(ua)) {
    marca = "PC Windows";
    modelo = isMobile ? "Portátil" : "Escritorio / Laptop";
  }

  // 4. Navegador
  let browser = "Navegador";
  if (ua.includes("Edg/")) browser = "Microsoft Edge";
  else if (ua.includes("Chrome/") && !ua.includes("Edg/")) browser = "Google Chrome";
  else if (ua.includes("Firefox/")) browser = "Mozilla Firefox";
  else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Apple Safari";
  else if (ua.includes("Opera") || ua.includes("OPR/")) browser = "Opera";

  const screenRes = typeof window !== "undefined" ? `${window.screen?.width || 0}x${window.screen?.height || 0}` : "";
  const savedName = localStorage.getItem("pos_device_alias") || `${marca} · ${browser}`;

  return {
    tipoDispositivo,
    os,
    marca,
    modelo: modelo || os,
    browser,
    screenRes,
    defaultName: savedName
  };
};

export const getDeviceInfo = getDetailedDeviceInfo;

// ── Limpieza periódica de dispositivos desconectados (+15 minutos sin señal) ──
export const cleanupOldDisconnectedDevices = async () => {
  try {
    const colRef = collection(db, DEVICES_COLLECTION);
    const snapshot = await getDocs(colRef);
    const now = Date.now();
    const fifteenMinutesMs = 15 * 60 * 1000;

    const deletePromises = [];
    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      const lastBeat = data.ultimoLatido ? new Date(data.ultimoLatido).getTime() : 0;
      const diffMs = now - lastBeat;

      // Si lleva más de 15 minutos sin latido o está explícitamente desconectado por más de 5 minutos
      if (diffMs > fifteenMinutesMs || (data.online === false && diffMs > 5 * 60 * 1000)) {
        deletePromises.push(deleteDoc(doc(db, DEVICES_COLLECTION, docSnap.id)));
      }
    });

    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
    }
  } catch (err) {
    console.warn("Limpieza de terminales desconectadas:", err);
  }
};

export const initDevicePresence = (currentUser, onForceLogout) => {
  const deviceId = getDeviceId();
  const info = getDetailedDeviceInfo();
  const docRef = doc(db, DEVICES_COLLECTION, deviceId);

  let geoData = { ip: "Detectando...", ciudad: "Colombia", departamento: "—", pais: "Colombia", isp: "—" };

  fetchDeviceGeoAndIP().then(geo => {
    if (geo) {
      geoData = geo;
      updatePresence();
    }
  });

  const updatePresence = async () => {
    try {
      const alias = localStorage.getItem("pos_device_alias") || info.defaultName;
      await setDoc(docRef, {
        id: deviceId,
        nombreDispositivo: alias,
        tipoDispositivo: info.tipoDispositivo,
        sistemaOperativo: info.os,
        marca: info.marca,
        modelo: info.modelo,
        navegador: info.browser,
        resolucionPantalla: info.screenRes,
        ip: geoData.ip || "—",
        ciudad: geoData.ciudad || "Colombia",
        departamento: geoData.departamento || "—",
        pais: geoData.pais || "Colombia",
        paisCodigo: geoData.paisCodigo || "CO",
        isp: geoData.isp || "—",
        usuarioId: currentUser?.id || null,
        usuarioNombre: currentUser?.nombre || "Cajero Mostrador",
        usuarioRol: currentUser?.rol || "Asistente",
        ultimoLatido: new Date().toISOString(),
        online: true,
        forceLogout: false
      }, { merge: true });
    } catch (_) {}
  };

  updatePresence();
  const interval = setInterval(updatePresence, 25000);

  // Limpieza periódica de dispositivos desconectados cada 15 minutos
  cleanupOldDisconnectedDevices();
  const cleanupInterval = setInterval(cleanupOldDisconnectedDevices, 15 * 60 * 1000);

  const unsub = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.forceLogout && onForceLogout) {
        onForceLogout();
      }
      if (data.nombreDispositivo && data.nombreDispositivo !== localStorage.getItem("pos_device_alias")) {
        localStorage.setItem("pos_device_alias", data.nombreDispositivo);
      }
    }
  }, () => {});

  const handleUnload = () => {
    try {
      setDoc(docRef, { online: false, ultimoLatido: new Date().toISOString() }, { merge: true });
    } catch (_) {}
  };
  window.addEventListener("beforeunload", handleUnload);

  return () => {
    clearInterval(interval);
    clearInterval(cleanupInterval);
    unsub();
    window.removeEventListener("beforeunload", handleUnload);
  };
};

export const subscribeToDevices = (callback) => {
  try {
    const colRef = collection(db, DEVICES_COLLECTION);
    const unsub = onSnapshot(colRef, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(list);
    }, (err) => {
      console.warn("Error leyendo dispositivos conectados:", err);
      callback([]);
    });
    return unsub;
  } catch (_) {
    return () => {};
  }
};

export const updateDeviceName = async (deviceId, newName) => {
  try {
    const docRef = doc(db, DEVICES_COLLECTION, deviceId);
    await updateDoc(docRef, { nombreDispositivo: newName });
    if (deviceId === getDeviceId()) {
      localStorage.setItem("pos_device_alias", newName);
    }
  } catch (err) {
    console.error("Error renombrando dispositivo:", err);
  }
};

export const disconnectDevice = async (deviceId) => {
  try {
    const docRef = doc(db, DEVICES_COLLECTION, deviceId);
    await updateDoc(docRef, { forceLogout: true, online: false });
  } catch (err) {
    console.error("Error desconectando dispositivo:", err);
  }
};


