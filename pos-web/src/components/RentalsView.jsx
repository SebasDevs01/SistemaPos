import React, { useState, useEffect } from "react";
import { 
  Armchair, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Phone, 
  MessageCircle, 
  Plus, 
  Calendar, 
  DollarSign, 
  User, 
  ShieldAlert, 
  RotateCcw,
  Sparkles,
  Info,
  Trash2,
  Filter,
  Search,
  CalendarRange,
  X,
  Edit3,
  Save,
  Printer,
  CalendarDays,
  Eye,
  Paperclip,
  Image as ImageIcon
} from "lucide-react";
import RentalTicketModal from "./RentalTicketModal";
import RentalOrderModal from "./RentalOrderModal";
import PaymentEvidenceUploader from "./PaymentEvidenceUploader";
import MathPriceInput from "./MathPriceInput";

export default function RentalsView({ 
  rentals = [], 
  onSaveRental, 
  onReturnRental, 
  onDeleteRental,
  onClearReturnedRentals,
  onCompleteSale,
  onPayRentalBalance,
  activeShift = null,
  clients = [],
  products = [],
  storeConfig = {},
  currentUser = null
}) {
  const [filterStatus, setFilterStatus] = useState("todos"); // 'todos', 'vencidos', 'activos', 'devueltos'
  const [dateFilter, setDateFilter] = useState("all"); // 'all', 'today', '7days', 'month', 'custom'
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewRentalModalOpen, setIsNewRentalModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearOption, setClearOption] = useState("all"); // 'all', 'older7', 'older30'
  const [rentalToDelete, setRentalToDelete] = useState(null);
  const [editingRental, setEditingRental] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [rentalToPrint, setRentalToPrint] = useState(null);
  const [rentalToPayBalance, setRentalToPayBalance] = useState(null);
  const [balancePayMethod, setBalancePayMethod] = useState("Efectivo");
  const [balanceCashReceived, setBalanceCashReceived] = useState("");
  const [balanceComprobanteUrl, setBalanceComprobanteUrl] = useState(null);
  const [isBalanceSubmitting, setIsBalanceSubmitting] = useState(false);
  const [actionNotice, setActionNotice] = useState("");
  const [now, setNow] = useState(Date.now());

  // Modal para adjuntar o editar comprobante en alquiler existente
  const [rentalToAttachEvidence, setRentalToAttachEvidence] = useState(null);
  const [evidenceToSave, setEvidenceToSave] = useState(null);
  const [isSavingEvidence, setIsSavingEvidence] = useState(false);

  // Modal para visor de comprobante en alta resolución
  const [viewingEvidenceModal, setViewingEvidenceModal] = useState(null);

  // Modal de Inspección y Devolución con Depósito de Garantía
  const [rentalToReturnInspect, setRentalToReturnInspect] = useState(null);
  const [returnCondition, setReturnCondition] = useState("perfecto"); // 'perfecto' | 'dano'
  const [sillasDanadas, setSillasDanadas] = useState(0);
  const [mesasDanadas, setMesasDanadas] = useState(0);
  const [montoRetenerDeposito, setMontoRetenerDeposito] = useState(30000);
  const [danoObservaciones, setDanoObservaciones] = useState("");
  const [isReturningSubmitting, setIsReturningSubmitting] = useState(false);

  // Actualizar el cronómetro cada minuto
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Formulario nuevo alquiler
  const [formData, setFormData] = useState({
    clienteNombre: "",
    clienteTelefono: "",
    clienteDireccion: "",
    metodoPago: "Efectivo",
    item: "Sillas",
    cantidadSillas: 10,
    cantidadMesas: 0,
    cantidad: 10,
    precioUnitario: 1500,
    deposito: 30000,
    duracionHoras: 24,
    observaciones: ""
  });

  // Buscar productos de sillas y mesas para conocer la capacidad / stock total fijado por el usuario en Inventario
  const chairProduct = products.find(p => p.codigo === "1002" || String(p.nombre || "").toLowerCase().includes("silla"));
  const tableProduct = products.find(p => p.codigo === "1001" || String(p.nombre || "").toLowerCase().includes("mesa"));
  const totalStockSillas = Number(chairProduct ? chairProduct.stock : 36);
  const totalStockMesas = Number(tableProduct ? tableProduct.stock : 2);

  // Calcular métricas de unidades que están actualmente fuera físicamente de la tienda (activas)
  const activeRentedChairs = rentals
    .filter(r => r.estado !== "devuelto" && r.estado !== "reservado" && !r.esApartado && r.tipoOperacion !== "reserva" && (String(r.item || "").toLowerCase().includes("silla") || Number(r.cantidadSillas || 0) > 0))
    .reduce((sum, r) => sum + Number(r.cantidadSillas || (String(r.item || "").toLowerCase().includes("silla") ? r.cantidad : 0) || 0), 0);

  const activeRentedTables = rentals
    .filter(r => r.estado !== "devuelto" && r.estado !== "reservado" && !r.esApartado && r.tipoOperacion !== "reserva" && (String(r.item || "").toLowerCase().includes("mesa") || Number(r.cantidadMesas || 0) > 0))
    .reduce((sum, r) => sum + Number(r.cantidadMesas || (String(r.item || "").toLowerCase().includes("mesa") && !String(r.item || "").toLowerCase().includes("silla") ? r.cantidad : 0) || 0), 0);

  // Unidades apartadas para eventos futuros (aún físicamente en la tienda)
  const futureReservedChairs = rentals
    .filter(r => r.estado !== "devuelto" && (r.estado === "reservado" || r.esApartado || r.tipoOperacion === "reserva") && (String(r.item || "").toLowerCase().includes("silla") || Number(r.cantidadSillas || 0) > 0))
    .reduce((sum, r) => sum + Number(r.cantidadSillas || (String(r.item || "").toLowerCase().includes("silla") ? r.cantidad : 0) || 0), 0);

  const futureReservedTables = rentals
    .filter(r => r.estado !== "devuelto" && (r.estado === "reservado" || r.esApartado || r.tipoOperacion === "reserva") && (String(r.item || "").toLowerCase().includes("mesa") || Number(r.cantidadMesas || 0) > 0))
    .reduce((sum, r) => sum + Number(r.cantidadMesas || (String(r.item || "").toLowerCase().includes("mesa") && !String(r.item || "").toLowerCase().includes("silla") ? r.cantidad : 0) || 0), 0);

  // Stock físico hoy en tienda
  const stockSillasEnTienda = Math.max(0, totalStockSillas - activeRentedChairs);
  const stockMesasEnTienda = Math.max(0, totalStockMesas - activeRentedTables);

  // Stock disponible libre de reservas
  const stockSillasDisponibles = Math.max(0, totalStockSillas - activeRentedChairs - futureReservedChairs);
  const stockMesasDisponibles = Math.max(0, totalStockMesas - activeRentedTables - futureReservedTables);

  const totalRentedChairs = activeRentedChairs;
  const totalRentedTables = activeRentedTables;

  // Conteo de apartados / reservas (fechas especiales como Diciembre)
  const apartadosRentals = rentals.filter(r => r.estado === "reservado" || r.tipoOperacion === "reserva" || r.esApartado);
  const apartadosCount = apartadosRentals.length;

  // Calcular horas transcurridas y estado de alerta de 24h
  const getRentalAlertInfo = (rental) => {
    if (rental.estado === "devuelto") {
      return { 
        status: "devuelto", 
        badgeText: "Devuelto",
        label: "Devuelto", 
        color: "badge-green", 
        elapsedHours: 0, 
        isOverdue: false 
      };
    }

    // Alquiler apartado / reservado para fecha especial
    if (rental.estado === "reservado" || rental.tipoOperacion === "reserva" || rental.esApartado) {
      let diasFaltantes = null;
      let evDate = null;
      if (rental.fechaEvento) {
        evDate = new Date(rental.fechaEvento + (rental.horaEvento ? `T${rental.horaEvento}` : "T12:00:00"));
        diasFaltantes = Math.ceil((evDate.getTime() - now) / (1000 * 60 * 60 * 24));
      }
      // Mostrar emoji según mes del evento
      const evMonth = evDate ? evDate.getMonth() : -1; // 11 = diciembre
      const eventEmoji = evMonth === 11 ? "🎄" : evMonth === 0 ? "🎉" : "📅";
      const eventDateShort = evDate
        ? evDate.toLocaleDateString("es-CO", { day: "numeric", month: "short" })
        : "";
      const badgeTxt = diasFaltantes !== null
        ? (diasFaltantes > 0
            ? `${eventEmoji} ${eventDateShort} · Faltan ${diasFaltantes} días`
            : diasFaltantes === 0
              ? "🎉 ¡EVENTO HOY!"
              : `⚠️ ${eventDateShort} · Pasado`)
        : `${eventEmoji} Apartado`;
      return {
        status: "reservado",
        badgeText: badgeTxt,
        label: `Apartado: ${rental.fechaEvento || "Fecha especial"}`,
        color: diasFaltantes === 0 ? "badge-green" : "badge-purple",
        elapsedHours: 0,
        isOverdue: false,
        isReserva: true,
        diasFaltantes
      };
    }

    const start = new Date(rental.fechaInicio).getTime();
    const elapsedMs = now - start;
    const elapsedHours = Math.floor(elapsedMs / (1000 * 60 * 60));
    const elapsedMinutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));
    const maxHours = rental.duracionHoras || 24;

    if (elapsedHours >= maxHours) {
      const extraHours = elapsedHours - maxHours;
      return {
        status: "vencido",
        badgeText: `¡Vencido (+${extraHours}h)!`,
        label: `¡ALERTA 24H VENCIDA! (+${extraHours}h ${elapsedMinutes}m de retraso)`,
        extraHours,
        elapsedMinutes,
        color: "badge-red",
        elapsedText: `${elapsedHours}h ${elapsedMinutes}m transcurridas`,
        isOverdue: true,
        hoursDiff: extraHours
      };
    } else if (elapsedHours >= maxHours - 4) {
      const remainingHours = maxHours - elapsedHours;
      return {
        status: "por_vencer",
        badgeText: `Por vencer (${remainingHours}h)`,
        label: `Por vencer (Quedan ${remainingHours}h)`,
        remainingHours,
        color: "badge-amber",
        elapsedText: `${elapsedHours}h ${elapsedMinutes}m transcurridas`,
        isOverdue: false
      };
    } else {
      return {
        status: "activo",
        badgeText: `En Plazo (${elapsedHours}/${maxHours}h)`,
        label: `En Plazo (${elapsedHours}h de ${maxHours}h)`,
        color: "badge-blue",
        elapsedText: `${elapsedHours}h ${elapsedMinutes}m transcurridas`,
        isOverdue: false
      };
    }
  };

  // Abrir WhatsApp con mensaje pre-redactado
  const handleOpenWhatsApp = (rental, alertInfo) => {
    const cleanPhone = String(rental.clienteTelefono || "").replace(/\D/g, "");
    const phoneWithCountry = cleanPhone.startsWith("57") ? cleanPhone : `57${cleanPhone}`;
    
    const message = `Hola ${rental.clienteNombre}, cordial saludo de *${storeConfig.nombre || "Miscelánea María José"}*. 🪑\n\nLe recordamos amablemente que el alquiler de las *${rental.cantidad} ${rental.item}* ha cumplido el plazo acordado de 24 horas.\n\nPor favor confírmenos si pasará a entregarlas hoy o si desea extender el alquiler por 24 horas más.\n\n¡Quedamos muy atentos, muchas gracias!`;
    
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${phoneWithCountry}?text=${encoded}`, "_blank");
  };

  // Guardar nuevo alquiler
  const handleSubmitNewRental = async (e) => {
    e.preventDefault();
    if (!formData.clienteNombre || !formData.clienteTelefono) {
      alert("Por favor ingrese el nombre y teléfono del cliente.");
      return;
    }

    const cantSillas = formData.item === "Mesas" ? 0 : (formData.cantidadSillas ?? formData.cantidad ?? 0);
    const cantMesas  = formData.item === "Sillas" ? 0 : (formData.cantidadMesas ?? 0);
    const total = formData.item === "Sillas y Mesas"
      ? cantSillas * 1500 + cantMesas * 10000
      : formData.item === "Mesas"
        ? cantMesas * (formData.precioUnitario || 10000)
        : cantSillas * (formData.precioUnitario || 1500);

    const newRental = {
      ...formData,
      cantidadSillas: cantSillas,
      cantidadMesas: cantMesas,
      cantidad: cantSillas + cantMesas, // total de unidades para compatibilidad
      precioTotal: total,
      fechaInicio: new Date().toISOString(),
      estado: "activo"
    };

    await onSaveRental(newRental);
    setIsNewRentalModalOpen(false);
    setFormData({
      clienteNombre: "",
      clienteTelefono: "",
      clienteDireccion: "",
      metodoPago: "Efectivo",
      item: "Sillas",
      cantidadSillas: 10,
      cantidadMesas: 0,
      cantidad: 10,
      precioUnitario: 1500,
      deposito: 30000,
      duracionHoras: 24,
      observaciones: ""
    });
  };

  // Apertura de inspección al recibir el mobiliario
  const handleOpenReturnInspection = (rental) => {
    setRentalToReturnInspect(rental);
    setReturnCondition("perfecto");
    setSillasDanadas(0);
    setMesasDanadas(0);
    const depVal = Number(rental.deposito) > 0 ? Number(rental.deposito) : 30000;
    setMontoRetenerDeposito(depVal);
    setDanoObservaciones("");
  };

  // Confirmar devolución tras inspección física del mobiliario (Cierre instantáneo 0ms)
  const handleConfirmReturnWithInspection = async () => {
    if (!rentalToReturnInspect || isReturningSubmitting) return;
    const targetRental = rentalToReturnInspect;
    setIsReturningSubmitting(true);
    try {
      const depTotal = Number(targetRental.deposito) > 0 ? Number(targetRental.deposito) : 30000;
      const isDamaged = returnCondition === "dano";
      const retenido = isDamaged ? Math.min(depTotal, Math.max(0, Number(montoRetenerDeposito) || 0)) : 0;
      const devuelto = isDamaged ? Math.max(0, depTotal - retenido) : depTotal;

      const returnDetails = {
        depositoRetenido: retenido,
        depositoDevuelto: devuelto,
        danoReportado: isDamaged,
        danoDescripcion: isDamaged 
          ? (danoObservaciones.trim() || `Daño reportado: ${sillasDanadas} sillas, ${mesasDanadas} mesas con rotura`)
          : "Mobiliario devuelto en perfecto estado",
        sillasDanadas: isDamaged ? Number(sillasDanadas) || 0 : 0,
        mesasDanadas: isDamaged ? Number(mesasDanadas) || 0 : 0
      };

      // Cerrar modal al instante (0 ms) sin hacer esperar al usuario
      setRentalToReturnInspect(null);

      if (isDamaged && retenido > 0) {
        setActionNotice(`⚠️ Mobiliario recibido con novedad. Se retuvieron $${retenido.toLocaleString()} COP del depósito por daño.`);
      } else {
        setActionNotice(`✅ Mobiliario recibido en perfecto estado. Depósito de $${depTotal.toLocaleString()} COP devuelto al cliente.`);
      }
      setTimeout(() => setActionNotice(""), 5000);

      if (onReturnRental) {
        onReturnRental(targetRental.id, returnDetails).then(updated => {
          if (updated) {
            setRentalToPrint(updated);
          }
        }).catch(e => {
          console.error("Error al procesar devolución en segundo plano:", e);
        });
      }
    } catch (e) {
      console.error("Error al procesar devolución:", e);
      alert("Error al procesar la devolución. Intente nuevamente.");
    } finally {
      setIsReturningSubmitting(false);
    }
  };

  // Métricas de registros devueltos para el limpiador
  const returnedRentals = rentals.filter(r => r.estado === "devuelto");
  const returnedCount = returnedRentals.length;
  const returnedOlder7Count = returnedRentals.filter(r => {
    const t = new Date(r.fechaDevolucion || r.fechaInicio).getTime();
    return (now - t) > (7 * 24 * 60 * 60 * 1000);
  }).length;
  const returnedOlder30Count = returnedRentals.filter(r => {
    const t = new Date(r.fechaDevolucion || r.fechaInicio).getTime();
    return (now - t) > (30 * 24 * 60 * 60 * 1000);
  }).length;

  // Filtrar lista por estado, fechas y texto
  const filteredRentals = rentals.filter(r => {
    const alertInfo = getRentalAlertInfo(r);

    // 1. Filtro de estado
    if (filterStatus === "apartados" && alertInfo.status !== "reservado") return false;
    if (filterStatus === "vencidos" && alertInfo.status !== "vencido") return false;
    if (filterStatus === "activos" && (alertInfo.status !== "activo" && alertInfo.status !== "por_vencer")) return false;
    if (filterStatus === "devueltos" && alertInfo.status !== "devuelto") return false;

    // 2. Filtro de fechas
    if (dateFilter !== "all") {
      const rentalTime = new Date(r.fechaInicio).getTime();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      if (dateFilter === "today") {
        if (rentalTime < todayStart.getTime()) return false;
      } else if (dateFilter === "7days") {
        const sevenDaysAgo = todayStart.getTime() - (7 * 24 * 60 * 60 * 1000);
        if (rentalTime < sevenDaysAgo) return false;
      } else if (dateFilter === "month") {
        const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1).getTime();
        if (rentalTime < monthStart) return false;
      } else if (dateFilter === "custom") {
        if (customStartDate) {
          const startT = new Date(customStartDate + "T00:00:00").getTime();
          if (rentalTime < startT) return false;
        }
        if (customEndDate) {
          const endT = new Date(customEndDate + "T23:59:59").getTime();
          if (rentalTime > endT) return false;
        }
      }
    }

    // 3. Filtro de búsqueda por texto
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (r.clienteNombre || "").toLowerCase().includes(q);
      const matchPhone = (r.clienteTelefono || "").includes(q);
      const matchItem = (r.item || "").toLowerCase().includes(q);
      const matchObs = (r.observaciones || "").toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchItem && !matchObs) return false;
    }

    return true;
  });

  const overdueCount = rentals.filter(r => getRentalAlertInfo(r).status === "vencido").length;

  // Ejecutar limpieza de alquileres devueltos
  const handleExecuteClear = async () => {
    let idsToClear = [];
    if (clearOption === "all") {
      idsToClear = returnedRentals.map(r => r.id);
    } else if (clearOption === "older7") {
      idsToClear = returnedRentals.filter(r => {
        const t = new Date(r.fechaDevolucion || r.fechaInicio).getTime();
        return (now - t) > (7 * 24 * 60 * 60 * 1000);
      }).map(r => r.id);
    } else if (clearOption === "older30") {
      idsToClear = returnedRentals.filter(r => {
        const t = new Date(r.fechaDevolucion || r.fechaInicio).getTime();
        return (now - t) > (30 * 24 * 60 * 60 * 1000);
      }).map(r => r.id);
    }

    if (idsToClear.length === 0) {
      alert("No hay registros devueltos que cumplan el criterio seleccionado.");
      return;
    }

    if (onClearReturnedRentals) {
      await onClearReturnedRentals(idsToClear);
      setActionNotice(`¡Se han eliminado exitosamente ${idsToClear.length} registros devueltos del historial!`);
      setTimeout(() => setActionNotice(""), 4500);
    }
    setIsClearModalOpen(false);
  };

  // Confirmar eliminación individual
  const handleConfirmDeleteSingle = async () => {
    if (!rentalToDelete) return;
    if (onDeleteRental) {
      await onDeleteRental(rentalToDelete.id);
      setActionNotice(`Registro de "${rentalToDelete.clienteNombre}" eliminado del historial.`);
      setTimeout(() => setActionNotice(""), 4500);
    }
    setRentalToDelete(null);
  };

  // Abrir modal de edición
  const handleOpenEdit = (rental) => {
    setEditingRental(rental);
    let fechaInicioVal = "";
    try {
      if (rental.fechaInicio) {
        const d = new Date(rental.fechaInicio);
        if (!isNaN(d.getTime())) {
          fechaInicioVal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        }
      }
    } catch {}

    setEditFormData({
      id: rental.id,
      clienteNombre: rental.clienteNombre || "",
      clienteTelefono: rental.clienteTelefono || "",
      item: rental.item || "Sillas Alquiler",
      cantidad: Number(rental.cantidad) || 1,
      precioUnitario: Number(rental.precioUnitario) || 1500,
      deposito: Number(rental.deposito) || 0,
      duracionHoras: Number(rental.duracionHoras) || 24,
      fechaInicio: fechaInicioVal,
      estado: rental.estado || "activo",
      observaciones: rental.observaciones || ""
    });
  };

  // Guardar cambios del alquiler editado
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editFormData || !editFormData.clienteNombre || !editFormData.clienteTelefono) {
      alert("Por favor complete el nombre y teléfono del cliente.");
      return;
    }

    const total = (Number(editFormData.cantidad) || 1) * (Number(editFormData.precioUnitario) || 0);
    let isoDate = editingRental.fechaInicio;
    if (editFormData.fechaInicio) {
      try {
        isoDate = new Date(editFormData.fechaInicio).toISOString();
      } catch {}
    }

    const updated = {
      ...editingRental,
      ...editFormData,
      cantidad: Number(editFormData.cantidad) || 1,
      precioUnitario: Number(editFormData.precioUnitario) || 0,
      precioTotal: total,
      deposito: Number(editFormData.deposito) || 0,
      duracionHoras: Number(editFormData.duracionHoras) || 24,
      fechaInicio: isoDate,
      fechaDevolucion: editFormData.estado === "devuelto" ? (editingRental.fechaDevolucion || new Date().toISOString()) : null
    };

    if (onSaveRental) {
      await onSaveRental(updated);
      setActionNotice(`¡Registro de alquiler de "${updated.clienteNombre}" actualizado con éxito!`);
      setTimeout(() => setActionNotice(""), 4500);
    }
    setEditingRental(null);
    setEditFormData(null);
  };

  return (
    <div style={{ maxWidth: "1600px", margin: "0 auto", padding: "20px" }}>
      {/* Banner Principal de Métricas */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: "16px",
        marginBottom: "24px"
      }}>
        {/* Tarjeta Alerta 24H */}
        <div className={`glass-panel ${overdueCount > 0 ? "pulse-alert" : ""}`} style={{
          padding: "20px",
          background: overdueCount > 0 ? "rgba(244, 63, 94, 0.12)" : "var(--bg-card)",
          borderColor: overdueCount > 0 ? "var(--neon-rose)" : "var(--border-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div>
            <span style={{ fontSize: "0.85rem", color: overdueCount > 0 ? "var(--neon-rose)" : "var(--text-muted)", fontWeight: 700 }}>
              ALERTAS 24 HORAS (&gt; 24H)
            </span>
            <div style={{ fontSize: "2.4rem", fontWeight: 800, color: overdueCount > 0 ? "var(--neon-rose)" : "var(--text-main)", marginTop: "4px" }}>
              {overdueCount}
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {overdueCount > 0 ? "Requieren aviso por WhatsApp" : "Todos los alquileres al día"}
            </p>
          </div>
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: overdueCount > 0 ? "rgba(244, 63, 94, 0.2)" : "rgba(59, 130, 246, 0.15)",
            color: overdueCount > 0 ? "var(--neon-rose)" : "var(--neon-blue)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <ShieldAlert size={32} />
          </div>
        </div>

        {/* Tarjeta Sillas en la calle */}
        <div className="glass-panel" style={{ padding: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 700 }}>
              SILLAS EN USO
            </span>
            <div style={{ fontSize: "2.4rem", fontWeight: 800, color: "var(--neon-blue)", marginTop: "4px" }}>
              {activeRentedChairs}
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Físico en tienda: <strong style={{ color: stockSillasEnTienda > 0 ? "var(--neon-emerald, #34d399)" : "var(--neon-rose, #f43f5e)" }}>{stockSillasEnTienda} sillas</strong>
              {futureReservedChairs > 0 ? ` · (${futureReservedChairs} apartadas)` : ""}
            </p>
          </div>
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "rgba(56, 189, 248, 0.15)",
            color: "var(--neon-blue)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Armchair size={32} />
          </div>
        </div>

        {/* Tarjeta Mesas alquiladas */}
        <div className="glass-panel" style={{ padding: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 700 }}>
              MESAS EN USO
            </span>
            <div style={{ fontSize: "2.4rem", fontWeight: 800, color: "var(--neon-amber)", marginTop: "4px" }}>
              {activeRentedTables}
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Físico en tienda: <strong style={{ color: stockMesasEnTienda > 0 ? "var(--neon-emerald, #34d399)" : "var(--neon-rose, #f43f5e)" }}>{stockMesasEnTienda} mesas</strong>
              {futureReservedTables > 0 ? ` · (${futureReservedTables} apartadas)` : ""}
            </p>
          </div>
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "rgba(245, 158, 11, 0.15)",
            color: "var(--neon-amber)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Armchair size={32} />
          </div>
        </div>

        {/* Tarjeta Apartados para Fechas Especiales / Diciembre */}
        <div className="glass-panel" style={{
          padding: "20px",
          background: apartadosCount > 0 ? "rgba(16, 185, 129, 0.08)" : "var(--bg-card)",
          borderColor: apartadosCount > 0 ? "rgba(16, 185, 129, 0.3)" : "var(--border-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div>
            <span style={{ fontSize: "0.85rem", color: apartadosCount > 0 ? "#34d399" : "var(--text-muted)", fontWeight: 700 }}>
              🎄 APARTADOS / RESERVAS
            </span>
            <div style={{ fontSize: "2.4rem", fontWeight: 800, color: apartadosCount > 0 ? "#10b981" : "var(--text-main)", marginTop: "4px" }}>
              {apartadosCount}
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Eventos de Diciembre y Especiales
            </p>
          </div>
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "rgba(16, 185, 129, 0.15)",
            color: "#10b981",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <CalendarDays size={30} />
          </div>
        </div>
      </div>

      {/* Notificación de Acción */}
      {actionNotice && (
        <div style={{
          background: "rgba(16, 185, 129, 0.15)",
          border: "1px solid rgba(16, 185, 129, 0.35)",
          color: "#34d399",
          padding: "10px 18px",
          borderRadius: "12px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontWeight: 700,
          fontSize: "0.9rem"
        }}>
          <CheckCircle size={18} />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Barra de Acciones, Búsqueda y Filtros de Fechas */}
      <div className="glass-panel" style={{
        padding: "18px 20px",
        marginBottom: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px"
      }}>
        {/* Fila 1: Filtro de Estados y Botones Principales */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px"
        }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
              <Filter size={14} /> Estado:
            </span>
            {[
              { id: "todos", label: `Todos (${rentals.length})` },
              { id: "apartados", label: `🎄 Apartados / Diciembre (${apartadosCount})` },
              { id: "vencidos", label: `⚠️ Vencidos (>24h) (${overdueCount})` },
              { id: "activos", label: `🟢 Activos (${rentals.filter(r => r.estado !== "devuelto" && r.estado !== "reservado").length})` },
              { id: "devueltos", label: `✅ Devueltos (${returnedCount})` }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterStatus(f.id)}
                className="btn"
                style={{
                  padding: "6px 12px",
                  fontSize: "0.82rem",
                  borderRadius: "var(--radius-full)",
                  background: filterStatus === f.id ? "rgba(99, 102, 241, 0.18)" : "transparent",
                  border: filterStatus === f.id ? "1.5px solid var(--neon-indigo, #4f46e5)" : "1px solid var(--border-color)",
                  color: filterStatus === f.id ? "var(--neon-indigo, #4f46e5)" : "var(--text-muted)",
                  fontWeight: 700
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            {/* Botón Limpiador de Devueltos */}
            <button
              onClick={() => setIsClearModalOpen(true)}
              disabled={returnedCount === 0}
              className="btn btn-outline"
              style={{
                padding: "8px 14px",
                fontSize: "0.85rem",
                color: returnedCount > 0 ? "var(--neon-amber, #fbbf24)" : "var(--text-muted)",
                borderColor: returnedCount > 0 ? "rgba(245, 158, 11, 0.35)" : "var(--border-color)",
                background: returnedCount > 0 ? "rgba(245, 158, 11, 0.08)" : "transparent",
                opacity: returnedCount === 0 ? 0.5 : 1
              }}
              title="Limpiar registros de mobiliario devuelto para no acumular un historial infinito"
              type="button"
            >
              <Trash2 size={16} />
              <span>Limpiar Devueltos ({returnedCount})</span>
            </button>

            {/* Botón Registrar Nuevo Alquiler */}
            <button
              onClick={() => setIsNewRentalModalOpen(true)}
              className="btn btn-primary"
              style={{ padding: "9px 16px", fontSize: "0.9rem" }}
              type="button"
            >
              <Plus size={17} />
              <span>Nuevo Alquiler</span>
            </button>
          </div>
        </div>

        {/* Fila 2: Filtro por Fechas y Buscador de Texto */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          paddingTop: "12px",
          borderTop: "1px solid var(--border-color, rgba(255,255,255,0.06))"
        }}>
          {/* Botones de Rango de Fechas */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
              <CalendarRange size={14} /> Fecha:
            </span>
            {[
              { id: "all", label: "Todas" },
              { id: "today", label: "Hoy" },
              { id: "7days", label: "Últimos 7 días" },
              { id: "month", label: "Este Mes" },
              { id: "custom", label: "Personalizado..." }
            ].map(df => (
              <button
                key={df.id}
                onClick={() => setDateFilter(df.id)}
                className="btn"
                style={{
                  padding: "5px 11px",
                  fontSize: "0.78rem",
                  borderRadius: "8px",
                  background: dateFilter === df.id ? "rgba(59, 130, 246, 0.16)" : "var(--bg-glass, rgba(255,255,255,0.03))",
                  border: dateFilter === df.id ? "1px solid rgba(59, 130, 246, 0.5)" : "1px solid var(--border-color)",
                  color: dateFilter === df.id ? "#60a5fa" : "var(--text-muted)",
                  fontWeight: 600
                }}
                type="button"
              >
                {df.label}
              </button>
            ))}

            {/* Inputs de Fecha personalizada */}
            {dateFilter === "custom" && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "4px" }}>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="input-field"
                  style={{ padding: "4px 8px", fontSize: "0.78rem", width: "135px" }}
                  title="Fecha inicial"
                />
                <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>a</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="input-field"
                  style={{ padding: "4px 8px", fontSize: "0.78rem", width: "135px" }}
                  title="Fecha final"
                />
              </div>
            )}
          </div>

          {/* Campo de Búsqueda rápida por Cliente / Teléfono */}
          <div style={{ position: "relative", minWidth: "240px", flex: "1 1 240px", maxWidth: "360px" }}>
            <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Buscar cliente, celular o artículo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{
                width: "100%",
                padding: "6px 28px 6px 30px",
                fontSize: "0.82rem",
                borderRadius: "8px"
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: 0
                }}
                type="button"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lista de Alquileres */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" }}>
        {filteredRentals.length === 0 ? (
          <div className="glass-panel" style={{ gridColumn: "1 / -1", padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            <Armchair size={48} style={{ opacity: 0.3, margin: "0 auto 12px" }} />
            <h3>No se encontraron registros de alquiler en esta sección</h3>
          </div>
        ) : (
          filteredRentals.map(rental => {
            const alertInfo = getRentalAlertInfo(rental);
            const startDate = new Date(rental.fechaInicio);

            return (
              <div 
                key={rental.id}
                className="glass-panel glow-card"
                style={{
                  padding: "20px",
                  overflow: "hidden",
                  borderLeft: `5px solid ${
                    alertInfo.status === "vencido" ? "var(--neon-rose)" :
                    alertInfo.status === "por_vencer" ? "var(--neon-amber)" :
                    alertInfo.status === "devuelto" ? "var(--neon-emerald)" : "var(--neon-blue)"
                  }`,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}
              >
                <div>
                  {/* Encabezado de la Tarjeta */}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "10px",
                    flexWrap: "wrap",
                    marginBottom: "10px"
                  }}>
                    <div style={{ minWidth: "120px", flex: "1 1 auto" }}>
                      <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-main)", margin: 0, wordBreak: "break-word" }}>
                        {rental.clienteNombre || "Cliente"}
                      </h3>
                      <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px", margin: "4px 0 0" }}>
                        <Phone size={13} /> {rental.clienteTelefono || "Sin teléfono"}
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {Number(rental.saldoPendiente || 0) > 0 && rental.estado !== "devuelto" && (
                        <span className="badge badge-red" style={{ fontSize: "0.72rem", padding: "4px 8px", fontWeight: 800 }}>
                          🔴 Debe: ${Number(rental.saldoPendiente).toLocaleString("es-CO")}
                        </span>
                      )}
                      {Number(rental.abono || 0) === 0 && Number(rental.deposito || 0) > 0 && rental.depositoEstado === "cobrado" && rental.estado !== "devuelto" && (
                        <span className="badge badge-amber" style={{ fontSize: "0.7rem", padding: "3px 6px" }}>
                          🔒 Solo Depósito Dejado
                        </span>
                      )}
                      <span className={`badge ${alertInfo.color}`} style={{
                        fontSize: "0.72rem",
                        padding: "4px 8px",
                        whiteSpace: "nowrap",
                        flexShrink: 0
                      }}>
                        {alertInfo.status === "vencido" && <AlertTriangle size={12} />}
                        {alertInfo.badgeText || alertInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* Banner Alerta de Retraso de 24h (se ajusta al 100% del contenedor sin desbordarse) */}
                  {alertInfo.status === "vencido" && (
                    <div style={{
                      background: "rgba(244, 63, 94, 0.12)",
                      border: "1px solid rgba(244, 63, 94, 0.35)",
                      borderRadius: "10px",
                      padding: "8px 12px",
                      marginBottom: "14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: "#f87171",
                      fontSize: "0.8rem",
                      lineHeight: "1.35",
                      boxShadow: "0 2px 8px rgba(244, 63, 94, 0.08)"
                    }}>
                      <AlertTriangle size={16} style={{ flexShrink: 0, color: "var(--neon-rose, #f43f5e)", marginTop: "2px", alignSelf: "flex-start" }} />
                      <div style={{ wordBreak: "break-word", overflowWrap: "anywhere", flex: 1, minWidth: 0, display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "4px" }}>
                        <strong style={{ color: "var(--neon-rose, #f43f5e)", letterSpacing: "0.2px" }}>
                          ¡ALERTA 24H VENCIDA!
                        </strong>
                        <span style={{ color: "var(--text-main)", fontWeight: 600, fontSize: "0.78rem" }}>
                          (+{alertInfo.extraHours}h {alertInfo.elapsedMinutes}m de retraso)
                        </span>
                      </div>
                    </div>
                  )}

                  {alertInfo.status === "por_vencer" && (
                    <div style={{
                      background: "rgba(245, 158, 11, 0.1)",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                      borderRadius: "10px",
                      padding: "8px 12px",
                      marginBottom: "14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: "var(--neon-amber, #fbbf24)",
                      fontSize: "0.8rem",
                      lineHeight: "1.3"
                    }}>
                      <Clock size={15} style={{ flexShrink: 0 }} />
                      <div style={{ wordBreak: "break-word", flex: 1 }}>
                        <strong>Por vencer:</strong> Quedan {alertInfo.remainingHours}h para cumplir el plazo de 24h.
                      </div>
                    </div>
                  )}

                  {/* Detalle de sillas y valores */}
                  <div style={{
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-color)",
                    padding: "14px",
                    borderRadius: "var(--radius-sm)",
                    marginBottom: "14px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    fontSize: "0.85rem"
                  }}>
                    <div>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.4px" }}>Artículo:</span>
                      <div style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.92rem", marginTop: "2px" }}>{rental.item}</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.4px" }}>Cantidad:</span>
                      <div style={{ fontWeight: 800, color: "var(--neon-blue)", fontSize: "1rem", marginTop: "2px" }}>{rental.cantidad} Unidades</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.4px" }}>Valor Alquiler:</span>
                      <div className="price-tag" style={{ color: "var(--neon-emerald)", fontWeight: 800, fontSize: "0.95rem", marginTop: "2px" }}>${Number(rental.precioTotal).toLocaleString()} COP</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.4px" }}>Depósito Garantía:</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "2px" }}>
                        <span className="price-tag" style={{ color: "var(--neon-amber)", fontWeight: 800, fontSize: "0.95rem" }}>
                          ${Number(rental.deposito || 0).toLocaleString()} COP
                        </span>
                        {rental.estado === "devuelto" ? (
                          Number(rental.depositoMontoRetenido || 0) > 0 ? (
                            <span className="badge badge-red" style={{ fontSize: "0.7rem", padding: "2px 6px" }}>
                              ⚠️ Retenido ${Number(rental.depositoMontoRetenido).toLocaleString()}
                            </span>
                          ) : (
                            <span className="badge badge-green" style={{ fontSize: "0.7rem", padding: "2px 6px" }}>
                              ✅ Devuelto
                            </span>
                          )
                        ) : rental.depositoEstado === "pendiente_entrega" ? (
                          <span className="badge badge-amber" style={{ fontSize: "0.7rem", padding: "2px 6px" }}>
                            ⏳ Cobrar al entregar
                          </span>
                        ) : (
                          <span className="badge badge-blue" style={{ fontSize: "0.7rem", padding: "2px 6px" }}>
                            🔒 En custodia
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Desglose de Abono y Saldo en caso de apartado */}
                    {(rental.abono !== undefined || rental.saldoPendiente !== undefined) && (
                      <>
                        <div>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.4px" }}>Abonado:</span>
                          <div style={{ color: "#34d399", fontWeight: 800, fontSize: "0.92rem", marginTop: "2px" }}>
                            ${Number(rental.abono || 0).toLocaleString()} COP
                          </div>
                        </div>
                        <div>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.4px" }}>Saldo Pendiente:</span>
                          <div style={{ color: Number(rental.saldoPendiente || 0) > 0 ? "#f87171" : "#10b981", fontWeight: 800, fontSize: "0.92rem", marginTop: "2px" }}>
                            ${Number(rental.saldoPendiente || 0).toLocaleString()} COP
                          </div>
                        </div>
                      </>
                    )}
                    {rental.fechaEvento && (
                      <div style={{ gridColumn: "1 / -1", background: "rgba(16, 185, 129, 0.1)", padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
                        <span style={{ color: "#34d399", fontSize: "0.76rem", fontWeight: 700 }}>📅 FECHA EVENTO PACTADA: </span>
                        <strong style={{ color: "var(--text-main)" }}>
                          {new Date(rental.fechaEvento + (rental.horaEvento ? `T${rental.horaEvento}` : "T12:00:00")).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "long" })}
                          {rental.horaEvento ? ` a las ${rental.horaEvento}` : ""}
                        </strong>
                      </div>
                    )}
                    {rental.clienteDireccion && (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.4px" }}>📍 Dirección:</span>
                        <div style={{ fontWeight: 600, color: "var(--text-main)", fontSize: "0.88rem", marginTop: "2px" }}>{rental.clienteDireccion}</div>
                      </div>
                    )}
                    {rental.metodoPago && (
                      <div>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.4px" }}>Pago:</span>
                        <div style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.88rem", marginTop: "2px" }}>{rental.metodoPago}</div>
                      </div>
                    )}
                    {(rental.comprobanteUrl || rental.comprobanteSaldoUrl) && (
                      <div style={{ gridColumn: "1 / -1", marginTop: "4px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {rental.comprobanteUrl && (
                          <button
                            type="button"
                            onClick={() => setViewingEvidenceModal({
                              url: rental.comprobanteUrl,
                              title: `Comprobante de ${rental.metodoPago || "Transferencia"}`,
                              client: rental.clienteNombre
                            })}
                            className="btn"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "4px 10px",
                              fontSize: "0.76rem",
                              borderRadius: "8px",
                              background: "rgba(16, 185, 129, 0.12)",
                              border: "1px solid rgba(16, 185, 129, 0.35)",
                              color: "#34d399",
                              fontWeight: 700,
                              cursor: "pointer"
                            }}
                          >
                            <Eye size={13} />
                            <span>📸 Ver Comprobante</span>
                          </button>
                        )}
                        {rental.comprobanteSaldoUrl && (
                          <button
                            type="button"
                            onClick={() => setViewingEvidenceModal({
                              url: rental.comprobanteSaldoUrl,
                              title: "Comprobante de Saldo Restante",
                              client: rental.clienteNombre
                            })}
                            className="btn"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "4px 10px",
                              fontSize: "0.76rem",
                              borderRadius: "8px",
                              background: "rgba(59, 130, 246, 0.12)",
                              border: "1px solid rgba(59, 130, 246, 0.35)",
                              color: "#60a5fa",
                              fontWeight: 700,
                              cursor: "pointer"
                            }}
                          >
                            <Eye size={13} />
                            <span>📸 Ver Comprobante de Saldo</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Cronómetro y fechas */}
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "4px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Calendar size={14} /> Salida: {startDate.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                    {alertInfo.elapsedText && (
                      <div style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "6px", 
                        fontWeight: 700,
                        color: alertInfo.status === "vencido" ? "var(--accent-rose)" : "inherit"
                      }}>
                        <Clock size={14} /> Tiempo transcurrido: {alertInfo.elapsedText}
                      </div>
                    )}
                    {rental.observaciones && (
                      <div style={{ fontStyle: "italic", marginTop: "4px", color: "var(--text-dim)" }}>
                        Nota: "{rental.observaciones}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones de la Tarjeta */}
                <div style={{ display: "flex", gap: "8px", borderTop: "1px solid var(--border-color)", paddingTop: "14px", flexWrap: "wrap" }}>
                  {/* Botón Imprimir Ticket Térmico Oficial */}
                  <button
                    onClick={() => setRentalToPrint(rental)}
                    className="btn btn-outline"
                    style={{ padding: "8px 10px", fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: "5px" }}
                    title="Imprimir Tiquete Térmico de Alquiler o Reserva"
                    type="button"
                  >
                    <Printer size={15} />
                    <span>Ticket</span>
                  </button>

                  {/* Botón Ver o Adjuntar Comprobante de Transferencia */}
                  {rental.comprobanteUrl ? (
                    <button
                      onClick={() => {
                        setRentalToAttachEvidence(rental);
                        setEvidenceToSave(rental.comprobanteUrl);
                      }}
                      className="btn btn-outline"
                      style={{
                        padding: "8px 10px",
                        fontSize: "0.82rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        color: "#34d399",
                        borderColor: "rgba(16, 185, 129, 0.35)",
                        background: "rgba(16, 185, 129, 0.08)"
                      }}
                      title="Ver o cambiar comprobante de transferencia"
                      type="button"
                    >
                      <ImageIcon size={15} />
                      <span>Evidencia</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setRentalToAttachEvidence(rental);
                        setEvidenceToSave(null);
                      }}
                      className="btn btn-outline"
                      style={{
                        padding: "8px 10px",
                        fontSize: "0.82rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        color: "var(--neon-blue)",
                        borderColor: "rgba(59, 130, 246, 0.3)"
                      }}
                      title="Adjuntar comprobante de transferencia o depósito"
                      type="button"
                    >
                      <Paperclip size={15} />
                      <span>+ Evidencia</span>
                    </button>
                  )}

                  {/* Si es reserva o tiene saldo pendiente, botón de cobrar saldo y entregar */}
                  {Number(rental.saldoPendiente || 0) > 0 && rental.estado !== "devuelto" && (
                    <button
                      onClick={() => {
                        setRentalToPayBalance(rental);
                        setBalancePayMethod("Efectivo");
                        setBalanceCashReceived("");
                        setBalanceComprobanteUrl(null);
                      }}
                      className="btn btn-primary"
                      style={{
                        padding: "8px 12px",
                        fontSize: "0.82rem",
                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        fontWeight: 700
                      }}
                      title="Cobrar el saldo restante y entregar las sillas"
                      type="button"
                    >
                      <DollarSign size={15} />
                      <span>Cobrar Saldo (${Number(rental.saldoPendiente).toLocaleString()})</span>
                    </button>
                  )}

                  {rental.estado !== "devuelto" ? (
                    <>
                      {/* Botón WhatsApp */}
                      <button
                        onClick={() => handleOpenWhatsApp(rental, alertInfo)}
                        className="btn btn-whatsapp"
                        style={{ flex: 1, minWidth: "100px", padding: "8px 12px", fontSize: "0.85rem" }}
                        title="Enviar recordatorio por WhatsApp"
                        type="button"
                      >
                        <MessageCircle size={16} />
                        <span>Avisar</span>
                      </button>

                      {/* Botón Editar / Ver Detalle */}
                      <button
                        onClick={() => handleOpenEdit(rental)}
                        className="btn btn-outline"
                        style={{ padding: "8px 10px", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "5px" }}
                        title="Editar o modificar los datos de este alquiler"
                        type="button"
                      >
                        <Edit3 size={15} />
                        <span>Editar</span>
                      </button>

                      {/* Botón Marcar Devuelto con Inspección y Liquidación de Depósito */}
                      <button
                        onClick={() => handleOpenReturnInspection(rental)}
                        className="btn btn-success"
                        style={{ flex: 1, minWidth: "100px", padding: "8px 12px", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                        title="Inspeccionar mobiliario, devolver depósito o retener por rotura"
                        type="button"
                      >
                        <RotateCcw size={16} />
                        <span>Devuelto</span>
                      </button>
                    </>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: "8px", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#34d399", fontWeight: 700, fontSize: "0.82rem" }}>
                        <CheckCircle size={15} /> Devuelto al inventario
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <button
                          onClick={() => handleOpenEdit(rental)}
                          className="btn btn-outline"
                          style={{
                            padding: "5px 10px",
                            fontSize: "0.78rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px"
                          }}
                          title="Ver o editar datos de este alquiler"
                          type="button"
                        >
                          <Edit3 size={14} />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => setRentalToDelete(rental)}
                          className="btn btn-outline"
                          style={{
                            padding: "5px 8px",
                            fontSize: "0.74rem",
                            color: "var(--neon-rose, #f43f5e)",
                            borderColor: "rgba(244, 63, 94, 0.25)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                          title="Eliminar este registro individual del historial"
                          type="button"
                        >
                          <Trash2 size={13} />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL REGISTRAR NUEVO ALQUILER */}
      {isNewRentalModalOpen && (
        <div className="modal-overlay" onClick={() => setIsNewRentalModalOpen(false)}>
          <div
            className="modal-content modal-card"
            style={{
              maxWidth: "600px",
              width: "94%",
              background: "var(--bg-secondary, #111827)",
              border: "1px solid var(--border-strong)",
              borderRadius: "20px",
              padding: "26px",
              boxShadow: "0 25px 65px -10px rgba(0,0,0,0.8)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "8px" }}>
                <Armchair size={24} color="var(--neon-indigo, #4f46e5)" />
                Registrar Alquiler de Sillas / Mesas
              </h2>
              <button onClick={() => setIsNewRentalModalOpen(false)} className="btn btn-outline" style={{ padding: "6px 12px" }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitNewRental} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                    Nombre del Cliente *:
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="Ej: Claudia Martínez"
                    value={formData.clienteNombre}
                    onChange={(e) => setFormData({ ...formData, clienteNombre: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                    Teléfono / WhatsApp *:
                  </label>
                  <input
                    type="tel"
                    required
                    className="input-field"
                    placeholder="Ej: 3124567890"
                    value={formData.clienteTelefono}
                    onChange={(e) => setFormData({ ...formData, clienteTelefono: e.target.value })}
                  />
                </div>
              </div>

              {/* Dirección + Método de Pago */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                    📍 Dirección del Evento / Cliente *:
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="Ej: Calle 10 #5-30, Barrio El Centro"
                    value={formData.clienteDireccion}
                    onChange={(e) => setFormData({ ...formData, clienteDireccion: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                    💳 Método de Pago:
                  </label>
                  <select
                    className="input-field"
                    value={formData.metodoPago}
                    onChange={(e) => setFormData({ ...formData, metodoPago: e.target.value })}
                  >
                    <option value="Efectivo">💵 Efectivo</option>
                    <option value="Nequi">📲 Nequi</option>
                    <option value="Daviplata">📲 Daviplata</option>
                    <option value="Transferencia">🏦 Transferencia</option>
                    <option value="Fiado">📋 Fiado</option>
                  </select>
                </div>
              </div>

              {/* Selector tipo + cantidades sillas y mesas */}
              <div>
                <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                  Tipo de Alquiler:
                </label>
                <select
                  className="input-field"
                  value={formData.item}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({
                      ...formData,
                      item: val,
                      cantidadSillas: val === "Mesas" ? 0 : (formData.cantidadSillas || formData.cantidad || 10),
                      cantidadMesas: val === "Sillas" ? 0 : (formData.cantidadMesas || 1),
                      precioUnitario: val === "Mesas" ? 10000 : 1500,
                      cantidad: val === "Mesas" ? (formData.cantidadMesas || 1) : (formData.cantidadSillas || formData.cantidad || 10)
                    });
                  }}
                >
                  <option value="Sillas">🪑 Solo Sillas ($1.500 c/u)</option>
                  <option value="Mesas">🪑 Solo Mesas ($10.000 c/u)</option>
                  <option value="Sillas y Mesas">🪑 Sillas y Mesas (precio por unidad)</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: formData.item === "Sillas y Mesas" ? "1fr 1fr" : "1fr", gap: "14px" }}>
                {(formData.item === "Sillas" || formData.item === "Sillas y Mesas") && (
                  <div>
                    <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                      🪑 Cantidad de Sillas *:
                    </label>
                    <input
                      type="number" min="0" required className="input-field"
                      value={formData.cantidadSillas ?? formData.cantidad ?? 10}
                      onChange={(e) => setFormData({ ...formData, cantidadSillas: parseInt(e.target.value) || 0, cantidad: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                )}
                {(formData.item === "Mesas" || formData.item === "Sillas y Mesas") && (
                  <div>
                    <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                      🪑 Cantidad de Mesas *:
                    </label>
                    <input
                      type="number" min="0" className="input-field"
                      value={formData.cantidadMesas ?? 1}
                      onChange={(e) => setFormData({ ...formData, cantidadMesas: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                    Precio Unitario ($):
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={formData.precioUnitario}
                    onChange={(e) => setFormData({ ...formData, precioUnitario: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                    Depósito en Garantía ($):
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={formData.deposito}
                    onChange={(e) => setFormData({ ...formData, deposito: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                  Plazo de Alerta:
                </label>
                <div style={{
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(59, 130, 246, 0.15)",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  fontSize: "0.85rem",
                  color: "#93c5fd",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <Info size={16} />
                  <span>El sistema activará la alerta automática exactamente <strong>24 horas después</strong> de registrar la salida.</span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                  Observaciones / Dirección del evento:
                </label>
                <textarea
                  className="input-field"
                  rows="2"
                  placeholder="Ej: Barrio San Francisco, cumpleaños hasta las 11pm"
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                ></textarea>
              </div>

              {/* Total Calculado */}
              <div style={{
                background: "rgba(0, 0, 0, 0.3)",
                padding: "14px",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <span style={{ fontWeight: 700 }}>Total Alquiler a Cobrar:</span>
                <span className="price-tag" style={{ fontSize: "1.3rem", color: "#34d399" }}>
                  ${(
                    (formData.item === "Sillas y Mesas")
                      ? ((formData.cantidadSillas || 0) * 1500 + (formData.cantidadMesas || 0) * 10000)
                      : (formData.item === "Mesas")
                        ? ((formData.cantidadMesas || 0) * (formData.precioUnitario || 10000))
                        : ((formData.cantidadSillas ?? formData.cantidad ?? 0) * (formData.precioUnitario || 1500))
                  ).toLocaleString()} COP
                </span>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setIsNewRentalModalOpen(false)}
                  className="btn btn-outline"
                  style={{ flex: 1, padding: "12px" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2, padding: "12px", fontSize: "1rem" }}
                >
                  Registrar Salida y Activar Alerta 24h
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL LIMPIAR REGISTROS DEVUELTOS */}
      {isClearModalOpen && (
        <div className="modal-overlay" onClick={() => setIsClearModalOpen(false)}>
          <div
            className="modal-content modal-card"
            style={{
              maxWidth: "520px",
              width: "92%",
              background: "var(--bg-secondary, #111827)",
              border: "1px solid var(--border-strong)",
              borderRadius: "18px",
              padding: "24px",
              boxShadow: "0 25px 65px -10px rgba(0,0,0,0.85)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  background: "rgba(244, 63, 94, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--neon-rose, #f43f5e)"
                }}>
                  <Trash2 size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                    Limpiar Historial de Alquileres
                  </h3>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "3px 0 0" }}>
                    Mantén organizado el sistema depurando registros ya finalizados
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsClearModalOpen(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            {/* Aviso de Seguridad */}
            <div style={{
              background: "rgba(59, 130, 246, 0.1)",
              border: "1px solid rgba(59, 130, 246, 0.25)",
              borderRadius: "10px",
              padding: "12px 14px",
              marginBottom: "18px",
              fontSize: "0.82rem",
              lineHeight: "1.4",
              color: "#93c5fd",
              display: "flex",
              alignItems: "flex-start",
              gap: "8px"
            }}>
              <Info size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong>Protección de seguridad:</strong> Solo se eliminarán los registros que ya fueron <strong>devueltos</strong> y cuyo stock ya reingresó a la tienda. Los alquileres activos o con alertas pendientes <strong>NUNCA</strong> serán borrados.
              </div>
            </div>

            {/* Opciones de Limpieza */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "22px" }}>
              <label style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 14px",
                borderRadius: "10px",
                border: clearOption === "all" ? "1.5px solid var(--neon-indigo, #6366f1)" : "1px solid var(--border-color)",
                background: clearOption === "all" ? "rgba(99, 102, 241, 0.1)" : "rgba(255,255,255,0.02)",
                cursor: "pointer"
              }}>
                <input
                  type="radio"
                  name="clearOption"
                  value="all"
                  checked={clearOption === "all"}
                  onChange={() => setClearOption("all")}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-main)" }}>
                    Eliminar TODOS los devueltos
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Se borrarán los {returnedCount} registros devueltos actualmente en el historial.
                  </div>
                </div>
              </label>

              <label style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 14px",
                borderRadius: "10px",
                border: clearOption === "older7" ? "1.5px solid var(--neon-indigo, #6366f1)" : "1px solid var(--border-color)",
                background: clearOption === "older7" ? "rgba(99, 102, 241, 0.1)" : "rgba(255,255,255,0.02)",
                cursor: "pointer"
              }}>
                <input
                  type="radio"
                  name="clearOption"
                  value="older7"
                  checked={clearOption === "older7"}
                  onChange={() => setClearOption("older7")}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-main)" }}>
                    Devueltos con más de 7 días de antigüedad
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Se borrarán {returnedOlder7Count} registros con más de una semana de devueltos.
                  </div>
                </div>
              </label>

              <label style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 14px",
                borderRadius: "10px",
                border: clearOption === "older30" ? "1.5px solid var(--neon-indigo, #6366f1)" : "1px solid var(--border-color)",
                background: clearOption === "older30" ? "rgba(99, 102, 241, 0.1)" : "rgba(255,255,255,0.02)",
                cursor: "pointer"
              }}>
                <input
                  type="radio"
                  name="clearOption"
                  value="older30"
                  checked={clearOption === "older30"}
                  onChange={() => setClearOption("older30")}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-main)" }}>
                    Devueltos con más de 30 días (Mes anterior)
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Se borrarán {returnedOlder30Count} registros con más de un mes de devueltos.
                  </div>
                </div>
              </label>
            </div>

            {/* Botones de Acción */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="btn btn-outline"
                style={{ padding: "9px 16px" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteClear}
                className="btn btn-danger"
                style={{ padding: "9px 18px", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Trash2 size={16} />
                <span>Confirmar y Limpiar Historial</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINACIÓN INDIVIDUAL */}
      {rentalToDelete && (
        <div className="modal-overlay" onClick={() => setRentalToDelete(null)}>
          <div
            className="modal-content modal-card"
            style={{
              maxWidth: "440px",
              width: "90%",
              background: "var(--bg-secondary, #111827)",
              border: "1px solid var(--border-strong)",
              borderRadius: "16px",
              padding: "22px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.8)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "8px" }}>
              ¿Eliminar registro de alquiler?
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.4", marginBottom: "18px" }}>
              ¿Deseas eliminar permanentemente del historial el registro de <strong>{rentalToDelete.clienteNombre}</strong> ({rentalToDelete.cantidad} {rentalToDelete.item})?
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setRentalToDelete(null)}
                className="btn btn-outline"
                style={{ padding: "8px 14px", fontSize: "0.85rem" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSingle}
                className="btn btn-danger"
                style={{ padding: "8px 16px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Trash2 size={15} />
                <span>Sí, Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR Y ACTUALIZAR REGISTRO DE ALQUILER */}
      {editingRental && editFormData && (
        <div className="modal-overlay" onClick={() => { setEditingRental(null); setEditFormData(null); }}>
          <div
            className="modal-content modal-card"
            style={{
              maxWidth: "680px",
              width: "95%",
              background: "var(--bg-secondary, #111827)",
              border: "1px solid var(--border-strong)",
              borderRadius: "18px",
              padding: "26px",
              boxShadow: "0 24px 60px rgba(0,0,0,0.85)",
              maxHeight: "90vh",
              overflowY: "auto"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Modal */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  background: "rgba(99, 102, 241, 0.15)",
                  color: "var(--neon-indigo, #6366f1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Edit3 size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                    Editar Registro de Alquiler
                  </h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "2px 0 0" }}>
                    ID: <span className="font-mono">{editingRental.id}</span> · Modifica y actualiza los datos en tiempo real
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setEditingRental(null); setEditFormData(null); }}
                className="btn btn-outline"
                style={{ padding: "6px", borderRadius: "50%" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Formulario de Edición */}
            <form onSubmit={handleSaveEdit}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px", marginBottom: "18px" }}>
                {/* Nombre del Cliente */}
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px" }}>
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.clienteNombre}
                    onChange={(e) => setEditFormData({ ...editFormData, clienteNombre: e.target.value })}
                    className="input-field"
                    placeholder="Ej. Juan Pérez"
                    style={{ width: "100%" }}
                  />
                </div>

                {/* Teléfono */}
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px" }}>
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={editFormData.clienteTelefono}
                    onChange={(e) => setEditFormData({ ...editFormData, clienteTelefono: e.target.value })}
                    className="input-field"
                    placeholder="Ej. 3123456789"
                    style={{ width: "100%" }}
                  />
                </div>

                {/* Artículo Alquilado */}
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px" }}>
                    Artículo / Mobiliario
                  </label>
                  <input
                    type="text"
                    value={editFormData.item}
                    onChange={(e) => setEditFormData({ ...editFormData, item: e.target.value })}
                    className="input-field"
                    placeholder="Ej. Sillas Alquiler"
                    style={{ width: "100%" }}
                  />
                </div>

                {/* Cantidad */}
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px" }}>
                    Cantidad de Unidades
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editFormData.cantidad}
                    onChange={(e) => setEditFormData({ ...editFormData, cantidad: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="input-field"
                    style={{ width: "100%" }}
                  />
                </div>

                {/* Precio Unitario */}
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px" }}>
                    Precio Unitario (COP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={editFormData.precioUnitario}
                    onChange={(e) => setEditFormData({ ...editFormData, precioUnitario: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="input-field"
                    style={{ width: "100%" }}
                  />
                </div>

                {/* Depósito / Garantía */}
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px" }}>
                    Depósito en Garantía (COP)
                  </label>
                  <MathPriceInput
                      value={editFormData.deposito}
                      onChange={(val) => setEditFormData({ ...editFormData, deposito: val })}
                      placeholder="Ej: 30000"
                      className="input-field"
                      style={{ flex: 1 }}
                      min={0}
                    />
                </div>

                {/* Duración en Horas */}
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px" }}>
                    Plazo de Alquiler (Horas)
                  </label>
                  <select
                    value={editFormData.duracionHoras}
                    onChange={(e) => setEditFormData({ ...editFormData, duracionHoras: parseInt(e.target.value) || 24 })}
                    className="input-field"
                    style={{ width: "100%" }}
                  >
                    <option value={12}>12 Horas (Medio día)</option>
                    <option value={24}>24 Horas (1 Día estándar)</option>
                    <option value={48}>48 Horas (2 Días)</option>
                    <option value={72}>72 Horas (3 Días - Fin de semana)</option>
                    <option value={168}>168 Horas (1 Semana completa)</option>
                  </select>
                </div>

                {/* Estado del Alquiler */}
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px" }}>
                    Estado del Registro
                  </label>
                  <select
                    value={editFormData.estado}
                    onChange={(e) => setEditFormData({ ...editFormData, estado: e.target.value })}
                    className="input-field"
                    style={{
                      width: "100%",
                      fontWeight: 700,
                      color: editFormData.estado === "devuelto" ? "#34d399" : "#60a5fa"
                    }}
                  >
                    <option value="activo">🟡 Activo / En Curso (En manos del cliente)</option>
                    <option value="devuelto">🟢 Devuelto (Reintegrado al inventario)</option>
                  </select>
                </div>
              </div>

              {/* Fecha y Hora de Inicio */}
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px" }}>
                  Fecha y Hora de Entrega / Inicio
                </label>
                <input
                  type="datetime-local"
                  value={editFormData.fechaInicio}
                  onChange={(e) => setEditFormData({ ...editFormData, fechaInicio: e.target.value })}
                  className="input-field"
                  style={{ width: "100%" }}
                />
              </div>

              {/* Observaciones */}
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px" }}>
                  Observaciones / Notas Adicionales
                </label>
                <textarea
                  value={editFormData.observaciones}
                  onChange={(e) => setEditFormData({ ...editFormData, observaciones: e.target.value })}
                  className="input-field"
                  rows="3"
                  placeholder="Ej. Dejó cédula física en garantía, canceló 50% por adelantado..."
                  style={{ width: "100%", resize: "vertical" }}
                />
              </div>

              {/* Cuadro Resumen Económico */}
              <div style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border-color)",
                borderRadius: "12px",
                padding: "14px 18px",
                marginBottom: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px"
              }}>
                <div>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block" }}>
                    Cálculo Total Alquiler:
                  </span>
                  <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--accent-blue, #60a5fa)" }}>
                    ${((Number(editFormData.cantidad) || 1) * (Number(editFormData.precioUnitario) || 0)).toLocaleString("es-CO")} COP
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block" }}>
                    Depósito en Garantía:
                  </span>
                  <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--neon-emerald, #34d399)" }}>
                    ${(Number(editFormData.deposito) || 0).toLocaleString("es-CO")} COP
                  </span>
                </div>
              </div>

              {/* Botones de Guardar y Cancelar */}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => { setEditingRental(null); setEditFormData(null); }}
                  className="btn btn-outline"
                  style={{ padding: "10px 18px", fontSize: "0.9rem" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: "10px 22px", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <Save size={17} />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL UNIFICADO PARA NUEVO ALQUILER Y APARTADOS DE DICIEMBRE ── */}
      <RentalOrderModal
        isOpen={isNewRentalModalOpen}
        onClose={() => setIsNewRentalModalOpen(false)}
        clients={clients}
        products={products}
        rentals={rentals}
        activeShift={activeShift}
        currentUser={currentUser}
        onSaveRental={onSaveRental}
        onCompleteSale={onCompleteSale}
        onPrintTicket={(savedRental) => setRentalToPrint(savedRental)}
      />

      {/* ── MODAL COBRAR SALDO PENDIENTE Y ENTREGAR MOBILIARIO ── */}
      {rentalToPayBalance && (
        <div className="modal-overlay" onClick={() => setRentalToPayBalance(null)} style={{ zIndex: 1220 }}>
          <div
            className="modal-content modal-card"
            style={{
              maxWidth: "460px",
              width: "94%",
              padding: "24px",
              background: "var(--bg-secondary, #111827)",
              border: "1px solid var(--border-strong)",
              borderRadius: "20px",
              boxShadow: "0 25px 65px -10px rgba(0,0,0,0.85)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-main)" }}>
                Cobrar Saldo y Entregar Mobiliario
              </h3>
              <button onClick={() => setRentalToPayBalance(null)} className="btn btn-outline" style={{ padding: "4px 8px" }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "12px", border: "1px solid var(--border-color)", marginBottom: "16px" }}>
              <div><strong>Cliente:</strong> {rentalToPayBalance.clienteNombre}</div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>
                Elemento: {rentalToPayBalance.item} ({rentalToPayBalance.cantidad} unds)
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px", fontSize: "0.9rem" }}>
                <span>Total Alquiler:</span>
                <strong>${Number(rentalToPayBalance.precioTotal || 0).toLocaleString()} COP</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "0.9rem", color: "#34d399" }}>
                <span>Abono anterior:</span>
                <strong>${Number(rentalToPayBalance.abono || 0).toLocaleString()} COP</strong>
              </div>
              {rentalToPayBalance.depositoEstado === "pendiente_entrega" && Number(rentalToPayBalance.deposito || 0) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "0.9rem", color: "var(--neon-amber)" }}>
                  <span>🔒 Depósito en Garantía (Custodia):</span>
                  <strong>+${Number(rentalToPayBalance.deposito).toLocaleString()} COP</strong>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed var(--border-color)", fontSize: "1.15rem", fontWeight: 800, color: "#f87171" }}>
                <span>TOTAL A COBRAR HOY:</span>
                <span>
                  ${(
                    Number(rentalToPayBalance.saldoPendiente || 0) + 
                    (rentalToPayBalance.depositoEstado === "pendiente_entrega" ? Number(rentalToPayBalance.deposito || 0) : 0)
                  ).toLocaleString()} COP
                </span>
              </div>
              {rentalToPayBalance.depositoEstado === "pendiente_entrega" && Number(rentalToPayBalance.deposito || 0) > 0 && (
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px", fontStyle: "italic" }}>
                  * Incluye saldo de alquiler y los $30.000 COP de depósito de garantía que se devolverán al recibir las sillas en buen estado.
                </div>
              )}
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                Método de Pago para el Saldo:
              </label>
              <select
                className="input-field"
                value={balancePayMethod}
                onChange={(e) => setBalancePayMethod(e.target.value)}
              >
                <option value="Efectivo">💵 Efectivo</option>
                <option value="Nequi">📲 Nequi</option>
                <option value="Daviplata">📲 Daviplata</option>
                <option value="Transferencia">🏦 Transferencia</option>
              </select>
            </div>

            {/* Subir comprobante del saldo si pagan por transferencia o desean adjuntarlo */}
            <div style={{ marginBottom: "16px" }}>
              <PaymentEvidenceUploader
                value={balanceComprobanteUrl}
                onChange={setBalanceComprobanteUrl}
                label={`📸 Comprobante de ${balancePayMethod} (Saldo Restante)`}
                helperText="Captura de la transferencia del saldo y/o entrega"
              />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setRentalToPayBalance(null)}
                className="btn btn-outline"
                style={{ flex: 1, padding: "10px" }}
                disabled={isBalanceSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (isBalanceSubmitting) return;
                  setIsBalanceSubmitting(true);
                  try {
                    const balanceAmount = Number(rentalToPayBalance.saldoPendiente || 0);
                    if (onPayRentalBalance) {
                      const res = await onPayRentalBalance(
                        rentalToPayBalance.id, 
                        balanceAmount, 
                        balancePayMethod,
                        balanceComprobanteUrl
                      );
                      if (res && res.updatedRental) {
                        setRentalToPrint(res.updatedRental);
                      }
                    }
                    setActionNotice(`✅ ¡Saldo de $${balanceAmount.toLocaleString()} cobrado con éxito! Sillas entregadas al cliente.`);
                    setTimeout(() => setActionNotice(""), 4500);
                    setRentalToPayBalance(null);
                  } catch (e) {
                    console.error("Error cobrando saldo:", e);
                    alert("Error cobrando saldo. Intenta de nuevo.");
                  } finally {
                    setIsBalanceSubmitting(false);
                  }
                }}
                className="btn btn-success"
                style={{ flex: 2, padding: "10px", fontSize: "0.95rem" }}
                disabled={isBalanceSubmitting}
              >
                {isBalanceSubmitting ? "Registrando..." : "Confirmar Cobro e Imprimir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL INSPECCIÓN DE MOBILIARIO Y DEVOLUCIÓN DE DEPÓSITO ── */}
      {rentalToReturnInspect && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-card" style={{ maxWidth: "480px", width: "95%" }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <RotateCcw size={18} style={{ color: "var(--neon-emerald)" }} />
                <h3 className="modal-title" style={{ fontSize: "1.05rem" }}>
                  Recepción de Mobiliario y Depósito
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRentalToReturnInspect(null)}
                className="modal-close"
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px 14px", borderRadius: "10px", border: "1px solid var(--border-color)", marginBottom: "14px", fontSize: "0.85rem" }}>
              <div><strong>Cliente:</strong> {rentalToReturnInspect.clienteNombre}</div>
              <div style={{ color: "var(--text-muted)", marginTop: "2px" }}>
                Mobiliario prestado: <strong>{rentalToReturnInspect.item}</strong> ({rentalToReturnInspect.cantidad} unds)
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", paddingTop: "6px", borderTop: "1px dashed var(--border-color)" }}>
                <span>Depósito en custodia:</span>
                <strong style={{ color: "var(--neon-amber)" }}>
                  ${Number(rentalToReturnInspect.deposito || 30000).toLocaleString()} COP
                </strong>
              </div>
            </div>

            {/* Opciones de inspección */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
              <label style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "10px",
                border: returnCondition === "perfecto" ? "2px solid #10b981" : "1px solid var(--border-color)",
                background: returnCondition === "perfecto" ? "rgba(16, 185, 129, 0.1)" : "rgba(255,255,255,0.02)",
                cursor: "pointer"
              }}>
                <input
                  type="radio"
                  name="returnCondition"
                  checked={returnCondition === "perfecto"}
                  onChange={() => setReturnCondition("perfecto")}
                  style={{ marginTop: "3px", accentColor: "#10b981" }}
                />
                <div>
                  <div style={{ fontWeight: 700, color: returnCondition === "perfecto" ? "#34d399" : "var(--text-main)", fontSize: "0.88rem" }}>
                    ✅ Todo en Buen Estado (Sin Daños)
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    Se reintegran las {rentalToReturnInspect.cantidad} unidades al inventario y se le devuelve el depósito de ${Number(rentalToReturnInspect.deposito || 30000).toLocaleString()} COP completo al cliente.
                  </div>
                </div>
              </label>

              <label style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "10px",
                border: returnCondition === "dano" ? "2px solid #f43f5e" : "1px solid var(--border-color)",
                background: returnCondition === "dano" ? "rgba(244, 63, 94, 0.1)" : "rgba(255,255,255,0.02)",
                cursor: "pointer"
              }}>
                <input
                  type="radio"
                  name="returnCondition"
                  checked={returnCondition === "dano"}
                  onChange={() => setReturnCondition("dano")}
                  style={{ marginTop: "3px", accentColor: "#f43f5e" }}
                />
                <div>
                  <div style={{ fontWeight: 700, color: returnCondition === "dano" ? "#fb7185" : "var(--text-main)", fontSize: "0.88rem" }}>
                    ⚠️ Presenta Daño o Rotura (Silla/Mesa rota)
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    Se retiene total o parcialmente el depósito para cubrir la reposición del mobiliario roto.
                  </div>
                </div>
              </label>
            </div>

            {/* Formulario de daño si seleccionó daño */}
            {returnCondition === "dano" && (
              <div style={{
                background: "rgba(244, 63, 94, 0.05)",
                border: "1px solid rgba(244, 63, 94, 0.25)",
                padding: "12px",
                borderRadius: "10px",
                marginBottom: "14px"
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "8px" }}>
                  <div>
                    <label style={{ fontSize: "0.76rem", color: "var(--text-muted)", display: "block", marginBottom: "2px" }}>
                      Sillas Rotas/Dañadas:
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={rentalToReturnInspect.cantidadSillas || rentalToReturnInspect.cantidad || 0}
                      className="input-field"
                      value={sillasDanadas}
                      onChange={(e) => setSillasDanadas(Math.max(0, parseInt(e.target.value) || 0))}
                      style={{ padding: "6px 10px", fontSize: "0.84rem" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.76rem", color: "var(--text-muted)", display: "block", marginBottom: "2px" }}>
                      Mesas Rotas/Dañadas:
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={rentalToReturnInspect.cantidadMesas || 0}
                      className="input-field"
                      value={mesasDanadas}
                      onChange={(e) => setMesasDanadas(Math.max(0, parseInt(e.target.value) || 0))}
                      style={{ padding: "6px 10px", fontSize: "0.84rem" }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "8px" }}>
                  <label style={{ fontSize: "0.76rem", color: "var(--text-muted)", display: "block", marginBottom: "2px" }}>
                    Valor a RETENER del depósito ($ COP):
                  </label>
                  <MathPriceInput
                      value={montoRetenerDeposito}
                      onChange={(val) => setMontoRetenerDeposito(Math.min(val, Number(rentalToReturnInspect.deposito || 30000)))}
                      placeholder="Ej: 10000"
                      className="input-field"
                      style={{ padding: "6px 10px", fontSize: "0.84rem" }}
                      min={0}
                      max={Number(rentalToReturnInspect.deposito || 30000)}
                    />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginTop: "4px" }}>
                    <span style={{ color: "#f87171" }}>Se queda en tienda: ${Number(montoRetenerDeposito || 0).toLocaleString()} COP</span>
                    <span style={{ color: "#34d399" }}>
                      Se devuelve al cliente: ${Math.max(0, (Number(rentalToReturnInspect.deposito || 30000) - Number(montoRetenerDeposito || 0))).toLocaleString()} COP
                    </span>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "0.76rem", color: "var(--text-muted)", display: "block", marginBottom: "2px" }}>
                    Motivo o Detalle de la Rotura:
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej: 1 silla plástica blanca rota en pata trasera"
                    value={danoObservaciones}
                    onChange={(e) => setDanoObservaciones(e.target.value)}
                    style={{ padding: "6px 10px", fontSize: "0.82rem" }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setRentalToReturnInspect(null)}
                className="btn btn-outline"
                style={{ flex: 1, padding: "10px" }}
                disabled={isReturningSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReturnWithInspection}
                className={returnCondition === "dano" ? "btn btn-danger" : "btn btn-success"}
                style={{ flex: 2, padding: "10px", fontSize: "0.92rem", fontWeight: 700 }}
                disabled={isReturningSubmitting}
              >
                {isReturningSubmitting ? "Procesando..." : returnCondition === "dano" ? "Liquidar Daño y Devolver" : "Devolver Depósito Completo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ADJUNTAR / GESTIONAR COMPROBANTE DE PAGO EN ALQUILER EXISTENTE ── */}
      {rentalToAttachEvidence && (
        <div className="modal-overlay" onClick={() => setRentalToAttachEvidence(null)} style={{ zIndex: 1240 }}>
          <div
            className="modal-content modal-card"
            style={{
              maxWidth: "500px",
              width: "95%",
              padding: "24px",
              background: "var(--bg-secondary, #111827)",
              border: "1px solid var(--border-strong)",
              borderRadius: "20px",
              boxShadow: "0 25px 65px -10px rgba(0,0,0,0.85)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <ImageIcon size={20} color="var(--neon-emerald)" />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-main)" }}>
                  Comprobante de Transferencia
                </h3>
              </div>
              <button onClick={() => setRentalToAttachEvidence(null)} className="btn btn-outline" style={{ padding: "4px 8px" }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px 14px", borderRadius: "10px", border: "1px solid var(--border-color)", marginBottom: "16px" }}>
              <div style={{ fontSize: "0.88rem" }}><strong>Cliente:</strong> {rentalToAttachEvidence.clienteNombre}</div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "4px" }}>
                Alquiler: {rentalToAttachEvidence.item} ({rentalToAttachEvidence.cantidad} unidades) · Método: {rentalToAttachEvidence.metodoPago || "Transferencia"}
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <PaymentEvidenceUploader
                value={evidenceToSave}
                onChange={setEvidenceToSave}
                label="📸 Captura de Pago o Depósito"
                helperText="Adjunta la captura de Nequi, Daviplata, Bancolombia u otra transferencia"
              />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setRentalToAttachEvidence(null)}
                className="btn btn-outline"
                style={{ flex: 1, padding: "10px" }}
                disabled={isSavingEvidence}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (isSavingEvidence) return;
                  setIsSavingEvidence(true);
                  try {
                    const updated = {
                      ...rentalToAttachEvidence,
                      comprobanteUrl: evidenceToSave || null
                    };
                    if (onSaveRental) {
                      await onSaveRental(updated);
                    }
                    setActionNotice("✅ Comprobante de transferencia actualizado con éxito.");
                    setTimeout(() => setActionNotice(""), 4000);
                    setRentalToAttachEvidence(null);
                  } catch (err) {
                    console.error("Error al guardar comprobante:", err);
                    alert("Error al guardar comprobante. Intenta de nuevo.");
                  } finally {
                    setIsSavingEvidence(false);
                  }
                }}
                className="btn btn-primary"
                style={{ flex: 2, padding: "10px", fontSize: "0.95rem" }}
                disabled={isSavingEvidence}
              >
                {isSavingEvidence ? "Guardando..." : "Guardar Comprobante"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL VISOR DE COMPROBANTE EN ALTA RESOLUCIÓN ── */}
      {viewingEvidenceModal && (
        <div
          className="modal-overlay"
          onClick={() => setViewingEvidenceModal(null)}
          style={{ zIndex: 1300, background: "rgba(0,0,0,0.88)" }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "680px",
              width: "95%",
              background: "var(--bg-secondary, #111827)",
              borderRadius: "18px",
              padding: "18px",
              border: "1px solid var(--border-strong)",
              boxShadow: "0 25px 60px rgba(0,0,0,0.9)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div>
                <h4 style={{ margin: 0, fontSize: "1.05rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <ImageIcon size={18} color="var(--neon-emerald)" />
                  {viewingEvidenceModal.title || "Comprobante de Pago"}
                </h4>
                {viewingEvidenceModal.client && (
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Cliente: <strong>{viewingEvidenceModal.client}</strong>
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setViewingEvidenceModal(null)}
                className="btn btn-outline"
                style={{ padding: "4px 8px" }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{
              maxHeight: "75vh",
              overflowY: "auto",
              borderRadius: "10px",
              background: "#000",
              textAlign: "center",
              padding: "8px"
            }}>
              <img
                src={viewingEvidenceModal.url}
                alt="Comprobante"
                style={{
                  maxWidth: "100%",
                  maxHeight: "70vh",
                  objectFit: "contain",
                  borderRadius: "8px"
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px" }}>
              <a
                href={viewingEvidenceModal.url}
                target="_blank"
                rel="noreferrer"
                download="comprobante-pago.jpg"
                className="btn btn-outline"
                style={{ fontSize: "0.82rem", padding: "6px 14px", textDecoration: "none" }}
              >
                Abrir en pestaña nueva / Descargar
              </a>
              <button
                type="button"
                onClick={() => setViewingEvidenceModal(null)}
                className="btn btn-primary"
                style={{ fontSize: "0.82rem", padding: "6px 16px" }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL TICKET TÉRMICO DE ALQUILER Y APARTADOS ── */}
      <RentalTicketModal
        rental={rentalToPrint}
        onClose={() => setRentalToPrint(null)}
        storeConfig={storeConfig}
      />
    </div>
  );
}
