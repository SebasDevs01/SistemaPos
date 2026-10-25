import React, { useState, useEffect, useCallback } from "react";
import JsBarcode from "jsbarcode";
import {
  Barcode, Printer, Grid, Sliders, CheckCircle2,
  Package, Layers, CheckSquare, Square, Search, X
} from "lucide-react";

// Genera un DataURL de código de barras para un código dado
function generateBarDataUrl(code) {
  if (!code) return "";
  try {
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, String(code), {
      format: "CODE128",
      lineColor: "#000000",
      width: 2,
      height: 48,
      displayValue: true,
      fontSize: 13,
      font: "monospace",
      textMargin: 3,
      margin: 4
    });
    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }
}

// Componente de un sticker individual
function StickerCell({ nombre, codigo, precio, barDataUrl, showStoreName, showPrice, storeName }) {
  return (
    <div
      className="barcode-sticker-item"
      style={{
        border: "1px dashed #9ca3af",
        padding: "8px 6px",
        textAlign: "center",
        background: "#ffffff",
        color: "#000000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "4px"
      }}
    >
      {showStoreName && (
        <div style={{ fontSize: "0.6rem", fontWeight: 800, textTransform: "uppercase", color: "#374151", marginBottom: "2px" }}>
          {storeName || "María José"}
        </div>
      )}
      <div style={{
        fontSize: "0.7rem", fontWeight: 700, marginBottom: "3px",
        maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis",
        whiteSpace: "nowrap", color: "#111827"
      }}>
        {nombre}
      </div>
      {barDataUrl
        ? <img src={barDataUrl} alt={`Código ${codigo}`} style={{ maxWidth: "100%", height: "42px", objectFit: "contain", margin: "2px 0" }} />
        : <div style={{ fontSize: "0.7rem", color: "#666" }}>Generando...</div>
      }
      {showPrice && (
        <div style={{ fontSize: "0.83rem", fontWeight: 900, color: "#000000", fontFamily: "monospace", marginTop: "2px" }}>
          ${Number(precio).toLocaleString()} COP
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────
// MODO 1: Un solo producto, N copias
// ────────────────────────────────────────────────
function ModeSingle({ products, initialProduct, showStoreName, showPrice, columnsCount, storeConfig }) {
  const [selectedProduct, setSelectedProduct] = useState(
    initialProduct || products[0] || { codigo: "1001", nombre: "Producto Ejemplo", precio: 2500 }
  );
  const [customCode, setCustomCode] = useState(selectedProduct?.codigo || "");
  const [labelTitle, setLabelTitle] = useState(selectedProduct?.nombre || "");
  const [price, setPrice] = useState(selectedProduct?.precio || 0);
  const [copies, setCopies] = useState(24);
  const [barDataUrl, setBarDataUrl] = useState("");

  useEffect(() => {
    if (selectedProduct) {
      setCustomCode(selectedProduct.codigo || "");
      setLabelTitle(selectedProduct.nombre || "");
      setPrice(selectedProduct.precio || 0);
    }
  }, [selectedProduct]);

  useEffect(() => {
    setBarDataUrl(generateBarDataUrl(customCode));
  }, [customCode]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "20px", alignItems: "start" }}>
      {/* Panel configuración */}
      <div className="glass-panel" style={{ padding: "20px", minWidth: 0, boxSizing: "border-box" }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Sliders size={15} color="var(--accent-blue)" /> Ajustes
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", minWidth: 0 }}>
          <label className="form-label" style={{ width: "100%", minWidth: 0 }}>
            <span>Producto del catálogo:</span>
            <select
              className="form-select"
              style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}
              value={selectedProduct?.codigo || ""}
              onChange={(e) => {
                const p = products.find(pr => String(pr.codigo) === e.target.value);
                if (p) setSelectedProduct(p);
              }}
            >
              {products.map(p => (
                <option key={p.id || p.codigo} value={p.codigo}>[{p.codigo}] {p.nombre} — ${Number(p.precio).toLocaleString()}</option>
              ))}
            </select>
          </label>
          <label className="form-label">
            <span>Código numérico:</span>
            <input className="form-input font-mono" value={customCode} onChange={(e) => setCustomCode(e.target.value)} />
          </label>
          <label className="form-label">
            <span>Nombre en el sticker:</span>
            <input className="form-input" value={labelTitle} onChange={(e) => setLabelTitle(e.target.value)} />
          </label>
          <label className="form-label">
            <span>Precio ($ COP):</span>
            <input className="form-input" type="number" value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} />
          </label>
          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Cantidad de stickers:</label>
            <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
              <input type="number" min="1" max="99" className="form-input" value={copies}
                onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
                style={{ width: "70px", textAlign: "center", fontWeight: 700 }}
              />
              {[12, 24, 30, 48].map(qty => (
                <button key={qty} type="button" onClick={() => setCopies(qty)}
                  className={`btn btn-sm ${copies === qty ? "btn-primary" : "btn-outline"}`}
                  style={{ padding: "4px 8px", fontSize: "0.72rem" }}>
                  {qty}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => window.print()} className="btn btn-primary" style={{ marginTop: "8px", padding: "11px" }}>
            <Printer size={16} /> Imprimir {copies} Stickers
          </button>
        </div>
      </div>

      {/* Vista previa */}
      <div className="glass-panel" style={{ padding: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
            <Grid size={15} color="var(--accent-blue)" /> Vista Previa ({copies} stickers)
          </h3>
          <span className="badge badge-green">Listo para imprimir</span>
        </div>
        <div id="printable-barcode-sheet" style={{
          background: "#fff", padding: "16px", borderRadius: "8px",
          display: "grid", gridTemplateColumns: `repeat(${columnsCount}, 1fr)`,
          gap: "10px", maxHeight: "620px", overflowY: "auto",
          border: "1px solid #d1d5db"
        }}>
          {Array.from({ length: copies }).map((_, i) => (
            <StickerCell key={i}
              nombre={labelTitle} codigo={customCode} precio={price}
              barDataUrl={barDataUrl} showStoreName={showStoreName}
              showPrice={showPrice} storeName={storeConfig?.nombre}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// MODO 2: Varios productos seleccionados a mano
// ────────────────────────────────────────────────
function ModeMulti({ products, showStoreName, showPrice, columnsCount, storeConfig }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState({}); // { codigo: cantidad }
  const [barCache, setBarCache] = useState({});

  const filtered = products.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    String(p.codigo).includes(search)
  );

  const toggleProduct = (p) => {
    setSelected(prev => {
      const next = { ...prev };
      if (next[p.codigo]) {
        delete next[p.codigo];
      } else {
        next[p.codigo] = 1;
      }
      return next;
    });
    if (!barCache[p.codigo]) {
      setBarCache(prev => ({ ...prev, [p.codigo]: generateBarDataUrl(p.codigo) }));
    }
  };

  const setCopies = (codigo, val) => {
    setSelected(prev => ({ ...prev, [codigo]: Math.max(1, parseInt(val) || 1) }));
  };

  // Expandir barras para todos seleccionados
  useEffect(() => {
    Object.keys(selected).forEach(codigo => {
      if (!barCache[codigo]) {
        setBarCache(prev => ({ ...prev, [codigo]: generateBarDataUrl(codigo) }));
      }
    });
  }, [selected]);

  // Construir la lista de stickers a imprimir
  const stickers = [];
  products.forEach(p => {
    if (selected[p.codigo]) {
      for (let i = 0; i < selected[p.codigo]; i++) {
        stickers.push(p);
      }
    }
  });

  const totalStickers = stickers.length;
  const selectedCount = Object.keys(selected).length;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "20px", alignItems: "start" }}>
      {/* Selector de productos */}
      <div className="glass-panel" style={{ padding: "18px", minWidth: 0, boxSizing: "border-box" }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
          <CheckSquare size={15} color="var(--accent-blue)" /> Seleccionar Productos
          {selectedCount > 0 && <span className="badge badge-indigo">{selectedCount} selec.</span>}
        </h3>

        {/* Buscador */}
        <div style={{ position: "relative", marginBottom: "10px" }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input className="form-input" placeholder="Buscar producto..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: "32px", paddingRight: search ? "30px" : "10px" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0 }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Lista de productos */}
        <div style={{ maxHeight: "420px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
          {filtered.map(p => {
            const isChecked = !!selected[p.codigo];
            return (
              <div key={p.codigo}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "7px 10px", borderRadius: "8px", cursor: "pointer",
                  background: isChecked ? "rgba(99,102,241,0.1)" : "var(--bg-glass)",
                  border: `1px solid ${isChecked ? "rgba(99,102,241,0.35)" : "var(--border-color)"}`,
                  transition: "all 0.15s"
                }}
                onClick={() => toggleProduct(p)}
              >
                <div style={{ flexShrink: 0, color: isChecked ? "var(--neon-indigo)" : "var(--text-dim)" }}>
                  {isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-main)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.nombre}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>#{p.codigo} · ${Number(p.precio).toLocaleString()}</div>
                </div>
                {isChecked && (
                  <input
                    type="number" min="1" max="99"
                    value={selected[p.codigo]}
                    onClick={e => e.stopPropagation()}
                    onChange={e => setCopies(p.codigo, e.target.value)}
                    style={{
                      width: "52px", textAlign: "center", fontWeight: 700,
                      background: "var(--bg-secondary)", border: "1px solid var(--border-strong)",
                      borderRadius: "6px", color: "var(--text-main)", padding: "3px 6px", fontSize: "0.8rem"
                    }}
                  />
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", padding: "20px" }}>Sin resultados</div>
          )}
        </div>

        {selectedCount > 0 && (
          <div style={{ marginTop: "12px", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "10px" }}>
              {selectedCount} productos · {totalStickers} stickers en total
            </div>
            <button onClick={() => setSelected({})} className="btn btn-outline btn-sm" style={{ marginBottom: "8px", width: "100%" }}>
              <X size={13} /> Limpiar selección
            </button>
            <button onClick={() => window.print()} className="btn btn-primary" style={{ padding: "11px", width: "100%" }}>
              <Printer size={16} /> Imprimir {totalStickers} Stickers
            </button>
          </div>
        )}
        {selectedCount === 0 && (
          <div style={{ marginTop: "10px", fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
            Haz clic en un producto para seleccionarlo
          </div>
        )}
      </div>

      {/* Vista previa */}
      <div className="glass-panel" style={{ padding: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
            <Grid size={15} color="var(--accent-blue)" /> Vista Previa ({totalStickers} stickers)
          </h3>
          {totalStickers > 0 && <span className="badge badge-green">Listo para imprimir</span>}
        </div>
        {totalStickers === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
            <CheckSquare size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <p style={{ fontSize: "0.85rem" }}>Selecciona productos de la lista para ver la vista previa</p>
          </div>
        ) : (
          <div id="printable-barcode-sheet" style={{
            background: "#fff", padding: "16px", borderRadius: "8px",
            display: "grid", gridTemplateColumns: `repeat(${columnsCount}, 1fr)`,
            gap: "10px", maxHeight: "620px", overflowY: "auto",
            border: "1px solid #d1d5db"
          }}>
            {stickers.map((p, i) => (
              <StickerCell key={i}
                nombre={p.nombre} codigo={p.codigo} precio={p.precio}
                barDataUrl={barCache[p.codigo] || ""}
                showStoreName={showStoreName} showPrice={showPrice}
                storeName={storeConfig?.nombre}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// MODO 3: Todos los productos, 1 sticker por producto
// ────────────────────────────────────────────────
function ModeAll({ products, showStoreName, showPrice, columnsCount, storeConfig }) {
  const [search, setSearch] = useState("");
  const [barCache, setBarCache] = useState({});
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generated, setGenerated] = useState(false);

  const filtered = products.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    String(p.codigo).includes(search)
  );

  const handleGenerateAll = useCallback(async () => {
    setGeneratingAll(true);
    const cache = {};
    // Batch generation to avoid freezing UI
    for (let i = 0; i < filtered.length; i++) {
      cache[filtered[i].codigo] = generateBarDataUrl(filtered[i].codigo);
      if (i % 30 === 0) {
        // Yield to browser
        await new Promise(r => setTimeout(r, 0));
      }
    }
    setBarCache(cache);
    setGeneratingAll(false);
    setGenerated(true);
  }, [filtered]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "20px", alignItems: "start" }}>
      {/* Panel */}
      <div className="glass-panel" style={{ padding: "20px", minWidth: 0, boxSizing: "border-box" }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Layers size={15} color="var(--accent-blue)" /> Todos los Productos
        </h3>
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "14px", lineHeight: 1.5 }}>
          Se generará <strong>1 sticker por producto</strong> (uno diferente por cada ítem del catálogo). Ideal para etiquetar estantes.
        </p>

        {/* Buscador / filtro */}
        <div style={{ position: "relative", marginBottom: "12px" }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input className="form-input" placeholder="Filtrar productos..." value={search}
            onChange={e => { setSearch(e.target.value); setGenerated(false); }}
            style={{ paddingLeft: "32px" }}
          />
        </div>

        <div style={{
          padding: "12px 14px", borderRadius: "10px",
          background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
          fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "14px"
        }}>
          📦 <strong style={{ color: "var(--text-main)" }}>{filtered.length}</strong> productos seleccionados →{" "}
          <strong style={{ color: "var(--neon-indigo)" }}>{filtered.length} stickers</strong>
        </div>

        <button
          onClick={handleGenerateAll}
          className="btn btn-primary"
          disabled={generatingAll || filtered.length === 0}
          style={{ width: "100%", marginBottom: "8px", padding: "11px" }}
        >
          {generatingAll ? "⏳ Generando códigos de barras..." : <><CheckCircle2 size={15} /> Generar Códigos de Barras</>}
        </button>

        {generated && (
          <button onClick={() => window.print()} className="btn btn-primary" style={{ width: "100%", padding: "11px", background: "linear-gradient(135deg, #059669, #047857)" }}>
            <Printer size={16} /> Imprimir {filtered.length} Stickers
          </button>
        )}
      </div>

      {/* Vista previa */}
      <div className="glass-panel" style={{ padding: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
            <Grid size={15} color="var(--accent-blue)" /> Vista Previa ({filtered.length} stickers — 1 por producto)
          </h3>
          {generated && <span className="badge badge-green">Listo para imprimir</span>}
        </div>
        {!generated ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
            <Layers size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <p style={{ fontSize: "0.85rem" }}>Haz clic en "Generar Códigos de Barras" para ver la hoja de impresión</p>
          </div>
        ) : (
          <div id="printable-barcode-sheet" style={{
            background: "#fff", padding: "16px", borderRadius: "8px",
            display: "grid", gridTemplateColumns: `repeat(${columnsCount}, 1fr)`,
            gap: "10px", maxHeight: "620px", overflowY: "auto",
            border: "1px solid #d1d5db"
          }}>
            {filtered.map((p, i) => (
              <StickerCell key={i}
                nombre={p.nombre} codigo={p.codigo} precio={p.precio}
                barDataUrl={barCache[p.codigo] || ""}
                showStoreName={showStoreName} showPrice={showPrice}
                storeName={storeConfig?.nombre}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// VISTA PRINCIPAL
// ────────────────────────────────────────────────
export default function BarcodeGeneratorView({ products, initialProduct, storeConfig }) {
  const [mode, setMode] = useState("single"); // "single" | "multi" | "all"
  const [showPrice, setShowPrice] = useState(true);
  const [showStoreName, setShowStoreName] = useState(true);
  const [columnsCount, setColumnsCount] = useState(3);

  const MODES = [
    { id: "single", label: "1 Producto", icon: <Barcode size={15} />, desc: "Un producto, N copias" },
    { id: "multi",  label: "Varios Productos", icon: <CheckSquare size={15} />, desc: "Selecciona cuáles y cuántos" },
    { id: "all",    label: "Todos los Productos", icon: <Layers size={15} />, desc: "1 sticker por producto" },
  ];

  return (
    <div style={{ maxWidth: "1600px", margin: "0 auto", padding: "16px 20px" }}>
      {/* Cabecera */}
      <div style={{ marginBottom: "18px" }}>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "10px", margin: "0 0 4px" }}>
          <Barcode size={26} color="var(--accent-blue)" />
          Generador de Stickers con Código de Barras
        </h2>
        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
          Imprime etiquetas 100% legibles con tu lector USB. Elige el modo de impresión según tus necesidades.
        </p>
      </div>

      {/* Selector de modo */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className="btn"
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "10px 16px", borderRadius: "10px",
              border: mode === m.id ? "2px solid var(--accent-blue)" : "1px solid var(--border-color)",
              background: mode === m.id ? "rgba(59,130,246,0.15)" : "var(--bg-glass)",
              color: mode === m.id ? "var(--accent-blue)" : "var(--text-muted)",
              fontWeight: mode === m.id ? 700 : 500,
              transition: "all 0.15s"
            }}
          >
            {m.icon}
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "0.82rem" }}>{m.label}</div>
              <div style={{ fontSize: "0.67rem", opacity: 0.75 }}>{m.desc}</div>
            </div>
          </button>
        ))}

        {/* Opciones globales (siempre visibles) */}
        <div style={{ marginLeft: "auto", display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", cursor: "pointer", color: "var(--text-muted)" }}>
            <input type="checkbox" checked={showStoreName} onChange={e => setShowStoreName(e.target.checked)} />
            Tienda
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", cursor: "pointer", color: "var(--text-muted)" }}>
            <input type="checkbox" checked={showPrice} onChange={e => setShowPrice(e.target.checked)} />
            Precio
          </label>
          <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Cols:</span>
            {[3, 4].map(c => (
              <button key={c} type="button" onClick={() => setColumnsCount(c)}
                className={`btn btn-sm ${columnsCount === c ? "btn-primary" : "btn-outline"}`}
                style={{ padding: "4px 9px", fontSize: "0.72rem" }}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido según modo */}
      {mode === "single" && (
        <ModeSingle products={products} initialProduct={initialProduct}
          showStoreName={showStoreName} showPrice={showPrice}
          columnsCount={columnsCount} storeConfig={storeConfig}
        />
      )}
      {mode === "multi" && (
        <ModeMulti products={products}
          showStoreName={showStoreName} showPrice={showPrice}
          columnsCount={columnsCount} storeConfig={storeConfig}
        />
      )}
      {mode === "all" && (
        <ModeAll products={products}
          showStoreName={showStoreName} showPrice={showPrice}
          columnsCount={columnsCount} storeConfig={storeConfig}
        />
      )}
    </div>
  );
}
