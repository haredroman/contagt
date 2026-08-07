import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import ExcelJS from 'exceljs';

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

    // Get FEL documents classified as VENTA
    const felDocs = await prisma.felDocumento.findMany({
      where: {
        empresaId,
        direccion: 'VENTA',
        fecha: {
          gte: new Date(año, mes - 1, 1),
          lt: new Date(año, mes, 1),
        },
        estado: { in: ['PROCESADO', 'CONTABILIZADO', 'PENDIENTE'] },
      },
      orderBy: { fecha: 'asc' },
      include: { items: true },
    });

    interface LibroVentaRow {
      id: string;
      fecha: string;
      serie: string;
      numero: string;
      nit: string;
      cliente: string;
      tipo: string;
      total: number;
      gravado: number;
      exento: number;
      iva: number;
      estado: string;
      alerta?: string;
    }

    const rows: LibroVentaRow[] = felDocs.map((doc) => {
      const isNotaCredito = doc.tipoDocumento === 'NCRE';
      const isNotaDebito = doc.tipoDocumento === 'NDEB';

      const gravado = doc.emisorAfiliacionIVA === 'PEQ' || doc.tipoDocumento === 'FPEQ' ? 0 : doc.baseGravable;
      const exento = doc.emisorAfiliacionIVA === 'PEQ' || doc.tipoDocumento === 'FPEQ' ? doc.granTotal : 0;
      const iva = isNotaCredito ? -doc.totalIVA : doc.totalIVA;

      let alerta = '';
      if (doc.granTotal > 50000 && !isNotaCredito) {
        alerta = 'Monto > Q50,000: Verificar si el cliente aplica retención';
      }
      if (isNotaCredito) alerta = (alerta ? alerta + '; ' : '') + 'Nota de Crédito - IVA reverso';

      return {
        id: doc.id,
        fecha: doc.fecha.toISOString().split('T')[0],
        serie: doc.serie,
        numero: doc.numero,
        nit: doc.receptorNit,
        cliente: doc.receptorNombre,
        tipo: doc.tipoDocumento,
        total: isNotaCredito ? -doc.granTotal : doc.granTotal,
        gravado,
        exento,
        iva,
        estado: doc.estado,
        alerta,
      };
    });

    if (format === 'csv') {
      const header = [
        'Fecha', 'Serie', 'Numero', 'NIT Cliente', 'Nombre Cliente',
        'Tipo Documento', 'Total', 'Gravado', 'Exento', 'IVA Debito'
      ].join(',');

      const dataRows = rows.map((r) =>
        [r.fecha, r.serie, r.numero, r.nit, `"${r.cliente}"`, r.tipo, r.total.toFixed(2), r.gravado.toFixed(2), r.exento.toFixed(2), r.iva.toFixed(2)].join(',')
      );

      const totals = rows.reduce(
        (acc, r) => ({
          total: acc.total + r.total,
          gravado: acc.gravado + r.gravado,
          exento: acc.exento + r.exento,
          iva: acc.iva + r.iva,
        }),
        { total: 0, gravado: 0, exento: 0, iva: 0 }
      );

      const totalsRow = ['', '', '', '', '"TOTALES"', '', totals.total.toFixed(2), totals.gravado.toFixed(2), totals.exento.toFixed(2), totals.iva.toFixed(2)].join(',');

      const csv = [header, ...dataRows, totalsRow].join('\n');

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="LibroVentas_${año}-${String(mes).padStart(2, '0')}_${empresaId}.csv"`,
        },
      });
    }

    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Libro de Ventas');

      // Styles
      const headerStyle: Partial<ExcelJS.Style> = {
        font: { bold: true, color: { argb: 'FFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } },
        alignment: { vertical: 'middle', horizontal: 'center' },
        border: {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        },
      };

      const totalStyle: Partial<ExcelJS.Style> = {
        font: { bold: true, size: 11 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F4F6' } },
        border: {
          top: { style: 'thin' },
          bottom: { style: 'double' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        },
        numFmt: '"Q"#,##0.00',
      };

      const noteStyle = {
        font: { bold: true, size: 12, color: { argb: '1E3A8A' } },
      };

      // Column widths
      sheet.columns = [
        { header: 'Fecha', key: 'fecha', width: 12 },
        { header: 'Serie', key: 'serie', width: 8 },
        { header: 'Número', key: 'numero', width: 12 },
        { header: 'NIT Cliente', key: 'nit', width: 15 },
        { header: 'Nombre Cliente', key: 'cliente', width: 28 },
        { header: 'Tipo Doc', key: 'tipo', width: 10 },
        { header: 'Total (Q)', key: 'total', width: 14 },
        { header: 'Gravado (Q)', key: 'gravado', width: 14 },
        { header: 'Exento (Q)', key: 'exento', width: 14 },
        { header: 'IVA Débito (Q)', key: 'iva', width: 14 },
        { header: 'Estado', key: 'estado', width: 16 },
        { header: 'Alerta', key: 'alerta', width: 35 },
      ];

      // Header row
      sheet.getRow(1).eachCell((cell) => {
        cell.style = headerStyle;
      });

      // Data rows
      rows.forEach((row, idx) => {
        const r = sheet.addRow({
          ...row,
          total: row.total,
          gravado: row.gravado,
          exento: row.exento,
          iva: row.iva,
        });

        // Number formatting
        r.getCell('total').numFmt = '"Q"#,##0.00';
        r.getCell('gravado').numFmt = '"Q"#,##0.00';
        r.getCell('exento').numFmt = '"Q"#,##0.00';
        r.getCell('iva').numFmt = '"Q"#,##0.00';

        // Row colors for notes
        if (row.tipo === 'NCRE') {
          r.font = { color: { argb: 'DC2626' } };
        }
        if (row.alerta) {
          r.getCell('alerta').font = { bold: true, color: { argb: 'B91C1C' } };
        }
      });

      // Totals row
      const totals = rows.reduce(
        (acc, r) => ({
          total: acc.total + r.total,
          gravado: acc.gravado + r.gravado,
          exento: acc.exento + r.exento,
          iva: acc.iva + r.iva,
        }),
        { total: 0, gravado: 0, exento: 0, iva: 0 }
      );

      const totalRow = sheet.addRow({
        cliente: 'TOTALES GENERALES',
        total: totals.total,
        gravado: totals.gravado,
        exento: totals.exento,
        iva: totals.iva,
      });
      ['total', 'gravado', 'exento', 'iva'].forEach((key) => {
        totalRow.getCell(key).numFmt = '"Q"#,##0.00';
      });
      totalRow.eachCell((cell) => (cell.style = totalStyle));
      totalRow.getCell('cliente').font = { bold: true, size: 11 };

      // Note row
      sheet.addRow([]);
      const noteRow = sheet.addRow({
        fecha: 'Notas:',
      });
      noteRow.getCell('fecha').style = noteStyle;

      const notes = [
        'Reporte generado automáticamente por ContaGT',
        'Verificar datos contra portal SAT antes de presentación',
        'Notas de crédito (NCRE) muestran montos negativos',
        'IVA Débito = IVA causado por ventas gravadas',
      ];
      notes.forEach((note) => {
        sheet.addRow({ fecha: `• ${note}` }).getCell('fecha').font = { size: 10, italic: true, color: { argb: '6B7280' } };
      });

      // Export
      const buffer = await workbook.xlsx.writeBuffer();

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="LibroVentas_${año}-${String(mes).padStart(2, '0')}_${empresaId}.xlsx"`,
        },
      });
    }

    // JSON response
    const totals = rows.reduce(
      (acc, r) => ({
        total: acc.total + r.total,
        gravado: acc.gravado + r.gravado,
        exento: acc.exento + r.exento,
        iva: acc.iva + r.iva,
      }),
      { total: 0, gravado: 0, exento: 0, iva: 0 }
    );

    return NextResponse.json({
      success: true,
      periodo: { mes, año },
      empresaId,
      count: rows.length,
      rows,
      totals,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('GET /api/libros/ventas error:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}