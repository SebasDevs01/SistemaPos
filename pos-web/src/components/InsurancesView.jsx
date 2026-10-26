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

  // Clave de localStorage para el libro Excel acumulado
  const EXCEL_HISTORY_KEY = "insurances_excel_sheets_v1";
  const MAX_POLIZAS = 152; // total de pólizas del contrato

  // Mapa global: insurance.id → Nº de póliza (1 … 152) ordenado por fecha de registro
  const globalSequenceMap = useMemo(() => {
    const sorted = [...insurances].sort((a, b) => {
      const da = a.fechaRegistro ? new Date(a.fechaRegistro).getTime() : 0;
      const db = b.fechaRegistro ? new Date(b.fechaRegistro).getTime() : 0;
      return da - db;
    });
    const map = {};
    sorted.forEach((ins, idx) => { map[ins.id] = idx + 1; });
    return map;
  }, [insurances]);

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

  // Utilidad para desglosar nombres en caso de registros anteriores
  const parseNombreCompleto = (nombreCompleto = "") => {
    const parts = (nombreCompleto || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { a1: "", a2: "", n1: "", n2: "" };
    if (parts.length === 1) return { a1: parts[0], a2: "", n1: "", n2: "" };
    if (parts.length === 2) return { a1: parts[0], a2: "", n1: parts[1], n2: "" };
    if (parts.length === 3) return { a1: parts[0], a2: parts[1], n1: parts[2], n2: "" };
    return { a1: parts[0], a2: parts[1], n1: parts[2], n2: parts.slice(3).join(" ") };
  };

  // Formulario de Seguro con todos los campos oficiales del FORMATO LUIS CARLOS GALAN 2027
  const [formData, setFormData] = useState({
    apellido1: "",
    apellido2: "",
    nombre1: "",
    nombre2: "",
    sexo: "M", // M / F
    tipoDocumento: "TI", // RC, TI, CC, PPT, NES
    numeroDocumento: "",
    fechaNacimiento: "",
    curso: "0", // 0 a 11
    responsableVenta: currentUser?.nombre || "Caja Mostrador",
    fechaVenta: new Date().toISOString().split("T")[0],
    responsableVerificacion: "",
    inclusion: "NO", // NO / SÍ
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
    const parsed = parseNombreCompleto(ins.estudianteNombre || "");
    const defaultFechaVenta = ins.fechaVenta || (ins.fechaRegistro ? ins.fechaRegistro.split("T")[0] : new Date().toISOString().split("T")[0]);
    const rawCurso = ins.curso !== undefined && ins.curso !== null && ins.curso !== ""
      ? String(ins.curso)
      : (ins.grado !== undefined ? String(ins.grado).replace(/\D/g, "") || "0" : "0");

    setFormData({
      apellido1: ins.apellido1 || parsed.a1 || "",
      apellido2: ins.apellido2 || parsed.a2 || "",
      nombre1: ins.nombre1 || parsed.n1 || "",
      nombre2: ins.nombre2 || parsed.n2 || "",
      sexo: ins.sexo || "M",
      tipoDocumento: ins.tipoDocumento || "TI",
      numeroDocumento: ins.numeroDocumento || ins.identificacion || "",
      fechaNacimiento: ins.fechaNacimiento || "",
      curso: rawCurso,
      responsableVenta: ins.responsableVenta || ins.vendedor || currentUser?.nombre || "Caja Mostrador",
      fechaVenta: defaultFechaVenta,
      responsableVerificacion: ins.responsableVerificacion || "",
      inclusion: ins.inclusion || "NO",
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

    const payload = {
      ...(editingInsurance || {}),
      // Campos oficiales del formato institucional:
      apellido1: a1,
      apellido2: a2,
      nombre1: n1,
      nombre2: n2,
      sexo: formData.sexo || "M",
      tipoDocumento: formData.tipoDocumento || "TI",
      numeroDocumento: numDoc,
      identificacion: numDoc, // compatibilidad con vistas POS
      fechaNacimiento: formData.fechaNacimiento || "",
      curso: formData.curso,
      grado: cursoFmt, // compatibilidad con vistas POS
      responsableVenta: formData.responsableVenta.trim() || (currentUser?.nombre || "Cajero"),
      vendedor: formData.responsableVenta.trim() || (currentUser?.nombre || "Cajero"), // compatibilidad
      fechaVenta: formData.fechaVenta || new Date().toISOString().split("T")[0],
      responsableVerificacion: formData.responsableVerificacion.trim(),
      inclusion: formData.inclusion || "NO",
      observaciones: formData.observaciones.trim(),

      // Campos operativos POS:
      estudianteNombre: fullName,
      telefonoResponsable: formData.telefonoResponsable ? String(formData.telefonoResponsable).trim() : "",
      precio: Number(formData.precio) || 0,
      metodoPago: formData.metodoPago,
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
          nombre: fullName,
          telefono: formData.telefonoResponsable || "",
          dni: numDoc
        },
        items: [{
          cartItemId: `seguro-dir-${Date.now()}`,
          productId: insuranceProduct?.id || insuranceProduct?.codigo || "PROD-SEGURO",
          codigo: insuranceProduct?.codigo || "SEG-001",
          nombre: `Seguro Escolar: ${fullName} (${cursoFmt})`,
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
        vendedor: formData.responsableVenta.trim() || currentUser?.nombre || "Caja Mostrador"
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

      // Buscador enriquecido
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const nom = (ins.estudianteNombre || "").toLowerCase();
        const a1 = (ins.apellido1 || "").toLowerCase();
        const a2 = (ins.apellido2 || "").toLowerCase();
        const n1 = (ins.nombre1 || "").toLowerCase();
        const n2 = (ins.nombre2 || "").toLowerCase();
        const doc = (ins.identificacion || ins.numeroDocumento || "").toLowerCase();
        const gra = (ins.grado || ins.curso || "").toString().toLowerCase();
        const tel = (ins.telefonoResponsable || "").toLowerCase();
        const ven = (ins.responsableVenta || ins.vendedor || "").toLowerCase();
        return (
          nom.includes(q) ||
          a1.includes(q) ||
          a2.includes(q) ||
          n1.includes(q) ||
          n2.includes(q) ||
          doc.includes(q) ||
          gra.includes(q) ||
          tel.includes(q) ||
          ven.includes(q)
        );
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

  // Constantes de diseño para la plantilla oficial FORMATO LUIS CARLOS GALAN 2027
  const galanMerges = [
    { s: { c: 0, r: 0 }, e: { c: 3, r: 0 } },
    { s: { c: 4, r: 0 }, e: { c: 9, r: 0 } },
    { s: { c: 0, r: 1 }, e: { c: 9, r: 1 } },
    { s: { c: 0, r: 2 }, e: { c: 2, r: 2 } },
    { s: { c: 4, r: 2 }, e: { c: 6, r: 2 } },
    { s: { c: 7, r: 2 }, e: { c: 9, r: 3 } },
    { s: { c: 0, r: 3 }, e: { c: 2, r: 3 } },
    { s: { c: 3, r: 3 }, e: { c: 6, r: 3 } }
  ];

  const galanCols = [
    { wch: 8 },  // ITEM
    { wch: 18 }, // APELLIDO 1
    { wch: 18 }, // APELLIDO 2
    { wch: 18 }, // NOMBRE 1
    { wch: 18 }, // NOMBRE 2
    { wch: 8 },  // SEXO
    { wch: 20 }, // TIPO DE DOCUMENTO (RC,TI,PPT,NES)
    { wch: 18 }, // NUMERO DE DOCUMENTO
    { wch: 20 }, // FECHA DE NACIMIENTO (DIA/MES/AÑO)
    { wch: 14 }, // CURSO (0 A 11)
    { wch: 22 }, // RESPONSABLE DE VENTA
    { wch: 14 }, // FECHA
    { wch: 22 }, // RESPONSABLE VERIFICACION
    { wch: 12 }, // INCLUSION
    { wch: 30 }  // OBSERVACIONES
  ];

  // Función constructora de hoja con el formato oficial del colegio
  const buildGalanWorksheet = (items, reportDateStr, sellerName) => {
    const headerRows = [
      ["POLIZA DE ACCIDENTES ESCOLARES  SOLIDARIA", null, null, null, "N° POLIZA: 994000001142"],
      ["INSTITUCION EDUCATIVA LUIS CARLOS GALAN SARMIENTO NIT 900.020.605-6"],
      ["VIGENCIA: 02/12/2026 HAST 02/12/2027", null, null, null, `FECHA: ${reportDateStr}`, null, null, "ALCASEGUROS CONSULTORES LTDA AGENCIA DE SEGUROS"],
      [`CANTIDAD: ${items.length}`, null, null, `RESPONSABLE: ${sellerName || "Caja Mostrador"}`],
      [
        "ITEM",
        "APELLIDO 1 ",
        "APELLIDO 2",
        "NOMBRE 1",
        "NOMBRE 2",
        "SEXO",
        "TIPO DE DOCUMENTO     (RC,TI,PPT,NES)",
        "NUMERO DE DOCUMENTO",
        "FECHA DE NACIMIENTO (DIA/MES/AÑO)",
        "CURSO  (0 A 11)",
        "RESPONSABLE DE VENTA ",
        "FECHA ",
        "RESPONSABLE VERIFICACION ",
        "INCLUSION",
        "OBSERVACIONES "
      ]
    ];

    const dataRows = items.map(item => {
      const numItem = globalSequenceMap[item.id] || "";
      let a1 = item.apellido1 || "";
      let a2 = item.apellido2 || "";
      let n1 = item.nombre1 || "";
      let n2 = item.nombre2 || "";

      if (!a1 && item.estudianteNombre) {
        const p = parseNombreCompleto(item.estudianteNombre);
        a1 = p.a1;
        a2 = p.a2;
        n1 = p.n1;
        n2 = p.n2;
      }

      // Fecha nacimiento en DIA/MES/AÑO
      let fnac = item.fechaNacimiento || "";
      if (fnac && fnac.includes("-")) {
        const parts = fnac.split("-");
        if (parts.length === 3) fnac = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }

      // Fecha venta en DIA/MES/AÑO
      let fvta = item.fechaVenta || "";
      if (!fvta && item.fechaRegistro) {
        fvta = item.fechaRegistro.split("T")[0];
      }
      if (fvta && fvta.includes("-")) {
        const parts = fvta.split("-");
        if (parts.length === 3) fvta = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }

      // Curso 0 a 11
      let cso = item.curso !== undefined && item.curso !== null && item.curso !== ""
        ? String(item.curso)
        : (item.grado !== undefined ? String(item.grado).replace(/\D/g, "") || "0" : "0");

      const obsExtra = [
        item.observaciones || "",
        item.telefonoResponsable ? `Tel: ${item.telefonoResponsable}` : ""
      ].filter(Boolean).join(" | ");

      return [
        numItem,
        (a1 || "").toUpperCase(),
        (a2 || "").toUpperCase(),
        (n1 || "").toUpperCase(),
        (n2 || "").toUpperCase(),
        (item.sexo || "M").toUpperCase(),
        (item.tipoDocumento || "TI").toUpperCase(),
        item.numeroDocumento || item.identificacion || "",
        fnac,
        cso,
        item.responsableVenta || item.vendedor || sellerName || "",
        fvta,
        item.responsableVerificacion || "",
        (item.inclusion || "NO").toUpperCase(),
        obsExtra
      ];
    });

    const aoa = [...headerRows, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!merges"] = galanMerges;
    ws["!cols"] = galanCols;
    return ws;
  };

  // EXPORTAR A EXCEL — sistema acumulativo por pestañas semanales (mismo archivo base oficial)
  const handleExportExcel = () => {
    const targetItems = selectedIds.size > 0 
      ? insurances.filter(s => selectedIds.has(s.id))
      : filteredInsurances;

    if (targetItems.length === 0) {
      alert("No hay ningún seguro escolar para exportar con los filtros actuales.");
      return;
    }

    // Obtener historial de hojas previas del localStorage
    let sheetsHistory = [];
    try {
      const saved = localStorage.getItem(EXCEL_HISTORY_KEY);
      if (saved) sheetsHistory = JSON.parse(saved);
      if (!Array.isArray(sheetsHistory)) sheetsHistory = [];
    } catch (_) { sheetsHistory = []; }

    // Calcular semana del reporte (ISO week label)
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // lunes
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // domingo
    const fmt = (d) => d.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit" });
    const weekLabel = `Sem_${fmt(startOfWeek)}-${fmt(endOfWeek)}`;
    const reportYear = now.getFullYear();
    const sheetName = `${weekLabel}_${reportYear}`.replace(/\//g, "-").slice(0, 31);
    const reportDateStr = now.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
    const currentSeller = currentUser?.nombre || "Caja Mostrador";

    // Ordenar los registros de esta semana por Nº Póliza global
    const sortedTargetItems = [...targetItems].sort((a, b) => 
      (globalSequenceMap[a.id] || 0) - (globalSequenceMap[b.id] || 0)
    );

    // Guardar en el historial la lista de registros de esta semana
    sheetsHistory = sheetsHistory.filter(s => s.name !== sheetName);
    sheetsHistory.push({
      name: sheetName,
      items: sortedTargetItems,
      date: reportDateStr,
      seller: currentSeller
    });
    if (sheetsHistory.length > 52) sheetsHistory = sheetsHistory.slice(-52);

    try { localStorage.setItem(EXCEL_HISTORY_KEY, JSON.stringify(sheetsHistory)); } catch (_) {}

    // Crear libro Excel con el formato oficial del Galán
    const workbook = XLSX.utils.book_new();

    // 1. Pestaña principal: "Histórico Total" (todos los seguros con formato oficial)
    const allSorted = [...insurances].sort((a, b) => 
      (globalSequenceMap[a.id] || 0) - (globalSequenceMap[b.id] || 0)
    );
    const summaryWs = buildGalanWorksheet(allSorted, reportDateStr, currentSeller);
    XLSX.utils.book_append_sheet(workbook, summaryWs, "Histórico Total");

    // 2. Pestaña de la semana actual y semanas históricas previas
    for (const sheet of sheetsHistory) {
      const sheetWs = buildGalanWorksheet(sheet.items || [], sheet.date || reportDateStr, sheet.seller || currentSeller);
      XLSX.utils.book_append_sheet(workbook, sheetWs, sheet.name);
    }

    const fileName = `FORMATO_LUIS_CARLOS_GALAN_${reportYear}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    // Guardar ids exportados y abrir modal de confirmación
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

        {/* Progreso de pólizas 1-152 */}
        <div style={{
          background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(109, 40, 217, 0.08) 100%)",
          border: "1px solid rgba(139, 92, 246, 0.3)",
          borderRadius: "16px",
          padding: "16px 18px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#a78bfa", textTransform: "uppercase" }}>
              🔢 Progreso de Pólizas
            </span>
            <span style={{ fontSize: "0.72rem", color: "#a78bfa", fontWeight: 800, fontFamily: "var(--font-mono)" }}>
              {totalVendidos}/{MAX_POLIZAS}
            </span>
          </div>
          <div style={{ marginTop: "8px", height: "6px", background: "rgba(139, 92, 246, 0.15)", borderRadius: "99px", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${Math.min(100, (totalVendidos / MAX_POLIZAS) * 100).toFixed(1)}%`,
              background: "linear-gradient(90deg, #8b5cf6, #a855f7)",
              borderRadius: "99px",
              transition: "width 0.5s ease"
            }} />
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
            {MAX_POLIZAS - totalVendidos} pólizas disponibles (de {MAX_POLIZAS} totales)
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
                <th style={{ padding: "12px 10px", width: "70px", textAlign: "center", color: "#a78bfa" }}>Nº Póliza</th>
                <th style={{ padding: "12px 14px" }}>Estudiante & Sexo</th>
                <th style={{ padding: "12px 14px" }}>Tipo & Documento</th>
                <th style={{ padding: "12px 14px" }}>Nacimiento</th>
                <th style={{ padding: "12px 14px" }}>Curso (0-11)</th>
                <th style={{ padding: "12px 14px" }}>WhatsApp / Acudiente</th>
                <th style={{ padding: "12px 14px" }}>Fecha Venta</th>
                <th style={{ padding: "12px 14px" }}>Estado Reporte</th>
                <th style={{ padding: "12px 14px", textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredInsurances.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: "48px 20px", textAlign: "center", color: "var(--text-muted)" }}>
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
                  const dateStr = ins.fechaVenta 
                    ? ins.fechaVenta
                    : (ins.fechaRegistro 
                        ? new Date(ins.fechaRegistro).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })
                        : "—");

                  const tipoDoc = ins.tipoDocumento || "TI";
                  const numDoc = ins.numeroDocumento || ins.identificacion || "—";
                  const cursoStr = ins.curso !== undefined && ins.curso !== null && ins.curso !== ""
                    ? (ins.curso === "0" ? "0 (Transición)" : `${ins.curso}°`)
                    : (ins.grado || "General");

                  let nacFmt = ins.fechaNacimiento || "";
                  if (nacFmt && nacFmt.includes("-")) {
                    const p = nacFmt.split("-");
                    if (p.length === 3) nacFmt = `${p[2]}/${p[1]}/${p[0]}`;
                  }
                  if (!nacFmt && ins.edad) {
                    nacFmt = `${ins.edad} años`;
                  }

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

                      {/* Nº Póliza global */}
                      <td style={{ padding: "10px 10px", textAlign: "center" }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          background: "rgba(139, 92, 246, 0.15)",
                          border: "1px solid rgba(139, 92, 246, 0.35)",
                          color: "#a78bfa",
                          fontWeight: 900,
                          fontSize: "0.78rem",
                          fontFamily: "var(--font-mono)"
                        }}>
                          {globalSequenceMap[ins.id] || "?"}
                        </span>
                      </td>

                      {/* Estudiante & Sexo */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ 
                            width: "32px", 
                            height: "32px", 
                            borderRadius: "50%", 
                            background: ins.sexo === "F" ? "rgba(236, 72, 153, 0.18)" : "rgba(13, 148, 136, 0.18)", 
                            color: ins.sexo === "F" ? "#f472b6" : "#2dd4bf",
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center",
                            fontSize: "0.85rem",
                            fontWeight: 800,
                            flexShrink: 0
                          }}>
                            {ins.sexo === "F" ? "F" : "M"}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: "var(--text-main)", textTransform: "uppercase" }}>
                              {ins.estudianteNombre}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                              {ins.inclusion === "SÍ" && (
                                <span style={{
                                  fontSize: "0.65rem",
                                  fontWeight: 800,
                                  background: "rgba(245, 158, 11, 0.2)",
                                  color: "#fbbf24",
                                  padding: "1px 5px",
                                  borderRadius: "4px"
                                }}>
                                  INCLUSIÓN
                                </span>
                              )}
                              {ins.observaciones && (
                                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                                  {ins.observaciones}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Tipo & Documento */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            fontSize: "0.7rem",
                            fontWeight: 800,
                            padding: "2px 5px",
                            borderRadius: "4px",
                            background: "rgba(255, 255, 255, 0.08)",
                            color: "var(--text-muted)"
                          }}>
                            {tipoDoc}
                          </span>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-main)" }}>
                            {numDoc}
                          </span>
                        </div>
                      </td>

                      {/* Nacimiento */}
                      <td style={{ padding: "12px 14px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {nacFmt || "—"}
                      </td>

                      {/* Curso */}
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{
                          padding: "3px 8px",
                          borderRadius: "6px",
                          background: "rgba(59, 130, 246, 0.15)",
                          color: "#93c5fd",
                          fontWeight: 700,
                          fontSize: "0.76rem"
                        }}>
                          {cursoStr}
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

      {/* ── MODAL: REGISTRAR / EDITAR SEGURO (FORMATO OFICIAL LUIS CARLOS GALÁN 2027) ── */}
      {isNewModalOpen && (
        <div className="modal-overlay" onClick={() => setIsNewModalOpen(false)} style={{ zIndex: 1200, padding: "16px" }}>
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
            {/* Header Liquid Glass con detalles oficiales */}
            <div style={{ 
              padding: "16px 22px", 
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
                      {editingInsurance ? "Editar Seguro Escolar" : "Registrar Seguro Escolar"}
                    </h3>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "4px 10px",
                      borderRadius: "8px",
                      fontSize: "0.76rem",
                      fontWeight: 800,
                      background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                      color: "#ffffff",
                      boxShadow: "0 2px 10px rgba(109, 40, 217, 0.4)",
                      letterSpacing: "0.02em",
                      fontFamily: "var(--font-mono)"
                    }}>
                      🛡️ Póliza #{editingInsurance ? (globalSequenceMap[editingInsurance.id] || "—") : (totalVendidos + 1)} de {MAX_POLIZAS}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", display: "block", marginTop: "2px" }}>
                    I.E. Luis Carlos Galán Sarmiento • Póliza Solidaria N° 994000001142
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

            {/* Formulario con scroll independiente */}
            <form onSubmit={handleSaveSubmit} style={{ padding: "20px 22px", overflowY: "auto", flex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                
                {/* ── SECCIÓN 1: DATOS DEL ESTUDIANTE (REQUERIDOS POR LA ASEGURADORA) ── */}
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

                  {/* Fila Sexo, Tipo de Documento y Número con espaciado amplio y padding anticolisión */}
                  <div style={{ display: "grid", gridTemplateColumns: "105px 190px 1fr", gap: "10px", marginBottom: "10px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                        Sexo *:
                      </label>
                      <select
                        className="form-select"
                        value={formData.sexo}
                        onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "9px 28px 9px 10px",
                          borderRadius: "10px",
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-tertiary)",
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
                        className="form-select"
                        value={formData.tipoDocumento}
                        onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "9px 34px 9px 12px",
                          borderRadius: "10px",
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-tertiary)",
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
                        className="form-select"
                        value={formData.curso}
                        onChange={(e) => setFormData({ ...formData, curso: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "8px 32px 8px 12px",
                          borderRadius: "10px",
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-tertiary)",
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

                {/* ── SECCIÓN 2: CONTROL DE VENTA & VERIFICACIÓN (COLUMNAS EXCEL) ── */}
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
                        className="form-select"
                        value={formData.inclusion}
                        onChange={(e) => setFormData({ ...formData, inclusion: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "8px 28px 8px 10px",
                          borderRadius: "10px",
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-tertiary)",
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

                {/* ── SECCIÓN 3: CONTACTO ACUDIENTE & CAJA POS ── */}
                <div style={{
                  background: "rgba(16, 185, 129, 0.05)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  borderRadius: "16px",
                  padding: "16px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                    <Phone size={16} color="#34d399" />
                    <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                      3. Contacto Acudiente & Caja POS
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
                        Precio Póliza (COP):
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

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", alignItems: "center" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                        Método de Pago:
                      </label>
                      <select
                        className="form-select"
                        value={formData.metodoPago}
                        onChange={(e) => setFormData({ ...formData, metodoPago: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "8px 30px 8px 10px",
                          borderRadius: "10px",
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-tertiary)",
                          color: "var(--text-main)",
                          fontSize: "0.84rem",
                          cursor: "pointer"
                        }}
                      >
                        <option value="Efectivo">Efectivo</option>
                        <option value="Nequi">Nequi</option>
                        <option value="Daviplata">Daviplata</option>
                        <option value="Transferencia">Transferencia</option>
                      </select>
                    </div>

                    {!editingInsurance && (
                      <div style={{
                        marginTop: "14px",
                        padding: "8px 12px",
                        borderRadius: "10px",
                        background: "rgba(16, 185, 129, 0.12)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}>
                        <input
                          type="checkbox"
                          id="cobrarCajaCheckModal"
                          checked={formData.cobrarEnCaja}
                          onChange={(e) => setFormData({ ...formData, cobrarEnCaja: e.target.checked })}
                          style={{ cursor: "pointer", width: "16px", height: "16px" }}
                        />
                        <label htmlFor="cobrarCajaCheckModal" style={{ fontSize: "0.76rem", color: "var(--text-main)", cursor: "pointer", fontWeight: 700 }}>
                          Registrar cobro en Caja POS (arqueo)
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Observaciones */}
                  <div style={{ marginTop: "10px" }}>
                    <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                      Observaciones adicionales:
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
                  onClick={() => setIsNewModalOpen(false)}
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
                    fontSize: "0.85rem"
                  }}
                >
                  {editingInsurance ? "Guardar Cambios" : "Registrar Póliza 🛡️"}
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
