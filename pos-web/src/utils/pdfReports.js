/**
 * pdfReports.js
 * Generador de reportes PDF profesionales para el Sistema POS.
 * Utiliza jsPDF y jspdf-autotable con un diseño visual limpio, moderno y corporativo.
 * 100% independiente y aditivo.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const formatMoney = (val) => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(val) || 0);
};

const formatDate = (isoString) => {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    return d.toLocaleString("es-CO", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return String(isoString);
  }
};

/**
 * Agrega el membrete institucional a cualquier reporte PDF
 */
function addHeader(doc, title, storeConfig, currentUser, subtitle = "") {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Barra de color superior (Acento primario)
  doc.setFillColor(99, 102, 241); // Indigo #6366f1
  doc.rect(0, 0, pageWidth, 5, "F");

  // Nombre de la Empresa
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(storeConfig?.nombre || "SISTEMA POS & MISELÁNEA", 14, 18);

  // Datos de contacto de la tienda
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const infoLine = [
    storeConfig?.nit ? `NIT: ${storeConfig.nit}` : null,
    storeConfig?.telefono ? `Tel: ${storeConfig.telefono}` : null,
    storeConfig?.direccion || null,
  ]
    .filter(Boolean)
    .join(" • ");

  if (infoLine) {
    doc.text(infoLine, 14, 24);
  }

  // Título del Reporte a la derecha
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(99, 102, 241);
  doc.text(title.toUpperCase(), pageWidth - 14, 18, { align: "right" });

  // Fecha y usuario que genera
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  const emitido = `Emitido: ${new Date().toLocaleString("es-CO")} por ${
    currentUser?.nombre || currentUser?.username || "Usuario"
  }`;
  doc.text(emitido, pageWidth - 14, 24, { align: "right" });

  if (subtitle) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(subtitle, 14, 30);
  }

  // Línea divisoria
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 33, pageWidth - 14, 33);

  return 38; // Retorna Y inicial para el contenido
}

/**
 * Agrega el pie de página con número de página a todas las hojas
 */
function addFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);

    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.text(
      "Sistema POS Miselánea • Reporte Confidencial",
      14,
      pageHeight - 7
    );
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth - 14,
      pageHeight - 7,
      { align: "right" }
    );
  }
}

/**
 * REPORTE 1: Ventas por Rango de Fechas
 */
