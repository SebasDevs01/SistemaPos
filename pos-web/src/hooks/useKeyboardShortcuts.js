/**
 * useKeyboardShortcuts.js
 * Hook global de atajos de teclado para el Sistema POS.
 * Se integra en App.jsx con un solo import y una llamada.
 * NO modifica ninguna lógica existente — es 100% aditivo.
 *
 * Atajos disponibles:
 *  F2           → Enfocar barra de búsqueda en POS
 *  F4           → Abrir caja registradora
 *  Alt + P      → Ir a Caja POS
 *  Alt + I      → Ir a Inventario
 *  Alt + V      → Ir a Ventas
 *  Alt + C      → Ir a Clientes
 *  Alt + A      → Ir a Alquiler
 *  Alt + S      → Ir a Seguros
 *  Alt + B      → Ir a Stickers/Barcodes
 *  Escape       → (en POS) limpiar búsqueda; (en modales) no interfiere
 */

import { useEffect, useCallback } from "react";

/**
 * @param {object} params
 * @param {string}   params.currentTab        - Pestaña activa actual
 * @param {function} params.setCurrentTab      - Setter de pestaña
 * @param {function} params.onOpenCashRegister - Callback para abrir caja
 * @param {boolean}  [params.enabled=true]     - Activar/desactivar shortcuts
 */
export function useKeyboardShortcuts({
  currentTab,
  setCurrentTab,
  onOpenCashRegister,
  enabled = true,
}) {
  const handleKeyDown = useCallback(
    (e) => {
      if (!enabled) return;

      // No disparar atajos si el foco está en un input, textarea o elemento editable
      const tag = e.target?.tagName?.toLowerCase();
      const isEditable =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        e.target?.isContentEditable;

      // F2 → Enfocar búsqueda en POS (siempre disponible)
      if (e.key === "F2") {
        e.preventDefault();
        const searchInput =
          document.querySelector('[data-shortcut="pos-search"]') ||
          document.querySelector('input[placeholder*="buscar" i]') ||
          document.querySelector('input[placeholder*="producto" i]') ||
          document.querySelector('input[type="search"]');
        if (searchInput) {
          searchInput.focus();
          searchInput.select?.();
        }
        return;
      }

      // F4 → Abrir caja registradora (siempre disponible)
      if (e.key === "F4") {
        e.preventDefault();
        onOpenCashRegister?.();
        return;
      }

      // Si está en un campo editable, no procesar los demás atajos
      if (isEditable) return;

      // Escape → Limpiar búsqueda en POS
      if (e.key === "Escape" && currentTab === "pos") {
        const searchInput =
          document.querySelector('[data-shortcut="pos-search"]') ||
          document.querySelector('input[placeholder*="buscar" i]') ||
          document.querySelector('input[placeholder*="producto" i]');
        if (searchInput && document.activeElement !== searchInput) {
          // Si no está enfocado en búsqueda, enfocarla
          searchInput.focus();
        } else if (searchInput && searchInput.value) {
          // Si está enfocado y tiene texto, limpiarla
          searchInput.value = "";
          searchInput.dispatchEvent(new Event("input", { bubbles: true }));
          const reactEvent = new Event("change", { bubbles: true });
          searchInput.dispatchEvent(reactEvent);
        }
        return;
      }

      // Alt + letra → Navegación entre pestañas
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const key = e.key?.toLowerCase();
        const navMap = {
          d: "dashboard",
          p: "pos",
          i: "inventory",
          v: "sales",
          c: "clients",
          a: "rentals",
          s: "insurances",
          b: "barcodes",
        };
        if (navMap[key]) {
          e.preventDefault();
          setCurrentTab(navMap[key]);
          return;
        }
      }
    },
    [enabled, currentTab, setCurrentTab, onOpenCashRegister]
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, enabled]);
}

export default useKeyboardShortcuts;
