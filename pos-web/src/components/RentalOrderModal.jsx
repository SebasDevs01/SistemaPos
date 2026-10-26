import React, { useState, useEffect } from "react";
import PaymentEvidenceUploader from "./PaymentEvidenceUploader";
import MathPriceInput from "./MathPriceInput";
import { 
  X, 
  Armchair, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  DollarSign, 
  Sparkles, 
  CheckCircle2, 
  Info,
  ShieldAlert,
  CalendarDays,
  Gift,
  PartyPopper,
  Flame,
  RotateCcw
} from "lucide-react";

export default function RentalOrderModal({
  isOpen,
  onClose,
  initialProduct = null,
  clients = [],
  products = [],
  rentals = [],
  activeShift = null,
  currentUser = null,
  onSaveRental,
  onCompleteSale,
  onPrintTicket,
  onAddToCartDirect = null
}) {
  if (!isOpen) return null;

  // Encontrar existencias y capacidad total fijada por el usuario en Inventario
  const chairProd = products.find(p => p.codigo === "1002" || String(p.nombre || "").toLowerCase().includes("silla"));
  const tableProd = products.find(p => p.codigo === "1001" || String(p.nombre || "").toLowerCase().includes("mesa"));
  const totalStockSillas = chairProd ? Number(chairProd.stock || 0) : 36;
  const totalStockMesas = tableProd ? Number(tableProd.stock || 0) : 2;

  // Calcular cuántas unidades están actualmente alquiladas fuera de la tienda (físicamente fuera)
  const activeRentedChairs = (rentals || [])
    .filter(r => r.estado !== "devuelto" && r.estado !== "reservado" && !r.esApartado && r.tipoOperacion !== "reserva" && (String(r.item || "").toLowerCase().includes("silla") || Number(r.cantidadSillas || 0) > 0))
    .reduce((sum, r) => sum + Number(r.cantidadSillas || (String(r.item || "").toLowerCase().includes("silla") ? r.cantidad : 0) || 0), 0);

  const activeRentedTables = (rentals || [])
    .filter(r => r.estado !== "devuelto" && r.estado !== "reservado" && !r.esApartado && r.tipoOperacion !== "reserva" && (String(r.item || "").toLowerCase().includes("mesa") || Number(r.cantidadMesas || 0) > 0))
    .reduce((sum, r) => sum + Number(r.cantidadMesas || (String(r.item || "").toLowerCase().includes("mesa") && !String(r.item || "").toLowerCase().includes("silla") ? r.cantidad : 0) || 0), 0);

  // Unidades apartadas para eventos futuros (aún en el local físicamente)
  const futureReservedChairs = (rentals || [])
    .filter(r => r.estado !== "devuelto" && (r.estado === "reservado" || r.esApartado || r.tipoOperacion === "reserva") && (String(r.item || "").toLowerCase().includes("silla") || Number(r.cantidadSillas || 0) > 0))
    .reduce((sum, r) => sum + Number(r.cantidadSillas || (String(r.item || "").toLowerCase().includes("silla") ? r.cantidad : 0) || 0), 0);

  const futureReservedTables = (rentals || [])
    .filter(r => r.estado !== "devuelto" && (r.estado === "reservado" || r.esApartado || r.tipoOperacion === "reserva") && (String(r.item || "").toLowerCase().includes("mesa") || Number(r.cantidadMesas || 0) > 0))
    .reduce((sum, r) => sum + Number(r.cantidadMesas || (String(r.item || "").toLowerCase().includes("mesa") && !String(r.item || "").toLowerCase().includes("silla") ? r.cantidad : 0) || 0), 0);

  // Próxima reserva para advertencia informativa de retorno
  const upcomingChairsReservation = (rentals || [])
    .filter(r => r.estado !== "devuelto" && (r.estado === "reservado" || r.esApartado || r.tipoOperacion === "reserva") && (String(r.item || "").toLowerCase().includes("silla") || Number(r.cantidadSillas || 0) > 0) && r.fechaEvento)
    .sort((a, b) => new Date(a.fechaEvento).getTime() - new Date(b.fechaEvento).getTime())[0];

  // Stock físico disponible en este momento en el local
  const stockFisicoSillas = Math.max(0, totalStockSillas - activeRentedChairs);
  const stockFisicoMesas = Math.max(0, totalStockMesas - activeRentedTables);

  // Stock libre considerando reservas
  const stockLibreReservasSillas = Math.max(0, totalStockSillas - activeRentedChairs - futureReservedChairs);
  const stockLibreReservasMesas = Math.max(0, totalStockMesas - activeRentedTables - futureReservedTables);

  // Determinar si el producto inicial es silla o mesa
  const initialIsTable = initialProduct && (initialProduct.codigo === "1001" || String(initialProduct.nombre || "").toLowerCase().includes("mesa"));

  const [tipoOperacion, setTipoOperacion] = useState("inmediato"); // 'inmediato' | 'reserva'

  // Para alquiler inmediato, el stock disponible es el que está físicamente en tienda
  const stockSillas = tipoOperacion === "inmediato" ? stockFisicoSillas : stockLibreReservasSillas;
  const stockMesas = tipoOperacion === "inmediato" ? stockFisicoMesas : stockLibreReservasMesas;

  const [selectedClientId, setSelectedClientId] = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [clienteDireccion, setClienteDireccion] = useState("");

  const [tipoItem, setTipoItem] = useState(initialIsTable ? "Mesas" : "Sillas");
  const [cantidadSillas, setCantidadSillas] = useState(initialIsTable ? 0 : 10);
  const [cantidadMesas, setCantidadMesas] = useState(initialIsTable ? 2 : 0);
  const [precioSilla, setPrecioSilla] = useState(chairProd?.precio || 1500);
  const [precioMesa, setPrecioMesa] = useState(tableProd?.precio || 10000);
  const [deposito, setDeposito] = useState(30000);
  const [cobrarDepositoAhora, setCobrarDepositoAhora] = useState(false);

  // Fechas especiales para reserva / apartado
  const currentYear = new Date().getFullYear();
  const [fechaEvento, setFechaEvento] = useState(`${currentYear}-12-24`);
  const [horaEvento, setHoraEvento] = useState("16:00");
  const [fechaDevolucion, setFechaDevolucion] = useState(`${currentYear}-12-26`);

  // Financiero
  const totalAlquiler = (tipoItem === "Mesas" ? 0 : cantidadSillas * precioSilla) +
                        (tipoItem === "Sillas" ? 0 : cantidadMesas * precioMesa);
  
  const [abono, setAbono] = useState(totalAlquiler);
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [comprobanteUrl, setComprobanteUrl] = useState(null);
  const [observaciones, setObservaciones] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sincronizar abono con el total si cambia la cantidad en modo inmediato
  useEffect(() => {
    if (tipoOperacion === "inmediato") {
      setAbono(totalAlquiler);
    }
  }, [totalAlquiler, tipoOperacion]);

  // Manejar selección de cliente existente
  const handleClientSelect = (clientId) => {
    setSelectedClientId(clientId);
    if (!clientId) {
      setClienteNombre("");
      setClienteTelefono("");
      setClienteDireccion("");
      return;
    }
    const c = clients.find(cl => String(cl.id) === String(clientId) || String(cl.dni) === String(clientId));
    if (c) {
      setClienteNombre(c.nombre || "");
      setClienteTelefono(c.telefono || c.celular || "");
      setClienteDireccion(c.direccion || "");
    }
  };

  // Botones de acceso rápido para fechas especiales (diciembre / festividades)
  const setQuickDate = (monthDay, returnMonthDay, label) => {
    const yr = new Date().getMonth() === 11 && parseInt(monthDay.split("-")[0]) < 12 ? currentYear + 1 : currentYear;
    setFechaEvento(`${yr}-${monthDay}`);
    setFechaDevolucion(`${yr}-${returnMonthDay}`);
    if (!observaciones.includes(label)) {
      setObservaciones(prev => prev ? `${prev} · ${label}` : label);
    }
  };

  const saldoPendiente = Math.max(0, totalAlquiler - (Number(abono) || 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!clienteNombre.trim() || !clienteTelefono.trim()) {
      alert("Por favor ingresa el nombre y teléfono del cliente.");
      return;
    }

    const cantSillasNum = tipoItem === "Mesas" ? 0 : Number(cantidadSillas || 0);
    const cantMesasNum = tipoItem === "Sillas" ? 0 : Number(cantidadMesas || 0);

    if (cantSillasNum <= 0 && cantMesasNum <= 0) {
      alert("Debes ingresar al menos una silla o una mesa para alquilar.");
      return;
    }

    if (tipoOperacion === "inmediato") {
      if (cantSillasNum > stockFisicoSillas) {
        alert(`Solo hay ${stockFisicoSillas} sillas físicamente disponibles en la tienda ahora mismo (de ${totalStockSillas} en total). Hay ${activeRentedChairs} sillas actualmente fuera de la tienda.`);
        return;
      }
      if (cantMesasNum > stockFisicoMesas) {
        alert(`Solo hay ${stockFisicoMesas} mesas físicamente disponibles en la tienda ahora mismo (de ${totalStockMesas} en total). Hay ${activeRentedTables} mesas actualmente fuera de la tienda.`);
        return;
      }
      // Si toma sillas que están apartadas para una reserva futura, avisar y confirmar retorno
      if (cantSillasNum > stockLibreReservasSillas && futureReservedChairs > 0) {
        const proxMsg = upcomingChairsReservation?.fechaEvento 
          ? `(Próxima reserva para: ${upcomingChairsReservation.fechaEvento})` 
          : "";
        const confirmOk = window.confirm(
          `⚠️ Hay sillas reservadas para eventos futuros: ${futureReservedChairs} sillas apartadas ${proxMsg}.\n\n` +
          `¿Confirmas que este cliente devolverá las ${cantSillasNum} sillas a tiempo (hoy o antes de la fecha reservada)?`
        );
        if (!confirmOk) return;
      }
    } else {
      if (cantSillasNum > stockSillas) {
        alert(`Solo quedan ${stockSillas} sillas disponibles para reservar (de ${totalStockSillas} en total).`);
        return;
      }
      if (cantMesasNum > stockMesas) {
        alert(`Solo quedan ${stockMesas} mesas disponibles para reservar (de ${totalStockMesas} en total).`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const isReserva = tipoOperacion === "reserva";
      const rentalId = `ALQ-${Date.now()}`;
      const nowIso = new Date().toISOString();

      const rentalPayload = {
        id: rentalId,
        tipoOperacion,
        esApartado: isReserva,
        clienteNombre: clienteNombre.trim(),
        clienteTelefono: clienteTelefono.trim(),
        clienteDireccion: clienteDireccion.trim() || "Entrega en local",
        item: tipoItem === "Sillas y Mesas" ? "Sillas y Mesas" : tipoItem === "Mesas" ? "Mesas" : "Sillas",
        cantidadSillas: cantSillasNum,
        cantidadMesas: cantMesasNum,
        cantidad: cantSillasNum + cantMesasNum,
        precioUnitario: tipoItem === "Mesas" ? precioMesa : precioSilla,
        precioTotal: totalAlquiler,
        abono: Number(abono) || 0,
        saldoPendiente: saldoPendiente,
        deposito: Number(deposito) || 0,
        depositoEstado: cobrarDepositoAhora ? "cobrado" : "pendiente_entrega",
        depositoMontoDevuelto: 0,
        depositoMontoRetenido: 0,
        depositoObservaciones: "",
        metodoPago: metodoPago,
        comprobanteUrl: comprobanteUrl || null,
        fechaInicio: nowIso,
        duracionHoras: isReserva ? 72 : 24,
        estado: isReserva ? "reservado" : "activo",
        fechaEvento: isReserva ? fechaEvento : null,
        horaEvento: isReserva ? horaEvento : null,
        fechaDevolucionPactada: isReserva ? fechaDevolucion : null,
        observaciones: observaciones.trim() || (isReserva ? `Apartado para fecha ${fechaEvento}` : "Alquiler de mostrador"),
        vendedor: currentUser?.nombre || "Cajero POS",
        shiftId: activeShift?.id || null,
        shiftApertura: activeShift?.fechaApertura || null
      };

      // Guardar el alquiler al instante sin congelar la interfaz
      if (onSaveRental) {
        onSaveRental(rentalPayload);
      }

      // Si tiene callback de impresión de ticket térmico, abrirlo de inmediato
      if (onPrintTicket) {
        onPrintTicket(rentalPayload);
      }

      onClose();
    } catch (err) {
      console.error("Error al registrar alquiler/apartado:", err);
      alert("Hubo un problema registrando el alquiler. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200, padding: "16px" }}>
      <div
        className="modal-content modal-card rental-order-modal-card"
        style={{
          maxWidth: "680px",
          width: "96%",
          maxHeight: "92vh",
          borderRadius: "28px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "relative"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Liquid Glass unificada tipo Nuevo Usuario */}
        <div className="ticket-modal-header" style={{ flexShrink: 0, background: "transparent" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              className="ticket-icon-box"
              style={{
                background: "rgba(168, 85, 247, 0.16)",
                border: "1px solid rgba(168, 85, 247, 0.3)",
                color: "#C084FC"
              }}
            >
              <Armchair size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.18rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                Facturación y Alquiler de Sillas
              </h3>
              <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                Salida inmediata o apartados para fechas especiales (Diciembre)
              </span>
            </div>
          </div>
          <button onClick={onClose} className="btn-modal-close-circle" title="Cerrar modal">
            <X size={16} />
          </button>
        </div>

        {/* Body con Scroll dedicado idéntico al estándar de Nuevo Usuario */}
        <div
          style={{
            padding: "20px 24px",
            overflowY: "auto",
            flex: "1 1 auto",
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}
        >

        {/* Selector de Modo: Inmediato vs Apartar / Reserva */}
        <div className="rental-mode-selector">
          <button
            type="button"
            onClick={() => setTipoOperacion("inmediato")}
            className={`rental-mode-btn ${tipoOperacion === "inmediato" ? "active-inmediato" : ""}`}
          >
            <Clock size={16} />
            <span>Alquiler Inmediato (Sale Hoy)</span>
          </button>

          <button
            type="button"
            onClick={() => setTipoOperacion("reserva")}
            className={`rental-mode-btn ${tipoOperacion === "reserva" ? "active-reserva" : ""}`}
          >
            <CalendarDays size={16} />
            <span>Apartar / Fecha Especial</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Botones rápidos de fechas especiales si está en modo reserva */}
          {tipoOperacion === "reserva" && (
            <div className="rental-special-dates-box">
              <div className="rental-special-dates-header">
                <Sparkles size={15} /> Atajos de Fechas Especiales de Diciembre:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                <button
                  type="button"
                  className="btn-special-date"
                  onClick={() => setQuickDate("12-24", "12-26", "Navidad 24 Dic")}
                >
                  <Gift size={14} className="icon-gift" />
                  <span>24 de Diciembre (Navidad)</span>
                </button>
                <button
                  type="button"
                  className="btn-special-date"
                  onClick={() => setQuickDate("12-31", "01-02", "Año Nuevo 31 Dic")}
                >
                  <PartyPopper size={14} className="icon-popper" />
                  <span>31 de Diciembre (Año Nuevo)</span>
                </button>
                <button
                  type="button"
                  className="btn-special-date"
                  onClick={() => setQuickDate("12-07", "12-08", "Día de Velitas 7 Dic")}
                >
                  <Flame size={14} className="icon-flame" />
                  <span>7 de Diciembre (Velitas)</span>
                </button>
              </div>

              {/* Selectores de Fechas exactas */}
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1.4fr", gap: "10px", marginTop: "12px" }}>
                <div>
                  <label className="rental-date-label">
                    <Calendar size={13} className="label-icon-cal" /> Fecha Evento *:
                  </label>
                  <input
                    type="date"
                    required
                    className="input-field input-date-picker"
                    value={fechaEvento}
                    onChange={(e) => setFechaEvento(e.target.value)}
                    onClick={(e) => { try { e.target.showPicker(); } catch(err){} }}
                    style={{ fontSize: "0.84rem", cursor: "pointer" }}
                  />
                </div>
                <div>
                  <label className="rental-date-label">
                    <Clock size={13} className="label-icon-clock" /> Hora Entrega:
                  </label>
                  <input
                    type="time"
                    className="input-field input-date-picker"
                    value={horaEvento}
                    onChange={(e) => setHoraEvento(e.target.value)}
                    onClick={(e) => { try { e.target.showPicker(); } catch(err){} }}
                    style={{ fontSize: "0.84rem", cursor: "pointer" }}
                  />
                </div>
                <div>
                  <label className="rental-date-label">
                    <RotateCcw size={13} className="label-icon-return" /> Fecha Devolución:
                  </label>
                  <input
                    type="date"
                    className="input-field input-date-picker"
                    value={fechaDevolucion}
                    onChange={(e) => setFechaDevolucion(e.target.value)}
                    onClick={(e) => { try { e.target.showPicker(); } catch(err){} }}
                    style={{ fontSize: "0.84rem", cursor: "pointer" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Información del Cliente */}
          <div className="rental-section-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>
                👤 Información del Cliente
              </span>
              {clients.length > 0 && (
                <select
                  value={selectedClientId}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  className="input-field rental-input-field"
                  style={{ width: "auto", padding: "3px 8px", fontSize: "0.75rem", height: "28px" }}
                >
                  <option value="">-- Cargar cliente registrado --</option>
                  {clients.map(c => (
                    <option key={c.id || c.dni} value={c.id || c.dni}>
                      {c.nombre} ({c.telefono || c.dni})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Nombre Completo *:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Claudia Martínez"
                  className="input-field rental-input-field"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Teléfono / WhatsApp *:
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ej: 3124567890"
                  className="input-field rental-input-field"
                  value={clienteTelefono}
                  onChange={(e) => setClienteTelefono(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginTop: "10px" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                📍 Dirección de Entrega / Evento *:
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Calle 10 #5-30, Barrio El Centro"
                className="input-field rental-input-field"
                value={clienteDireccion}
                onChange={(e) => setClienteDireccion(e.target.value)}
              />
            </div>
          </div>

          {/* Configuración de Sillas y Mesas */}
          <div className="rental-section-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "6px" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>
                🪑 Elementos a Alquilar
              </span>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                {tipoOperacion === "inmediato" ? "En tienda hoy: " : "Disponibles para reserva: "}
                Sillas (<strong style={{ color: stockSillas > 0 ? "#10b981" : "#ef4444" }}>{stockSillas}</strong> de {totalStockSillas}) · Mesas (<strong style={{ color: stockMesas > 0 ? "#10b981" : "#ef4444" }}>{stockMesas}</strong> de {totalStockMesas})
              </div>
            </div>

            {futureReservedChairs > 0 && tipoOperacion === "inmediato" && (
              <div className="rental-alert-notice" style={{
                marginBottom: "10px",
                padding: "8px 10px",
                borderRadius: "10px",
                fontSize: "0.76rem",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <Info size={16} style={{ flexShrink: 0, color: "#6366f1" }} />
                <span>
                  <strong>Nota de Disponibilidad:</strong> Hay <strong>{futureReservedChairs} sillas apartadas</strong> para eventos posteriores{upcomingChairsReservation?.fechaEvento ? ` (Próximo: ${upcomingChairsReservation.fechaEvento})` : ""}. Puedes alquilarlas hoy siempre que la devolución se realice antes del evento.
                </span>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Tipo:
                </label>
                <select
                  className="input-field rental-input-field"
                  value={tipoItem}
                  onChange={(e) => setTipoItem(e.target.value)}
                >
                  <option value="Sillas">🪑 Solo Sillas</option>
                  <option value="Mesas">🪑 Solo Mesas</option>
                  <option value="Sillas y Mesas">🪑 Sillas y Mesas</option>
                </select>
              </div>

              {(tipoItem === "Sillas" || tipoItem === "Sillas y Mesas") && (
                <div>
                  <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                    Cant. Sillas ($1.500 c/u):
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="input-field rental-input-field"
                    value={cantidadSillas}
                    onChange={(e) => setCantidadSillas(parseInt(e.target.value) || 0)}
                  />
                </div>
              )}

              {(tipoItem === "Mesas" || tipoItem === "Sillas y Mesas") && (
                <div>
                  <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                    Cant. Mesas ($10.000 c/u):
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="input-field rental-input-field"
                    value={cantidadMesas}
                    onChange={(e) => setCantidadMesas(parseInt(e.target.value) || 0)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Desglose Financiero: Total, Abono, Saldo y Depósito */}
          <div className="rental-financial-card">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "12px" }}>
              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span>🔒 Depósito en Garantía:</span>
                  <span style={{ fontSize: "0.74rem", color: "var(--neon-emerald, #10b981)", fontWeight: 700 }}>30.000 COP</span>
                </label>
                <MathPriceInput
                    value={deposito}
                    onChange={(val) => setDeposito(val)}
                    placeholder="30000"
                    className="input-field rental-input-field"
                    style={{ flex: 1 }}
                    min={0}
                  />
                <label style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", fontSize: "0.74rem", cursor: "pointer",
                  color: cobrarDepositoAhora ? "#10b981" : "var(--text-muted)" }}>
                  <input
                    type="checkbox"
                    checked={cobrarDepositoAhora}
                    onChange={(e) => setCobrarDepositoAhora(e.target.checked)}
                    style={{ accentColor: "var(--accent-primary)", width: "15px", height: "15px" }}
                  />
                  <span style={{ fontWeight: cobrarDepositoAhora ? 700 : 400 }}>
                    {cobrarDepositoAhora ? "✅ Depósito ya cobrado" : "Marcar depósito como cobrado"}
                  </span>
                </label>
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Método de Pago:
                </label>
                <select
                  className="input-field rental-input-field"
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                >
                  <option value="Efectivo">💵 Efectivo</option>
                  <option value="Nequi">📲 Nequi</option>
                  <option value="Daviplata">📲 Daviplata</option>
                  <option value="Transferencia">🏦 Transferencia</option>
                  <option value="Fiado">📋 Fiado / Crédito</option>
                </select>
              </div>
            </div>

            {/* Total Alquiler y Abono */}
            <div className="rental-total-banner">
              <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-main)" }}>
                Total Alquiler:
              </span>
              <span style={{ fontSize: "1.35rem", fontWeight: 900, color: "var(--neon-emerald, #10b981)" }}>
                ${totalAlquiler.toLocaleString("es-CO")} COP
              </span>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginTop: "12px"
            }}>
              <div>
                <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-main)", display: "block", marginBottom: "4px" }}>
                  💵 Dinero Cobrado Hoy (Abono):
                </label>
                <MathPriceInput
                    value={abono}
                    onChange={(val) => setAbono(val)}
                    placeholder="Ej: 1500*15 o 22500"
                    className="input-field rental-input-field"
                    style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--accent-blue, #6366f1)" }}
                    min={0}
                    max={totalAlquiler}
                  />
              </div>

              <div>
                <label style={{ fontSize: "0.82rem", fontWeight: 700, color: saldoPendiente > 0 ? "var(--neon-rose, #ef4444)" : "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  🔴 Saldo Pendiente:
                </label>
                <div className={`rental-saldo-box ${saldoPendiente > 0 ? "has-debt" : "is-paid"}`}>
                  ${saldoPendiente.toLocaleString("es-CO")} COP
                </div>
              </div>
            </div>

            {/* Accesos rápidos de Abono / Depósito */}
            <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setAbono(totalAlquiler)}
                className={`rental-quick-chip ${Number(abono) === totalAlquiler ? "active-paid" : ""}`}
              >
                ⚡ Pagar Alquiler Completo (${totalAlquiler.toLocaleString("es-CO")})
              </button>
              <button
                type="button"
                onClick={() => {
                  setAbono(0);
                  setCobrarDepositoAhora(true);
                }}
                className={`rental-quick-chip ${Number(abono) === 0 ? "active-dep" : ""}`}
              >
                🔒 Solo Dejó Depósito (Abono = $0 · Debe ${totalAlquiler.toLocaleString("es-CO")})
              </button>
            </div>

            {/* Aviso visual cuando solo dejan depósito */}
            {Number(abono) === 0 && (
              <div className="rental-warning-box">
                ℹ️ <strong>Solo depósito recibido:</strong> El cliente paga ${Number(deposito || 0).toLocaleString("es-CO")} COP de garantía. Todo el alquiler (${totalAlquiler.toLocaleString("es-CO")} COP) quedará guardado con <strong>SALDO PENDIENTE</strong> y botón de cobro listo al devolver o entregar.
              </div>
            )}
          </div>

          {/* Comprobante de Transferencia / Pago */}
          <div className="rental-section-card">
            <PaymentEvidenceUploader
              value={comprobanteUrl}
              onChange={setComprobanteUrl}
              label={
                metodoPago === "Transferencia" || metodoPago === "Nequi" || metodoPago === "Daviplata"
                  ? `📸 Captura de ${metodoPago} (Alquiler y/o Depósito)`
                  : "📸 Adjuntar Comprobante de Transferencia (Opcional)"
              }
              helperText="Sube la captura de la transferencia del alquiler y/o depósito"
            />
          </div>

          <div className="rental-section-card">
            <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px", fontWeight: 600 }}>
              📝 Observaciones / Instrucciones especiales:
            </label>
            <textarea
              className="input-field rental-input-field"
              rows="2"
              placeholder="Ej: Entregar a las 4pm en segundo piso, pagar saldo al recibir..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>

          {/* Acciones */}
          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-modal-cancel"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-modal-confirm"
              disabled={isSubmitting}
            >
              <CheckCircle2 size={18} />
              <span>
                {isSubmitting
                  ? "Procesando..."
                  : tipoOperacion === "reserva"
                    ? "Confirmar Reserva e Imprimir"
                    : "Confirmar Alquiler e Imprimir"}
              </span>
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
