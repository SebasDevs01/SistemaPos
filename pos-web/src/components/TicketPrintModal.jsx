import React, { useState } from "react";
import { Printer, X, MessageCircle, FileDown, Loader2 } from "lucide-react";
import { generateTicketPDF, downloadPDFBlob, sendTicketPDFToWhatsApp } from "../utils/pdfTicketGenerator";

export default function TicketPrintModal({ sale, onClose, storeConfig }) {
  if (!sale) return null;

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const storeName = storeConfig?.nombre || "Miscelánea María José";
  const storeNit = storeConfig?.nit || "1102321427-0";
  const storeDir = storeConfig?.direccion || "Calle 59 # 39W-24";
  const storeBarrio = storeConfig?.barrio ? ` - B/ ${storeConfig.barrio}` : "";
  const storeCity = storeConfig?.ciudad || "Barrancabermeja";
  const storeTel = storeConfig?.telefono || "3171166497";
  const storeWA = storeConfig?.celularWhatsApp ? ` · Cel: ${storeConfig.celularWhatsApp}` : "";
  const storeMsg = storeConfig?.mensajeTicket || "¡Gracias por su compra! Vuelva pronto";

  // ── Imprimir clonando exactamente el elemento visual #printable-ticket ──
  const handlePrint = () => {
    const el = document.getElementById("printable-ticket");
    if (!el) { alert("No se encontró la factura para imprimir."); return; }

    const ticketHTML = el.outerHTML;

    const printHTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Factura #${sale.id} - ${storeName}</title>
  <style>
    @page { margin: 4mm 6mm; size: 80mm auto; }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
      text-rendering: geometricPrecision !important;
    }
    html, body { margin: 0; padding: 0; background: #ffffff !important; width: 80mm; }
    /* Quitar borde/sombra del contenedor del modal */
    #printable-ticket {
      border: none !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      padding: 8px 4px !important;
      width: 100% !important;
      max-width: 78mm !important;
      color: #000000 !important;
      background: #ffffff !important;
    }
    #printable-ticket * {
      color: #000000 !important;
      background-color: transparent !important;
    }
  </style>
