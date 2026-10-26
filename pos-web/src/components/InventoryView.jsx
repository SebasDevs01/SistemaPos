import React, { useState, useMemo, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Barcode, 
  Layers, 
  Package, 
  Check, 
  AlertCircle, 
  Tag, 
  ArrowUpDown,
  Sparkles,
  Image as ImageIcon,
  FileSpreadsheet,
  AlertTriangle,
  Share2,
  Copy,
  CheckCircle2,
  X,
  TrendingDown,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  History
} from "lucide-react";
import * as XLSX from "xlsx";
import { getProductImage } from "../data/initialData";
import ProductEditModal from "./ProductEditModal";
import PriceAuditModal from "./PriceAuditModal";
import { recordPriceChange } from "../services/auditService";
import { 
  fetchMermas, 
  saveMerma, 
  deleteMermaById, 
  clearAllMermas, 
  subscribeToMermas 
} from "../services/firestoreService";

export default function InventoryView({ 
  products, 
  onSaveProduct, 
  onDeleteProduct, 
  onSelectForBarcode,
  currentUser,
  storeConfig = {}
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [sortBy, setSortBy] = useState("creation_desc");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isPriceAuditOpen, setIsPriceAuditOpen] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Estado de Mermas (bajas de inventario persistentes en Firestore y local)
  const [isMermasModalOpen, setIsMermasModalOpen] = useState(false);
  const MERMAS_KEY = "pos_mermas_log";
  const [mermasList, setMermasList] = useState(() => {
    try { 
      const local = localStorage.getItem(MERMAS_KEY) || sessionStorage.getItem(MERMAS_KEY);
      return local ? JSON.parse(local) : []; 
    } catch { return []; }
  });
  const [mermaForm, setMermaForm] = useState({ productoId: "", cantidad: 1, motivo: "" });
  const MOTIVOS_MERMA = ["Producto vencido", "Rotura / dañado", "Robo / hurto", "Producto perdido", "Error de inventario", "Muestra gratis", "Otro"];

  useEffect(() => {
    fetchMermas().then(list => {
      if (list && list.length > 0) setMermasList(list);
    }).catch(() => {});

    const unsub = subscribeToMermas((list) => {
      if (Array.isArray(list)) setMermasList(list);
    });
    return () => unsub && unsub();
  }, []);

  const handleAddMerma = async (e) => {
    e.preventDefault();
    if (!mermaForm.productoId) { alert("Selecciona el producto afectado."); return; }
    if (!mermaForm.cantidad || Number(mermaForm.cantidad) <= 0) { alert("Ingresa una cantidad válida."); return; }
    if (!mermaForm.motivo) { alert("Indica el motivo de la baja."); return; }
    const prod = products.find(p => (p.id || p.codigo) === mermaForm.productoId);
    const entry = {
      id: `MRM-${Date.now()}`,
      fecha: new Date().toISOString(),
      productoId: mermaForm.productoId,
      nombreProducto: prod?.nombre || mermaForm.productoId,
      codigoProducto: prod?.codigo || "",
      categoria: prod?.categoria || "",
      cantidad: Number(mermaForm.cantidad),
      motivo: mermaForm.motivo
    };
    
    // Guardado persistente inmediato en Firestore y local
    setMermasList(prev => [entry, ...prev.filter(m => m.id !== entry.id)]);
    saveMerma(entry).catch(console.warn);
    setMermaForm({ productoId: "", cantidad: 1, motivo: "" });

    // Descontar del inventario si el admin quiere
    if (confirm(`¿Deseas descontar ${mermaForm.cantidad} unidad(es) del inventario de "${prod?.nombre}"?`)) {
      const updatedProd = { ...prod, stock: Math.max(0, (Number(prod?.stock) || 0) - Number(mermaForm.cantidad)) };
      onSaveProduct(updatedProd, prod?.id || prod?.codigo);
    }
  };

  const handleDeleteMerma = (mermaId) => {
    setMermasList(prev => prev.filter(m => m.id !== mermaId));
    deleteMermaById(mermaId).catch(console.warn);
  };

  const handleClearAllMermas = () => {
    if (confirm("¿Borrar todo el historial de mermas registrado en el sistema?")) {
      setMermasList([]);
      clearAllMermas().catch(console.warn);
    }
  };

  const handleExportMermasWhatsApp = () => {
    if (mermasList.length === 0) return;
    const dateStr = new Date().toLocaleDateString("es-CO", { dateStyle: "long" });
    const lines = [
      `📋 *REGISTRO DE MERMAS / BAJAS — ${storeConfig?.nombre || "Miscelánea María José"}*`,
      `📅 Fecha: ${dateStr}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ...mermasList.map((m, i) => {
        const d = new Date(m.fecha).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
        return `${i+1}. [${d}] *${m.nombreProducto}* — ${m.cantidad} unid(s) — Motivo: ${m.motivo}`;
      }),
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Total bajas registradas: ${mermasList.length}`
    ];
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  };

  // Código automático secuencial estable (NO usa random)
  const stableAutoCode = useMemo(() => {
    let max = 1000;
    products.forEach(p => {
      const n = parseInt(String(p.codigo || '').trim(), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return String(max + 1);
  }, [products]);

  const isAdmin = currentUser?.rol === "Administrador";

  // Cálculo de stock total considerando variantes (Bolsas, Cordones, Ropa, Chancletas, etc.)
  const getProductStockTotal = (p) => {
    if (p.stockIlimitado || p.categoria === "Cintas") return 99999;
    if (p.stockPorVariante && Object.keys(p.stockPorVariante).length > 0) {
      return Object.values(p.stockPorVariante).reduce((sum, v) => sum + Number(v || 0), 0);
    }
    return Number(p.stock || 0);
  };

  // Contadores para badges de Sin Stock y Bajo Stock
  const sinStockCount = useMemo(() => {
    return products.filter(p => !p.stockIlimitado && p.categoria !== "Cintas" && getProductStockTotal(p) <= 0).length;
  }, [products]);

  const bajoStockCount = useMemo(() => {
    return products.filter(p => !p.stockIlimitado && p.categoria !== "Cintas" && getProductStockTotal(p) > 0 && getProductStockTotal(p) <= 3).length;
  }, [products]);

  // Productos con stock bajo o agotados para reponer (menor o igual a 3)
  const lowStockProducts = useMemo(() => {
    return products.filter(p => !p.stockIlimitado && p.categoria !== "Cintas" && p.categoria !== "Alquiler" && getProductStockTotal(p) <= 3);
  }, [products]);

  // Exportar inventario completo a Excel (.xlsx)
  const handleExportExcel = () => {
    if (products.length === 0) {
      alert("No hay productos en inventario para exportar.");
      return;
    }
    const data = products.map(p => ({
      "Código": p.codigo || "",
      "Nombre Producto": p.nombre || "",
      "Sección": p.categoria || "",
      "Stock Actual": Number(p.stock) || 0,
      "Precio Unidad ($ COP)": Number(p.precio) || 0,
      "Permite Paquete": p.permitePaquete ? "SI" : "NO",
      "Unidades x Paquete": p.permitePaquete ? (p.unidadesPorPaquete || 10) : "-",
      "Precio Paquete ($ COP)": p.permitePaquete ? (p.precioPaquete || 0) : "-",
      "Valor Total Inventario ($)": (Number(p.stock) || 0) * (Number(p.precio) || 0)
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");
    XLSX.writeFile(workbook, `Inventario_Diana_Sharith_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Copiar lista de pedido al portapapeles
  const handleCopySupplierList = () => {
    if (lowStockProducts.length === 0) return;
    const dateStr = new Date().toLocaleDateString("es-CO", { dateStyle: "long" });
    const lines = [
      `📋 *LISTA DE PEDIDO / REPOSICIÓN — ${storeConfig?.nombre || "Miscelánea María José"}*`,
      `📅 Fecha: ${dateStr}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`
    ];

    lowStockProducts.forEach((p, i) => {
      const stockText = Number(p.stock) === 0 ? "AGOTADO (0 unids)" : `${p.stock} unids restantes`;
      lines.push(`${i + 1}. *${p.nombre}* [Cód: ${p.codigo}] (${p.categoria}) — ${stockText}`);
    });

    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`Total de artículos a reponer: ${lowStockProducts.length}`);

    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 3000);
  };

  // Enviar lista de pedido por WhatsApp
  const handleSendWhatsAppSupplierList = () => {
    if (lowStockProducts.length === 0) return;
    const dateStr = new Date().toLocaleDateString("es-CO", { dateStyle: "long" });
    const lines = [
      `📋 *LISTA DE PEDIDO / REPOSICIÓN — ${storeConfig?.nombre || "Miscelánea María José"}*`,
      `📅 Fecha: ${dateStr}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`
    ];

    lowStockProducts.forEach((p, i) => {
      const stockText = Number(p.stock) === 0 ? "AGOTADO (0 unids)" : `${p.stock} unids restantes`;
      lines.push(`${i + 1}. *${p.nombre}* [Cód: ${p.codigo}] (${p.categoria}) — ${stockText}`);
    });

    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`Total de artículos a reponer: ${lowStockProducts.length}`);

    const text = lines.join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const categories = [
    "Todos",
    "🚨 Sin Stock",
    "⚠️ Bajo Stock (≤ 3)",
    "🎁 Bolsas de Regalo",
    "🎗️ Cintas",
    "👟 Cordones",
    "💄 Belleza",
    "💍 Bisutería",
    "📓 Cuadernos",
    "🍬 Dulcería",
    "🩴 Chancletas",
    "✏️ Papelería",
    "🗑️ Desechables",
    "👕 Ropa",
    "🧸 Juguetería",
    "🪑 Alquiler",
    "🛡️ Seguros"
  ];

  // Mapa de categorías para filtrado (emoji → nombre real en Firestore)
  const categoryFilterMap = {
    "🎁 Bolsas de Regalo": "Bolsas de Regalo",
    "🛍️ Bolsas de Regalo": "Bolsas de Regalo",
    "🎗️ Cintas": "Cintas",
    "👟 Cordones": "Cordones",
    "💄 Belleza": "Belleza",
    "💍 Bisutería": "Bisutería",
    "📓 Cuadernos": "Cuadernos",
    "🍬 Dulcería": "Dulcería",
    "🩴 Chancletas": "Chancletas",
    "✏️ Papelería": "Papelería",
    "🗑️ Desechables": "Desechables",
    "👕 Ropa": "Ropa",
    "🧸 Juguetería": "Juguetería",
    "🪑 Alquiler": "Alquiler",
    "🛡️ Seguros": "Seguros"
  };

  // Abrir modal de creación o edición usando ProductEditModal
  const handleOpenModal = (prod = null) => {
    setEditingProduct(prod || null);
    setIsModalOpen(true);
  };

  // Timestamp determinista de creación de cada producto (definido antes de useMemo para ordenamiento)
  const getProductCreationTime = (prod) => {
    if (prod.createdAt) {
      const t = new Date(prod.createdAt).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (prod.fechaCreacion) {
      const t = new Date(prod.fechaCreacion).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (prod.seededAt) {
      const t = new Date(prod.seededAt).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    const baseLegacyTime = 1704067200000;
    const numId = Number(prod.legacyId);
    if (!isNaN(numId) && numId > 0) {
      return baseLegacyTime + (numId * 60000);
    }
    const idx = products.indexOf(prod);
    return baseLegacyTime + ((idx >= 0 ? idx + 1 : 999) * 60000);
  };

  // Filtrado memoizado para alto rendimiento (evita recalcular en renders no relacionados)
  const filtered = useMemo(() => {
    return products.filter(p => {
      let matchesCat = true;
      if (selectedCategory === "🚨 Sin Stock") {
        const isUnlimited = p.stockIlimitado || p.categoria === "Cintas";
        matchesCat = !isUnlimited && getProductStockTotal(p) <= 0;
      } else if (selectedCategory === "⚠️ Bajo Stock (≤ 3)") {
        const isUnlimited = p.stockIlimitado || p.categoria === "Cintas";
        matchesCat = !isUnlimited && getProductStockTotal(p) > 0 && getProductStockTotal(p) <= 3;
      } else if (selectedCategory !== "Todos") {
        const realCat = categoryFilterMap[selectedCategory] || selectedCategory;
        matchesCat = String(p.categoria || "").trim().toLowerCase() === realCat.toLowerCase();
      }

      if (!matchesCat) return false;

      if (!searchTerm.trim()) return true;
      const query = searchTerm.toLowerCase().trim();
      return (
        p.nombre?.toLowerCase().includes(query) || 
        String(p.codigo || "").toLowerCase().includes(query)
      );
    });
  }, [products, selectedCategory, searchTerm]);

  // Ordenamiento memoizado
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === "creation_desc") {
        return getProductCreationTime(b) - getProductCreationTime(a);
      }
      if (sortBy === "creation_asc") {
        return getProductCreationTime(a) - getProductCreationTime(b);
      }
      if (sortBy === "code_asc") {
        return String(a.codigo || "").localeCompare(String(b.codigo || ""), undefined, { numeric: true });
      }
      if (sortBy === "code_desc") {
        return String(b.codigo || "").localeCompare(String(a.codigo || ""), undefined, { numeric: true });
      }
      if (sortBy === "name_asc") {
        return (a.nombre || "").localeCompare(b.nombre || "");
      }
      if (sortBy === "name_desc") {
        return (b.nombre || "").localeCompare(a.nombre || "");
      }
      if (sortBy === "stock_desc") {
        return (Number(b.stock) || 0) - (Number(a.stock) || 0);
      }
      if (sortBy === "stock_asc") {
        return (Number(a.stock) || 0) - (Number(b.stock) || 0);
      }
      if (sortBy === "price_desc") {
        return (Number(b.precio) || 0) - (Number(a.precio) || 0);
      }
      if (sortBy === "price_asc") {
        return (Number(a.precio) || 0) - (Number(b.precio) || 0);
      }
      return 0;
    });
  }, [filtered, sortBy, products]);

  // Paginación ágil y fluida
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchTerm, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedProducts = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safeCurrentPage, pageSize]);



  return (
    <div style={{ maxWidth: "1600px", margin: "0 auto", padding: "16px" }}>
      {/* Cabecera */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "16px",
        flexWrap: "wrap",
        gap: "12px"
      }}>
        <div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "10px" }}>
            <Package size={26} color="var(--accent-blue)" />
            Inventario Multisección con Fotos
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Control de existencias, venta por unidad o paquete 📦, tallas y fotografías de producto.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          {/* Botón Lista para Proveedor */}
          <button
            type="button"
            onClick={() => setIsSupplierModalOpen(true)}
            className="btn btn-outline"
            style={{
              padding: "8px 14px",
              fontSize: "0.85rem",
              borderRadius: "10px",
              color: lowStockProducts.length > 0 ? "var(--neon-amber, #fbbf24)" : "var(--text-muted)",
              borderColor: lowStockProducts.length > 0 ? "rgba(245, 158, 11, 0.4)" : "var(--border-color)",
              background: lowStockProducts.length > 0 ? "rgba(245, 158, 11, 0.08)" : "transparent"
            }}
            title="Ver productos con existencias críticas o agotadas para hacer pedido a distribuidores"
          >
            <AlertTriangle size={15} />
            <span>Por Reponer ({lowStockProducts.length})</span>
          </button>

          {/* Botón Exportar a Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="btn btn-outline"
            style={{
              padding: "8px 14px",
              fontSize: "0.85rem",
              borderRadius: "10px",
              color: "var(--neon-emerald, #34d399)",
              borderColor: "rgba(52, 211, 153, 0.35)",
              background: "rgba(52, 211, 153, 0.06)"
            }}
            title="Descargar catálogo completo en archivo Excel (.xlsx)"
          >
            <FileSpreadsheet size={15} />
            <span>Exportar Excel</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsPriceAuditOpen(true)}
              className="btn btn-outline"
              style={{
                padding: "8px 14px",
                fontSize: "0.85rem",
                borderRadius: "10px",
                color: "#6366f1",
                borderColor: "rgba(99, 102, 241, 0.35)",
                background: "rgba(99, 102, 241, 0.06)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
              title="Ver auditoría e historial de cambios en precios y costos de productos"
            >
              <History size={15} />
              <span>Historial Precios</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => handleOpenModal()}
              className="btn btn-primary"
              style={{ padding: "8px 16px", fontSize: "0.88rem", borderRadius: "10px" }}
            >
              <Plus size={17} />
              <span>Nuevo Producto</span>
            </button>
          )}

          {/* Botón Mermas */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsMermasModalOpen(true)}
              className="btn btn-outline"
              style={{
                padding: "8px 14px",
                fontSize: "0.85rem",
                borderRadius: "10px",
                color: mermasList.length > 0 ? "#f87171" : "var(--text-muted)",
                borderColor: mermasList.length > 0 ? "rgba(239, 68, 68, 0.4)" : "var(--border-color)",
                background: mermasList.length > 0 ? "rgba(239, 68, 68, 0.06)" : "transparent"
              }}
              title="Registrar bajas, mermas o pérdidas de inventario"
            >
              <TrendingDown size={15} />
              <span>Mermas ({mermasList.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Barra de Filtros, Búsqueda y Ordenamiento */}
      <div className="glass-panel" style={{ padding: "14px 18px", marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", marginBottom: "12px" }}>
          {/* Buscador */}
          <div style={{ position: "relative", flex: "1 1 300px" }}>
            <Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              className="input-field"
              placeholder="Buscar por nombre, código de barras o referencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: "42px", width: "100%" }}
            />
          </div>

          {/* Selector de Ordenamiento */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            <ArrowUpDown size={16} color="var(--accent-blue)" />
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              Ordenar:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-field"
              style={{
                padding: "8px 12px",
                fontSize: "0.82rem",
                borderRadius: "10px",
                minWidth: "250px",
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              <option value="creation_desc">🕒 Recién creados primero (Más nuevo al inicio)</option>
              <option value="creation_asc">📅 Primeros creados primero (Más antiguo al inicio)</option>
              <option value="code_asc">🔢 Código: Menor a Mayor (1 → 9)</option>
              <option value="code_desc">🔢 Código: Mayor a Menor (9 → 1)</option>
              <option value="name_asc">🔤 Nombre: A → Z</option>
              <option value="name_desc">🔤 Nombre: Z → A</option>
              <option value="stock_desc">📦 Mayor Stock disponible</option>
              <option value="stock_asc">⚠️ Menor Stock (por agotarse)</option>
              <option value="price_desc">💰 Mayor Precio</option>
              <option value="price_asc">💵 Menor Precio</option>
            </select>
          </div>
        </div>

        {/* Categorías */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingTop: "6px", paddingBottom: "6px", paddingLeft: "4px", paddingRight: "4px" }}>
          {categories.map(cat => {
            const isSinStock = cat.includes("Sin Stock");
            const isBajoStock = cat.includes("Bajo Stock");
            const isSelected = selectedCategory === cat;

            let activeColor = "var(--accent-blue, #3b82f6)";
            let activeBg = "rgba(59, 130, 246, 0.2)";
            let activeBorder = "1px solid var(--accent-blue, #3b82f6)";
            let defaultBorder = "1px solid var(--border-color)";
            let defaultBg = "transparent";
            let defaultColor = "var(--text-muted)";

            if (isSinStock) {
              activeColor = "#ef4444";
              activeBg = "rgba(239, 68, 68, 0.2)";
              activeBorder = "1px solid #ef4444";
              defaultBorder = "1px solid rgba(239, 68, 68, 0.35)";
              defaultBg = "rgba(239, 68, 68, 0.06)";
              defaultColor = "#f87171";
            } else if (isBajoStock) {
              activeColor = "#f59e0b";
              activeBg = "rgba(245, 158, 11, 0.2)";
              activeBorder = "1px solid #f59e0b";
              defaultBorder = "1px solid rgba(245, 158, 11, 0.35)";
              defaultBg = "rgba(245, 158, 11, 0.06)";
              defaultColor = "#fbbf24";
            }

            return (
              <button
                key={cat}
                type="button"
                className={`category-pill-filter ${isSelected ? "category-pill-active" : ""}`}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-full)",
                  border: isSelected ? activeBorder : defaultBorder,
                  background: isSelected ? activeBg : defaultBg,
                  color: isSelected ? activeColor : defaultColor,
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.2s"
                }}
              >
                <span>{cat}</span>
                {isSinStock && (
                  <span
                    className="category-pill-count count-sin-stock"
                    style={{
                      fontSize: "0.72rem",
                      padding: "1px 7px",
                      borderRadius: "10px",
                      background: isSelected ? "#ef4444" : "rgba(239, 68, 68, 0.25)",
                      color: isSelected ? "#fff" : "#fca5a5",
                      fontWeight: 800
                    }}
                  >
                    {sinStockCount}
                  </span>
                )}
                {isBajoStock && (
                  <span
                    className="category-pill-count count-bajo-stock"
                    style={{
                      fontSize: "0.72rem",
                      padding: "1px 7px",
                      borderRadius: "10px",
                      background: isSelected ? "#f59e0b" : "rgba(245, 158, 11, 0.25)",
                      color: isSelected ? "#fff" : "#fcd34d",
                      fontWeight: 800
                    }}
                  >
                    {bajoStockCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabla de Productos con Imagen */}
      <div className="glass-panel" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-color)", background: "rgba(0, 0, 0, 0.1)" }}>
              <th style={{ padding: "12px 14px", color: "var(--text-muted)", fontWeight: 700 }}>Foto</th>
              <th 
                onClick={() => setSortBy(prev => prev === "code_asc" ? "code_desc" : "code_asc")}
                style={{ padding: "12px 14px", color: "var(--text-muted)", fontWeight: 700, cursor: "pointer", userSelect: "none" }}
                title="Haga clic para ordenar por Código"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>Código</span>
                  <ArrowUpDown size={12} color={sortBy.startsWith("code") ? "var(--accent-blue)" : "var(--text-muted)"} />
                </div>
              </th>
              <th 
                onClick={() => setSortBy(prev => prev === "name_asc" ? "name_desc" : "name_asc")}
                style={{ padding: "12px 14px", color: "var(--text-muted)", fontWeight: 700, cursor: "pointer", userSelect: "none" }}
                title="Haga clic para ordenar por Nombre"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>Producto</span>
                  <ArrowUpDown size={12} color={sortBy.startsWith("name") ? "var(--accent-blue)" : "var(--text-muted)"} />
                </div>
              </th>
              <th style={{ padding: "12px 14px", color: "var(--text-muted)", fontWeight: 700 }}>Sección</th>
              <th 
                onClick={() => setSortBy(prev => prev === "stock_desc" ? "stock_asc" : "stock_desc")}
                style={{ padding: "12px 14px", color: "var(--text-muted)", fontWeight: 700, cursor: "pointer", userSelect: "none" }}
                title="Haga clic para ordenar por Stock"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>Stock</span>
                  <ArrowUpDown size={12} color={sortBy.startsWith("stock") ? "var(--accent-blue)" : "var(--text-muted)"} />
                </div>
              </th>
              <th 
                onClick={() => setSortBy(prev => prev === "price_desc" ? "price_asc" : "price_desc")}
                style={{ padding: "12px 14px", color: "var(--text-muted)", fontWeight: 700, cursor: "pointer", userSelect: "none" }}
                title="Haga clic para ordenar por Precio"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>Precio Unidad</span>
                  <ArrowUpDown size={12} color={sortBy.startsWith("price") ? "var(--accent-blue)" : "var(--text-muted)"} />
                </div>
              </th>
              <th style={{ padding: "12px 14px", color: "var(--text-muted)", fontWeight: 700 }}>Paquete 📦</th>
              <th style={{ padding: "12px 14px", color: "var(--text-muted)", fontWeight: 700 }}>Tallas</th>
              <th style={{ padding: "12px 14px", color: "var(--text-muted)", fontWeight: 700, textAlign: "right" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "48px 20px" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "2.2rem" }}>
                      {selectedCategory === "👟 Cordones" ? "👟" : selectedCategory === "🎗️ Cintas" ? "🎗️" : selectedCategory === "🎁 Bolsas de Regalo" ? "🎁" : "📦"}
                    </span>
                    <p style={{ color: "var(--text-main)", fontSize: "0.95rem", fontWeight: 700, margin: 0 }}>
                      No hay productos registrados en {selectedCategory === "Todos" ? "el inventario" : `"${selectedCategory}"`}.
                    </p>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: 0 }}>
                      {searchTerm ? "Prueba a cambiar el término de búsqueda o quitar los filtros." : "Puedes crear el primer artículo para esta categoría ahora mismo."}
                    </p>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleOpenModal()}
                        className="btn btn-primary"
                        style={{ marginTop: "8px", padding: "8px 18px", borderRadius: "10px", fontSize: "0.86rem", fontWeight: 700 }}
                      >
                        <Plus size={16} />
                        <span>Crear Producto {selectedCategory !== "Todos" && categoryFilterMap[selectedCategory] ? `en ${categoryFilterMap[selectedCategory]}` : ""}</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedProducts.map((prod, idx) => (
                <tr 
                  key={`${prod.codigo}-${prod.legacyId || idx}`}
                  style={{ 
                    borderBottom: "1px solid var(--border-color)",
                    transition: "background 0.15s"
                  }}
                >
                  {/* Thumbnail de Imagen */}
                  <td style={{ padding: "10px 14px", width: "64px", minWidth: "64px" }}>
                    <div style={{
                      width: "44px",
                      height: "44px",
                      minWidth: "44px",
                      maxWidth: "44px",
                      borderRadius: "8px",
                      overflow: "hidden",
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-color)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <img
                        src={getProductImage(prod)}
                        alt={prod.nombre}
                        loading="lazy"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block"
                        }}
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=400&auto=format&fit=crop&q=60";
                        }}
                      />
                    </div>
                  </td>

                  <td style={{ padding: "10px 14px" }}>
                    <span className="badge badge-blue font-mono" style={{ fontSize: "0.72rem" }}>
                      {prod.codigo}
                    </span>
                  </td>

                  <td style={{ padding: "10px 14px", fontWeight: 700, color: "var(--text-main)" }}>
                    <div>{prod.nombre}</div>
                    {(prod.tipoArticulo || ((prod.categoria === "Chancletas" || prod.categoria === "Ropa") && prod.subcategoria)) && (
                      <span style={{
                        fontSize: "0.7rem",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        background: prod.categoria === "Chancletas" ? "rgba(245, 158, 11, 0.15)" : "rgba(139, 92, 246, 0.15)",
                        color: prod.categoria === "Chancletas" ? "#fbbf24" : "#c084fc",
                        fontWeight: 700,
                        display: "inline-block",
                        marginTop: "2px"
                      }}>
                        {prod.categoria === "Chancletas" ? "🩴" : "👕"} {prod.tipoArticulo || prod.subcategoria}
                      </span>
                    )}
                  </td>

                  <td style={{ padding: "10px 14px" }}>
                    <span className="badge" style={{
                      background: "rgba(99, 102, 241, 0.12)",
                      color: "var(--text-main)",
                      border: "1px solid var(--border-color)",
                      fontSize: "0.72rem"
                    }}>
                      {prod.categoria}
                    </span>
                  </td>

                  <td style={{ padding: "10px 14px" }}>
                    {(() => {
                      const isUnlimited = prod.categoria === "Cintas" || prod.stockIlimitado;
                      const isCordon = prod.categoria === "Cordones" || prod.unidadMedida === "par";
                      const totalStock = isUnlimited ? 99999 : (
                        (prod.stockPorVariante && Object.keys(prod.stockPorVariante).length > 0)
                          ? Object.values(prod.stockPorVariante).reduce((sum, v) => sum + Number(v || 0), 0)
                          : (Number(prod.stock) || 0)
                      );
                      return (
                        <span style={{
                          fontWeight: 800,
                          color: isUnlimited ? "#34d399" : (totalStock <= 0 ? "var(--neon-rose)" : totalStock <= 3 ? "var(--neon-amber)" : "var(--neon-emerald)")
                        }}>
                          {isUnlimited ? "∞ Ilimitado (m)" : isCordon ? `${totalStock} pares` : `${totalStock} unids`}
                        </span>
                      );
                    })()}
                  </td>

                  <td style={{ padding: "10px 14px" }}>
                    {(() => {
                      const isCordon = prod.categoria === "Cordones" || prod.unidadMedida === "par";
                      const allPrices = [
                        ...(prod.preciosPorVariante ? Object.values(prod.preciosPorVariante) : []),
                        ...(prod.precioPorGenero ? Object.values(prod.precioPorGenero) : [])
                      ].map(Number).filter(v => !isNaN(v) && v > 0);

                      const baseP = Number(prod.precio) || 0;
                      const validPrices = allPrices.length > 0 ? allPrices : (baseP > 0 ? [baseP] : []);

                      let priceStr = "$0";
                      let hasRange = false;

                      if (validPrices.length > 0) {
                        const minP = Math.min(...validPrices);
                        const maxP = Math.max(...validPrices);
                        if (minP === maxP) {
                          priceStr = `$${minP.toLocaleString()}`;
                        } else {
                          priceStr = `$${minP.toLocaleString()} - $${maxP.toLocaleString()}`;
                          hasRange = true;
                        }
                      } else if (baseP > 0) {
                        priceStr = `$${baseP.toLocaleString()}${(prod.categoria === "Cintas" || prod.ventaPorMetro) ? " /m" : isCordon ? " /par" : ""}`;
                      }

                      return (
                        <span className="price-tag" style={{ color: "var(--text-main)", fontSize: hasRange ? '0.78rem' : undefined }}>
                          {priceStr}
                        </span>
                      );
                    })()}
                  </td>

                  <td style={{ padding: "10px 14px" }}>
                    {(prod.categoria === "Cintas" || prod.ventaPorMetro) ? (
                      <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", fontSize: "0.72rem", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                        ✂️ Venta x Metro
                      </span>
                    ) : prod.categoria === "Cordones" ? (
                      <span className="badge" style={{ background: "rgba(249, 115, 22, 0.15)", color: "#fb923c", fontSize: "0.72rem", border: "1px solid rgba(249, 115, 22, 0.3)" }}>
                        👟 Venta x Par
                      </span>
                    ) : prod.categoria === "Bolsas de Regalo" ? (
                      <span className="badge" style={{ background: "rgba(236, 72, 153, 0.15)", color: "#f472b6", fontSize: "0.72rem", border: "1px solid rgba(236, 72, 153, 0.3)" }}>
                        🎁 {prod.subcategoria || "Variantes"}
                      </span>
                    ) : (prod.categoria === "Chancletas" || prod.categoria === "Ropa") ? (
                      <span className="badge" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", fontSize: "0.72rem", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
                        {prod.categoria === "Chancletas" ? "🩴" : "👕"} Tallas x Género
                      </span>
                    ) : prod.permitePaquete ? (
                      <div>
                        <span className="badge badge-purple" style={{ fontSize: "0.68rem" }}>
                          x{prod.unidadesPorPaquete || 10} unids
                        </span>
                        <div className="price-tag" style={{ color: "var(--neon-violet)", fontSize: "0.8rem", marginTop: "2px" }}>
                          ${Number(prod.precioPaquete).toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>Solo Unidad</span>
                    )}
                  </td>

                  <td style={{ padding: "10px 14px" }}>
                    {prod.tallasPorGenero && Object.keys(prod.tallasPorGenero).length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxWidth: "180px" }}>
                        {Object.entries(prod.tallasPorGenero).map(([g, tArr]) => (
                          <div key={g} style={{ display: "flex", alignItems: "center", gap: "3px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "0.62rem", padding: "1px 4px", borderRadius: "4px", background: "rgba(245, 158, 11, 0.18)", color: "#fbbf24", fontWeight: 800 }}>
                              {g === "Niño" ? "👦" : g === "Niña" ? "👧" : g === "Mujer" ? "👩" : "👨"} {g}:
                            </span>
                            {tArr.map(t => (
                              <span key={t} className="badge badge-amber" style={{ fontSize: "0.65rem", padding: "1px 4px" }}>
                                {t}
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>
                    ) : prod.tallas && prod.tallas.length > 0 ? (
                      <div style={{ display: "flex", gap: "3px", flexWrap: "wrap", maxWidth: "160px" }}>
                        {prod.generos && prod.generos.length > 0 && (
                          <div style={{ display: "flex", gap: "2px", width: "100%", marginBottom: "2px", flexWrap: "wrap" }}>
                            {prod.generos.map(g => (
                              <span key={g} style={{ fontSize: "0.6rem", padding: "1px 4px", borderRadius: "4px", background: "rgba(245, 158, 11, 0.18)", color: "#fbbf24", fontWeight: 700 }}>
                                {g === "Niño" ? "👦" : g === "Niña" ? "👧" : g === "Mujer" ? "👩" : "👨"} {g}
                              </span>
                            ))}
                          </div>
                        )}
                        {prod.tallas.map(t => (
                          <span key={t} className="badge badge-amber" style={{ fontSize: "0.65rem", padding: "1px 4px" }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>-</span>
                    )}
                  </td>

                  <td style={{ padding: "10px 14px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "4px" }}>
                      <button
                        onClick={() => onSelectForBarcode(prod)}
                        className="btn btn-outline"
                        title="Imprimir código de barras"
                        style={{ padding: "6px 8px" }}
                      >
                        <Barcode size={16} color="var(--neon-indigo, #4f46e5)" />
                      </button>

                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleOpenModal(prod)}
                            className="btn btn-outline"
                            title="Editar producto"
                            style={{ padding: "6px 8px" }}
                          >
                            <Edit size={16} />
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`¿Eliminar producto "${prod.nombre}"?`)) {
                                onDeleteProduct(prod.id || prod.codigo);
                              }
                            }}
                            className="btn btn-outline"
                            title="Eliminar producto"
                            style={{ padding: "6px 8px", color: "var(--neon-rose)" }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Barra de Paginación Fluida */}
      {sorted.length > 0 && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginTop: "16px",
          padding: "12px 18px",
          background: "var(--card-bg, #1e293b)",
          borderRadius: "12px",
          border: "1px solid var(--border-color)",
          color: "var(--text-main)"
        }}>
          {/* Contador de elementos */}
          <div style={{ fontSize: "0.86rem", color: "var(--text-muted)" }}>
            Mostrando <strong style={{ color: "var(--text-main)" }}>{(safeCurrentPage - 1) * pageSize + 1}</strong> a <strong style={{ color: "var(--text-main)" }}>{Math.min(safeCurrentPage * pageSize, sorted.length)}</strong> de <strong style={{ color: "var(--text-main)" }}>{sorted.length}</strong> productos
          </div>

          {/* Selector de cantidad por página y controles de página */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.84rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Por página:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="input-field"
                style={{
                  padding: "4px 10px",
                  fontSize: "0.84rem",
                  borderRadius: "8px",
                  background: "var(--bg-tertiary)",
                  color: "var(--text-main)",
                  border: "1px solid var(--border-color)",
                  cursor: "pointer"
                }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>

            {/* Controles Anterior / Siguiente */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                className="btn btn-outline"
                style={{
                  padding: "6px 12px",
                  fontSize: "0.82rem",
                  opacity: safeCurrentPage <= 1 ? 0.4 : 1,
                  cursor: safeCurrentPage <= 1 ? "not-allowed" : "pointer"
                }}
                title="Página anterior"
              >
                <ChevronLeft size={16} />
                <span>Anterior</span>
              </button>

              <div style={{
                padding: "4px 12px",
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "var(--text-main)",
                background: "var(--bg-tertiary)",
                borderRadius: "8px",
                border: "1px solid var(--border-color)"
              }}>
                {safeCurrentPage} / {totalPages}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="btn btn-outline"
                style={{
                  padding: "6px 12px",
                  fontSize: "0.82rem",
                  opacity: safeCurrentPage >= totalPages ? 0.4 : 1,
                  cursor: safeCurrentPage >= totalPages ? "not-allowed" : "pointer"
                }}
                title="Página siguiente"
              >
                <span>Siguiente</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADAPTABLE DE CREACIÓN Y EDICIÓN DE PRODUCTOS */}
      <ProductEditModal
        isOpen={isModalOpen}
        product={editingProduct}
        defaultCategory={categoryFilterMap[selectedCategory] || "Papelería"}
        autoCode={stableAutoCode}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={async (savedProduct, originalKey) => {
          if (editingProduct) {
            recordPriceChange({
              previousProduct: editingProduct,
              updatedProduct: savedProduct,
              currentUser,
            }).catch(console.warn);
          }
          await onSaveProduct(savedProduct, originalKey);
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
      />

      {/* MODAL LISTA DE REPOSICIÓN / PEDIDO A PROVEEDORES */}
      {isSupplierModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSupplierModalOpen(false)}>
          <div
            className="modal-content modal-card"
            style={{
              maxWidth: "680px",
              width: "94%",
              maxHeight: "88vh",
              overflowY: "auto",
              borderRadius: "24px",
              padding: "24px"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "rgba(245, 158, 11, 0.16)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  color: "#fbbf24",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                    Lista de Pedido a Proveedores
                  </h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "2px 0 0" }}>
                    Productos agotados o con existencias bajas (≤ 3 unidades)
                  </p>
                </div>
              </div>
              <button onClick={() => setIsSupplierModalOpen(false)} className="btn-modal-close-circle" title="Cerrar modal">
                <X size={16} />
              </button>
            </div>

            {/* Aviso y Botones de Copiar / WhatsApp */}
            <div style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--border-color)",
              borderRadius: "14px",
              padding: "14px 18px",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px"
            }}>
              <span style={{ fontSize: "0.88rem", color: "var(--text-main)", fontWeight: 700 }}>
                {lowStockProducts.length} artículos necesitan reposición
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={handleCopySupplierList}
                  className="btn btn-outline"
                  style={{ padding: "8px 14px", fontSize: "0.82rem", borderRadius: "10px" }}
                >
                  <Copy size={14} />
                  <span>{copiedNotice ? "¡Copiado!" : "Copiar Lista"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsAppSupplierList}
                  className="btn btn-whatsapp"
                  style={{ padding: "8px 16px", fontSize: "0.82rem", borderRadius: "10px", background: "#25D366", color: "#fff", border: "none", fontWeight: 700 }}
                >
                  <Share2 size={14} />
                  <span>Enviar por WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Listado de Artículos */}
            {lowStockProducts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px", color: "var(--neon-emerald, #34d399)" }}>
                <CheckCircle2 size={36} style={{ margin: "0 auto 10px" }} />
                <p style={{ fontWeight: 700, margin: 0 }}>¡Todo el inventario está al día! No hay productos agotados.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {lowStockProducts.map((p) => {
                  const isZero = Number(p.stock) === 0;
                  return (
                    <div
                      key={p.codigo}
                      style={{
                        padding: "12px 16px",
                        borderRadius: "12px",
                        border: isZero ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid var(--border-color)",
                        background: isZero ? "rgba(239, 68, 68, 0.08)" : "rgba(255,255,255,0.03)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-main)" }}>
                          {p.nombre}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                          Cód: <span className="font-mono">{p.codigo}</span> · {p.categoria}
                        </div>
                      </div>
                      <span className={`badge ${isZero ? "badge-red" : "badge-amber"}`} style={{ fontSize: "0.74rem", fontWeight: 800 }}>
                        {isZero ? "AGOTADO (0)" : `${p.stock} unids`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      {/* MODAL MERMAS / BAJAS DE INVENTARIO */}
      {isMermasModalOpen && (
        <div className="modal-overlay" onClick={() => setIsMermasModalOpen(false)}>
          <div
            className="modal-content modal-card"
            style={{
              maxWidth: "680px",
              width: "94%",
              maxHeight: "90vh",
              overflowY: "auto",
              borderRadius: "24px",
              padding: "24px"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "rgba(239, 68, 68, 0.16)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#f87171",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <TrendingDown size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>Registro de Mermas / Bajas</h3>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "2px 0 0" }}>Roturas, vencidos, hurtos y errores de inventario</p>
                </div>
              </div>
              <button onClick={() => setIsMermasModalOpen(false)} className="btn-modal-close-circle" title="Cerrar modal">
                <X size={16} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleAddMerma} style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px", padding: "16px", background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "12px" }}>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#f87171", display: "flex", alignItems: "center", gap: "6px" }}>
                <ClipboardList size={15} /> Registrar Nueva Baja
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Producto afectado *:</label>
                <select
                  className="input-field"
                  value={mermaForm.productoId}
                  onChange={(e) => setMermaForm({ ...mermaForm, productoId: e.target.value })}
                  required
                >
                  <option value="">-- Seleccionar producto --</option>
                  {[...products]
                    .filter(p => p.categoria !== "Cintas" && !p.stockIlimitado)
                    .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""))
                    .map(p => (
                      <option key={p.id || p.codigo} value={p.id || p.codigo}>
                        [{p.codigo}] {p.nombre} (Stock: {getProductStockTotal(p)} unids)
                      </option>
                    ))
                  }
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Cantidad perdida *:</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={mermaForm.cantidad}
                    onChange={(e) => setMermaForm({ ...mermaForm, cantidad: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Motivo de la baja *:</label>
                  <select
                    className="input-field"
                    value={mermaForm.motivo}
                    onChange={(e) => setMermaForm({ ...mermaForm, motivo: e.target.value })}
                    required
                  >
                    <option value="">-- Seleccionar --</option>
                    {MOTIVOS_MERMA.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button type="submit" className="btn btn-primary" style={{ background: "#ef4444", borderColor: "#ef4444", padding: "8px 18px", fontSize: "0.85rem" }}>
                  <TrendingDown size={14} />
                  <span>Registrar Baja</span>
                </button>
              </div>
            </form>

            {/* Lista de Mermas */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-main)" }}>
                {mermasList.length} baja(s) registrada(s) en esta sesión
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                {mermasList.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleExportMermasWhatsApp}
                      className="btn btn-primary"
                      style={{ padding: "5px 12px", fontSize: "0.78rem", background: "#25D366", borderColor: "#25D366" }}
                    >
                      <Share2 size={13} />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllMermas}
                      className="btn btn-outline"
                      title="Borrar todo el historial de mermas"
                      style={{ padding: "5px 10px", fontSize: "0.78rem", color: "#f87171", borderColor: "rgba(239,68,68,0.3)" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {mermasList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px", color: "var(--neon-emerald)" }}>
                <CheckCircle2 size={32} style={{ margin: "0 auto 8px" }} />
                <p style={{ fontWeight: 700, margin: 0 }}>Sin bajas registradas en el sistema.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {mermasList.map((m) => (
                  <div key={m.id} style={{
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                    background: "rgba(239, 68, 68, 0.04)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "10px"
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-main)" }}>{m.nombreProducto}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        {new Date(m.fecha).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })} · {m.motivo}
                      </div>
                    </div>
                    <span className="badge badge-red" style={{ fontSize: "0.75rem", fontWeight: 800, whiteSpace: "nowrap" }}>
                      -{m.cantidad} unids
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteMerma(m.id)}
                      className="btn btn-outline"
                      title="Eliminar registro de merma"
                      style={{ padding: "4px 6px", color: "#f87171" }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL AUDITORÍA E HISTORIAL DE PRECIOS */}
      <PriceAuditModal
        isOpen={isPriceAuditOpen}
        onClose={() => setIsPriceAuditOpen(false)}
      />
    </div>
  );
}
