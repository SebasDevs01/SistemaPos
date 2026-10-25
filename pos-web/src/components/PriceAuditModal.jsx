/**
 * PriceAuditModal.jsx
 * Modal para visualizar el historial cronológico y auditoría de cambios de precios y costos.
 * 100% independiente y aditivo.
 */

import React, { useState, useEffect } from "react";
import {
  History,
  TrendingUp,
  TrendingDown,
  Search,
  X,
  User,
  Calendar,
  RefreshCw,
  Tag
} from "lucide-react";
import { fetchPriceAuditLog } from "../services/auditService";
import "./PriceAuditModal.css";

const formatMoney = (val) => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(val) || 0);
};

export default function PriceAuditModal({ isOpen, onClose, selectedProductId = null }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchPriceAuditLog({
        productId: selectedProductId,
        limitCount: 100,
      });
      setLogs(data);
    } catch (err) {
      console.warn("Error al cargar log de precios:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, selectedProductId]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (l.productName || "").toLowerCase().includes(q) ||
      (l.codigo || "").toLowerCase().includes(q) ||
      (l.usuario || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="price-audit-overlay" onClick={onClose}>
      <div className="price-audit-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="price-audit-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "rgba(99, 102, 241, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6366f1",
              }}
            >
              <History size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                Auditoría e Historial de Precios
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.78rem",
                  color: "var(--text-muted, #64748b)",
                }}
              >
                Registro inmutable de quién modificó precios o costos y cuándo
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              title="Refrescar auditoría"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "6px",
                color: "var(--text-muted, #64748b)",
              }}
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "6px",
                color: "var(--text-muted, #64748b)",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="price-audit-body">
          {/* Search bar */}
          <div className="price-audit-search">
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Buscar por nombre de producto, código o usuario responsable..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* List */}
          {loading ? (
            <div className="audit-empty">Cargando registros de auditoría...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="audit-empty">
              <History size={32} style={{ opacity: 0.3, marginBottom: "8px" }} />
              <p style={{ margin: 0 }}>
                No se han registrado modificaciones de precios aún o no hay coincidencias.
              </p>
            </div>
          ) : (
            <div className="price-audit-list">
              {filteredLogs.map((log) => {
                const diffPrecio = (log.precioNuevo || 0) - (log.precioAnterior || 0);
                const subio = diffPrecio >= 0;
                const fechaLegible = new Date(log.fecha).toLocaleString("es-CO", {
                  dateStyle: "medium",
                  timeStyle: "short",
                });

                return (
                  <div key={log.id} className="price-audit-card">
                    <div className="audit-prod-info">
                      <strong>{log.productName}</strong>
                      <div className="audit-prod-meta">
                        <span>🏷️ Cód: {log.codigo}</span> •{" "}
                        <span>
                          <User size={12} style={{ verticalAlign: "middle" }} /> {log.usuario}
                        </span>{" "}
                        • <span>{fechaLegible}</span>
                      </div>
                    </div>

                    <div className="audit-changes">
                      {log.priceChanged && (
                        <div
                          className={`audit-price-tag ${
                            subio ? "audit-price-up" : "audit-price-down"
                          }`}
                        >
                          {subio ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                          <span>
                            {formatMoney(log.precioAnterior)} → {formatMoney(log.precioNuevo)}
                          </span>
                        </div>
                      )}

                      {log.costChanged && (
                        <span
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--text-muted, #64748b)",
                          }}
                        >
                          Costo: {formatMoney(log.costoAnterior)} → {formatMoney(log.costoNuevo)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
