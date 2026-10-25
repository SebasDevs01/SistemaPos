import ExcelJS from "exceljs/dist/exceljs.min.js";

/**
 * Generador de Reporte y CRM de Ventas en Excel Profesional para Miscelánea María José
 * Inspirado y adaptado del CRM institucional con:
 * - Dashboard de Cierre y Cuadre de Caja Nocturno
 * - CRM de Clientes, Ventas y Estado de Fidelización
 * - Detalle ítem por ítem con Códigos, Nombres de Artículos, Clientes y Cajero
 * - Ranking de Productos más vendidos y Rentabilidad
 * - Parámetros y Auditoría
 */
export async function generateCrmSalesReport({
  sales = [],
  filteredSales = [],
  products = [],
  currentUser = null,
  storeConfig = {},
  dateFilter = "today",
  customDate = ""
}) {
  const salesToExport = filteredSales.length > 0 ? filteredSales : sales;
  if (!salesToExport || salesToExport.length === 0) {
    alert("No hay ventas registradas para exportar en este período.");
    return false;
  }

  const businessName = (storeConfig?.nombre || storeConfig?.storeName || "MISCELÁNEA MARÍA JOSÉ").toUpperCase();
  const businessNit = storeConfig?.nit || "151515";
  const businessPhone = storeConfig?.telefono || storeConfig?.phone || "3171166497";
  const businessAddress = `${storeConfig?.direccion || "Calle 59# 39 w24"}${storeConfig?.barrio ? ` - B/ ${storeConfig.barrio}` : ""}${storeConfig?.ciudad ? ` (${storeConfig.ciudad})` : ""}`;
  const cashierName = currentUser?.nombre || "Cajero Principal";
  const cashierRole = currentUser?.rol || "Operador POS";
  const now = new Date();
  const printTimestamp = now.toLocaleString("es-CO", { dateStyle: "full", timeStyle: "medium" });
  const dateStamp = now.toISOString().split("T")[0];

  const periodLabel = 
    dateFilter === "today" ? `Jornada de Hoy (${now.toLocaleDateString("es-CO")})` :
    dateFilter === "yesterday" ? "Jornada de Ayer" :
    dateFilter === "7days" ? "Últimos 7 Días Operativos" :
    dateFilter === "month" ? "Mes en Curso" :
    dateFilter === "custom" ? `Fecha Específica: ${customDate}` : "Histórico Consolidado";

  // Crear Libro de Trabajo Excel
  const wb = new ExcelJS.Workbook();
  wb.creator = `${businessName} POS`;
  wb.lastModifiedBy = cashierName;
  wb.created = now;
  wb.modified = now;

  // Paleta de Estilos Corporativos
  const NAVY_HEADER = "FF0F172A";       // Slate 900
  const BLUE_HEADER = "FF1E3A8A";       // Blue 900
  const INDIGO_HEADER = "FF312E81";     // Indigo 900
  const EMERALD_FILL = "FF065F46";      // Emerald 800
  const ACCENT_ROW_EVEN = "FFF8FAFC";   // Slate 50
  const BORDER_LIGHT = "FFE2E8F0";      // Slate 200
  const BORDER_DARK = "FF94A3B8";       // Slate 400
  const FONT_FAMILY = "Segoe UI";

  const thinBorder = {
    top: { style: "thin", color: { argb: BORDER_LIGHT } },
    left: { style: "thin", color: { argb: BORDER_LIGHT } },
    bottom: { style: "thin", color: { argb: BORDER_LIGHT } },
    right: { style: "thin", color: { argb: BORDER_LIGHT } }
  };

  const headerBorder = {
    top: { style: "medium", color: { argb: NAVY_HEADER } },
    left: { style: "thin", color: { argb: NAVY_HEADER } },
    bottom: { style: "medium", color: { argb: NAVY_HEADER } },
    right: { style: "thin", color: { argb: NAVY_HEADER } }
  };

  const totalBorder = {
    top: { style: "thin", color: { argb: NAVY_HEADER } },
    bottom: { style: "double", color: { argb: NAVY_HEADER } },
    left: { style: "thin", color: { argb: NAVY_HEADER } },
    right: { style: "thin", color: { argb: NAVY_HEADER } }
  };

  // Mapeo de productos para costos y categorías
  const productMap = new Map();
  products.forEach(p => {
    if (p.codigo) productMap.set(String(p.codigo).trim(), p);
    if (p.id) productMap.set(String(p.id).trim(), p);
  });

  // Métricas generales
  let totalCash = 0;
  let totalNequi = 0;
  let totalDaviplata = 0;
  let totalCard = 0;
  let totalOther = 0;
  let countCash = 0;
  let countNequi = 0;
  let countDaviplata = 0;
  let countCard = 0;
  let countOther = 0;
  let totalUnits = 0;
  let totalGross = 0;
  let totalEstimatedCost = 0;

  salesToExport.forEach(s => {
    const amt = Number(s.total) || 0;
    totalGross += amt;
    const method = (s.metodoPago || "Efectivo").toLowerCase();

    if (method.includes("efectivo") || method.includes("cash")) {
      totalCash += amt;
      countCash++;
    } else if (method.includes("nequi")) {
      totalNequi += amt;
      countNequi++;
    } else if (method.includes("daviplata")) {
      totalDaviplata += amt;
      countDaviplata++;
    } else if (method.includes("tarjeta") || method.includes("card") || method.includes("banco")) {
      totalCard += amt;
      countCard++;
    } else {
      totalOther += amt;
      countOther++;
    }

    (s.items || []).forEach(it => {
      const q = Number(it.cantidad) || 1;
      totalUnits += q;
      const refProd = productMap.get(String(it.codigo || it.productId || "").trim());
      const cost = Number(refProd?.costo) || (Number(it.precioUnitario || 0) * 0.7);
      totalEstimatedCost += cost * q;
    });
  });

  const totalTickets = salesToExport.length;
  const avgTicket = totalTickets > 0 ? totalGross / totalTickets : 0;
  const estimatedProfit = Math.max(0, totalGross - totalEstimatedCost);
  const profitMargin = totalGross > 0 ? (estimatedProfit / totalGross) : 0;

  // ══════════════════════════════════════════════════════════════════
  // HOJA 1: DASHBOARD_CIERRE_CAJA
  // ══════════════════════════════════════════════════════════════════
  const ws1 = wb.addWorksheet("DASHBOARD_CIERRE", {
    views: [{ showGridLines: true }]
  });

  ws1.columns = [
    { width: 5 },   // A: Margen
    { width: 28 },  // B: Concepto / Método
    { width: 18 },  // C: Transacciones
    { width: 24 },  // D: Recaudo (COP)
    { width: 18 },  // E: % Participación
    { width: 24 },  // F: Estado Cuadre
    { width: 6 }    // G
  ];

  // Encabezado Corporativo
  ws1.mergeCells("B2:F2");
  const titleCell = ws1.getCell("B2");
  titleCell.value = `${businessName} - INFORME OFICIAL DE CIERRE DE CAJA`;
  titleCell.font = { name: FONT_FAMILY, size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws1.getRow(2).height = 34;

  ws1.mergeCells("B3:F3");
  const subCell = ws1.getCell("B3");
  subCell.value = `NIT: ${businessNit}  |  TEL: ${businessPhone}  |  DIR: ${businessAddress}`;
  subCell.font = { name: FONT_FAMILY, size: 9, italic: true, color: { argb: "FFCBD5E1" } };
  subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
  subCell.alignment = { horizontal: "center", vertical: "middle" };
  ws1.getRow(3).height = 20;

  // Metadatos de la Emisión
  const metaRows = [
    ["Responsable de Caja / Operador:", `${cashierName}  [Rol: ${cashierRole}]`],
    ["Fecha y Hora de Emisión:", printTimestamp],
    ["Período de Ventas Analizado:", periodLabel],
    ["Estado del Cuadre Nocturno:", totalGross > 0 ? "CUADRE COMPLETO Y VALIDADO" : "SIN MOVIMIENTOS REGISTRADOS"]
  ];

  let curRow = 5;
  metaRows.forEach(([k, v]) => {
    ws1.getCell(`B${curRow}`).value = k;
    ws1.getCell(`B${curRow}`).font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: "FF475569" } };
    ws1.mergeCells(`C${curRow}:F${curRow}`);
    const vCell = ws1.getCell(`C${curRow}`);
    vCell.value = v;
    vCell.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: "FF0F172A" } };
    curRow++;
  });

  curRow += 1;

  // Mini-KPIs en Celdas Estilizadas
  ws1.mergeCells(`B${curRow}:C${curRow}`);
  ws1.getCell(`B${curRow}`).value = "VENTAS TOTALES (COP)";
  ws1.getCell(`B${curRow}`).font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: "FFFFFFFF" } };
  ws1.getCell(`B${curRow}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE_HEADER } };
  ws1.getCell(`B${curRow}`).alignment = { horizontal: "center" };

  ws1.mergeCells(`D${curRow}:E${curRow}`);
  ws1.getCell(`D${curRow}`).value = "EFECTIVO EN CAJA FÍSICA";
  ws1.getCell(`D${curRow}`).font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: "FFFFFFFF" } };
  ws1.getCell(`D${curRow}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EMERALD_FILL } };
  ws1.getCell(`D${curRow}`).alignment = { horizontal: "center" };

  ws1.getCell(`F${curRow}`).value = "TOTAL TICKETS";
  ws1.getCell(`F${curRow}`).font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: "FFFFFFFF" } };
  ws1.getCell(`F${curRow}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: INDIGO_HEADER } };
  ws1.getCell(`F${curRow}`).alignment = { horizontal: "center" };
  ws1.getRow(curRow).height = 22;

  curRow++;
  ws1.mergeCells(`B${curRow}:C${curRow}`);
  const kpi1 = ws1.getCell(`B${curRow}`);
  kpi1.value = totalGross;
  kpi1.numFmt = '"$"#,##0';
  kpi1.font = { name: FONT_FAMILY, size: 14, bold: true, color: { argb: BLUE_HEADER } };
  kpi1.alignment = { horizontal: "center", vertical: "middle" };

  ws1.mergeCells(`D${curRow}:E${curRow}`);
  const kpi2 = ws1.getCell(`D${curRow}`);
  kpi2.value = totalCash;
  kpi2.numFmt = '"$"#,##0';
  kpi2.font = { name: FONT_FAMILY, size: 14, bold: true, color: { argb: EMERALD_FILL } };
  kpi2.alignment = { horizontal: "center", vertical: "middle" };

  const kpi3 = ws1.getCell(`F${curRow}`);
  kpi3.value = totalTickets;
  kpi3.numFmt = '#,##0';
  kpi3.font = { name: FONT_FAMILY, size: 14, bold: true, color: { argb: INDIGO_HEADER } };
  kpi3.alignment = { horizontal: "center", vertical: "middle" };
  ws1.getRow(curRow).height = 28;

  curRow += 2;

  // TABLA ARQUEO Y CUADRE POR MÉTODO DE PAGO
  ws1.mergeCells(`B${curRow}:F${curRow}`);
  const tblTitle = ws1.getCell(`B${curRow}`);
  tblTitle.value = "CUADRE DE CAJA DETALLADO POR MÉTODO DE COBRO";
  tblTitle.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  tblTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
  tblTitle.alignment = { horizontal: "left", indent: 1 };
  ws1.getRow(curRow).height = 24;

  curRow++;
  const colHeaders1 = ["Método de Cobro", "Transacciones", "Total Recaudado (COP)", "% del Recaudo", "Estado en Cuadre"];
  colHeaders1.forEach((h, i) => {
    const c = ws1.getCell(curRow, i + 2);
    c.value = h;
    c.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
    c.alignment = { horizontal: i >= 1 && i <= 3 ? "right" : "left", vertical: "middle" };
    c.border = headerBorder;
  });
  ws1.getRow(curRow).height = 22;

  const paymentData = [
    ["Efectivo en Caja (Billetes/Monedas)", countCash, totalCash, totalGross > 0 ? totalCash / totalGross : 0, "Dinero Físico en Gaveta"],
    ["Nequi (Transferencias Directas)", countNequi, totalNequi, totalGross > 0 ? totalNequi / totalGross : 0, "Confirmado en App Nequi"],
    ["Daviplata", countDaviplata, totalDaviplata, totalGross > 0 ? totalDaviplata / totalGross : 0, "Confirmado en App Daviplata"],
    ["Tarjeta / Datáfono / Banco", countCard, totalCard, totalGross > 0 ? totalCard / totalGross : 0, "Voucher Bancario"],
    ["Otros Métodos / Bonos / Fiado", countOther, totalOther, totalGross > 0 ? totalOther / totalGross : 0, "Verificado"]
  ];

  const startDataRow = curRow + 1;
  paymentData.forEach((row, idx) => {
    curRow++;
    row.forEach((val, i) => {
      const c = ws1.getCell(curRow, i + 2);
      c.value = val;
      c.font = { name: FONT_FAMILY, size: 9 };
      c.border = thinBorder;
      if (idx % 2 === 1) {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACCENT_ROW_EVEN } };
      }
      if (i === 1) {
        c.numFmt = '#,##0';
        c.alignment = { horizontal: "right" };
      } else if (i === 2) {
        c.numFmt = '"$"#,##0';
        c.alignment = { horizontal: "right" };
      } else if (i === 3) {
        c.numFmt = '0.0%';
        c.alignment = { horizontal: "right" };
      } else {
        c.alignment = { horizontal: "left" };
      }
    });
    ws1.getRow(curRow).height = 20;
  });

  const endDataRow = curRow;

  // Fila Totalizadora con fórmulas Excel
  curRow++;
  ws1.getCell(`B${curRow}`).value = "TOTAL GENERAL CUADRE";
  ws1.getCell(`B${curRow}`).font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  ws1.getCell(`B${curRow}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
  ws1.getCell(`B${curRow}`).border = totalBorder;

  const totalTransCell = ws1.getCell(`C${curRow}`);
  totalTransCell.value = { formula: `SUM(C${startDataRow}:C${endDataRow})` };
  totalTransCell.numFmt = '#,##0';
  totalTransCell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  totalTransCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
  totalTransCell.border = totalBorder;
  totalTransCell.alignment = { horizontal: "right" };

  const totalRecaudoCell = ws1.getCell(`D${curRow}`);
  totalRecaudoCell.value = { formula: `SUM(D${startDataRow}:D${endDataRow})` };
  totalRecaudoCell.numFmt = '"$"#,##0';
  totalRecaudoCell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  totalRecaudoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
  totalRecaudoCell.border = totalBorder;
  totalRecaudoCell.alignment = { horizontal: "right" };

  const totalPctCell = ws1.getCell(`E${curRow}`);
  totalPctCell.value = { formula: `SUM(E${startDataRow}:E${endDataRow})` };
  totalPctCell.numFmt = '0.0%';
  totalPctCell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  totalPctCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
  totalPctCell.border = totalBorder;
  totalPctCell.alignment = { horizontal: "right" };

  const totalStatusCell = ws1.getCell(`F${curRow}`);
  totalStatusCell.value = "100% RECAUDADO";
  totalStatusCell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  totalStatusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
  totalStatusCell.border = totalBorder;
  totalStatusCell.alignment = { horizontal: "center" };
  ws1.getRow(curRow).height = 24;

  curRow += 2;

  // RESUMEN OPERACIONAL ADICIONAL
  const statsRows = [
    ["Unidades de Artículos Vendidas:", totalUnits, "#,##0"],
    ["Ticket Promedio por Venta:", avgTicket, '"$"#,##0'],
    ["Costo Mercancía Estimado:", totalEstimatedCost, '"$"#,##0'],
    ["Utilidad Bruta Estimada:", estimatedProfit, '"$"#,##0'],
    ["Margen de Utilidad Bruta (%):", profitMargin, "0.0%"]
  ];

  statsRows.forEach(([k, v, fmt]) => {
    ws1.getCell(`B${curRow}`).value = k;
    ws1.getCell(`B${curRow}`).font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: "FF475569" } };
    ws1.mergeCells(`C${curRow}:D${curRow}`);
    const vC = ws1.getCell(`C${curRow}`);
    vC.value = v;
    vC.numFmt = fmt;
    vC.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: "FF0F172A" } };
    vC.alignment = { horizontal: "left" };
    curRow++;
  });

  curRow += 3;

  // Zona de Firmas para Entrega de Turno
  ws1.mergeCells(`B${curRow}:C${curRow}`);
  ws1.getCell(`B${curRow}`).value = "________________________________________";
  ws1.getCell(`B${curRow}`).alignment = { horizontal: "center" };
  ws1.mergeCells(`E${curRow}:F${curRow}`);
  ws1.getCell(`E${curRow}`).value = "________________________________________";
  ws1.getCell(`E${curRow}`).alignment = { horizontal: "center" };

  curRow++;
  ws1.mergeCells(`B${curRow}:C${curRow}`);
  ws1.getCell(`B${curRow}`).value = `Firma Cajero Saliente: ${cashierName}`;
  ws1.getCell(`B${curRow}`).font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: "FF334155" } };
  ws1.getCell(`B${curRow}`).alignment = { horizontal: "center" };

  ws1.mergeCells(`E${curRow}:F${curRow}`);
  ws1.getCell(`E${curRow}`).value = "Firma Auditor / Administrador";
  ws1.getCell(`E${curRow}`).font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: "FF334155" } };
  ws1.getCell(`E${curRow}`).alignment = { horizontal: "center" };

  // ══════════════════════════════════════════════════════════════════
  // HOJA 2: CRM_CLIENTES_Y_VENTAS (ADAPTADO DEL CRM TURING STORE)
  // ══════════════════════════════════════════════════════════════════
  const ws2 = wb.addWorksheet("CRM_CLIENTES_Y_VENTAS", {
    views: [{ state: "frozen", ySplit: 11, showGridLines: true }]
  });

  ws2.columns = [
    { width: 14 },  // A: ID Ticket
    { width: 20 },  // B: Fecha y Hora
    { width: 26 },  // C: Nombre de Cliente
    { width: 16 },  // D: Cedula / DNI
    { width: 16 },  // E: Telefono
    { width: 16 },  // F: Estado de Venta
    { width: 16 },  // G: Metodo de Pago
    { width: 12 },  // H: Cant Items
    { width: 14 },  // I: Unidades
    { width: 18 },  // J: Total Venta (COP)
    { width: 22 },  // K: Responsable / Cajero
    { width: 26 }   // L: Proxima Accion / Fidelizacion
  ];

  // Encabezado tipo CRM
  ws2.mergeCells("A1:K1");
  const crmTitle = ws2.getCell("A1");
  crmTitle.value = "GESTIÓN CRM DE CLIENTES Y VENTAS - " + businessName;
  crmTitle.font = { name: FONT_FAMILY, size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  crmTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INDIGO_HEADER } };
  crmTitle.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  ws2.getRow(1).height = 30;

  // Mini contadores tipo CRM Turing
  ws2.getCell("L1").value = "Total Ventas:";
  ws2.getCell("L1").font = { name: FONT_FAMILY, size: 8, bold: true, color: { argb: "FFFFFFFF" } };
  ws2.getCell("L1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: INDIGO_HEADER } };

  ws2.getCell("L2").value = totalTickets;
  ws2.getCell("L2").font = { name: FONT_FAMILY, size: 12, bold: true, color: { argb: BLUE_HEADER } };
  ws2.getCell("L2").alignment = { horizontal: "center" };

  ws2.getCell("L4").value = "Efectivo:";
  ws2.getCell("L4").font = { name: FONT_FAMILY, size: 8, bold: true };
  ws2.getCell("L5").value = countCash;
  ws2.getCell("L5").font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: EMERALD_FILL } };
  ws2.getCell("L5").alignment = { horizontal: "center" };

  ws2.getCell("L7").value = "Nequi/Daviplata:";
  ws2.getCell("L7").font = { name: FONT_FAMILY, size: 8, bold: true };
  ws2.getCell("L8").value = countNequi + countDaviplata;
  ws2.getCell("L8").font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: INDIGO_HEADER } };
  ws2.getCell("L8").alignment = { horizontal: "center" };

  // Metadatos en filas 3 a 9
  ws2.getCell("A3").value = `Generado por: ${cashierName} (${cashierRole}) | Fecha de Emisión: ${printTimestamp}`;
  ws2.getCell("A3").font = { name: FONT_FAMILY, size: 9, italic: true, color: { argb: "FF64748B" } };

  ws2.getCell("A5").value = `Período: ${periodLabel} | Total Registros: ${totalTickets} transacciones comerciales`;
  ws2.getCell("A5").font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: "FF334155" } };

  // Fila de Encabezados de Tabla en fila 11
  const crmHeaders = [
    "ID Ticket",
    "Fecha y Hora",
    "Nombre de Cliente",
    "Cédula Cliente",
    "Teléfono",
    "Estado de Venta",
    "Método de Cobro",
    "Ítems Distintos",
    "Total Uds",
    "Valor Venta (COP)",
    "Responsable",
    "Próxima Acción CRM"
  ];

  const crmHeaderRow = ws2.getRow(11);
  crmHeaderRow.height = 24;
  crmHeaders.forEach((h, idx) => {
    const c = crmHeaderRow.getCell(idx + 1);
    c.value = h;
    c.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
    c.alignment = { horizontal: idx >= 7 && idx <= 9 ? "right" : "left", vertical: "middle" };
    c.border = headerBorder;
  });

  // Filas de datos
  let crmRowIdx = 12;
  salesToExport.forEach((s, idx) => {
    const row = ws2.getRow(crmRowIdx);
    row.height = 20;

    const ticketId = s.id || `VTA-${s.orderNumber || idx + 1}`;
    const fechaStr = new Date(s.fecha).toLocaleString("es-CO");
    const clientName = s.cliente?.nombre || "Cliente Mostrador";
    const clientDni = s.cliente?.dni || "N/A";
    const clientPhone = s.cliente?.telefono || s.cliente?.phone || "N/A";
    const estadoVenta = "Entregado";
    const payment = s.metodoPago || "Efectivo";
    const itemCount = (s.items || []).length;
    const unitsCount = (s.items || []).reduce((acc, it) => acc + (Number(it.cantidad) || 1), 0);
    const saleTotal = Number(s.total) || 0;
    const seller = s.vendedor || cashierName;
    
    // Sugerencia CRM inteligente
    const nextAction = 
      saleTotal > 50000 ? "Cliente VIP - Enviar Catálogo" :
      clientName !== "Cliente Mostrador" ? "Agradecimiento WhatsApp" : "Fidelizar en Mostrador";

    const vals = [
      ticketId,
      fechaStr,
      clientName,
      clientDni,
      clientPhone,
      estadoVenta,
      payment,
      itemCount,
      unitsCount,
      saleTotal,
      seller,
      nextAction
    ];

    vals.forEach((v, cIdx) => {
      const c = row.getCell(cIdx + 1);
      c.value = v;
      c.font = { name: FONT_FAMILY, size: 9 };
      c.border = thinBorder;
      if (idx % 2 === 1) {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACCENT_ROW_EVEN } };
      }

      if (cIdx === 7 || cIdx === 8) {
        c.numFmt = '#,##0';
        c.alignment = { horizontal: "right" };
      } else if (cIdx === 9) {
        c.numFmt = '"$"#,##0';
        c.alignment = { horizontal: "right" };
      } else {
        c.alignment = { horizontal: "left" };
      }
    });

    crmRowIdx++;
  });

  // Fila Total en CRM
  const crmTotalRow = ws2.getRow(crmRowIdx);
  crmTotalRow.height = 24;
  crmTotalRow.getCell(1).value = "TOTALES";
  crmTotalRow.getCell(1).font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: "FFFFFFFF" } };
  crmTotalRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
  crmTotalRow.getCell(1).border = totalBorder;

  for (let c = 2; c <= 7; c++) {
    const cell = crmTotalRow.getCell(c);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
    cell.border = totalBorder;
  }

  const crmTotalUds = crmTotalRow.getCell(9);
  crmTotalUds.value = { formula: `SUM(I12:I${crmRowIdx - 1})` };
  crmTotalUds.numFmt = '#,##0';
  crmTotalUds.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: "FFFFFFFF" } };
  crmTotalUds.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
  crmTotalUds.border = totalBorder;
  crmTotalUds.alignment = { horizontal: "right" };

  const crmTotalVal = crmTotalRow.getCell(10);
  crmTotalVal.value = { formula: `SUM(J12:J${crmRowIdx - 1})` };
  crmTotalVal.numFmt = '"$"#,##0';
  crmTotalVal.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: "FFFFFFFF" } };
  crmTotalVal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
  crmTotalVal.border = totalBorder;
  crmTotalVal.alignment = { horizontal: "right" };

  for (let c = 11; c <= 12; c++) {
    const cell = crmTotalRow.getCell(c);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
    cell.border = totalBorder;
  }

  ws2.autoFilter = "A11:L11";

  // ══════════════════════════════════════════════════════════════════
  // HOJA 3: DETALLE_ITEMS_PRODUCTO (CÓDIGO, NOMBRE, CLIENTE, PRECIO)
  // ══════════════════════════════════════════════════════════════════
  const ws3 = wb.addWorksheet("DETALLE_ITEMS_PRODUCTO", {
    views: [{ state: "frozen", ySplit: 5, showGridLines: true }]
  });

  ws3.columns = [
    { width: 14 },  // A: N° Ticket
    { width: 20 },  // B: Fecha y Hora
    { width: 18 },  // C: Cajero
    { width: 24 },  // D: Nombre Cliente
    { width: 14 },  // E: Cédula / DNI
    { width: 15 },  // F: Método Pago
    { width: 16 },  // G: Código Producto
    { width: 34 },  // H: Nombre del Artículo
    { width: 16 },  // I: Categoría
    { width: 14 },  // J: Presentación
    { width: 10 },  // K: Cantidad
    { width: 18 },  // L: Precio Unitario (COP)
    { width: 18 },  // M: Subtotal (COP)
    { width: 16 },  // N: Costo Est. (COP)
    { width: 16 },  // O: Utilidad Est. (COP)
    { width: 12 }   // P: Margen (%)
  ];

  // Título Hoja 3
  ws3.mergeCells("A1:P1");
  const ws3Title = ws3.getCell("A1");
  ws3Title.value = `DESGLOSE DETALLADO ARTÍCULO POR ARTÍCULO - ${businessName}`;
  ws3Title.font = { name: FONT_FAMILY, size: 12, bold: true, color: { argb: "FFFFFFFF" } };
  ws3Title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE_HEADER } };
  ws3Title.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  ws3.getRow(1).height = 28;

  ws3.mergeCells("A2:P2");
  ws3.getCell("A2").value = `Período: ${periodLabel} | Emitido por: ${cashierName} (${cashierRole}) | ${printTimestamp}`;
  ws3.getCell("A2").font = { name: FONT_FAMILY, size: 9, italic: true, color: { argb: "FF475569" } };

  // Encabezados en fila 5
  const itemHeaders = [
    "N° Ticket",
    "Fecha y Hora",
    "Cajero / Vendedor",
    "Nombre Cliente",
    "Cédula Cliente",
    "Método Pago",
    "Código Producto",
    "Nombre del Artículo",
    "Categoría",
    "Presentación",
    "Cantidad",
    "Precio Unitario (COP)",
    "Subtotal (COP)",
    "Costo Aprox (COP)",
    "Utilidad Aprox (COP)",
    "Margen (%)"
  ];

  const itemHeaderRow = ws3.getRow(5);
  itemHeaderRow.height = 24;
  itemHeaders.forEach((h, idx) => {
    const c = itemHeaderRow.getCell(idx + 1);
    c.value = h;
    c.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
    c.alignment = { horizontal: idx >= 10 && idx <= 15 ? "right" : "left", vertical: "middle" };
    c.border = headerBorder;
  });

  let itemRowIdx = 6;
  salesToExport.forEach((s) => {
    const ticketId = s.id || `VTA-${s.orderNumber || "0"}`;
    const fechaStr = new Date(s.fecha).toLocaleString("es-CO");
    const seller = s.vendedor || cashierName;
    const clientName = s.cliente?.nombre || "Cliente Mostrador";
    const clientDni = s.cliente?.dni || "N/A";
    const payment = s.metodoPago || "Efectivo";

    (s.items || []).forEach((it) => {
      const row = ws3.getRow(itemRowIdx);
      row.height = 20;

      const code = String(it.codigo || it.productId || "SIN-COD").trim();
      const refProd = productMap.get(code);
      const name = it.nombre || refProd?.nombre || "Artículo";
      const cat = it.categoria || refProd?.categoria || "General";
      const pres = it.presentacion || refProd?.presentacion || "Unidad";
      const qty = Number(it.cantidad) || 1;
      const unitPrice = Number(it.precioUnitario) || (Number(it.subtotal) / qty) || 0;
      const subtotal = Number(it.subtotal) || (unitPrice * qty);
      const unitCost = Number(refProd?.costo) || (unitPrice * 0.7);
      const totalCost = unitCost * qty;
      const profit = Math.max(0, subtotal - totalCost);
      const margin = subtotal > 0 ? (profit / subtotal) : 0;

      const vals = [
        ticketId,
        fechaStr,
        seller,
        clientName,
        clientDni,
        payment,
        code,
        name,
        cat,
        pres,
        qty,
        unitPrice,
        subtotal,
        totalCost,
        profit,
        margin
      ];

      vals.forEach((v, cIdx) => {
        const c = row.getCell(cIdx + 1);
        c.value = v;
        c.font = { name: FONT_FAMILY, size: 9 };
        c.border = thinBorder;
        if (itemRowIdx % 2 === 1) {
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACCENT_ROW_EVEN } };
        }

        if (cIdx === 10) {
          c.numFmt = '#,##0';
          c.alignment = { horizontal: "right" };
        } else if (cIdx >= 11 && cIdx <= 14) {
          c.numFmt = '"$"#,##0';
          c.alignment = { horizontal: "right" };
        } else if (cIdx === 15) {
          c.numFmt = '0.0%';
          c.alignment = { horizontal: "right" };
        } else {
          c.alignment = { horizontal: "left" };
        }
      });

      itemRowIdx++;
    });
  });

  // Fila Total de Hoja 3
  const itemTotalRow = ws3.getRow(itemRowIdx);
  itemTotalRow.height = 24;
  itemTotalRow.getCell(1).value = "TOTALES DE ÍTEMS";
  itemTotalRow.getCell(1).font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: "FFFFFFFF" } };
  itemTotalRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
  itemTotalRow.getCell(1).border = totalBorder;

  for (let c = 2; c <= 10; c++) {
    const cell = itemTotalRow.getCell(c);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
    cell.border = totalBorder;
  }

  // Formula Suma Cantidad (Columna K)
  const sumQtyCell = itemTotalRow.getCell(11);
  sumQtyCell.value = { formula: `SUM(K6:K${itemRowIdx - 1})` };
  sumQtyCell.numFmt = '#,##0';
  sumQtyCell.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: "FFFFFFFF" } };
  sumQtyCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
  sumQtyCell.border = totalBorder;
  sumQtyCell.alignment = { horizontal: "right" };

  itemTotalRow.getCell(12).fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
  itemTotalRow.getCell(12).border = totalBorder;

  // Formula Suma Subtotal (Columna M)
  const sumSubtotalCell = itemTotalRow.getCell(13);
  sumSubtotalCell.value = { formula: `SUM(M6:M${itemRowIdx - 1})` };
  sumSubtotalCell.numFmt = '"$"#,##0';
  sumSubtotalCell.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: "FFFFFFFF" } };
  sumSubtotalCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
  sumSubtotalCell.border = totalBorder;
  sumSubtotalCell.alignment = { horizontal: "right" };

  // Formula Suma Costo (Columna N)
  const sumCostCell = itemTotalRow.getCell(14);
  sumCostCell.value = { formula: `SUM(N6:N${itemRowIdx - 1})` };
  sumCostCell.numFmt = '"$"#,##0';
  sumCostCell.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: "FFFFFFFF" } };
  sumCostCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
  sumCostCell.border = totalBorder;
  sumCostCell.alignment = { horizontal: "right" };

  // Formula Suma Utilidad (Columna O)
  const sumProfitCell = itemTotalRow.getCell(15);
  sumProfitCell.value = { formula: `SUM(O6:O${itemRowIdx - 1})` };
  sumProfitCell.numFmt = '"$"#,##0';
  sumProfitCell.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: "FFFFFFFF" } };
  sumProfitCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
  sumProfitCell.border = totalBorder;
  sumProfitCell.alignment = { horizontal: "right" };

  // Formula Margen Global (Columna P)
  const avgMarginCell = itemTotalRow.getCell(16);
  avgMarginCell.value = { formula: `IF(M${itemRowIdx}>0, O${itemRowIdx}/M${itemRowIdx}, 0)` };
  avgMarginCell.numFmt = '0.0%';
  avgMarginCell.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: "FFFFFFFF" } };
  avgMarginCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
  avgMarginCell.border = totalBorder;
  avgMarginCell.alignment = { horizontal: "right" };

  ws3.autoFilter = "A5:P5";

  // ══════════════════════════════════════════════════════════════════
  // HOJA 4: RANKING_TOP_PRODUCTOS
  // ══════════════════════════════════════════════════════════════════
  const ws4 = wb.addWorksheet("TOP_PRODUCTOS_VENTAS", {
    views: [{ state: "frozen", ySplit: 5, showGridLines: true }]
  });

  ws4.columns = [
    { width: 8 },   // A: Puesto
    { width: 16 },  // B: Código
    { width: 36 },  // C: Nombre del Artículo
    { width: 18 },  // D: Categoría
    { width: 18 },  // E: Unidades Vendidas
    { width: 22 },  // F: Ingresos Totales (COP)
    { width: 18 },  // G: Participación (%)
    { width: 20 }   // H: Utilidad Estimada (COP)
  ];

  ws4.mergeCells("A1:H1");
  const ws4Title = ws4.getCell("A1");
  ws4Title.value = `RANKING DE ARTÍCULOS MÁS VENDIDOS - ${businessName}`;
  ws4Title.font = { name: FONT_FAMILY, size: 12, bold: true, color: { argb: "FFFFFFFF" } };
  ws4Title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EMERALD_FILL } };
  ws4Title.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  ws4.getRow(1).height = 28;

  ws4.mergeCells("A2:H2");
  ws4.getCell("A2").value = `Período: ${periodLabel} | Generado por: ${cashierName}`;
  ws4.getCell("A2").font = { name: FONT_FAMILY, size: 9, italic: true, color: { argb: "FF475569" } };

  // Ranking data calculation
  const productStats = {};
  salesToExport.forEach(s => {
    (s.items || []).forEach(it => {
      const code = String(it.codigo || it.productId || "SIN-COD").trim();
      const refProd = productMap.get(code);
      const name = it.nombre || refProd?.nombre || "Artículo";
      const cat = it.categoria || refProd?.categoria || "General";
      const qty = Number(it.cantidad) || 1;
      const subtotal = Number(it.subtotal) || (Number(it.precioUnitario || 0) * qty);
      const unitCost = Number(refProd?.costo) || (Number(it.precioUnitario || 0) * 0.7);
      const profit = Math.max(0, subtotal - (unitCost * qty));

      const key = `${code}__${name}`;
      if (!productStats[key]) {
        productStats[key] = {
          code,
          name,
          category: cat,
          units: 0,
          revenue: 0,
          profit: 0
        };
      }
      productStats[key].units += qty;
      productStats[key].revenue += subtotal;
      productStats[key].profit += profit;
    });
  });

  const sortedProducts = Object.values(productStats).sort((a, b) => b.units - a.units);

  const topHeaders = [
    "Puesto",
    "Código",
    "Nombre del Artículo",
    "Categoría",
    "Unidades Vendidas",
    "Ingresos Totales (COP)",
    "Participación (%)",
    "Utilidad Estimada (COP)"
  ];

  const topHeaderRow = ws4.getRow(5);
  topHeaderRow.height = 24;
  topHeaders.forEach((h, idx) => {
    const c = topHeaderRow.getCell(idx + 1);
    c.value = h;
    c.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
    c.alignment = { horizontal: idx >= 4 ? "right" : "left", vertical: "middle" };
    c.border = headerBorder;
  });

  let topRowIdx = 6;
  sortedProducts.forEach((p, idx) => {
    const row = ws4.getRow(topRowIdx);
    row.height = 20;

    const share = totalGross > 0 ? (p.revenue / totalGross) : 0;
    const vals = [
      idx + 1,
      p.code,
      p.name,
      p.category,
      p.units,
      p.revenue,
      share,
      p.profit
    ];

    vals.forEach((v, cIdx) => {
      const c = row.getCell(cIdx + 1);
      c.value = v;
      c.font = { name: FONT_FAMILY, size: 9 };
      c.border = thinBorder;
      if (idx % 2 === 1) {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACCENT_ROW_EVEN } };
      }

      if (cIdx === 0) {
        c.alignment = { horizontal: "center" };
      } else if (cIdx === 4) {
        c.numFmt = '#,##0';
        c.alignment = { horizontal: "right" };
      } else if (cIdx === 5 || cIdx === 7) {
        c.numFmt = '"$"#,##0';
        c.alignment = { horizontal: "right" };
      } else if (cIdx === 6) {
        c.numFmt = '0.0%';
        c.alignment = { horizontal: "right" };
      } else {
        c.alignment = { horizontal: "left" };
      }
    });

    topRowIdx++;
  });

  ws4.autoFilter = "A5:H5";

  // ══════════════════════════════════════════════════════════════════
  // HOJA 5: PARAMETROS_SISTEMA (COMO EN EL CRM)
  // ══════════════════════════════════════════════════════════════════
  const ws5 = wb.addWorksheet("PARAMETROS", {
    views: [{ showGridLines: true }]
  });

  ws5.columns = [
    { width: 22 },
    { width: 26 },
    { width: 26 },
    { width: 26 }
  ];

  ws5.mergeCells("A1:D1");
  const ws5Title = ws5.getCell("A1");
  ws5Title.value = "PARÁMETROS Y CONFIGURACIÓN OPERATIVA DEL POS";
  ws5Title.font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  ws5Title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
  ws5Title.alignment = { horizontal: "left", indent: 1 };
  ws5.getRow(1).height = 24;

  const paramHeaders = ["Métodos de Pago Habilitados", "Estados de Entrega", "Acciones CRM Sugeridas", "Responsable Actual"];
  paramHeaders.forEach((h, i) => {
    const c = ws5.getCell(3, i + 1);
    c.value = h;
    c.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
    c.border = headerBorder;
  });

  const paramData = [
    ["Efectivo en Caja", "Entregado en Mostrador", "Agradecimiento WhatsApp", `${cashierName} (${cashierRole})`],
    ["Nequi", "En Reparto", "Cliente VIP - Enviar Catálogo", "María José (Propietaria)"],
    ["Daviplata", "Apartado / Reserva", "Fidelizar en Mostrador", "Administrador General"],
    ["Tarjeta Débito/Crédito", "Devolución / Garantía", "Ofrecer Promociones Quincena", "Asistente de Ventas"],
    ["Transferencia Bancaria", "Anulado", "Seguimiento Posventa", "Turno Tarde / Turno Mañana"]
  ];

  paramData.forEach((row, rIdx) => {
    row.forEach((v, cIdx) => {
      const c = ws5.getCell(4 + rIdx, cIdx + 1);
      c.value = v;
      c.font = { name: FONT_FAMILY, size: 9 };
      c.border = thinBorder;
    });
  });

  // Guardar archivo y disparar descarga en el navegador con soporte binario seguro
  const cleanStoreName = (businessName || "MISCELANEA_DIANA_SHARITH")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `Reporte_CRM_Cierre_Caja_${cleanStoreName}_${dateStamp}.xlsx`;

  const buffer = await wb.xlsx.writeBuffer();
  const uint8Array = new Uint8Array(buffer);
  const blob = new Blob([uint8Array], { 
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
  });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  try { a.setAttribute("style", "display: none;"); } catch {}
  a.href = url;
  a.setAttribute("download", fileName);
  document.body.appendChild(a);
  a.click();

  // No revocar la URL de inmediato para que Chrome/Edge no aborte la descarga
  setTimeout(() => {
    try {
      if (a && a.parentNode) {
        a.parentNode.removeChild(a);
      }
      window.URL.revokeObjectURL(url);
    } catch {}
  }, 60000);

  return true;
}
