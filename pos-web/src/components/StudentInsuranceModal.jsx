import React, { useState, useEffect } from "react";
import { ShieldCheck, X, Check, User, Phone, GraduationCap, Hash, DollarSign } from "lucide-react";

export default function StudentInsuranceModal({
  isOpen,
  onClose,
  product,
  onConfirm
}) {
  const [formData, setFormData] = useState({
    estudianteNombre: "",
    identificacion: "",
    edad: "",
    grado: "",
    telefonoResponsable: "",
    precio: 0,
    observaciones: ""
  });

  useEffect(() => {
    if (isOpen && product) {
      setFormData({
        estudianteNombre: "",
        identificacion: "",
        edad: "",
        grado: "",
        telefonoResponsable: "",
        precio: Number(product.precio) || 0,
        observaciones: ""
      });
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.estudianteNombre.trim()) {
      alert("Por favor ingresa los nombres y apellidos completos del estudiante.");
      return;
    }
    if (!formData.identificacion.trim()) {
      alert("Por favor ingresa el número de documento de identidad del estudiante.");
      return;
    }
    if (!formData.grado.trim()) {
      alert("Por favor ingresa el grado escolar.");
      return;
    }

    onConfirm({
      estudianteNombre: formData.estudianteNombre.trim(),
      identificacion: formData.identificacion.trim(),
      edad: formData.edad ? String(formData.edad).trim() : "",
      grado: formData.grado.trim(),
      telefonoResponsable: formData.telefonoResponsable ? String(formData.telefonoResponsable).trim() : "",
      precio: Number(formData.precio) || 0,
      observaciones: formData.observaciones ? formData.observaciones.trim() : ""
    });

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1400, padding: "16px" }}>
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: "520px", 
          width: "94%", 
          borderRadius: "24px",
          overflow: "hidden"
        }}
      >
        {/* Cabecera Liquid Glass */}
        <div style={{
          padding: "16px 20px",
          background: "transparent",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "rgba(13, 148, 136, 0.16)",
              border: "1px solid rgba(13, 148, 136, 0.3)",
              color: "#2dd4bf",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.18rem", fontWeight: 800, color: "var(--text-main)" }}>
                Venta de Seguro Escolar
              </h3>
              <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 700 }}>
                {product.nombre} • Precio: ${Number(product.precio).toLocaleString()} COP
              </span>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="btn-modal-close-circle"
            title="Cerrar modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "13px" }}>
            
            {/* Nombre Estudiante */}
            <div>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 800, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase" }}>
                Nombres y Apellidos del Estudiante *:
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ej: Sofía Valentina Gómez Pérez"
                value={formData.estudianteNombre}
                onChange={(e) => setFormData({ ...formData, estudianteNombre: e.target.value })}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "10px",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-tertiary)",
                  color: "var(--text-main)",
                  fontSize: "0.88rem",
                  outline: "none"
                }}
              />
            </div>

            {/* Documento y Edad */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 800, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase" }}>
                  N° Identificación / TI *:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 1098765432"
                  value={formData.identificacion}
                  onChange={(e) => setFormData({ ...formData, identificacion: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "10px",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-tertiary)",
                    color: "var(--text-main)",
                    fontSize: "0.88rem",
                    fontFamily: "var(--font-mono)",
                    outline: "none"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 800, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase" }}>
                  Edad (Años):
                </label>
                <input
                  type="number"
                  placeholder="Ej: 11"
                  value={formData.edad}
                  onChange={(e) => setFormData({ ...formData, edad: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "10px",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-tertiary)",
                    color: "var(--text-main)",
                    fontSize: "0.88rem",
                    outline: "none"
                  }}
                />
              </div>
            </div>

            {/* Grado y WhatsApp */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 800, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase" }}>
                  Grado Escolar *:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 5°, 6-1, Transición"
                  value={formData.grado}
                  onChange={(e) => setFormData({ ...formData, grado: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "10px",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-tertiary)",
                    color: "var(--text-main)",
                    fontSize: "0.88rem",
                    outline: "none"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 800, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase" }}>
                  WhatsApp Responsable:
                </label>
                <input
                  type="tel"
                  placeholder="Ej: 3123456789"
                  value={formData.telefonoResponsable}
                  onChange={(e) => setFormData({ ...formData, telefonoResponsable: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "10px",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-tertiary)",
                    color: "var(--text-main)",
                    fontSize: "0.88rem",
                    outline: "none"
                  }}
                />
              </div>
            </div>

            {/* Precio sugerido del Inventario */}
            <div style={{
              background: "rgba(13, 148, 136, 0.1)",
              border: "1px solid rgba(13, 148, 136, 0.3)",
              padding: "10px 14px",
              borderRadius: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <span style={{ fontSize: "0.72rem", color: "#2dd4bf", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
                  Precio a Cobrar en Ticket:
                </span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  Asignado automáticamente de inventario
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ fontWeight: 800, color: "var(--text-main)" }}>$</span>
                <input
                  type="number"
                  value={formData.precio}
                  onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                  style={{
                    width: "100px",
                    padding: "5px 8px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-secondary)",
                    color: "var(--text-main)",
                    fontSize: "0.95rem",
                    fontWeight: 800,
                    fontFamily: "var(--font-mono)",
                    textAlign: "right"
                  }}
                />
              </div>
            </div>

            {/* Observaciones opcionales */}
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "3px" }}>
                Observaciones (Opcional):
              </label>
              <input
                type="text"
                placeholder="Ej: Colegio o sede..."
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-tertiary)",
                  color: "var(--text-main)",
                  fontSize: "0.8rem",
                  outline: "none"
                }}
              />
            </div>
          </div>

          {/* Acciones Liquid Glass */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "22px" }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-modal-cancel"
              style={{ padding: "10px 20px", borderRadius: "12px", fontSize: "0.88rem" }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-primary-action"
              style={{
                background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
                fontWeight: 800,
                fontSize: "0.88rem",
                padding: "10px 24px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 16px rgba(13, 148, 136, 0.4)"
              }}
            >
              <Check size={16} />
              <span>Agregar a la Venta</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
