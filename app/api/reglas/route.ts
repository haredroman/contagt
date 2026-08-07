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

export async function GET(request: NextRequest) {
  try {
    const empresaId = await getEmpresaId();
    if (!empresaId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const rules = await prisma.classificationRule.findMany({
      where: {
        OR: [{ empresaId: null }, { empresaId }],
      },
      orderBy: [{ priority: 'asc' }, { orden: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      data: rules.map((r) => ({
        ...r,
        keywords: JSON.parse(r.keywords || '[]'),
        notas: r.notas ? JSON.parse(r.notas) : [],
        condition: {
          nitEmisor: r.nitEmisor,
          nombreContiene: r.nombreContiene,
          keywords: JSON.parse(r.keywords || '[]'),
          montoMin: r.montoMin,
          montoMax: r.montoMax,
        },
        result: {
          accountCode: r.accountCode,
          accountName: r.accountName,
          taxTag: r.taxTag,
          notas: r.notas ? JSON.parse(r.notas) : [],
        },
      })),
    });
  } catch (error) {
    console.error('GET /api/reglas error:', error);
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

    const { id, priority, nitEmisor, nombreContiene, keywords, montoMin, montoMax, accountCode, accountName, taxTag, notas, activo, orden } = body;

    if (!priority || !accountCode || !accountName || !taxTag) {
      return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 });
    }

    const rule = await prisma.classificationRule.create({
      data: {
        id: id || undefined,
        empresaId: session?.user?.role === 'SUPER_ADMIN' ? null : empresaId, // global rules only for super admin
        nombre: id || `regla-${Date.now()}`,
        priority,
        nitEmisor,
        nombreContiene,
        keywords: JSON.stringify(keywords || []),
        montoMin,
        montoMax,
        accountCode,
        accountName,
        taxTag,
        notas: notas ? JSON.stringify(notas) : null,
        activo: activo !== false,
        orden: orden || 100,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session?.user?.id,
        entityType: 'ClassificationRule',
        entityId: rule.id,
        action: 'CREATE',
        afterState: JSON.stringify({ priority, accountCode, accountName }),
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({ success: true, data: rule });
  } catch (error) {
    console.error('POST /api/reglas error:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const empresaId = await getEmpresaId();
    if (!empresaId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const session = await getServerSession(authOptions);
    const body = await request.json();

    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const existing = await prisma.classificationRule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Regla no encontrada' }, { status: 404 });
    }

    // Check if user can modify this rule
    if (existing.empresaId !== null && existing.empresaId !== empresaId) {
      return NextResponse.json({ error: 'No autorizado para modificar regla global' }, { status: 403 });
    }

    const rule = await prisma.classificationRule.update({
      where: { id },
      data: {
        ...data,
        keywords: data.keywords ? JSON.stringify(data.keywords) : existing.keywords,
        notas: data.notas ? JSON.stringify(data.notas) : existing.notas,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session?.user?.id,
        entityType: 'ClassificationRule',
        entityId: rule.id,
        action: 'UPDATE',
        beforeState: JSON.stringify({ priority: existing.priority, accountCode: existing.accountCode }),
        afterState: JSON.stringify({ priority: rule.priority, accountCode: rule.accountCode }),
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({ success: true, data: rule });
  } catch (error) {
    console.error('PUT /api/reglas error:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const empresaId = await getEmpresaId();
    if (!empresaId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const existing = await prisma.classificationRule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Regla no encontrada' }, { status: 404 });
    }

    if (existing.empresaId !== null && existing.empresaId !== empresaId) {
      return NextResponse.json({ error: 'No autorizado para eliminar regla global' }, { status: 403 });
    }

    await prisma.classificationRule.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: session?.user?.id,
        entityType: 'ClassificationRule',
        entityId: id,
        action: 'REVERSE',
        beforeState: JSON.stringify({ accountCode: existing.accountCode }),
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/reglas error:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}