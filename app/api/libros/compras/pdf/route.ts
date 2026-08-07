
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { categorizeProduct, checkMixedInvoice } from '@/lib/sat-categorizer';
import { formatQ } from '@/lib/rules-engine'; // Import formatQ from rules-engine

export const runtime = 'nodejs';

async function getEmpresaId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { empresas: { where: { activo: true }, take: 1 } },
  });

  return user?.empresas[0]?.empresaId || null;
}

interface LibroCompraRow {
  fecha: string;
  serie: string;
  numero: string;
  nitProveedor: string;
  nombreProveedor: string;
  tipoDocumento: string;
  giro: 'BIEN' | 'SERVICIO' | 'COMBUSTIBLE';
  descripcion: string;
  codigoSAT: string;
  deducible: string;
  total: number;
  iva: number;
  base: number;
  isrRetencion: number;
  alerta: string;
}

function generateLibroComprasHTML(rows: LibroCompraRow[], periodo: { mes: number; año: number }, empresaNombre: string, empresaNit: string, empresaRegimen: string, empresaEsAgenteRetenedor: boolean): string {
  const mesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const totals = rows.reduce(
    (acc, r) => ({
      total: acc.total + r.total,
      base: acc.base + r.base,
      iva: acc.iva + r.iva,
      isr: acc.isr + r.isrRetencion,
    }),
    { total: 0, base: 0, iva: 0, isr: 0 }
  );

  const codeSummary: Record<string, { nombre: string; base: number }> = {};
  rows.filter((r) => r.deducible === 'SI').forEach((r) => {
    if (!codeSummary[r.codigoSAT]) {
      codeSummary[r.codigoSAT] = { nombre: r.descripcion, base: 0 };
    }
    codeSummary[r.codigoSAT].base += r.base;
  });

  return `
<!DOCTYPE html>
<html lang="es-GT">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Libro de Compras - ${empresaNombre} - ${mesNombres[periodo.mes - 1]} ${periodo.año}</title>
  <style>
    @media print {
      @page { margin: 15mm; size: A4 landscape; }
      .no-print { display: none !important; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
    }
    * { box-sizing: border-box; }
    body { font-family: 'DejaVu Sans', 'Arial', sans-serif; font-size: 9px; line-height: 1.3; color: #1f2937; margin: 0; padding: 20px; background: white; }
    .header { text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #1e3a8a; }
    .header h1 { margin: 0 0 5px; font-size: 18px; color: #1e3a8a; }
    .header .subtitle { font-size: 11px; color: #4b5563; }
    .header .period { font-size: 13px; font-weight: 600; color: #1e3a8a; margin-top: 5px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10px; }
    .info-row .label { color: #6b7280; }
    .info-row .value { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 8.5px; }
    th, td { border: 1px solid #d1d5db; padding: 3px 4px; text-align: left; vertical-align: top; }
    th { background: #1e3a8a; color: white; font-weight: 700; text-transform: uppercase; position: sticky; top: 0; z-index: 10; }
    thead th { background: #1e3a8a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .amount { text-align: right; font-variant-numeric: tabular-nums; font-family: 'DejaVu Sans Mono', monospace; }
    .badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 7px; font-weight: 700; text-transform: uppercase; }
    .badge-warning { background: #fef3c7; color: #b45309; }
    .badge-danger { background: #fee2e2; color: #b91c1c; }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-primary { background: #dbeafe; color: #1e40af; }
    .badge-muted { background: #f3f4f6; color: #6b7280; }
    .tr-cancelled { background: #f9fafb; color: #9ca3af; }
    .tr-mixed { background: #fef2f2; }
    .tr-nondeduct { background: #fffbeb; }
    tfoot tr { background: #f3f4f6; font-weight: 700; }
    tfoot td { border-top: 2px solid #1e3a8a; border-bottom: 2px solid #1e3a8a; }
    .summary-table { margin-top: 20px; width: 100%; border-collapse: collapse; }
    .summary-table th, .summary-table td { border: 1px solid #d1d5db; padding: 4px 6px; font-size: 8px; }
    .summary-table th { background: #f3f4f6; font-weight: 700; }
    .footer-note { margin-top: 20px; font-size: 8px; color: #6b7280; line-height: 1.5; }
    .no-print { text-align: center; margin: 20px 0; }
    .no-print button { padding: 8px 16px; background: #1e3a8a; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; }
    .no-print button:hover { background: #1e40af; }
  </style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
  </div>

  <div class="header">
    <h1>LIBRO DE COMPRAS INTELIGENTE</h1>
    <div class="subtitle">${empresaNombre}</div>
    <div class="period">${mesNombres[periodo.mes - 1]} ${periodo.año}</div>
    <div class="subtitle">NIT: ${empresaNit || '—'} | Régimen: ${empresaRegimen || 'GENERAL'} | ${empresaEsAgenteRetenedor ? 'Agente Retenedor IVA' : 'No Agente Retenedor'}</div>
    <div class="subtitle">Generado: ${new Date().toLocaleString('es-GT')} | ContaGT</div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px; font-size: 10px;">
    <div>
      <div class="info-row"><span class="label">Total Facturas:</span> <span class="value">${rows.length}</span></div>
      <div class="info-row"><span class="label">Vigentes:</span> <span class="value">${rows.filter(r => r.alerta !== 'FACTURA ANULADA').length}</span></div>
      <div class="info-row"><span class="label">Anuladas:</span> <span class="value">${rows.filter(r => r.alerta === 'FACTURA ANULADA').length}</span></div>
      <div class="info-row"><span class="label">Con alertas:</span> <span class="value">${rows.filter(r => r.alerta.startsWith('⚠️')).length}</span></div>
    </div>
    <div>
      <div class="info-row"><span class="label">Total Compras:</span> <span class="value">${formatQ(totals.total)}</span></div>
      <div class="info-row"><span class="label">Base Gravable:</span> <span class="value">${formatQ(totals.base)}</span></div>
      <div class="info-row"><span class="label">IVA Crédito:</span> <span class="value">${formatQ(totals.iva)}</span></div>
      <div class="info-row"><span class="label">ISR Retenciones:</span> <span class="value">${formatQ(totals.isr)}</span></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 50px;">Fecha</th>
        <th style="width: 60px;">Documento</th>
        <th style="width: 85px;">NIT Proveedor</th>
        <th style="width: 180px;">Proveedor</th>
        <th style="width: 50px;">Tipo</th>
        <th style="width: 50px;">Giro</th>
        <th style="width: 160px;">Descripción (Resumida)</th>
        <th style="width: 60px;">Cód SAT</th>
        <th style="width: 45px;">Deduc?</th>
        <th style="width: 70px;" class="amount">Total</th>
        <th style="width: 70px;" class="amount">IVA</th>
        <th style="width: 70px;" class="amount">Base</th>
        <th style="width: 60px;" class="amount">ISR Ret.</th>
        <th style="width: 180px;">Alerta / Estado</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((row, idx) => {
        let rowClass = '';
        if (row.alerta === 'FACTURA ANULADA') rowClass = 'tr-cancelled';
        else if (row.alerta.startsWith('⚠️')) rowClass = 'tr-mixed';
        else if (row.deducible === 'NO') rowClass = 'tr-nondeduct';

        const tipoBadge = row.tipoDocumento === 'FESP' ? 'badge-warning' :
                          row.tipoDocumento === 'NCRE' ? 'badge-danger' :
                          row.tipoDocumento === 'FPEQ' ? 'badge-primary' : 'badge-muted';

        const giroBadge = row.giro === 'COMBUSTIBLE' ? 'badge-warning' :
                          row.giro === 'SERVICIO' ? 'badge-primary' : 'badge-success';

        const deducibleBadge = row.deducible === 'SI' ? 'badge-success' : 'badge-danger';

        return `
        <tr class="${rowClass}">
          <td class="text-center">${row.fecha}</td>
          <td class="text-center">${row.serie}-${row.numero}</td>
          <td class="text-center" style="font-family: monospace;">${row.nitProveedor}</td>
          <td style="font-weight: 500;">
            ${row.nombreProveedor}
            ${row.alerta === 'FACTURA ANULADA' ? '<div style="font-size: 7px; font-weight: bold; color: #9ca3af;">ANULADA</div>' : ''}
            ${row.alerta.startsWith('⚠️') ? `<div style="font-size: 7px; color: #b91c1c;">${row.alerta}</div>` : ''}
          </td>
          <td class="text-center"><span class="badge ${tipoBadge}">${row.tipoDocumento}</span></td>
          <td class="text-center"><span class="badge ${giroBadge}">${row.giro}</span></td>
          <td style="font-size: 8px;">${row.descripcion}</td>
          <td class="text-center" style="font-family: monospace; font-weight: 700;">${row.codigoSAT}</td>
          <td class="text-center"><span class="badge ${deducibleBadge}">${row.deducible}</span></td>
          <td class="amount">${formatQ(row.total)}</td>
          <td class="amount" style="color: #1e3a8a;">${row.iva > 0 ? formatQ(row.iva) : '—'}</td>
          <td class="amount" style="font-weight: 700;">${formatQ(row.base)}</td>
          <td class="amount" style="color: #b91c1c;">${row.isrRetencion > 0 ? formatQ(row.isrRetencion) : '—'}</td>
          <td style="font-size: 7.5px;">${row.alerta.replace('⚠️ ', '⚠ ')}</td>
        </tr>
      `;
      }).join('')}
      <tfoot>
        <tr>
          <td colspan="9" style="text-align: right; font-size: 9px; text-transform: uppercase;">Totales Generales</td>
          <td class="amount">${formatQ(totals.total)}</td>
          <td class="amount" style="color: #1e3a8a;">${formatQ(totals.iva)}</td>
          <td class="amount">${formatQ(totals.base)}</td>
          <td class="amount" style="color: #b91c1c;">${formatQ(totals.isr)}</td>
          <td></td>
        </tr>
      </tfoot>
    </tbody>
  </table>

  <table class="summary-table">
    <thead>
      <tr>
        <th>Código SAT</th>
        <th>Descripción de Cuenta</th>
        <th class="amount">Base Total (Q)</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(codeSummary).map(([codigo, data]) => `
        <tr>
          <td class="text-center" style="font-family: monospace; font-weight: 700;">${codigo}</td>
          <td>${data.nombre}</td>
          <td class="amount" style="color: #166534; font-weight: 700;">${formatQ(data.base)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer-note">
    <strong>Notas importantes:</strong><br/>
    • La columna BASE se calcula restando el IVA del total de la factura. En caso de facturas anuladas, los montos se limpian a 0.00.<br/>
    • El botón de descarga genera un reporte de Excel listo para la junta directiva y el contador con el formato oficial de la SAT y resúmenes automáticos.<br/>
    • Revisar criterios fiscales, retenciones y presentación final con un contador y la normativa vigente de la SAT.<br/>
    • Códigos NO deducibles (naranja): consumos no afines al giro de publicidad (ej: bebidas no alcohólicas directas, almuerzos generales).<br/>
    • Facturas en rojo: facturas mezcladas detectadas automáticamente — contienen múltiples conceptos dispares (ej: Combustible + Alimentos + Papelería en una sola factura).
  </div>

  <script>
    // Auto-print when opened with ?print=1
    if (window.location.search.includes('print=1')) {
      window.onload = () => window.print();
    }
  </script>
</body>
</html>
`;
}

export async function GET(request: NextRequest) {
  try {
    const empresaId = await getEmpresaId();
    if (!empresaId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const mes = parseInt(searchParams.get('mes') || String(new Date().getMonth() + 1));
    const año = parseInt(searchParams.get('año') || String(new Date().getFullYear()));

    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });

    // Get FEL documents classified as COMPRA
    const felDocs = await prisma.felDocumento.findMany({
      where: {
        empresaId,
        direccion: 'COMPRA',
        fecha: {
          gte: new Date(año, mes - 1, 1),
          lt: new Date(año, mes, 1),
        },
        estado: { in: ['PROCESADO', 'CONTABILIZADO', 'PENDIENTE'] },
      },
      orderBy: { fecha: 'asc' },
      include: { items: true },
    });

    const rows: LibroCompraRow[] = felDocs.map((doc) => {
      const itemDesc = doc.items.map((i) => i.descripcion).join(', ');
      const cat = categorizeProduct(itemDesc);
      const mixed = checkMixedInvoice(doc.items);

      const isCancelled = doc.estado === 'ANULADO';
      const totalVal = isCancelled ? 0 : doc.granTotal;
      const ivaVal = isCancelled ? 0 : doc.totalIVA;
      const baseVal = isCancelled ? 0 : doc.baseGravable;
      const isrVal = isCancelled ? 0 : doc.isrRetencion;

      return {
        fecha: doc.fecha.toISOString().split('T')[0],
        serie: doc.serie,
        numero: doc.numero,
        nitProveedor: doc.emisorNit,
        nombreProveedor: doc.emisorNombre,
        tipoDocumento: doc.tipoDocumento,
        giro: cat.type,
        descripcion: cat.summaryDescription,
        codigoSAT: cat.suggestedCode,
        deducible: cat.isDeductible ? 'SI' : 'NO',
        total: totalVal,
        iva: ivaVal,
        base: baseVal,
        isrRetencion: isrVal,
        alerta: isCancelled
          ? 'FACTURA ANULADA'
          : mixed.isMixed
            ? `⚠️ MEZCLADA: ${mixed.reason}`
            : cat.isDeductible
              ? 'Deducible'
              : 'No deducible para Publicidad',
      };
    });

    // Generate HTML for PDF/print
    const html = generateLibroComprasHTML(rows, { mes, año }, empresa?.nombre || 'Empresa', empresa?.nit || '—', empresa?.regimenFiscal || 'GENERAL', empresa?.esAgenteRetenedor || false);

    if (format === 'html' || format === 'pdf') {
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `inline; filename="LibroCompras_${año}-${String(mes).padStart(2, '0')}.html"`,
        },
      });
    }

    // JSON response with summary
    const totals = rows.reduce(
      (acc, r) => ({
        total: acc.total + r.total,
        base: acc.base + r.base,
        iva: acc.iva + r.iva,
        isr: acc.isr + r.isrRetencion,
      }),
      { total: 0, base: 0, iva: 0, isr: 0 }
    );

    const codeSummary: Record<string, { nombre: string; base: number }> = {};
    rows.filter((r) => r.deducible === 'SI').forEach((r) => {
      if (!codeSummary[r.codigoSAT]) {
        codeSummary[r.codigoSAT] = { nombre: r.descripcion, base: 0 };
      }
      codeSummary[r.codigoSAT].base += r.base;
    });

    return NextResponse.json({
      success: true,
      periodo: { mes, año },
      empresaId,
      count: rows.length,
      rows,
      totals,
      codeSummary: Object.entries(codeSummary).map(([codigo, data]) => ({
        codigoSAT: codigo,
        descripcionCuenta: data.nombre,
        baseTotal: data.base,
      })),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('GET /api/libros/compras error:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
