import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export const runtime = 'nodejs';

// Mock data updated to include mixed invoices, cancelled invoices, and specific item breakdowns for an advertising agency.
const MOCK_COMPRAS = [
  {
    fecha: '2025-07-20',
    serie: 'A',
    numero: '00001245',
    nitProveedor: '1234567-8',
    nombreProveedor: 'ENERGUATE S.A.',
    tipoDocumento: 'FACT',
    total: 1284.50,
    baseGravable: 1146.85,
    ivaCredito: 137.65,
    noSujeto: 0,
    isrRetencion: 0,
    ivaRetencion: 0,
    estado: 'ok',
    items: [{ descripcion: 'CONSUMO DE ELECTRICIDAD DEL PERIODO' }]
  },
  {
    fecha: '2025-07-20',
    serie: 'B',
    numero: '00005821',
    nitProveedor: '8765432-1',
    nombreProveedor: 'CLARO GUATEMALA S.A.',
    tipoDocumento: 'FACT',
    total: 450.00,
    baseGravable: 401.79,
    ivaCredito: 48.21,
    noSujeto: 0,
    isrRetencion: 0,
    ivaRetencion: 0,
    estado: 'ok',
    items: [{ descripcion: 'SERVICIO INTERNET ENLACE DEDICADO Y CELULAR' }]
  },
  {
    // A cancelled invoice - must fill VAT, Total, etc. with 0
    fecha: '2025-07-19',
    serie: 'C',
    numero: '00009999',
    nitProveedor: '1122334-4',
    nombreProveedor: 'DISEÑO GRÁFICO ASOCIADO S.A.',
    tipoDocumento: 'FACT',
    total: 0,
    baseGravable: 0,
    ivaCredito: 0,
    noSujeto: 0,
    isrRetencion: 0,
    ivaRetencion: 0,
    estado: 'anulado',
    items: [{ descripcion: 'SERVICIO DE ASESORIA Y DISEÑO CREATIVO (ANULADO)' }]
  },
  {
    // Factura Especial
    fecha: '2025-07-19',
    serie: 'FESP',
    numero: '00000087',
    nitProveedor: '5432109-8',
    nombreProveedor: 'MARIO ENRIQUE LOPEZ GARCIA',
    tipoDocumento: 'FESP',
    total: 8500.00,
    baseGravable: 7589.29,
    ivaCredito: 910.71,
    noSujeto: 0,
    isrRetencion: 379.46,
    ivaRetencion: 910.71,
    estado: 'ok',
    items: [{ descripcion: 'SERVICIOS DE LOCUCIÓN Y EDICIÓN DE SPOTS RADIALES' }]
  },
  {
    // Gasoline / Fuel
    fecha: '2025-07-19',
    serie: 'C',
    numero: '00012458',
    nitProveedor: '2345678-9',
    nombreProveedor: 'PUMA ENERGY GUATEMALA S.A.',
    tipoDocumento: 'FACT',
    total: 3200.00,
    baseGravable: 2857.14,
    ivaCredito: 342.86,
    noSujeto: 0,
    isrRetencion: 0,
    ivaRetencion: 0,
    estado: 'ok',
    items: [{ descripcion: 'GASOLINA SUPERIOR PUMA MAX' }]
  },
  {
    // A highly mixed invoice (Fuel, Food, Office Supplies) - should trigger warning/red highlights
    fecha: '2025-07-18',
    serie: 'MIX',
    numero: '00004562',
    nitProveedor: '9988776-5',
    nombreProveedor: 'SUPERMERCADO WALMART GUATEMALA',
    tipoDocumento: 'FACT',
    total: 2500.00,
    baseGravable: 2232.14,
    ivaCredito: 267.86,
    noSujeto: 0,
    isrRetencion: 0,
    ivaRetencion: 0,
    estado: 'ok',
    items: [
      { descripcion: 'GASOLINA SUPERIOR PARA MOTOS DE ENVIOS' },
      { descripcion: 'BEBIDAS GASEOSAS Y COCA COLAS PARA EL PERSONAL' },
      { descripcion: 'PAPEL BOND TAMAÑO CARTA Y UTILES DE OFICINA' },
      { descripcion: 'ALMUERZO EJECUTIVO PARA JUNTA DIRECTIVA' }
    ]
  },
  {
    // Small taxpayer
    fecha: '2025-07-18',
    serie: 'P',
    numero: '00000542',
    nitProveedor: '9876543-2',
    nombreProveedor: 'TIENDA EL PROGRESO',
    tipoDocumento: 'FPEQ',
    total: 125.00,
    baseGravable: 125.00,
    ivaCredito: 0,
    noSujeto: 0,
    isrRetencion: 0,
    ivaRetencion: 0,
    estado: 'ok',
    items: [{ descripcion: 'AGUA PURA EN GARRAFON' }]
  },
  {
    // Large purchase
    fecha: '2025-07-17',
    serie: 'D',
    numero: '00000021',
    nitProveedor: '3456789-0',
    nombreProveedor: 'MAQUINARIA E IMPRESION INDUSTRIAL S.A.',
    tipoDocumento: 'FACT',
    total: 85000.00,
    baseGravable: 75892.86,
    ivaCredito: 9107.14,
    noSujeto: 0,
    isrRetencion: 0,
    ivaRetencion: 0,
    estado: 'ok',
    items: [{ descripcion: 'ADQUISICION DE VINILO AUTOADHERIBLE Y TINTAS PARA PLOTTER' }]
  }
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';

  // Import categorizer module dynamically
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { categorizeProduct, checkMixedInvoice } = require('@/lib/sat-categorizer');

  // Map database rows with real-time categorizations and mixed checks
  const processedRows = MOCK_COMPRAS.map((row) => {
    // If invoice is cancelled, ensure total, base, VAT are strictly 0
    const isCancelled = row.estado === 'anulado';
    const totalVal = isCancelled ? 0 : row.total;
    const ivaVal = isCancelled ? 0 : row.ivaCredito;
    const baseVal = isCancelled ? 0 : parseFloat((totalVal - ivaVal).toFixed(2));

    const itemDesc = row.items.map(item => item.descripcion).join(', ');
    const categorization = categorizeProduct(itemDesc);
    const mixedCheck = checkMixedInvoice(row.items);

    return {
      ...row,
      total: totalVal,
      ivaCredito: ivaVal,
      baseGravable: baseVal,
      tipoGiro: categorization.type, // BIEN, SERVICIO, COMBUSTIBLE
      codigoSAT: categorization.suggestedCode,
      descripcionSAT: categorization.suggestedName,
      resumenCorto: categorization.summaryDescription,
      isMixed: mixedCheck.isMixed,
      mixedReason: mixedCheck.reason,
      isDeductible: categorization.isDeductible
    };
  });

  if (format !== 'xlsx') {
    return NextResponse.json({
      success: true,
      rows: processedRows,
      generadoEn: new Date().toISOString()
    });
  }

  // Generate real styled Excel using exceljs
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Libro de Compras');

  // Configure column widths
  sheet.columns = [
    { header: 'Fecha', key: 'fecha', width: 12 },
    { header: 'Serie', key: 'serie', width: 8 },
    { header: 'Número', key: 'numero', width: 12 },
    { header: 'NIT Proveedor', key: 'nit', width: 15 },
    { header: 'Proveedor', key: 'proveedor', width: 28 },
    { header: 'Tipo Doc', key: 'tipoDoc', width: 10 },
    { header: 'Giro (SAT)', key: 'giro', width: 12 },
    { header: 'Descripción (Resumida)', key: 'desc', width: 30 },
    { header: 'Código SAT', key: 'codigoSat', width: 12 },
    { header: 'Deducible?', key: 'deducible', width: 12 },
    { header: 'Total (Q)', key: 'total', width: 14 },
    { header: 'IVA (Q)', key: 'iva', width: 14 },
    { header: 'Base (Q)', key: 'base', width: 14 },
    { header: 'ISR Ret.', key: 'isr', width: 14 },
    { header: 'Alerta / Estado', key: 'alerta', width: 45 }
  ];

  // Style Header
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '1E3A8A' } // Dark blue professional theme
  };
  sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Track code sums
  const codeSums: Record<string, { name: string; sum: number }> = {};

  // Insert rows & style them
  processedRows.forEach((r) => {
    const isCancelled = r.estado === 'anulado';
    const isMixed = r.isMixed;

    const rowData = {
      fecha: r.fecha,
      serie: r.serie,
      numero: r.numero,
      nit: r.nitProveedor,
      proveedor: r.nombreProveedor,
      tipoDoc: r.tipoDocumento,
      giro: r.tipoGiro,
      desc: r.resumenCorto,
      codigoSat: r.codigoSAT,
      deducible: r.isDeductible ? 'SI' : 'NO',
      total: r.total,
      iva: r.ivaCredito,
      base: r.baseGravable,
      isr: r.isrRetencion,
      alerta: isCancelled ? 'FACTURA ANULADA' : (isMixed ? `⚠️ MEZCLADA: ${r.mixedReason}` : (r.isDeductible ? 'Deducible' : 'No deducible para Publicidad'))
    };

    const row = sheet.addRow(rowData);

    // Number formatting
    row.getCell('total').numFmt = '"Q"#,##0.00';
    row.getCell('iva').numFmt = '"Q"#,##0.00';
    row.getCell('base').numFmt = '"Q"#,##0.00';
    row.getCell('isr').numFmt = '"Q"#,##0.00';

    // Apply conditional coloring
    if (isCancelled) {
      // Light gray row for cancelled documents
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F4F6' } };
        cell.font = { color: { argb: '9CA3AF' }, italic: true };
      });
    } else if (isMixed) {
      // Soft red row for mixed invoices
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } };
        cell.font = { color: { argb: 'B91C1C' }, bold: true };
      });
    } else if (!r.isDeductible) {
      // Soft orange for non-deductible items
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
        cell.font = { color: { argb: 'D97706' } };
      });
    }

    // Accumulate sum per SAT code
    if (!isCancelled) {
      if (!codeSums[r.codigoSAT]) {
        codeSums[r.codigoSAT] = { name: r.descripcionSAT, sum: 0 };
      }
      codeSums[r.codigoSAT].sum += r.baseGravable;
    }
  });

  // Space
  sheet.addRow([]);

  // Totals Row
  const totalRowIndex = sheet.rowCount + 1;
  sheet.addRow({
    proveedor: 'TOTALES GENERALES',
    total: { formula: `SUM(K2:K${totalRowIndex - 2})` },
    iva: { formula: `SUM(L2:L${totalRowIndex - 2})` },
    base: { formula: `SUM(M2:M${totalRowIndex - 2})` },
    isr: { formula: `SUM(N2:N${totalRowIndex - 2})` }
  });

  const totalsRowObj = sheet.getRow(totalRowIndex);
  totalsRowObj.font = { bold: true, size: 11 };
  totalsRowObj.getCell('total').numFmt = '"Q"#,##0.00';
  totalsRowObj.getCell('iva').numFmt = '"Q"#,##0.00';
  totalsRowObj.getCell('base').numFmt = '"Q"#,##0.00';
  totalsRowObj.getCell('isr').numFmt = '"Q"#,##0.00';
  totalsRowObj.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'double' }
    };
  });

  // Space
  sheet.addRow([]);
  sheet.addRow([]);

  // SUM BY CODE (Accounting summary sheet header inside same Excel sheet)
  const startSummaryRow = sheet.rowCount + 1;
  sheet.addRow({ proveedor: 'RESUMEN POR CÓDIGO SAT' }).font = { bold: true, size: 12 };
  sheet.addRow({
    nit: 'Código SAT',
    proveedor: 'Descripción de Cuenta',
    tipoDoc: 'Base Total (Q)'
  }).font = { bold: true };

  Object.entries(codeSums).forEach(([code, data]) => {
    sheet.addRow({
      nit: code,
      proveedor: data.name,
      tipoDoc: data.sum
    }).getCell('tipoDoc').numFmt = '"Q"#,##0.00';
  });

  // Outer border to summary
  for (let idx = startSummaryRow; idx <= sheet.rowCount; idx++) {
    sheet.getRow(idx).getCell('nit').font = { bold: true, name: 'Courier New' };
  }

  // Export buffer
  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="LibroCompras_Inteligente_Julio2025.xlsx"`
    }
  });
}
