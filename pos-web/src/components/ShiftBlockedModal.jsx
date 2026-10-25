import React from "react";
import { 
  Lock, 
  AlertTriangle, 
  User, 
  Clock, 
  DollarSign, 
  X, 
  History, 
  ShieldAlert, 
  ArrowRightLeft, 
  CheckCircle2, 
  PhoneCall, 
  MessageCircle,
  HelpCircle
} from "lucide-react";
import { formatCOP } from "../utils/formatCOP";

export default function ShiftBlockedModal({
  isOpen,
  onClose,
  activeShift,
  currentUser,
  users = [],
  storeConfig = {},
  onOpenHistory,
  onEmergencyAdminClose,
  onReassignToMe,
  onForceCloseShift
}) {
  if (!isOpen || !activeShift) return null;

  const isAdmin = currentUser?.rol === "Administrador";

  // Resolver nombre y datos reales del cajero responsable
  const isGenericCajero = !activeShift.cajero || activeShift.cajero === "Cajero";
  
  // Buscar en la lista de usuarios si coincide por ID o correo
  const matchedUser = users.find(u => 
    (activeShift.cajeroId && String(u.id) === String(activeShift.cajeroId)) ||
    (activeShift.cajeroCorreo && u.correo && u.correo.toLowerCase() === activeShift.cajeroCorreo.toLowerCase()) ||
    (activeShift.cajero && u.nombre && u.nombre.toLowerCase() === activeShift.cajero.toLowerCase())
  );

  const cajeroNombre = matchedUser?.nombre 
    || (isGenericCajero ? "Turno previo no asignado" : activeShift.cajero);
  
  const cajeroRol = matchedUser?.rol 
    || activeShift.cajeroRol 
    || (isGenericCajero ? "Sesión Anterior" : "Cajero");

  const cajeroTelefono = matchedUser?.telefono || null;

  // Formatear fecha y hora en formato Colombia
  let fechaStr = "Hora no registrada";
  let fechaDia = "";
  if (activeShift.fechaApertura) {
    try {
      const d = new Date(activeShift.fechaApertura);
      fechaStr = d.toLocaleTimeString("es-CO", { 
        hour: "2-digit", 
        minute: "2-digit", 
        hour12: true, 
        timeZone: "America/Bogota" 
      });
      fechaDia = d.toLocaleDateString("es-CO", { 
        weekday: "short", 
        day: "numeric", 
        month: "short", 
        timeZone: "America/Bogota" 
      });
    } catch (_) {
      fechaStr = String(activeShift.fechaApertura);
    }
  }

  const baseCOP = formatCOP(Number(activeShift.baseInicial || 0));

  // Obtener iniciales para el avatar
  const getInitials = (name) => {
    if (!name) return "??";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const shiftInitials = getInitials(cajeroNombre);
  const currentInitials = getInitials(currentUser?.nombre || "Tu");

  // Mensaje para compartir por WhatsApp
  const handleWhatsAppContact = () => {
    const phone = cajeroTelefono || storeConfig?.celularWhatsApp || storeConfig?.telefono || "";
    const cleanPhone = phone.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Hola ${cajeroNombre}, tienes la caja abierta en el sistema POS (${storeConfig?.nombre || "Miscelánea María José"}). Por favor realiza el cierre de tu turno para poder abrir caja en mi sesión. ¡Gracias!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
  };

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 1300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        background: "rgba(10, 15, 29, 0.78)"
      }}
      onClick={onClose}
    >
      <div
        className="modal-card glass-panel"
        style={{
          maxWidth: "540px",
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "26px 24px",
          borderRadius: "20px",
          border: "1.5px solid rgba(245, 158, 11, 0.5)",
          boxShadow: "0 25px 65px rgba(0, 0, 0, 0.75), 0 0 35px rgba(245, 158, 11, 0.18)",
          position: "relative"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar modal */}
        <button
          onClick={onClose}
          className="btn btn-outline"
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            width: "36px",
            height: "36px",
            padding: 0,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid var(--border-color)",
            color: "var(--text-muted)"
          }}
          title="Cerrar ventana"
        >
          <X size={18} />
        </button>

        {/* ── ENCABEZADO DE ALERTA ── */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div
            style={{
              width: "70px",
              height: "70px",
              borderRadius: "50%",
              margin: "0 auto 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "radial-gradient(circle, rgba(245, 158, 11, 0.28) 0%, rgba(245, 158, 11, 0.05) 75%)",
              border: "2px solid rgba(245, 158, 11, 0.7)",
              boxShadow: "0 0 24px rgba(245, 158, 11, 0.35)",
              animation: "popBadge 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
            }}
          >
            <Lock size={34} color="#f59e0b" />
          </div>

          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
            <span
              className="badge badge-orange"
              style={{
                fontSize: "0.75rem",
                padding: "5px 12px",
                fontWeight: 800,
                letterSpacing: "0.04em",
                textTransform: "uppercase"
              }}
            >
              ⚠️ Caja en Uso por Otra Sesión
            </span>
          </div>

          <h2
            style={{
              fontSize: "1.35rem",
              fontWeight: 800,
              color: "var(--text-main)",
              margin: "4px 0 6px 0",
              letterSpacing: "-0.01em"
            }}
          >
            Control de Caja Bloqueado
          </h2>
          <p
            style={{
              fontSize: "0.86rem",
              color: "var(--text-muted)",
              margin: 0,
              lineHeight: 1.45
            }}
          >
            Para evitar descuadres en el dinero físico, cada persona debe operar y cerrar su propio turno.
          </p>
        </div>

        {/* ── MENSAJE DESTACADO ── */}
        <div
          style={{
            background: "rgba(245, 158, 11, 0.12)",
            border: "1.5px solid rgba(245, 158, 11, 0.45)",
            borderRadius: "14px",
            padding: "16px 18px",
            marginBottom: "18px",
            fontSize: "0.92rem",
            lineHeight: 1.55,
            color: "var(--text-main)"
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <AlertTriangle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              El usuario <strong style={{ color: "#fbbf24", textDecoration: "underline" }}>{cajeroNombre}</strong> tiene la caja abierta en su sesión.
              <div style={{ marginTop: "8px", fontWeight: 600 }}>
                👉 Comunícate con él para que cierre caja y te permita abrir a ti.
              </div>
            </div>
          </div>
        </div>

        {/* ── FICHA DEL RESPONSABLE ACTUAL ── */}
        <div
          style={{
            background: "var(--bg-glass, rgba(255, 255, 255, 0.04))",
            border: "1px solid var(--border-color)",
            borderRadius: "16px",
            padding: "16px",
            marginBottom: "18px",
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Titular del Turno Activo
            </span>
            <span
              className={`badge ${cajeroRol === "Administrador" ? "badge-indigo" : "badge-emerald"}`}
              style={{ fontSize: "0.7rem", padding: "3px 8px", fontWeight: 700 }}
            >
              {cajeroRol}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "1.1rem",
                boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
                flexShrink: 0
              }}
            >
              {shiftInitials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                {cajeroNombre}
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                {isGenericCajero ? "Turno previo pendiente por cerrar" : "Responsable de la gaveta actual"}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              paddingTop: "10px",
              borderTop: "1px solid var(--border-color)",
              fontSize: "0.84rem"
            }}
          >
            <div>
              <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "5px", fontSize: "0.76rem" }}>
                <Clock size={13} color="var(--accent-blue, #60a5fa)" />
                Apertura del Turno:
              </span>
              <strong style={{ color: "var(--text-main)", display: "block", marginTop: "2px" }}>
                {fechaStr} {fechaDia ? `(${fechaDia})` : ""}
              </strong>
            </div>

            <div>
              <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "5px", fontSize: "0.76rem" }}>
                <DollarSign size={13} color="#34d399" />
                Base Inicial:
              </span>
              <strong style={{ color: "#34d399", fontWeight: 800, display: "block", marginTop: "2px" }}>
                ${baseCOP} COP
              </strong>
            </div>
          </div>
        </div>

        {/* ── COMPARATIVA: TU SESIÓN ACTUAL ── */}
        <div
          style={{
            background: "rgba(99, 102, 241, 0.06)",
            border: "1px solid rgba(99, 102, 241, 0.22)",
            borderRadius: "14px",
            padding: "12px 16px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.85rem",
                flexShrink: 0
              }}
            >
              {currentInitials}
            </div>
            <div>
              <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", display: "block" }}>
                Tu sesión conectada:
              </span>
              <strong style={{ fontSize: "0.92rem", color: "var(--text-main)" }}>
                {currentUser?.nombre || "Usuario"}
              </strong>
            </div>
          </div>

          <span className="badge badge-indigo" style={{ fontSize: "0.72rem", padding: "4px 8px" }}>
            {currentUser?.rol || "Asistente"}
          </span>
        </div>

        {/* ── SECCIÓN EXCLUSIVA DE ADMINISTRADOR ── */}
        {isAdmin && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px dashed rgba(239, 68, 68, 0.4)",
              borderRadius: "14px",
              padding: "14px",
              marginBottom: "18px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <ShieldAlert size={16} color="#f87171" />
              <strong style={{ fontSize: "0.85rem", color: "#fca5a5" }}>
                Supervisión de Administrador
              </strong>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 10px 0" }}>
              Como Administrador puedes intervenir este turno para continuar vendiendo o forzar el arqueo y cierre:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {/* Botón 1: Asumir turno en mi sesión (Reasignar) */}
              {onReassignToMe && (
                <button
                  type="button"
                  onClick={onReassignToMe}
                  className="btn btn-outline"
                  style={{
                    padding: "9px 12px",
                    fontSize: "0.84rem",
                    fontWeight: 700,
                    borderRadius: "10px",
                    borderColor: "rgba(99, 102, 241, 0.5)",
                    background: "rgba(99, 102, 241, 0.15)",
                    color: "var(--accent-blue, #818cf8)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                  title="Cambia el titular de este turno a tu nombre para que puedas registrar ventas y cerrar la caja en tu sesión."
                >
                  <ArrowRightLeft size={15} />
                  <span>Asumir Turno en Mi Sesión ({currentUser?.nombre})</span>
                </button>
              )}

              {/* Botón 2: Realizar arqueo y cierre formal */}
              {onEmergencyAdminClose && (
                <button
                  type="button"
                  onClick={onEmergencyAdminClose}
                  className="btn btn-danger"
                  style={{
                    padding: "9px 12px",
                    fontSize: "0.84rem",
                    fontWeight: 700,
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                  title="Abre la ventana de arqueo para contar dinero y cerrar formalmente este turno."
                >
                  <Lock size={15} />
                  <span>Realizar Arqueo y Cierre de este Turno</span>
                </button>
              )}

              {/* Botón 3: Liberación rápida si es turno huérfano */}
              {onForceCloseShift && isGenericCajero && (
                <button
                  type="button"
                  onClick={onForceCloseShift}
                  className="btn btn-outline"
                  style={{
                    padding: "7px 12px",
                    fontSize: "0.78rem",
                    borderRadius: "8px",
                    color: "#fca5a5",
                    borderColor: "rgba(239, 68, 68, 0.3)"
                  }}
                  title="Cierra el turno previo sin arqueo para liberar la caja de inmediato."
                >
                  Liberar Caja Inmediatamente (Cierre Rápido)
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── ACCIONES PARA ASISTENTES / GENERAL ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {!isAdmin && (cajeroTelefono || storeConfig?.celularWhatsApp) && (
            <button
              type="button"
              onClick={handleWhatsAppContact}
              className="btn btn-success"
              style={{
                padding: "11px 18px",
                fontSize: "0.92rem",
                fontWeight: 700,
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
            >
              <MessageCircle size={18} />
              <span>Notificar a {cajeroNombre} por WhatsApp</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-primary"
            onClick={onClose}
            autoFocus
            style={{
              padding: "12px 20px",
              fontSize: "0.95rem",
              fontWeight: 800,
              borderRadius: "12px",
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              color: "#fff",
              border: "none",
              boxShadow: "0 8px 20px rgba(245, 158, 11, 0.3)"
            }}
          >
            Entendido / Volver al POS
          </button>

          {onOpenHistory && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={onOpenHistory}
              style={{
                padding: "10px 16px",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                borderRadius: "10px"
              }}
            >
              <History size={16} />
              <span>Consultar Historial de Cierres Anteriores</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
