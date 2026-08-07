import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

function generateCSV(rows: LibroCompraRow[]): string {
  const header = [
    'Fecha', 'Serie', 'Numero', 'NIT Proveedor', 'Nombre Proveedor',
    'Tipo Documento', 'Giro (SAT)', 'Descripcion (Resumida)', 'Codigo SAT',
    'Deducible?', 'Total (Q)', 'IVA (Q)', 'Base (Q)', 'ISR Ret.',
    'Alerta / Estado'
  ].join(',');

  const dataRows = rows.map((r) =>
    [
      r.fecha,
      r.serie,
      r.numero,
      r.nitProveedor,
      `"${r.nombreProveedor}"`,
      r.tipoDocumento,
      r.giro,
      `"${r.descripcion}"`,
      r.codigoSAT,
      r.deducible,
      r.total.toFixed(2),
      r.iva.toFixed(2),
      r.base.toFixed(2),
      r.isrRetencion.toFixed(2),
      `"${r.alerta}"`,
    ].join(',')
  );

  // Totals
  const totals = rows.reduce(
    (acc, r) => ({
      total: acc.total + r.total,
      base: acc.base + r.base,
      iva: acc.iva + r.iva,
      isr: acc.isr + r.isrRetencion,
    }),
    { total: 0, base: 0, iva: 0, isr: 0 }
  );

  const totalsRow = [
    '', '', '', '', '"TOTALES GENERALES"',
    '', '', '', '',
    totals.total.toFixed(2),
    totals.iva.toFixed(2),
    totals.base.toFixed(2),
    totals.isr.toFixed(2),
    '',
  ].join(',');

  return [header, ...dataRows, totalsRow].join('\n');
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

    // Get period
    const periodo = await prisma.periodo.findUnique({
      where: { empresaId_año_mes: { empresaId, año, mes } },
    });

    // Get FEL documents classified as COMPRA
    const felDocs = await prisma.felDocumento.findMany({
      where: {
        empresaId,
        direccion: 'COMPRA',
        ...(periodo ? { fecha: { gte: new Date(año, mes - 1, 1), lt: new Date(año, mes, 1) } } : {}),
        estado: { in: ['PROCESADO', 'CONTABILIZADO', 'PENDIENTE'] },
      },
      orderBy: { fecha: 'asc' },
      include: { items: true },
    });

    // Get SAT categorizer rules for classification
    const { categorizeProduct, checkMixedInvoice } = await import('@/lib/sat-categorizer');
    const rules = await prisma.classificationRule.findMany({
      where: { OR: [{ empresaId: null }, { empresaId }] },
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

    if (format === 'csv') {
      const csv = generateCSV(rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="LibroCompras_${año}-${String(mes).padStart(2, '0')}_${empresaId}.csv"`,
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