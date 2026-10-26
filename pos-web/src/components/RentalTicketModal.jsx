import React, { useState } from "react";
import { Printer, X, Armchair, MessageCircle, FileDown, Loader2 } from "lucide-react";
import { generateTicketPDF, downloadPDFBlob, sendTicketPDFToWhatsApp } from "../utils/pdfTicketGenerator";

export default function RentalTicketModal({ rental, onClose, storeConfig = {} }) {
  if (!rental) return null;

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const isApartado = rental.tipoOperacion === "reserva" || rental.estado === "reservado" || Boolean(rental.esApartado) || Boolean(rental.fechaEvento);
  const cantSillas = Number(rental.cantidadSillas || (rental.item?.toLowerCase().includes("silla") ? rental.cantidad : 0) || 0);
  const cantMesas = Number(rental.cantidadMesas || (rental.item?.toLowerCase().includes("mesa") && !rental.item?.toLowerCase().includes("silla") ? rental.cantidad : 0) || 0);

  const precioTotal = Number(rental.precioTotal || 0);
  const abono = Number(rental.abono !== undefined ? rental.abono : precioTotal);
  const saldoPendiente = Math.max(0, Number(rental.saldoPendiente !== undefined ? rental.saldoPendiente : (precioTotal - abono)));
  const deposito = Number(rental.deposito || 0);

  const formatCurrency = (val) => `$${Number(val || 0).toLocaleString("es-CO")}`;

  const getDepositoEstadoLabel = () => {
    if (rental.depositoEstado === "cobrado") return "✅ Cobrado – en custodia";
    if (rental.depositoEstado === "devuelto") return "↩️ Devuelto al cliente";
    if (rental.depositoEstado === "retenido") return `⚠️ Retenido por daño (${formatCurrency(rental.depositoMontoRetenido || deposito)})`;
    if (rental.depositoEstado === "parcialmente_retenido") return `⚠️ Parcial retenido (${formatCurrency(rental.depositoMontoRetenido || 0)})`;
    return "⏳ Pendiente – cobrar al entregar";
  };

  const formatFechaEvento = () => {
    if (!rental.fechaEvento) return "Inmediato (Hoy)";
    const evDate = new Date(rental.fechaEvento + (rental.horaEvento ? `T${rental.horaEvento}` : "T12:00:00"));
    return evDate.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) +
      (rental.horaEvento ? ` a las ${rental.horaEvento}` : "");
  };

  // ── Imprimir clonando exactamente el elemento visual #printable-ticket ──
  const handlePrint = () => {
    const el = document.getElementById("printable-ticket");
    if (!el) { alert("No se encontró el ticket para imprimir."); return; }

    // Clonar el HTML del elemento renderizado en React
    const ticketHTML = el.outerHTML;

    // Recopilar todos los estilos inline del elemento (para garantizar fidelidad)
    const printHTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Ticket Alquiler ${rental.id}</title>
<style>
  @page { margin: 4mm 6mm; size: 80mm auto; }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    -webkit-font-smoothing: antialiased !important;
    text-rendering: geometricPrecision !important;
  }
  html, body {
    margin: 0; padding: 0;
    background: #ffffff !important;
    width: 80mm;
  }
  /* Quitar el borde/sombra del contenedor del modal al imprimir */
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
  /* Forzar colores negros para texto (el modal usa colores de tema oscuro) */
  #printable-ticket * {
    color: #000000 !important;
    background-color: transparent !important;
  }
  /* Preservar fondos de las cajas de alerta (saldo pendiente) */
  #printable-ticket [style*="fee2e2"], #printable-ticket [style*="f0fdf4"], #printable-ticket [style*="f8fafc"] {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
