/**
 * DashboardView.jsx
 * Vista de Dashboard con KPIs en tiempo real para el Sistema POS.
 * Muestra ventas del día, stock crítico, tendencias, alquileres y seguros.
 * Componente 100% nuevo — no modifica ningún componente existente.
 */

import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Package,
  Users,
  Armchair,
  ShieldCheck,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Clock,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Activity,
  FileText
} from "lucide-react";
import { useDashboardMetrics } from "../hooks/useDashboardMetrics";
import ReportsModal from "./ReportsModal";

// ─── Utilidades ────────────────────────────────────────────────────
function fmt(n) {
  return new Intl.NumberFormat("es-CO", { minimumFractionDigits: 0 }).format(n || 0);
}

function fmtCOP(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${fmt(n)}`;
}

// ─── Subcomponentes ────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color = "#6366f1", trend, trendLabel, onClick }) {
  return (
    <div
      className="dashboard-kpi-card"
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="dashboard-kpi-icon" style={{ background: `${color}22`, color }}>
        {icon}
      </div>
      <div className="dashboard-kpi-content">
        <div className="dashboard-kpi-label">{label}</div>
        <div className="dashboard-kpi-value">{value}</div>
        {sub && <div className="dashboard-kpi-sub">{sub}</div>}
      </div>
      {trend != null && (
        <div
          className="dashboard-kpi-trend"
          style={{ color: trend >= 0 ? "#22c55e" : "#ef4444" }}
        >
          {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span>{Math.abs(trend).toFixed(1)}%</span>
          {trendLabel && <span className="dashboard-kpi-trend-label">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}

function MiniBar({ data, maxVal }) {
  return (
    <div className="dashboard-minibar">
      {data.map((d, i) => {
        const pct = maxVal > 0 ? (d.total / maxVal) * 100 : 0;
        const isToday = i === data.length - 1;
        return (
          <div key={i} className="dashboard-minibar-col" title={`${d.label}: $${fmt(d.total)}`}>
            <div className="dashboard-minibar-bar-wrap">
              <div
                className="dashboard-minibar-bar"
                style={{
                  height: `${Math.max(pct, 2)}%`,
                  background: isToday
                    ? "linear-gradient(180deg, #6366f1, #8b5cf6)"
                    : "var(--border-color)",
                  opacity: isToday ? 1 : 0.6,
                }}
              />
            </div>
            <div className="dashboard-minibar-label">{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function AlertChip({ nombre, stock, tipo }) {
  return (
    <span
      className="dashboard-alert-chip"
      style={{
        background: tipo === "agotado" ? "#ef444420" : "#f9731620",
        color: tipo === "agotado" ? "#ef4444" : "#f97316",
        border: `1px solid ${tipo === "agotado" ? "#ef444440" : "#f9731640"}`,
      }}
    >
      {nombre}
      {stock != null && <span style={{ opacity: 0.7 }}> ({stock})</span>}
    </span>
  );
}

// ─── Componente principal ──────────────────────────────────────────

export default function DashboardView({
  sales,
  products,
  clients,
  rentals,
  insurances,
  activeShift,
  storeConfig,
  currentUser,
  onNavigate,
}) {
  const [hoveredBar, setHoveredBar] = useState(null);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const m = useDashboardMetrics({ sales, products, clients, rentals, insurances, activeShift });

  const maxBar = Math.max(...m.ultimos7.map((d) => d.total), 1);
  const nombreTienda = storeConfig?.nombre || "Miscelánea";
  const ahora = new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="dashboard-container">
      {/* ── Encabezado ── */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">
            <Activity size={22} style={{ color: "#6366f1" }} />
            Panel de Control
          </h1>
          <p className="dashboard-subtitle">
            {nombreTienda} · Actualizado a las {ahora}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={() => setIsReportsOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 15px",
              borderRadius: "20px",
              background: "#6366f1",
              color: "#ffffff",
              border: "none",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)",
              transition: "transform 0.15s ease",
            }}
          >
            <FileText size={15} />
            Reportes PDF
          </button>
          <div className="dashboard-header-badge">
            <Zap size={13} />
            Tiempo real
          </div>
        </div>
      </div>

      {/* ── KPIs principales ── */}
      <div className="dashboard-kpis-grid">
        <KpiCard
          icon={<DollarSign size={20} />}
          label="Ventas de hoy"
          value={fmtCOP(m.totalHoy)}
          sub={`${m.countHoy} venta${m.countHoy !== 1 ? "s" : ""} · Ticket: ${fmtCOP(m.ticketPromedio)}`}
          color="#6366f1"
          trend={m.tendencia}
          trendLabel="vs ayer"
          onClick={() => onNavigate?.("sales")}
        />
        <KpiCard
          icon={<Package size={20} />}
          label="Inventario"
          value={`${fmt(m.productosActivos)} productos`}
          sub={
            m.agotados > 0
              ? `⚠️ ${m.agotados} agotado${m.agotados > 1 ? "s" : ""}, ${m.stockBajo} bajo`
              : `✅ Stock OK · ${m.stockBajo} con stock bajo`
          }
          color={m.agotados > 0 ? "#ef4444" : "#22c55e"}
          onClick={() => onNavigate?.("inventory")}
        />
        <KpiCard
          icon={<Users size={20} />}
          label="Clientes"
          value={fmt(m.totalClientes)}
          sub={
            m.clientesHoy > 0
              ? `${m.clientesHoy} cliente${m.clientesHoy > 1 ? "s" : ""} atendido${m.clientesHoy > 1 ? "s" : ""} hoy`
              : "Sin clientes registrados hoy"
          }
          color="#06b6d4"
          onClick={() => onNavigate?.("clients")}
        />
        <KpiCard
          icon={<Armchair size={20} />}
          label="Alquileres"
          value={`${m.rentasActivas} activo${m.rentasActivas !== 1 ? "s" : ""}`}
          sub={
            m.rentasVencidas > 0
              ? `⚠️ ${m.rentasVencidas} vencido${m.rentasVencidas > 1 ? "s" : ""} sin devolver`
              : m.ingresoRentasHoy > 0
              ? `${fmtCOP(m.ingresoRentasHoy)} cobrado hoy`
              : "Sin vencimientos pendientes"
          }
          color={m.rentasVencidas > 0 ? "#f97316" : "#8b5cf6"}
          onClick={() => onNavigate?.("rentals")}
        />
        <KpiCard
          icon={<ShieldCheck size={20} />}
          label="Seguros"
          value={`${m.segurosHoy} hoy`}
          sub={
            m.segurosPendientes > 0
              ? `${m.segurosPendientes} pendiente${m.segurosPendientes > 1 ? "s" : ""} de reportar`
              : "Todos reportados ✅"
          }
          color="#10b981"
          onClick={() => onNavigate?.("insurances")}
        />
        {activeShift && (
          <KpiCard
            icon={<Clock size={20} />}
            label="Turno activo"
            value={fmtCOP(m.shiftIngresoEfectivo + m.shiftBaseInicial)}
            sub={`Base: ${fmtCOP(m.shiftBaseInicial)} · Efectivo: ${fmtCOP(m.shiftIngresoEfectivo)}`}
            color="#f59e0b"
          />
        )}
      </div>

      {/* ── Gráfica + Top Productos ── */}
      <div className="dashboard-bottom-grid">
        {/* Gráfica de barras de los últimos 7 días */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <BarChart3 size={16} />
            <span>Ventas últimos 7 días</span>
          </div>
          <MiniBar data={m.ultimos7} maxVal={maxBar} />
          <div className="dashboard-bar-legend">
            {m.ultimos7.map((d, i) => (
              <div key={i} className="dashboard-bar-legend-item" style={{ opacity: i === 6 ? 1 : 0.65 }}>
                <strong>{d.label}</strong>
                <span>{fmtCOP(d.total)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top productos vendidos hoy */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <ShoppingCart size={16} />
            <span>Top productos hoy</span>
          </div>
          {m.topProductosHoy.length === 0 ? (
            <div className="dashboard-empty">
              <ShoppingCart size={28} style={{ opacity: 0.3 }} />
              <p>Sin ventas registradas hoy</p>
            </div>
          ) : (
            <div className="dashboard-top-products">
              {m.topProductosHoy.map((p, i) => (
                <div key={i} className="dashboard-top-product-row">
                  <span className="dashboard-top-rank">#{i + 1}</span>
                  <span className="dashboard-top-name">{p.nombre}</span>
                  <span className="dashboard-top-qty">{p.cantidad} uds</span>
                  <span className="dashboard-top-total">{fmtCOP(p.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desglose por método de pago */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <DollarSign size={16} />
            <span>Por método de pago · Hoy</span>
          </div>
          {Object.keys(m.porMetodo).length === 0 ? (
            <div className="dashboard-empty">
              <DollarSign size={28} style={{ opacity: 0.3 }} />
              <p>Sin ventas hoy</p>
            </div>
          ) : (
            <div className="dashboard-metodos">
              {Object.entries(m.porMetodo)
                .sort((a, b) => b[1] - a[1])
                .map(([metodo, total]) => {
                  const pct = m.totalHoy > 0 ? (total / m.totalHoy) * 100 : 0;
                  const colors = {
                    Efectivo: "#22c55e",
                    Transferencia: "#6366f1",
                    Tarjeta: "#06b6d4",
                  };
                  const color = colors[metodo] || "#8b5cf6";
                  return (
                    <div key={metodo} className="dashboard-metodo-row">
                      <div className="dashboard-metodo-info">
                        <span className="dashboard-metodo-dot" style={{ background: color }} />
                        <span className="dashboard-metodo-name">{metodo}</span>
                        <span className="dashboard-metodo-pct">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="dashboard-metodo-bar-wrap">
                        <div
                          className="dashboard-metodo-bar"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                      <span className="dashboard-metodo-total">{fmtCOP(total)}</span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* ── Alertas de Stock ── */}
      {(m.agotados > 0 || m.stockBajo > 0) && (
        <div className="dashboard-alerts-section">
          <div className="dashboard-card-header" style={{ marginBottom: "12px" }}>
            <AlertTriangle size={16} style={{ color: "#f97316" }} />
            <span>Alertas de Inventario</span>
          </div>
          {m.agotadosLista.length > 0 && (
            <div className="dashboard-alert-group">
              <span className="dashboard-alert-group-label" style={{ color: "#ef4444" }}>
                Agotados ({m.agotados})
              </span>
              <div className="dashboard-chips">
                {m.agotadosLista.map((p) => (
                  <AlertChip key={p.id || p.codigo} nombre={p.nombre} tipo="agotado" />
                ))}
                {m.agotados > 6 && (
                  <span className="dashboard-chips-more">+{m.agotados - 6} más</span>
                )}
              </div>
            </div>
          )}
          {m.stockBajoLista.length > 0 && (
            <div className="dashboard-alert-group">
              <span className="dashboard-alert-group-label" style={{ color: "#f97316" }}>
                Stock bajo ({m.stockBajo})
              </span>
              <div className="dashboard-chips">
                {m.stockBajoLista.map((p) => (
                  <AlertChip key={p.id || p.codigo} nombre={p.nombre} stock={p.stock} tipo="bajo" />
                ))}
                {m.stockBajo > 6 && (
                  <span className="dashboard-chips-more">+{m.stockBajo - 6} más</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Reportes PDF Oficiales */}
      <ReportsModal
        isOpen={isReportsOpen}
        onClose={() => setIsReportsOpen(false)}
        sales={sales}
        products={products}
        activeShift={activeShift}
        storeConfig={storeConfig}
        currentUser={currentUser}
      />
    </div>
  );
}
