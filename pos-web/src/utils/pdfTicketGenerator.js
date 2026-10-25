import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase/config";

/**
 * Convierte un elemento DOM de ticket en un documento PDF de alta resolución (80mm).
 * Retorna { pdfBlob, pdfUrl, storageUrl }
 */
export async function generateTicketPDF(elementIdOrElement, fileName = "Factura.pdf") {
  const element = typeof elementIdOrElement === "string" 
    ? document.getElementById(elementIdOrElement) 
    : elementIdOrElement;

  if (!element) {
    throw new Error("Elemento de ticket no encontrado");
  }

  // Renderizar a canvas con escala 2.5 para nitidez nítida térmica
  const canvas = await html2canvas(element, {
    scale: 2.5,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: 400
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);

  // Ancho térmico de 80mm
  const pdfWidth = 80;
  // Alto proporcional
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [pdfWidth, Math.max(pdfHeight, 100)]
  });

  pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
  const pdfBlob = pdf.output("blob");
  const localBlobUrl = URL.createObjectURL(pdfBlob);

  // Subir a Firebase Storage para obtener enlace público directo
  let storageUrl = null;
  if (storage) {
    try {
      const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storageRef = ref(storage, `facturas_pdf/${Date.now()}_${cleanName}`);
      const snap = await uploadBytes(storageRef, pdfBlob, {
        contentType: "application/pdf"
      });
      storageUrl = await getDownloadURL(snap.ref);
    } catch (err) {
      console.warn("No se pudo subir PDF a Storage, usando enlace local:", err);
    }
  }

  return {
    pdf,
    pdfBlob,
    localBlobUrl,
    storageUrl: storageUrl || localBlobUrl
  };
}

/**
 * Descarga el archivo PDF localmente en la computadora o celular.
 */
export function downloadPDFBlob(pdfBlob, fileName = "Factura.pdf") {
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Envía la factura PDF por WhatsApp:
 * 1. Genera el PDF con nitidez térmica.
 * 2. Si el dispositivo soporta Web Share con archivos (móviles/tablets), comparte el archivo PDF directamente en WhatsApp.
 * 3. En PC/escritorio, descarga el archivo PDF y abre WhatsApp con el enlace de descarga oficial y resumen del ticket.
 */
export async function sendTicketPDFToWhatsApp({
  elementId,
  phone,
  fileName = "Factura.pdf",
  clientName = "Cliente",
  ticketNumber = "",
  totalAmount = 0,
  storeName = "Miscelánea María José",
  extraDetails = ""
}) {
  const { pdfBlob, storageUrl } = await generateTicketPDF(elementId, fileName);

  // Descargar el archivo localmente para que el cajero lo tenga a la mano
  downloadPDFBlob(pdfBlob, fileName);

  const cleanPhone = String(phone || "").replace(/\D/g, "");
  const phoneWithCountry = cleanPhone.startsWith("57") ? cleanPhone : `57${cleanPhone}`;

  // Si el navegador soporta compartir archivos nativos (Android/iOS)
  if (navigator.canShare && navigator.canShare({ files: [new File([pdfBlob], fileName, { type: "application/pdf" })] })) {
    try {
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });
      await navigator.share({
        title: `Factura ${ticketNumber} - ${storeName}`,
        text: `Hola ${clientName}, adjunto tu factura oficial en PDF de ${storeName}. Total: $${Number(totalAmount).toLocaleString("es-CO")} COP.`,
        files: [file]
      });
      return;
    } catch (e) {
      // Si el usuario canceló el share nativo, continuar a WhatsApp Web
    }
  }

  // Mensaje para WhatsApp Web con enlace oficial directo al PDF
  const messageLines = [
    `🧾 *FACTURA OFICIAL EN PDF — ${storeName.toUpperCase()}*`,
    `📋 *N° Ticket:* #${ticketNumber}`,
    `👤 *Cliente:* ${clientName}`,
    `💰 *Total:* $${Number(totalAmount).toLocaleString("es-CO")} COP`,
    extraDetails ? `${extraDetails}\n` : null,
    `📄 *Tu factura ha sido generada en PDF:*`,
    `👉 Puedes descargarla o visualizarla aquí:`,
    `${storageUrl}`,
    ``,
    `_(El archivo PDF también ha sido descargado en tu equipo para adjuntarlo si lo deseas)_.`,
    `¡Muchas gracias por su preferencia! 🙏`
  ].filter(Boolean).join("\n");

  const waUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(messageLines)}`;
  window.open(waUrl, "_blank");
}