</style>
</head>
<body>
${ticketHTML}
<script>window.onload=function(){window.print();setTimeout(()=>window.close(),1200);}<\/script>
</body>
</html>`;

    const pw = window.open("", "_blank", "width=380,height=700,toolbar=no,menubar=no,scrollbars=yes");
    if (pw) { pw.document.write(printHTML); pw.document.close(); }
    else alert("¡Permite las ventanas emergentes para imprimir el ticket!");
  };

  // ── Descargar Factura en PDF ──
  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      const fileName = `Factura_Alquiler_${rental.id}.pdf`;
      const { pdfBlob } = await generateTicketPDF("printable-ticket", fileName);
      downloadPDFBlob(pdfBlob, fileName);
    } catch (e) {
      console.error("Error generando PDF:", e);
      alert("No se pudo generar el PDF del ticket. Intenta imprimirlo.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // ── Compartir Factura en PDF por WhatsApp ──
  const handleWhatsApp = async () => {
    try {
      setIsGeneratingPDF(true);
      const store = storeConfig?.nombre || "Miscelánea María José";
      const fileName = `Factura_Alquiler_${rental.id}.pdf`;

      const extraDetails = [
        `🪑 *Artículo:* ${rental.item} (${rental.cantidad || (cantSillas + cantMesas)} unds)`,
        isApartado && rental.fechaEvento ? `📅 *Fecha Evento:* ${formatFechaEvento()}` : null,
        `✅ *Abono:* ${formatCurrency(abono)}`,
        saldoPendiente > 0 ? `⚠️ *Saldo pendiente:* ${formatCurrency(saldoPendiente)}` : null,
        deposito > 0 ? `🔒 *Depósito en Garantía:* ${formatCurrency(deposito)} (${getDepositoEstadoLabel()})` : null
      ].filter(Boolean).join("\n");

      await sendTicketPDFToWhatsApp({
        elementId: "printable-ticket",
        phone: rental.clienteTelefono,
        fileName,
        clientName: rental.clienteNombre || "Cliente",
        ticketNumber: rental.id,
        totalAmount: precioTotal,
        storeName: store,
        extraDetails
      });
    } catch (err) {
      console.error("Error enviando factura por WhatsApp:", err);
      alert("No se pudo generar el comprobante PDF para WhatsApp.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1250, padding: "16px" }}>
      <div
        className="modal-content modal-card ticket-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Liquid Glass */}
        <div className="ticket-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="ticket-icon-box">
              <Armchair size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.12rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                {isApartado ? "Comprobante de Reserva / Apartado" : "Ticket de Alquiler"}
              </h3>
              <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                Ticket #{rental.id} · {rental.clienteNombre || "Cliente"}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="btn-modal-close-circle" title="Cerrar modal" disabled={isGeneratingPDF}>
            <X size={16} />
          </button>
        </div>

        {/* VIEWPORT CON SCROLL DEDICADO DEL TICKET */}
        <div className="ticket-scroll-viewport">
          <div 
            id="printable-ticket"
            className="ticket-thermal-paper"
            style={{ width: "100%", maxWidth: "400px", height: "auto", minHeight: "fit-content", flexShrink: 0 }}
          >
          {/* Encabezado */}
          <div style={{ textAlign: "center", marginBottom: "10px" }}>
            <div style={{ fontSize: "15px", fontWeight: "bold", textTransform: "uppercase" }}>
              {storeConfig?.nombre || "Miscelánea María José"}
            </div>
            <div>NIT: {storeConfig?.nit || "151515"}</div>
            <div>{storeConfig?.direccion || "Calle 59# 39 w24"}{storeConfig?.barrio ? ` - B/ ${storeConfig.barrio}` : ""}</div>
            {storeConfig?.ciudad && <div>{storeConfig.ciudad}</div>}
            <div>Tel: {storeConfig?.telefono || "3171166497"}{storeConfig?.celularWhatsApp ? ` · Cel: ${storeConfig.celularWhatsApp}` : ""}</div>
            <div style={{ margin: "4px 0" }}>================================</div>
            <div style={{ fontWeight: "bold", fontSize: "13px" }}>
              {isApartado ? "⭐ APARTADO / RESERVA ESPECIAL ⭐" : "🪑 CONTRATO DE ALQUILER"}
            </div>
            <div style={{ margin: "4px 0" }}>================================</div>
          </div>

          {/* Datos del Comprobante */}
          <div style={{ marginBottom: "8px", fontSize: "11px" }}>
            <div><strong>N° Ticket:</strong> #{rental.id}</div>
            <div><strong>Fecha Emisión:</strong> {new Date(rental.fechaInicio || rental.fechaRegistro || Date.now()).toLocaleString("es-CO")}</div>
            <div><strong>Cliente:</strong> {rental.clienteNombre || "Cliente Mostrador"}</div>
            <div><strong>Tel / WhatsApp:</strong> {rental.clienteTelefono || "Sin registrar"}</div>
            {rental.clienteDireccion && (
              <div><strong>📍 Dirección:</strong> {rental.clienteDireccion}</div>
            )}
            <div><strong>Cajero:</strong> {rental.vendedor || "Caja Principal"}</div>
            <div style={{ margin: "4px 0" }}>--------------------------------</div>
          </div>

          {/* Información de Fechas del Evento (Crucial para diciembre/fechas especiales) */}
          <div style={{ marginBottom: "8px", fontSize: "11px", background: "#f8fafc", padding: "6px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
            <div>
              <strong>📅 FECHA DEL EVENTO:</strong>{" "}
              {rental.fechaEvento ? new Date(rental.fechaEvento + (rental.horaEvento ? `T${rental.horaEvento}` : "T12:00:00")).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "long", year: "numeric" }) : "Inmediato (Hoy)"}
              {rental.horaEvento ? ` - ${rental.horaEvento}` : ""}
            </div>
            {rental.fechaDevolucionPactada && (
              <div>
                <strong>🔄 DEVOLUCIÓN PACTADA:</strong>{" "}
                {new Date(rental.fechaDevolucionPactada + "T12:00:00").toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "long" })}
              </div>
            )}
            {rental.observaciones && (
              <div style={{ marginTop: "4px", fontStyle: "italic" }}>
                <strong>Notas:</strong> {rental.observaciones}
              </div>
            )}
          </div>

          {/* Detalle de Artículos */}
          <div style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", marginBottom: "4px", borderBottom: "1px dashed #999", paddingBottom: "2px" }}>
              <span>CANT  DESCRIPCIÓN</span>
              <span>SUBTOTAL</span>
            </div>

            {cantSillas > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                <span>{cantSillas}x Sillas de Alquiler</span>
                <span>{formatCurrency(cantSillas * (Number(rental.precioUnitario) || 1500))}</span>
              </div>
            )}

            {cantMesas > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                <span>{cantMesas}x Mesas de Alquiler</span>
                <span>{formatCurrency(cantMesas * 10000)}</span>
              </div>
            )}

            <div style={{ margin: "6px 0" }}>================================</div>
          </div>

          {/* Resumen Financiero: Total, Abono, Saldo y Depósito */}
          <div style={{ marginBottom: "10px", fontSize: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "13px" }}>
              <span>VALOR TOTAL ALQUILER:</span>
              <span>{formatCurrency(precioTotal)} COP</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "3px", color: "#047857", fontWeight: "bold" }}>
              <span>✅ ABONO RECIBIDO HOY:</span>
              <span>{formatCurrency(abono)}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#4b5563" }}>
              <span>Método de Pago:</span>
              <span>{rental.metodoPago || "Efectivo"}</span>
            </div>
            {rental.comprobanteUrl && (
              <div style={{ fontSize: "10px", color: "#047857", fontWeight: "bold", marginTop: "2px" }}>
                📸 Comprobante de transferencia registrado
              </div>
            )}

            {saldoPendiente > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", padding: "4px", background: "#fee2e2", color: "#b91c1c", fontWeight: "bold", borderRadius: "3px" }}>
                <span>⚠️ SALDO PENDIENTE:</span>
                <span>{formatCurrency(saldoPendiente)} COP</span>
              </div>
            )}

            {deposito > 0 && (
              <div style={{ marginTop: "4px", padding: "5px", background: "#f0fdf4", border: "1px dashed #16a34a", borderRadius: "4px", fontSize: "11px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", color: "#166534" }}>
                  <span>🔒 Depósito en Garantía:</span>
                  <span>{formatCurrency(deposito)} COP</span>
                </div>
                <div style={{ fontSize: "9.5px", color: "#374151", marginTop: "2px" }}>
                  Estado: {rental.depositoEstado === "cobrado" ? "Cobrado en custodia" : rental.depositoEstado === "devuelto" ? "DEVUELTO AL CLIENTE" : (rental.depositoEstado === "retenido" || rental.depositoEstado === "parcialmente_retenido") ? `RETENIDO POR DAÑO (${formatCurrency(rental.depositoMontoRetenido || deposito)})` : "Pendiente por cobrar al entregar"}
                </div>
                {rental.danoDescripcion && (
                  <div style={{ fontSize: "9px", color: "#b91c1c", marginTop: "1px", fontWeight: "bold" }}>
                    Novedad: {rental.danoDescripcion}
                  </div>
                )}
                <div style={{ fontSize: "8.5px", color: "#4b5563", fontStyle: "italic", marginTop: "2px", lineHeight: "1.2" }}>
                  * Reembolsable al devolver todas las sillas/mesas en perfecto estado. En caso de rotura o daño se descuenta del depósito.
                </div>
              </div>
            )}

            <div style={{ margin: "6px 0" }}>================================</div>
          </div>

          {/* Términos y firma */}
          <div style={{ textAlign: "center", fontSize: "10px", color: "#374151" }}>
            <div style={{ marginBottom: "8px" }}>
              * El cliente se compromete a devolver las sillas/mesas en el mismo estado en que las recibe y en la fecha pactada.
            </div>
            <div style={{ marginTop: "18px", borderTop: "1px solid #9ca3af", paddingTop: "4px" }}>
              Firma y Cédula del Cliente
            </div>
            <div style={{ marginTop: "6px", fontWeight: "bold" }}>
              {storeConfig.mensajeTicket || "¡Gracias por preferirnos!"}
            </div>
          </div>
        </div>
      </div>

      {/* Acciones Flotantes Liquid Glass */}
      <div className="ticket-modal-footer">
        <button onClick={onClose} className="btn btn-modal-cancel" style={{ flex: "1 1 70px", padding: "10px 14px", borderRadius: "12px" }} disabled={isGeneratingPDF}>
          Cerrar
        </button>
        <button
          onClick={handleDownloadPDF}
          className="btn btn-outline"
          style={{ flex: "1 1 110px", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", borderRadius: "12px" }}
          title="Descargar factura en PDF"
          disabled={isGeneratingPDF}
        >
          {isGeneratingPDF ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
          <span>Descargar PDF</span>
        </button>
        {rental.clienteTelefono && (
          <button
            onClick={handleWhatsApp}
            className="btn btn-whatsapp"
            style={{
              flex: "1.2 1 130px",
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
            title="Enviar comprobante en PDF por WhatsApp al cliente"
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
            flex: "1.8 1 150px",
            padding: "10px 16px",
            fontSize: "0.92rem",
            fontWeight: 800,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            borderRadius: "12px"
          }}
          disabled={isGeneratingPDF}
        >
          <Printer size={16} />
          <span>Imprimir Ticket</span>
        </button>
      </div>
    </div>
  </div>
);
}
