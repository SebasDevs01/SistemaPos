import React, { useState, useEffect } from "react";
import { Settings, Store, MapPin, Phone, MessageSquare, Receipt, Save, X, CheckCircle, Smartphone } from "lucide-react";

export default function StoreConfigModal({ isOpen, onClose, storeConfig, onSaveConfig }) {
  const [formData, setFormData] = useState({
    nombre: storeConfig?.nombre || "Miscelánea María José",
    nit: storeConfig?.nit || "",
    direccion: storeConfig?.direccion || "",
    barrio: storeConfig?.barrio || "",
    ciudad: storeConfig?.ciudad || "",
    telefono: storeConfig?.telefono || "",
    celularWhatsApp: storeConfig?.celularWhatsApp || "",
    mensajeTicket: storeConfig?.mensajeTicket || "¡Gracias por su compra en Miscelánea María José!"
  });

  // Inicializar el formulario SOLO cuando el modal se abre por primera vez.
  // NO re-inicializar si storeConfig cambia externamente (el listener de Firestore)
  // para no borrar los cambios que el usuario está escribiendo.
  const initializedRef = React.useRef(false);
  useEffect(() => {
    if (isOpen) {
      if (!initializedRef.current && storeConfig) {
        setFormData({
          nombre: storeConfig.nombre || "Miscelánea María José",
          nit: storeConfig.nit || "",
          direccion: storeConfig.direccion || "",
          barrio: storeConfig.barrio || "",
          ciudad: storeConfig.ciudad || "",
          telefono: storeConfig.telefono || "",
          celularWhatsApp: storeConfig.celularWhatsApp || "",
          mensajeTicket: storeConfig.mensajeTicket || "¡Gracias por su compra en Miscelánea María José!"
        });
        initializedRef.current = true;
      }
    } else {
      // Resetear el flag cuando el modal se cierra
      initializedRef.current = false;
    }
  }, [isOpen, storeConfig]);

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      alert("El nombre de la miscelánea es obligatorio.");
      return;
    }
    // Quitar el campo de prueba si existe
    const cleanData = { ...formData };
    delete cleanData._testWrite;

    try {
      setIsSaving(true);
      await onSaveConfig(cleanData);
      setSuccessMsg("¡Configuración de la tienda guardada con éxito!");
      setTimeout(() => {
        setSuccessMsg("");
        onClose();
      }, 1500);
    } catch (err) {
      alert("Error al guardar la configuración: " + (err?.message || err));
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-card"
        style={{
          maxWidth: "680px",
          width: "95%",
          background: "var(--bg-secondary, #111827)",
          border: "1px solid var(--border-strong)",
          borderRadius: "20px",
          padding: "24px",
          boxShadow: "0 25px 65px -10px rgba(0,0,0,0.85)",
          maxHeight: "92vh",
          overflowY: "auto"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "44px",
              height: "44px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(59, 130, 246, 0.2))",
              border: "1px solid rgba(99, 102, 241, 0.35)",
              color: "var(--neon-indigo, #818cf8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Settings size={22} className="animate-spin-slow" />
            </div>
            <div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                Configuración del Comercio
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "3px 0 0" }}>
                Información para tickets de venta, facturación y reportes oficiales en Excel.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline"
            style={{ padding: "6px", borderRadius: "50%" }}
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Notificación de Éxito */}
        {successMsg && (
          <div style={{
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            color: "#34d399",
            padding: "10px 14px",
            borderRadius: "12px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "0.88rem",
            fontWeight: 700
          }}>
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", marginBottom: "16px" }}>
            {/* Nombre del Establecimiento */}
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px" }}>
                <Store size={14} color="var(--accent-blue)" /> Nombre de la Miscelánea *
              </label>
              <input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="input-field"
                placeholder="Ej. Miscelánea María José"
                style={{ width: "100%" }}
              />
            </div>

            {/* NIT / RUT */}
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px" }}>
                <Receipt size={14} color="var(--accent-blue)" /> NIT / Identificación Tributaria
              </label>
              <input
                type="text"
                value={formData.nit}
                onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                className="input-field"
                placeholder="Ej. 151515"
                style={{ width: "100%" }}
              />
            </div>

            {/* Dirección */}
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px" }}>
                <MapPin size={14} color="var(--neon-emerald)" /> Dirección del Establecimiento *
              </label>
              <input
                type="text"
                required
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                className="input-field"
                placeholder="Ej. Calle 59# 39 w24"
                style={{ width: "100%" }}
              />
            </div>

            {/* Barrio / Sector */}
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px" }}>
                <MapPin size={14} color="var(--neon-emerald)" /> Barrio o Sector
              </label>
              <input
                type="text"
                value={formData.barrio}
                onChange={(e) => setFormData({ ...formData, barrio: e.target.value })}
                className="input-field"
                placeholder="Ej. Bucaramanga"
                style={{ width: "100%" }}
              />
            </div>

            {/* Ciudad / Departamento */}
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px" }}>
                <MapPin size={14} color="var(--neon-emerald)" /> Ciudad y Departamento
              </label>
              <input
                type="text"
                value={formData.ciudad}
                onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                className="input-field"
                placeholder="Ej. Bucaramanga, Santander"
                style={{ width: "100%" }}
              />
            </div>

            {/* Teléfono Principal */}
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px" }}>
                <Phone size={14} color="var(--neon-amber)" /> Teléfono de Contacto *
              </label>
              <input
                type="tel"
                required
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="input-field"
                placeholder="Ej. 3171166497"
                style={{ width: "100%" }}
              />
            </div>

            {/* Celular WhatsApp */}
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px" }}>
                <Smartphone size={14} color="#25D366" /> Celular WhatsApp (Con código país)
              </label>
              <input
                type="tel"
                value={formData.celularWhatsApp}
                onChange={(e) => setFormData({ ...formData, celularWhatsApp: e.target.value })}
                className="input-field"
                placeholder="Ej. 573171166497"
                style={{ width: "100%" }}
              />
            </div>
          </div>

          {/* Mensaje al pie del ticket */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px" }}>
              <MessageSquare size={14} color="var(--accent-blue)" /> Mensaje al Pie del Ticket
            </label>
            <textarea
              rows="2"
              value={formData.mensajeTicket}
              onChange={(e) => setFormData({ ...formData, mensajeTicket: e.target.value })}
              className="input-field"
              placeholder="Ej. ¡Gracias por su compra en Miscelánea María José!"
              style={{ width: "100%", resize: "vertical" }}
            />
          </div>

          {/* Mini Vista Previa de Membrete para Facturas y Tickets */}
          <div style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px dashed var(--border-color)",
            borderRadius: "14px",
            padding: "16px",
            marginBottom: "22px",
            textAlign: "center"
          }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>
              Vista previa del encabezado impreso
            </span>
            <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-main)", textTransform: "uppercase" }}>
              {formData.nombre || "MISCELÁNEA"}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
              NIT: {formData.nit || "---"}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {formData.direccion || "---"} {formData.barrio ? `· B/ ${formData.barrio}` : ""}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Tel: {formData.telefono || "---"} {formData.ciudad ? `· ${formData.ciudad}` : ""}
            </div>
          </div>

          {/* Botones */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              style={{ padding: "10px 18px", fontSize: "0.9rem" }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary"
              style={{ padding: "10px 22px", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "8px" }}
            >
              <Save size={17} />
              <span>{isSaving ? "Guardando..." : "Guardar Configuración"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
