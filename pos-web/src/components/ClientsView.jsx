import React, { useState } from "react";
import { 
  Users, 
  Plus, 
  Phone, 
  MapPin, 
  Search, 
  DollarSign, 
  Share2, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle,
  X,
  CreditCard,
  MessageSquare,
  Receipt,
  Printer,
  Package,
  FileText,
  ShoppingBag,
  Eye
} from "lucide-react";
import * as XLSX from "xlsx";
import MathPriceInput from "./MathPriceInput";

export default function ClientsView({ 
  clients, 
  onSaveClient, 
  storeConfig = {}, 
  onAddCashMovement,
  sales = [],
  rentals = [],
  onPrintTicket
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDebtOnly, setFilterDebtOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    dni: "",
    telefono: "",
    direccion: "",
    limiteCredito: ""
  });

  // Calcular % de uso del cupo de crédito
  const getCreditUsagePct = (c) => {
    const limit = Number(c.limiteCredito) || 0;
    if (limit <= 0) return null;
    return Math.min(100, Math.round(((Number(c.saldoDeudor) || 0) / limit) * 100));
  };

  // Enviar recordatorio respetuoso de cobro por WhatsApp
  const handleSendWhatsAppReminder = (c) => {
    if (!c || !c.telefono) {
      alert("Este cliente no tiene un número de teléfono registrado.");
      return;
    }
    const cleanPhone = String(c.telefono).replace(/\D/g, "");
    if (!cleanPhone) {
      alert("El número de teléfono registrado no es válido.");
      return;
    }
    const phoneWithCountry = cleanPhone.startsWith("57") ? cleanPhone : `57${cleanPhone}`;
    const debtStr = Number(c.saldoDeudor || 0).toLocaleString("es-CO");
    const msg = `Hola *${c.nombre}*, cordial saludo de parte de *${storeConfig?.nombre || "Miscelánea María José"}*. 👋\n\nTe recordamos amablemente que tienes un saldo pendiente en tu cuenta por valor de *$${debtStr} COP*.\n\nAgradecemos tu pronto abono o cancelación. Si ya realizaste el pago, haz caso omiso a este mensaje.\n\n¡Muchas gracias por tu preferencia! 🌸`;
    window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Modal de Abono de Deuda
  const [abonoClient, setAbonoClient] = useState(null);
  const [abonoAmount, setAbonoAmount] = useState("");
  const [abonoNotes, setAbonoNotes] = useState("");

  // Modal de Detalle de Productos Adeudados y Facturas
  const [selectedClientForDebtDetails, setSelectedClientForDebtDetails] = useState(null);

  // Obtener ventas a crédito / fiadas o con saldo pendiente para un cliente específico
  const getClientDebtSales = (client) => {
    if (!client) return [];
    return (sales || []).filter(s => {
      if (!s) return false;
      const isClientMatch = 
        (s.cliente?.id && String(s.cliente.id) === String(client.id)) ||
        (s.cliente?.dni && client.dni && String(s.cliente.dni).trim() === String(client.dni).trim()) ||
        (s.cliente?.telefono && client.telefono && String(s.cliente.telefono).replace(/\D/g, "") === String(client.telefono).replace(/\D/g, "")) ||
        (s.cliente?.nombre && client.nombre && String(s.cliente.nombre).trim().toLowerCase() === String(client.nombre).trim().toLowerCase());
      
      if (!isClientMatch) return false;

      const isCredit = s.metodoPago === "Crédito" || s.metodoPago === "Fiado";
      const hasBalance = Number(s.saldoPendiente || 0) > 0;
      return isCredit || hasBalance;
    });
  };

  // Obtener alquileres con saldo pendiente para un cliente específico
  const getClientDebtRentals = (client) => {
    if (!client) return [];
    return (rentals || []).filter(r => {
      if (!r || r.estado === "devuelto") return false;
      const isClientMatch = 
        (r.clienteId && String(r.clienteId) === String(client.id)) ||
        (r.clienteTelefono && client.telefono && String(r.clienteTelefono).replace(/\D/g, "") === String(client.telefono).replace(/\D/g, "")) ||
        (r.clienteNombre && client.nombre && String(r.clienteNombre).trim().toLowerCase() === String(client.nombre).trim().toLowerCase());
      
      const hasBalance = Number(r.saldoPendiente || 0) > 0;
      return isClientMatch && hasBalance;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.nombre || !formData.dni) {
      alert("Por favor ingrese el nombre y documento del cliente.");
      return;
    }
    const limitValue = Number(formData.limiteCredito) || 0;
    await onSaveClient({
      ...formData,
      limiteCredito: limitValue,
      saldoDeudor: 0
    });
    setIsModalOpen(false);
    setFormData({ nombre: "", dni: "", telefono: "", direccion: "", limiteCredito: "" });
  };

  // Registrar abono
  const handleAbonoSubmit = async (e) => {
    e.preventDefault();
    const amount = Number(abonoAmount);
    if (!amount || amount <= 0) {
      alert("Por favor ingresa un monto válido mayor a 0.");
      return;
    }

    const currentDebt = Number(abonoClient.saldoDeudor) || 0;
    if (amount > currentDebt) {
      if (!confirm(`El abono ($${amount.toLocaleString()} COP) supera la deuda actual ($${currentDebt.toLocaleString()} COP). ¿Deseas continuar?`)) {
        return;
      }
    }

    const newDebt = Math.max(0, currentDebt - amount);
    const updatedClient = {
      ...abonoClient,
      saldoDeudor: newDebt,
      ultimoAbono: new Date().toISOString(),
      abonos: [
        ...(abonoClient.abonos || []),
        {
          id: `ABN-${Date.now()}`,
          monto: amount,
          fecha: new Date().toISOString(),
          notas: abonoNotes
        }
      ]
    };

    await onSaveClient(updatedClient);

    // Si hay callback para caja, registrar entrada de efectivo
    if (onAddCashMovement) {
      await onAddCashMovement({
        tipo: "ingreso",
        monto: amount,
        motivo: `Abono de deuda: ${abonoClient.nombre}`
      });
    }

    // Ofrecer comprobante por WhatsApp
    const sendWp = confirm(`¡Abono de $${amount.toLocaleString("es-CO")} COP registrado con éxito!\n\n¿Deseas enviar el recibo de abono por WhatsApp al cliente?`);
    if (sendWp && abonoClient.telefono) {
      const cleanPhone = String(abonoClient.telefono).replace(/\D/g, "");
      const phoneWithCountry = cleanPhone.startsWith("57") ? cleanPhone : `57${cleanPhone}`;
      const msg = `Hola *${abonoClient.nombre}*, confirmamos el abono a tu cuenta por *$${amount.toLocaleString("es-CO")} COP* en *${storeConfig.nombre || "Miscelánea María José"}*. ✅\n\nTu saldo pendiente actual es de: *$${newDebt.toLocaleString("es-CO")} COP*.\n\n¡Muchas gracias por tu pago!`;
      window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`, "_blank");
    }

    setAbonoClient(null);
    setAbonoAmount("");
    setAbonoNotes("");
  };

  // Exportar a Excel
  const handleExportExcel = () => {
    if (clients.length === 0) {
      alert("No hay clientes registrados para exportar.");
      return;
    }

    const data = clients.map(c => ({
      "Nombre Completo": c.nombre || "",
      "Cédula / DNI": c.dni || "",
      "Teléfono": c.telefono || "",
      "Dirección": c.direccion || "",
      "Saldo Deudor ($ COP)": Number(c.saldoDeudor) || 0,
      "Estado de Cuenta": (Number(c.saldoDeudor) || 0) > 0 ? "DEBE" : "AL DIA"
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");
    XLSX.writeFile(workbook, `Clientes_Diana_Sharith_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const filtered = clients
    .filter(c => {
      if (filterDebtOnly && (!c.saldoDeudor || c.saldoDeudor <= 0)) return false;
      const q = searchTerm.toLowerCase();
      return (
        c.nombre?.toLowerCase().includes(q) || 
        c.dni?.toLowerCase().includes(q) ||
        c.telefono?.includes(q)
      );
    });

  const totalClientsWithDebt = clients.filter(c => Number(c.saldoDeudor) > 0).length;
  const totalMoneyPending = clients.reduce((sum, c) => sum + (Number(c.saldoDeudor) || 0), 0);

  return (
    <div style={{ maxWidth: "1600px", margin: "0 auto", padding: "20px" }}>
      {/* Cabecera y Botones de Acción */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "14px" }}>
        <div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "10px" }}>
            <Users size={26} color="var(--accent-blue)" />
            Directorio y Cartera de Clientes
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Clientes frecuentes, historial de ventas, alquileres y control de cuentas fiadas
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={handleExportExcel}
            className="btn btn-outline"
            style={{ padding: "9px 16px", color: "var(--neon-emerald, #34d399)", borderColor: "rgba(52, 211, 153, 0.3)" }}
            title="Descargar lista de clientes en formato Excel"
          >
            <FileSpreadsheet size={16} />
            <span>Exportar Excel</span>
          </button>

          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary" style={{ padding: "9px 18px" }}>
            <Plus size={18} />
            <span>Registrar Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen de Cartera / Fiados */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginBottom: "18px" }}>
        <div className="glass-panel" style={{ padding: "16px" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 700, display: "block" }}>
            TOTAL CLIENTES
          </span>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-main)", marginTop: "4px" }}>
            {clients.length}
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Registrados en el sistema
          </span>
        </div>

        <div className="glass-panel" style={{ padding: "16px" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 700, display: "block" }}>
            CLIENTES CON CUENTAS FIADAS
          </span>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: totalClientsWithDebt > 0 ? "var(--neon-amber, #fbbf24)" : "var(--text-main)", marginTop: "4px" }}>
            {totalClientsWithDebt}
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {totalClientsWithDebt === 0 ? "Nadie tiene deudas pendientes" : "Vecinos con compras a crédito"}
          </span>
        </div>

        <div className="glass-panel" style={{ padding: "16px" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 700, display: "block" }}>
            TOTAL POR COBRAR (CARTERA FIADA)
          </span>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: totalMoneyPending > 0 ? "var(--neon-rose, #f87171)" : "var(--neon-emerald, #34d399)", marginTop: "4px" }}>
            ${totalMoneyPending.toLocaleString("es-CO")} COP
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Dinero pendiente de recaudo
          </span>
        </div>
      </div>

      {/* Barra de Filtros y Buscador */}
      <div className="glass-panel" style={{ padding: "14px 20px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ position: "relative", width: "100%", maxWidth: "420px" }}>
          <Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            className="input-field"
            placeholder="Buscar por nombre, cédula o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: "42px" }}
          />
        </div>

        {/* Filtros Rápidos */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={() => setFilterDebtOnly(false)}
            className="btn"
            style={{
              padding: "6px 14px",
              fontSize: "0.82rem",
              borderRadius: "8px",
              fontWeight: 700,
              background: !filterDebtOnly ? "var(--accent-blue)" : "rgba(255,255,255,0.03)",
              color: !filterDebtOnly ? "#fff" : "var(--text-muted)",
              border: !filterDebtOnly ? "none" : "1px solid var(--border-color)"
            }}
          >
            Todos ({clients.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterDebtOnly(true)}
            className="btn"
            style={{
              padding: "6px 14px",
              fontSize: "0.82rem",
              borderRadius: "8px",
              fontWeight: 700,
              background: filterDebtOnly ? "#f59e0b" : "rgba(255,255,255,0.03)",
              color: filterDebtOnly ? "#000" : "var(--neon-amber, #fbbf24)",
              border: filterDebtOnly ? "none" : "1px solid rgba(245, 158, 11, 0.4)"
            }}
          >
            📒 Solo con Deuda ({totalClientsWithDebt})
          </button>
        </div>
      </div>

      {/* Grid de Tarjetas de Clientes */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
        {filtered.map(c => {
          const debt = Number(c.saldoDeudor) || 0;
          return (
            <div 
              key={c.id || c.dni} 
              className="glass-panel glow-card" 
              style={{ 
                padding: "18px", 
                borderColor: debt > 0 ? "rgba(245, 158, 11, 0.35)" : "var(--border-color)",
                background: debt > 0 ? "rgba(245, 158, 11, 0.03)" : undefined
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    background: debt > 0 ? "rgba(245, 158, 11, 0.2)" : "rgba(59, 130, 246, 0.2)",
                    color: debt > 0 ? "#fbbf24" : "#93c5fd",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: "1.1rem"
                  }}>
                    {c.nombre ? c.nombre.charAt(0).toUpperCase() : "C"}
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-main)", margin: 0 }}>
                      {c.nombre}
                    </h3>
                    <span className="badge badge-blue" style={{ fontSize: "0.68rem", marginTop: "2px" }}>
                      C.C. {c.dni}
                    </span>
                  </div>
                </div>

                {/* Badge de Deuda */}
                <div>
                  {debt > 0 ? (
                    <span className="badge badge-amber" style={{ fontSize: "0.7rem", fontWeight: 800 }}>
                      Debe: ${debt.toLocaleString("es-CO")}
                    </span>
                  ) : (
                    <span className="badge badge-green" style={{ fontSize: "0.68rem" }}>
                      Al día ($0)
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Phone size={14} color="var(--accent-blue)" />
                  <span>{c.telefono || "Sin teléfono"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <MapPin size={14} color="var(--accent-blue)" />
                  <span>{c.direccion || "Sin dirección registrada"}</span>
                </div>
                {/* Límite de Crédito */}
                {Number(c.limiteCredito) > 0 && (() => {
                  const pct = getCreditUsagePct(c);
                  const isOver = pct >= 100;
                  const isNear = pct >= 80;
                  return (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", marginBottom: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <CreditCard size={13} color={isOver ? "#f87171" : isNear ? "#fbbf24" : "var(--accent-blue)"} />
                          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: isOver ? "#f87171" : isNear ? "#fbbf24" : "var(--text-muted)" }}>
                            Cupo: ${Number(c.limiteCredito).toLocaleString("es-CO")}
                          </span>
                        </div>
                        <span style={{ fontSize: "0.72rem", fontWeight: 800, color: isOver ? "#f87171" : isNear ? "#fbbf24" : "#34d399" }}>
                          {pct}% usado
                        </span>
                      </div>
                      <div style={{ height: "5px", borderRadius: "4px", background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          width: `${pct}%`,
                          borderRadius: "4px",
                          background: isOver ? "#ef4444" : isNear ? "#f59e0b" : "#34d399",
                          transition: "width 0.4s ease"
                        }} />
                      </div>
                      {isOver && (
                        <div style={{ fontSize: "0.7rem", color: "#f87171", fontWeight: 700, marginTop: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
                          <AlertTriangle size={11} /> ¡Cupo de crédito EXCEDIDO!
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Acciones de Deuda: Ver Productos, WhatsApp y Abono */}
              {debt > 0 ? (
                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setSelectedClientForDebtDetails(c)}
                    className="btn btn-outline"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: "0.8rem",
                      color: "var(--accent-blue, #60a5fa)",
                      borderColor: "rgba(59, 130, 246, 0.4)",
                      background: "rgba(59, 130, 246, 0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      fontWeight: 700
                    }}
                    title="Ver productos específicos, cantidades y valores que debe este cliente"
                  >
                    <Receipt size={14} />
                    <span>Ver Productos que Debe y Facturas</span>
                  </button>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppReminder(c)}
                      className="btn btn-outline"
                      style={{ flex: 1, padding: "6px 10px", fontSize: "0.78rem", borderColor: "rgba(16, 185, 129, 0.4)", color: "#34d399", background: "rgba(16, 185, 129, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                      title="Enviar recordatorio formal y amable de cobro por WhatsApp"
                    >
                      <MessageSquare size={13} color="#34d399" />
                      <span>Cobrar WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAbonoClient(c);
                        setAbonoAmount(debt.toString());
                      }}
                      className="btn btn-primary"
                      style={{ flex: 1, padding: "6px 12px", fontSize: "0.8rem", background: "#f59e0b", borderColor: "#f59e0b", color: "#000", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                    >
                      <DollarSign size={14} />
                      <span>Abonar / Pagar</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setSelectedClientForDebtDetails(c)}
                    className="btn btn-outline"
                    style={{ width: "100%", padding: "6px 10px", fontSize: "0.76rem", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                  >
                    <Receipt size={13} />
                    <span>Ver Historial de Facturas</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL REGISTRAR CLIENTE */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-content modal-card"
            style={{
              maxWidth: "500px",
              width: "92%",
              background: "var(--bg-secondary, #111827)",
              border: "1px solid var(--border-strong)",
              borderRadius: "18px",
              padding: "24px",
              boxShadow: "0 25px 65px -10px rgba(0,0,0,0.85)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                Nuevo Cliente
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="btn btn-outline" style={{ padding: "4px 8px" }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Nombre Completo *:
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="Ej: María Gómez"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Cédula / DNI *:
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="Ej: 1098765432"
                  value={formData.dni}
                  onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Teléfono / Celular:
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ej: 3124567890"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Dirección:
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ej: Calle 15 # 4-20"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  <CreditCard size={13} style={{ display: "inline", marginRight: "5px", verticalAlign: "middle" }} />
                  Límite de Crédito ($ COP):
                </label>
                <div style={{ display: "flex", gap: "6px" }}>
                <MathPriceInput
                    value={formData.limiteCredito}
                    onChange={(val) => setFormData({ ...formData, limiteCredito: String(val) })}
                    placeholder="Ej: 50000 (0 = sin límite)"
                    className="input-field"
                    style={{ flex: 1 }}
                    min={0}
                  />
                </div>
                <span style={{ fontSize: "0.73rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                  Si se supera el cupo, el sistema mostrará una alerta visual en la tarjeta del cliente.
                </span>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-outline"
                  style={{ padding: "8px 16px" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: "8px 20px" }}
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR ABONO */}
      {abonoClient && (
        <div className="modal-overlay" onClick={() => setAbonoClient(null)}>
          <div
            className="modal-content modal-card"
            style={{
              maxWidth: "460px",
              width: "92%",
              background: "var(--bg-secondary, #111827)",
              border: "1px solid var(--border-strong)",
              borderRadius: "18px",
              padding: "24px",
              boxShadow: "0 25px 65px -10px rgba(0,0,0,0.85)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <DollarSign size={22} color="#fbbf24" />
                <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                  Abonar a Cuenta Fiada
                </h3>
              </div>
              <button onClick={() => setAbonoClient(null)} className="btn btn-outline" style={{ padding: "4px 8px" }}>
                ✕
              </button>
            </div>

            <div style={{
              background: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              borderRadius: "12px",
              padding: "14px",
              marginBottom: "16px"
            }}>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Cliente:</div>
              <strong style={{ fontSize: "1.05rem", color: "#fff" }}>{abonoClient.nombre}</strong>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "0.85rem" }}>
                <span>Deuda actual:</span>
                <strong style={{ color: "#fbbf24" }}>${(Number(abonoClient.saldoDeudor) || 0).toLocaleString("es-CO")} COP</strong>
              </div>
            </div>

            <form onSubmit={handleAbonoSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "4px", fontWeight: 700 }}>
                  Monto a Abonar ($ COP) *:
                </label>
                  <MathPriceInput
                    value={abonoAmount}
                    onChange={(val) => setAbonoAmount(String(val))}
                    placeholder="Ej: 50000+20000 o 70000"
                    className="input-field"
                    style={{ fontSize: "1.2rem", fontWeight: 800, color: "#34d399" }}
                    min={100}
                    required
                    autoFocus
                  />

                <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setAbonoAmount(String(Number(abonoClient.saldoDeudor) || 0))}
                    className="btn btn-outline"
                    style={{ padding: "4px 8px", fontSize: "0.75rem", color: "#34d399", borderColor: "rgba(16, 185, 129, 0.4)" }}
                  >
                    ⚡ Total Deuda (${(Number(abonoClient.saldoDeudor) || 0).toLocaleString("es-CO")})
                  </button>
                  {[10000, 20000, 50000, 100000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAbonoAmount(val.toString())}
                      className="btn btn-outline"
                      style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                    >
                      ${(val / 1000)}k
                    </button>
                  ))}
                </div>

                {Number(abonoAmount) > 0 && (
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "6px", display: "block" }}>
                    Nuevo saldo restante: <strong>${Math.max(0, (Number(abonoClient.saldoDeudor) || 0) - Number(abonoAmount)).toLocaleString("es-CO")} COP</strong>
                  </span>
                )}
              </div>

              <div>
                <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Notas del Abono:
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ej: Pago en efectivo en mostrador"
                  value={abonoNotes}
                  onChange={(e) => setAbonoNotes(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setAbonoClient(null)}
                  className="btn btn-outline"
                  style={{ padding: "8px 16px" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  style={{ padding: "8px 20px", fontWeight: 800 }}
                >
                  Confirmar Abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE PRODUCTOS QUE DEBE Y FACTURAS */}
      {selectedClientForDebtDetails && (() => {
        const debtSales = getClientDebtSales(selectedClientForDebtDetails);
        const debtRentals = getClientDebtRentals(selectedClientForDebtDetails);
        const clientDebt = Number(selectedClientForDebtDetails.saldoDeudor) || 0;

        return (
          <div className="modal-overlay" style={{ zIndex: 1300 }} onClick={() => setSelectedClientForDebtDetails(null)}>
            <div
              className="modal-content modal-card"
              style={{
                maxWidth: "760px",
                width: "95%",
                maxHeight: "90vh",
                overflowY: "auto",
                background: "var(--bg-secondary, #111827)",
                border: "1px solid var(--border-strong)",
                borderRadius: "20px",
                padding: "24px",
                boxShadow: "0 25px 65px -10px rgba(0,0,0,0.85)"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Encabezado del Modal */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    background: clientDebt > 0 ? "rgba(245, 158, 11, 0.18)" : "rgba(59, 130, 246, 0.15)",
                    color: clientDebt > 0 ? "#fbbf24" : "var(--accent-blue)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <Receipt size={24} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                      Detalle de Productos Adeudados y Facturas
                    </h2>
                    <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "3px 0 0" }}>
                      Cliente: <strong style={{ color: "var(--text-main)" }}>{selectedClientForDebtDetails.nombre}</strong> · C.C. {selectedClientForDebtDetails.dni} · Cel: {selectedClientForDebtDetails.telefono || "Sin teléfono"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedClientForDebtDetails(null)}
                  className="btn btn-outline"
                  style={{ padding: "6px 10px" }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Banner Resumen de Deuda */}
              <div style={{
                background: clientDebt > 0 ? "rgba(245, 158, 11, 0.1)" : "rgba(16, 185, 129, 0.1)",
                border: `1.5px solid ${clientDebt > 0 ? "rgba(245, 158, 11, 0.4)" : "rgba(16, 185, 129, 0.4)"}`,
                borderRadius: "14px",
                padding: "14px 18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                marginBottom: "18px"
              }}>
                <div>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 700 }}>
                    ESTADO DE CUENTA TOTAL:
                  </span>
                  <div style={{ fontSize: "1.45rem", fontWeight: 900, color: clientDebt > 0 ? "#fbbf24" : "#34d399", marginTop: "2px" }}>
                    ${clientDebt.toLocaleString("es-CO")} COP {clientDebt > 0 ? "PENDIENTE" : "AL DÍA"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  {clientDebt > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedClientForDebtDetails;
                        setSelectedClientForDebtDetails(null);
                        setAbonoClient(target);
                        setAbonoAmount(clientDebt.toString());
                      }}
                      className="btn btn-primary"
                      style={{ background: "#f59e0b", borderColor: "#f59e0b", color: "#000", fontWeight: 800, padding: "8px 14px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <DollarSign size={14} />
                      <span>Registrar Abono / Pago</span>
                    </button>
                  )}
                  {clientDebt > 0 && selectedClientForDebtDetails.telefono && (
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppReminder(selectedClientForDebtDetails)}
                      className="btn btn-outline"
                      style={{ padding: "8px 12px", fontSize: "0.82rem", color: "#34d399", borderColor: "rgba(16,185,129,0.4)" }}
                    >
                      <MessageSquare size={14} />
                      <span>WhatsApp</span>
                    </button>
                  )}
                </div>
              </div>

              {/* LISTADO DE FACTURAS Y VENTAS A CRÉDITO / FIADAS */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <ShoppingBag size={16} color="var(--accent-blue)" />
                  <span>Facturas de Venta a Crédito / Fiadas ({debtSales.length})</span>
                </div>

                {debtSales.length === 0 ? (
                  <div style={{
                    padding: "20px",
                    textAlign: "center",
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: "12px",
                    border: "1px dashed var(--border-color)",
                    color: "var(--text-muted)",
                    fontSize: "0.85rem"
                  }}>
                    {clientDebt > 0 
                      ? "Este cliente tiene un saldo registrado en cuenta corriente ($" + clientDebt.toLocaleString("es-CO") + " COP), pero no se encontraron facturas individuales en el historial (deuda previa o directa)."
                      : "No hay facturas a crédito pendientes para este cliente."}
                  </div>
                ) : (
                  debtSales.map(sale => {
                    const saleTotal = Number(sale.total) || 0;
                    const items = sale.items || [];

                    return (
                      <div
                        key={sale.id}
                        style={{
                          background: "rgba(255,255,255,0.025)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "14px",
                          padding: "16px",
                          overflow: "hidden"
                        }}
                      >
                        {/* Cabecera de la Factura */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "10px" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--accent-blue, #60a5fa)" }}>
                                Factura #{sale.id}
                              </span>
                              <span className="badge badge-amber" style={{ fontSize: "0.68rem" }}>
                                {sale.metodoPago || "Crédito"}
                              </span>
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "3px" }}>
                              Fecha: {new Date(sale.fecha).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })} · Atendido por: {sale.vendedor || "Caja"}
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", display: "block" }}>Total Factura:</span>
                              <strong style={{ fontSize: "1.1rem", color: "var(--text-main)" }}>${saleTotal.toLocaleString("es-CO")} COP</strong>
                            </div>

                            {onPrintTicket && (
                              <button
                                type="button"
                                onClick={() => onPrintTicket(sale)}
                                className="btn btn-outline"
                                style={{ padding: "6px 12px", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "5px" }}
                                title="Ver / Imprimir Ticket Térmico Oficial"
                              >
                                <Printer size={13} />
                                <span>Factura</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Tabla de Productos de esta Factura */}
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
                            <thead>
                              <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                <th style={{ padding: "8px 10px", color: "var(--text-muted)" }}>Producto</th>
                                <th style={{ padding: "8px 10px", color: "var(--text-muted)", textAlign: "center", width: "90px" }}>Cantidad</th>
                                <th style={{ padding: "8px 10px", color: "var(--text-muted)", textAlign: "right", width: "110px" }}>Precio Unit.</th>
                                <th style={{ padding: "8px 10px", color: "var(--text-muted)", textAlign: "right", width: "120px" }}>Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((it, idx) => (
                                <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                  <td style={{ padding: "8px 10px", color: "var(--text-main)", fontWeight: 600 }}>
                                    {it.nombre}
                                    {it.presentacion && it.presentacion !== "unidad" && (
                                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: "6px" }}>
                                        ({it.presentacion})
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 800, color: "var(--accent-blue)" }}>
                                    {it.cantidad} {it.presentacion === "paquete" ? "paq" : "und"}
                                  </td>
                                  <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--text-muted)" }}>
                                    ${(Number(it.precioUnitario) || 0).toLocaleString("es-CO")}
                                  </td>
                                  <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 800, color: "#34d399" }}>
                                    ${(Number(it.subtotal) || (Number(it.cantidad || 1) * Number(it.precioUnitario || 0))).toLocaleString("es-CO")}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* ALQUILERES CON SALDO PENDIENTE */}
                {debtRentals.length > 0 && (
                  <div style={{ marginTop: "10px" }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                      <Package size={16} color="#fbbf24" />
                      <span>Alquileres de Mobiliario con Saldo Pendiente ({debtRentals.length})</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {debtRentals.map(r => (
                        <div
                          key={r.id}
                          style={{
                            background: "rgba(245, 158, 11, 0.05)",
                            border: "1px solid rgba(245, 158, 11, 0.25)",
                            borderRadius: "12px",
                            padding: "14px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "10px"
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "var(--text-main)" }}>
                              Alquiler #{r.id} · {r.cantidad} {r.item}
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                              Total alquiler: ${Number(r.precioTotal || 0).toLocaleString("es-CO")} · Abonado: ${Number(r.abono || 0).toLocaleString("es-CO")}
                            </div>
                          </div>

                          <div style={{ textAlign: "right" }}>
                            <span style={{ fontSize: "0.72rem", color: "#f87171", fontWeight: 700, display: "block" }}>Saldo Pendiente:</span>
                            <strong style={{ fontSize: "1.1rem", color: "#f87171" }}>${Number(r.saldoPendiente || 0).toLocaleString("es-CO")} COP</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Botón Cerrar */}
              <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setSelectedClientForDebtDetails(null)}
                  className="btn btn-outline"
                  style={{ padding: "8px 20px" }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
