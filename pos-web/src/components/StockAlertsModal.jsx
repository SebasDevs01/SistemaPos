import React, { useState } from "react";
import { 
  AlertTriangle, 
  X, 
  Plus, 
  MessageSquare, 
  Package, 
  ArrowRight, 
  Check, 
  Download,
  AlertCircle
} from "lucide-react";
import { getProductImage } from "../data/initialData";

export default function StockAlertsModal({ 
  isOpen, 
  onClose, 
  products, 
  onUpdateStock,
  storeConfig 
}) {
  const [activeTab, setActiveTab] = useState("agotados");
  const [restockInputs, setRestockInputs] = useState({});

  if (!isOpen) return null;

  // Filtrar productos
  const outOfStock = products.filter(p => Number(p.stock) <= 0);
  const lowStock = products.filter(p => Number(p.stock) > 0 && Number(p.stock) <= 3);

  const displayedList = activeTab === "agotados" ? outOfStock : lowStock;

  const handleRestockChange = (id, val) => {
    setRestockInputs({ ...restockInputs, [id]: parseInt(val) || 0 });
  };

  const handleApplyRestock = async (product) => {
    const prodId = product.id || product.codigo;
    const addQty = restockInputs[prodId] || 0;
    if (addQty <= 0) {
      alert("Por favor ingresa una cantidad mayor a 0 para reponer.");
      return;
    }
    const updated = { ...product, stock: product.stock + addQty };
    await onUpdateStock(updated);
    setRestockInputs({ ...restockInputs, [prodId]: 0 });
  };

  // Generar lista de pedido para enviar por WhatsApp al Proveedor
  const handleSendSupplierWhatsApp = () => {
    const itemsToOrder = [...outOfStock, ...lowStock];
    if (itemsToOrder.length === 0) {
      alert("No hay productos agotados ni con bajo stock.");
      return;
    }

    let text = `📦 *PEDIDO DE REPOSICIÓN - ${storeConfig.nombre || "Miscelánea María José"}*\n\n`;
    text += `Hola estimado proveedor, requerimos cotización/despacho de los siguientes artículos que se encuentran sin stock o por agotarse:\n\n`;

    if (outOfStock.length > 0) {
      text += `🚨 *PRODUCTOS AGOTADOS (STOCK 0):*\n`;
      outOfStock.forEach(p => {
        text += `• [${p.codigo}] ${p.nombre} (Sección: ${p.categoria})\n`;
      });
      text += `\n`;
    }

    if (lowStock.length > 0) {
      text += `⚠️ *PRODUCTOS POR AGOTARSE (Stock crítico):*\n`;
      lowStock.forEach(p => {
        text += `• [${p.codigo}] ${p.nombre} - Quedan solo ${p.stock} unids\n`;
      });
      text += `\n`;
    }

    text += `Quedamos atentos a su pronta respuesta y despacho. ¡Muchas gracias!`;

    const encoded = encodeURIComponent(text);
    // Número del proveedor (puedes cambiarlo al teléfono del proveedor)
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-card"
        style={{
          maxWidth: "850px",
          width: "94%",
          padding: "24px",
          background: "var(--bg-secondary, #111827)",
          border: "1px solid var(--border-strong)",
          borderRadius: "20px",
          boxShadow: "0 25px 65px -10px rgba(0,0,0,0.8)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "10px" }}>
              <AlertTriangle size={24} color="var(--accent-rose)" />
              Centro de Alertas de Inventario & Reposición
            </h2>
            <p style={{ fontSize: "0.825rem", color: "var(--text-muted)" }}>
              Monitorea artículos agotados y gestiona pedidos de reposición inmediata con tus proveedores.
            </p>
          </div>
          <button onClick={onClose} className="btn btn-outline" style={{ padding: "6px 10px" }}>
            <X size={18} />
          </button>
        </div>

        {/* Pestañas de Alerta */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setActiveTab("agotados")}
              className="btn"
              style={{
                padding: "8px 16px",
                fontSize: "0.85rem",
                borderRadius: "var(--radius-full)",
                border: activeTab === "agotados" ? "2px solid var(--accent-rose)" : "1px solid var(--border-color)",
                background: activeTab === "agotados" ? "rgba(244, 63, 94, 0.2)" : "transparent",
                color: activeTab === "agotados" ? "#f87171" : "var(--text-muted)",
                fontWeight: 700
              }}
            >
              🚨 Sin Stock / Agotados ({outOfStock.length})
            </button>

            <button
              onClick={() => setActiveTab("bajo_stock")}
              className="btn"
              style={{
                padding: "8px 16px",
                fontSize: "0.85rem",
                borderRadius: "var(--radius-full)",
                border: activeTab === "bajo_stock" ? "2px solid var(--accent-amber)" : "1px solid var(--border-color)",
                background: activeTab === "bajo_stock" ? "rgba(245, 158, 11, 0.2)" : "transparent",
                color: activeTab === "bajo_stock" ? "#fbbf24" : "var(--text-muted)",
                fontWeight: 700
              }}
            >
              ⚠️ Por Agotarse (&le; 3 unids) ({lowStock.length})
            </button>
          </div>

          {/* Botón WhatsApp Proveedor */}
          <button
            onClick={handleSendSupplierWhatsApp}
            className="btn btn-whatsapp"
            style={{ padding: "8px 14px", fontSize: "0.85rem" }}
            title="Generar lista de compras para el proveedor"
          >
            <MessageSquare size={16} />
            <span>Pedir al Proveedor por WhatsApp</span>
          </button>
        </div>

        {/* Lista de Productos en Alerta */}
        <div style={{ maxHeight: "420px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}>
          {displayedList.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
              <Package size={40} style={{ opacity: 0.3, margin: "0 auto 10px" }} />
              <p style={{ fontWeight: 600 }}>¡Excelente! No tienes productos en esta condición.</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "rgba(0, 0, 0, 0.2)", borderBottom: "1px solid var(--border-color)" }}>
                  <th style={{ padding: "10px 14px", color: "var(--text-muted)" }}>Foto</th>
                  <th style={{ padding: "10px 14px", color: "var(--text-muted)" }}>Código</th>
                  <th style={{ padding: "10px 14px", color: "var(--text-muted)" }}>Producto</th>
                  <th style={{ padding: "10px 14px", color: "var(--text-muted)" }}>Sección</th>
                  <th style={{ padding: "10px 14px", color: "var(--text-muted)" }}>Stock Actual</th>
                  <th style={{ padding: "10px 14px", color: "var(--text-muted)" }}>Precio Venta</th>
                  <th style={{ padding: "10px 14px", color: "var(--text-muted)", textAlign: "right" }}>Reponer Existencias</th>
                </tr>
              </thead>
              <tbody>
                {displayedList.map(prod => {
                  const prodId = prod.id || prod.codigo;
                  const restockVal = restockInputs[prodId] || "";

                  return (
                    <tr 
                      key={prodId}
                      style={{ borderBottom: "1px solid var(--border-color)" }}
                    >
                      <td style={{ padding: "8px 14px" }}>
                        <img
                          src={getProductImage(prod)}
                          alt={prod.nombre}
                          style={{ width: "36px", height: "36px", borderRadius: "4px", objectFit: "cover" }}
                        />
                      </td>

                      <td style={{ padding: "8px 14px" }}>
                        <span className="badge badge-blue font-mono" style={{ fontSize: "0.7rem" }}>
                          {prod.codigo}
                        </span>
                      </td>

                      <td style={{ padding: "8px 14px", fontWeight: 700, color: "var(--text-main)" }}>
                        {prod.nombre}
                      </td>

                      <td style={{ padding: "8px 14px" }}>
                        <span className="badge" style={{ fontSize: "0.7rem", background: "rgba(255, 255, 255, 0.08)" }}>
                          {prod.categoria}
                        </span>
                      </td>

                      <td style={{ padding: "8px 14px" }}>
                        <span style={{
                          fontWeight: 800,
                          color: prod.stock <= 0 ? "var(--accent-rose)" : "var(--accent-amber)",
                          fontSize: "0.9rem"
                        }}>
                          {prod.stock === 0 ? "0 (AGOTADO)" : `${prod.stock} unids`}
                        </span>
                      </td>

                      <td style={{ padding: "8px 14px" }}>
                        <span className="price-tag">${Number(prod.precio).toLocaleString()}</span>
                      </td>

                      <td style={{ padding: "8px 14px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                          <input
                            type="number"
                            min="1"
                            placeholder="+ Cant"
                            className="input-field"
                            value={restockVal}
                            onChange={(e) => handleRestockChange(prodId, e.target.value)}
                            style={{ width: "70px", padding: "4px 8px", fontSize: "0.8rem", textAlign: "center" }}
                          />
                          <button
                            type="button"
                            onClick={() => handleApplyRestock(prod)}
                            className="btn btn-success"
                            style={{ padding: "5px 10px", fontSize: "0.75rem" }}
                            title="Sumar al stock existente"
                          >
                            <Plus size={14} /> Sumar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Total en situación crítica: <strong>{outOfStock.length + lowStock.length} productos</strong>
          </span>
          <button onClick={onClose} className="btn btn-primary" style={{ padding: "8px 18px", fontSize: "0.9rem" }}>
            Cerrar Alertas
          </button>
        </div>
      </div>
    </div>
  );
}
