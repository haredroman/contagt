import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const estado = searchParams.get('estado');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');

    const where: Prisma.JournalEntryWhereInput = { empresaId };
    if (estado) where.estado = estado as Prisma.EnumEntryStatusFilter['equals'];
    if (fechaDesde || fechaHasta) {
      where.fecha = {};
      if (fechaDesde) where.fecha.gte = new Date(fechaDesde);
      if (fechaHasta) where.fecha.lte = new Date(fechaHasta);
    }

    const [asientos, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        orderBy: { fecha: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          items: true,
          periodo: true,
          documento: { select: { uuid: true, serie: true, numero: true, tipoDocumento: true } },
        },
      }),
      prisma.journalEntry.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: asientos,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('GET /api/asientos error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const empresaId = await getEmpresaId();
    if (!empresaId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const session = await getServerSession(authOptions);
    const body = await request.json();

    const { fecha, referencia, descripcion, tipo, items, felId } = body;

    if (!items || !Array.isArray(items) || items.length < 2) {
      return NextResponse.json({ error: 'Se requieren al menos 2 líneas (débito y crédito)' }, { status: 400 });
    }

    // Validate balance
    const totalDebe = items.reduce((s, i) => s + (i.debe || 0), 0);
    const totalHaber = items.reduce((s, i) => s + (i.haber || 0), 0);
    if (Math.abs(totalDebe - totalHaber) > 0.01) {
      return NextResponse.json({ error: `Asiento descuadrado: Debe ${totalDebe} ≠ Haber ${totalHaber}` }, { status: 400 });
    }

    const periodo = await prisma.periodo.findFirst({
      where: { empresaId, estado: 'ABIERTO' },
      orderBy: { mes: 'desc' },
    });

    const asiento = await prisma.journalEntry.create({
      data: {
        empresaId,
        periodoId: periodo?.id,
        felId,
        fecha: new Date(fecha),
        referencia,
        descripcion,
        tipo: tipo || 'DIARIO',
        estado: 'BORRADOR',
        source: 'MANUAL',
        createdBy: session?.user?.id,
        items: {
          create: items.map((item) => ({
            accountId: item.accountId,
            accountCode: item.accountCode,
            accountName: item.accountName,
            debe: item.debe || 0,
            haber: item.haber || 0,
            descripcion: item.descripcion,
            taxTags: JSON.stringify(item.taxTags || []),
            felUuid: item.felUuid,
          })),
        },
      },
      include: { items: true },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session?.user?.id,
        entryId: asiento.id,
        entityType: 'JournalEntry',
        entityId: asiento.id,
        action: 'CREATE',
        afterState: JSON.stringify({ fecha, referencia, totalDebe, totalHaber, tipo }),
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({ success: true, data: asiento });
  } catch (error) {
    console.error('POST /api/asientos error:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}