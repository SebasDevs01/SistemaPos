import React, { useState, useMemo } from "react";
import { getColombiaTimeInfo } from "../services/firestoreService";
import {
  BarChart3,
  DollarSign,
  Receipt,
  Download,
  Printer,
  Calendar,
  CreditCard,
  Eye,
  Search,
  User,
  Clock,
  Package,
  Layers,
  TrendingUp,
  Wallet,
  Smartphone,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Moon,
  Sun,
  ShieldCheck,
  Tag,
  FileText,
  Armchair,
  ArrowUpCircle,
  ArrowDownCircle,
  Activity,
  Trash2,
  Sparkles
} from "lucide-react";
import ReportsModal from "./ReportsModal";

export default function SalesView({ 
  sales = [], 
  products = [], 
  currentUser, 
  storeConfig, 
  onPrintTicket, 
  activeShift = null, 
  shiftClosings = [],
  onDeleteSale,
  onCleanDuplicates
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("today"); // 'today' | 'yesterday' | '7days' | 'month' | 'all' | 'custom'
  const [customDate, setCustomDate] = useState(() => getColombiaTimeInfo().dateStr);
  const [selectedMethod, setSelectedMethod] = useState("all");
  const [selectedSale, setSelectedSale] = useState(null);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);

  // ──────────────────────────────────────────────
  // Filtro de ventas por Fecha y Criterios (Zona Horaria Colombia)
  // ──────────────────────────────────────────────
  const filteredByDate = useMemo(() => {
    const todayColombiaStr = getColombiaTimeInfo().dateStr;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOf7Days = startOfToday - 6 * 86400000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return sales.filter((s) => {
      const saleColInfo = getColombiaTimeInfo(s.fecha);
      const saleDateStr = saleColInfo.dateStr;
      const saleTime = new Date(s.fecha).getTime();

      if (dateFilter === "today") return saleDateStr === todayColombiaStr || saleTime >= startOfToday;
      if (dateFilter === "yesterday") return saleTime >= startOfYesterday && saleTime < startOfToday;
      if (dateFilter === "7days") return saleTime >= startOf7Days;
      if (dateFilter === "month") return saleTime >= startOfMonth;
      if (dateFilter === "custom" && customDate) {
        return saleDateStr === customDate;
      }
      return true; // 'all'
    });
  }, [sales, dateFilter, customDate]);

  const filteredSales = useMemo(() => {
    return filteredByDate.filter((s) => {
      // Método de pago
      if (selectedMethod !== "all" && (s.metodoPago || "Efectivo") !== selectedMethod) {
        return false;
      }
      // Búsqueda por texto (cliente, dni, id de venta, nombre de artículo, código de producto)
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const idMatch = (s.id || "").toLowerCase().includes(q);
      const clientNameMatch = (s.cliente?.nombre || "").toLowerCase().includes(q);
      const clientDniMatch = (s.cliente?.dni || "").toLowerCase().includes(q);
      const methodMatch = (s.metodoPago || "").toLowerCase().includes(q);
      const cashierMatch = (s.vendedor || "").toLowerCase().includes(q);
      const itemMatch = (s.items || []).some(
        (it) => (it.nombre || "").toLowerCase().includes(q) || String(it.codigo || "").toLowerCase().includes(q)
      );
      return idMatch || clientNameMatch || clientDniMatch || methodMatch || cashierMatch || itemMatch;
    });
  }, [filteredByDate, selectedMethod, searchTerm]);

  // ──────────────────────────────────────────────
  // Métricas de Cuadre de Caja (Cierre de Turno / Noche)
  // ──────────────────────────────────────────────
  const metrics = useMemo(() => {
    let totalCash = 0;
    let totalNequi = 0;
    let totalDaviplata = 0;
    let totalCard = 0;
    let totalOther = 0;
    let totalAmount = 0;
    let totalUnitsSold = 0;

    // Conteo por métodos
    const countByMethod = { Efectivo: 0, Nequi: 0, Daviplata: 0, Tarjeta: 0, Otro: 0 };

    // Ranking de productos más vendidos
    const productStats = {};

    filteredSales.forEach((s) => {
      const tot = Number(s.total) || 0;
      totalAmount += tot;
      const method = s.metodoPago || "Efectivo";

      if (method === "Efectivo") {
        totalCash += tot;
        countByMethod.Efectivo++;
      } else if (method === "Nequi") {
        totalNequi += tot;
        countByMethod.Nequi++;
      } else if (method === "Daviplata") {
        totalDaviplata += tot;
        countByMethod.Daviplata++;
      } else if (method === "Tarjeta" || method.toLowerCase().includes("tarjeta")) {
        totalCard += tot;
        countByMethod.Tarjeta++;
      } else {
        totalOther += tot;
        countByMethod.Otro++;
      }

      (s.items || []).forEach((it) => {
        const qty = Number(it.cantidad) || 1;
        totalUnitsSold += qty;
        const code = it.codigo || it.productId || "SIN-COD";
        const key = `${code}-${it.nombre}`;
        if (!productStats[key]) {
          productStats[key] = {
            codigo: code,
            nombre: it.nombre || "Artículo",
            categoria: it.categoria || "General",
            unidades: 0,
            ingresos: 0
          };
        }
        productStats[key].unidades += qty;
        productStats[key].ingresos += Number(it.subtotal) || (Number(it.precioUnitario) * qty) || 0;
      });
    });

    const topProducts = Object.values(productStats)
      .sort((a, b) => b.unidades - a.unidades)
      .slice(0, 5);

    const totalTickets = filteredSales.length;
    const avgTicket = totalTickets > 0 ? Math.round(totalAmount / totalTickets) : 0;

    return {
      totalAmount,
      totalTickets,
      avgTicket,
      totalUnitsSold,
      totalCash,
      totalNequi,
      totalDaviplata,
      totalCard,
      totalOther,
      countByMethod,
      topProducts
    };
  }, [filteredSales]);

  // Ventas por bloques de hora (para gráfico visual)
  const hourlySales = useMemo(() => {
    const blocks = {
      "Mañana (6am - 12pm)": 0,
      "Tarde (12pm - 6pm)": 0,
      "Noche (6pm - 11pm)": 0
    };
    filteredSales.forEach((s) => {
      const h = new Date(s.fecha).getHours();
      const tot = Number(s.total) || 0;
      if (h >= 6 && h < 12) blocks["Mañana (6am - 12pm)"] += tot;
      else if (h >= 12 && h < 18) blocks["Tarde (12pm - 6pm)"] += tot;
      else blocks["Noche (6pm - 11pm)"] += tot;
    });
    return blocks;
  }, [filteredSales]);

  // ──────────────────────────────────────────────
  // ──────────────────────────────────────────────
  // EXPORTADOR A EXCEL PROFESIONAL Y CRM (.XLSX)
  // ──────────────────────────────────────────────
  const exportToProfessionalExcel = async () => {
    if (filteredSales.length === 0) {
      alert("No hay ventas en el período seleccionado para exportar.");
      return;
    }

    try {
      setIsExportingExcel(true);
      const { generateCrmSalesReport } = await import("../utils/crmExcelExport");
      await generateCrmSalesReport({
        sales,
        filteredSales,
        products,
        currentUser,
        storeConfig,
        dateFilter,
        customDate
      });
    } catch (err) {
      console.error("Error al generar reporte Excel CRM:", err);
      alert("Hubo un error al generar el archivo Excel: " + (err?.message || err));
    } finally {
      setIsExportingExcel(false);
    }
  };

  // ── Exportar PDF con diseño de factura / reporte de ventas ──
  const exportToPdf = () => {
    if (filteredSales.length === 0) {
      alert("No hay ventas en el período seleccionado para exportar.");
      return;
    }
    setIsExportingPdf(true);
    const businessName = storeConfig?.nombre || "Miscelánea María José";
    const businessNit = storeConfig?.nit || "";
    const businessAddr = storeConfig?.direccion || "";
    const businessPhone = storeConfig?.telefono || "";
    const now = new Date().toLocaleString("es-CO");
    const operador = currentUser?.nombre || "Cajero";
    const periodLabel =
      dateFilter === "today" ? `Hoy (${new Date().toLocaleDateString("es-CO")})` :
        dateFilter === "yesterday" ? "Ayer" :
          dateFilter === "7days" ? "Últimos 7 días" :
            dateFilter === "month" ? "Este mes" :
              dateFilter === "custom" ? `Fecha: ${customDate}` : "Historial completo";

    const totals = metrics;

    const rows = filteredSales.map((s, i) => {
      const isAlq = s.tipoVenta === "alquiler" || s.tipoVenta === "alquiler_abono" || s.tipoVenta === "alquiler_saldo" || s.tipoVenta === "alquiler_dano";
      const alqBadge = s.tipoVenta === "alquiler_abono" ? "🎄 ABONO ALQUILER" : s.tipoVenta === "alquiler_saldo" ? "💰 SALDO ALQUILER" : s.tipoVenta === "alquiler_dano" ? "⚠️ DAÑO ALQUILER" : "🪑 ALQUILER";
      const items = (s.items || []).map(it =>
        `<tr><td>${it.nombre || "Artículo"}</td><td style="text-align:center">${it.cantidad}</td><td style="text-align:right">$${Number(it.precioUnitario || 0).toLocaleString("es-CO")}</td><td style="text-align:right">$${Number(it.subtotal || 0).toLocaleString("es-CO")}</td></tr>`
      ).join("");
      return `
        <div class="sale-block${isAlq ? " rental" : ""}">
          <div class="sale-header">
            <span class="sale-num">#${i + 1} ${isAlq ? alqBadge : ""}</span>
            <span class="sale-id">${s.id || ""}</span>
            <span class="sale-date">${new Date(s.fecha).toLocaleString("es-CO")}</span>
          </div>
          <div class="sale-client"><strong>Cliente:</strong> ${s.cliente?.nombre || "Mostrador"} &nbsp;|&nbsp; <strong>Pago:</strong> ${s.metodoPago || "Efectivo"} &nbsp;|&nbsp; <strong>Cajero:</strong> ${s.vendedor || operador}</div>
          ${isAlq && s.cliente?.direccion ? `<div class="sale-client"><strong>📍 Dirección:</strong> ${s.cliente.direccion}</div>` : ""}
          <table class="items-table">
            <thead><tr><th>Artículo</th><th>Cant.</th><th>P. Unit.</th><th>Subtotal</th></tr></thead>
            <tbody>${items}</tbody>
          </table>
          <div class="sale-total">TOTAL: $${Number(s.total).toLocaleString("es-CO")} COP${s.deposito ? ` &nbsp;|&nbsp; Depósito: $${Number(s.deposito).toLocaleString("es-CO")}` : ""}</div>
        </div>`;
    }).join("");

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
      <title>Reporte de Ventas - ${businessName}</title>
      <style>
        @page { margin: 15mm; }
        * { box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
        body { background: white; color: #0f172a; font-size: 11px; }
        h1 { font-size: 16px; margin: 0 0 4px; color: #1e3a8a; }
        .meta { font-size: 10px; color: #64748b; margin-bottom: 16px; }
        .kpis { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        .kpi { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 14px; min-width: 120px; }
        .kpi-label { font-size: 9px; color: #64748b; text-transform: uppercase; }
        .kpi-val { font-size: 15px; font-weight: 800; color: #1e3a8a; }
        .sale-block { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: 10px; break-inside: avoid; }
        .sale-block.rental { border-color: #818cf8; background: #f5f3ff; }
        .sale-header { display: flex; gap: 10px; align-items: center; font-size: 10px; margin-bottom: 4px; }
        .sale-num { font-weight: 800; font-size: 11px; color: #1e3a8a; }
        .sale-id { color: #94a3b8; font-size: 9px; }
        .sale-date { margin-left: auto; color: #64748b; }
        .sale-client { font-size: 10px; color: #475569; margin-bottom: 6px; }
        .items-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .items-table th { background: #0f172a; color: white; padding: 4px 6px; text-align: left; }
        .items-table td { padding: 3px 6px; border-bottom: 1px solid #f1f5f9; }
        .sale-total { font-weight: 800; font-size: 12px; text-align: right; color: #059669; margin-top: 6px; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
      <h1>${businessName} — Reporte de Ventas</h1>
      <div class="meta">
        NIT: ${businessNit} &nbsp;|&nbsp; Tel: ${businessPhone} &nbsp;|&nbsp; Dir: ${businessAddr}<br/>
        Período: <strong>${periodLabel}</strong> &nbsp;|&nbsp; Operador: <strong>${operador}</strong> &nbsp;|&nbsp; Generado: ${now}
      </div>
      <div class="kpis">
        <div class="kpi"><div class="kpi-label">Total Ventas</div><div class="kpi-val">$${totals.totalAmount.toLocaleString("es-CO")}</div></div>
        <div class="kpi"><div class="kpi-label">Tickets</div><div class="kpi-val">${totals.totalTickets}</div></div>
        <div class="kpi"><div class="kpi-label">Efectivo</div><div class="kpi-val">$${totals.totalCash.toLocaleString("es-CO")}</div></div>
        <div class="kpi"><div class="kpi-label">Nequi</div><div class="kpi-val">$${totals.totalNequi.toLocaleString("es-CO")}</div></div>
        <div class="kpi"><div class="kpi-label">Daviplata</div><div class="kpi-val">$${totals.totalDaviplata.toLocaleString("es-CO")}</div></div>
        <div class="kpi"><div class="kpi-label">Unidades</div><div class="kpi-val">${totals.totalUnitsSold}</div></div>
      </div>
      ${rows}
    </body></html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); setIsExportingPdf(false); }, 600);
    } else {
      alert("Tu navegador bloqueó la ventana emergente. Permite las ventanas emergentes para esta página.");
      setIsExportingPdf(false);
    }
  };


  return (
    <div style={{ maxWidth: "1600px", margin: "0 auto", padding: "20px" }}>
      {/* ── CABECERA Y METADATOS DEL OPERADOR ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h2 style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
              <BarChart3 size={26} color="var(--accent-blue)" />
              Cierre de Caja, Historial y Reportes
            </h2>
            <span className="badge badge-emerald font-mono">EN VIVO</span>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Arqueo de caja nocturno, métricas por método de pago y exportación profesional a Excel.
          </p>
        </div>

        {/* Info Cajero Activo + Botón Excel */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "8px 14px", borderRadius: "10px",
            background: "var(--bg-tertiary)", border: "1px solid var(--border-color)",
            fontSize: "0.82rem", color: "var(--text-main)"
          }}>
            <User size={15} color="var(--accent-blue)" />
            <span>Operador: <strong>{currentUser?.nombre || "Cajero Principal"}</strong> ({currentUser?.rol || "Asistente"})</span>
          </div>

          <button
            onClick={exportToProfessionalExcel}
            disabled={isExportingExcel}
            className="btn btn-primary"
            style={{ padding: "10px 18px", fontSize: "0.92rem", background: "linear-gradient(135deg, #059669, #047857)", gap: "8px", opacity: isExportingExcel ? 0.7 : 1 }}
            title="Descargar libro Excel profesional multi-hoja con CRM, desglose de ítems, clientes, códigos y cuadre de caja"
          >
            <FileSpreadsheet size={18} />
            <span>{isExportingExcel ? "Generando Excel CRM..." : "Descargar Excel CRM (.xlsx)"}</span>
          </button>

          <button
            onClick={exportToPdf}
            disabled={isExportingPdf}
            className="btn btn-primary"
            style={{ padding: "10px 18px", fontSize: "0.92rem", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", gap: "8px", opacity: isExportingPdf ? 0.7 : 1 }}
            title="Exportar reporte de ventas como PDF imprimible con detalle de ítems y alquileres"
          >
            <FileText size={18} />
            <span>{isExportingPdf ? "Generando PDF..." : "Exportar PDF / Imprimir"}</span>
          </button>

          <button
            onClick={() => setIsReportsModalOpen(true)}
            className="btn btn-primary"
            style={{ padding: "10px 18px", fontSize: "0.92rem", background: "linear-gradient(135deg, #6366f1, #4f46e5)", gap: "8px" }}
            title="Abrir generador oficial de reportes PDF (Ventas, Inventario y Arqueos)"
          >
            <FileText size={18} />
            <span>Reportes PDF Oficiales</span>
          </button>

          {onCleanDuplicates && (
            <button
              onClick={onCleanDuplicates}
              className="btn btn-outline"
              style={{
                padding: "10px 16px",
                fontSize: "0.88rem",
                borderColor: "rgba(245, 158, 11, 0.5)",
                color: "#f59e0b",
                gap: "8px",
                background: "rgba(245, 158, 11, 0.08)"
              }}
              title="Escanear y eliminar ventas duplicadas en memoria y en Firestore"
            >
              <Sparkles size={16} />
              <span>Limpiar Duplicados</span>
            </button>
          )}
        </div>
      </div>

      {/* ── FILTROS POR FECHA (CUADRE DE CAJA NOCTURNO) ── */}
      <div className="glass-panel" style={{ padding: "14px 18px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "4px" }}>
              <Calendar size={14} /> Período:
            </span>

            {[
              { id: "today", label: "🌙 Hoy (Cierre de Noche)" },
              { id: "yesterday", label: "Ayer" },
              { id: "7days", label: "Últimos 7 días" },
              { id: "month", label: "Este Mes" },
              { id: "all", label: "Todo el Historial" }
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setDateFilter(btn.id)}
                className={`btn btn-sm ${dateFilter === btn.id ? "btn-primary" : "btn-outline"}`}
                style={{ fontSize: "0.78rem", padding: "5px 12px" }}
              >
                {btn.label}
              </button>
            ))}

            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "6px" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>O día:</span>
              <input
                type="date"
                className="form-input"
                style={{ padding: "4px 8px", fontSize: "0.78rem", width: "auto" }}
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  setDateFilter("custom");
                }}
              />
            </div>
          </div>

          <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
            Registros encontrados: <strong style={{ color: "var(--neon-indigo)" }}>{filteredSales.length}</strong> ventas
          </div>
        </div>
      </div>

      {/* ── CUADRE DE CAJA: RESUMEN DE ARQUEO POR MÉTODO ── */}
      <div style={{ marginBottom: "24px" }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          <Wallet size={16} color="#34d399" />
          Cuadre y Arqueo de Caja {dateFilter === "today" ? "de Hoy" : "(Período Seleccionado)"}
        </h3>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px"
        }}>
          {/* Total Ventas */}
          <div className="glass-panel" style={{ padding: "18px", borderLeft: "4px solid #10b981" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase" }}>
              TOTAL RECAUDADO
            </span>
            <div className="price-tag" style={{ fontSize: "1.9rem", fontWeight: 900, color: "#10b981", marginTop: "4px" }}>
              ${metrics.totalAmount.toLocaleString()} COP
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              {metrics.totalTickets} transacciones · {metrics.totalUnitsSold} unids
            </p>
          </div>

          {/* Efectivo */}
          <div className="glass-panel" style={{ padding: "18px", borderLeft: "4px solid #34d399" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase" }}>
                💵 EFECTIVO EN CAJA
              </span>
              <span className="badge badge-emerald">{metrics.countByMethod.Efectivo}</span>
            </div>
            <div className="price-tag" style={{ fontSize: "1.65rem", fontWeight: 800, color: "#34d399", marginTop: "4px" }}>
              ${metrics.totalCash.toLocaleString()} COP
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              {metrics.totalAmount > 0 ? ((metrics.totalCash / metrics.totalAmount) * 100).toFixed(1) : 0}% de las ventas
            </p>
          </div>

          {/* Nequi */}
          <div className="glass-panel" style={{ padding: "18px", borderLeft: "4px solid #c084fc" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase" }}>
                📱 NEQUI
              </span>
              <span className="badge badge-purple">{metrics.countByMethod.Nequi}</span>
            </div>
            <div className="price-tag" style={{ fontSize: "1.65rem", fontWeight: 800, color: "#c084fc", marginTop: "4px" }}>
              ${metrics.totalNequi.toLocaleString()} COP
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Transferencias Nequi
            </p>
          </div>

          {/* Daviplata */}
          <div className="glass-panel" style={{ padding: "18px", borderLeft: "4px solid #fb7185" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase" }}>
                📲 DAVIPLATA
              </span>
              <span className="badge badge-rose">{metrics.countByMethod.Daviplata}</span>
            </div>
            <div className="price-tag" style={{ fontSize: "1.65rem", fontWeight: 800, color: "#fb7185", marginTop: "4px" }}>
              ${metrics.totalDaviplata.toLocaleString()} COP
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Transferencias Daviplata
            </p>
          </div>

          {/* Tarjeta / Bancos */}
          <div className="glass-panel" style={{ padding: "18px", borderLeft: "4px solid #38bdf8" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase" }}>
                💳 TARJETA / BANCOS
              </span>
              <span className="badge badge-blue">{metrics.countByMethod.Tarjeta}</span>
            </div>
            <div className="price-tag" style={{ fontSize: "1.65rem", fontWeight: 800, color: "#38bdf8", marginTop: "4px" }}>
              ${metrics.totalCard.toLocaleString()} COP
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Datáfono / Tarjetas
            </p>
          </div>
        </div>
      </div>

      {/* ── SECCIÓN DE GRÁFICAS VISUALES ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "18px", marginBottom: "24px" }}>
        {/* Gráfica 1: Distribución Métodos de Pago */}
        <div className="glass-panel" style={{ padding: "20px" }}>
          <h4 style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
            <PieChartIcon size={16} color="var(--accent-blue)" /> Distribución por Método de Pago
          </h4>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              { label: "Efectivo", amount: metrics.totalCash, color: "#10b981", count: metrics.countByMethod.Efectivo },
              { label: "Nequi", amount: metrics.totalNequi, color: "#a855f7", count: metrics.countByMethod.Nequi },
              { label: "Daviplata", amount: metrics.totalDaviplata, color: "#f43f5e", count: metrics.countByMethod.Daviplata },
              { label: "Tarjeta", amount: metrics.totalCard, color: "#38bdf8", count: metrics.countByMethod.Tarjeta }
            ].map((m) => {
              const pct = metrics.totalAmount > 0 ? (m.amount / metrics.totalAmount) * 100 : 0;
              return (
                <div key={m.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{m.label} ({m.count} vtas)</span>
                    <span style={{ color: "var(--text-muted)" }}>${m.amount.toLocaleString()} COP (<strong>{pct.toFixed(1)}%</strong>)</span>
                  </div>
                  <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.08)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: m.color, borderRadius: "4px", transition: "width 0.4s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gráfica 2: Ventas por Bloque de Hora */}
        <div className="glass-panel" style={{ padding: "20px" }}>
          <h4 style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Clock size={16} color="var(--accent-gold)" /> Horarios de Mayor Facturación
          </h4>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {Object.entries(hourlySales).map(([block, amt]) => {
              const pct = metrics.totalAmount > 0 ? (amt / metrics.totalAmount) * 100 : 0;
              return (
                <div key={block}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{block}</span>
                    <span style={{ color: "var(--text-muted)" }}>${amt.toLocaleString()} COP (<strong>{pct.toFixed(1)}%</strong>)</span>
                  </div>
                  <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.08)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #6366f1, #818cf8)", borderRadius: "4px", transition: "width 0.4s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gráfica 3: Top 5 Artículos Más Vendidos */}
        <div className="glass-panel" style={{ padding: "20px" }}>
          <h4 style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
            <TrendingUp size={16} color="#34d399" /> Top 5 Artículos Vendidos
          </h4>

          {metrics.topProducts.length === 0 ? (
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>
              Sin artículos registrados en este período.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {metrics.topProducts.map((p, idx) => (
                <div key={p.codigo + idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.03)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--accent-blue)", width: "18px" }}>#{idx + 1}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-main)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.nombre}
                      </div>
                      <span className="font-mono" style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                        [{p.codigo}] · {p.categoria}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", marginLeft: "10px", flexShrink: 0 }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#10b981" }}>
                      ${p.ingresos.toLocaleString()} COP
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                      <strong>{p.unidades}</strong> unids
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── SECCIÓN DE ENTRADAS Y SALIDAS DE CAJA ── */}
      <CashMovementsSection
        activeShift={activeShift}
        shiftClosings={shiftClosings}
        dateFilter={dateFilter}
        customDate={customDate}
      />

      {/* ── BARRA DE BÚSQUEDA Y FILTRO RÁPIDO ── */}
      <div className="glass-panel" style={{ padding: "14px 20px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          {/* Buscador */}
          <div style={{ position: "relative", flex: 1, minWidth: "260px", maxWidth: "520px" }}>
            <Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              className="form-input"
              placeholder="Buscar por cliente, DNI, código de producto, artículo o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: "42px" }}
            />
          </div>

          {/* Filtro por método de pago */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 700 }}>Método:</span>
            <select
              className="form-select"
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              style={{ padding: "6px 28px 6px 12px", fontSize: "0.82rem", minWidth: "140px" }}
            >
              <option value="all">Todos los métodos</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Nequi">Nequi</option>
              <option value="Daviplata">Daviplata</option>
              <option value="Tarjeta">Tarjeta</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── TABLA DE VENTAS CON CLIENTE, ARTÍCULOS Y CÓDIGOS ── */}
      <div className="glass-panel" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-color)", background: "rgba(0, 0, 0, 0.18)" }}>
              <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 700 }}>N° Ticket</th>
              <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 700 }}>Fecha y Hora</th>
              <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 700 }}>Cajero</th>
              <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 700 }}>Cliente</th>
              <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 700 }}>Método</th>
              <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 700 }}>Artículos Vendidos (Código & Nombre)</th>
              <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 700 }}>Total COP</th>
              <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 700, textAlign: "right" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ padding: "36px", textAlign: "center", color: "var(--text-muted)" }}>
                  No se encontraron ventas para los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => {
                const totalUnits = (sale.items || []).reduce((acc, it) => acc + (Number(it.cantidad) || 1), 0);
                return (
                  <tr
                    key={sale.id || sale.orderNumber}
                    style={{ borderBottom: "1px solid var(--border-color)", transition: "background 0.15s" }}
                  >
                    {/* Ticket */}
                    <td style={{ padding: "12px 16px" }}>
                      <span className="badge badge-blue font-mono" style={{ fontSize: "0.75rem" }}>
                        {sale.id || `#${sale.orderNumber}`}
                      </span>
                    </td>

                    {/* Fecha */}
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                      {new Date(sale.fecha).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                    </td>

                    {/* Cajero */}
                    <td style={{ padding: "12px 16px", color: "var(--text-main)", fontSize: "0.82rem" }}>
                      {sale.vendedor || currentUser?.nombre || "Cajero"}
                    </td>

                    {/* Cliente */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.85rem" }}>
                        {sale.cliente?.nombre || "Cliente Mostrador"}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        DNI: {sale.cliente?.dni || "0"}
                      </div>
                    </td>

                    {/* Método de Pago */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span className={`badge ${sale.metodoPago === "Efectivo" ? "badge-emerald" :
                            sale.metodoPago === "Nequi" ? "badge-purple" :
                              sale.metodoPago === "Daviplata" ? "badge-rose" : "badge-blue"
                          }`}>
                          {sale.metodoPago || "Efectivo"}
                        </span>
                        {(sale.tipoVenta === "alquiler" || sale.tipoVenta === "alquiler_abono" || sale.tipoVenta === "alquiler_saldo" || sale.tipoVenta === "alquiler_dano") && (
                          <span className={`badge ${sale.tipoVenta === "alquiler_abono" ? "badge-emerald" : sale.tipoVenta === "alquiler_dano" ? "badge-rose" : "badge-indigo"}`} style={{ fontSize: "0.65rem" }}>
                            {sale.tipoVenta === "alquiler_abono" ? "🎄 Abono Alquiler" : sale.tipoVenta === "alquiler_saldo" ? "💰 Saldo Alquiler" : sale.tipoVenta === "alquiler_dano" ? "⚠️ Daño Mobiliario" : "🪑 Alquiler"}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Artículos vendidos con Código y Nombre */}
                    <td style={{ padding: "12px 16px", maxWidth: "380px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        {(sale.items || []).slice(0, 3).map((it, idx) => (
                          <div key={idx} style={{ fontSize: "0.78rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
                            <span className="badge badge-gray font-mono" style={{ fontSize: "0.68rem", padding: "1px 5px" }}>
                              {it.codigo || it.productId || "COD"}
                            </span>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              <strong>{it.cantidad}x</strong> {it.nombre}
                            </span>
                          </div>
                        ))}
                        {(sale.items || []).length > 3 && (
                          <span style={{ fontSize: "0.7rem", color: "var(--accent-blue)", fontWeight: 700 }}>
                            +{(sale.items || []).length - 3} producto(s) más...
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Total */}
                    <td style={{ padding: "12px 16px" }}>
                      <span className="price-tag" style={{ color: "#10b981", fontWeight: 800, fontSize: "0.95rem" }}>
                        ${Number(sale.total).toLocaleString()} COP
                      </span>
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                        <button
                          onClick={() => setSelectedSale(sale)}
                          className="btn btn-outline btn-sm"
                          style={{ padding: "5px 9px", fontSize: "0.75rem" }}
                          title="Ver detalle completo de los artículos e importes"
                        >
                          <Eye size={14} />
                          <span>Detalle</span>
                        </button>

                        <button
                          onClick={() => onPrintTicket(sale)}
                          className="btn btn-outline btn-sm"
                          style={{ padding: "5px 9px", fontSize: "0.75rem" }}
                          title="Re-imprimir ticket térmico"
                        >
                          <Printer size={14} />
                        </button>

                        {onDeleteSale && (
                          <button
                            onClick={() => {
                              if (confirm(`¿Estás seguro de eliminar la venta #${sale.id || sale.orderNumber}?`)) {
                                onDeleteSale(sale.id);
                              }
                            }}
                            className="btn btn-outline btn-sm"
                            style={{ padding: "5px 9px", fontSize: "0.75rem", color: "#f87171", borderColor: "rgba(239, 68, 68, 0.3)" }}
                            title="Eliminar venta de la lista y de Firebase"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── MODAL DE DETALLE COMPLETO DE VENTA ── */}
      {selectedSale && (
        <div className="modal-overlay" onClick={() => setSelectedSale(null)}>
          <div className="modal-box" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <Receipt size={18} color="var(--accent-blue)" /> Detalle de Venta #{selectedSale.id || selectedSale.orderNumber}
              </h3>
              <button className="modal-close" onClick={() => setSelectedSale(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Info general */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px",
                padding: "12px 14px", borderRadius: "10px",
                background: "var(--bg-tertiary)", border: "1px solid var(--border-color)",
                fontSize: "0.8rem"
              }}>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block" }}>Cliente:</span>
                  <strong style={{ color: "var(--text-main)" }}>{selectedSale.cliente?.nombre || "Cliente Mostrador"}</strong>
                  <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.75rem" }}>
                    DNI: {selectedSale.cliente?.dni || "0"}
                  </span>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block" }}>Fecha y Hora:</span>
                  <strong style={{ color: "var(--text-main)" }}>
                    {new Date(selectedSale.fecha).toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block" }}>Cajero Responsable:</span>
                  <strong style={{ color: "var(--text-main)" }}>{selectedSale.vendedor || currentUser?.nombre || "Cajero"}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block" }}>Método de Pago:</span>
                  <strong style={{ color: "var(--accent-blue)" }}>{selectedSale.metodoPago || "Efectivo"}</strong>
                </div>
              </div>

              {/* Lista de productos desglosados */}
              <div>
                <h4 style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "8px" }}>
                  Artículos Desglosados ({(selectedSale.items || []).length}):
                </h4>
                <div style={{ maxHeight: "260px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {(selectedSale.items || []).map((it, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 12px", borderRadius: "8px",
                        background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)"
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-main)" }}>
                          {it.nombre}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", marginTop: "2px" }}>
                          <span className="font-mono">Código: #{it.codigo || it.productId || "S/C"}</span>
                          <span>·</span>
                          {it.genero && (
                            <>
                              <span style={{ color: "#fbbf24", fontWeight: 700 }}>{it.genero}</span>
                              <span>·</span>
                            </>
                          )}
                          {it.talla && (
                            <>
                              <span style={{ color: "#93c5fd", fontWeight: 700 }}>Talla: {it.talla}</span>
                              <span>·</span>
                            </>
                          )}
                          <span>Pres: {it.presentacion || "Unidad"}</span>
                          <span>·</span>
                          <span>Cant: <strong>{it.cantidad}</strong></span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className="price-tag" style={{ color: "#10b981", fontWeight: 800, fontSize: "0.88rem" }}>
                          ${Number(it.subtotal || (it.precioUnitario * it.cantidad)).toLocaleString()} COP
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          ${Number(it.precioUnitario).toLocaleString()} c/u
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desglose de Totales */}
              <div style={{
                padding: "12px 14px", borderRadius: "10px",
                background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)",
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>TOTAL DE LA VENTA</span>
                  <span style={{ fontSize: "1.4rem", fontWeight: 900, color: "#10b981" }}>
                    ${Number(selectedSale.total).toLocaleString()} COP
                  </span>
                </div>
                {selectedSale.efectivoRecibido > 0 && (
                  <div style={{ textAlign: "right", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    <div>Efectivo: ${Number(selectedSale.efectivoRecibido).toLocaleString()}</div>
                    <div>Cambio: ${Number(selectedSale.cambio || 0).toLocaleString()}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-outline"
                onClick={() => {
                  onPrintTicket(selectedSale);
                }}
              >
                <Printer size={15} /> Imprimir Comprobante
              </button>
              <button className="btn btn-primary" onClick={() => setSelectedSale(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reportes PDF Oficiales */}
      <ReportsModal
        isOpen={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
        sales={sales}
        products={products}
        activeShift={activeShift}
        storeConfig={storeConfig}
        currentUser={currentUser}
      />
    </div>
  );
}

// Icono simple para el gráfico
function PieChartIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────
// Sección de Entradas y Salidas de Caja (Movimientos manuales)
// ──────────────────────────────────────────────────────────
function CashMovementsSection({ activeShift, shiftClosings, dateFilter, customDate }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [movFilter, setMovFilter] = useState("all"); // 'all' | 'ingreso' | 'egreso'
  const [movSearch, setMovSearch] = useState("");

  // Recopilar todos los movimientos manuales de caja filtrados por período
  const allMovements = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOf7Days = startOfToday - 6 * 86400000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const inRange = (fechaStr) => {
      if (!fechaStr) return false;
      const t = new Date(fechaStr).getTime();
      if (isNaN(t)) return false;
      if (dateFilter === "today") return t >= startOfToday;
      if (dateFilter === "yesterday") return t >= startOfYesterday && t < startOfToday;
      if (dateFilter === "7days") return t >= startOf7Days;
      if (dateFilter === "month") return t >= startOfMonth;
      if (dateFilter === "custom" && customDate) {
        return new Date(fechaStr).toISOString().split("T")[0] === customDate;
      }
      return true; // 'all'
    };

    const collected = [];

    // 1. Movimientos del turno activo
    if (activeShift && Array.isArray(activeShift.movimientos)) {
      activeShift.movimientos.forEach(m => {
        if (inRange(m.fecha)) {
          collected.push({
            ...m,
            shiftId: activeShift.id,
            cajeroNombre: activeShift.cajero || "Cajero",
            turnoLabel: "Turno Activo"
          });
        }
      });
    }

    // 2. Movimientos de cierres históricos
    (shiftClosings || []).forEach(closing => {
      if (Array.isArray(closing.movimientos)) {
        closing.movimientos.forEach(m => {
          if (inRange(m.fecha)) {
            collected.push({
              ...m,
              shiftId: closing.shiftId || closing.id,
              cajeroNombre: m.cajero?.nombre || m.cajero || closing.cajeroApertura || "Cajero",
              turnoLabel: `Turno ${new Date(closing.fechaApertura || m.fecha).toLocaleDateString("es-CO")}`
            });
          }
        });
      }
    });

    // Deduplicar movimientos por ID y por clave única (tipo + monto + motivo + timestamp cercano)
    const seenMovIds = new Set();
    const deduplicated = [];
    for (const m of collected) {
      if (m.id && seenMovIds.has(m.id)) continue;
      if (m.id) seenMovIds.add(m.id);

      const mTime = new Date(m.fecha || 0).getTime();
      const isDupe = deduplicated.some(existing => {
        const eTime = new Date(existing.fecha || 0).getTime();
        const sameTipo = existing.tipo === m.tipo;
        const sameMonto = Number(existing.monto) === Number(m.monto);
        const sameMotivo = String(existing.motivo || "").trim().toLowerCase() === String(m.motivo || "").trim().toLowerCase();
        const diffMs = Math.abs(mTime - eTime);
        return sameTipo && sameMonto && sameMotivo && diffMs < 180000;
      });

      if (!isDupe) {
        deduplicated.push(m);
      }
    }

    // Ordenar más recientes primero
    return deduplicated.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [activeShift, shiftClosings, dateFilter, customDate]);

  // Métricas de movimientos
  const movMetrics = useMemo(() => {
    const entradas = allMovements.filter(m => m.tipo === "ingreso");
    const salidas = allMovements.filter(m => m.tipo === "egreso");
    const totalEntradas = entradas.reduce((s, m) => s + (Number(m.monto) || 0), 0);
    const totalSalidas = salidas.reduce((s, m) => s + (Number(m.monto) || 0), 0);
    return { entradas, salidas, totalEntradas, totalSalidas, neto: totalEntradas - totalSalidas };
  }, [allMovements]);

  // Filtro aplicado
  const filteredMovements = useMemo(() => {
    return allMovements.filter(m => {
      if (movFilter === "ingreso" && m.tipo !== "ingreso") return false;
      if (movFilter === "egreso" && m.tipo !== "egreso") return false;
      if (movSearch.trim()) {
        const q = movSearch.toLowerCase();
        return (
          (m.motivo || "").toLowerCase().includes(q) ||
          (m.cajeroNombre || "").toLowerCase().includes(q) ||
          (m.turnoLabel || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allMovements, movFilter, movSearch]);

  // Si no hay ningún movimiento en el período, mostrar sección colapsada mínima
  const hasAny = allMovements.length > 0;

  return (
    <div style={{ marginBottom: "24px" }}>
      {/* Cabecera de la sección */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: isExpanded ? "14px" : "0", cursor: "pointer", userSelect: "none"
        }}
        onClick={() => setIsExpanded(v => !v)}
      >
        <h3 style={{
          fontSize: "0.95rem", fontWeight: 800, color: "var(--text-main)",
          display: "flex", alignItems: "center", gap: "8px",
          textTransform: "uppercase", letterSpacing: "0.04em", margin: 0
        }}>
          <Activity size={16} color="#f59e0b" />
          Entradas y Salidas de Caja
          {hasAny && (
            <span className="badge badge-amber" style={{ fontSize: "0.7rem", textTransform: "none" }}>
              {allMovements.length} movimiento{allMovements.length !== 1 ? "s" : ""}
            </span>
          )}
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {hasAny && (
            <div style={{ display: "flex", gap: "8px", fontSize: "0.78rem", pointerEvents: "none" }}>
              <span style={{ color: "#34d399", fontWeight: 700 }}>↑ +${movMetrics.totalEntradas.toLocaleString()}</span>
              <span style={{ color: "#f87171", fontWeight: 700 }}>↓ -${movMetrics.totalSalidas.toLocaleString()}</span>
            </div>
          )}
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {isExpanded ? "▲ Ocultar" : "▼ Mostrar"}
          </span>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Tarjetas de métricas de movimientos */}
          {hasAny && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "14px" }}>
              {/* Total entradas */}
              <div className="glass-panel" style={{ padding: "16px", borderLeft: "4px solid #34d399" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <ArrowUpCircle size={16} color="#34d399" />
                  <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>Entradas Caja</span>
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#34d399" }}>
                  +${movMetrics.totalEntradas.toLocaleString()} COP
                </div>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  {movMetrics.entradas.length} ingreso{movMetrics.entradas.length !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Total salidas */}
              <div className="glass-panel" style={{ padding: "16px", borderLeft: "4px solid #f87171" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <ArrowDownCircle size={16} color="#f87171" />
                  <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>Salidas / Gastos</span>
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#f87171" }}>
                  -${movMetrics.totalSalidas.toLocaleString()} COP
                </div>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  {movMetrics.salidas.length} egreso{movMetrics.salidas.length !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Neto */}
              <div className="glass-panel" style={{ padding: "16px", borderLeft: `4px solid ${movMetrics.neto >= 0 ? "#34d399" : "#f87171"}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <Wallet size={16} color={movMetrics.neto >= 0 ? "#34d399" : "#f87171"} />
                  <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>Neto (Ent. - Sal.)</span>
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 900, color: movMetrics.neto >= 0 ? "#34d399" : "#f87171" }}>
                  {movMetrics.neto >= 0 ? "+" : ""}{movMetrics.neto.toLocaleString()} COP
                </div>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Balance del período
                </p>
              </div>
            </div>
          )}

          {/* Tabla de movimientos */}
          <div className="glass-panel" style={{ overflow: "hidden" }}>
            {/* Barra de filtros */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 16px", borderBottom: "1px solid var(--border-color)",
              flexWrap: "wrap", gap: "10px"
            }}>
              <div style={{ display: "flex", gap: "6px" }}>
                {[
                  { id: "all", label: "Todos" },
                  { id: "ingreso", label: "↑ Entradas" },
                  { id: "egreso", label: "↓ Salidas" }
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={e => { e.stopPropagation(); setMovFilter(f.id); }}
                    className={`btn btn-sm ${movFilter === f.id ? "btn-primary" : "btn-outline"}`}
                    style={{
                      fontSize: "0.75rem", padding: "4px 10px",
                      background: movFilter === f.id
                        ? (f.id === "ingreso" ? "rgba(52,211,153,0.25)" : f.id === "egreso" ? "rgba(248,113,113,0.25)" : undefined)
                        : undefined,
                      borderColor: movFilter === f.id
                        ? (f.id === "ingreso" ? "#34d399" : f.id === "egreso" ? "#f87171" : undefined)
                        : undefined
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div style={{ position: "relative", minWidth: "200px" }}>
                <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Buscar movimiento..."
                  value={movSearch}
                  onChange={e => setMovSearch(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  style={{ paddingLeft: "32px", fontSize: "0.78rem", padding: "6px 10px 6px 32px" }}
                />
              </div>
            </div>

            {/* Contenido de la tabla */}
            {!hasAny ? (
              <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
                <Activity size={28} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
                <p style={{ fontSize: "0.85rem", margin: 0 }}>No hay entradas ni salidas de caja registradas en este período.</p>
                <p style={{ fontSize: "0.75rem", marginTop: "4px", opacity: 0.6 }}>Los movimientos manuales de caja aparecerán aquí al registrarlos desde el módulo de Caja.</p>
              </div>
            ) : filteredMovements.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                No se encontraron movimientos con ese filtro.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-color)", background: "rgba(0,0,0,0.12)" }}>
                      <th style={{ padding: "10px 14px", color: "var(--text-muted)", fontWeight: 700 }}>Tipo</th>
                      <th style={{ padding: "10px 14px", color: "var(--text-muted)", fontWeight: 700 }}>Fecha y Hora</th>
                      <th style={{ padding: "10px 14px", color: "var(--text-muted)", fontWeight: 700 }}>Motivo / Concepto</th>
                      <th style={{ padding: "10px 14px", color: "var(--text-muted)", fontWeight: 700 }}>Cajero</th>
                      <th style={{ padding: "10px 14px", color: "var(--text-muted)", fontWeight: 700 }}>Turno</th>
                      <th style={{ padding: "10px 14px", color: "var(--text-muted)", fontWeight: 700, textAlign: "right" }}>Monto COP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMovements.map((m, idx) => {
                      const isIngreso = m.tipo === "ingreso";
                      return (
                        <tr
                          key={m.id || `mov-${idx}`}
                          style={{ borderBottom: "1px solid var(--border-color)", transition: "background 0.15s" }}
                        >
                          {/* Tipo */}
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: "5px",
                              padding: "3px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 800,
                              background: isIngreso ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)",
                              color: isIngreso ? "#34d399" : "#f87171",
                              border: `1px solid ${isIngreso ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`
                            }}>
                              {isIngreso ? <ArrowUpCircle size={12} /> : <ArrowDownCircle size={12} />}
                              {isIngreso ? "Entrada" : "Salida"}
                            </span>
                          </td>

                          {/* Fecha y Hora */}
                          <td style={{ padding: "10px 14px", color: "var(--text-muted)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                            {m.fecha ? new Date(m.fecha).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "—"}
                          </td>

                          {/* Motivo */}
                          <td style={{ padding: "10px 14px", color: "var(--text-main)", fontWeight: 600 }}>
                            {m.motivo || (isIngreso ? "Entrada de efectivo" : "Salida / Gasto")}
                          </td>

                          {/* Cajero */}
                          <td style={{ padding: "10px 14px", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                            {m.cajeroNombre || m.cajero || "—"}
                          </td>

                          {/* Turno */}
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", background: "rgba(255,255,255,0.05)", padding: "2px 7px", borderRadius: "5px", border: "1px solid var(--border-color)" }}>
                              {m.turnoLabel || "Turno"}
                            </span>
                          </td>

                          {/* Monto */}
                          <td style={{ padding: "10px 14px", textAlign: "right" }}>
                            <span style={{
                              fontWeight: 900, fontSize: "0.95rem",
                              color: isIngreso ? "#34d399" : "#f87171"
                            }}>
                              {isIngreso ? "+" : "-"}${Number(m.monto || 0).toLocaleString()} COP
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
