import React, { useState, useEffect } from "react";
import { 
  X, 
  ShoppingBag, 
  Sparkles, 
  Check, 
  Ruler, 
  Palette, 
  Plus, 
  Minus,
  Gift,
  Scissors,
  AlertTriangle,
  Shirt,
  Footprints,
  User,
  Tag
} from "lucide-react";
import { getProductImage } from "../data/initialData";

// Paleta de colores visual para las pastillas
const COLOR_MAP = {
  "Dorado": { bg: "#f59e0b", border: "#d97706", text: "#000" },
  "Plateado": { bg: "#e2e8f0", border: "#cbd5e1", text: "#000" },
  "Rojo": { bg: "#ef4444", border: "#dc2626", text: "#fff" },
  "Azul": { bg: "#3b82f6", border: "#2563eb", text: "#fff" },
  "Azul Rey": { bg: "#1d4ed8", border: "#1e40af", text: "#fff" },
  "Rosado": { bg: "#f472b6", border: "#ec4899", text: "#000" },
  "Rosado Pastel": { bg: "#fbcfe8", border: "#f472b6", text: "#000" },
  "Verde": { bg: "#10b981", border: "#059669", text: "#fff" },
  "Verde Esmeralda": { bg: "#047857", border: "#065f46", text: "#fff" },
  "Morado": { bg: "#a855f7", border: "#9333ea", text: "#fff" },
  "Negro": { bg: "#1f2937", border: "#374151", text: "#fff" },
  "Blanco": { bg: "#ffffff", border: "#e5e7eb", text: "#000" },
  "Amarillo": { bg: "#eab308", border: "#ca8a04", text: "#000" },
  "Fucsia": { bg: "#db2777", border: "#be185d", text: "#fff" },
  "Naranja": { bg: "#f97316", border: "#ea580c", text: "#fff" },
  "Café": { bg: "#78350f", border: "#451a03", text: "#fff" },
  "Gris": { bg: "#6b7280", border: "#4b5563", text: "#fff" }
};

const DEFAULT_GENEROS = ["Niño", "Niña", "Mujer", "Hombre"];
const DEFAULT_TALLAS_POR_GENERO_CHANCLETA = {
  'Niño': ['24', '26', '28', '30'],
  'Niña': ['24', '26', '28', '30'],
  'Mujer': ['35', '36', '37', '38', '39'],
  'Hombre': ['38', '39', '40', '41', '42']
};
const DEFAULT_TALLAS_POR_GENERO_ROPA = {
  'Niño': ['2', '4', '6', '8', '10', '12'],
  'Niña': ['2', '4', '6', '8', '10', '12'],
  'Mujer': ['XS', 'S', 'M', 'L', 'XL'],
  'Hombre': ['S', 'M', 'L', 'XL', 'XXL']
};

// Cordones por colores (redondos, planos, largos, cortos) - Venta por par
const TIPOS_CORDON = ["Redondo", "Plano"];
const LONGITUDES_CORDON = ["Corto (45cm)", "Largo (120cm)"];
const DEFAULT_COLORES_CORDON = [
  "Blanco", "Negro", "Rojo", "Azul", "Café", "Gris", "Azul Rey",
  "Rosado", "Verde", "Amarillo", "Morado", "Naranja", "Fucsia", "Dorado", "Plateado"
];

