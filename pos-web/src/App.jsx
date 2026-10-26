import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useNetworkWatchdog } from "./hooks/useNetworkWatchdog";
import {
  requestNotificationPermission,
  checkAndNotifyLowStock,
  sendWelcomeNotification,
} from "./services/notificationService";
import Header from "./components/Header";
import PosView from "./components/PosView";
import InventoryView from "./components/InventoryView";
import TicketPrintModal from "./components/TicketPrintModal";
import KeyboardModal from "./components/KeyboardModal";
import LoginView from "./components/LoginView";
import SplashScreen from "./components/SplashScreen";
import ShiftBlockedModal from "./components/ShiftBlockedModal";
import { isRentalOverdue } from "./utils/rentalUtils";

// Vistas y modales secundarios cargados bajo demanda (Code-Splitting de alto rendimiento)
const RentalsView = lazy(() => import("./components/RentalsView"));
const BarcodeGeneratorView = lazy(() => import("./components/BarcodeGeneratorView"));
const SalesView = lazy(() => import("./components/SalesView"));
const ClientsView = lazy(() => import("./components/ClientsView"));
const InsurancesView = lazy(() => import("./components/InsurancesView"));
const UserManagementView = lazy(() => import("./components/UserManagementView"));
const StoreConfigModal = lazy(() => import("./components/StoreConfigModal"));
const CashRegisterModal = lazy(() => import("./components/CashRegisterModal"));

const TabLoadingFallback = () => (
  <div style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "350px",
    gap: "12px",
    color: "var(--text-muted)",
    fontSize: "0.95rem",
    fontWeight: 600
  }}>
    <span style={{ fontSize: "1.6rem" }}>⚡</span>
    <span>Cargando módulo...</span>
  </div>
);
import { 
  fetchProducts, 
  saveProduct, 
  deleteProductById, 
  deduplicateProducts,
  fetchRentals, 
  saveRental, 
  deleteRentalById,
  deleteMultipleRentals,
  fetchInsurances,
  saveInsurance,
  deleteInsuranceById,
  deleteMultipleInsurances,
  markInsurancesAsReported,
  subscribeToInsurances,
  fetchSales, 
  recordSale, 
  recordSaleWithStockBatch,
  updateSale,
  deleteSaleById,
  fetchClients, 
  saveClient, 
  getStoreConfig,
  fetchStoreConfig,
  saveStoreConfig,
  seedDatabaseFromSql,
  getActiveShift,
  openShift,
  addCashMovement,
  deleteCashMovement,
  updateCashMovement,
  closeShift,
  fetchShiftClosings,
  subscribeToActiveShift,
  subscribeToProducts,
  subscribeToSales,
  subscribeToClients,
  subscribeToRentals,
  subscribeToShiftClosings,
  subscribeToStoreConfig,
  subscribeToUsers,
  fetchUsers,
  saveUsersList,
  deleteUserFromFirestore,
  onBroadcastSync,
  flushPendingOps,
  getPendingOpsCount,
  checkRealConnectivity,
  isShiftOwner,
  reassignShiftOwner,
  initDevicePresence
} from "./services/firestoreService";
import { STORE_CONFIG, INITIAL_USERS } from "./data/initialData";

// ──────────────────────────────────────────────
// Persistent users: stored in localStorage so
// admins can add/edit/delete them at runtime
// ──────────────────────────────────────────────
const USERS_KEY = "pos_users_v1";

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return INITIAL_USERS;
}

function persistUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function deduplicateSales(salesList) {
  if (!Array.isArray(salesList)) return [];
  const seenIds = new Set();
  const result = [];
  // Agrupador por firma de monto y método para comparación instantánea O(1)
  const groupMap = new Map();

  for (const s of salesList) {
    if (!s) continue;
    const id = s.id ? String(s.id).trim() : null;
    if (id && seenIds.has(id)) continue;
    if (id) seenIds.add(id);

    const sTime = new Date(s.fecha || 0).getTime();
    const sTotal = Number(s.total) || 0;
    const sMethod = s.metodoPago || "";
    
    // Generar firma de items una sola vez
    const sItemsSignature = Array.isArray(s.items) 
      ? s.items.map(i => `${i.productId || i.codigo || i.nombre}:${i.cantidad}:${i.precioUnitario}`).sort().join("|")
      : "";

    const groupKey = `${sTotal}:${sMethod}`;
    const candidates = groupMap.get(groupKey);
    let isDupe = false;

    if (candidates && sTotal > 0) {
      for (let i = 0; i < candidates.length; i++) {
        const existing = candidates[i];
        if (Math.abs(sTime - existing.time) < 2500 && sItemsSignature === existing.signature) {
          isDupe = true;
          break;
        }
      }
    }

    if (!isDupe) {
      result.push(s);
      const entry = { time: sTime, signature: sItemsSignature };
      if (!candidates) {
        groupMap.set(groupKey, [entry]);
      } else {
        candidates.push(entry);
      }
    }
  }
  return result;
}

function loadStoredSession(availableUsers) {
  try {
    const raw = localStorage.getItem("pos_user");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.id || parsed.nombre)) {
        const matched = availableUsers?.find(u => u.id === parsed.id || u.nombre === parsed.nombre);
        return matched || parsed;
      }
    }
  } catch (e) {
    console.error("Error reading stored user session:", e);
  }
  return null;
}

const VALID_TABS = ["pos", "inventory", "rentals", "insurances", "barcodes", "sales", "clients", "users"];

