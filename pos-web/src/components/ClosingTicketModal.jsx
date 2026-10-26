import React from "react";
import { Printer, X, Download, Share2 } from "lucide-react";
import { formatCOP } from "../utils/formatCOP";

/**
 * Genera el HTML completo del ticket de cierre (mismo usado para impresión)
 * retornando una cadena HTML lista para usar en blob/iframe/nueva ventana.
 */
export function buildClosingTicketHTML(closing, storeConfig = {}) {
  const storeName = storeConfig.nombre || "Miscelánea María José";
  const storeNit = storeConfig.nit || "151515";
  const storeAddress = `${storeConfig.direccion || "Calle 59# 39 w24"}${storeConfig.barrio ? ` - B/ ${storeConfig.barrio}` : ""}`;
  const storePhone = storeConfig.telefono || "3171166497";
  const storeWhatsApp = storeConfig.celularWhatsApp ? ` · Cel: ${storeConfig.celularWhatsApp}` : "";
  const fechaAperturaStr = closing.fechaApertura
    ? new Date(closing.fechaApertura).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })
    : "—";
  const fechaCierreStr = closing.fechaCierre
    ? new Date(closing.fechaCierre).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })
    : new Date().toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
  const diff = Number(closing.diferencia) || 0;
  const diffLabel = diff === 0
    ? "CAJA CUADRADA ($0)"
    : diff > 0
      ? `SOBRANTE: +${formatCOP(diff)}`
      : `FALTANTE: -${formatCOP(Math.abs(diff))}`;
  const productos = closing.productosVendidos || [];
  const movimientos = closing.movimientos || [];
  const entradas = movimientos.filter(m => m.tipo === "ingreso");
  const salidas = movimientos.filter(m => m.tipo === "egreso");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Cierre de Caja — ${closing.id || "Cierre"} — ${storeName}</title>
  <style>
    @page { margin: 2mm 3mm; size: 80mm auto; }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
      text-rendering: geometricPrecision !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 11.5px;
      font-weight: 600;
      line-height: 1.35;
      margin: 0;
      padding: 4px 6px;
      color: #000000 !important;
      background: #ffffff !important;
      width: 74mm;
      max-width: 74mm;
    }
    .text-center { text-align: center; }
    .bold { font-weight: 800 !important; }
    .divider { border-top: 1.5px dashed #000000; margin: 6px 0; }
    .double-divider { border-top: 1.5px solid #000000; border-bottom: 1.5px solid #000000; padding: 3px 0; margin: 6px 0; font-weight: 800 !important; }
    .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin: 4px 0; }
    th { border-bottom: 1.5px dashed #000000; padding-bottom: 3px; text-align: left; font-weight: 800 !important; }
    td { padding: 2px 0; vertical-align: top; font-weight: 600; }
    .signature-box { margin-top: 25px; display: flex; justify-content: space-between; text-align: center; font-size: 10px; font-weight: 700; }
    .signature-line { width: 45%; border-top: 1.5px solid #000000; padding-top: 4px; }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="bold" style="font-size: 13px; text-transform: uppercase;">${storeName}</div>
    <div>NIT: ${storeNit}</div>
    <div>${storeAddress}</div>
    <div>Tel: ${storePhone}${storeWhatsApp}</div>
    <div class="divider"></div>
    <div class="bold" style="font-size: 12px;">*** CIERRE DE CAJA ***</div>
    <div>Comprobante de Arqueo y Cierre</div>
  </div>
  <div class="divider"></div>
  <div class="row"><span>ID Cierre:</span><span class="bold">${closing.id || "CIERRE"}</span></div>
  <div class="row"><span>Apertura:</span><span>${fechaAperturaStr}</span></div>
  <div class="row"><span>Cierre:</span><span>${fechaCierreStr}</span></div>
  <div class="row"><span>Cajero Apertura:</span><span>${closing.cajeroApertura || "Cajero"}</span></div>
  <div class="row"><span>Cajero Cierre:</span><span>${closing.cajeroCierre || closing.cajeroApertura || "Cajero"}</span></div>
  ${closing.horarioOficial ? `<div class="row"><span>Horario:</span><span>${closing.horarioOficial}</span></div>` : ""}
  <div class="double-divider bold text-center">BALANCE GENERAL DE CAJA</div>
  <div class="row"><span>(+) Base Inicial:</span><span class="bold">${formatCOP(closing.baseInicial || 0)}</span></div>
  <div class="row"><span>(+) Ventas Efectivo:</span><span class="bold">${formatCOP(closing.ventasEfectivo || 0)}</span></div>
  <div class="row"><span>(+) Entradas Extras:</span><span class="bold">+${formatCOP(closing.entradasEfectivo || 0)}</span></div>
  <div class="row"><span>(-) Salidas / Gastos:</span><span class="bold">-${formatCOP(closing.salidasEfectivo || 0)}</span></div>
  <div class="divider"></div>
  <div class="row bold" style="font-size: 12px;"><span>EFECTIVO ESPERADO:</span><span>${formatCOP(closing.efectivoTeorico || 0)}</span></div>
  <div class="row bold" style="font-size: 12px;"><span>EFECTIVO CONTADO:</span><span>${formatCOP(closing.efectivoFisicoContado || 0)}</span></div>
  <div class="row bold" style="font-size: 11px;"><span>DESCUADRE / DIF.:</span><span>${diffLabel}</span></div>
  <div class="double-divider bold text-center">VENTAS POR MEDIO DE PAGO</div>
  <div class="row"><span>Efectivo (${closing.totalTransacciones || 0} vtas):</span><span>${formatCOP(closing.ventasEfectivo || 0)}</span></div>
  <div class="row"><span>Nequi / Transferencia:</span><span>${formatCOP(closing.ventasTransferencia || 0)}</span></div>
  <div class="row"><span>Tarjeta Débito/Crédito:</span><span>${formatCOP(closing.ventasTarjeta || 0)}</span></div>
  ${closing.ventasOtros > 0 ? `<div class="row"><span>Otros Medios:</span><span>${formatCOP(closing.ventasOtros || 0)}</span></div>` : ""}
  <div class="row bold"><span>TOTAL VENTAS GENERAL:</span><span>${formatCOP(closing.totalVentas || 0)}</span></div>
  ${productos.length > 0 ? `
  <div class="double-divider bold text-center">DETALLE DE PRODUCTOS VENDIDOS</div>
  <table>
    <thead><tr>
      <th style="width:45%">PRODUCTO</th>
      <th style="width:15%; text-align:center">CANT</th>
      <th style="width:20%; text-align:right">P.UNIT</th>
      <th style="width:20%; text-align:right">TOTAL</th>
    </tr></thead>
    <tbody>
      ${productos.map(p => `<tr>
        <td>${p.nombre || "Item"}</td>
        <td style="text-align:center">${p.cantidad}</td>
        <td style="text-align:right">${formatCOP(p.precioUnitario)}</td>
        <td style="text-align:right">${formatCOP(p.subtotal)}</td>
      </tr>`).join("")}
    </tbody>
  </table>
  <div class="divider"></div>
  <div class="row bold"><span>Total Unidades Vendidas:</span><span>${closing.totalUnidadesVendidas || productos.reduce((a, b) => a + (b.cantidad || 0), 0)} unds</span></div>
  ` : `<div class="divider"></div><div class="text-center" style="font-size:10px;font-style:italic">No se registraron productos en este turno.</div>`}
  ${(entradas.length > 0 || salidas.length > 0) ? `
  <div class="double-divider bold text-center">MOVIMIENTOS MANUALES DE CAJA</div>
  ${entradas.map(e => `<div class="row"><span>(+) [Ingreso] ${e.motivo || "Entrada"}:</span><span>+${formatCOP(e.monto || 0)}</span></div>`).join("")}
  ${salidas.map(s => `<div class="row"><span>(-) [Gasto] ${s.motivo || "Salida"}:</span><span>-${formatCOP(s.monto || 0)}</span></div>`).join("")}
  ` : ""}
  ${closing.notasCierre ? `<div class="divider"></div><div><span class="bold">Observaciones:</span> ${closing.notasCierre}</div>` : ""}
  <div class="signature-box">
    <div class="signature-line">Entrega Turno<br/>${closing.cajeroApertura || "Cajero"}</div>
    <div class="signature-line">Recibe / Revisa<br/>${closing.cajeroCierre || "Administrador"}</div>
  </div>
  <div class="divider"></div>
  <div class="text-center" style="font-size:9px;margin-top:8px;">Sistema POS Miscelánea 2.0 · Cierre Oficial</div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;
}

/**
 * Descarga el ticket de cierre como archivo HTML (guardable como PDF desde el navegador)
 * y luego abre WhatsApp con el resumen completo + instrucción de adjuntar el PDF.
 */
export function downloadClosingAndWhatsApp(closing, storeConfig = {}) {
  if (!closing) return;

  // 1. Generar y descargar el HTML del ticket como archivo
  const html = buildClosingTicketHTML(closing, storeConfig);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const fechaStr = new Date(closing.fechaCierre || Date.now())
    .toLocaleDateString("es-CO", { year: "2-digit", month: "2-digit", day: "2-digit" })
    .replace(/\//g, "-");
  a.href = url;
  a.download = `Cierre_Caja_${fechaStr}_${closing.id || "ticket"}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);

  // 2. Abrir WhatsApp con resumen en texto (el usuario adjunta el archivo descargado)
  const storeName = storeConfig.nombre || "Miscelánea María José";
  const adminPhone = storeConfig.telefono || storeConfig.celularWhatsApp || "";
  const cleanPhone = String(adminPhone).replace(/\D/g, "");
  const phoneWithCountry = cleanPhone ? (cleanPhone.startsWith("57") ? cleanPhone : `57${cleanPhone}`) : "";

  const diff = Number(closing.diferencia) || 0;
  const diffStatus = diff === 0
    ? "✅ *Caja Cuadrada ($0)*"
    : diff > 0
      ? `🔵 *Sobrante: +${formatCOP(diff)}*`
      : `🔴 *Faltante: -${formatCOP(Math.abs(diff))}*`;

  const fechaFormat = new Date(closing.fechaCierre || Date.now()).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
  const prods = closing.productosVendidos || [];
  let prodsText = "";
  if (prods.length > 0) {
    prodsText = "\n\n📦 *Productos Vendidos:*\n" + prods.slice(0, 10).map(p => `• ${p.cantidad}x ${p.nombre} — ${formatCOP(p.subtotal)}`).join("\n");
    if (prods.length > 10) prodsText += `\n...y ${prods.length - 10} productos más.`;
    prodsText += `\n*Total Unidades:* ${closing.totalUnidadesVendidas || prods.reduce((a, b) => a + (b.cantidad || 0), 0)} unds`;
  }

  const text =
`📊 *CIERRE DE CAJA — ${storeName}*
🕒 *Horario:* 5:00 AM – 10:00 PM (Hora Colombia)
📅 *Fecha:* ${fechaFormat} (COL)
👤 *Cajero:* ${closing.cajeroCierre || closing.cajeroApertura}

━━━━━━━━━━━━━━━━━━━━━
💼 *Base Inicial:* ${formatCOP(closing.baseInicial || 0)}
🛒 *Total Ventas (${closing.totalTransacciones || 0} transacc.):* ${formatCOP(closing.totalVentas || 0)}
  • 💵 Efectivo: ${formatCOP(closing.ventasEfectivo || 0)}
  • 📲 Transferencias: ${formatCOP(closing.ventasTransferencia || 0)}
  • 💳 Tarjeta: ${formatCOP(closing.ventasTarjeta || 0)}

➕ *Entradas Caja:* ${formatCOP(closing.entradasEfectivo || 0)}
➖ *Salidas / Gastos:* ${formatCOP(closing.salidasEfectivo || 0)}
━━━━━━━━━━━━━━━━━━━━━
💰 *Efectivo Esperado:* ${formatCOP(closing.efectivoTeorico || 0)}
💵 *Efectivo Contado:* ${formatCOP(closing.efectivoFisicoContado || 0)}
⚖️ *Balance:* ${diffStatus}${prodsText}
${closing.notasCierre ? `\n📝 *Notas:* ${closing.notasCierre}` : ""}

📎 *El PDF del ticket de cierre ha sido descargado automáticamente.*
_Ábrelo en tu navegador y usa "Imprimir → Guardar como PDF" para obtener el PDF oficial, luego adjúntalo a este chat._`;

  const waUrl = phoneWithCountry
    ? `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;

  setTimeout(() => window.open(waUrl, "_blank"), 300);
}


/**
 * Función utilitaria para imprimir ticket térmico de cierre de caja en ventana emergente.
 * Reutiliza buildClosingTicketHTML para consistencia.
 */
export function printClosingReceipt(closing, storeConfig = {}) {
  if (!closing) return;
  const printWindow = window.open("", "_blank", "width=420,height=750");
  if (!printWindow) {
    alert("Por favor permite las ventanas emergentes (popups) para imprimir el ticket de cierre.");
    return;
  }
  const html = buildClosingTicketHTML(closing, storeConfig);
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Componente Modal para Previsualizar e Imprimir Ticket de Cierre
 */
export default function ClosingTicketModal({ closing, onClose, storeConfig = {} }) {
  if (!closing) return null;

  const handlePrint = () => {
    printClosingReceipt(closing, storeConfig);
  };

  const fechaAperturaStr = closing.fechaApertura
    ? new Date(closing.fechaApertura).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })
    : "—";
  const fechaCierreStr = closing.fechaCierre
    ? new Date(closing.fechaCierre).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })
    : new Date().toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });

  const diff = Number(closing.diferencia) || 0;
  const productos = closing.productosVendidos || [];
  const movimientos = closing.movimientos || [];
  const entradas = movimientos.filter(m => m.tipo === "ingreso");
  const salidas = movimientos.filter(m => m.tipo === "egreso");

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200, padding: "16px" }}>
      <div
        className="modal-content modal-card ticket-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Liquid Glass */}
        <div className="ticket-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="ticket-icon-box">
              <Printer size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.12rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                Ticket Oficial de Cierre de Caja
              </h3>
              <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                {closing.id || "Cierre de Turno"} · {closing.horarioOficial || "Arqueo de Jornada"}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="btn-modal-close-circle" title="Cerrar modal">
            <X size={16} />
          </button>
        </div>

        {/* CONTENEDOR CON SCROLL DEDICADO DEL TICKET (Estilo papel térmico ultra nítido) */}
        <div className="ticket-scroll-viewport">
          <div
            id="printable-closing-ticket"
            className="ticket-thermal-paper"
            style={{ width: "100%", maxWidth: "400px", height: "auto", minHeight: "fit-content", flexShrink: 0 }}
          >
            {/* Encabezado */}
            <div style={{ textAlign: "center", marginBottom: "8px" }}>
              <div style={{ fontSize: "14px", fontWeight: "bold", textTransform: "uppercase" }}>
                {storeConfig?.nombre || "Miscelánea María José"}
              </div>
              <div>NIT: {storeConfig?.nit || "151515"}</div>
              <div>{storeConfig?.direccion || "Calle 59# 39 w24"}{storeConfig?.barrio ? ` - B/ ${storeConfig.barrio}` : ""}</div>
              <div>Tel: {storeConfig?.telefono || "3171166497"}{storeConfig?.celularWhatsApp ? ` · Cel: ${storeConfig.celularWhatsApp}` : ""}</div>
              <div style={{ margin: "6px 0", borderTop: "1px dashed #999" }}></div>
              <div style={{ fontSize: "13px", fontWeight: "bold" }}>*** CIERRE DE CAJA ***</div>
              <div style={{ fontSize: "10px" }}>Comprobante de Arqueo de Jornada</div>
            </div>

            <div style={{ margin: "6px 0", borderTop: "1px dashed #999" }}></div>

            {/* Metadatos */}
            <div style={{ fontSize: "10.5px", marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>ID Cierre:</span>
                <strong>{closing.id || "CIERRE"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Apertura:</span>
                <span>{fechaAperturaStr}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Cierre:</span>
                <span>{fechaCierreStr}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Cajero Apertura:</span>
                <span>{closing.cajeroApertura || "Cajero"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Cajero Cierre:</span>
                <span>{closing.cajeroCierre || closing.cajeroApertura || "Cajero"}</span>
              </div>
            </div>

            <div style={{ margin: "6px 0", borderTop: "1.5px solid #000", borderBottom: "1.5px solid #000", padding: "3px 0", textAlign: "center", fontWeight: "bold" }}>
              BALANCE DE CAJA Y ARQUEO
            </div>

            <div style={{ margin: "6px 0 8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>(+) Base Inicial:</span>
                <strong>{formatCOP(closing.baseInicial || 0)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>(+) Ventas Efectivo:</span>
                <strong>{formatCOP(closing.ventasEfectivo || 0)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>(+) Entradas Extras:</span>
                <strong>+{formatCOP(closing.entradasEfectivo || 0)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>(-) Salidas / Gastos:</span>
                <strong>-{formatCOP(closing.salidasEfectivo || 0)}</strong>
              </div>
              <div style={{ margin: "4px 0", borderTop: "1px dashed #aaa" }}></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "bold" }}>
                <span>EFECTIVO ESPERADO:</span>
                <span>{formatCOP(closing.efectivoTeorico || 0)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "bold" }}>
                <span>EFECTIVO CONTADO:</span>
                <span>{formatCOP(closing.efectivoFisicoContado || 0)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", color: diff === 0 ? "#059669" : diff > 0 ? "#2563eb" : "#dc2626" }}>
                <span>DESCUADRE / DIF:</span>
                <span>
                  {diff === 0 ? "CUADRADA ($0)" : `${diff > 0 ? "SOBRANTE +" : "FALTANTE -"}${formatCOP(Math.abs(diff))}`}
                </span>
              </div>
            </div>

            <div style={{ margin: "6px 0", borderTop: "1.5px solid #000", borderBottom: "1.5px solid #000", padding: "3px 0", textAlign: "center", fontWeight: "bold" }}>
              TOTALES POR MÉTODO DE PAGO
            </div>
            <div style={{ margin: "6px 0 8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Efectivo ({closing.totalTransacciones || 0} vtas):</span>
                <span>{formatCOP(closing.ventasEfectivo || 0)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Nequi / Transferencia:</span>
                <span>{formatCOP(closing.ventasTransferencia || 0)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Tarjeta:</span>
                <span>{formatCOP(closing.ventasTarjeta || 0)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", borderTop: "1px dashed #aaa", paddingTop: "3px", marginTop: "3px" }}>
                <span>TOTAL VENTAS:</span>
                <span>{formatCOP(closing.totalVentas || 0)}</span>
              </div>
            </div>

            {/* TABLA DE PRODUCTOS VENDIDOS */}
            <div style={{ margin: "6px 0", borderTop: "1.5px solid #000", borderBottom: "1.5px solid #000", padding: "3px 0", textAlign: "center", fontWeight: "bold" }}>
              DETALLE DE PRODUCTOS VENDIDOS
            </div>

            {productos.length > 0 ? (
              <div style={{ margin: "6px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", borderBottom: "1px dashed #666", paddingBottom: "2px" }}>
                  <span style={{ width: "45%" }}>PRODUCTO</span>
                  <span style={{ width: "15%", textAlign: "center" }}>CANT</span>
                  <span style={{ width: "20%", textAlign: "right" }}>P.U.</span>
                  <span style={{ width: "20%", textAlign: "right" }}>TOTAL</span>
                </div>
                {productos.map((p, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px dotted #eee" }}>
                    <span style={{ width: "45%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.nombre}
                    </span>
                    <span style={{ width: "15%", textAlign: "center" }}>{p.cantidad}</span>
                    <span style={{ width: "20%", textAlign: "right" }}>{formatCOP(p.precioUnitario)}</span>
                    <span style={{ width: "20%", textAlign: "right" }}>{formatCOP(p.subtotal)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", marginTop: "4px", paddingTop: "3px", borderTop: "1px dashed #aaa" }}>
                  <span>Total Unidades:</span>
                  <span>{closing.totalUnidadesVendidas || productos.reduce((a, b) => a + (b.cantidad || 0), 0)} unds</span>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "8px 0", fontStyle: "italic", fontSize: "10px" }}>
                No se registraron productos en este turno.
              </div>
            )}

            {/* Movimientos Extras */}
            {(entradas.length > 0 || salidas.length > 0) && (
              <div style={{ marginTop: "8px" }}>
                <div style={{ margin: "6px 0", borderTop: "1.5px solid #000", borderBottom: "1.5px solid #000", padding: "3px 0", textAlign: "center", fontWeight: "bold" }}>
                  MOVIMIENTOS MANUALES
                </div>
                {entradas.map((e, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>(+) Ingreso: {e.motivo}</span>
                    <span>+{formatCOP(e.monto || 0)}</span>
                  </div>
                ))}
                {salidas.map((s, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>(-) Gasto: {s.motivo}</span>
                    <span>-{formatCOP(s.monto || 0)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Notas */}
            {closing.notasCierre && (
              <div style={{ marginTop: "8px", borderTop: "1px dashed #aaa", paddingTop: "4px" }}>
                <strong>Notas:</strong> {closing.notasCierre}
              </div>
            )}

            {/* Firmas */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "30px", fontSize: "9.5px", textAlign: "center" }}>
              <div style={{ width: "45%", borderTop: "1px solid #000", paddingTop: "4px" }}>
                Entrega Turno<br />
                <strong>{closing.cajeroApertura || "Cajero"}</strong>
              </div>
              <div style={{ width: "45%", borderTop: "1px solid #000", paddingTop: "4px" }}>
                Recibe / Revisa<br />
                <strong>{closing.cajeroCierre || "Administrador"}</strong>
              </div>
            </div>

            <div style={{ textAlign: "center", fontSize: "9px", marginTop: "12px", color: "#666" }}>
              Software POS Miscelánea · Ticket Oficial de Cierre
            </div>
          </div>
        </div>

        {/* Acciones Flotantes Liquid Glass */}
        <div className="ticket-modal-footer">
          <button onClick={onClose} className="btn btn-modal-cancel" style={{ flex: "1 1 80px", padding: "10px 14px", borderRadius: "12px" }}>
            Cerrar
          </button>
          <button
            onClick={() => downloadClosingAndWhatsApp(closing, storeConfig)}
            className="btn btn-whatsapp"
            style={{
              flex: "1.5 1 150px",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              borderRadius: "12px",
              background: "#25D366",
              color: "#ffffff",
              border: "none",
              fontWeight: 700
            }}
            title="Compartir resumen y descargar PDF para WhatsApp"
          >
            <Share2 size={16} />
            <span>WhatsApp (PDF)</span>
          </button>
          <button
            onClick={handlePrint}
            className="btn btn-primary"
            style={{
              flex: "2 1 170px",
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              borderRadius: "12px",
              fontWeight: 800
            }}
          >
            <Printer size={18} />
            <span>Imprimir Ticket</span>
          </button>
        </div>
      </div>
    </div>
  );
}