</head>
<body>
${ticketHTML}
<script>window.onload=function(){window.print();setTimeout(function(){window.close();},1200);}<\/script>
</body>
</html>`;

    const pw = window.open("", "_blank", "width=380,height=700,toolbar=no,menubar=no,scrollbars=yes");
    if (pw) {
      pw.document.write(printHTML);
      pw.document.close();
    } else {
      alert("Por favor permite las ventanas emergentes para imprimir la factura.");
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      const fileName = `Factura_${sale.id}.pdf`;
      const { pdfBlob } = await generateTicketPDF("printable-ticket", fileName);
      downloadPDFBlob(pdfBlob, fileName);
    } catch (e) {
      console.error("Error generando PDF:", e);
      alert("No se pudo generar el PDF de la factura.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleWhatsApp = async () => {
    try {
      setIsGeneratingPDF(true);
      const fileName = `Factura_${sale.id}.pdf`;
      await sendTicketPDFToWhatsApp({
        elementId: "printable-ticket",
        phone: sale.cliente?.telefono || sale.cliente?.dni,
        fileName,
        clientName: sale.cliente?.nombre || "Cliente",
        ticketNumber: sale.id,
        totalAmount: sale.total || 0,
        storeName,
        extraDetails: `💳 *Método de Pago:* ${sale.metodoPago || "Efectivo"}`
      });
    } catch (err) {
      console.error("Error enviando factura por WhatsApp:", err);
      alert("No se pudo enviar la factura por WhatsApp.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1250 }}>
      <div
        className="modal-content modal-card"
        style={{
          maxWidth: "440px",
          width: "94%",
          padding: "20px",
          background: "var(--bg-secondary, #111827)",
          border: "1px solid var(--border-strong)",
          borderRadius: "20px",
          boxShadow: "0 25px 65px -10px rgba(0,0,0,0.85)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-main)" }}>
            Vista Previa de Factura Térmica
          </h3>
          <button onClick={onClose} className="btn btn-outline" style={{ padding: "4px 8px" }}>
            <X size={16} />
          </button>
        </div>

        {/* TICKET IMPRIMIBLE EN ALTA NITIDEZ */}
        <div 
          id="printable-ticket"
          style={{
            background: "#ffffff",
            color: "#000000",
            padding: "16px",
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
            fontSize: "12px",
            fontWeight: 600,
            lineHeight: "1.35",
            borderRadius: "6px",
            border: "1.5px solid #000000",
            boxShadow: "0 4px 15px rgba(0,0,0,0.2)"
          }}
        >
          {/* Encabezado */}
          <div style={{ textAlign: "center", marginBottom: "8px" }}>
            <div style={{ fontSize: "15px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.3px" }}>
              {storeName}
            </div>
            <div>NIT: {storeNit}</div>
            <div>${storeDir}${storeBarrio}</div>
            {storeCity && <div>${storeCity}</div>}
            <div>Tel: {storeTel}${storeWA}</div>
            <div style={{ borderTop: "1.5px dashed #000000", margin: "6px 0" }}></div>
            <div style={{ fontWeight: 800, fontSize: "12px" }}>FACTURA DE VENTA</div>
            <div style={{ borderTop: "1.5px dashed #000000", margin: "6px 0" }}></div>
          </div>

          {/* Información del Ticket */}
          <div style={{ marginBottom: "8px", fontSize: "11px" }}>
            <div><strong>Ticket:</strong> #{sale.id}</div>
            <div><strong>Fecha:</strong> {new Date(sale.fecha || Date.now()).toLocaleString("es-CO")}</div>
            <div><strong>Cliente:</strong> {sale.cliente?.nombre || "Mostrador"} ({sale.cliente?.dni || "0"})</div>
            <div><strong>Cajero:</strong> {sale.vendedor || "Caja Principal"}</div>
            <div style={{ borderTop: "1.5px dashed #000000", margin: "6px 0" }}></div>
          </div>

          {/* Lista de Productos */}
          <div style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, marginBottom: "4px" }}>
              <span>CANT  DESCRIPCIÓN</span>
              <span>TOTAL</span>
            </div>
            <div style={{ borderTop: "1px dashed #000000", marginBottom: "6px" }}></div>
            {(sale.items || []).map((item, idx) => (
              <div key={idx} style={{ marginBottom: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                  <span>
                    {item.cantidad}x {item.nombre}
                    {item.presentacion === "paquete" ? " (PAQ)" : ""}
                    {item.talla ? ` [T:${item.talla}]` : ""}
                  </span>
                  <span>${Number(item.subtotal || 0).toLocaleString("es-CO")}</span>
                </div>
                <div style={{ fontSize: "10px", color: "#000000", fontWeight: 600 }}>
                  (${Number(item.precioUnitario || 0).toLocaleString("es-CO")} c/u)
                </div>
              </div>
            ))}
            <div style={{ borderTop: "1.5px dashed #000000", margin: "6px 0" }}></div>
          </div>

          {/* Totales y Pagos */}
          <div style={{ marginBottom: "8px" }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "14px",
              fontWeight: 900,
              border: "1.5px solid #000000",
              padding: "6px 8px",
              borderRadius: "4px",
              margin: "6px 0"
            }}>
              <span>TOTAL A PAGAR:</span>
              <span>${Number(sale.total || 0).toLocaleString("es-CO")} COP</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
              <span>Método de Pago:</span>
              <strong style={{ fontWeight: 800 }}>{sale.metodoPago || "Efectivo"}</strong>
            </div>
            {sale.metodoPago === "Efectivo" && Number(sale.efectivoRecibido || 0) > 0 && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
                  <span>Efectivo Recibido:</span>
                  <span>${Number(sale.efectivoRecibido).toLocaleString("es-CO")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "12px", marginTop: "2px" }}>
                  <span>Cambio / Vueltos:</span>
                  <span>${Number(sale.cambio || 0).toLocaleString("es-CO")} COP</span>
                </div>
              </>
            )}
            <div style={{ borderTop: "1.5px dashed #000000", margin: "6px 0" }}></div>
          </div>

          {/* Pie de ticket */}
          <div style={{ textAlign: "center", fontSize: "10.5px", fontWeight: 600 }}>
            <div>{storeMsg}</div>
            <div style={{ marginTop: "4px", fontSize: "9.5px", fontWeight: 700 }}>Software POS Web 2.0</div>
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: "flex", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
          <button onClick={onClose} className="btn btn-outline" style={{ flex: "1 1 80px", padding: "10px" }} disabled={isGeneratingPDF}>
            Cerrar
          </button>
          <button
            onClick={handleDownloadPDF}
            className="btn btn-outline"
            style={{ flex: "1 1 120px", padding: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
            title="Descargar factura en PDF"
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
            <span>Descargar PDF</span>
          </button>
          {(sale.cliente?.telefono || (sale.cliente?.dni && sale.cliente.dni.length >= 7)) && (
            <button
              onClick={handleWhatsApp}
              className="btn btn-whatsapp"
              style={{ flex: "1.5 1 140px", padding: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              title="Enviar factura en PDF por WhatsApp al cliente"
              disabled={isGeneratingPDF}
            >
              {isGeneratingPDF ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
              <span>{isGeneratingPDF ? "Generando..." : "WhatsApp (PDF)"}</span>
            </button>
          )}
          <button
            onClick={handlePrint}
            className="btn btn-primary"
            style={{
              flex: "2 1 160px",
              padding: "10px",
              fontSize: "0.95rem",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px"
            }}
            disabled={isGeneratingPDF}
          >
            <Printer size={16} />
            <span>Imprimir Factura</span>
          </button>
        </div>
      </div>
    </div>
  );
}
