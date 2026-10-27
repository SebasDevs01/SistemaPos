import React, { useState, useEffect, useMemo } from "react";
import { 
  DollarSign, 
  Lock, 
  Unlock, 
  TrendingUp, 
  TrendingDown, 
  Printer, 
  Share2, 
  Calendar, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  History, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  Sparkles,
  ShoppingBag,
  ListOrdered,
  Eye,
  Package,
  Search,
  Filter,
  Edit2,
  Trash2
} from "lucide-react";
import { getColombiaTimeInfo, CASH_SCHEDULE, isShiftOwner } from "../services/firestoreService";
import { formatCOP } from "../utils/formatCOP";
import ClosingTicketModal, { printClosingReceipt, downloadClosingAndWhatsApp } from "./ClosingTicketModal";
import MathPriceInput from "./MathPriceInput";

export default function CashRegisterModal({
  isOpen,
  onClose,
  activeShift,
  onOpenShift,
  onCloseShift,
  onAddMovement,
  onDeleteMovement,
  onEditMovement,
  onDeleteSale,
  onEditSale,
  onPrintTicket,
  sales = [],
  currentUser,
  storeConfig = {},
  closings = [],
  initialTab = "current"
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // "current" | "history"
  const [activeSubTab, setActiveSubTab] = useState("overview"); // "overview" | "movements" | "products"
  
  const isOwner = isShiftOwner(activeShift, currentUser);
  const isAdmin = currentUser?.rol === "Administrador";
  const isShiftOwnedByOther = Boolean(activeShift && !isOwner);

  const [openBase, setOpenBase] = useState(50000);
  const [openNotes, setOpenNotes] = useState("");
  
  // Tiempo oficial de Colombia y actualización en tiempo real
  const [colombiaTime, setColombiaTime] = useState(() => getColombiaTimeInfo());

  // Filtros de movimientos en vivo
  const [movementFilter, setMovementFilter] = useState("todos"); // "todos" | "ventas" | "ingresos" | "egresos"
  const [movementSearch, setMovementSearch] = useState("");

  // Modal de Ticket de Cierre para previsualizar/reimprimir
  const [selectedClosingForTicket, setSelectedClosingForTicket] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setColombiaTime(getColombiaTimeInfo());
    const timer = setInterval(() => {
      setColombiaTime(getColombiaTimeInfo());
    }, 10000);
    return () => clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      // Si la caja está cerrada y se abre el modal, garantizar acceso directo al formulario de apertura
      if (!activeShift) {
        setCompletedClosingRecord(null);
      }
    }
  }, [isOpen, initialTab, activeShift]);

  // Verificar si el turno activo corresponde a una fecha anterior en Colombia
  const isShiftFromPreviousDay = Boolean(
    activeShift?.fechaApertura && 
    getColombiaTimeInfo(activeShift.fechaApertura).dateStr !== colombiaTime.dateStr
  );

  // Movimiento rápido (entrada / salida)
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [movementType, setMovementType] = useState("egreso"); // "ingreso" | "egreso"
  const [movementAmount, setMovementAmount] = useState("");
  const [movementReason, setMovementReason] = useState("");

  // Arqueo y cierre
  const [countedCash, setCountedCash] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [completedClosingRecord, setCompletedClosingRecord] = useState(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false); // Modal de confirmación de cierre

  // Filtrar las ventas pertenecientes a este turno (con shiftId o por fecha de apertura o realizadas en la misma fecha de Colombia sin turno)
  const shiftStartTime = activeShift ? new Date(activeShift.fechaApertura).getTime() : 0;
  const shiftEndTime = activeShift?.fechaCierre ? new Date(activeShift.fechaCierre).getTime() : Infinity;
  const shiftDateStr = activeShift ? getColombiaTimeInfo(activeShift.fechaApertura).dateStr : null;
  const shiftSales = activeShift
    ? sales.filter(s => {
        if (!s) return false;
        // 1. Coincidencia directa por ID de turno
        if (s.shiftId && activeShift.id && String(s.shiftId).trim() === String(activeShift.id).trim()) return true;
        
        const saleTime = new Date(s.fecha).getTime();
        // 2. Si la venta ocurrió durante la vigencia de este turno (desde la apertura hasta el cierre)
        if (shiftStartTime > 0 && saleTime >= (shiftStartTime - 10000) && saleTime <= shiftEndTime) {
          if (!s.shiftId || (activeShift.id && String(s.shiftId).trim() === String(activeShift.id).trim())) return true;
        }
        // 3. Ventas de mostrador sin turno en la misma fecha de Colombia
        if (!s.shiftId && shiftDateStr && getColombiaTimeInfo(s.fecha).dateStr === shiftDateStr) return true;
        return false;
      })
    : [];

  // Calcular totales por medio de pago en este turno (incluye desglose de ventas mixtas)
  const cashSales = shiftSales
    .reduce((sum, s) => {
      const m = (s.metodoPago || "").toLowerCase();
      if (m.includes("efectivo")) return sum + (Number(s.total) || 0);
      if (m === "mixto" && s.pagoMixto) return sum + (Number(s.pagoMixto.efectivo) || 0);
      return sum;
    }, 0);

  const transferSales = shiftSales
    .reduce((sum, s) => {
      const m = (s.metodoPago || "").toLowerCase();
      if (m.includes("nequi") || m.includes("daviplata") || m.includes("transf")) return sum + (Number(s.total) || 0);
      if (m === "mixto" && s.pagoMixto) return sum + (Number(s.pagoMixto.transferencia) || 0);
      return sum;
    }, 0);

  const cardSales = shiftSales
    .filter(s => (s.metodoPago || "").toLowerCase().includes("tarjeta"))
    .reduce((sum, s) => sum + (Number(s.total) || 0), 0);

  const otherSales = shiftSales
    .filter(s => {
      const m = (s.metodoPago || "").toLowerCase();
      return !m.includes("efectivo") && !m.includes("nequi") && !m.includes("daviplata") && !m.includes("transf") && !m.includes("tarjeta") && m !== "mixto";
    })
    .reduce((sum, s) => sum + (Number(s.total) || 0), 0);

  const totalSalesRevenue = cashSales + transferSales + cardSales + otherSales;

  // Movimientos manuales de caja en este turno
  const movements = activeShift?.movimientos || [];
  const totalCashIn = movements
    .filter(m => m.tipo === "ingreso")
    .reduce((sum, m) => sum + (Number(m.monto) || 0), 0);

  const totalCashOut = movements
    .filter(m => m.tipo === "egreso")
    .reduce((sum, m) => sum + (Number(m.monto) || 0), 0);

  // Efectivo teórico exacto que debe estar en la gaveta
  const baseAmount = Number(activeShift?.baseInicial) || 0;
  const expectedCashInDrawer = baseAmount + cashSales + totalCashIn - totalCashOut;

  // Diferencia de arqueo
  const parsedCountedCash = countedCash === "" ? null : Number(countedCash);
  const cashDifference = parsedCountedCash !== null ? parsedCountedCash - expectedCashInDrawer : null;

  // Consolidación de productos vendidos en este turno
  const soldProductsSummary = useMemo(() => {
    const map = new Map();
    shiftSales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const key = item.productId || item.codigo || item.nombre;
        const qty = Number(item.cantidad) || 0;
        const price = Number(item.precioUnitario) || 0;
        const subtotal = Number(item.subtotal) || (qty * price);
        
        if (map.has(key)) {
          const existing = map.get(key);
          existing.cantidad += qty;
          existing.subtotal += subtotal;
        } else {
          map.set(key, {
            id: key,
            nombre: item.nombre || "Producto sin nombre",
            cantidad: qty,
            precioUnitario: price,
            subtotal: subtotal,
            categoria: item.categoria || "General"
          });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => b.subtotal - a.subtotal);
  }, [shiftSales]);

  const totalSoldUnits = soldProductsSummary.reduce((acc, p) => acc + p.cantidad, 0);

  // Historial detallado unificado de movimientos de la jornada
  const unifiedMovements = useMemo(() => {
    if (!activeShift) return [];
    const list = [];

    // 1. Apertura
    list.push({
      id: `open-${activeShift.id}`,
      tipo: "apertura",
      tipoLabel: "Apertura",
      fecha: activeShift.fechaApertura,
      hora: new Date(activeShift.fechaApertura).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true }),
      concepto: "Apertura de turno (Base Inicial)",
      detalle: `Cajero: ${activeShift.cajero || "Caja Principal"}`,
      cantidad: null,
      monto: baseAmount,
      metodo: "Efectivo",
      items: []
    });

    // 2. Ventas y Alquileres
    shiftSales.forEach(sale => {
      const isAlq = sale.tipoVenta === "alquiler" || sale.tipoVenta === "alquiler_abono" || sale.tipoVenta === "alquiler_saldo" || sale.tipoVenta === "alquiler_dano";
      const alqLabel = sale.tipoVenta === "alquiler_abono" ? "Abono Alquiler" : sale.tipoVenta === "alquiler_saldo" ? "Saldo Alquiler" : sale.tipoVenta === "alquiler_dano" ? "Daño/Reposición Alquiler" : "Alquiler";
      const itemsDesc = (sale.items || []).map(i => `${i.cantidad}x ${i.nombre}`).join(", ");
      const unitsCount = (sale.items || []).reduce((acc, i) => acc + (Number(i.cantidad) || 0), 0);
      list.push({
        id: `sale-${sale.id}`,
        tipo: "venta",
        tipoLabel: isAlq ? alqLabel : "Venta",
        fecha: sale.fecha,
        hora: new Date(sale.fecha).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true }),
        concepto: itemsDesc || (isAlq ? "Servicio de Alquiler de Mobiliario" : "Venta de mostrador"),
        detalle: `Cliente: ${sale.cliente?.nombre || "Mostrador"} · Cajero: ${sale.vendedor || "Caja"}${sale.saldoPendiente ? ` · Saldo pendiente: $${Number(sale.saldoPendiente).toLocaleString()}` : ""}`,
        cantidad: unitsCount,
        monto: Number(sale.total) || 0,
        metodo: sale.metodoPago || "Efectivo",
        items: sale.items || [],
        saleId: sale.id,
        rawSale: sale
      });
    });

    // 3. Movimientos manuales (Ingresos y Egresos)
    movements.forEach(m => {
      const isIngreso = m.tipo === "ingreso";
      list.push({
        id: `mov-${m.id}`,
        tipo: isIngreso ? "ingreso" : "egreso",
        tipoLabel: isIngreso ? "Ingreso" : "Egreso",
        fecha: m.fecha || activeShift.fechaApertura,
        hora: m.fecha ? new Date(m.fecha).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true }) : "--:--",
        concepto: m.motivo || (isIngreso ? "Entrada extra a caja" : "Salida / Gasto de caja"),
        detalle: `Registrado por: ${m.cajero?.nombre || m.cajero || "Cajero"}`,
        cantidad: null,
        monto: isIngreso ? Math.abs(Number(m.monto) || 0) : -Math.abs(Number(m.monto) || 0),
        metodo: "Efectivo",
        items: [],
        movementId: m.id,
        rawMovement: m
      });
    });

    // Ordenar cronológicamente (más recientes primero)
    return list.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [activeShift, shiftSales, movements, baseAmount]);

  // Filtrado de movimientos
  const filteredMovements = unifiedMovements.filter(m => {
    if (movementFilter === "ventas" && m.tipo !== "venta") return false;
    if (movementFilter === "ingresos" && m.tipo !== "ingreso" && m.tipo !== "apertura") return false;
    if (movementFilter === "egresos" && m.tipo !== "egreso") return false;

    if (movementSearch.trim()) {
      const q = movementSearch.toLowerCase();
      const matchConcept = (m.concepto || "").toLowerCase().includes(q);
      const matchDetalle = (m.detalle || "").toLowerCase().includes(q);
      const matchItems = (m.items || []).some(it => (it.nombre || "").toLowerCase().includes(q));
      return matchConcept || matchDetalle || matchItems;
    }

    return true;
  });

  // Manejar apertura de turno
  const handleOpenSubmit = async (e) => {
    e.preventDefault();
    await onOpenShift({
      cajero: currentUser,
      baseInicial: Number(openBase) || 0,
      notas: openNotes
    });
  };

  const [isSubmittingMovement, setIsSubmittingMovement] = useState(false);

  // Manejar nuevo movimiento manual
  const handleMovementSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingMovement) return;
    if (!isOwner && !isAdmin) {
      alert(`⚠️ Solo el titular del turno (${activeShift?.cajero}) puede registrar movimientos.`);
      return;
    }
    // Resolver expresión matemática si no fue resuelta antes (ej: submit sin blur)
    let resolvedAmount = Number(movementAmount);
    if (isNaN(resolvedAmount) || resolvedAmount <= 0) {
      try {
        const expr = String(movementAmount).replace(/[^0-9+\-*/().%\s]/g, "");
        // eslint-disable-next-line no-new-func
        resolvedAmount = Math.round(Function('"use strict"; return (' + expr + ")")());
      } catch (_) {
        resolvedAmount = 0;
      }
    }
    if (!movementAmount || resolvedAmount <= 0) {
      alert("Por favor ingresa un monto válido mayor a 0.");
      return;
    }
    if (!movementReason.trim()) {
      alert("Por favor ingresa el motivo del movimiento.");
      return;
    }

    const payload = {
      shiftId: activeShift.id,
      tipo: movementType,
      monto: resolvedAmount,
      motivo: movementReason.trim(),
      cajero: currentUser?.nombre || "Cajero"
    };

    // Cerrar el formulario y limpiar campos AL INSTANTE (< 50ms)
    setMovementAmount("");
    setMovementReason("");
    setShowMovementForm(false);

    try {
      setIsSubmittingMovement(true);
      await onAddMovement(payload);
    } catch (err) {
      console.error("Error al registrar movimiento:", err);
      setIsSubmittingMovement(false);
    }
  };

  // Estados y funciones para editar y eliminar movimientos / ventas
  const [editingMovement, setEditingMovement] = useState(null);
  const [editMovAmount, setEditMovAmount] = useState("");
  const [editMovReason, setEditMovReason] = useState("");
  const [editMovType, setEditMovType] = useState("egreso");
  const [isSavingEditMov, setIsSavingEditMov] = useState(false);

  const handleStartEditMovement = (m) => {
    setEditingMovement(m);
    setEditMovAmount(String(Math.abs(m.monto || 0)));
    setEditMovReason(m.concepto || m.motivo || "");
    setEditMovType(m.tipo === "ingreso" ? "ingreso" : "egreso");
  };

  const handleSaveEditMovement = async (e) => {
    e.preventDefault();
    if (!editingMovement) return;
    let resolvedAmt = Number(editMovAmount);
    if (isNaN(resolvedAmt) || resolvedAmt <= 0) {
      try {
        const expr = String(editMovAmount).replace(/[^0-9+\-*/().%\s]/g, "");
        // eslint-disable-next-line no-new-func
        resolvedAmt = Math.round(Function('"use strict"; return (' + expr + ")")());
      } catch (_) {
        resolvedAmt = 0;
      }
    }
    if (!resolvedAmt || resolvedAmt <= 0) {
      alert("Por favor ingresa un monto válido mayor a 0.");
      return;
    }

    setIsSavingEditMov(true);
    try {
      if (editingMovement.tipo === "venta") {
        if (onEditSale && editingMovement.rawSale) {
          await onEditSale({
            ...editingMovement.rawSale,
            total: resolvedAmt,
            observaciones: editMovReason.trim()
          });
        }
      } else if (editingMovement.rawMovement && onEditMovement) {
        await onEditMovement(activeShift.id, {
          ...editingMovement.rawMovement,
          monto: resolvedAmt,
          motivo: editMovReason.trim(),
          tipo: editMovType
        });
      }
      setEditingMovement(null);
    } catch (err) {
      console.error("Error guardando edición de movimiento:", err);
      alert("Error al actualizar movimiento.");
    } finally {
      setIsSavingEditMov(false);
    }
  };

  const handleDeleteItemClick = async (m) => {
    if (m.tipo === "apertura") {
      alert("La base inicial de apertura no se puede eliminar de esta lista. Se modifica cerrando o reabriendo el turno.");
      return;
    }
    if (m.tipo === "venta" || m.rawSale) {
      const ok = window.confirm(`¿Estás seguro de eliminar esta venta (#${m.saleId || m.id}) por ${formatCOP(m.monto)} COP?\n\nEsta acción eliminará la venta de la caja y del historial.`);
      if (ok && onDeleteSale) {
        await onDeleteSale(m.saleId || m.rawSale?.id);
      }
    } else if (m.rawMovement) {
      const ok = window.confirm(`¿Estás seguro de eliminar este movimiento (${m.concepto}) por ${formatCOP(Math.abs(m.monto))} COP?\n\nSe recalculará el total de caja de inmediato.`);
      if (ok && onDeleteMovement) {
        await onDeleteMovement(activeShift.id, m.movementId || m.rawMovement?.id);
      }
    }
  };

  const [isClosingLoading, setIsClosingLoading] = useState(false);

  // Manejar cierre definitivo — llamado tras confirmar en el modal interno
  const handleCloseShiftSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!isOwner && !isAdmin) {
      alert(`⚠️ Solo el titular del turno (${activeShift?.cajero}) puede realizar el cierre de caja.`);
      return;
    }
    if (parsedCountedCash === null || isNaN(parsedCountedCash)) {
      alert("Por favor ingresa el dinero físico contado en la gaveta.");
      return;
    }
    // Mostrar modal de confirmación en lugar de window.confirm
    setShowConfirmClose(true);
  };

  // Ejecutar el cierre real (llamado tras confirmar en el modal)
  const executeCloseShift = async () => {
    if (!isOwner && !isAdmin) {
      alert(`⚠️ Solo el titular del turno (${activeShift?.cajero}) puede realizar el cierre de caja.`);
      return;
    }
    setShowConfirmClose(false);
    setIsClosingLoading(true);

    const fallbackShiftId = activeShift?.id || (activeShift?.fechaApertura ? `TURNO-${new Date(activeShift.fechaApertura).getTime()}` : `TURNO-${Date.now()}`);
    const fallbackCajero = typeof activeShift?.cajero === "object" ? activeShift.cajero.nombre : (activeShift?.cajero || "Cajero");
    const closingUserLabel = (!isOwner && isAdmin) 
      ? `${currentUser?.nombre || "Admin"} (Supervisión Admin)` 
      : (currentUser?.nombre || "Cajero");

    const closingData = {
      shiftId: fallbackShiftId,
      cajeroApertura: fallbackCajero,
      cajeroCierre: closingUserLabel,
      fechaApertura: activeShift?.fechaApertura || new Date().toISOString(),
      baseInicial: Number(baseAmount) || 0,
      totalVentas: Number(totalSalesRevenue) || 0,
      ventasEfectivo: Number(cashSales) || 0,
      ventasTransferencia: Number(transferSales) || 0,
      ventasTarjeta: Number(cardSales) || 0,
      ventasOtros: Number(otherSales) || 0,
      totalTransacciones: Number(shiftSales.length) || 0,
      entradasEfectivo: Number(totalCashIn) || 0,
      salidasEfectivo: Number(totalCashOut) || 0,
      efectivoTeorico: Number(expectedCashInDrawer) || 0,
      efectivoFisicoContado: Number(parsedCountedCash) || 0,
      diferencia: Number(cashDifference !== null ? cashDifference : 0),
      movimientos: Array.isArray(movements) ? movements : [],
      productosVendidos: Array.isArray(soldProductsSummary) ? soldProductsSummary : [],
      totalUnidadesVendidas: Number(totalSoldUnits) || 0,
      notasCierre: closingNotes || "",
      horaCierreColombia: colombiaTime.timeFormatted || "",
      fechaCierreColombia: colombiaTime.fullFormatted || "",
      horarioOficial: CASH_SCHEDULE.DESCRIPTION || ""
    };

    const fallbackRecord = {
      ...closingData,
      id: `CIERRE-${Date.now()}`,
      fechaCierre: new Date().toISOString()
    };

    try {
      const savedClosing = await onCloseShift(closingData);
      setCompletedClosingRecord(savedClosing || fallbackRecord);
      setCountedCash("");
      setClosingNotes("");
    } catch (err) {
      console.error("Error al procesar cierre en el servidor:", err);
      // Fallback seguro: siempre mostrar resumen y ticket aunque Firestore falle
      setCompletedClosingRecord(fallbackRecord);
      setCountedCash("");
      setClosingNotes("");
    } finally {
      setIsClosingLoading(false);
    }
  };

  // Descargar PDF y enviar resumen por WhatsApp
  const handleSendWhatsAppSummary = (record) => {
    const r = record || completedClosingRecord;
    if (!r) return;
    downloadClosingAndWhatsApp(r, storeConfig);
  };

  // Disparar Impresión directa del ticket de cierre
  const handlePrintClosingTicket = (record) => {
    const r = record || completedClosingRecord;
    if (!r) return;
    printClosingReceipt(r, storeConfig);
  };

  // Enviar resumen del arqueo EN VIVO (turno abierto) por WhatsApp
  const handleSendLiveArqueoWhatsApp = () => {
    if (!activeShift) return;
    const storeName = storeConfig?.nombre || "Miscelánea María José";
    const aperturaStr = new Date(activeShift.fechaApertura).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
    const nowStr = new Date().toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
    const lines = [
      `📊 *ARQUEO EN VIVO — ${storeName}*`,
      `📅 Turno abierto: ${aperturaStr}  ·  Hora actual: ${nowStr}`,
      `👤 Cajero: ${typeof activeShift.cajero === "object" ? activeShift.cajero.nombre : (activeShift.cajero || "—")}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💰 Base Inicial: $${baseAmount.toLocaleString("es-CO")} COP`,
      `💵 Ventas Efectivo: $${cashSales.toLocaleString("es-CO")} COP`,
      `📲 Nequi / Transf.: $${transferSales.toLocaleString("es-CO")} COP`,
      `🏦 Total Ventas: $${totalSalesRevenue.toLocaleString("es-CO")} COP (${shiftSales.length} vtas)`,
      `➕ Entradas: +$${totalCashIn.toLocaleString("es-CO")} COP`,
      `➖ Salidas/Gastos: -$${totalCashOut.toLocaleString("es-CO")} COP`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💰 *Efectivo esperado en gaveta: $${expectedCashInDrawer.toLocaleString("es-CO")} COP*`,
    ];
    if (soldProductsSummary.length > 0) {
      lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━`);
      lines.push(`📦 Top Productos Vendidos:`);
      soldProductsSummary.slice(0, 5).forEach((p, i) => {
        lines.push(`  ${i + 1}. ${p.nombre}: ${p.cantidad} unds — $${p.subtotal.toLocaleString("es-CO")}`);
      });
      if (soldProductsSummary.length > 5) lines.push(`  ...y ${soldProductsSummary.length - 5} más.`);
    }
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`⏰ Enviado a las ${colombiaTime.timeFormatted} (🇨🇴 Hora Colombia)`);
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
        <div 
          className="modal-content modal-card"
          style={{
            maxWidth: "880px",
            width: "96%",
            maxHeight: "92vh",
            overflowY: "auto",
            background: "var(--bg-secondary, #111827)",
            border: "1px solid var(--border-strong)",
            borderRadius: "20px",
            padding: "24px",
            boxShadow: "0 25px 70px rgba(0,0,0,0.85)"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabecera del Modal */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: activeShift ? "rgba(16, 185, 129, 0.15)" : "rgba(99, 102, 241, 0.15)",
                color: activeShift ? "var(--neon-emerald, #10b981)" : "var(--neon-indigo, #6366f1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                {activeShift ? <Unlock size={24} /> : <Lock size={24} />}
              </div>
              <div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                  Control y Cierre de Caja
                </h2>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "2px 0 0" }}>
                  Arqueo diario, registro de productos vendidos, movimientos y cuadre de efectivo
                </p>
              </div>
            </div>
            <button onClick={onClose} className="btn btn-outline" style={{ padding: "6px", borderRadius: "50%" }}>
              <X size={18} />
            </button>
          </div>

          {/* Banner Informativo de Horario Colombia (5:00 AM - 10:00 PM) */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(99, 102, 241, 0.08)",
            border: "1px solid rgba(99, 102, 241, 0.25)",
            borderRadius: "12px",
            padding: "10px 16px",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "10px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Clock size={16} color="var(--accent-blue, #60a5fa)" />
              <span style={{ fontSize: "0.82rem", color: "var(--text-main)", fontWeight: 700 }}>
                Horario Oficial de Caja: <span style={{ color: "#38bdf8" }}>5:00 AM – 10:00 PM</span> (Hora Colombia)
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className={`badge ${colombiaTime.isOperatingHours ? "badge-green" : "badge-orange"}`} style={{ fontSize: "0.68rem" }}>
                {colombiaTime.isOperatingHours ? "🟢 Horario Hábil" : "🌙 Fuera de Horario (Cierre)"}
              </span>
              <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--text-main)" }}>
                🇨🇴 {colombiaTime.timeFormatted}
              </span>
            </div>
          </div>

          {/* Pestañas Principales: Turno Actual vs Historial */}
          <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px", marginBottom: "18px" }}>
            <button
              type="button"
              onClick={() => { setActiveTab("current"); setCompletedClosingRecord(null); }}
              className="btn"
              style={{
                padding: "8px 18px",
                fontSize: "0.88rem",
                borderRadius: "10px",
                fontWeight: 700,
                background: activeTab === "current" ? "var(--accent-blue, #3b82f6)" : "transparent",
                color: activeTab === "current" ? "#fff" : "var(--text-muted)",
                border: activeTab === "current" ? "none" : "1px solid var(--border-color)"
              }}
            >
              💵 Turno Actual
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("history"); setCompletedClosingRecord(null); }}
              className="btn"
              style={{
                padding: "8px 18px",
                fontSize: "0.88rem",
                borderRadius: "10px",
                fontWeight: 700,
                background: activeTab === "history" ? "var(--accent-blue, #3b82f6)" : "transparent",
                color: activeTab === "history" ? "#fff" : "var(--text-muted)",
                border: activeTab === "history" ? "none" : "1px solid var(--border-color)"
              }}
            >
              📋 Historial de Cierres ({closings.length})
            </button>
          </div>

          {/* ──────────────────────────────────────────────────────── */}
          {/* VISTA 1: RESUMEN DE CIERRE RECIÉN REALIZADO */}
          {completedClosingRecord ? (
            <div style={{ textAlign: "center", padding: "10px 0" }}>
              <div style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.15)",
                color: "var(--neon-emerald, #10b981)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px"
              }}>
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "6px" }}>
                ¡Turno Finalizado y Caja Cerrada con Éxito!
              </h3>
              <p style={{ fontSize: "0.86rem", color: "var(--text-muted)", marginBottom: "20px" }}>
                Toda la información y los productos vendidos fueron guardados en el histórico. Puedes imprimir el ticket oficial o enviarlo por WhatsApp.
              </p>

              {/* Tarjeta Resumen Financiero */}
              <div style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border-color)",
                borderRadius: "16px",
                padding: "20px",
                textAlign: "left",
                maxWidth: "520px",
                margin: "0 auto 20px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.9rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>Total Ventas:</span>
                  <strong style={{ color: "var(--text-main)" }}>{formatCOP(completedClosingRecord.totalVentas || 0)} COP</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.9rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>Productos Vendidos:</span>
                  <strong style={{ color: "var(--accent-blue)" }}>
                    {completedClosingRecord.totalUnidadesVendidas || (completedClosingRecord.productosVendidos || []).reduce((a, b) => a + (b.cantidad || 0), 0)} unidades
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.9rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>Efectivo Esperado:</span>
                  <strong style={{ color: "var(--text-main)" }}>{formatCOP(completedClosingRecord.efectivoTeorico || 0)} COP</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.9rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>Efectivo Físico Contado:</span>
                  <strong style={{ color: "var(--text-main)" }}>{formatCOP(completedClosingRecord.efectivoFisicoContado || 0)} COP</strong>
                </div>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: "12px",
                  borderTop: "1px solid var(--border-color)",
                  fontSize: "1.05rem"
                }}>
                  <span style={{ fontWeight: 800 }}>Diferencia:</span>
                  <strong style={{
                    color: completedClosingRecord.diferencia === 0
                      ? "#34d399"
                      : completedClosingRecord.diferencia > 0
                        ? "#60a5fa"
                        : "#f87171"
                  }}>
                    {completedClosingRecord.diferencia === 0
                      ? "Cuadrada ($0)"
                      : `${completedClosingRecord.diferencia > 0 ? "+" : ""}${formatCOP(completedClosingRecord.diferencia)} COP`}
                  </strong>
                </div>
              </div>

              {/* Botones de acción del Cierre */}
              <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => {
                    setCompletedClosingRecord(null);
                    setActiveTab("current");
                  }}
                  className="btn btn-success"
                  style={{
                    padding: "11px 24px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    boxShadow: "0 0 20px rgba(16, 185, 129, 0.45)",
                    borderRadius: "10px"
                  }}
                >
                  <Unlock size={18} />
                  <span>🟢 Abrir Nuevo Turno Ahora</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintClosingTicket(completedClosingRecord)}
                  className="btn btn-primary"
                  style={{ padding: "11px 22px", display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <Printer size={18} />
                  <span>Imprimir Ticket de Cierre</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedClosingForTicket(completedClosingRecord)}
                  className="btn btn-outline"
                  style={{ padding: "11px 18px", display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <Eye size={18} />
                  <span>Ver Ticket en Pantalla</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendWhatsAppSummary(completedClosingRecord)}
                  className="btn btn-outline"
                  style={{ background: "#25D366", borderColor: "#25D366", color: "#fff", padding: "11px 20px", display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <Share2 size={18} />
                  <span>Enviar por WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-outline"
                  style={{ padding: "11px 20px" }}
                >
                  Cerrar Ventana
                </button>
              </div>
            </div>
          ) : activeTab === "history" ? (
            /* ──────────────────────────────────────────────────────── */
            /* VISTA 2: HISTORIAL DE CIERRES ANTERIORES */
            <div>
              {closings.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
                  <History size={42} style={{ opacity: 0.3, margin: "0 auto 12px" }} />
                  <p>No hay registros de cierres anteriores todavía.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {closings.map((c) => {
                    const prodsCount = (c.productosVendidos || []).length;
                    const unitsCount = c.totalUnidadesVendidas || (c.productosVendidos || []).reduce((a, b) => a + (b.cantidad || 0), 0);
                    return (
                      <div
                        key={c.id}
                        className="cash-closing-card"
                        style={{
                          background: "rgba(255, 255, 255, 0.02)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "14px",
                          padding: "16px 18px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "12px"
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text-main)" }}>
                            {new Date(c.fechaCierre).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "3px" }}>
                            Cajero: <strong>{c.cajeroCierre || c.cajeroApertura}</strong> · {c.totalTransacciones || 0} ventas ({unitsCount} unds)
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--accent-blue, #60a5fa)" }}>
                            {formatCOP(c.totalVentas || 0)} COP
                          </div>
                          <span className={`badge ${c.diferencia === 0 ? "badge-green" : c.diferencia > 0 ? "badge-blue" : "badge-red"}`} style={{ fontSize: "0.65rem", marginTop: "4px" }}>
                            {c.diferencia === 0
                              ? "Caja Cuadrada"
                              : `${c.diferencia > 0 ? "Sobrante +" : "Faltante "}${formatCOP(Math.abs(c.diferencia || 0))}`}
                          </span>
                        </div>

                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => setSelectedClosingForTicket(c)}
                            className="btn btn-outline"
                            title="Ver Detalle y Ticket"
                            style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                          >
                            <Eye size={14} />
                            <span style={{ marginLeft: "4px" }}>Detalle</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintClosingTicket(c)}
                            className="btn btn-primary"
                            title="Imprimir Ticket Térmico"
                            style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                          >
                            <Printer size={14} />
                            <span style={{ marginLeft: "4px" }}>Ticket</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendWhatsAppSummary(c)}
                            className="btn btn-outline"
                            title="Reenviar por WhatsApp"
                            style={{ padding: "6px 10px", fontSize: "0.8rem", color: "#25D366" }}
                          >
                            <Share2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : !activeShift ? (
            /* ──────────────────────────────────────────────────────── */
            /* VISTA 3: APERTURA DE TURNO (CAJA CERRADA) */
            <div>
              {/* Aviso informativo de horario de apertura */}
              {!colombiaTime.isOperatingHours ? (
                <div style={{
                  background: "var(--bg-warning, rgba(245, 158, 11, 0.15))",
                  border: "1.5px solid rgba(245, 158, 11, 0.5)",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  marginBottom: "16px",
                  fontSize: "0.82rem",
                  color: "var(--text-main)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px"
                }}>
                  <Clock size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Aviso de Horario:</strong> La apertura oficial de caja es a las <strong>5:00 AM</strong> (cierre: 10:00 PM). Al abrir la caja a esta hora (<strong>{colombiaTime.timeFormatted}</strong>), quedará registrada como apertura fuera de horario comercial habitual.
                  </span>
                </div>
              ) : (
                <div style={{
                  background: "rgba(16, 185, 129, 0.18)",
                  border: "1.5px solid rgba(16, 185, 129, 0.5)",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  marginBottom: "16px",
                  fontSize: "0.82rem",
                  color: "var(--text-main)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <Clock size={16} color="#059669" style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Jornada Activa:</strong> Turno dentro del horario oficial de atención (5:00 AM a 10:00 PM Hora Colombia).
                  </span>
                </div>
              )}

              <div style={{
                background: "rgba(239, 68, 68, 0.18)",
                border: "2px solid rgba(239, 68, 68, 0.6)",
                borderRadius: "14px",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "22px",
                color: "var(--text-main)"
              }}>
                <AlertCircle size={24} color="#ef4444" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: "0.85rem", lineHeight: 1.4 }}>
                  <strong style={{ color: "#ef4444" }}>La caja se encuentra cerrada actualmente.</strong><br />
                  Para comenzar a registrar ventas del día y controlar el efectivo, ingresa la base de apertura y abre el turno.
                </div>
              </div>

              <form onSubmit={handleOpenSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "6px", fontWeight: 700 }}>
                    Cajero Responsable:
                  </label>
                  <div style={{
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "var(--bg-glass, rgba(255,255,255,0.03))",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-main)",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <User size={16} color="var(--accent-blue)" />
                    <span>{currentUser?.nombre || "Cajero de Turno"}</span>
                    <span className="badge badge-indigo" style={{ marginLeft: "auto", fontSize: "0.62rem" }}>
                      {currentUser?.rol || "Asistente"}
                    </span>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "6px", fontWeight: 700 }}>
                    Base de Efectivo Inicial ($ COP) *:
                  </label>
                  <MathPriceInput
                    value={openBase}
                    onChange={(val) => setOpenBase(val)}
                    placeholder="Ej: 50000 o 20000+30000"
                    className="input-field"
                    style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)", height: "46px" }}
                    min={0}
                    required
                  />

                  {/* Botones de montos rápidos estilo POS */}
                  <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                    {[0, 20000, 30000, 50000, 100000, 200000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setOpenBase(val.toString())}
                        className="btn btn-outline"
                        style={{
                          padding: "5px 10px",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          borderRadius: "8px",
                          background: String(openBase) === String(val) ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.03)",
                          borderColor: String(openBase) === String(val) ? "var(--accent-blue)" : "rgba(255,255,255,0.1)",
                          color: String(openBase) === String(val) ? "#60a5fa" : "var(--text-main)"
                        }}
                      >
                        {val === 0 ? "Sin Base ($0)" : `$${val.toLocaleString("es-CO")}`}
                      </button>
                    ))}
                  </div>

                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                    Monto con el que se inicia la gaveta para dar cambios.
                  </span>
                </div>

                <div>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                    Notas de Apertura (Opcional):
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej: Turno mañana, todo en orden..."
                    value={openNotes}
                    onChange={(e) => setOpenNotes(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-success"
                  style={{
                    padding: "14px",
                    fontSize: "1.05rem",
                    fontWeight: 800,
                    marginTop: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    borderRadius: "12px",
                    boxShadow: "0 4px 20px rgba(16, 185, 129, 0.35)",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                >
                  <Unlock size={20} />
                  <span>Abrir Caja y Comenzar Turno</span>
                </button>
              </form>
            </div>
          ) : (
            /* ──────────────────────────────────────────────────────── */
            /* VISTA 4: TURNO ACTIVO — CONTROL, MOVIMIENTOS Y ARQUEO */
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Alerta si pasaron las 10:00 PM */}
              {colombiaTime.isPastClosing && (
                <div style={{
                  background: "rgba(239, 68, 68, 0.14)",
                  border: "1.5px solid rgba(239, 68, 68, 0.55)",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  color: "#fca5a5"
                }}>
                  <AlertCircle size={30} style={{ flexShrink: 0, color: "#f87171" }} />
                  <div style={{ fontSize: "0.85rem", lineHeight: 1.45 }}>
                    <strong style={{ color: "#f87171", fontSize: "0.92rem" }}>
                      🚨 HORA DE CIERRE ALCANZADA (10:00 PM HORA COLOMBIA)
                    </strong>
                    <br />
                    Son las <strong>{colombiaTime.timeFormatted}</strong>. La jornada del negocio ha concluido. Por favor realiza el conteo del dinero físico en gaveta y presiona <strong>"Finalizar Turno y Realizar Cierre"</strong>.
                  </div>
                </div>
              )}

              {/* Alerta de Turno de Fecha Anterior */}
              {isShiftFromPreviousDay && (
                <div style={{
                  background: "rgba(245, 158, 11, 0.12)",
                  border: "1.5px solid rgba(245, 158, 11, 0.5)",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  color: "var(--text-main)"
                }}>
                  <AlertCircle size={22} style={{ flexShrink: 0, color: "#f59e0b" }} />
                  <div style={{ fontSize: "0.85rem", lineHeight: 1.45 }}>
                    <strong>Turno de fecha anterior detectado:</strong><br />
                    Este turno fue abierto el {new Date(activeShift.fechaApertura).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}. Para iniciar correctamente la jornada de hoy a las 5:00 AM, realiza el arqueo y cierre del turno anterior.
                  </div>
                </div>
              )}

              {/* Cabecera del Turno Activo */}
              <div style={{
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                borderRadius: "14px",
                padding: "12px 18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px"
              }}>
                <div>
                  <span className="badge badge-green" style={{ fontSize: "0.62rem", marginBottom: "4px" }}>
                    🟢 Turno Abierto
                  </span>
                  <div style={{ fontWeight: 800, color: "var(--text-main)", fontSize: "0.95rem" }}>
                    {activeShift.cajero}
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                    <Clock size={12} />
                    <span>Abierto el {new Date(activeShift.fechaApertura).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}</span>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Base Inicial:</span>
                  <strong style={{ fontSize: "1.1rem", color: "var(--text-main)" }}>
                    {formatCOP(baseAmount)} COP
                  </strong>
                </div>
              </div>

              {/* SUB-PESTAÑAS DE CAJA ACTIVA */}
              <div style={{
                display: "flex",
                gap: "8px",
                background: "rgba(255,255,255,0.03)",
                padding: "5px",
                borderRadius: "12px",
                border: "1px solid var(--border-color)"
              }}>
                <button
                  type="button"
                  onClick={() => setActiveSubTab("overview")}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    background: activeSubTab === "overview" ? "var(--accent-blue, #3b82f6)" : "transparent",
                    color: activeSubTab === "overview" ? "#fff" : "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px"
                  }}
                >
                  <DollarSign size={16} />
                  <span>Arqueo y Cierre</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSubTab("movements")}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    background: activeSubTab === "movements" ? "var(--accent-blue, #3b82f6)" : "transparent",
                    color: activeSubTab === "movements" ? "#fff" : "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px"
                  }}
                >
                  <ListOrdered size={16} />
                  <span>Movimientos ({unifiedMovements.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSubTab("products")}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    background: activeSubTab === "products" ? "var(--accent-blue, #3b82f6)" : "transparent",
                    color: activeSubTab === "products" ? "#fff" : "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px"
                  }}
                >
                  <Package size={16} />
                  <span>Productos Vendidos ({totalSoldUnits})</span>
                </button>
              </div>

              {/* ──────────────────────────────────────────────────────── */}
              {/* SUB-VISTA 1: ARQUEO Y CIERRE */}
              {activeSubTab === "overview" && (
                <>
                  {/* Tarjetas de Resumen Financiero del Turno */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px" }}>
                    {/* Ventas Efectivo */}
                    <div className="glass-panel" style={{ padding: "14px" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, display: "block" }}>
                        💵 VENTAS EFECTIVO
                      </span>
                      <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--neon-emerald, #34d399)", marginTop: "4px" }}>
                        {formatCOP(cashSales)}
                      </div>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        {shiftSales.filter(s => (s.metodoPago || "").toLowerCase().includes("efectivo")).length} transacciones
                      </span>
                    </div>

                    {/* Ventas Transferencia */}
                    <div className="glass-panel" style={{ padding: "14px" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, display: "block" }}>
                        📲 NEQUI / TRANSF.
                      </span>
                      <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--neon-indigo, #818cf8)", marginTop: "4px" }}>
                        {formatCOP(transferSales)}
                      </div>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        Directo a cuenta
                      </span>
                    </div>

                    {/* Entradas Extras */}
                    <div className="glass-panel" style={{ padding: "14px" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, display: "block" }}>
                        ➕ ENTRADAS CAJA
                      </span>
                      <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#60a5fa", marginTop: "4px" }}>
                        +{formatCOP(totalCashIn)}
                      </div>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        Cambio / Ingresos
                      </span>
                    </div>

                    {/* Salidas / Gastos */}
                    <div className="glass-panel" style={{ padding: "14px" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, display: "block" }}>
                        ➖ SALIDAS / GASTOS
                      </span>
                      <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--neon-rose, #f87171)", marginTop: "4px" }}>
                        -{formatCOP(totalCashOut)}
                      </div>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        Proveedores / Pagos
                      </span>
                    </div>
                  </div>

                  {/* Efectivo Teórico Esperado */}
                  <div style={{
                    background: "linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(16, 185, 129, 0.12))",
                    border: "1.5px solid rgba(59, 130, 246, 0.35)",
                    borderRadius: "14px",
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px"
                  }}>
                    <div>
                      <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", fontWeight: 600 }}>
                        💰 EFECTIVO ESPERADO EN GAVETA:
                      </span>
                      <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        Base ({formatCOP(baseAmount)}) + Ventas Efectivo ({formatCOP(cashSales)}) + Entradas ({formatCOP(totalCashIn)}) - Salidas ({formatCOP(totalCashOut)})
                      </div>
                    </div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--text-main)" }}>
                      {formatCOP(expectedCashInDrawer)} COP
                    </div>
                  </div>

                  {/* Botones de Registrar Entrada / Salida */}
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={() => { setMovementType("ingreso"); setShowMovementForm(true); }}
                      className="btn btn-outline"
                      style={{ flex: 1, padding: "9px", fontSize: "0.85rem", color: "#60a5fa", borderColor: "rgba(59, 130, 246, 0.3)" }}
                    >
                      <ArrowUpRight size={16} />
                      <span>Registrar Entrada de Efectivo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMovementType("egreso"); setShowMovementForm(true); }}
                      className="btn btn-outline"
                      style={{ flex: 1, padding: "9px", fontSize: "0.85rem", color: "var(--neon-rose, #f87171)", borderColor: "rgba(244, 63, 94, 0.3)" }}
                    >
                      <ArrowDownRight size={16} />
                      <span>Registrar Salida / Gasto</span>
                    </button>
                  </div>

                  {/* Formulario Desplegable de Movimiento */}
                  {showMovementForm && (
                    <form onSubmit={handleMovementSubmit} style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid var(--border-strong)",
                      borderRadius: "14px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px"
                    }}>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem", color: movementType === "ingreso" ? "#60a5fa" : "#f87171" }}>
                        {movementType === "ingreso" ? "➕ Registrar Entrada de Dinero a Caja" : "➖ Registrar Salida / Gasto de Caja"}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <div>
                          <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                            Monto ($) *:
                          </label>
                          <MathPriceInput
                            value={movementAmount}
                            onChange={(val) => setMovementAmount(String(val))}
                            placeholder="Ej: 2000+3000 o 15000"
                            className="input-field"
                            style={{ fontFamily: "monospace" }}
                            min={1}
                            required
                          />

                          {/* Chips rápidos de monto */}
                          <div style={{ display: "flex", gap: "4px", marginTop: "6px", flexWrap: "wrap" }}>
                            {[5000, 10000, 20000, 50000, 100000].map((amt) => (
                              <button
                                key={amt}
                                type="button"
                                onClick={() => setMovementAmount(String(amt))}
                                className="btn btn-outline"
                                style={{ padding: "3px 7px", fontSize: "0.72rem", borderRadius: "6px" }}
                              >
                                ${(amt / 1000)}k
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                            Motivo o Concepto *:
                          </label>
                          <input
                            type="text"
                            required
                            className="input-field"
                            placeholder={movementType === "ingreso" ? "Ej: Cambio traído del banco" : "Ej: Pago proveedor Postobón"}
                            value={movementReason}
                            onChange={(e) => setMovementReason(e.target.value)}
                          />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => setShowMovementForm(false)}
                          className="btn btn-outline"
                          style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          style={{ padding: "6px 16px", fontSize: "0.8rem" }}
                        >
                          Guardar {movementType === "ingreso" ? "Entrada" : "Salida"}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Resumen rápido de productos vendidos en este turno */}
                  <div style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "14px",
                    padding: "14px 16px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Package size={16} color="var(--accent-blue)" />
                        Productos Vendidos en este Turno ({soldProductsSummary.length} ítems · {totalSoldUnits} unds)
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveSubTab("products")}
                        className="btn btn-outline"
                        style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                      >
                        Ver Lista Completa →
                      </button>
                    </div>

                    {soldProductsSummary.length === 0 ? (
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", padding: "10px 0" }}>
                        No se han registrado ventas con productos en este turno todavía.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "100px", overflowY: "auto" }}>
                        {soldProductsSummary.slice(0, 8).map((p, idx) => (
                          <div
                            key={idx}
                            style={{
                              background: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "8px",
                              padding: "4px 10px",
                              fontSize: "0.78rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px"
                            }}
                          >
                            <span style={{ fontWeight: 800, color: "var(--accent-blue)" }}>{p.cantidad}x</span>
                            <span style={{ color: "var(--text-main)" }}>{p.nombre}</span>
                            <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>({formatCOP(p.subtotal)})</span>
                          </div>
                        ))}
                        {soldProductsSummary.length > 8 && (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", alignSelf: "center", padding: "0 6px" }}>
                            +{soldProductsSummary.length - 8} más...
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* SECCIÓN ARQUEO Y CIERRE DEFINITIVO */}
                  <form onSubmit={handleCloseShiftSubmit} style={{
                    borderTop: "1px solid var(--border-color)",
                    paddingTop: "18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px"
                  }}>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                      Arqueo Físico y Cierre de Turno
                    </h3>

                    <div>
                      <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "6px", fontWeight: 700 }}>
                        ¿Cuánto efectivo físico hay actualmente en la gaveta? *:
                      </label>
                      <MathPriceInput
                        value={countedCash}
                        onChange={(val) => setCountedCash(String(val))}
                        placeholder="Ej: 50000*4+20000*3+10000*5"
                        className="input-field"
                        style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-main)", height: "46px" }}
                        min={0}
                        required
                      />

                      {/* Botones de acción rápida estilo POS */}
                      <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => setCountedCash(String(expectedCashInDrawer))}
                          className="btn btn-outline"
                          style={{
                            padding: "6px 12px",
                            fontSize: "0.78rem",
                            fontWeight: 800,
                            borderRadius: "8px",
                            background: "rgba(16, 185, 129, 0.12)",
                            borderColor: "rgba(16, 185, 129, 0.4)",
                            color: "#34d399"
                          }}
                          title="Fijar valor igual al esperado (caja exacta)"
                        >
                          ⚡ Exacto (${formatCOP(expectedCashInDrawer)})
                        </button>
                        {[50000, 100000, 200000, 500000].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setCountedCash(val.toString())}
                            className="btn btn-outline"
                            style={{
                              padding: "5px 10px",
                              fontSize: "0.76rem",
                              fontWeight: 700,
                              borderRadius: "8px",
                              background: "rgba(255,255,255,0.03)",
                              borderColor: "rgba(255,255,255,0.1)",
                              color: "var(--text-main)"
                            }}
                          >
                            ${(val / 1000)}k
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Comparador en vivo de cuadre */}
                    {cashDifference !== null && (
                      <div style={{
                        padding: "12px 16px",
                        borderRadius: "12px",
                        border: cashDifference === 0 
                          ? "1px solid rgba(16, 185, 129, 0.4)" 
                          : cashDifference > 0 
                            ? "1px solid rgba(59, 130, 246, 0.4)" 
                            : "1px solid rgba(239, 68, 68, 0.4)",
                        background: cashDifference === 0 
                          ? "rgba(16, 185, 129, 0.1)" 
                          : cashDifference > 0 
                            ? "rgba(59, 130, 246, 0.1)" 
                            : "rgba(239, 68, 68, 0.1)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "8px"
                      }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                          {cashDifference === 0
                            ? "🟢 ¡Caja perfectamente cuadrada! Sin faltantes ni sobrantes."
                            : cashDifference > 0
                              ? "🔵 Hay dinero sobrante en la caja:"
                              : "🔴 Hay dinero faltante en la caja:"}
                        </div>
                        <strong style={{
                          fontSize: "1.1rem",
                          color: cashDifference === 0 ? "#34d399" : cashDifference > 0 ? "#60a5fa" : "#f87171"
                        }}>
                          {cashDifference === 0 ? "$0" : `${cashDifference > 0 ? "+" : ""}${formatCOP(cashDifference)} COP`}
                        </strong>
                      </div>
                    )}

                    <div>
                      <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                        Notas u Observaciones del Cierre:
                      </label>
                      <textarea
                        rows="2"
                        className="input-field"
                        placeholder="Ej: Turno entregado conforme, gaveta revisada..."
                        value={closingNotes}
                        onChange={(e) => setClosingNotes(e.target.value)}
                      />
                    </div>

                    <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "6px", flexWrap: "wrap" }}>
                       <button
                         type="button"
                         onClick={handleSendLiveArqueoWhatsApp}
                         className="btn btn-outline"
                         style={{ padding: "10px 16px", fontSize: "0.88rem", background: "rgba(37, 211, 102, 0.1)", borderColor: "rgba(37,211,102,0.4)", color: "#25D366", display: "flex", alignItems: "center", gap: "6px" }}
                         title="Enviar el resumen del arqueo actual por WhatsApp (sin cerrar el turno)"
                       >
                         <Share2 size={15} />
                         <span>Arqueo WhatsApp</span>
                       </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-outline"
                        style={{ padding: "10px 18px", fontSize: "0.9rem" }}
                      >
                        Continuar Turno (Cerrar Ventana)
                      </button>
                      <button
                        type="submit"
                        disabled={isClosingLoading}
                        className="btn btn-danger"
                        style={{
                          padding: "12px 24px",
                          fontSize: "0.95rem",
                          fontWeight: 800,
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          borderRadius: "12px",
                          boxShadow: "0 4px 18px rgba(239, 68, 68, 0.4)",
                          opacity: isClosingLoading ? 0.7 : 1,
                          cursor: isClosingLoading ? "wait" : "pointer",
                          transition: "all 0.15s ease"
                        }}
                      >
                        <Lock size={18} />
                        <span>{isClosingLoading ? "Procesando Cierre..." : "Finalizar Turno y Realizar Cierre"}</span>
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* ──────────────────────────────────────────────────────── */}
              {/* SUB-VISTA 2: HISTORIAL DE MOVIMIENTOS EN VIVO */}
              {activeSubTab === "movements" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {/* Barra de Filtros y Búsqueda */}
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {[
                        { id: "todos", label: "Todos" },
                        { id: "ventas", label: `🛒 Ventas (${shiftSales.length})` },
                        { id: "ingresos", label: `➕ Ingresos (${movements.filter(m => m.tipo === "ingreso").length + 1})` },
                        { id: "egresos", label: `➖ Gastos (${movements.filter(m => m.tipo === "egreso").length})` }
                      ].map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setMovementFilter(f.id)}
                          className="btn"
                          style={{
                            padding: "6px 12px",
                            fontSize: "0.78rem",
                            borderRadius: "8px",
                            fontWeight: 700,
                            background: movementFilter === f.id ? "var(--accent-blue)" : "rgba(255,255,255,0.05)",
                            color: movementFilter === f.id ? "#fff" : "var(--text-muted)",
                            border: "1px solid var(--border-color)"
                          }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <div style={{ position: "relative", minWidth: "220px", flex: 1, maxWidth: "320px" }}>
                      <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                      <input
                        type="text"
                        placeholder="Buscar producto o concepto..."
                        value={movementSearch}
                        onChange={(e) => setMovementSearch(e.target.value)}
                        className="input-field"
                        style={{ paddingLeft: "30px", fontSize: "0.82rem", height: "34px" }}
                      />
                    </div>
                  </div>

                  {/* Tabla de Movimientos */}
                  <div style={{
                    maxHeight: "360px",
                    overflowY: "auto",
                    border: "1px solid var(--border-color)",
                    borderRadius: "14px",
                    background: "rgba(0,0,0,0.2)"
                  }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid var(--border-color)" }}>
                          <th style={{ padding: "10px 14px", color: "var(--text-muted)", width: "75px" }}>Hora</th>
                          <th style={{ padding: "10px 14px", color: "var(--text-muted)", width: "95px" }}>Tipo</th>
                          <th style={{ padding: "10px 14px", color: "var(--text-muted)" }}>Producto / Concepto</th>
                          <th style={{ padding: "10px 14px", color: "var(--text-muted)", textAlign: "center", width: "70px" }}>Cant.</th>
                          <th style={{ padding: "10px 14px", color: "var(--text-muted)", textAlign: "right", width: "110px" }}>Valor</th>
                          <th style={{ padding: "10px 14px", color: "var(--text-muted)", textAlign: "center", width: "95px" }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMovements.length === 0 ? (
                          <tr>
                            <td colSpan="6" style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                              No hay movimientos registrados que coincidan con la búsqueda.
                            </td>
                          </tr>
                        ) : (
                          filteredMovements.map((m) => {
                            const isVenta = m.tipo === "venta";
                            const isIngreso = m.tipo === "ingreso" || m.tipo === "apertura";
                            const isEgreso = m.tipo === "egreso";

                            return (
                              <tr key={m.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                <td style={{ padding: "10px 14px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                                  {m.hora}
                                </td>
                                <td style={{ padding: "10px 14px" }}>
                                  <span className={`badge ${
                                    isVenta ? "badge-blue" : isIngreso ? "badge-green" : "badge-red"
                                  }`} style={{ fontSize: "0.68rem" }}>
                                    {m.tipoLabel}
                                  </span>
                                </td>
                                <td style={{ padding: "10px 14px" }}>
                                  <div style={{ fontWeight: 700, color: "var(--text-main)" }}>
                                    {m.concepto}
                                  </div>
                                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                                    {m.detalle} · Método: <span style={{ color: "var(--text-main)" }}>{m.metodo}</span>
                                  </div>
                                </td>
                                <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700 }}>
                                  {m.cantidad !== null ? `${m.cantidad} und` : "—"}
                                </td>
                                <td style={{
                                  padding: "10px 14px",
                                  textAlign: "right",
                                  fontWeight: 800,
                                  color: isEgreso ? "#f87171" : isIngreso ? "#34d399" : "var(--accent-blue)"
                                }}>
                                  {isEgreso ? "-" : "+"}{formatCOP(Math.abs(m.monto))}
                                </td>
                                <td style={{ padding: "10px 14px", textAlign: "center", whiteSpace: "nowrap" }}>
                                  {m.tipo !== "apertura" && (
                                    <div style={{ display: "inline-flex", gap: "6px" }}>
                                      {m.rawSale && onPrintTicket && (
                                        <button
                                          type="button"
                                          onClick={() => onPrintTicket(m.rawSale)}
                                          className="btn btn-outline"
                                          title="Ver Factura de Venta"
                                          style={{ padding: "4px 8px", fontSize: "0.75rem", borderRadius: "6px" }}
                                        >
                                          <Printer size={13} />
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleStartEditMovement(m)}
                                        className="btn btn-outline"
                                        title="Editar concepto o valor"
                                        style={{ padding: "4px 8px", fontSize: "0.75rem", borderRadius: "6px", color: "var(--accent-blue)" }}
                                      >
                                        <Edit2 size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteItemClick(m)}
                                        className="btn btn-outline"
                                        title="Eliminar de la caja y del sistema"
                                        style={{ padding: "4px 8px", fontSize: "0.75rem", borderRadius: "6px", color: "#f87171", borderColor: "rgba(244,63,94,0.3)" }}
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* MODAL EDITAR MOVIMIENTO / VENTA */}
                  {editingMovement && (
                    <div className="modal-overlay" style={{ zIndex: 1400 }} onClick={() => setEditingMovement(null)}>
                      <div
                        className="modal-content modal-card"
                        style={{
                          maxWidth: "460px",
                          width: "92%",
                          padding: "24px",
                          background: "var(--bg-secondary, #111827)",
                          border: "1.5px solid var(--border-strong)",
                          borderRadius: "18px",
                          boxShadow: "0 25px 60px rgba(0,0,0,0.9)"
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                            Editar {editingMovement.tipo === "venta" ? "Venta en Caja" : "Movimiento de Caja"}
                          </h3>
                          <button type="button" onClick={() => setEditingMovement(null)} className="btn btn-outline" style={{ padding: "4px 8px" }}>
                            <X size={16} />
                          </button>
                        </div>

                        <form onSubmit={handleSaveEditMovement} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                          {editingMovement.tipo !== "venta" && (
                            <div>
                              <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "4px", fontWeight: 700 }}>
                                Tipo de Movimiento:
                              </label>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                <button
                                  type="button"
                                  onClick={() => setEditMovType("ingreso")}
                                  className="btn"
                                  style={{
                                    padding: "8px",
                                    fontSize: "0.82rem",
                                    fontWeight: 700,
                                    borderRadius: "8px",
                                    background: editMovType === "ingreso" ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.03)",
                                    border: editMovType === "ingreso" ? "1.5px solid var(--accent-blue)" : "1px solid var(--border-color)",
                                    color: editMovType === "ingreso" ? "#60a5fa" : "var(--text-muted)"
                                  }}
                                >
                                  ➕ Entrada / Ingreso
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditMovType("egreso")}
                                  className="btn"
                                  style={{
                                    padding: "8px",
                                    fontSize: "0.82rem",
                                    fontWeight: 700,
                                    borderRadius: "8px",
                                    background: editMovType === "egreso" ? "rgba(244, 63, 94, 0.2)" : "rgba(255,255,255,0.03)",
                                    border: editMovType === "egreso" ? "1.5px solid #f87171" : "1px solid var(--border-color)",
                                    color: editMovType === "egreso" ? "#f87171" : "var(--text-muted)"
                                  }}
                                >
                                  ➖ Salida / Gasto
                                </button>
                              </div>
                            </div>
                          )}

                          <div>
                            <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "4px", fontWeight: 700 }}>
                              Valor ($ COP) *:
                            </label>
                            <MathPriceInput
                              value={editMovAmount}
                              onChange={(val) => setEditMovAmount(String(val))}
                              className="input-field"
                              style={{ fontSize: "1.1rem", fontWeight: 800 }}
                              min={1}
                              required
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "4px", fontWeight: 700 }}>
                              Concepto / Motivo *:
                            </label>
                            <input
                              type="text"
                              required
                              className="input-field"
                              value={editMovReason}
                              onChange={(e) => setEditMovReason(e.target.value)}
                            />
                          </div>

                          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
                            <button
                              type="button"
                              onClick={() => setEditingMovement(null)}
                              className="btn btn-outline"
                              style={{ padding: "8px 14px", fontSize: "0.85rem" }}
                              disabled={isSavingEditMov}
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="btn btn-primary"
                              style={{ padding: "8px 18px", fontSize: "0.85rem" }}
                              disabled={isSavingEditMov}
                            >
                              {isSavingEditMov ? "Guardando..." : "Guardar Cambios"}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ──────────────────────────────────────────────────────── */}
              {/* SUB-VISTA 3: PRODUCTOS VENDIDOS DETALLADOS */}
              {activeSubTab === "products" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: "0.9rem", color: "var(--text-main)", fontWeight: 700 }}>
                      Detalle acumulado de productos en este turno:
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      Total unidades: <strong style={{ color: "var(--text-main)" }}>{totalSoldUnits} unds</strong> · Ventas: <strong style={{ color: "var(--accent-blue)" }}>{formatCOP(totalSalesRevenue)}</strong>
                    </div>
                  </div>

                  <div style={{
                    maxHeight: "360px",
                    overflowY: "auto",
                    border: "1px solid var(--border-color)",
                    borderRadius: "14px",
                    background: "rgba(0,0,0,0.2)"
                  }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem", textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid var(--border-color)" }}>
                          <th style={{ padding: "10px 14px", color: "var(--text-muted)" }}>Producto</th>
                          <th style={{ padding: "10px 14px", color: "var(--text-muted)", width: "130px" }}>Categoría</th>
                          <th style={{ padding: "10px 14px", color: "var(--text-muted)", textAlign: "center", width: "90px" }}>Cantidad</th>
                          <th style={{ padding: "10px 14px", color: "var(--text-muted)", textAlign: "right", width: "110px" }}>Precio Unit.</th>
                          <th style={{ padding: "10px 14px", color: "var(--text-muted)", textAlign: "right", width: "120px" }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {soldProductsSummary.length === 0 ? (
                          <tr>
                            <td colSpan="5" style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                              No se han registrado productos vendidos en este turno.
                            </td>
                          </tr>
                        ) : (
                          soldProductsSummary.map((p, idx) => (
                            <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              <td style={{ padding: "10px 14px", fontWeight: 700, color: "var(--text-main)" }}>
                                {p.nombre}
                              </td>
                              <td style={{ padding: "10px 14px", color: "var(--text-muted)" }}>
                                {p.categoria || "General"}
                              </td>
                              <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 800, color: "var(--accent-blue)" }}>
                                {p.cantidad}
                              </td>
                              <td style={{ padding: "10px 14px", textAlign: "right", color: "var(--text-muted)" }}>
                                {formatCOP(p.precioUnitario)}
                              </td>
                              <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 800, color: "#34d399" }}>
                                {formatCOP(p.subtotal)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "10px",
                    fontSize: "0.95rem"
                  }}>
                    <span><strong>Total General Productos:</strong> {soldProductsSummary.length} diferentes ({totalSoldUnits} unidades)</span>
                    <strong style={{ color: "var(--accent-blue)" }}>Subtotal Acumulado: {formatCOP(totalSalesRevenue)} COP</strong>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal de Confirmación de Cierre (reemplaza window.confirm) ── */}
      {showConfirmClose && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1300 }}
          onClick={() => setShowConfirmClose(false)}
        >
          <div
            className="modal-content modal-card"
            style={{
              maxWidth: "440px",
              width: "92%",
              padding: "28px 24px",
              background: "var(--bg-secondary, #111827)",
              border: "1.5px solid rgba(239,68,68,0.4)",
              borderRadius: "20px",
              boxShadow: "0 25px 60px rgba(0,0,0,0.9)",
              textAlign: "center"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.15)",
              color: "#f87171",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px"
            }}>
              <Lock size={28} />
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)", margin: "0 0 8px" }}>
              ¿Finalizar Turno y Cerrar Caja?
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginBottom: "8px" }}>
              Esta acción <strong style={{ color: "#f87171" }}>no se puede deshacer</strong>. Se registrará el cierre con:
            </p>
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              padding: "12px 16px",
              textAlign: "left",
              fontSize: "0.85rem",
              marginBottom: "20px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "var(--text-muted)" }}>Efectivo esperado:</span>
                <strong style={{ color: "var(--text-main)" }}>{formatCOP(expectedCashInDrawer)} COP</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "var(--text-muted)" }}>Efectivo contado:</span>
                <strong style={{ color: "var(--text-main)" }}>{formatCOP(parsedCountedCash || 0)} COP</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid var(--border-color)" }}>
                <span style={{ color: "var(--text-muted)" }}>Diferencia:</span>
                <strong style={{
                  color: cashDifference === 0 ? "#34d399" : cashDifference > 0 ? "#60a5fa" : "#f87171"
                }}>
                  {cashDifference === 0 ? "Cuadrada ($0)" : `${cashDifference > 0 ? "+" : ""}${formatCOP(cashDifference)} COP`}
                </strong>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => setShowConfirmClose(false)}
                className="btn btn-outline"
                style={{ flex: 1, padding: "11px 16px", fontWeight: 700 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeCloseShift}
                className="btn btn-danger"
                style={{ flex: 1, padding: "11px 16px", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                <Lock size={16} />
                <span>Sí, Cerrar Caja</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Independiente de Ticket de Cierre para Previsualizar e Imprimir */}
      {selectedClosingForTicket && (
        <ClosingTicketModal
          closing={selectedClosingForTicket}
          onClose={() => setSelectedClosingForTicket(null)}
          storeConfig={storeConfig}
        />
      )}
    </>
  );
}
