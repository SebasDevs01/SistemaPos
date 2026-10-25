/**
 * ReportsModal.jsx
 * Modal interactivo para seleccionar y generar Reportes Oficiales en PDF.
 * Incluye filtros rápidos de fecha, categorías y exportación con un clic.
 * 100% aditivo y seguro.
 */

import React, { useState, useMemo } from "react";
import {
  FileText,
  Calendar,
  Package,
  TrendingUp,
  DollarSign,
  Download,
  X,
  CheckCircle2,
  Clock,
  Filter
} from "lucide-react";
import {
  generateSalesReportPDF,
  generateInventoryReportPDF,
  generateShiftReportPDF,
} from "../utils/pdfReports";
import "./ReportsModal.css";

export default function ReportsModal({
  isOpen,
  onClose,
  sales = [],
  products = [],
  activeShift = null,
  storeConfig = {},
  currentUser = {},
}) {
  const [reportType, setReportType] = useState("sales"); // "sales" | "inventory" | "shift"
  const [dateFilter, setDateFilter] = useState("today"); // "today" | "7days" | "month" | "custom"
  const [startDate, setStartDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [selectedCategory, setSelectedCategory] = useState("todas");
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);

  // Categorías únicas
  const categories = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.categoria) set.add(p.categoria.trim());
    });
    return ["todas", ...Array.from(set).sort()];
  }, [products]);

  // Manejar presets de fechas
  const handleDatePreset = (preset) => {
    setDateFilter(preset);
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "7days") {
      const past7 = new Date();
      past7.setDate(past7.getDate() - 7);
      setStartDate(past7.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === "month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(firstDay.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  // Preview conteo de ventas filtradas
  const filteredSalesCount = useMemo(() => {
    if (reportType !== "sales") return 0;
    return sales.filter((s) => {
      const d = s.fecha?.slice?.(0, 10) || s.fechaVenta?.slice?.(0, 10) || "";
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    }).length;
  }, [sales, reportType, startDate, endDate]);

  // Preview productos filtrados
  const filteredProductsCount = useMemo(() => {
    if (reportType !== "inventory") return 0;
    if (selectedCategory === "todas") return products.length;
    return products.filter(
      (p) => (p.categoria || "").toLowerCase() === selectedCategory.toLowerCase()
    ).length;
  }, [products, reportType, selectedCategory]);

  const handleGenerate = () => {
    setIsGenerating(true);
    setLastGenerated(null);

    setTimeout(() => {
      try {
        let filename = "";
        if (reportType === "sales") {
          filename = generateSalesReportPDF({
            sales,
            startDate,
            endDate,
            storeConfig,
            currentUser,
          });
        } else if (reportType === "inventory") {
          filename = generateInventoryReportPDF({
            products,
            storeConfig,
            currentUser,
            filterCategory: selectedCategory,
          });
        } else if (reportType === "shift") {
          filename = generateShiftReportPDF({
            shift: activeShift || {},
            sales,
            storeConfig,
            currentUser,
          });
        }
        setLastGenerated(filename);
      } catch (err) {
        console.error("Error al generar PDF:", err);
        alert("Ocurrió un detalle al crear el PDF. Por favor verifica los datos.");
      } finally {
        setIsGenerating(false);
      }
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <div className="reports-modal-overlay" onClick={onClose}>
      <div
        className="reports-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="reports-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="reports-icon-badge">
              <FileText size={20} color="#6366f1" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
                Generador de Reportes PDF
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.8rem",
                  color: "var(--text-secondary, #64748b)",
                }}
              >
                Exporta informes oficiales, auditoría y balances listos para imprimir
              </p>
            </div>
          </div>
          <button className="reports-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="reports-modal-body">
          {/* Selector de Tipo de Reporte */}
          <label className="reports-section-title">Tipo de Reporte:</label>
          <div className="reports-type-grid">
            <button
              type="button"
              className={`reports-type-card ${
                reportType === "sales" ? "active" : ""
              }`}
              onClick={() => setReportType("sales")}
            >
              <TrendingUp size={22} className="type-icon" />
              <div>
                <strong>Reporte de Ventas</strong>
                <span>Historial, facturación y medios de pago</span>
              </div>
            </button>

            <button
              type="button"
              className={`reports-type-card ${
                reportType === "inventory" ? "active" : ""
              }`}
              onClick={() => setReportType("inventory")}
            >
              <Package size={22} className="type-icon" />
              <div>
                <strong>Inventario y Existencias</strong>
                <span>Valoración a costo/venta y stock crítico</span>
              </div>
            </button>

            <button
              type="button"
              className={`reports-type-card ${
                reportType === "shift" ? "active" : ""
              }`}
              onClick={() => setReportType("shift")}
            >
              <DollarSign size={22} className="type-icon" />
              <div>
                <strong>Arqueo / Cierre de Caja</strong>
                <span>Balance del turno, descuadres y firmas</span>
              </div>
            </button>
          </div>

          {/* Opciones según el tipo de reporte */}
          {reportType === "sales" && (
            <div className="reports-options-panel">
              <label className="reports-section-title">Rango de Fechas:</label>
              <div className="reports-pills-row">
                <button
                  type="button"
                  className={`reports-pill ${dateFilter === "today" ? "active" : ""}`}
                  onClick={() => handleDatePreset("today")}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  className={`reports-pill ${dateFilter === "7days" ? "active" : ""}`}
                  onClick={() => handleDatePreset("7days")}
                >
                  Últimos 7 días
                </button>
                <button
                  type="button"
                  className={`reports-pill ${dateFilter === "month" ? "active" : ""}`}
                  onClick={() => handleDatePreset("month")}
                >
                  Este Mes
                </button>
                <button
                  type="button"
                  className={`reports-pill ${dateFilter === "all" ? "active" : ""}`}
                  onClick={() => handleDatePreset("all")}
                >
                  Todo el Historial
                </button>
                <button
                  type="button"
                  className={`reports-pill ${dateFilter === "custom" ? "active" : ""}`}
                  onClick={() => setDateFilter("custom")}
                >
                  Personalizado
                </button>
              </div>

              {dateFilter === "custom" && (
                <div className="reports-date-inputs">
                  <div className="date-field">
                    <label>Desde:</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="date-field">
                    <label>Hasta:</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="reports-preview-badge">
                <CheckCircle2 size={15} color="#10b981" />
                <span>
                  <strong>{filteredSalesCount}</strong> transacciones se incluirán en el reporte.
                </span>
              </div>
            </div>
          )}

          {reportType === "inventory" && (
            <div className="reports-options-panel">
              <label className="reports-section-title">Filtrar por Categoría:</label>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="reports-select"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c === "todas" ? "📦 Todas las categorías" : c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="reports-preview-badge">
                <CheckCircle2 size={15} color="#10b981" />
                <span>
                  <strong>{filteredProductsCount}</strong> productos incluidos en la valoración.
                </span>
              </div>
            </div>
          )}

          {reportType === "shift" && (
            <div className="reports-options-panel">
              <div className="reports-shift-info">
                {activeShift ? (
                  <>
                    <p style={{ margin: "0 0 6px 0", fontSize: "0.88rem" }}>
                      <strong>Turno Activo:</strong> #{activeShift.id?.slice(-6) || "ACTUAL"}
                    </p>
                    <p style={{ margin: "0 0 6px 0", fontSize: "0.85rem", color: "#64748b" }}>
                      Cajero: {activeShift.cajeroNombre || currentUser?.nombre || "Cajero"} •
                      Base inicial: ${(Number(activeShift.baseInicial || activeShift.base) || 0).toLocaleString()}
                    </p>
                    <span style={{ fontSize: "0.78rem", color: "#10b981", fontWeight: 600 }}>
                      ✓ Listo para generar balance y acta de firmas de entrega de turno.
                    </span>
                  </>
                ) : (
                  <p style={{ margin: 0, color: "#f59e0b", fontSize: "0.85rem" }}>
                    ℹ️ No hay un turno abierto actualmente. Se generará una plantilla de arqueo en blanco para toma física.
                  </p>
                )}
              </div>
            </div>
          )}

          {lastGenerated && (
            <div className="reports-success-alert">
              <CheckCircle2 size={18} color="#10b981" />
              <span>
                Reporte <strong>{lastGenerated}</strong> descargado exitosamente.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="reports-modal-footer">
          <button type="button" className="reports-btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="reports-btn-primary"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            <Download size={16} />
            {isGenerating ? "Generando PDF..." : "Descargar Reporte PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
