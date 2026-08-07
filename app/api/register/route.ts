import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { AccountType, EmpresaRol, RegimenFiscal } from '@prisma/client';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

const BASE_ACCOUNTS = [
  { code: '1101', name: 'Caja y Bancos', type: AccountType.ACTIVO },
  { code: '1105', name: 'Cuentas por Cobrar', type: AccountType.ACTIVO },
  { code: '1201', name: 'IVA Crédito Fiscal', type: AccountType.ACTIVO, isTaxAccount: true, defaultTaxTag: 'iva_credito' },
  { code: '2101', name: 'Cuentas por Pagar', type: AccountType.PASIVO },
  { code: '2201', name: 'IVA Débito Fiscal', type: AccountType.PASIVO, isTaxAccount: true, defaultTaxTag: 'iva_debito' },
  { code: '3101', name: 'Capital', type: AccountType.CAPITAL },
  { code: '4101', name: 'Ventas', type: AccountType.INGRESO },
  { code: '5101', name: 'Compras', type: AccountType.GASTO },
  { code: '5401', name: 'Papelería y Útiles de Oficina', type: AccountType.GASTO },
  { code: '5501', name: 'Arrendamiento de Locales', type: AccountType.GASTO },
  { code: '5601', name: 'Honorarios Profesionales', type: AccountType.GASTO },
  { code: '5701', name: 'Gastos Bancarios y Financieros', type: AccountType.GASTO },
  { code: '5905', name: 'Gastos Varios Deducibles', type: AccountType.GASTO },
];

function normalizeNit(nit: string) {
  return nit.trim().toUpperCase().replace(/\s+/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const nombre = String(body.nombre || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const empresaNombre = String(body.empresa || '').trim();
    const nit = normalizeNit(String(body.nit || ''));
    const regimen = String(body.regimen || 'GENERAL') as RegimenFiscal;

    if (!nombre || !email || !password || !empresaNombre || !nit) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios' }, { status: 400 });
    }
    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Correo electrónico inválido' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });
    }
    if (!Object.values(RegimenFiscal).includes(regimen)) {
      return NextResponse.json({ error: 'Régimen fiscal inválido' }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese correo' }, { status: 409 });
    }

    const nitExists = await prisma.empresa.findUnique({ where: { nit } });
    if (nitExists) {
      return NextResponse.json({ error: 'Ya existe una empresa con ese NIT' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: nombre, email, passwordHash, role: 'CONTADOR' },
      });

      const empresa = await tx.empresa.create({
        data: {
          nombre: empresaNombre,
          nombreComercial: empresaNombre,
          nit,
          email,
          regimenFiscal: regimen,
          usuarios: {
            create: { userId: user.id, rol: EmpresaRol.DUENO, activo: true },
          },
          cuentas: {
            create: BASE_ACCOUNTS.map((account) => ({
              ...account,
              niifLevel: account.code.slice(0, 1),
              isTaxAccount: account.isTaxAccount || false,
              defaultTaxTag: account.defaultTaxTag || null,
            })),
          },
        },
      });

      await tx.periodo.createMany({
        data: Array.from({ length: 12 }, (_, idx) => ({
          empresaId: empresa.id,
          año: now.getFullYear(),
          mes: idx + 1,
        })),
      });

      return { user, empresa };
    });

    return NextResponse.json({
      success: true,
      user: { id: result.user.id, email: result.user.email, name: result.user.name },
      empresa: { id: result.empresa.id, nombre: result.empresa.nombre, nit: result.empresa.nit },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/register error:', error);
    return NextResponse.json({
      error: 'Error creando la cuenta',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