export default function VariantSelectionModal({
  product,
  isOpen,
  onClose,
  onConfirm,
  cart = []
}) {
  const isBolsa = product?.categoria === "Bolsas de Regalo" || String(product?.nombre || "").toLowerCase().includes("bolsa");
  const isCinta = product?.categoria === "Cintas" || product?.ventaPorMetro || String(product?.nombre || "").toLowerCase().includes("cinta");
  
  const isCordon = product?.categoria === "Cordones" || 
    String(product?.nombre || "").toLowerCase().includes("cordon") || 
    String(product?.nombre || "").toLowerCase().includes("cordón") ||
    String(product?.nombre || "").toLowerCase().includes("cordones");

  const isChancleta = product?.categoria === "Chancletas" || 
    String(product?.nombre || "").toLowerCase().includes("chancleta") || 
    String(product?.nombre || "").toLowerCase().includes("chancla");

  const isRopa = product?.categoria === "Ropa" || 
    String(product?.nombre || "").toLowerCase().includes("ropa");

  const isCalzadoRopa = isChancleta || isRopa || 
    Boolean(product?.tallasPorGenero && Object.keys(product.tallasPorGenero).length > 0) ||
    (Array.isArray(product?.tallas) && product?.tallas.length > 0) || 
    (Array.isArray(product?.generos) && product?.generos.length > 0);

  // Tipo o modelo de artículo escrito
  const tipoArticulo = product?.tipoArticulo || product?.subcategoria || "";

  // Subcategoría inicial detectada (Bolsas / Cintas)
  const detectedSubcat = product?.subcategoria || (
    isBolsa
      ? (String(product?.nombre || "").toLowerCase().includes("brillante") ? "Bolsa Brillante" : "Bolsa de Papel")
      : (String(product?.nombre || "").toLowerCase().includes("tela") ? "Cinta de Tela" : "Cinta de Papel")
  );

  const [subcategoria, setSubcategoria] = useState(detectedSubcat);
  const [motivo, setMotivo] = useState(product?.motivoDefault || "Niño");
  const [customMotivo, setCustomMotivo] = useState("");
  const [color, setColor] = useState(product?.colorDefault || (isCordon ? "Blanco" : "Dorado"));
  const [customColor, setCustomColor] = useState("");
  const [metros, setMetros] = useState(1);
  const [cantidad, setCantidad] = useState(1);

  // Estados específicos para Cordones (Redondos/Planos, Largos/Cortos)
  const [tipoCordon, setTipoCordon] = useState("Redondo");
  const [longitudCordon, setLongitudCordon] = useState("Corto (45-60cm)");

  // Géneros disponibles para este producto
  const availableGeneros = (product?.generos && product.generos.length > 0) 
    ? product.generos 
    : (product?.tallasPorGenero && Object.keys(product.tallasPorGenero).length > 0)
    ? Object.keys(product.tallasPorGenero)
    : DEFAULT_GENEROS;

  const [genero, setGenero] = useState("Mujer");
  const [talla, setTalla] = useState("");
  const [customTalla, setCustomTalla] = useState("");

  // Obtener tallas individuales para un género específico
  const getTallasForGenre = (gen) => {
    if (!product) return [];
    if (product.tallasPorGenero && Array.isArray(product.tallasPorGenero[gen]) && product.tallasPorGenero[gen].length > 0) {
      return product.tallasPorGenero[gen];
    }
    // Fallback: extraer claves en stockPorVariante con gen|
    if (product.stockPorVariante) {
      const fromStock = Object.keys(product.stockPorVariante)
        .filter(k => k.startsWith(`${gen}|`))
        .map(k => k.split('|')[1]);
      if (fromStock.length > 0) return fromStock;
    }
    // Fallback si tiene lista de tallas global
    if (Array.isArray(product.tallas) && product.tallas.length > 0) {
      return product.tallas;
    }
    // Fallback por defecto según género
    const defaultMap = isChancleta ? DEFAULT_TALLAS_POR_GENERO_CHANCLETA : DEFAULT_TALLAS_POR_GENERO_ROPA;
    return defaultMap[gen] || ['S', 'M', 'L'];
  };

  const currentGenTallas = isCalzadoRopa ? getTallasForGenre(genero) : [];

  // Reiniciar estado cada vez que se abre con un producto nuevo
  useEffect(() => {
    if (product) {
      const sub = product.subcategoria || (
        isBolsa
          ? (String(product.nombre || "").toLowerCase().includes("brillante") ? "Bolsa Brillante" : "Bolsa de Papel")
          : (String(product.nombre || "").toLowerCase().includes("tela") ? "Cinta de Tela" : "Cinta de Papel")
      );
      setSubcategoria(sub);
      
      const defaultMotivo = (product.motivos && product.motivos[0]) || "Niño";
      const defaultCol = (product.colores && product.colores[0]) || (sub === "Bolsa Brillante" ? "Dorado" : "Rojo");
      
      setMotivo(product.motivoDefault || defaultMotivo);
      setColor(product.colorDefault || defaultCol);
      setMetros(1);
      setCantidad(1);
      setCustomMotivo("");
      setCustomColor("");

      // Inicializar género y talla individual para Calzado/Ropa
      const gensList = (product.generos && product.generos.length > 0)
        ? product.generos
        : (product.tallasPorGenero && Object.keys(product.tallasPorGenero).length > 0)
        ? Object.keys(product.tallasPorGenero)
        : DEFAULT_GENEROS;

      const initialGen = gensList[0] || "Mujer";
      setGenero(initialGen);

      // Obtener tallas de ese género inicial
      let tList = [];
      if (product.tallasPorGenero && product.tallasPorGenero[initialGen]) {
        tList = product.tallasPorGenero[initialGen];
      } else if (product.stockPorVariante) {
        tList = Object.keys(product.stockPorVariante)
          .filter(k => k.startsWith(`${initialGen}|`))
          .map(k => k.split('|')[1]);
      }
      if (tList.length === 0 && Array.isArray(product.tallas) && product.tallas.length > 0) {
        tList = product.tallas;
      }
      if (tList.length === 0) {
        const dMap = isChancleta ? DEFAULT_TALLAS_POR_GENERO_CHANCLETA : DEFAULT_TALLAS_POR_GENERO_ROPA;
        tList = dMap[initialGen] || ['S', 'M', 'L'];
      }

      // Buscar primera talla con stock si es posible
      let chosenTalla = tList[0] || "";
      if (product.stockPorVariante) {
        const withStock = tList.find(t => Number(product.stockPorVariante[`${initialGen}|${t}`] || 0) > 0);
        if (withStock) chosenTalla = withStock;
      }
      setTalla(chosenTalla);
      setCustomTalla("");

      // Inicializar tipos y longitudes para Cordones
      if (isCordon) {
        const prodTipos = (Array.isArray(product.tiposCordón) && product.tiposCordón.length > 0)
          ? product.tiposCordón
          : (product.tipoCordon ? [product.tipoCordon] : TIPOS_CORDON);
        const prodLongs = (Array.isArray(product.longitudesCordón) && product.longitudesCordón.length > 0)
          ? product.longitudesCordón
          : (product.longitudCordon ? [product.longitudCordon] : LONGITUDES_CORDON);

        const defaultTipo = prodTipos[0] || "Redondo";
        const defaultLong = prodLongs[0] || "Largo (120cm)";
        const defaultColCordon = product.colorDefault || (Array.isArray(product.colores) && product.colores[0]) || "Blanco";
        setTipoCordon(defaultTipo);
        setLongitudCordon(defaultLong);
        setColor(defaultColCordon);
      }
    }
  }, [product, isBolsa, isCalzadoRopa, isChancleta, isCordon]);

  if (!isOpen || !product) return null;

  // Tipos y longitudes de cordón realmente habilitados para este producto
  const availableTiposCordon = (Array.isArray(product?.tiposCordón) && product.tiposCordón.length > 0)
    ? product.tiposCordón
    : (product?.tipoCordon ? [product.tipoCordon] : TIPOS_CORDON);

  const availableLongitudesCordon = (Array.isArray(product?.longitudesCordón) && product.longitudesCordón.length > 0)
    ? product.longitudesCordón
    : (product?.longitudCordon ? [product.longitudCordon] : LONGITUDES_CORDON);

  const isTipoCordonEnabled = (t) => {
    return availableTiposCordon.some(at => at.toLowerCase() === (t || "").toLowerCase());
  };

  const isLongitudCordonEnabled = (l) => {
    const isCorto = (l || "").toLowerCase().includes('corto');
    const isLargo = (l || "").toLowerCase().includes('largo');
    return availableLongitudesCordon.some(al => {
      if (isCorto && (al || "").toLowerCase().includes('corto')) return true;
      if (isLargo && (al || "").toLowerCase().includes('largo')) return true;
      return (al || "").toLowerCase() === (l || "").toLowerCase();
    });
  };

  // Unidades de esta variante que ya están apartadas en el Ticket de Venta (carrito)
  const getUnitsOfVariantInCart = (varName, genOverride = null) => {
    if (!cart || cart.length === 0 || !product) return 0;
    const prodId = product.id || product.codigo;
    const gen = genOverride || genero;

    return cart
      .filter(item => {
        const matchesProd = (item.productId === prodId || String(item.codigo).trim() === String(product.codigo).trim());
        if (!matchesProd) return false;

        if (isCordon) {
          return item.tipoCordon === tipoCordon && item.longitudCordon === longitudCordon && (item.color === varName || item.color === color);
        }
        if (isCalzadoRopa) {
          return item.genero === gen && String(item.talla) === String(varName);
        }
        if (isBolsa) {
          return item.motivo === varName || item.color === varName;
        }
        return false;
      })
      .reduce((sum, item) => sum + Number(item.cantidad || 0), 0);
  };

  // Función para obtener el stock disponible de una variante específica (descontando Ticket de Venta)
  const getVariantStock = (varName, genOverride = null) => {
    if (isCinta) return 99999;
    const inCartQty = getUnitsOfVariantInCart(varName, genOverride);
    let baseStock = 0;

    if (isCordon) {
      if (product.stockIlimitado) return 99999;

      // SI EL TIPO O LA LONGITUD SELECCIONADA NO ESTÁ HABILITADA EN ESTE PRODUCTO -> STOCK ES 0
      if (!isTipoCordonEnabled(tipoCordon) || !isLongitudCordonEnabled(longitudCordon)) {
        return 0;
      }

      if (product.stockPorVariante && Object.keys(product.stockPorVariante).length > 0) {
        const keyFull = `${tipoCordon}|${longitudCordon}|${varName}`;
        const keySimple = `${tipoCordon}|${varName}`;

        // 1. Clave exacta: Tipo|Longitud|Color
        if (product.stockPorVariante[keyFull] !== undefined) {
          baseStock = Number(product.stockPorVariante[keyFull]);
        }
        // 2. Clave Tipo|Color
        else if (product.stockPorVariante[keySimple] !== undefined) {
          baseStock = Number(product.stockPorVariante[keySimple]);
        }
        // 3. Clave solo Color (si el producto tiene solo 1 tipo habilitado o clave global)
        else if (availableTiposCordon.length === 1 && product.stockPorVariante[varName] !== undefined) {
          baseStock = Number(product.stockPorVariante[varName]);
        }
        else if (product.stockPorVariante[varName] !== undefined) {
          baseStock = Number(product.stockPorVariante[varName]);
        }
        else {
          baseStock = 0;
        }
      } else {
        baseStock = Number(product.stock || 0);
      }
      return Math.max(0, baseStock - inCartQty);
    }

    if (product.stockPorVariante) {
      if (isCalzadoRopa) {
        const genToUse = genOverride || genero;
        const key = `${genToUse}|${varName}`;
        if (product.stockPorVariante[key] !== undefined) {
          baseStock = Number(product.stockPorVariante[key]);
        } else if (product.stockPorVariante[varName] !== undefined) {
          baseStock = Number(product.stockPorVariante[varName]);
        }
      } else if (varName && product.stockPorVariante[varName] !== undefined) {
        baseStock = Number(product.stockPorVariante[varName]);
      }
    } else {
      baseStock = Number(product.stock ?? 0);
    }
    return Math.max(0, baseStock - inCartQty);
  };

  // Función para obtener el precio individual de una variante específica
  const getVariantPrice = (varName, genOverride = null) => {
    if (isCordon) {
      if (product.preciosPorVariante) {
        const keyFull = `${tipoCordon}|${longitudCordon}|${varName}`;
        if (product.preciosPorVariante[keyFull] !== undefined && Number(product.preciosPorVariante[keyFull]) > 0) {
          return Number(product.preciosPorVariante[keyFull]);
        }
        const keyTipo = `${tipoCordon}|${longitudCordon}`;
        if (product.preciosPorVariante[keyTipo] !== undefined && Number(product.preciosPorVariante[keyTipo]) > 0) {
          return Number(product.preciosPorVariante[keyTipo]);
        }
      }
      return Number(product.precio) || 0;
    }
    if (!isCalzadoRopa) return Number(product.precio) || 0;
    const genToUse = genOverride || genero;
    const key = `${genToUse}|${varName}`;
    if (product.preciosPorVariante && product.preciosPorVariante[key] !== undefined && Number(product.preciosPorVariante[key]) > 0) {
      return Number(product.preciosPorVariante[key]);
    }
    if (product.precioPorGenero && product.precioPorGenero[genToUse] !== undefined && Number(product.precioPorGenero[genToUse]) > 0) {
      return Number(product.precioPorGenero[genToUse]);
    }
    return Number(product.precio) || 0;
  };

  // Stock total disponible para un género específico descontando lo que ya está en el Ticket de Venta
  const getGenderTotalStock = (gen) => {
    if (!product.stockPorVariante) {
      const inCartGender = (cart || [])
        .filter(item => (item.productId === (product?.id || product?.codigo) || String(item.codigo).trim() === String(product?.codigo).trim()) && item.genero === gen)
        .reduce((sum, item) => sum + Number(item.cantidad || 0), 0);
      return Math.max(0, Number(product.stock || 0) - inCartGender);
    }
    const tallasGen = getTallasForGenre(gen);
    return tallasGen.reduce((sum, t) => {
      return sum + getVariantStock(t, gen);
    }, 0);
  };

  // Lista de motivos (Bolsas)
  const availableMotivos = product.motivos && product.motivos.length > 0 
    ? product.motivos 
    : ["Niño", "Niña", "Cumpleaños", "Unisex", "Amor y Amistad"];

  // Lista de colores (Bolsas Brillantes / Cintas / Cordones)
  const availableColores = product.colores && product.colores.length > 0
    ? product.colores 
    : (isCordon ? DEFAULT_COLORES_CORDON : ["Dorado", "Plateado", "Rojo", "Azul", "Rosado", "Verde", "Blanco", "Fucsia", "Morado", "Negro"]);

  const quickMeters = [1, 1.5, 2, 2.5, 3, 4, 5];

  // Variante actualmente seleccionada
  const activeTalla = customTalla.trim() || talla;
  const activeVariantName = isCordon
    ? `${tipoCordon} • ${longitudCordon.includes("(") ? longitudCordon.split(" ")[0] : longitudCordon} • ${customColor.trim() || color}`
    : isCalzadoRopa
      ? `${genero} • Talla ${activeTalla}`
      : isBolsa
        ? (subcategoria === "Bolsa de Papel" || !subcategoria.includes("Brillante")
            ? (customMotivo.trim() || motivo)
            : (customColor.trim() || color))
        : (customColor.trim() || color);

  // Precio unitario dinámico según la variante seleccionada
  const precioUnitario = isCordon
    ? getVariantPrice(customColor.trim() || color)
    : isCalzadoRopa 
      ? getVariantPrice(activeTalla)
      : (Number(product.precio) || 0);

  const precioTotal = isCinta
    ? Math.round(precioUnitario * Number(metros) * Number(cantidad))
    : Math.round(precioUnitario * Number(cantidad));

  const activeStock = isCinta 
    ? 99999 
    : isCordon
      ? (product.stockIlimitado ? 99999 : getVariantStock(customColor.trim() || color))
      : isCalzadoRopa 
        ? getVariantStock(activeTalla) 
        : getVariantStock(activeVariantName);

  const isOutOfStock = !isCinta && !product.stockIlimitado && activeStock <= 0;

  const handleConfirm = (e) => {
    e.preventDefault();
    if (!isCinta && !product.stockIlimitado && activeStock <= 0) {
      alert(`⚠️ La opción seleccionada "${activeVariantName}" está agotada en inventario.`);
      return;
    }

    if (!isCinta && !product.stockIlimitado && cantidad > activeStock) {
      alert(`⚠️ Stock insuficiente: Solo quedan ${activeStock} unidades de "${activeVariantName}".`);
      return;
    }

    const finalMotivo = customMotivo.trim() || motivo;
    const finalColor = customColor.trim() || color;

    if (isCordon) {
      onConfirm({
        product,
        subcategoria: `Cordón ${tipoCordon}`,
        tipoArticulo: `Cordón ${tipoCordon}`,
        tipoCordon,
        longitudCordon,
        color: finalColor,
        cantidad: Number(cantidad) || 1,
        precioUnitario,
        subtotal: precioTotal,
        isCordon: true,
        isCinta: false,
        isBolsa: false,
        isCalzadoRopa: false,
        stockDisponibleVariante: activeStock
      });
      onClose();
      return;
    }

    onConfirm({
      product,
      subcategoria: isCalzadoRopa ? tipoArticulo : subcategoria,
      tipoArticulo: isCalzadoRopa ? tipoArticulo : null,
      motivo: isBolsa && (subcategoria === "Bolsa de Papel" || !subcategoria.includes("Brillante")) ? finalMotivo : null,
      color: (isBolsa && subcategoria.includes("Brillante")) || isCinta ? finalColor : null,
      genero: isCalzadoRopa ? genero : null,
      talla: isCalzadoRopa ? activeTalla : null,
      metros: isCinta ? Number(metros) : null,
      cantidad: Number(cantidad) || 1,
      precioUnitario: isCinta ? Math.round(precioUnitario * Number(metros)) : precioUnitario,
      subtotal: precioTotal,
      isCinta,
      isBolsa,
      isCalzadoRopa,
      stockDisponibleVariante: activeStock
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1300 }}>
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "600px",
          width: "95%",
          maxHeight: "90vh",
          borderRadius: "24px",
          background: "var(--bg-secondary, #111827)",
          border: "1px solid var(--border-strong)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 65px rgba(0, 0, 0, 0.75)"
        }}
      >
        {/* Cabecera */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--bg-tertiary)",
          flexShrink: 0
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background: isCordon
                ? "rgba(249, 115, 22, 0.18)"
                : isCalzadoRopa 
                ? (isChancleta ? "rgba(245, 158, 11, 0.18)" : "rgba(139, 92, 246, 0.18)")
                : isBolsa ? "rgba(236, 72, 153, 0.15)" : "rgba(16, 185, 129, 0.15)",
              color: isCordon
                ? "#f97316"
                : isCalzadoRopa
                ? (isChancleta ? "#f59e0b" : "#a78bfa")
                : isBolsa ? "#f472b6" : "#34d399",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              {isCordon ? <Footprints size={22} /> : isChancleta ? <Footprints size={22} /> : isRopa ? <Shirt size={22} /> : isBolsa ? <Gift size={20} /> : <Scissors size={20} />}
            </div>
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                {isCordon
                  ? "Opciones de Cordones (Venta por Par)"
                  : isChancleta 
                  ? `Opciones de Chancletas ${tipoArticulo ? `— ${tipoArticulo}` : ""}`
                  : isRopa 
                    ? `Opciones de Ropa ${tipoArticulo ? `— ${tipoArticulo}` : ""}`
                    : isBolsa 
                      ? "Opciones de Bolsa de Regalo" 
                      : "Venta de Cinta por Metros"}
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
                {product.nombre} • ${precioUnitario.toLocaleString()} COP {isCinta ? "/ metro" : isCordon ? "/ par" : "/ unidad"}
              </p>
            </div>
          </div>

          <button 
            type="button" 
            onClick={onClose}
            className="btn btn-outline"
            style={{ padding: "6px 8px", borderRadius: "8px" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleConfirm} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
          
          {/* Contenedor scrolleable interno */}
          <div style={{
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            overflowY: "auto",
            flex: 1
          }}>
          
          {/* ======================================================== */}
          {/* SECCIÓN ESPECIAL: CHANCLETAS / ROPA                      */}
          {/* ======================================================== */}
          {isCalzadoRopa && (
            <>
              {/* Badge si tiene tipo de artículo personalizado */}
              {tipoArticulo && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: isChancleta ? "rgba(245, 158, 11, 0.1)" : "rgba(139, 92, 246, 0.1)",
                  border: `1px solid ${isChancleta ? "rgba(245, 158, 11, 0.3)" : "rgba(139, 92, 246, 0.3)"}`,
                  padding: "6px 12px",
                  borderRadius: "10px",
                  fontSize: "0.78rem",
                  color: isChancleta ? "#fbbf24" : "#c084fc",
                  fontWeight: 700
                }}>
                  <Tag size={14} />
                  <span>Artículo / Modelo: <strong>{tipoArticulo}</strong></span>
                </div>
              )}

              {/* 1. Selector de Género */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <User size={15} color="#f59e0b" />
                    Paso 1: Selecciona el Género:
                  </label>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                    Stock y tallas independientes
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: `repeat(${availableGeneros.length}, 1fr)`, gap: "8px" }}>
                  {availableGeneros.map((g) => {
                    const isSelected = genero === g;
                    const gStock = getGenderTotalStock(g);
                    const isGEmpty = gStock <= 0;

                    let icon = "✨";
                    if (g === "Niño") icon = "👦";
                    else if (g === "Niña") icon = "👧";
                    else if (g === "Mujer") icon = "👩";
                    else if (g === "Hombre") icon = "👨";

                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => {
                          setGenero(g);
                          // Cambiar a la primera talla con stock para este género
                          const tallasGen = getTallasForGenre(g);
                          if (tallasGen.length > 0) {
                            const withStock = tallasGen.find(t => getVariantStock(t, g) > 0);
                            setTalla(withStock || tallasGen[0]);
                          }
                          setCustomTalla("");
                        }}
                        style={{
                          padding: "10px 8px",
                          borderRadius: "14px",
                          border: isSelected 
                            ? "2px solid #f59e0b" 
                            : isGEmpty ? "1px solid rgba(239, 68, 68, 0.25)" : "1px solid var(--border-color)",
                          background: isSelected 
                            ? "rgba(245, 158, 11, 0.18)" 
                            : isGEmpty ? "rgba(239, 68, 68, 0.04)" : "rgba(255, 255, 255, 0.03)",
                          color: isSelected ? "#fbbf24" : (isGEmpty ? "#9ca3af" : "var(--text-main)"),
                          fontWeight: 800,
                          fontSize: "0.82rem",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "3px",
                          transition: "all 0.15s",
                          boxShadow: isSelected ? "0 0 14px rgba(245, 158, 11, 0.25)" : "none"
                        }}
                      >
                        <span style={{ fontSize: "1.1rem" }}>{icon}</span>
                        <span>{g}</span>
                        <span style={{
                          fontSize: "0.68rem",
                          padding: "1px 6px",
                          borderRadius: "6px",
                          background: isGEmpty ? "rgba(239, 68, 68, 0.2)" : (isSelected ? "rgba(245, 158, 11, 0.3)" : "rgba(16, 185, 129, 0.15)"),
                          color: isGEmpty ? "#fca5a5" : (isSelected ? "#fef08a" : "#6ee7b7"),
                          fontWeight: 800
                        }}>
                          {isGEmpty ? "0 disp." : `${gStock} disp.`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Selector de Talla con Stock y Precio Individual de este Género */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Ruler size={15} color="#3b82f6" />
                    Paso 2: Selecciona la Talla para {genero}:
                  </label>
                  <span style={{ fontSize: "0.74rem", color: "#60a5fa", fontWeight: 700 }}>
                    Tallas exclusivas de {genero}
                  </span>
                </div>

                {currentGenTallas.length === 0 ? (
                  <div style={{ padding: "12px", textAlign: "center", color: "var(--text-dim)", fontSize: "0.8rem", background: "rgba(255,255,255,0.02)", borderRadius: "10px" }}>
                    No hay tallas configuradas para {genero}. Escribe una talla manual abajo.
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(105px, 1fr))", gap: "8px" }}>
                    {currentGenTallas.map((t) => {
                      const isSelected = activeTalla === t && !customTalla;
                      const vStock = getVariantStock(t, genero);
                      const vPrice = getVariantPrice(t, genero);
                      const isZero = vStock <= 0;

                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setTalla(t);
                            setCustomTalla("");
                          }}
                          style={{
                            padding: "8px 6px",
                            borderRadius: "12px",
                            border: isSelected 
                              ? "2px solid #3b82f6" 
                              : isZero ? "1px solid rgba(239, 68, 68, 0.25)" : "1px solid var(--border-color)",
                            background: isSelected 
                              ? "rgba(59, 130, 246, 0.22)" 
                              : isZero ? "rgba(239, 68, 68, 0.04)" : "rgba(255, 255, 255, 0.03)",
                            color: isSelected ? "#93c5fd" : (isZero ? "#9ca3af" : "var(--text-main)"),
                            fontWeight: 800,
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "3px",
                            transition: "all 0.15s",
                            boxShadow: isSelected ? "0 0 12px rgba(59, 130, 246, 0.3)" : "none"
                          }}
                        >
                          <span style={{ fontSize: "0.92rem", fontWeight: 900 }}>
                            Talla {t}
                          </span>
                          
                          {/* Precio individual de la talla */}
                          <span style={{ fontSize: "0.72rem", color: isSelected ? "#6ee7b7" : "#10b981", fontWeight: 800 }}>
                            ${Number(vPrice).toLocaleString()}
                          </span>

                          {/* Badge de stock */}
                          <span style={{
                            fontSize: "0.68rem",
                            padding: "1px 5px",
                            borderRadius: "6px",
                            background: isZero ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.15)",
                            color: isZero ? "#fca5a5" : "#6ee7b7",
                            fontWeight: 800
                          }}>
                            {isZero ? "Agotada" : `${vStock} disp.`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="text"
                    placeholder={`O escribe otra talla para ${genero} (ej: 35, 37, XXL)...`}
                    value={customTalla}
                    onChange={(e) => setCustomTalla(e.target.value)}
                    className="input-field"
                    style={{ flex: 1, fontSize: "0.8rem", padding: "8px 12px" }}
                  />
                  {customTalla && (
                    <button
                      type="button"
                      onClick={() => setCustomTalla("")}
                      className="btn btn-outline"
                      style={{ padding: "8px 12px", fontSize: "0.75rem" }}
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ======================================================== */}
          {/* SECCIÓN ESPECIAL: CORDONES POR COLORES Y TIPO (PAR)      */}
          {/* ======================================================== */}
          {isCordon && (
            <>
              {/* Info banner */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(249, 115, 22, 0.12)",
                border: "1px solid rgba(249, 115, 22, 0.35)",
                padding: "8px 12px",
                borderRadius: "10px",
                fontSize: "0.8rem",
                color: "#fb923c",
                fontWeight: 600
              }}>
                <Sparkles size={16} />
                <span>Venta por Par — Cordones clasificados por tipo (redondo/plano), largo y variedad de colores.</span>
              </div>

              {/* Paso 1: Tipo de Cordón (Redondo vs Plano) */}
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                  1. Selecciona el Tipo de Cordón:
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {TIPOS_CORDON.map((t) => {
                    const isEnabled = isTipoCordonEnabled(t);
                    const isSelected = tipoCordon === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        disabled={!isEnabled}
                        onClick={() => isEnabled && setTipoCordon(t)}
                        style={{
                          padding: "10px 12px",
                          borderRadius: "12px",
                          border: isSelected ? "2px solid #f97316" : "1px solid var(--border-color)",
                          background: isSelected ? "rgba(249, 115, 22, 0.2)" : (isEnabled ? "rgba(255, 255, 255, 0.04)" : "rgba(255, 255, 255, 0.01)"),
                          color: isSelected ? "#fed7aa" : (isEnabled ? "var(--text-main)" : "var(--text-dim)"),
                          opacity: isEnabled ? 1 : 0.4,
                          cursor: isEnabled ? "pointer" : "not-allowed",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          transition: "all 0.15s"
                        }}
                      >
                        <span style={{ fontSize: "1.1rem" }}>{t === "Redondo" ? "🔘" : "➖"}</span>
                        <span>{t}</span>
                        {!isEnabled && <span style={{ fontSize: "0.68rem", color: "#f87171" }}>(No disp.)</span>}
                        {isSelected && <Check size={14} color="#f97316" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Paso 2: Longitud del Cordón (Corto vs Largo) */}
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                  2. Selecciona la Longitud:
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {LONGITUDES_CORDON.map((l) => {
                    const isEnabled = isLongitudCordonEnabled(l);
                    const isCorto = l.toLowerCase().includes("corto");
                    const isSelected = isLongitudCordonEnabled(longitudCordon) && (
                      longitudCordon === l ||
                      (isCorto && (longitudCordon || "").toLowerCase().includes("corto")) ||
                      (!isCorto && (longitudCordon || "").toLowerCase().includes("largo"))
                    );
                    return (
                      <button
                        key={l}
                        type="button"
                        disabled={!isEnabled}
                        onClick={() => isEnabled && setLongitudCordon(l)}
                        style={{
                          padding: "10px 12px",
                          borderRadius: "12px",
                          border: isSelected ? "2px solid #f59e0b" : "1px solid var(--border-color)",
                          background: isSelected ? "rgba(245, 158, 11, 0.2)" : (isEnabled ? "rgba(255, 255, 255, 0.04)" : "rgba(255, 255, 255, 0.01)"),
                          color: isSelected ? "#fef3c7" : (isEnabled ? "var(--text-main)" : "var(--text-dim)"),
                          opacity: isEnabled ? 1 : 0.4,
                          cursor: isEnabled ? "pointer" : "not-allowed",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          transition: "all 0.15s"
                        }}
                      >
                        <span style={{ fontSize: "1.1rem" }}>{isCorto ? "📏" : "📐"}</span>
                        <span>{l}</span>
                        {!isEnabled && <span style={{ fontSize: "0.68rem", color: "#f87171" }}>(No disp.)</span>}
                        {isSelected && <Check size={14} color="#f59e0b" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Paso 3: Color del Cordón */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Palette size={15} color="#f97316" />
                    3. Selecciona el Color:
                  </label>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                    {availableColores.length} colores disponibles
                  </span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {availableColores.map((c) => {
                    const isSelected = color === c && !customColor;
                    const cStyle = COLOR_MAP[c] || { bg: "#6b7280", border: "#4b5563", text: "#fff" };
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => { setColor(c); setCustomColor(""); }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "20px",
                          border: isSelected ? "2px solid #fff" : "1px solid var(--border-color)",
                          background: isSelected ? "rgba(255, 255, 255, 0.16)" : "rgba(255, 255, 255, 0.04)",
                          color: "var(--text-main)",
                          fontWeight: 700,
                          fontSize: "0.8rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          boxShadow: isSelected ? "0 0 10px rgba(249, 115, 22, 0.35)" : "none",
                          transition: "all 0.15s"
                        }}
                      >
                        <span style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          background: cStyle.bg,
                          border: `1px solid ${cStyle.border}`,
                          display: "inline-block"
                        }} />
                        <span>{c}</span>
                        {isSelected && <Check size={12} color="#f97316" />}
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text"
                  placeholder="O escribe otro color específico para el cordón..."
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="input-field"
                  style={{ marginTop: "8px", fontSize: "0.8rem", padding: "8px 12px" }}
                />
              </div>
            </>
          )}

          {/* ======================================================== */}
          {/* SECCIÓN ESPECIAL: CINTAS                                 */}
          {/* ======================================================== */}
          {isCinta && (
            <>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                padding: "8px 12px",
                borderRadius: "10px",
                fontSize: "0.8rem",
                color: "#34d399",
                fontWeight: 600
              }}>
                <Sparkles size={16} />
                <span>Stock Ilimitado (∞) — Se corta y fracciona por metros según lo solicitado por el cliente.</span>
              </div>

              {/* Longitud en metros */}
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                  <Ruler size={15} color="#34d399" />
                  Longitud a Vender en Metros (Mínimo 1 metro):
                </label>
                
                {/* Botones de acceso rápido */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                  {quickMeters.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMetros(m)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        border: Number(metros) === m ? "2px solid #10b981" : "1px solid var(--border-color)",
                        background: Number(metros) === m ? "rgba(16, 185, 129, 0.22)" : "rgba(255, 255, 255, 0.05)",
                        color: Number(metros) === m ? "#6ee7b7" : "var(--text-main)",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        cursor: "pointer"
                      }}
                    >
                      {m} m
                    </button>
                  ))}
                </div>

                {/* Input manual de metros */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    className="input-field"
                    value={metros}
                    onChange={(e) => setMetros(Math.max(1, parseFloat(e.target.value) || 1))}
                    style={{ flex: 1, padding: "8px 12px", fontWeight: 700, fontSize: "0.95rem" }}
                  />
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)" }}>
                    Metros
                  </span>
                </div>
              </div>

              {/* Color de la Cinta */}
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                  <Palette size={15} />
                  Color de la Cinta:
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {availableColores.map((c) => {
                    const isSelected = color === c && !customColor;
                    const cStyle = COLOR_MAP[c] || { bg: "#3b82f6", border: "#2563eb", text: "#fff" };
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => { setColor(c); setCustomColor(""); }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "20px",
                          border: isSelected ? "2px solid #fff" : "1px solid var(--border-color)",
                          background: isSelected ? "rgba(255, 255, 255, 0.16)" : "rgba(255, 255, 255, 0.04)",
                          color: "var(--text-main)",
                          fontWeight: 700,
                          fontSize: "0.8rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        <span style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          background: cStyle.bg,
                          border: `1px solid ${cStyle.border}`,
                          display: "inline-block"
                        }} />
                        <span>{c}</span>
                        {isSelected && <Check size={12} color="#34d399" />}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  placeholder="O escribe otro color de cinta..."
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="input-field"
                  style={{ marginTop: "8px", fontSize: "0.8rem", padding: "8px 12px" }}
                />
              </div>
            </>
          )}

          {/* ======================================================== */}
          {/* SECCIÓN ESPECIAL: BOLSAS DE REGALO                       */}
          {/* ======================================================== */}
          {isBolsa && (
            <>
              {/* Subcategoría Selector si es Bolsa */}
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                  Tipo de Bolsa:
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setSubcategoria("Bolsa de Papel")}
                    style={{
                      padding: "10px",
                      borderRadius: "12px",
                      border: subcategoria === "Bolsa de Papel" ? "2px solid var(--accent-blue, #3b82f6)" : "1px solid var(--border-color)",
                      background: subcategoria === "Bolsa de Papel" ? "rgba(59, 130, 246, 0.18)" : "var(--bg-glass)",
                      color: subcategoria === "Bolsa de Papel" ? "var(--text-main)" : "var(--text-muted)",
                      fontWeight: 700,
                      fontSize: "0.84rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px"
                    }}
                  >
                    📜 Bolsa de Papel
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubcategoria("Bolsa Brillante")}
                    style={{
                      padding: "10px",
                      borderRadius: "12px",
                      border: subcategoria === "Bolsa Brillante" ? "2px solid #ec4899" : "1px solid var(--border-color)",
                      background: subcategoria === "Bolsa Brillante" ? "rgba(236, 72, 153, 0.18)" : "var(--bg-glass)",
                      color: subcategoria === "Bolsa Brillante" ? "var(--text-main)" : "var(--text-muted)",
                      fontWeight: 700,
                      fontSize: "0.84rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px"
                    }}
                  >
                    ✨ Bolsa Brillante
                  </button>
                </div>
              </div>

              {/* Si es Bolsa de Papel: Selección de Motivo con STOCK INDIVIDUAL */}
              {subcategoria === "Bolsa de Papel" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)" }}>
                      🎨 Selecciona el Motivo / Temática:
                    </label>
                    <span style={{ fontSize: "0.74rem", color: "#93c5fd", fontWeight: 700 }}>
                      Stock individual por motivo
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px" }}>
                    {availableMotivos.map((m) => {
                      const isSelected = motivo === m && !customMotivo;
                      const vStock = getVariantStock(m);
                      const isStockZero = vStock <= 0;

                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => { setMotivo(m); setCustomMotivo(""); }}
                          style={{
                            padding: "10px 10px",
                            borderRadius: "12px",
                            border: isSelected 
                              ? "2px solid var(--accent-blue, #3b82f6)" 
                              : isStockZero ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid var(--border-color)",
                            background: isSelected 
                              ? "rgba(59, 130, 246, 0.22)" 
                              : isStockZero ? "rgba(239, 68, 68, 0.05)" : "rgba(255, 255, 255, 0.04)",
                            color: isSelected ? "#93c5fd" : (isStockZero ? "#9ca3af" : "var(--text-main)"),
                            fontWeight: 700,
                            fontSize: "0.82rem",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "4px",
                            transition: "all 0.15s"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            {m.toLowerCase().includes("niño") && "👦 "}
                            {m.toLowerCase().includes("niña") && "👧 "}
                            {m.toLowerCase().includes("cumple") && "🎉 "}
                            {m.toLowerCase().includes("unisex") && "✨ "}
                            {m.toLowerCase().includes("amor") && "❤️ "}
                            <span>{m}</span>
                          </div>

                          <span style={{
                            fontSize: "0.68rem",
                            padding: "2px 6px",
                            borderRadius: "6px",
                            background: isStockZero ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.15)",
                            color: isStockZero ? "#fca5a5" : "#6ee7b7",
                            fontWeight: 800
                          }}>
                            {isStockZero ? "Agotado (0)" : `${vStock} disp.`}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <input
                    type="text"
                    placeholder="O escribe otro motivo específico..."
                    value={customMotivo}
                    onChange={(e) => setCustomMotivo(e.target.value)}
                    className="input-field"
                    style={{ marginTop: "8px", fontSize: "0.8rem", padding: "8px 12px" }}
                  />
                </div>
              )}

              {/* Si es Bolsa Brillante: Selección de Color con STOCK INDIVIDUAL */}
              {subcategoria === "Bolsa Brillante" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Palette size={15} />
                      Selecciona el Color de la Bolsa Brillante:
                    </label>
                    <span style={{ fontSize: "0.74rem", color: "#f472b6", fontWeight: 700 }}>
                      Stock individual por color
                    </span>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {availableColores.map((c) => {
                      const isSelected = color === c && !customColor;
                      const cStyle = COLOR_MAP[c] || { bg: "#3b82f6", border: "#2563eb", text: "#fff" };
                      const vStock = getVariantStock(c);
                      const isStockZero = vStock <= 0;

                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => { setColor(c); setCustomColor(""); }}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "20px",
                            border: isSelected ? "2px solid #fff" : (isStockZero ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid var(--border-color)"),
                            background: isSelected ? "rgba(255, 255, 255, 0.16)" : (isStockZero ? "rgba(239, 68, 68, 0.05)" : "rgba(255, 255, 255, 0.04)"),
                            color: isStockZero ? "#9ca3af" : "var(--text-main)",
                            fontWeight: 700,
                            fontSize: "0.8rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            boxShadow: isSelected ? "0 0 12px rgba(255, 255, 255, 0.3)" : "none"
                          }}
                        >
                          <span style={{
                            width: "12px",
                            height: "12px",
                            borderRadius: "50%",
                            background: cStyle.bg,
                            border: `1px solid ${cStyle.border}`,
                            display: "inline-block"
                          }} />
                          <span>{c}</span>
                          <span style={{
                            fontSize: "0.68rem",
                            opacity: 0.85,
                            color: isStockZero ? "#fca5a5" : "#6ee7b7",
                            fontWeight: 800
                          }}>
                            ({vStock})
                          </span>
                          {isSelected && <Check size={14} color="#34d399" />}
                        </button>
                      );
                    })}
                  </div>

                  <input
                    type="text"
                    placeholder="O escribe otro color..."
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="input-field"
                    style={{ marginTop: "8px", fontSize: "0.8rem", padding: "8px 12px" }}
                  />
                </div>
              )}
            </>
          )}

          {/* Alerta de Stock Agotado para la variante elegida */}
          {isOutOfStock && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              padding: "10px 14px",
              borderRadius: "12px",
              color: "#fca5a5",
              fontSize: "0.8rem",
              fontWeight: 700
            }}>
              <AlertTriangle size={18} />
              <span>Esta variante ({activeVariantName}) no tiene existencias disponibles en tienda (Stock: 0).</span>
            </div>
          )}

          {/* Cantidad a vender */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            background: "rgba(255, 255, 255, 0.03)",
            borderRadius: "14px",
            border: "1px solid var(--border-color)"
          }}>
            <div>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-main)", display: "block" }}>
                {isCinta 
                  ? "Cantidad de Tiras / Tramos:" 
                  : isCordon
                    ? "Cantidad de Pares de Cordones:"
                    : isCalzadoRopa 
                      ? "Cantidad de Pares / Prendas:" 
                      : "Cantidad de Bolsas:"}
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                {isCinta 
                  ? `${metros} metros cada tira` 
                  : isCordon 
                    ? `${cantidad} ${cantidad === 1 ? 'par' : 'pares'} (${tipoCordon}, ${longitudCordon.split(" ")[0]}, ${customColor.trim() || color})`
                    : `Stock disponible de ${activeVariantName}: ${activeStock} unids`}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                className="btn btn-outline"
                style={{ width: "32px", height: "32px", padding: 0, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <Minus size={14} />
              </button>
              <span style={{ minWidth: "30px", textAlign: "center", fontWeight: 800, fontSize: "1rem" }}>
                {cantidad}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (!isCinta && !product.stockIlimitado && cantidad >= activeStock) {
                    alert(`No puedes agregar más de ${activeStock} unidades disponibles de "${activeVariantName}".`);
                    return;
                  }
                  setCantidad(cantidad + 1);
                }}
                disabled={!isCinta && !product.stockIlimitado && cantidad >= activeStock}
                className="btn btn-outline"
                style={{ width: "32px", height: "32px", padding: 0, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Resumen de Total y Botón de Confirmación Fijo al Pie */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 20px",
            borderTop: "1px solid var(--border-color)",
            background: "var(--bg-tertiary)",
            flexShrink: 0
          }}>
            <div>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>
                Total a Cobrar:
              </span>
              <span style={{ fontSize: "1.35rem", fontWeight: 900, color: "var(--accent-blue, #60a5fa)", fontFamily: "var(--font-mono)" }}>
                ${precioTotal.toLocaleString()} COP
              </span>
            </div>

            <button
              type="submit"
              disabled={isOutOfStock}
              className="btn btn-primary"
              style={{
                padding: "12px 24px",
                borderRadius: "14px",
                fontSize: "0.92rem",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: isOutOfStock 
                  ? "#4b5563" 
                  : isCordon
                    ? "linear-gradient(135deg, #f97316 0%, #ea580c 100%)"
                    : (isCalzadoRopa 
                        ? (isChancleta ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)")
                        : isCinta ? "linear-gradient(135deg, #059669 0%, #047857 100%)" : "linear-gradient(135deg, #ec4899 0%, #db2777 100%)"),
                cursor: isOutOfStock ? "not-allowed" : "pointer",
                boxShadow: isOutOfStock ? "none" : isCordon ? "0 8px 20px rgba(249, 115, 22, 0.4)" : (isCalzadoRopa ? (isChancleta ? "0 8px 20px rgba(245, 158, 11, 0.4)" : "0 8px 20px rgba(139, 92, 246, 0.4)") : isCinta ? "0 8px 20px rgba(16, 185, 129, 0.4)" : "0 8px 20px rgba(236, 72, 153, 0.4)")
              }}
            >
              <ShoppingBag size={18} />
              <span>{isOutOfStock ? "Agotado en Tienda" : isCordon ? `Agregar ${cantidad} ${cantidad === 1 ? 'Par' : 'Pares'} a la Venta` : "Agregar a la Venta"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
