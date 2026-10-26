import React, { useState, useMemo } from "react";
import { 
  ShieldCheck, 
  Search, 
  Download, 
  CheckCircle, 
  Clock, 
  Calendar, 
  User, 
  Phone, 
  FileText, 
  Plus, 
  CheckSquare, 
  Square, 
  Trash2, 
  Edit3, 
  AlertCircle, 
  GraduationCap, 
  Hash, 
  Sparkles,
  X,
  MessageCircle,
  Package
} from "lucide-react";
import * as XLSX from "xlsx";

export default function InsurancesView({
  insurances = [],
  onSaveInsurance,
  onDeleteInsurance,
  onDeleteMultipleInsurances,
  onMarkAsReported,
  products = [],
  currentUser = null,
  activeShift = null,
  onRecordSale = null,
  storeConfig = {}
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterReported, setFilterReported] = useState("pendientes"); // 'todos', 'pendientes', 'reportados'
  const [filterDate, setFilterDate] = useState("todos"); // 'todos', 'hoy', 'semana', 'mes'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState(null);
  const [isExportConfirmOpen, setIsExportConfirmOpen] = useState(false);
  const [lastExportedIds, setLastExportedIds] = useState([]);

  // Buscar producto de Seguro Escolar en catálogo para obtener precio y stock
  const insuranceProduct = useMemo(() => {
    return products.find(p => 
      p.categoria === "Seguros" || 
      p.nombre?.toLowerCase().includes("seguro escolar") || 
      p.nombre?.toLowerCase().includes("seguro estudiantil")
    );
  }, [products]);

  const defaultPrice = insuranceProduct ? Number(insuranceProduct.precio || 0) : 15000;
  const stockPolizas = insuranceProduct ? Number(insuranceProduct.stock || 0) : 0;

  // Formulario de Seguro
  const [formData, setFormData] = useState({
    estudianteNombre: "",
    identificacion: "",
    edad: "",
    grado: "",
    telefonoResponsable: "",
    precio: defaultPrice,
    cobrarEnCaja: true,
    metodoPago: "Efectivo",
    observaciones: ""
  });

  // Abrir modal de nuevo seguro
  const handleOpenNewModal = () => {
    setEditingInsurance(null);
    setFormData({
      estudianteNombre: "",
      identificacion: "",
      edad: "",
      grado: "",
      telefonoResponsable: "",
      precio: insuranceProduct ? Number(insuranceProduct.precio || 0) : defaultPrice,
      cobrarEnCaja: true,
      metodoPago: "Efectivo",
      observaciones: ""
    });
    setIsNewModalOpen(true);
  };

  // Abrir modal de edición
  const handleOpenEditModal = (ins) => {
    setEditingInsurance(ins);
    setFormData({
      estudianteNombre: ins.estudianteNombre || "",
      identificacion: ins.identificacion || "",
      edad: ins.edad || "",
      grado: ins.grado || "",
      telefonoResponsable: ins.telefonoResponsable || "",
      precio: ins.precio || defaultPrice,
      cobrarEnCaja: false,
      metodoPago: ins.metodoPago || "Efectivo",
      observaciones: ins.observaciones || ""
    });
    setIsNewModalOpen(true);
  };

  // Guardar seguro (nuevo o editado)
  const handleSaveSubmit = async (e) => {
    e.preventDefault();
    if (!formData.estudianteNombre.trim()) {
      alert("Por favor ingresa el nombre y apellidos completos del estudiante.");
      return;
    }
    if (!formData.identificacion.trim()) {
      alert("Por favor ingresa el número de documento de identificación.");
      return;
    }
    if (!formData.grado.trim()) {
      alert("Por favor ingresa el grado escolar del estudiante.");
      return;
    }

    const payload = {
      ...(editingInsurance || {}),
      estudianteNombre: formData.estudianteNombre.trim(),
      identificacion: formData.identificacion.trim(),
      edad: formData.edad ? String(formData.edad).trim() : "",
      grado: formData.grado.trim(),
      telefonoResponsable: formData.telefonoResponsable ? String(formData.telefonoResponsable).trim() : "",
      precio: Number(formData.precio) || 0,
      metodoPago: formData.metodoPago,
      observaciones: formData.observaciones || "",
      vendedor: editingInsurance ? editingInsurance.vendedor : (currentUser?.nombre || "Cajero"),
      fechaRegistro: editingInsurance ? editingInsurance.fechaRegistro : new Date().toISOString(),
      reportado: editingInsurance ? Boolean(editingInsurance.reportado) : false,
      shiftId: editingInsurance ? editingInsurance.shiftId : (activeShift?.id || null)
    };

    if (onSaveInsurance) {
      await onSaveInsurance(payload);
    }

    // Si es nuevo y se marcó cobrar en caja, registrar en Ventas
    if (!editingInsurance && formData.cobrarEnCaja && onRecordSale && Number(formData.precio) > 0) {
      const saleRecord = {
        tipoVenta: "seguro",
        shiftId: activeShift?.id || null,
        cliente: {
          nombre: formData.estudianteNombre.trim(),
          telefono: formData.telefonoResponsable || "",
          dni: formData.identificacion.trim()
        },
        items: [{
          cartItemId: `seguro-dir-${Date.now()}`,
          productId: insuranceProduct?.id || insuranceProduct?.codigo || "PROD-SEGURO",
          codigo: insuranceProduct?.codigo || "SEG-001",
          nombre: `Seguro Escolar: ${formData.estudianteNombre.trim()} (${formData.grado.trim()})`,
          categoria: "Seguros",
          presentacion: "póliza",
          cantidad: 1,
          unidadesReales: 1,
          precioUnitario: Number(formData.precio),
          subtotal: Number(formData.precio),
          isSeguro: true
        }],
        total: Number(formData.precio),
        metodoPago: formData.metodoPago || "Efectivo",
        efectivoRecibido: Number(formData.precio),
        cambio: 0,
        fecha: new Date().toISOString(),
        vendedor: currentUser?.nombre || "Caja Mostrador"
      };
      await onRecordSale(saleRecord);
    }

    setIsNewModalOpen(false);
  };

  // Filtrado de seguros
  const filteredInsurances = useMemo(() => {
    return insurances.filter(ins => {
      // Filtro de estado de reporte
      if (filterReported === "pendientes" && ins.reportado) return false;
      if (filterReported === "reportados" && !ins.reportado) return false;

      // Filtro de fecha
      if (filterDate !== "todos" && ins.fechaRegistro) {
        const itemDate = new Date(ins.fechaRegistro);
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        if (filterDate === "hoy") {
          if (itemDate.getTime() < startOfDay) return false;
        } else if (filterDate === "semana") {
          const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
          if (itemDate.getTime() < sevenDaysAgo) return false;
        } else if (filterDate === "mes") {
          const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
          if (itemDate.getTime() < thirtyDaysAgo) return false;
        }
      }

      // Buscador
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const nom = (ins.estudianteNombre || "").toLowerCase();
        const doc = (ins.identificacion || "").toLowerCase();
        const gra = (ins.grado || "").toLowerCase();
        const tel = (ins.telefonoResponsable || "").toLowerCase();
        return nom.includes(q) || doc.includes(q) || gra.includes(q) || tel.includes(q);
      }

      return true;
    });
  }, [insurances, filterReported, filterDate, searchTerm]);

  // Métricas
  const totalVendidos = insurances.length;
  const totalPendientes = insurances.filter(s => !s.reportado).length;
  const totalReportados = insurances.filter(s => s.reportado).length;

  // Manejo de Selección
  const handleToggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    if (selectedIds.size === filteredInsurances.length && filteredInsurances.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInsurances.map(s => s.id)));
    }
  };

  const handleSelectAllPending = () => {
    const pendingIds = insurances.filter(s => !s.reportado).map(s => s.id);
    setSelectedIds(new Set(pendingIds));
    setFilterReported("pendientes");
  };

  // EXPORTAR A EXCEL (SIN PRECIO)
  const handleExportExcel = () => {
    // Determinar qué registros se exportarán: los seleccionados o todos los visibles
    const targetItems = selectedIds.size > 0 
      ? insurances.filter(s => selectedIds.has(s.id))
      : filteredInsurances;

    if (targetItems.length === 0) {
      alert("No hay ningún seguro escolar para exportar con los filtros actuales.");
      return;
    }

    // Estructurar filas para Excel (ESTRICTAMENTE SIN PRECIOS)
    const excelRows = targetItems.map((item, idx) => {
      const dateObj = item.fechaRegistro ? new Date(item.fechaRegistro) : new Date();
      const fechaFmt = dateObj.toLocaleDateString("es-CO", { 
        year: "numeric", 
        month: "2-digit", 
        day: "2-digit" 
      });

      return {
        "N°": idx + 1,
        "Fecha": fechaFmt,
        "Nombres y Apellidos del Estudiante": item.estudianteNombre || "",
        "N° de Identificación": item.identificacion || "",
        "Edad": item.edad || "",
        "Grado": item.grado || "",
        "Teléfono / WhatsApp Responsable": item.telefonoResponsable || ""
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows);

    // Ajuste visual de anchos de columna para que el Excel quede perfecto
    worksheet["!cols"] = [
      { wch: 6 },  // N°
      { wch: 13 }, // Fecha
      { wch: 34 }, // Nombres y Apellidos
      { wch: 18 }, // Identificación
      { wch: 8 },  // Edad
      { wch: 12 }, // Grado
      { wch: 22 }  // Teléfono WhatsApp
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Seguros Escolares");

    const todayStr = new Date().toISOString().split("T")[0];
    const fileName = `Reporte_Seguros_Escolares_${todayStr}.xlsx`;

    XLSX.writeFile(workbook, fileName);

    // Guardar ids exportados y abrir modal de confirmación de marcar como reportados
    const exportedIds = targetItems.map(s => s.id);
    setLastExportedIds(exportedIds);
    setIsExportConfirmOpen(true);
  };

  // Confirmar marcar como reportados
  const handleConfirmMarkReported = async () => {
    if (onMarkAsReported && lastExportedIds.length > 0) {
      await onMarkAsReported(lastExportedIds);
    }
    setSelectedIds(new Set());
    setIsExportConfirmOpen(false);
  };

  // Eliminar individual
  const handleDeletePrompt = async (id, nombre) => {
    if (!onDeleteInsurance) return;
    if (confirm(`¿Estás seguro de que deseas eliminar el registro del seguro para "${nombre}"?`)) {
      await onDeleteInsurance(id);
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Eliminar seleccionados
  const handleDeleteSelected = async () => {
    if (!onDeleteMultipleInsurances || selectedIds.size === 0) return;
    if (confirm(`¿Deseas eliminar permanentemente los ${selectedIds.size} seguros seleccionados?`)) {
      await onDeleteMultipleInsurances(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  return (
    <div style={{ padding: "20px 24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* ── ENCABEZADO Y MÉTRICAS ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "22px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.8rem" }}>🛡️</span>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0, color: "var(--text-main)" }}>
                Gestión de Seguros Escolares
              </h1>
              <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Registro estudiantil, control de pólizas y exportación de reportes limpios a Excel para aseguradoras.
              </p>
            </div>
          </div>
        </div>

        {/* Acciones principales */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={handleExportExcel}
            className="btn btn-primary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
              boxShadow: "0 4px 14px rgba(13, 148, 136, 0.35)",
              fontWeight: 800
            }}
            title="Descargar archivo Excel formateado sin precios para entregar a la aseguradora"
          >
            <Download size={16} />
            <span>Descargar Reporte Excel (.xlsx)</span>
            {selectedIds.size > 0 && (
              <span style={{ 
                background: "rgba(255, 255, 255, 0.25)", 
                padding: "2px 7px", 
                borderRadius: "12px", 
                fontSize: "0.75rem" 
              }}>
                {selectedIds.size} selec.
              </span>
            )}
          </button>

          <button
            onClick={handleOpenNewModal}
            className="btn btn-outline"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              borderColor: "var(--accent-teal, #0d9488)",
              color: "var(--accent-teal, #2dd4bf)",
              fontWeight: 700
            }}
          >
            <Plus size={16} />
            <span>Nuevo Seguro Manual</span>
          </button>
        </div>
      </div>

      {/* ── CARDS DE MÉTRICAS RÁPIDAS ── */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", 
        gap: "14px", 
        marginBottom: "20px" 
      }}>
        {/* Métricas: Pendientes de Reporte */}
        <div 
          onClick={() => { setFilterReported("pendientes"); }}
          style={{
            background: filterReported === "pendientes" ? "rgba(245, 158, 11, 0.12)" : "var(--bg-secondary)",
            border: `1px solid ${filterReported === "pendientes" ? "#f59e0b" : "var(--border-color)"}`,
            borderRadius: "16px",
            padding: "16px 18px",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#fbbf24", textTransform: "uppercase" }}>
              ⏳ Pendientes de Reportar
            </span>
            <Clock size={18} color="#fbbf24" />
          </div>
          <div style={{ fontSize: "1.9rem", fontWeight: 900, color: "var(--text-main)", marginTop: "6px" }}>
            {totalPendientes}
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
            Listos para el próximo reporte de hoy
          </span>
        </div>

        {/* Métricas: Ya Reportados */}
        <div 
          onClick={() => { setFilterReported("reportados"); }}
          style={{
            background: filterReported === "reportados" ? "rgba(16, 185, 129, 0.12)" : "var(--bg-secondary)",
            border: `1px solid ${filterReported === "reportados" ? "#10b981" : "var(--border-color)"}`,
            borderRadius: "16px",
            padding: "16px 18px",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#34d399", textTransform: "uppercase" }}>
              ✅ Ya Reportados
            </span>
            <CheckCircle size={18} color="#34d399" />
          </div>
          <div style={{ fontSize: "1.9rem", fontWeight: 900, color: "var(--text-main)", marginTop: "6px" }}>
            {totalReportados}
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
            Enviados en lotes anteriores
          </span>
        </div>

        {/* Métricas: Total Histórico */}
        <div 
          onClick={() => { setFilterReported("todos"); }}
          style={{
            background: filterReported === "todos" ? "rgba(59, 130, 246, 0.12)" : "var(--bg-secondary)",
            border: `1px solid ${filterReported === "todos" ? "#3b82f6" : "var(--border-color)"}`,
            borderRadius: "16px",
            padding: "16px 18px",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#60a5fa", textTransform: "uppercase" }}>
              🛡️ Total Seguros
            </span>
            <ShieldCheck size={18} color="#60a5fa" />
          </div>
          <div style={{ fontSize: "1.9rem", fontWeight: 900, color: "var(--text-main)", marginTop: "6px" }}>
            {totalVendidos}
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
            Registrados en el sistema
          </span>
        </div>

        {/* Stock / Pólizas en inventario */}
        <div style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "16px",
          padding: "16px 18px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#2dd4bf", textTransform: "uppercase" }}>
              📦 Pólizas / Cupo en Inventario
            </span>
            <Package size={18} color="#2dd4bf" />
          </div>
          <div style={{ fontSize: "1.9rem", fontWeight: 900, color: "var(--text-main)", marginTop: "6px" }}>
            {insuranceProduct ? stockPolizas : "Sin producto"}
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
            Precio estándar: ${defaultPrice.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ── BARRA DE BÚSQUEDA Y FILTROS ── */}
      <div style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        borderRadius: "16px",
        padding: "14px 18px",
        marginBottom: "16px",
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        {/* Buscador */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 280px", maxWidth: "420px" }}>
          <div style={{ position: "relative", width: "100%" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por estudiante, documento o grado..."
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                borderRadius: "10px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-tertiary)",
                color: "var(--text-main)",
                fontSize: "0.85rem",
                outline: "none"
              }}
            />
          </div>
        </div>

        {/* Filtros de Pestañas */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", background: "var(--bg-tertiary)", padding: "3px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
            <button
              onClick={() => setFilterReported("pendientes")}
              style={{
                padding: "5px 12px",
                borderRadius: "8px",
                border: "none",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                background: filterReported === "pendientes" ? "#f59e0b" : "transparent",
                color: filterReported === "pendientes" ? "#000" : "var(--text-muted)"
              }}
            >
              Pendientes ({totalPendientes})
            </button>
            <button
              onClick={() => setFilterReported("reportados")}
              style={{
                padding: "5px 12px",
                borderRadius: "8px",
                border: "none",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                background: filterReported === "reportados" ? "#10b981" : "transparent",
                color: filterReported === "reportados" ? "#fff" : "var(--text-muted)"
              }}
            >
              Reportados ({totalReportados})
            </button>
            <button
              onClick={() => setFilterReported("todos")}
              style={{
                padding: "5px 12px",
                borderRadius: "8px",
                border: "none",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                background: filterReported === "todos" ? "var(--accent-blue, #3b82f6)" : "transparent",
                color: filterReported === "todos" ? "#fff" : "var(--text-muted)"
              }}
            >
              Todos ({totalVendidos})
            </button>
          </div>

          {/* Filtro por fecha */}
          <select
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: "10px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-tertiary)",
              color: "var(--text-main)",
              fontSize: "0.8rem",
              fontWeight: 600,
              outline: "none"
            }}
          >
            <option value="todos">📅 Todas las fechas</option>
            <option value="hoy">📅 Solo Hoy</option>
            <option value="semana">📅 Últimos 7 días</option>
            <option value="mes">📅 Últimos 30 días</option>
          </select>
        </div>
      </div>

      {/* ── BARRA DE HERRAMIENTAS DE SELECCIÓN ── */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        flexWrap: "wrap", 
        gap: "10px",
        marginBottom: "12px",
        padding: "8px 12px",
        background: "rgba(255, 255, 255, 0.02)",
        borderRadius: "10px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={handleSelectAllVisible}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.78rem",
              fontWeight: 600
            }}
          >
            {selectedIds.size === filteredInsurances.length && filteredInsurances.length > 0 ? (
              <CheckSquare size={16} color="var(--accent-teal, #2dd4bf)" />
            ) : (
              <Square size={16} />
            )}
            <span>Seleccionar visibles ({filteredInsurances.length})</span>
          </button>

          {totalPendientes > 0 && (
            <button
              onClick={handleSelectAllPending}
              style={{
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                color: "#fbbf24",
                padding: "3px 8px",
                borderRadius: "6px",
                fontSize: "0.72rem",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Seleccionar todos los pendientes ({totalPendientes})
            </button>
          )}

          {selectedIds.size > 0 && (
            <span style={{ fontSize: "0.78rem", color: "var(--text-main)", fontWeight: 700 }}>
              {selectedIds.size} seleccionados
            </span>
          )}
        </div>

        {selectedIds.size > 0 && (
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleDeleteSelected}
              className="btn btn-outline"
              style={{
                padding: "4px 10px",
                fontSize: "0.75rem",
                color: "#f87171",
                borderColor: "rgba(239, 68, 68, 0.3)"
              }}
            >
              <Trash2 size={13} style={{ marginRight: "4px" }} />
              Eliminar seleccionados
            </button>
          </div>
        )}
      </div>

      {/* ── TABLA PRINCIPAL DE SEGUROS ── */}
      <div style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)"
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ 
                background: "var(--bg-tertiary)", 
                borderBottom: "1px solid var(--border-color)",
                color: "var(--text-muted)",
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                <th style={{ padding: "12px 14px", width: "40px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredInsurances.length && filteredInsurances.length > 0}
                    onChange={handleSelectAllVisible}
                    style={{ cursor: "pointer" }}
                  />
                </th>
                <th style={{ padding: "12px 14px" }}>Estudiante</th>
                <th style={{ padding: "12px 14px" }}>Documento</th>
                <th style={{ padding: "12px 14px" }}>Edad</th>
                <th style={{ padding: "12px 14px" }}>Grado</th>
                <th style={{ padding: "12px 14px" }}>WhatsApp / Acudiente</th>
                <th style={{ padding: "12px 14px" }}>Fecha Registro</th>
                <th style={{ padding: "12px 14px" }}>Estado Reporte</th>
                <th style={{ padding: "12px 14px", textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredInsurances.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: "48px 20px", textAlign: "center", color: "var(--text-muted)" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                      <ShieldCheck size={36} opacity={0.4} />
                      <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem" }}>
                        No se encontraron registros de seguros escolares
                      </p>
                      <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.7 }}>
                        {searchTerm ? "Prueba con otro término de búsqueda" : "Los seguros vendidos desde Caja POS o registrados manualmente aparecerán aquí."}
                      </p>
                      <button
                        onClick={handleOpenNewModal}
                        className="btn btn-primary"
                        style={{ marginTop: "10px", fontSize: "0.82rem", background: "var(--accent-teal, #0d9488)" }}
                      >
                        <Plus size={14} style={{ marginRight: "6px" }} />
                        Registrar Primer Seguro
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInsurances.map((ins, index) => {
                  const isSelected = selectedIds.has(ins.id);
                  const isReported = Boolean(ins.reportado);
                  const dateStr = ins.fechaRegistro 
                    ? new Date(ins.fechaRegistro).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                    : "—";

                  return (
                    <tr
                      key={ins.id || index}
                      style={{
                        borderBottom: "1px solid var(--border-color)",
                        background: isSelected ? "rgba(13, 148, 136, 0.08)" : "transparent",
                        transition: "background 0.15s ease"
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(ins.id)}
                          style={{ cursor: "pointer" }}
                        />
                      </td>

                      {/* Estudiante */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ 
                            width: "32px", 
                            height: "32px", 
                            borderRadius: "50%", 
                            background: "rgba(13, 148, 136, 0.18)", 
                            color: "#2dd4bf",
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center",
                            fontSize: "0.85rem",
                            fontWeight: 800,
                            flexShrink: 0
                          }}>
                            {ins.estudianteNombre ? ins.estudianteNombre.charAt(0).toUpperCase() : "E"}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: "var(--text-main)" }}>
                              {ins.estudianteNombre}
                            </div>
                            {ins.observaciones && (
                              <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                                {ins.observaciones}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Documento */}
                      <td style={{ padding: "12px 14px", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                        {ins.identificacion || "—"}
                      </td>

                      {/* Edad */}
                      <td style={{ padding: "12px 14px" }}>
                        {ins.edad ? `${ins.edad} años` : "—"}
                      </td>

                      {/* Grado */}
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{
                          padding: "3px 8px",
                          borderRadius: "6px",
                          background: "rgba(59, 130, 246, 0.15)",
                          color: "#93c5fd",
                          fontWeight: 700,
                          fontSize: "0.76rem"
                        }}>
                          {ins.grado || "General"}
                        </span>
                      </td>

                      {/* WhatsApp / Teléfono */}
                      <td style={{ padding: "12px 14px" }}>
                        {ins.telefonoResponsable ? (
                          <a
                            href={`https://wa.me/57${ins.telefonoResponsable.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, le escribimos de ${storeConfig?.nombre || 'Miscelánea María José'} sobre el seguro escolar de ${ins.estudianteNombre}.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              color: "#34d399",
                              textDecoration: "none",
                              fontWeight: 700,
                              fontSize: "0.8rem"
                            }}
                          >
                            <MessageCircle size={14} />
                            <span>{ins.telefonoResponsable}</span>
                          </a>
                        ) : (
                          <span style={{ color: "var(--text-dim)" }}>Sin contacto</span>
                        )}
                      </td>

                      {/* Fecha */}
                      <td style={{ padding: "12px 14px", fontSize: "0.76rem", color: "var(--text-muted)" }}>
                        {dateStr}
                      </td>

                      {/* Estado Reporte */}
                      <td style={{ padding: "12px 14px" }}>
                        {isReported ? (
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            background: "rgba(16, 185, 129, 0.15)",
                            color: "#34d399",
                            fontSize: "0.72rem",
                            fontWeight: 700
                          }}>
                            <CheckCircle size={12} />
                            <span>Reportado</span>
                          </span>
                        ) : (
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            background: "rgba(245, 158, 11, 0.15)",
                            color: "#fbbf24",
                            fontSize: "0.72rem",
                            fontWeight: 700
                          }}>
                            <Clock size={12} />
                            <span>Pendiente</span>
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          <button
                            onClick={() => handleOpenEditModal(ins)}
                            className="btn btn-outline"
                            style={{ padding: "4px 8px", borderRadius: "6px", fontSize: "0.75rem" }}
                            title="Editar datos del seguro"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeletePrompt(ins.id, ins.estudianteNombre)}
                            className="btn btn-outline"
                            style={{ padding: "4px 8px", borderRadius: "6px", fontSize: "0.75rem", color: "#f87171" }}
                            title="Eliminar seguro"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: REGISTRAR / EDITAR SEGURO ── */}
      {isNewModalOpen && (
        <div className="modal-overlay" onClick={() => setIsNewModalOpen(false)} style={{ zIndex: 1200, padding: "16px" }}>
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
            {/* Header Liquid Glass */}
            <div style={{ 
              padding: "16px 20px", 
              borderBottom: "1px solid var(--border-color)", 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              background: "transparent"
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
                    {editingInsurance ? "Editar Seguro Escolar" : "Registrar Seguro Escolar"}
                  </h3>
                  <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                    Póliza estudiantil para cobertura médica y accidentes
                  </span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsNewModalOpen(false)} 
                className="btn-modal-close-circle"
                title="Cerrar modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveSubmit} style={{ padding: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Nombre Estudiante */}
                <div>
                  <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                    Nombres y Apellidos Completos *:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Juan Camilo Pérez Rodríguez"
                    value={formData.estudianteNombre}
                    onChange={(e) => setFormData({ ...formData, estudianteNombre: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "10px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-tertiary)",
                      color: "var(--text-main)",
                      fontSize: "0.85rem"
                    }}
                  />
                </div>

                {/* Documento y Edad */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
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
                        fontSize: "0.85rem",
                        fontFamily: "var(--font-mono)"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                      Edad (Años):
                    </label>
                    <input
                      type="number"
                      placeholder="Ej: 12"
                      value={formData.edad}
                      onChange={(e) => setFormData({ ...formData, edad: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "10px",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-tertiary)",
                        color: "var(--text-main)",
                        fontSize: "0.85rem"
                      }}
                    />
                  </div>
                </div>

                {/* Grado y Teléfono WhatsApp */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                      Grado Escolar *:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: 6°, 7-2, Jardín"
                      value={formData.grado}
                      onChange={(e) => setFormData({ ...formData, grado: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "10px",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-tertiary)",
                        color: "var(--text-main)",
                        fontSize: "0.85rem"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                      WhatsApp Responsable:
                    </label>
                    <input
                      type="tel"
                      placeholder="Ej: 3101234567"
                      value={formData.telefonoResponsable}
                      onChange={(e) => setFormData({ ...formData, telefonoResponsable: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "10px",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-tertiary)",
                        color: "var(--text-main)",
                        fontSize: "0.85rem"
                      }}
                    />
                  </div>
                </div>

                {/* Precio y Opción de Cobro en Caja */}
                <div style={{ 
                  background: "rgba(13, 148, 136, 0.08)", 
                  border: "1px solid rgba(13, 148, 136, 0.25)", 
                  padding: "12px", 
                  borderRadius: "12px" 
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ fontSize: "0.76rem", fontWeight: 700, color: "#2dd4bf" }}>
                      Precio del Seguro (COP):
                    </label>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      Predeterminado del inventario
                    </span>
                  </div>
                  <input
                    type="number"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "10px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-secondary)",
                      color: "var(--text-main)",
                      fontSize: "1rem",
                      fontWeight: 800,
                      fontFamily: "var(--font-mono)"
                    }}
                  />

                  {!editingInsurance && (
                    <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="checkbox"
                        id="cobrarCajaCheck"
                        checked={formData.cobrarEnCaja}
                        onChange={(e) => setFormData({ ...formData, cobrarEnCaja: e.target.checked })}
                        style={{ cursor: "pointer" }}
                      />
                      <label htmlFor="cobrarCajaCheck" style={{ fontSize: "0.78rem", color: "var(--text-main)", cursor: "pointer", fontWeight: 600 }}>
                        Registrar venta en Caja POS (Entra al arqueo de caja actual)
                      </label>
                    </div>
                  )}
                </div>

                {/* Observaciones */}
                <div>
                  <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                    Observaciones adicionales (Opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Colegio San Pedro Claver, Sede B"
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

              {/* Botones Liquid Glass */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "22px" }}>
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="btn btn-modal-cancel"
                  style={{ padding: "10px 20px", borderRadius: "12px" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-primary-action"
                  style={{
                    background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
                    fontWeight: 800,
                    padding: "10px 24px",
                    borderRadius: "12px",
                    boxShadow: "0 4px 16px rgba(13, 148, 136, 0.4)"
                  }}
                >
                  {editingInsurance ? "Guardar Cambios" : "Guardar Seguro 🛡️"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRMACIÓN TRAS DESCARGAR EXCEL ── */}
      {isExportConfirmOpen && (
        <div className="modal-overlay" style={{ zIndex: 1300 }}>
          <div 
            className="modal-card" 
            style={{ 
              maxWidth: "460px", 
              width: "90%", 
              padding: "24px", 
              textAlign: "center",
              background: "var(--bg-secondary)",
              borderRadius: "20px",
              border: "2px solid #0d9488",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.7)"
            }}
          >
            <div style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              margin: "0 auto 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(13, 148, 136, 0.18)",
              color: "#2dd4bf"
            }}>
              <CheckCircle size={32} />
            </div>

            <h3 style={{ margin: "0 0 8px", fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)" }}>
              ¡Reporte Excel Generado con Éxito!
            </h3>
            
            <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", lineHeight: 1.5, margin: "0 0 18px" }}>
              Se exportaron <strong>{lastExportedIds.length}</strong> seguros escolares sin precios.<br/>
              ¿Deseas marcar estos seguros como <strong>"Reportados"</strong> para que mañana <strong>no se crucen con nuevas ventas</strong>?
            </p>

            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                onClick={() => setIsExportConfirmOpen(false)}
                className="btn btn-outline"
                style={{ fontSize: "0.82rem" }}
              >
                No, mantenerlos pendientes
              </button>
              <button
                onClick={handleConfirmMarkReported}
                className="btn btn-primary"
                style={{
                  background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
                  fontWeight: 800,
                  fontSize: "0.82rem"
                }}
              >
                Sí, marcar como Reportados ✅
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