export default function App() {
  const [currentTab, setCurrentTab] = useState(() => {
    try {
      const savedTab = localStorage.getItem("pos_current_tab");
      if (savedTab && VALID_TABS.includes(savedTab)) {
        return savedTab;
      }
    } catch {}
    return "pos";
  });
  const [products, setProducts] = useState(() => {
    try {
      const cached = localStorage.getItem("pos_products");
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [rentals, setRentals] = useState(() => {
    try {
      const cached = localStorage.getItem("pos_rentals");
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [insurances, setInsurances] = useState(() => {
    try {
      const cached = localStorage.getItem("pos_insurances");
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [sales, setSales] = useState(() => {
    try {
      const cached = localStorage.getItem("pos_sales");
      return cached ? deduplicateSales(JSON.parse(cached)) : [];
    } catch { return []; }
  });
  const [clients, setClients] = useState(() => {
    try {
      const cached = localStorage.getItem("pos_clients");
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [storeConfig, setStoreConfig] = useState(() => {
    try {
      const cfg = getStoreConfig();
      return { ...STORE_CONFIG, ...cfg };
    } catch {
      return STORE_CONFIG;
    }
  });
  const [isStoreConfigModalOpen, setIsStoreConfigModalOpen] = useState(false);
  
  // Modo Claro / Modo Oscuro
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("pos_theme") || "dark";
  });

  // ── Auth state ──────────────────────────────
  // Users list (mutable, persisted in localStorage)
  const [users, setUsers] = useState(() => loadUsers());
  // Who is currently logged in; null = show login screen (persisted in localStorage)
  const [currentUser, setCurrentUser] = useState(() => {
    return loadStoredSession(loadUsers());
  });
  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!loadStoredSession(loadUsers());
  });
  // Splash screen: show once per browser session (not per React re-render)
  const [showSplash, setShowSplash] = useState(() => {
    try { return !sessionStorage.getItem("mj_splash_done"); } catch { return true; }
  });

  // Modales y utilidades
  const [activePrintTicket, setActivePrintTicket] = useState(null);
  const [isKeyboardModalOpen, setIsKeyboardModalOpen] = useState(false);
  const [barcodeTargetProduct, setBarcodeTargetProduct] = useState(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedProgress, setSeedProgress] = useState(0);

  // Estado de conexión a internet (online/offline) con Watchdog Heartbeat
  const {
    isOnline,
    setIsOnline,
    pendingOpsCount,
    setPendingOpsCount,
    showOfflineToast,
    setShowOfflineToast,
    handleCheckConnection,
  } = useNetworkWatchdog();

  // ── Control de Turno y Caja Registradora ──
  const [isCashRegisterOpen, setIsCashRegisterOpen] = useState(false);
  const [activeShift, setActiveShift] = useState(() => {
    try {
      const cached = localStorage.getItem("pos_active_shift");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.estado === "abierto") {
          return parsed;
        }
      }
    } catch {}
    return null;
  });
  const [shiftClosings, setShiftClosings] = useState(() => {
    try {
      const cached = localStorage.getItem("pos_cash_closings");
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });

  // Modal de bloqueo cuando otro usuario tiene la caja abierta
  const [isShiftBlockedOpen, setIsShiftBlockedOpen] = useState(false);
  const [blockedByShift, setBlockedByShift] = useState(null);
  const [cashRegisterInitialTab, setCashRegisterInitialTab] = useState("current");

  // Aplicar tema en el DOM
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("pos_theme", theme);
  }, [theme]);

  // Persistir la pestaña actual en localStorage para no perder la sección al recargar
  useEffect(() => {
    if (currentTab) {
      localStorage.setItem("pos_current_tab", currentTab);
    }
  }, [currentTab]);

  // ── Notificaciones Push: solicitar permiso al iniciar sesión ────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    // Solicitar permiso de forma no invasiva (solo la primera vez)
    const alreadyAsked = localStorage.getItem("pos_notif_asked");
    if (!alreadyAsked) {
      // Esperar 5 segundos para no interrumpir el login
      const timer = setTimeout(async () => {
        const granted = await requestNotificationPermission();
        localStorage.setItem("pos_notif_asked", "1");
        if (granted) {
          sendWelcomeNotification(storeConfig?.nombre || "Sistema POS");
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn, storeConfig?.nombre]);

  // ── Notificaciones Push: monitorear stock bajo en tiempo real ────────
  useEffect(() => {
    if (!isLoggedIn || products.length === 0) return;
    // Revisar stock 30 segundos después de cargar productos y luego cada 10 min
    const initialTimer = setTimeout(() => {
      checkAndNotifyLowStock(products, 3);
    }, 30000);
    const interval = setInterval(() => {
      checkAndNotifyLowStock(products, 3);
    }, 10 * 60 * 1000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [isLoggedIn, products]);

  // Si no es administrador y está en pestaña restringida, regresar a 'pos'
  useEffect(() => {
    if (currentTab === "users" && currentUser?.rol !== "Administrador") {
      setCurrentTab("pos");
    }
  }, [currentTab, currentUser]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      // Activa bypass de transiciones para que el cambio de tema sea 100% instantáneo y fluido (60 FPS)
      document.documentElement.classList.add("theme-switching");
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("pos_theme", next);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.documentElement.classList.remove("theme-switching");
        });
      });

      return next;
    });
  }, []);

  const openShiftModal = useCallback(() => setIsCashRegisterOpen(true), []);
  const openStoreConfigModal = useCallback(() => setIsStoreConfigModalOpen(true), []);

  // ── Atajos de Teclado Globales (F2, F4, Alt+letra) ──────────────────────
  // Usamos un ref para evitar re-registro del listener cuando cambia handleOpenCashRegister
  const openCashRegisterRef = useRef(null);
  useKeyboardShortcuts({
    currentTab,
    setCurrentTab,
    onOpenCashRegister: useCallback(() => openCashRegisterRef.current?.(), []),
    enabled: isLoggedIn,
  });

  // ── Auth handlers ───────────────────────────
  const handleLogin = (user) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    localStorage.setItem("pos_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem("pos_user");
    setCurrentTab("pos");
  };

  // ── User management (admin) ─────────────────
  const handleSaveUsers = async (updatedUsers, deletedUserId = null) => {
    setUsers(updatedUsers);
    persistUsers(updatedUsers);
    try {
      await saveUsersList(updatedUsers);
      if (deletedUserId) {
        await deleteUserFromFirestore(deletedUserId);
      }
    } catch (e) {
      console.warn("Error sincronizando usuarios en Firestore:", e);
    }
    // If current user was edited, refresh their data
    if (currentUser) {
      const refreshed = updatedUsers.find((u) => u.id === currentUser.id);
      if (refreshed) {
        setCurrentUser(refreshed);
        localStorage.setItem("pos_user", JSON.stringify(refreshed));
      }
    }
  };

  // Carga inicial de datos (rentas, config, turnos, usuarios)
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [rents, inss, shift, clsg, cfg, usrs, loadedSales] = await Promise.all([
        fetchRentals(),
        fetchInsurances(),
        getActiveShift(),
        fetchShiftClosings(),
        fetchStoreConfig(),
        fetchUsers(),
        fetchSales()
      ]);
      setRentals(rents || []);
      setInsurances(inss || []);
      setActiveShift(shift || null);
      setShiftClosings(clsg || []);
      setStoreConfig(cfg || getStoreConfig());
      if (usrs && usrs.length > 0) setUsers(usrs);
      if (loadedSales && loadedSales.length > 0) {
        setSales(deduplicateSales(loadedSales));
      }
    } catch (err) {
      console.error("Error cargando datos:", err);
    }
  };

  // ── Suscripciones en tiempo real a todo el sistema (Sin recargar / Sin Ctrl+R) ──
  useEffect(() => {
    // 1. Productos en tiempo real
    const unsubProducts = subscribeToProducts((updatedProducts) => {
      setProducts(deduplicateProducts(updatedProducts));
    });

    // 2. Ventas en tiempo real (deduplicar automáticamente)
    const unsubSales = subscribeToSales((updatedSales) => {
      setSales(deduplicateSales(updatedSales));
    });

    // 3. Clientes en tiempo real
    const unsubClients = subscribeToClients((updatedClients) => {
      setClients(updatedClients);
    });

    // 4. Alquileres en tiempo real (creación, devolución o eliminación)
    const unsubRentals = subscribeToRentals((updatedRentals) => {
      setRentals(updatedRentals);
    });

    // 5. Seguros Escolares en tiempo real
    const unsubInsurances = subscribeToInsurances((updatedInsurances) => {
      setInsurances(updatedInsurances);
    });

    // 6. Histórico de cierres y arqueos de caja
    const unsubClosings = subscribeToShiftClosings((updatedClosings) => {
      setShiftClosings(updatedClosings);
    });

    // 7. Configuración de tienda
    const unsubConfig = subscribeToStoreConfig((updatedConfig) => {
      setStoreConfig(updatedConfig);
    });

    // 8. Usuarios y roles
    const unsubUsers = subscribeToUsers((updatedUsers) => {
      setUsers(updatedUsers);
      const activeUser = currentUserRef.current;
      if (activeUser) {
        const refreshed = updatedUsers.find((u) => u.id === activeUser.id);
        if (refreshed) {
          setCurrentUser(refreshed);
          localStorage.setItem("pos_user", JSON.stringify(refreshed));
        }
      }
    });

    // 9. Turno activo y movimientos de caja
    const unsubShift = subscribeToActiveShift((shift) => {
      setActiveShift(shift || null);
    });

    // 10. Sincronización instantánea entre pestañas del mismo navegador (0ms latencia)
    const unsubBroadcast = onBroadcastSync((event) => {
      if (!event || !event.key) return;
      try {
        if (event.key === "pos_products" && Array.isArray(event.data)) {
          setProducts(deduplicateProducts(event.data));
        } else if (event.key === "pos_sales" && Array.isArray(event.data)) {
          setSales(deduplicateSales(event.data));
        } else if (event.key === "pos_clients" && Array.isArray(event.data)) {
          setClients(event.data);
        } else if (event.key === "pos_rentals" && Array.isArray(event.data)) {
          setRentals(event.data);
        } else if (event.key === "pos_insurances" && Array.isArray(event.data)) {
          setInsurances(event.data);
        } else if (event.key === "pos_active_shift") {
          setActiveShift(event.data || null);
        } else if (event.key === "pos_cash_closings" && Array.isArray(event.data)) {
          setShiftClosings(event.data);
        } else if (event.key === "pos_store_config" && event.data) {
          setStoreConfig(event.data);
        } else if (event.key === "pos_users_v1" && Array.isArray(event.data)) {
          setUsers(event.data);
        }
      } catch (err) {
        console.warn("[BroadcastSync] Error procesando bus:", err);
      }
    });

    return () => {
      unsubProducts && unsubProducts();
      unsubSales && unsubSales();
      unsubClients && unsubClients();
      unsubRentals && unsubRentals();
      unsubInsurances && unsubInsurances();
      unsubClosings && unsubClosings();
      unsubConfig && unsubConfig();
      unsubUsers && unsubUsers();
      unsubShift && unsubShift();
      unsubBroadcast && unsubBroadcast();
    };
  }, []);

  // ── Presencia y Monitoreo en Segundo Plano de este Dispositivo ──
  useEffect(() => {
    const unsubPresence = initDevicePresence(currentUser, () => {
      alert("⚠️ Tu sesión ha sido cerrada remotamente por el Administrador.");
      handleLogout();
    });
    return () => unsubPresence && unsubPresence();
  }, [currentUser]);

  // ── Auto-detección y actualización automática de nuevos Deploys en Producción ──
  const [newDeployAlert, setNewDeployAlert] = useState(false);

  useEffect(() => {
    let deployCheckTimer = null;
    let isReloading = false;

    const reloadWithNewDeploy = () => {
      if (isReloading) return;
      isReloading = true;
      setNewDeployAlert(true);
      setTimeout(() => {
        // Limpiar cachés de assets para forzar carga limpia del nuevo bundle
        if ('caches' in window) {
          caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).finally(() => {
            window.location.reload();
          });
        } else {
          window.location.reload();
        }
      }, 2500);
    };

    // 1. Escuchar notificación de Service Worker
    const handleNewDeployEvent = () => {
      console.log("[AutoDeploy] Evento de nuevo deploy recibido. Actualizando sistema...");
      reloadWithNewDeploy();
    };
    window.addEventListener("pos_new_deploy_detected", handleNewDeployEvent);

    // 2. Sondeo periódico de version.json cada 25 segundos
    const checkVersionJson = async () => {
      if (!navigator.onLine || isReloading) return;
      try {
        const res = await fetch(`/version.json?_t=${Date.now()}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const localBuildTime = typeof __APP_BUILD_TIME__ !== "undefined" ? __APP_BUILD_TIME__ : null;
          if (localBuildTime && data.version && String(data.version) !== String(localBuildTime)) {
            console.log(`[AutoDeploy] ¡Nuevo deploy detectado! Local: ${localBuildTime} → Servidor: ${data.version}`);
            reloadWithNewDeploy();
          }
        }
      } catch (_) {}
    };

    deployCheckTimer = setInterval(checkVersionJson, 25000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") checkVersionJson();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("pos_new_deploy_detected", handleNewDeployEvent);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (deployCheckTimer) clearInterval(deployCheckTimer);
    };
  }, []);

  // Cantidad de alquileres vencidos o con retraso (>24 horas o evento vencido)
  const overdueRentalsCount = rentals.filter(r => isRentalOverdue(r)).length;

  // Registrar Venta y Descontar Stock Estricto
  const handleCompleteSale = async (saleRecord) => {
    const currentShift = activeShift || getLocal("pos_active_shift", null);
    const enrichedSale = {
      ...saleRecord,
      shiftId: saleRecord.shiftId || currentShift?.id || null,
      shiftApertura: saleRecord.shiftApertura || currentShift?.fechaApertura || null
    };

    // 1. Actualizar estado local inmediatamente (0 ms / Optimistic Update)
    setSales(prev => {
      const updated = [enrichedSale, ...prev.filter(s => s.id !== enrichedSale.id)];
      try {
        localStorage.setItem("pos_sales", JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    // Si la venta incluye pólizas/seguros escolares, registrarlos en la colección seguros
    if (saleRecord.segurosVendidos && Array.isArray(saleRecord.segurosVendidos) && saleRecord.segurosVendidos.length > 0) {
      for (const seg of saleRecord.segurosVendidos) {
        try {
          const segData = {
            ...seg,
            ventaId: enrichedSale.id,
            shiftId: enrichedSale.shiftId,
            fechaRegistro: seg.fechaRegistro || new Date().toISOString(),
            reportado: false
          };
          const savedSeg = await saveInsurance(segData);
          setInsurances(prev => [savedSeg, ...prev.filter(s => s.id !== savedSeg.id)]);
        } catch (errSeg) {
          console.warn("Error archivando seguro escolar de la venta:", errSeg);
        }
      }
    }

    // Descontar stock correspondiente en memoria y base de datos (general y por variante)
    const updatedProducts = [...products];
    const productsToPersist = [];
    for (const item of (saleRecord.items || [])) {
      let prodIndex = updatedProducts.findIndex(p => 
        (p.id && item.productId && String(p.id).trim() === String(item.productId).trim()) ||
        (p.codigo && item.codigo && String(p.codigo).trim() === String(item.codigo).trim()) ||
        (p.id && item.codigo && String(p.id).trim() === String(item.codigo).trim()) ||
        (p.codigo && item.productId && String(p.codigo).trim() === String(item.productId).trim())
      );

      // Si no coincide por ID directo, buscar por sillas o mesas
      if (prodIndex < 0) {
        const itemNom = String(item.nombre || "").toLowerCase();
        const itemCod = String(item.codigo || "").trim();
        if (itemCod === "1002" || itemNom.includes("silla")) {
          prodIndex = updatedProducts.findIndex(p => String(p.codigo).trim() === "1002" || String(p.nombre).toLowerCase().includes("silla"));
        } else if (itemCod === "1001" || itemNom.includes("mesa")) {
          prodIndex = updatedProducts.findIndex(p => String(p.codigo).trim() === "1001" || String(p.nombre).toLowerCase().includes("mesa"));
        }
      }

      if (prodIndex >= 0) {
        const prod = updatedProducts[prodIndex];
        const unitsSold = item.presentacion === "paquete" ? (Number(item.cantidad) * Number(item.unidadesReales || 10)) : Number(item.cantidad || 1);

        // Si tiene variantes individuales (motivos de bolsas, colores de bolsas o género+talla de calzado/ropa)
        let newStockPorVariante = prod.stockPorVariante ? { ...prod.stockPorVariante } : null;
        if (newStockPorVariante) {
          let variantKey = null;
          if (item.genero && item.talla) {
            variantKey = `${item.genero}|${item.talla}`;
          } else if (item.tipoCordon && item.longitudCordon && item.color) {
            variantKey = `${item.tipoCordon}|${item.longitudCordon}|${item.color}`;
          } else if (item.tipoCordon && item.color) {
            variantKey = `${item.tipoCordon}|${item.color}`;
          } else if (item.talla) {
            variantKey = item.talla;
          } else if (item.motivo) {
            variantKey = item.motivo;
          } else if (item.color) {
            variantKey = item.color;
          }

          if (variantKey && newStockPorVariante[variantKey] !== undefined) {
            newStockPorVariante[variantKey] = Math.max(0, Number(newStockPorVariante[variantKey]) - unitsSold);
          } else if (item.color && newStockPorVariante[item.color] !== undefined) {
            newStockPorVariante[item.color] = Math.max(0, Number(newStockPorVariante[item.color]) - unitsSold);
          } else if (item.talla && newStockPorVariante[item.talla] !== undefined) {
            newStockPorVariante[item.talla] = Math.max(0, Number(newStockPorVariante[item.talla]) - unitsSold);
          } else if (item.motivo && newStockPorVariante[item.motivo] !== undefined) {
            newStockPorVariante[item.motivo] = Math.max(0, Number(newStockPorVariante[item.motivo]) - unitsSold);
          }
        }

        // Para productos de Alquiler de mobiliario (sillas/mesas), el stock en catálogo representa la
        // capacidad total inalterable configurada por el usuario (ej: 36 sillas). La disponibilidad se calcula en tiempo real
        // restando los alquileres activos (36 total - 30 alquiladas = 6 disponibles).
        const isRentalProduct = prod.categoria === "Alquiler" || prod.codigo === "1001" || prod.codigo === "1002";
        const newStock = (prod.stockIlimitado || prod.categoria === "Cintas" || isRentalProduct)
          ? prod.stock
          : (newStockPorVariante 
              ? Object.values(newStockPorVariante).reduce((sum, v) => sum + Number(v || 0), 0)
              : Math.max(0, (Number(prod.stock) || 0) - unitsSold));

        const updatedProd = { 
          ...prod, 
          stock: newStock,
          ...(newStockPorVariante ? { stockPorVariante: newStockPorVariante } : {})
        };
        updatedProducts[prodIndex] = updatedProd;
        if (!isRentalProduct) {
          productsToPersist.push(updatedProd);
        }

        // Si es silla o mesa de alquiler vendida desde Caja POS, crear automáticamente el registro activo en Alquiler.
        // IMPORTANTE: Si la venta viene del módulo de Alquiler (tipoVenta empieza con "alquiler"),
        // el registro ya fue creado por handleSaveRental → NO duplicar.
        const isAlquilerModuleSale = String(saleRecord.tipoVenta || "").startsWith("alquiler");
        const isRental = !isAlquilerModuleSale && (
          prod.categoria === "Alquiler" || item.categoria === "Alquiler" || item.isRental ||
          prod.codigo === "1001" || prod.codigo === "1002" ||
          String(prod.nombre).toLowerCase().includes("alquiler") ||
          String(item.nombre).toLowerCase().includes("alquiler")
        );

        if (isRental) {
          const isChair = prod.codigo === "1002" || String(prod.nombre).toLowerCase().includes("silla") || String(item.nombre).toLowerCase().includes("silla");
          const isTable = prod.codigo === "1001" || String(prod.nombre).toLowerCase().includes("mesa") || String(item.nombre).toLowerCase().includes("mesa");

          try {
            const rentalPayload = {
              clienteNombre: saleRecord.cliente?.nombre || "Cliente Mostrador",
              clienteTelefono: saleRecord.cliente?.telefono || saleRecord.cliente?.dni || "0",
              clienteDireccion: saleRecord.cliente?.direccion || "Alquilado en Caja POS",
              metodoPago: saleRecord.metodoPago || "Efectivo",
              item: isChair && isTable ? "Sillas y Mesas" : isChair ? "Sillas" : "Mesas",
              cantidadSillas: isChair ? unitsSold : 0,
              cantidadMesas: isTable ? unitsSold : 0,
              cantidad: unitsSold,
              precioUnitario: Number(item.precioUnitario) || 1500,
              precioTotal: Number(item.subtotal) || (unitsSold * (Number(item.precioUnitario) || 1500)),
              abono: Number(item.subtotal) || (unitsSold * (Number(item.precioUnitario) || 1500)),
              saldoPendiente: 0,
              deposito: 0,
              duracionHoras: 24,
              fechaInicio: new Date().toISOString(),
              estado: "activo",
              ventaId: enrichedSale.id,
              shiftId: enrichedSale.shiftId,
              observaciones: `Alquilado desde Caja POS (Ticket ${enrichedSale.id})`
            };
            saveRental(rentalPayload).then(savedRental => {
              setRentals(prev => [savedRental, ...prev.filter(r => r.id !== savedRental.id)]);
            }).catch(eRent => console.warn("Error creando alquiler desde POS:", eRent));
          } catch (eRent) {
            console.warn("Error preparando alquiler desde POS:", eRent);
          }
        }
      }
    }
    setProducts(updatedProducts);

    // 2. Persistir venta y descuento de stock en Firestore atómicamente con writeBatch (1 sola llamada de red)
    recordSaleWithStockBatch(enrichedSale, productsToPersist).catch(err => {
      console.warn("Error archivando venta atómica en Firestore:", err);
    });
  };

  // ── Handlers de Caja y Turnos ──
  const handleOpenCashRegister = () => {
    // Si ya hay un turno activo y NO es del usuario actual → mostrar bloqueo
    if (activeShift && !isShiftOwner(activeShift, currentUser)) {
      setBlockedByShift(activeShift);
      setIsShiftBlockedOpen(true);
      return;
    }
    // Si el usuario es el dueño o no hay turno → abrir el modal de caja normal
    setCashRegisterInitialTab("current");
    setIsCashRegisterOpen(true);
  };
  // Mantener el ref actualizado para el hook de shortcuts (F4)
  openCashRegisterRef.current = handleOpenCashRegister;



  const handleOpenShift = async (shiftData) => {
    const opened = await openShift(shiftData);
    setActiveShift(opened);
    return opened;
  };

  const handleCloseShift = async (closingData) => {
    try {
      const closed = await closeShift(closingData);
      const record = closed || { ...closingData, id: `CIERRE-${Date.now()}`, fechaCierre: new Date().toISOString() };
      setActiveShift(null);
      setShiftClosings(prev => [record, ...prev.filter(Boolean)]);
      return record;
    } catch (err) {
      console.error("handleCloseShift error:", err);
      // Aunque Firestore falle, garantizar que la UI siempre se cierre correctamente
      const fallback = { ...closingData, id: `CIERRE-${Date.now()}`, fechaCierre: new Date().toISOString() };
      setActiveShift(null);
      setShiftClosings(prev => [fallback, ...prev.filter(Boolean)]);
      return fallback;
    }
  };

  // Reasignar turno activo a la sesión del usuario actual (supervisión admin)
  const handleReassignShiftToMe = async () => {
    if (!blockedByShift || !currentUser) return;
    try {
      const updated = await reassignShiftOwner(blockedByShift.id, currentUser);
      setActiveShift(updated);
      setIsShiftBlockedOpen(false);
      setBlockedByShift(null);
      setCashRegisterInitialTab("current");
      setIsCashRegisterOpen(true);
    } catch (err) {
      console.error("Error reasignando turno:", err);
      alert("No se pudo reasignar el turno: " + err.message);
    }
  };

  // Cierre rápido forzado para turnos huérfanos / genéricos
  const handleForceCloseShift = async () => {
    if (!blockedByShift || !currentUser) return;
    try {
      const closingRecord = {
        shiftId: blockedByShift.id,
        cajeroApertura: blockedByShift.cajero || "Cajero",
        cajeroCierre: `${currentUser.nombre} (Liberación Admin)`,
        fechaApertura: blockedByShift.fechaApertura || new Date().toISOString(),
        baseInicial: Number(blockedByShift.baseInicial) || 0,
        totalVentas: 0,
        ventasEfectivo: 0,
        ventasTransferencia: 0,
        ventasTarjeta: 0,
        dineroEsperado: Number(blockedByShift.baseInicial) || 0,
        dineroContado: Number(blockedByShift.baseInicial) || 0,
        diferencia: 0,
        estadoCuadre: "cuadrada",
        notas: "Turno previo liberado y cerrado formalmente por Administrador."
      };
      await handleCloseShift(closingRecord);
      setIsShiftBlockedOpen(false);
      setBlockedByShift(null);
      // Abrir la caja para que el administrador pueda iniciar su turno nuevo
      setCashRegisterInitialTab("current");
      setIsCashRegisterOpen(true);
    } catch (err) {
      console.error("Error forzando liberación de caja:", err);
      alert("No se pudo liberar la caja: " + err.message);
    }
  };

  const handleAddCashMovement = async (movData) => {
    const mov = await addCashMovement(movData);
    setActiveShift(prev => prev ? {
      ...prev,
      movimientos: [...(prev.movimientos || []), mov]
    } : prev);
    return mov;
  };

  const handleDeleteCashMovement = async (shiftId, movementId) => {
    try {
      const updatedMovs = await deleteCashMovement(shiftId, movementId);
      setActiveShift(prev => prev ? { ...prev, movimientos: updatedMovs } : prev);
    } catch (err) {
      console.error("Error al eliminar movimiento de caja:", err);
    }
  };

  const handleEditCashMovement = async (shiftId, updatedMovement) => {
    try {
      await updateCashMovement(shiftId, updatedMovement);
      setActiveShift(prev => prev ? {
        ...prev,
        movimientos: (prev.movimientos || []).map(m => m.id === updatedMovement.id ? { ...m, ...updatedMovement } : m)
      } : prev);
    } catch (err) {
      console.error("Error al editar movimiento de caja:", err);
    }
  };

  const handleEditSale = async (updatedSale) => {
    try {
      setSales(prev => prev.map(s => s.id === updatedSale.id ? { ...s, ...updatedSale } : s));
      updateSale(updatedSale).catch(console.warn);
    } catch (err) {
      console.error("Error al editar venta:", err);
    }
  };

  // Guardar configuración de la tienda
  const handleSaveStoreConfig = async (newConfig) => {
    // Re-lanza errores para que el modal pueda mostrarlos al usuario
    const saved = await saveStoreConfig(newConfig);
    setStoreConfig(saved);
    return saved;
  };

  // ── Manejo y Limpieza de Ventas ──
  const handleDeleteSale = async (saleId) => {
    try {
      await deleteSaleById(saleId);
      setSales(prev => prev.filter(s => s.id !== saleId));
    } catch (e) {
      console.warn("Error eliminando venta:", e);
    }
  };

  const handleCleanDuplicates = async () => {
    const seen = new Set();
    const toKeep = [];
    const toDeleteIds = [];

    for (const s of sales) {
      if (!s) continue;
      const id = s.id;
      if (!id || seen.has(id)) {
        if (id) toDeleteIds.push(id);
        continue;
      }
      seen.add(id);

      const sTime = new Date(s.fecha || 0).getTime();
      const sItemsSignature = Array.isArray(s.items) 
        ? s.items.map(i => `${i.productId || i.codigo || i.nombre}:${i.cantidad}:${i.precioUnitario}`).sort().join("|")
        : "";

      const duplicateOf = toKeep.find(existing => {
        const eTime = new Date(existing.fecha || 0).getTime();
        const sameTotal = Number(existing.total) === Number(s.total) && Number(s.total) > 0;
        const sameMethod = existing.metodoPago === s.metodoPago;
        const diffMs = Math.abs(sTime - eTime);
        if (sameTotal && sameMethod && diffMs < 2500) {
          const eItemsSignature = Array.isArray(existing.items) 
            ? existing.items.map(i => `${i.productId || i.codigo || i.nombre}:${i.cantidad}:${i.precioUnitario}`).sort().join("|")
            : "";
          return sItemsSignature === eItemsSignature;
        }
        return false;
      });

      if (duplicateOf) {
        toDeleteIds.push(id);
      } else {
        toKeep.push(s);
      }
    }

    if (toDeleteIds.length === 0) {
      alert("✅ No se encontraron registros duplicados. El historial está totalmente limpio.");
      return;
    }

    if (!confirm(`Se detectaron ${toDeleteIds.length} ventas duplicadas. ¿Deseas eliminarlas de Firebase y de tu pantalla ahora?`)) {
      return;
    }

    for (const id of toDeleteIds) {
      await deleteSaleById(id);
    }
    setSales(toKeep);
    alert(`✅ ¡Listo! Se eliminaron ${toDeleteIds.length} ventas duplicadas.`);
  };

  // Guardar / Actualizar Alquiler (Optimistic 0ms Update)
  const handleSaveRental = async (rentalData) => {
    const rentalId = rentalData.id || `ALQ-${Date.now()}`;
    const rentalWithId = { ...rentalData, id: rentalId };

    const existingIndex = rentals.findIndex(r => r.id === rentalWithId.id);
    const isEditing = existingIndex >= 0;

    // 1. Actualización en memoria y pantalla al instante (0 ms)
    if (isEditing) {
      setRentals(prev => prev.map(r => r.id === rentalWithId.id ? rentalWithId : r));
    } else {
      setRentals(prev => [rentalWithId, ...prev.filter(r => r.id !== rentalWithId.id)]);
    }

    // Persistir en Firestore en segundo plano sin congelar la UI
    saveRental(rentalWithId).catch(err => console.warn("Error guardando alquiler en Firestore:", err));

    if (!isEditing) {
      const chairsToDeduct = Number(rentalData.cantidadSillas) || (String(rentalData.item || "").toLowerCase().includes("silla") ? Number(rentalData.cantidad || 0) : 0);
      const tablesToDeduct = Number(rentalData.cantidadMesas) || (String(rentalData.item || "").toLowerCase().includes("mesa") && !String(rentalData.item || "").toLowerCase().includes("silla") ? Number(rentalData.cantidad || 0) : 0);

      const isReserva = rentalData.esApartado || rentalData.tipoOperacion === "reserva";
      const montoCobradoHoy = Number(rentalData.abono !== undefined ? rentalData.abono : (rentalData.precioTotal || 0));
      const depositoCobrado = (rentalData.depositoEstado === "cobrado" || rentalData.cobrarDepositoAhora) ? (Number(rentalData.deposito) || 0) : 0;

      // Si se cobró abono O si solo se cobró el depósito de garantía
      if (montoCobradoHoy > 0 || depositoCobrado > 0) {
        const currentShift = activeShift || (typeof localStorage !== "undefined" ? JSON.parse(localStorage.getItem("pos_active_shift") || "null") : null);
        const totalCobradoEnCaja = montoCobradoHoy + depositoCobrado;

        const rentalSaleItems = [];
        if (montoCobradoHoy > 0) {
          if (chairsToDeduct > 0) {
            rentalSaleItems.push({
              cartItemId: `silla-alq-${Date.now()}`,
              productId: "PROD-1002",
              codigo: "1002",
              nombre: isReserva ? `Reserva / Apartado de Sillas (${chairsToDeduct} unds)` : `Alquiler de Sillas (${chairsToDeduct} unds)`,
              categoria: "Alquiler",
              presentacion: "unidad",
              cantidad: chairsToDeduct,
              unidadesReales: 1,
              precioUnitario: Number(rentalData.precioUnitario) || 1500,
              subtotal: isReserva ? montoCobradoHoy : (chairsToDeduct * (Number(rentalData.precioUnitario) || 1500))
            });
          }
          if (tablesToDeduct > 0 && (chairsToDeduct === 0 || !isReserva)) {
            rentalSaleItems.push({
              cartItemId: `mesa-alq-${Date.now()}`,
              productId: "PROD-1001",
              codigo: "1001",
              nombre: isReserva ? `Reserva / Apartado de Mesas (${tablesToDeduct} unds)` : `Alquiler de Mesas (${tablesToDeduct} unds)`,
              categoria: "Alquiler",
              presentacion: "unidad",
              cantidad: tablesToDeduct,
              unidadesReales: 1,
              precioUnitario: 10000,
              subtotal: tablesToDeduct * 10000
            });
          }
        }

        if (depositoCobrado > 0) {
          rentalSaleItems.push({
            cartItemId: `deposito-alq-${Date.now()}`,
            productId: "PROD-ALQ-DEP",
            codigo: "DEP-MOB",
            nombre: `Depósito Garantía Mobiliario (Alquiler #${rentalWithId.id})`,
            categoria: "Alquiler",
            presentacion: "unidad",
            cantidad: 1,
            unidadesReales: 1,
            precioUnitario: depositoCobrado,
            subtotal: depositoCobrado
          });
        }

        const rentalSaleRecord = {
          id: `VTA-ALQ-${Date.now()}`,
          tipoVenta: isReserva ? "alquiler_abono" : "alquiler",
          alquilerId: rentalWithId.id,
          shiftId: currentShift?.id || null,
          shiftApertura: currentShift?.fechaApertura || null,
          cliente: {
            nombre: rentalData.clienteNombre || "Cliente Alquiler",
            telefono: rentalData.clienteTelefono || "",
            direccion: rentalData.clienteDireccion || "",
            dni: rentalData.clienteTelefono || "ALQ"
          },
          items: rentalSaleItems.length > 0 ? rentalSaleItems : [
            {
              cartItemId: `alq-item-${Date.now()}`,
              productId: "PROD-1002",
              codigo: "1002",
              nombre: isReserva ? "Apartado de Mobiliario" : "Alquiler de Mobiliario",
              categoria: "Alquiler",
              presentacion: "unidad",
              cantidad: 1,
              unidadesReales: 1,
              precioUnitario: totalCobradoEnCaja,
              subtotal: totalCobradoEnCaja
            }
          ],
          total: totalCobradoEnCaja,
          valorTotalAlquiler: Number(rentalData.precioTotal) || montoCobradoHoy,
          abono: montoCobradoHoy,
          saldoPendiente: Number(rentalData.saldoPendiente !== undefined ? rentalData.saldoPendiente : Math.max(0, (Number(rentalData.precioTotal) || 0) - montoCobradoHoy)),
          deposito: depositoCobrado,
          metodoPago: rentalData.metodoPago || "Efectivo",
          comprobanteUrl: rentalData.comprobanteUrl || null,
          efectivoRecibido: (rentalData.metodoPago || "Efectivo") === "Efectivo" ? totalCobradoEnCaja : 0,
          cambio: 0,
          observaciones: rentalData.observaciones || "",
          vendedor: currentUser?.nombre || "Caja Alquiler",
          fecha: new Date().toISOString()
        };

        // Reflejar la venta en la caja de inmediato (0 ms)
        setSales(prev => [rentalSaleRecord, ...prev.filter(s => s.id !== rentalSaleRecord.id)]);
        recordSale(rentalSaleRecord).catch(err => console.warn("Error guardando venta alquiler en Firestore:", err));
      }
    }

    return rentalWithId;
  };

  // Cobrar saldo pendiente de un alquiler / apartado (Optimistic 0ms Update)
  const handlePayRentalBalance = async (rentalId, balanceAmount, paymentMethod = "Efectivo", balanceComprobanteUrl = null) => {
    const rentalIndex = rentals.findIndex(r => r.id === rentalId);
    if (rentalIndex < 0) return null;

    const rental = rentals[rentalIndex];
    const currentShift = activeShift || (typeof localStorage !== "undefined" ? JSON.parse(localStorage.getItem("pos_active_shift") || "null") : null);
    const nowIso = new Date().toISOString();

    const updatedRental = {
      ...rental,
      abono: (Number(rental.abono) || 0) + Number(balanceAmount),
      saldoPendiente: 0,
      depositoEstado: (Number(rental.deposito) > 0) ? "cobrado" : rental.depositoEstado,
      estado: "activo",
      fechaEntregaReal: nowIso,
      ...(balanceComprobanteUrl ? { comprobanteSaldoUrl: balanceComprobanteUrl } : {})
    };

    // Actualización inmediata en UI (0 ms)
    setRentals(prev => prev.map(r => r.id === updatedRental.id ? updatedRental : r));
    saveRental(updatedRental).catch(err => console.warn("Error actualizando saldo alquiler en Firestore:", err));

    // Registrar la venta por el saldo recibido en caja
    const balanceSaleRecord = {
      id: `VTA-SALDO-${Date.now()}`,
      tipoVenta: "alquiler_saldo",
      alquilerId: rental.id,
      shiftId: currentShift?.id || null,
      shiftApertura: currentShift?.fechaApertura || null,
      cliente: {
        nombre: rental.clienteNombre || "Cliente Alquiler",
        telefono: rental.clienteTelefono || "",
        direccion: rental.clienteDireccion || "",
        dni: rental.clienteTelefono || "ALQ"
      },
      items: [
        {
          cartItemId: `saldo-alq-${Date.now()}`,
          productId: "PROD-ALQ-SALDO",
          codigo: "1002",
          nombre: `Liquidación Saldo Alquiler Sillas (${rental.clienteNombre})`,
          categoria: "Alquiler",
          presentacion: "unidad",
          cantidad: 1,
          unidadesReales: 1,
          precioUnitario: Number(balanceAmount),
          subtotal: Number(balanceAmount)
        }
      ],
      total: Number(balanceAmount),
      metodoPago: paymentMethod,
      comprobanteUrl: balanceComprobanteUrl || null,
      efectivoRecibido: paymentMethod === "Efectivo" ? Number(balanceAmount) : 0,
      cambio: 0,
      observaciones: `Cobro de saldo restante de alquiler #${rental.id}`,
      vendedor: currentUser?.nombre || "Cajero POS",
      fecha: nowIso
    };

    setSales(prev => [balanceSaleRecord, ...prev.filter(s => s.id !== balanceSaleRecord.id)]);
    recordSale(balanceSaleRecord).catch(err => console.warn("Error guardando venta saldo alquiler:", err));

    return { updatedRental, savedSale: balanceSaleRecord };
  };

  // Devolver Alquiler con inspección de daños y liquidación de depósito (Optimistic 0ms Update)
  const handleReturnRental = async (rentalId, returnDetails = {}) => {
    const rentalIndex = rentals.findIndex(r => r.id === rentalId);
    if (rentalIndex >= 0) {
      const rental = rentals[rentalIndex];
      const depMonto = Number(rental.deposito || 0);
      const retenido = Number(returnDetails.depositoRetenido || 0);
      const devuelto = Number(returnDetails.depositoDevuelto !== undefined ? returnDetails.depositoDevuelto : Math.max(0, depMonto - retenido));
      const danoReportado = returnDetails.danoReportado || retenido > 0;
      const sillasDanadas = Number(returnDetails.sillasDanadas || 0);
      const mesasDanadas = Number(returnDetails.mesasDanadas || 0);
      const danoDesc = returnDetails.danoDescripcion || (retenido > 0 ? "Mobiliario devuelto con daño reportado" : "Mobiliario devuelto en perfecto estado");

      const updatedRental = { 
        ...rental, 
        estado: "devuelto", 
        fechaDevolucion: new Date().toISOString(),
        depositoEstado: retenido > 0 ? (devuelto > 0 ? "parcialmente_retenido" : "retenido") : "devuelto",
        depositoMontoRetenido: retenido,
        depositoMontoDevuelto: devuelto,
        danoReportado,
        danoDescripcion: danoDesc,
        sillasDanadas,
        mesasDanadas
      };

      // 1. Actualización de Alquileres inmediata en UI (0 ms)
      const nextRentals = [...rentals];
      nextRentals[rentalIndex] = updatedRental;
      setRentals(nextRentals);
      saveRental(updatedRental).catch(err => console.warn("Error guardando devolución en Firestore:", err));

      // Si se retuvo depósito por daño, registrar ingreso de inmediato
      if (retenido > 0) {
        const damageSaleRecord = {
          id: `VTA-DANO-${Date.now()}`,
          tipoVenta: "alquiler_dano",
          alquilerId: rental.id,
          shiftId: activeShift?.id || null,
          shiftApertura: activeShift?.fechaApertura || null,
          cliente: {
            nombre: rental.clienteNombre || "Cliente Alquiler",
            telefono: rental.clienteTelefono || "",
            direccion: rental.clienteDireccion || "",
            dni: rental.clienteTelefono || "ALQ"
          },
          items: [
            {
              cartItemId: `dano-${Date.now()}`,
              productId: "PROD-ALQ-DANO",
              codigo: "DANO-MOB",
              nombre: `Cobro por Daño/Pérdida Mobiliario (${rental.clienteNombre})`,
              categoria: "Alquiler",
              presentacion: "unidad",
              cantidad: 1,
              unidadesReales: 1,
              precioUnitario: retenido,
              subtotal: retenido
            }
          ],
          total: retenido,
          metodoPago: "Efectivo",
          efectivoRecibido: retenido,
          cambio: 0,
          observaciones: `Retención de garantía por daño: ${danoDesc}`,
          vendedor: currentUser?.nombre || "Cajero POS",
          fecha: new Date().toISOString()
        };
        setSales(prev => [damageSaleRecord, ...prev.filter(s => s.id !== damageSaleRecord.id)]);
        recordSale(damageSaleRecord).catch(err => console.warn("Error guardando cobro de daño en Firestore:", err));
      }

      // Descuento de stock únicamente si hubo rotura o daño físico irreversible
      const updatedCatalog = [...products];
      let catalogChanged = false;

      if (sillasDanadas > 0) {
        const chairIdx = updatedCatalog.findIndex(p => String(p.codigo).trim() === "1002" || String(p.nombre || "").toLowerCase().includes("silla"));
        if (chairIdx >= 0) {
          const prod = updatedCatalog[chairIdx];
          const newStock = Math.max(0, (Number(prod.stock) || 0) - sillasDanadas);
          const upd = { ...prod, stock: newStock };
          updatedCatalog[chairIdx] = upd;
          saveProduct(upd).catch(console.warn);
          catalogChanged = true;
        }
      }

      if (mesasDanadas > 0) {
        const tableIdx = updatedCatalog.findIndex(p => String(p.codigo).trim() === "1001" || String(p.nombre || "").toLowerCase().includes("mesa"));
        if (tableIdx >= 0) {
          const prod = updatedCatalog[tableIdx];
          const newStock = Math.max(0, (Number(prod.stock) || 0) - mesasDanadas);
          const upd = { ...prod, stock: newStock };
          updatedCatalog[tableIdx] = upd;
          saveProduct(upd).catch(console.warn);
          catalogChanged = true;
        }
      }

      if (catalogChanged) {
        setProducts(updatedCatalog);
      }

      return updatedRental;
    }
  };

  // Eliminar Alquiler individual
  const handleDeleteRental = async (rentalId) => {
    await deleteRentalById(rentalId);
    setRentals(prev => prev.filter(r => r.id !== rentalId));
  };

  // Limpiar Alquileres Devueltos por lote
  const handleClearReturnedRentals = async (rentalIdsToClear) => {
    if (!rentalIdsToClear || rentalIdsToClear.length === 0) return;
    await deleteMultipleRentals(rentalIdsToClear);
    const idSet = new Set(rentalIdsToClear);
    setRentals(prev => prev.filter(r => !idSet.has(r.id)));
  };

  // ── Handlers de Seguros Escolares ──
  const handleSaveInsurance = async (insuranceData) => {
    const saved = await saveInsurance(insuranceData);
    setInsurances(prev => {
      const idx = prev.findIndex(s => s.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });
    return saved;
  };

  const handleDeleteInsurance = async (insuranceId) => {
    await deleteInsuranceById(insuranceId);
    setInsurances(prev => prev.filter(s => s.id !== insuranceId));
  };

  const handleDeleteMultipleInsurances = async (insuranceIds) => {
    if (!insuranceIds || insuranceIds.length === 0) return;
    await deleteMultipleInsurances(insuranceIds);
    const idSet = new Set(insuranceIds);
    setInsurances(prev => prev.filter(s => !idSet.has(s.id)));
  };

  const handleMarkInsurancesAsReported = async (insuranceIds) => {
    if (!insuranceIds || insuranceIds.length === 0) return;
    await markInsurancesAsReported(insuranceIds);
    const idSet = new Set(insuranceIds);
    const now = new Date().toISOString();
    setInsurances(prev => prev.map(s => idSet.has(s.id) ? { ...s, reportado: true, fechaReporte: now } : s));
  };

  // Guardar Producto
  const handleSaveProduct = async (product, originalKey = null) => {
    const saved = await saveProduct(product);
    setProducts(prev => {
      const idx = prev.findIndex(p => {
        if (originalKey && (p.id === originalKey || String(p.codigo).trim() === String(originalKey).trim())) return true;
        if (saved.id && p.id && p.id === saved.id) return true;
        if (saved.codigo && p.codigo && String(p.codigo).trim() === String(saved.codigo).trim()) return true;
        if (saved.legacyId && p.legacyId && Number(p.legacyId) === Number(saved.legacyId)) return true;
        if (product.id && p.id && p.id === product.id) return true;
        if (product.codigo && p.codigo && String(p.codigo).trim() === String(product.codigo).trim()) return true;
        return false;
      });

      let updatedList;
      if (idx >= 0) {
        updatedList = [...prev];
        updatedList[idx] = saved;
      } else {
        updatedList = [saved, ...prev];
      }
      return deduplicateProducts(updatedList);
    });
    return saved;
  };

  // Eliminar Producto
  const handleDeleteProduct = async (id) => {
    await deleteProductById(id);
    setProducts(prev => prev.filter(p => (p.id || p.codigo) !== id));
  };

  // Guardar Cliente
  const handleSaveClient = async (client) => {
    const saved = await saveClient(client);
    setClients(prev => {
      const idx = prev.findIndex(c => c.dni === saved.dni);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });
  };

  // Sincronizar catálogo con Firebase
  const handleSeedData = async () => {
    if (confirm("¿Deseas sincronizar todo el inventario con Firebase Firestore en la nube?\n\n☁️ Se subirán y actualizarán todos los productos en la base de datos en tiempo real.\n🔒 Las fotos, códigos y existencias se conservarán intactos.")) {
      setIsSeeding(true);
      try {
        const result = await seedDatabaseFromSql((pct) => setSeedProgress(pct));
        await loadAllData();
        if (result.error) {
          alert(`⚠️ Sincronización parcial.\n\nHubo un detalle: ${result.error}\n\nTus datos locales están a salvo.`);
        } else {
          alert(`✅ ¡Sincronización con Firebase Firestore completada!\n\n☁️ ${result.added || result.total} productos procesados en la nube con éxito.`);
        }
      } catch (e) {
        console.error(e);
        alert("Ocurrió un error inesperado al conectar con Firebase.");
      } finally {
        setIsSeeding(false);
      }
    }
  };

  // ── Splash screen (once per browser session) ──
  if (showSplash) {
    return (
      <SplashScreen
        storeName={storeConfig?.nombre || "Miscelánea María José"}
        onComplete={() => {
          try { sessionStorage.setItem("mj_splash_done", "1"); } catch {}
          setShowSplash(false);
        }}
      />
    );
  }

  // ── Show login screen if not authenticated ──
  if (!isLoggedIn) {
    return <LoginView users={users} onLogin={handleLogin} storeConfig={storeConfig} />;
  }

  return (
    <div 
      className={currentTab === "pos" ? "app-fullscreen-pos" : ""}
      style={currentTab === "pos" ? { height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" } : { minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      {/* Barra de Navegación Principal con selector de usuario y modo claro/oscuro */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        overdueRentalsCount={overdueRentalsCount}
        pendingInsurancesCount={insurances.filter(s => !s.reportado).length}
        storeConfig={storeConfig}
        onOpenStoreConfig={() => setIsStoreConfigModalOpen(true)}
        onOpenKeyboardModal={() => setIsKeyboardModalOpen(true)}
        productsCount={products.length}
        theme={theme}
        onToggleTheme={toggleTheme}
        currentUser={currentUser}
        onLogout={handleLogout}
        activeShift={activeShift}
        onOpenCashRegister={handleOpenCashRegister}
        isOnline={isOnline}
        pendingOpsCount={pendingOpsCount}
        onCheckConnection={handleCheckConnection}
      />

      {/* Contenido Dinámico según pestaña */}
      <main 
        className={currentTab === "pos" ? "pos-fullscreen-main" : ""}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: currentTab === "pos" ? "hidden" : "auto",
          paddingBottom: currentTab === "pos" ? "0" : "40px"
        }}
      >
        {currentTab === "pos" && (
          <PosView
            products={products}
            clients={clients}
            onCompleteSale={handleCompleteSale}
            onPrintTicket={(sale) => setActivePrintTicket(sale)}
            storeConfig={storeConfig}
            currentUser={currentUser}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onSaveClient={handleSaveClient}
            activeShift={activeShift}
            onOpenCashRegister={handleOpenCashRegister}
            onSaveRental={handleSaveRental}
            rentals={rentals}
          />
        )}

        {currentTab === "inventory" && (
          <InventoryView
            products={products}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onSelectForBarcode={(prod) => {
              setBarcodeTargetProduct(prod);
              setCurrentTab("barcodes");
            }}
            currentUser={currentUser}
            storeConfig={storeConfig}
          />
        )}

        <Suspense fallback={<TabLoadingFallback />}>
          {currentTab === "rentals" && (
            <RentalsView
              rentals={rentals}
              onSaveRental={handleSaveRental}
              onReturnRental={handleReturnRental}
              onDeleteRental={handleDeleteRental}
              onClearReturnedRentals={handleClearReturnedRentals}
              onCompleteSale={handleCompleteSale}
              onPayRentalBalance={handlePayRentalBalance}
              activeShift={activeShift}
              clients={clients}
              products={products}
              storeConfig={storeConfig}
              currentUser={currentUser}
            />
          )}

          {currentTab === "insurances" && (
            <InsurancesView
              insurances={insurances}
              onSaveInsurance={handleSaveInsurance}
              onDeleteInsurance={handleDeleteInsurance}
              onDeleteMultipleInsurances={handleDeleteMultipleInsurances}
              onMarkAsReported={handleMarkInsurancesAsReported}
              products={products}
              currentUser={currentUser}
              activeShift={activeShift}
              storeConfig={storeConfig}
              onRecordSale={async (sale) => {
                const saved = await recordSale(sale);
                setSales(prev => [saved, ...prev]);
              }}
            />
          )}

          {currentTab === "barcodes" && (
            <BarcodeGeneratorView
              products={products}
              initialProduct={barcodeTargetProduct}
              storeConfig={storeConfig}
            />
          )}

          {currentTab === "sales" && (
            <SalesView
              sales={sales}
              products={products}
              currentUser={currentUser}
              storeConfig={storeConfig}
              onPrintTicket={(sale) => setActivePrintTicket(sale)}
              activeShift={activeShift}
              shiftClosings={shiftClosings}
              onDeleteSale={handleDeleteSale}
              onCleanDuplicates={handleCleanDuplicates}
            />
          )}

          {currentTab === "clients" && (
            <ClientsView
              clients={clients}
              onSaveClient={handleSaveClient}
              storeConfig={storeConfig}
              onAddCashMovement={handleAddCashMovement}
              sales={sales}
              rentals={rentals}
              onPrintTicket={(sale) => setActivePrintTicket(sale)}
            />
          )}

          {currentTab === "users" && currentUser?.rol === "Administrador" && (
            <UserManagementView
              users={users}
              onSaveUsers={handleSaveUsers}
              currentUser={currentUser}
            />
          )}
        </Suspense>
      </main>

      {/* Modal de Impresión de Ticket Térmico */}
      <TicketPrintModal
        sale={activePrintTicket}
        onClose={() => setActivePrintTicket(null)}
        storeConfig={storeConfig}
      />

      {/* Modal de Atajos de Teclado */}
      <KeyboardModal
        isOpen={isKeyboardModalOpen}
        onClose={() => setIsKeyboardModalOpen(false)}
      />

      {/* Modales Secundarios bajo demanda */}
      <Suspense fallback={null}>
        {isStoreConfigModalOpen && (
          <StoreConfigModal
            isOpen={isStoreConfigModalOpen}
            onClose={() => setIsStoreConfigModalOpen(false)}
            storeConfig={storeConfig}
            onSaveConfig={handleSaveStoreConfig}
          />
        )}

        {isCashRegisterOpen && (
          <CashRegisterModal
            isOpen={isCashRegisterOpen}
            onClose={() => setIsCashRegisterOpen(false)}
            activeShift={activeShift}
            onOpenShift={handleOpenShift}
            onCloseShift={handleCloseShift}
            onAddMovement={handleAddCashMovement}
            onDeleteMovement={handleDeleteCashMovement}
            onEditMovement={handleEditCashMovement}
            onDeleteSale={handleDeleteSale}
            onEditSale={handleEditSale}
            onPrintTicket={(sale) => setActivePrintTicket(sale)}
            sales={sales}
            currentUser={currentUser}
            storeConfig={storeConfig}
            closings={shiftClosings}
            initialTab={cashRegisterInitialTab}
          />
        )}
      </Suspense>

      {/* Modal de Bloqueo: aparece cuando otro usuario ya tiene la caja abierta */}
      <ShiftBlockedModal
        isOpen={isShiftBlockedOpen}
        onClose={() => {
          setIsShiftBlockedOpen(false);
          setBlockedByShift(null);
        }}
        activeShift={blockedByShift}
        currentUser={currentUser}
        users={users}
        storeConfig={storeConfig}
        onOpenHistory={() => {
          setIsShiftBlockedOpen(false);
          setBlockedByShift(null);
          setCashRegisterInitialTab("history");
          setIsCashRegisterOpen(true);
        }}
        onEmergencyAdminClose={() => {
          setIsShiftBlockedOpen(false);
          setBlockedByShift(null);
          // Permite a un Admin ver el turno activo y hacer cierre de supervisión
          setCashRegisterInitialTab("current");
          setIsCashRegisterOpen(true);
        }}
        onReassignToMe={handleReassignShiftToMe}
        onForceCloseShift={handleForceCloseShift}
      />

      {/* Notificación elegante cuando se detecta un nuevo Deploy */}
      {newDeployAlert && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 99999,
          background: "linear-gradient(135deg, #4f46e5, #06b6d4)",
          color: "#fff",
          padding: "14px 22px",
          borderRadius: "14px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "0.9rem",
          fontWeight: 700,
          border: "1px solid rgba(255,255,255,0.2)",
          animation: "slideIn 0.3s ease"
        }}>
          <span style={{ fontSize: "1.4rem" }}>🚀</span>
          <div>
            <div>¡Nueva actualización del sistema detectada!</div>
            <div style={{ fontSize: "0.76rem", opacity: 0.88, fontWeight: 500 }}>Actualizando automáticamente a la nueva versión...</div>
          </div>
        </div>
      )}

      {/* Asistente ORION — DESACTIVADO TEMPORALMENTE
      <OrionWidget
        currentTab={currentTab}
        onNavigateTab={setCurrentTab}
        products={products}
        sales={sales}
        insurances={insurances}
        clients={clients}
        rentals={rentals}
        storeConfig={storeConfig}
        activeShift={activeShift}
        theme={theme}
        toggleTheme={toggleTheme}
        currentUser={currentUser}
        onOpenShiftModal={openShiftModal}
        onOpenStoreConfigModal={openStoreConfigModal}
      />
      */}
    </div>
  );
}
