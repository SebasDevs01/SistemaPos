import React from "react";
import { Keyboard, X } from "lucide-react";

export default function KeyboardModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: "F2", action: "Abrir pantalla de Cobro rápido / Finalizar venta" },
    { key: "Esc", action: "Cerrar modales o cancelar cobro activo" },
    { key: "Enter", action: "En el lector de barras: agregar producto escaneado" },
    { key: "1 al 9", action: "Seleccionar método de pago o denominación de efectivo" },
    { key: "Ctrl + P", action: "Imprimir ticket térmico o código de barras actual" }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-card"
        style={{
          maxWidth: "480px",
          width: "94%",
          padding: "24px",
          background: "var(--bg-secondary, #111827)",
          border: "1px solid var(--border-strong)",
          borderRadius: "20px",
          boxShadow: "0 25px 65px -10px rgba(0,0,0,0.8)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "8px" }}>
            <Keyboard size={22} color="var(--accent-blue)" />
            Atajos de Teclado para Caja Rápida
          </h2>
          <button onClick={onClose} className="btn btn-outline" style={{ padding: "4px 8px" }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {shortcuts.map(s => (
            <div 
              key={s.key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-sm)"
              }}
            >
              <span style={{ fontSize: "0.85rem", color: "var(--text-main)" }}>{s.action}</span>
              <kbd style={{
                background: "#1f2937",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                padding: "4px 10px",
                borderRadius: "4px",
                fontFamily: "var(--font-mono)",
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "#93c5fd",
                boxShadow: "0 2px 0 rgba(0, 0, 0, 0.4)"
              }}>
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <button 
          onClick={onClose} 
          className="btn btn-primary" 
          style={{ width: "100%", marginTop: "20px", padding: "10px" }}
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