export function generateSalesReportPDF({
  sales = [],
  startDate = "",
  endDate = "",
  storeConfig = {},
  currentUser = {},
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Filtrado de ventas por fecha si se proporcionan
  let filtered = [...sales];
  if (startDate) {
    filtered = filtered.filter((s) => {
      const d = s.fecha?.slice?.(0, 10) || s.fechaVenta?.slice?.(0, 10) || "";
      return d >= startDate;
    });
  }
  if (endDate) {
    filtered = filtered.filter((s) => {
      const d = s.fecha?.slice?.(0, 10) || s.fechaVenta?.slice?.(0, 10) || "";
      return d <= endDate;
    });
  }

  // Ordenar por fecha descendente
  filtered.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));

  // Métricas
  const totalVentas = filtered.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
  const totalItems = filtered.reduce(
    (acc, s) =>
      acc +
      (s.items?.reduce?.((itAcc, it) => itAcc + (Number(it.cantidad) || 1), 0) ||
        0),
    0
  );
  const ticketPromedio = filtered.length > 0 ? totalVentas / filtered.length : 0;

  // Desglose por método de pago
  const metodos = { Efectivo: 0, Nequi: 0, Tarjeta: 0, Transferencia: 0, Otros: 0 };
  filtered.forEach((s) => {
    const met = (s.metodoPago || s.metodo || "Efectivo").toLowerCase();
    const tot = Number(s.total) || 0;
    if (met.includes("efectivo")) metodos.Efectivo += tot;
    else if (met.includes("nequi") || met.includes("davi")) metodos.Nequi += tot;
    else if (met.includes("tarjeta")) metodos.Tarjeta += tot;
    else if (met.includes("transf")) metodos.Transferencia += tot;
    else metodos.Otros += tot;
  });

  const subtitle = `Período: ${startDate || "Inicio"} hasta ${
    endDate || "Hoy"
  } • Total transacciones: ${filtered.length}`;
  let startY = addHeader(
    doc,
    "Reporte de Ventas",
    storeConfig,
    currentUser,
    subtitle
  );

  // Tarjetas KPI resumen
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, startY, pageWidth - 28, 22, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("TOTAL FACTURADO", 20, startY + 6);
  doc.text("TRANSACCIONES", 80, startY + 6);
  doc.text("TICKET PROMEDIO", 130, startY + 6);
  doc.text("ITEMS VENDIDOS", 175, startY + 6);

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(formatMoney(totalVentas), 20, startY + 14);
  doc.text(String(filtered.length), 80, startY + 14);
  doc.text(formatMoney(ticketPromedio), 130, startY + 14);
  doc.text(String(totalItems), 175, startY + 14);

  startY += 28;

  // Resumen Métodos de Pago
  autoTable(doc, {
    startY,
    head: [["Efectivo", "Nequi / Daviplata", "Transferencia", "Tarjeta", "Otros"]],
    body: [
      [
        formatMoney(metodos.Efectivo),
        formatMoney(metodos.Nequi),
        formatMoney(metodos.Transferencia),
        formatMoney(metodos.Tarjeta),
        formatMoney(metodos.Otros),
      ],
    ],
    theme: "plain",
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [71, 85, 105],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 9,
      fontStyle: "bold",
      textColor: [30, 41, 59],
      halign: "center",
    },
    margin: { left: 14, right: 14 },
  });

  startY = doc.lastAutoTable.finalY + 8;

  // Tabla Detallada de Ventas
  const tableRows = filtered.slice(0, 500).map((s, idx) => {
    const cliente = s.cliente?.nombre || s.clienteNombre || "Cliente Mostrador";
    const metodo = s.metodoPago || s.metodo || "Efectivo";
    const cantidadItems =
      s.items?.reduce?.((acc, it) => acc + (Number(it.cantidad) || 1), 0) ||
      (s.items ? s.items.length : 1);
    const folio = s.id ? `#${s.id.slice(-6).toUpperCase()}` : `#${idx + 1}`;

    return [
      folio,
      formatDate(s.fecha || s.fechaVenta),
      cliente,
      metodo,
      String(cantidadItems),
      formatMoney(s.total),
    ];
  });

  autoTable(doc, {
    startY,
    head: [["ID", "Fecha & Hora", "Cliente", "Método", "Cant.", "Total"]],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 35 },
      2: { cellWidth: 55 },
      3: { cellWidth: 28 },
      4: { cellWidth: 16, halign: "center" },
      5: { cellWidth: 28, halign: "right", fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  addFooter(doc);

  const filename = `Reporte_Ventas_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  return filename;
}

/**
 * REPORTE 2: Inventario, Existencias y Valoración Total
 */
export function generateInventoryReportPDF({
  products = [],
  storeConfig = {},
  currentUser = {},
  filterCategory = "todas",
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  let filtered = [...products];
  if (filterCategory && filterCategory !== "todas") {
    filtered = filtered.filter(
      (p) => (p.categoria || "").toLowerCase() === filterCategory.toLowerCase()
    );
  }

  // Ordenar alfabéticamente por nombre
  filtered.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));

  // Cálculos de inventario
  let totalStock = 0;
  let totalValorCosto = 0;
  let totalValorVenta = 0;
  let agotados = 0;
  let stockBajo = 0;

  filtered.forEach((p) => {
    const stock = Number(p.stock) || 0;
    const precio = Number(p.precio) || 0;
    const costo = Number(p.costo || p.precioCompra) || 0;

    totalStock += stock;
    totalValorVenta += stock * precio;
    totalValorCosto += stock * costo;

    if (stock <= 0) agotados++;
    else if (stock <= (Number(p.minStock) || 3)) stockBajo++;
  });

  const margenPotencial =
    totalValorVenta > 0
      ? ((totalValorVenta - totalValorCosto) / totalValorVenta) * 100
      : 0;

  const subtitle = `Catálogo total: ${filtered.length} referencias • Categoría: ${filterCategory}`;
  let startY = addHeader(
    doc,
    "Reporte de Inventario",
    storeConfig,
    currentUser,
    subtitle
  );

  // Tarjetas KPI resumen
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, startY, pageWidth - 28, 24, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("VALOR TOTAL VENTA", 18, startY + 6);
  doc.text("VALOR TOTAL COSTO", 75, startY + 6);
  doc.text("MARGEN PROYECTADO", 130, startY + 6);
  doc.text("UNIDADES EN STOCK", 175, startY + 6);

  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(formatMoney(totalValorVenta), 18, startY + 14);
  doc.text(formatMoney(totalValorCosto), 75, startY + 14);
  doc.text(`${margenPotencial.toFixed(1)}%`, 130, startY + 14);
  doc.text(`${totalStock} uds`, 175, startY + 14);

  // Alerta de stock debajo de KPIs
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(220, 38, 38);
  doc.text(`⚠️ Agotados: ${agotados} • Stock Crítico: ${stockBajo}`, 18, startY + 20);

  startY += 30;

  // Tabla Detallada
  const tableRows = filtered.map((p) => {
    const stock = Number(p.stock) || 0;
    const precio = Number(p.precio) || 0;
    const costo = Number(p.costo || p.precioCompra) || 0;
    const totalP = stock * precio;

    let stockDisplay = String(stock);
    if (stock <= 0) stockDisplay = "0 (AGOTADO)";

    return [
      p.codigo || p.id?.slice(-6) || "-",
      p.nombre || "Sin nombre",
      p.categoria || "General",
      stockDisplay,
      formatMoney(costo),
      formatMoney(precio),
      formatMoney(totalP),
    ];
  });

  autoTable(doc, {
    startY,
    head: [["Código", "Producto", "Categoría", "Stock", "Costo", "Precio", "Total Venta"]],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: [16, 185, 129], // Emerald green #10b981
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 50 },
      2: { cellWidth: 28 },
      3: { cellWidth: 20, halign: "center" },
      4: { cellWidth: 20, halign: "right" },
      5: { cellWidth: 20, halign: "right" },
      6: { cellWidth: 22, halign: "right", fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: (data) => {
      // Resaltar en rojo si stock es 0
      if (data.column.index === 3 && data.cell.raw && data.cell.raw.includes("AGOTADO")) {
        data.cell.styles.textColor = [220, 38, 38];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  addFooter(doc);

  const filename = `Reporte_Inventario_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  return filename;
}

/**
 * REPORTE 3: Cierre de Turno / Arqueo de Caja
 */
export function generateShiftReportPDF({
  shift = {},
  sales = [],
  storeConfig = {},
  currentUser = {},
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  const baseCaja = Number(shift.baseInicial || shift.base || 0);
  const totalEfectivoVentas = Number(shift.ventasEfectivo || 0);
  const entradas = Number(shift.totalEntradas || 0);
  const salidas = Number(shift.totalSalidas || 0);
  const esperado = baseCaja + totalEfectivoVentas + entradas - salidas;
  const real = Number(shift.efectivoReal || shift.cierreReal || esperado);
  const descuadre = real - esperado;

  const subtitle = `Turno #${shift.id?.slice(-6) || "ACTIVO"} • Cajero: ${
    shift.cajeroNombre || currentUser?.nombre || "Cajero"
  }`;
  let startY = addHeader(
    doc,
    "Reporte de Cierre de Caja",
    storeConfig,
    currentUser,
    subtitle
  );

  // Tabla de Arqueo
  autoTable(doc, {
    startY,
    head: [["Concepto de Caja", "Monto"]],
    body: [
      ["Base Inicial de Caja (+)", formatMoney(baseCaja)],
      ["Ventas en Efectivo del Turno (+)", formatMoney(totalEfectivoVentas)],
      ["Ingresos / Entradas Extra (+)", formatMoney(entradas)],
      ["Gastos / Salidas de Efectivo (-)", formatMoney(salidas)],
      ["EFECTIVO ESPERADO EN CAJA", formatMoney(esperado)],
      ["EFECTIVO FÍSICO CONTADO (REAL)", formatMoney(real)],
      [
        descuadre === 0
          ? "ESTADO: CUADRADO EXACTO"
          : descuadre > 0
          ? "SOBRANTE EN CAJA (+)"
          : "FALTANTE EN CAJA (-)",
        formatMoney(Math.abs(descuadre)),
      ],
    ],
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 62, halign: "right", fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.row.index === 4) {
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.fontStyle = "bold";
      }
      if (data.row.index === 6) {
        data.cell.styles.textColor =
          descuadre === 0
            ? [22, 163, 74]
            : descuadre > 0
            ? [37, 99, 235]
            : [220, 38, 38];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  startY = doc.lastAutoTable.finalY + 12;

  // Observaciones del turno si existen
  if (shift.observaciones) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text("Notas u Observaciones del Cierre:", 14, startY);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(shift.observaciones, 14, startY + 5);
    startY += 15;
  }

  // Firmas de conformidad
  const signatureY = Math.max(startY + 25, 220);
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.5);

  doc.line(20, signatureY, 80, signatureY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Firma del Cajero", 50, signatureY + 5, { align: "center" });

  doc.line(pageWidth - 80, signatureY, pageWidth - 20, signatureY);
  doc.text("Firma Administrador / Supervisor", pageWidth - 50, signatureY + 5, {
    align: "center",
  });

  addFooter(doc);

  const filename = `Cierre_Caja_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  return filename;
}
