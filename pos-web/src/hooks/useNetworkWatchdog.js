/**
 * useNetworkWatchdog.js
 * Hook especializado en monitoreo continuo de conectividad (Watchdog Heartbeat).
 * Detecta estados ONLINE / OFFLINE, sincroniza cambios pendientes automáticamente
 * y gestiona eventos de red del navegador y visibilidad de ventana.
 * 100% fiel a la implementación original de App.jsx.
 */

import { useState, useEffect, useCallback } from "react";
import {
  checkRealConnectivity,
  getPendingOpsCount,
  flushPendingOps,
} from "../services/firestoreService";

export function useNetworkWatchdog() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingOpsCount, setPendingOpsCount] = useState(0);
  const [showOfflineToast, setShowOfflineToast] = useState(false);

  useEffect(() => {
    let isChecking = false;
    let timerId = null;

    const performNetworkCheck = async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        const reallyConnected = await checkRealConnectivity();
        setIsOnline((prev) => {
          if (prev !== reallyConnected) {
            console.log(
              `[NetworkWatchdog] Red actualizada: ${
                reallyConnected ? "ONLINE 🟢" : "OFFLINE 🔴"
              }`
            );
            if (reallyConnected) {
              setShowOfflineToast(false);
              // Cuando vuelve la conexión, sincronizar pendientes automáticamente
              const pending = getPendingOpsCount();
              if (pending > 0) {
                console.log(
                  `[Offline → Online] Sincronizando ${pending} operaciones pendientes...`
                );
                flushPendingOps()
                  .then((result) => {
                    setPendingOpsCount(getPendingOpsCount());
                    if (result && result.flushed > 0) {
                      console.log(
                        `✅ ${result.flushed} cambios sincronizados con Firebase.`
                      );
                    }
                  })
                  .catch((e) =>
                    console.warn("Error sincronizando pendientes:", e)
                  );
              }
            } else {
              setShowOfflineToast(true);
            }
          }
          return reallyConnected;
        });
        setPendingOpsCount(getPendingOpsCount());
      } catch (err) {
        console.warn("[NetworkWatchdog] Error en comprobación:", err);
      } finally {
        isChecking = false;
      }
    };

    // Eventos nativos del navegador para reacción inmediata (0 ms)
    const handleBrowserOnline = () => {
      setIsOnline(true);
      performNetworkCheck();
    };
    const handleBrowserOffline = () => {
      setIsOnline(false);
      setPendingOpsCount(getPendingOpsCount());
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        performNetworkCheck();
      }
    };

    window.addEventListener("online", handleBrowserOnline);
    window.addEventListener("offline", handleBrowserOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Verificación inicial inmediata
    performNetworkCheck();

    // Heartbeat ultra-rápido continuo cada 1 segundo (detección instantánea)
    timerId = setInterval(performNetworkCheck, 1000);

    return () => {
      window.removeEventListener("online", handleBrowserOnline);
      window.removeEventListener("offline", handleBrowserOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (timerId) clearInterval(timerId);
    };
  }, []);

  // Función para verificación manual de red a demanda (ej. al tocar el badge)
  const handleCheckConnection = useCallback(async () => {
    const connected = await checkRealConnectivity();
    setIsOnline(connected);
    setPendingOpsCount(getPendingOpsCount());
    return connected;
  }, []);

  return {
    isOnline,
    setIsOnline,
    pendingOpsCount,
    setPendingOpsCount,
    showOfflineToast,
    setShowOfflineToast,
    handleCheckConnection,
  };
}

export default useNetworkWatchdog;
