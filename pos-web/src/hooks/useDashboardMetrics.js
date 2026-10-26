/**
 * useDashboardMetrics.js
 * Calcula KPIs del negocio a partir de los datos en tiempo real del POS.
 * Diseñado para ser llamado desde DashboardView.jsx.
 * 100% aditivo — no modifica nada existente.
 */

import { useMemo } from "react";
import { isRentalOverdue } from "../utils/rentalUtils";

/**
 * @param {object} params
 * @param {Array}  params.sales      - Ventas del estado global
 * @param {Array}  params.products   - Productos del estado global
 * @param {Array}  params.clients    - Clientes del estado global
 * @param {Array}  params.rentals    - Alquileres del estado global
 * @param {Array}  params.insurances - Seguros del estado global
 * @param {object} params.activeShift - Turno activo
 */
export function useDashboardMetrics({
  sales = [],
  products = [],
  clients = [],
  rentals = [],
  insurances = [],
  activeShift = null,
}) {
  return useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

    // ─── Ventas de hoy ──────────────────────────────────────────────
    const salesHoy = sales.filter((s) => {
      if (!s?.fecha) return false;
      return String(s.fecha).slice(0, 10) === todayStr;
    });

    const totalHoy = salesHoy.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const countHoy = salesHoy.length;

    // Ticket promedio
    const ticketPromedio = countHoy > 0 ? totalHoy / countHoy : 0;

    // Desglose por método de pago
    const porMetodo = salesHoy.reduce((acc, s) => {
      const m = s.metodoPago || "Efectivo";
      acc[m] = (acc[m] || 0) + (Number(s.total) || 0);
      return acc;
    }, {});

    // ─── Ventas de ayer (comparativa) ──────────────────────────────
    const ayer = new Date(now);
    ayer.setDate(ayer.getDate() - 1);
    const ayerStr = ayer.toISOString().slice(0, 10);
    const salesAyer = sales.filter((s) => String(s.fecha).slice(0, 10) === ayerStr);
    const totalAyer = salesAyer.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const tendencia = totalAyer > 0 ? ((totalHoy - totalAyer) / totalAyer) * 100 : null;

    // ─── Ventas de los últimos 7 días ───────────────────────────────
    const ultimos7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      const daySales = sales.filter((s) => String(s.fecha).slice(0, 10) === dStr);
      const dayTotal = daySales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
      const label = i === 0 ? "Hoy" : i === 1 ? "Ayer" : d.toLocaleDateString("es-CO", { weekday: "short" });
      ultimos7.push({ label, total: dayTotal, count: daySales.length, fecha: dStr });
    }

    // ─── Productos ──────────────────────────────────────────────────
    const productosActivos = products.filter((p) => p?.activo !== false);
    const agotados = productosActivos.filter((p) => (Number(p.stock) || 0) === 0 && !p.stockIlimitado);
    const stockBajo = productosActivos.filter(
      (p) => (Number(p.stock) || 0) > 0 && (Number(p.stock) || 0) <= 3 && !p.stockIlimitado
    );

    // Top 5 productos más vendidos hoy
    const productosVendidosHoy = {};
    for (const s of salesHoy) {
      for (const item of s.items || []) {
        const key = item.productId || item.codigo || item.nombre;
        if (!key) continue;
        if (!productosVendidosHoy[key]) {
          productosVendidosHoy[key] = { nombre: item.nombre || key, cantidad: 0, total: 0 };
        }
        productosVendidosHoy[key].cantidad += Number(item.cantidad) || 1;
        productosVendidosHoy[key].total += Number(item.subtotal) || 0;
      }
    }
    const topProductosHoy = Object.values(productosVendidosHoy)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    // ─── Clientes ───────────────────────────────────────────────────
    const clientesConCompras = clients.filter((c) => {
      return sales.some((s) => s.cliente?.dni === c.dni || s.cliente?.nombre === c.nombre);
    });

    // Clientes con compra hoy
    const clientesHoy = new Set(
      salesHoy.filter((s) => s.cliente?.nombre && s.cliente.nombre !== "Mostrador")
        .map((s) => s.cliente.nombre)
    );

    // ─── Alquileres ─────────────────────────────────────────────────
    const rentasActivas = rentals.filter((r) => r?.estado === "activo");
    const rentasVencidas = rentals.filter((r) => isRentalOverdue(r));
    const ingresoRentasHoy = salesHoy
      .filter((s) => String(s.tipoVenta || "").startsWith("alquiler"))
      .reduce((sum, s) => sum + (Number(s.total) || 0), 0);

    // ─── Seguros ────────────────────────────────────────────────────
    const segurosHoy = insurances.filter((s) => {
      const fecha = s?.fechaRegistro || s?.createdAt || "";
      return String(fecha).slice(0, 10) === todayStr;
    });
    const segurosPendientes = insurances.filter((s) => !s?.reportado);

    // ─── Turno activo ───────────────────────────────────────────────
    const shiftIngresoEfectivo = activeShift
      ? salesHoy
          .filter((s) => s.shiftId === activeShift.id && s.metodoPago === "Efectivo")
          .reduce((sum, s) => sum + (Number(s.total) || 0), 0)
      : 0;

    return {
      // Ventas
      totalHoy,
      countHoy,
      ticketPromedio,
      totalAyer,
      tendencia,
      porMetodo,
      ultimos7,
      topProductosHoy,
      // Productos
      productosActivos: productosActivos.length,
      agotados: agotados.length,
      agotadosLista: agotados.slice(0, 6),
      stockBajo: stockBajo.length,
      stockBajoLista: stockBajo.slice(0, 6),
      // Clientes
      totalClientes: clients.length,
      clientesConCompras: clientesConCompras.length,
      clientesHoy: clientesHoy.size,
      // Alquileres
      rentasActivas: rentasActivas.length,
      rentasVencidas: rentasVencidas.length,
      ingresoRentasHoy,
      // Seguros
      segurosHoy: segurosHoy.length,
      segurosPendientes: segurosPendientes.length,
      // Turno
      shiftIngresoEfectivo,
      shiftBaseInicial: Number(activeShift?.baseInicial) || 0,
    };
  }, [sales, products, clients, rentals, insurances, activeShift]);
}
