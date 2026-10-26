import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  X, 
  Check, 
  User, 
  Phone, 
  GraduationCap, 
  FileText,
  Calendar,
  AlertCircle 
} from "lucide-react";

export default function StudentInsuranceModal({
  isOpen,
  onClose,
  product,
  onConfirm,
  currentUser = null,
  nextPolizaNumber = null,
  maxPolizas = 152
}) {
  const [formData, setFormData] = useState({
    apellido1: "",
    apellido2: "",
    nombre1: "",
    nombre2: "",
    sexo: "M",
    tipoDocumento: "TI",
    numeroDocumento: "",
    fechaNacimiento: "",
    curso: "0",
    responsableVenta: currentUser?.nombre || "Caja Mostrador",
    fechaVenta: new Date().toISOString().split("T")[0],
    responsableVerificacion: "",
    inclusion: "NO",
    telefonoResponsable: "",
    precio: 0,
    observaciones: ""
  });

  useEffect(() => {
    if (isOpen && product) {
      setFormData({
        apellido1: "",
        apellido2: "",
        nombre1: "",
        nombre2: "",
        sexo: "M",
        tipoDocumento: "TI",
        numeroDocumento: "",
        fechaNacimiento: "",
        curso: "0",
        responsableVenta: currentUser?.nombre || "Caja Mostrador",
        fechaVenta: new Date().toISOString().split("T")[0],
        responsableVerificacion: "",
        inclusion: "NO",
        telefonoResponsable: "",
        precio: Number(product.precio) || 15000,
        observaciones: ""
      });
    }
  }, [isOpen, product, currentUser]);

  if (!isOpen || !product) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.apellido1.trim()) {
      alert("Por favor ingresa el Primer Apellido del estudiante (requerido por la aseguradora).");
      return;
    }
    if (!formData.nombre1.trim()) {
      alert("Por favor ingresa el Primer Nombre del estudiante (requerido por la aseguradora).");
      return;
    }
    if (!formData.numeroDocumento.trim()) {
      alert("Por favor ingresa el Número de Documento de identificación.");
      return;
    }

    const a1 = formData.apellido1.trim().toUpperCase();
    const a2 = formData.apellido2.trim().toUpperCase();
    const n1 = formData.nombre1.trim().toUpperCase();
    const n2 = formData.nombre2.trim().toUpperCase();
    const fullName = [a1, a2, n1, n2].filter(Boolean).join(" ");
    const numDoc = formData.numeroDocumento.trim();
    const cursoFmt = formData.curso === "0" ? "0 (Transición)" : `${formData.curso}°`;

    onConfirm({
      // Campos oficiales del formato institucional:
      apellido1: a1,
      apellido2: a2,
      nombre1: n1,
      nombre2: n2,
      sexo: formData.sexo,
      tipoDocumento: formData.tipoDocumento,
      numeroDocumento: numDoc,
      identificacion: numDoc,
      fechaNacimiento: formData.fechaNacimiento || "",
      curso: formData.curso,
      grado: cursoFmt,
      responsableVenta: formData.responsableVenta.trim() || currentUser?.nombre || "Caja Mostrador",
      vendedor: formData.responsableVenta.trim() || currentUser?.nombre || "Caja Mostrador",
      fechaVenta: formData.fechaVenta || new Date().toISOString().split("T")[0],
      responsableVerificacion: formData.responsableVerificacion.trim(),
      inclusion: formData.inclusion || "NO",
      
      // Datos de contacto y precio:
      estudianteNombre: fullName,
      telefonoResponsable: formData.telefonoResponsable.trim(),
      precio: Number(formData.precio) || Number(product.precio) || 0,
      observaciones: formData.observaciones.trim()
    });

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1400, padding: "16px" }}>
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: "680px", 
          width: "96%", 
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "24px",
          overflow: "hidden"
        }}
      >
        {/* Cabecera Liquid Glass con badge oficial */}
        <div style={{
          padding: "16px 22px",
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
              borderRadius: "14px",
              background: "linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(168, 85, 247, 0.15))",
              border: "1px solid rgba(168, 85, 247, 0.4)",
              color: "#a78bfa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(139, 92, 246, 0.3)"
            }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "var(--text-main)" }}>
                  Vender Seguro Escolar (Caja POS)
                </h3>
                {nextPolizaNumber && (
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "3px 9px",
                    borderRadius: "8px",
                    fontSize: "0.74rem",
                    fontWeight: 800,
                    background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                    color: "#ffffff",
                    boxShadow: "0 2px 10px rgba(109, 40, 217, 0.4)",
                    letterSpacing: "0.02em",
                    fontFamily: "var(--font-mono)"
                  }}>
                    🛡️ Póliza #{nextPolizaNumber} de {maxPolizas}
                  </span>
                )}
              </div>
              <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", display: "block", marginTop: "2px" }}>
                I.E. Luis Carlos Galán Sarmiento • Póliza Solidaria N° 994000001142
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

        {/* Formulario Completo con scroll */}
        <form onSubmit={handleSubmit} style={{ padding: "20px 22px", overflowY: "auto", flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            
            {/* ── SECCIÓN 1: DATOS DEL ESTUDIANTE (FORMATO BASE EXCEL) ── */}
            <div style={{
              background: "rgba(139, 92, 246, 0.05)",
              border: "1px solid rgba(139, 92, 246, 0.2)",
              borderRadius: "16px",
              padding: "16px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                <GraduationCap size={16} color="#a78bfa" />
                <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  1. Datos del Estudiante (Formato Base Excel)
                </span>
              </div>

              {/* Fila Apellidos */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                    Primer Apellido *:
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Ej: PÉREZ"
                    value={formData.apellido1}
                    onChange={(e) => setFormData({ ...formData, apellido1: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "10px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-tertiary)",
                      color: "var(--text-main)",
                      fontSize: "0.85rem",
                      textTransform: "uppercase"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                    Segundo Apellido:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: RODRÍGUEZ"
                    value={formData.apellido2}
                    onChange={(e) => setFormData({ ...formData, apellido2: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "10px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-tertiary)",
                      color: "var(--text-main)",
                      fontSize: "0.85rem",
                      textTransform: "uppercase"
                    }}
                  />
                </div>
              </div>

              {/* Fila Nombres */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                    Primer Nombre *:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: JUAN"
                    value={formData.nombre1}
                    onChange={(e) => setFormData({ ...formData, nombre1: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "10px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-tertiary)",
                      color: "var(--text-main)",
                      fontSize: "0.85rem",
                      textTransform: "uppercase"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                    Segundo Nombre:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: CAMILO"
                    value={formData.nombre2}
                    onChange={(e) => setFormData({ ...formData, nombre2: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "10px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-tertiary)",
                      color: "var(--text-main)",
                      fontSize: "0.85rem",
                      textTransform: "uppercase"
                    }}
                  />
                </div>
              </div>

              {/* Fila Sexo, Tipo de Documento y Número */}
              <div style={{ display: "grid", gridTemplateColumns: "105px 190px 1fr", gap: "10px", marginBottom: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                    Sexo *:
                  </label>
                  <select
                    className="form-select select-with-arrow"
                    value={formData.sexo}
                    onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 32px 9px 10px",
                      borderRadius: "10px",
                      border: "1px solid var(--border-color)",
                      backgroundColor: "var(--bg-tertiary)",
                      color: "var(--text-main)",
                      fontSize: "0.84rem",
                      cursor: "pointer"
                    }}
                  >
                    <option value="M">M - Masc</option>
                    <option value="F">F - Fem</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                    Tipo Documento *:
                  </label>
                  <select
                    className="form-select select-with-arrow"
                    value={formData.tipoDocumento}
                    onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 36px 9px 12px",
                      borderRadius: "10px",
                      border: "1px solid var(--border-color)",
                      backgroundColor: "var(--bg-tertiary)",
                      color: "var(--text-main)",
                      fontSize: "0.84rem",
                      cursor: "pointer"
                    }}
                  >
                    <option value="TI">TI — Tarjeta Id.</option>
                    <option value="RC">RC — Registro Civil</option>
                    <option value="CC">CC — Cédula</option>
                    <option value="PPT">PPT — Permiso Prot.</option>
                    <option value="NES">NES — Núm. Secret.</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                    Número de Documento *:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 1098765432"
                    value={formData.numeroDocumento}
                    onChange={(e) => setFormData({ ...formData, numeroDocumento: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "10px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-tertiary)",
                      color: "var(--text-main)",
                      fontSize: "0.85rem",
                      fontFamily: "var(--font-mono)"
                    }}
                  />
                </div>
              </div>

              {/* Fila Nacimiento y Curso */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                    Fecha de Nacimiento (Día/Mes/Año):
                  </label>
                  <input
                    type="date"
                    value={formData.fechaNacimiento}
                    onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "10px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-tertiary)",
                      color: "var(--text-main)",
                      fontSize: "0.84rem"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                    Curso Escolar (0 a 11) *:
                  </label>
                  <select
                    className="form-select select-with-arrow"
                    value={formData.curso}
                    onChange={(e) => setFormData({ ...formData, curso: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 34px 8px 12px",
                      borderRadius: "10px",
                      border: "1px solid var(--border-color)",
                      backgroundColor: "var(--bg-tertiary)",
                      color: "var(--text-main)",
                      fontSize: "0.84rem",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    <option value="0">0 — Transición / Preescolar</option>
                    <option value="1">1 — Primero (1°)</option>
                    <option value="2">2 — Segundo (2°)</option>
                    <option value="3">3 — Tercero (3°)</option>
                    <option value="4">4 — Cuarto (4°)</option>
                    <option value="5">5 — Quinto (5°)</option>
                    <option value="6">6 — Sexto (6°)</option>
                    <option value="7">7 — Séptimo (7°)</option>
                    <option value="8">8 — Octavo (8°)</option>
                    <option value="9">9 — Noveno (9°)</option>
                    <option value="10">10 — Décimo (10°)</option>
                    <option value="11">11 — Once (11°)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── SECCIÓN 2: CONTROL DE VENTA & VERIFICACIÓN ── */}
            <div style={{
              background: "rgba(59, 130, 246, 0.05)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              borderRadius: "16px",
              padding: "16px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                <FileText size={16} color="#60a5fa" />
                <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  2. Control de Venta & Verificación
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                    Responsable de Venta *:
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.responsableVenta}
                    onChange={(e) => setFormData({ ...formData, responsableVenta: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "10px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-tertiary)",
                      color: "var(--text-main)",
                      fontSize: "0.84rem"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                    Fecha de la Venta *:
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.fechaVenta}
                    onChange={(e) => setFormData({ ...formData, fechaVenta: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "10px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-tertiary)",
                      color: "var(--text-main)",
                      fontSize: "0.84rem"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                    Responsable de Verificación:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Sebastián / Revisión Oficina"
                    value={formData.responsableVerificacion}
                    onChange={(e) => setFormData({ ...formData, responsableVerificacion: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "10px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-tertiary)",
                      color: "var(--text-main)",
                      fontSize: "0.84rem"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                    Inclusión:
                  </label>
                  <select
                    className="form-select select-with-arrow"
                    value={formData.inclusion}
                    onChange={(e) => setFormData({ ...formData, inclusion: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 30px 8px 10px",
                      borderRadius: "10px",
                      border: "1px solid var(--border-color)",
                      backgroundColor: "var(--bg-tertiary)",
                      color: "var(--text-main)",
                      fontSize: "0.84rem",
                      cursor: "pointer"
                    }}
                  >
                    <option value="NO">NO (Normal)</option>
                    <option value="SÍ">SÍ (Inclusión)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── SECCIÓN 3: CONTACTO ACUDIENTE & PRECIO EN TICKET ── */}
            <div style={{
              background: "rgba(16, 185, 129, 0.05)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              borderRadius: "16px",
              padding: "16px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                <Phone size={16} color="#34d399" />
                <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  3. Contacto Acudiente & Precio en Caja
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                    WhatsApp / Teléfono Acudiente:
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej: 3101234567"
                    value={formData.telefonoResponsable}
                    onChange={(e) => setFormData({ ...formData, telefonoResponsable: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "10px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-tertiary)",
                      color: "var(--text-main)",
                      fontSize: "0.84rem"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                    Precio a Cobrar en Ticket (COP):
                  </label>
                  <input
                    type="number"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "10px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-tertiary)",
                      color: "var(--text-main)",
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      fontFamily: "var(--font-mono)"
                    }}
                  />
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                  Observaciones adicionales (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ej: Sede Principal, Jornada Mañana"
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-tertiary)",
                    color: "var(--text-main)",
                    fontSize: "0.82rem"
                  }}
                />
              </div>
            </div>

          </div>

          {/* Botones de acción Liquid Glass */}
          <div style={{ 
            display: "flex", 
            justifyContent: "flex-end", 
            gap: "10px", 
            marginTop: "20px", 
            paddingTop: "14px", 
            borderTop: "1px solid var(--border-color)" 
          }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-modal-cancel"
              style={{ padding: "9px 20px", borderRadius: "12px", fontSize: "0.85rem" }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-primary-action"
              style={{
                background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                fontWeight: 800,
                padding: "9px 24px",
                borderRadius: "12px",
                boxShadow: "0 4px 16px rgba(139, 92, 246, 0.4)",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <Check size={16} />
              <span>Agregar al Ticket de Venta</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
