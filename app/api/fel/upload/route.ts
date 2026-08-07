
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseFelXmlServer as parseFelXml } from '@/lib/fel-parser';
import { clasificarFEL } from '@/lib/rules-engine';
import { calcularImpuestosCompra } from '@/lib/tax-calculator';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const userId = session.user.id;

    const formData = await request.formData();
    const empresaId = formData.get('empresaId') as string;
    const files = formData.getAll('files') as File[];

    if (!empresaId || files.length === 0) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const results = await Promise.all(
      files.map(async (file) => {
        const xmlContent = await file.text();
        const parseResult = parseFelXml(xmlContent);

        if (!parseResult.success || !parseResult.data) {
          return {
            filename: file.name,
            success: false,
            errors: parseResult.errors,
          };
        }

        const fel = parseResult.data;

        // Check for duplicates
        const existing = await prisma.felDocumento.findUnique({
          where: { empresaId_uuid: { empresaId, uuid: fel.uuid } },
        });

        if (existing) {
          return {
            filename: file.name,
            success: false,
            errors: [`UUID duplicado: ${fel.uuid}`],
          };
        }

        const suggestion = clasificarFEL(fel);
        const taxes = calcularImpuestosCompra(
          fel.granTotal,
          fel.ivaCredito,
          fel.tipoDocumento,
          fel.emisorAfiliacionIVA,
          'GENERAL',
          false
        );

        const saved = await prisma.felDocumento.create({
          data: {
            empresaId,
            uuid: fel.uuid,
            serie: fel.serie,
            numero: fel.numero,
            tipoDocumento: fel.tipoDocumento,
            fecha: new Date(fel.fecha),
            hora: fel.hora,
            moneda: fel.moneda,
            emisorNit: fel.emisorNit,
            emisorNombre: fel.emisorNombre,
            emisorDireccion: fel.emisorDireccion,
            emisorMunicipio: fel.emisorMunicipio,
            emisorDepartamento: fel.emisorDepartamento,
            emisorAfiliacionIVA: fel.emisorAfiliacionIVA,
            receptorNit: fel.receptorNit,
            receptorNombre: fel.receptorNombre,
            granTotal: fel.granTotal,
            baseGravable: fel.baseGravable,
            totalIVA: fel.ivaCredito,
            ivaTasa: fel.ivaTasa,
            isrRetencion: taxes.isrRetencion,
            ivaRetencion: taxes.ivaRetencion,
            aplicaRetencionISR: taxes.aplicaRetencionISR,
            aplicaRetencionIVA: taxes.aplicaRetencionIVA,
            cuentaContableCode: suggestion.accountCode,
            cuentaContableName: suggestion.accountName,
            taxTag: suggestion.taxTag,
            clasificacionConfianza: suggestion.confidence,
            clasificacionRegla: suggestion.ruleMatched,
            estado: 'PROCESADO',
            direccion: 'COMPRA',
            certificadorNit: fel.certificadorNit,
            certificadorNombre: fel.certificadorNombre,
            fechaCertificacion: fel.fechaCertificacion ? new Date(fel.fechaCertificacion) : null,
            xmlOriginal: fel.xmlOriginal,
            items: {
              create: fel.items.map((item) => ({
                linea: item.linea,
                descripcion: item.descripcion,
                cantidad: item.cantidad,
                unidadMedida: item.unidadMedida,
                precioUnitario: item.precioUnitario,
                descuento: item.descuento,
                precio: item.precio,
                montoIVA: item.impuestos.find((i) => i.nombreCorto === 'IVA')?.montoImpuesto || 0,
                total: item.total,
              })),
            },
          },
        });

        await prisma.auditLog.create({
          data: {
            userId,
            entityType: 'FelDocumento',
            entityId: saved.id,
            action: 'CREATE',
            afterState: JSON.stringify({ uuid: saved.uuid, total: saved.granTotal, cuenta: suggestion.accountCode }),
            ip: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
          },
        });

        return {
          filename: file.name,
          success: true,
          uuid: saved.uuid,
          data: {
            uuid: saved.uuid,
            serie: saved.serie,
            numero: saved.numero,
            tipoDocumento: saved.tipoDocumento,
            fecha: saved.fecha,
            emisorNit: saved.emisorNit,
            emisorNombre: saved.emisorNombre,
            granTotal: saved.granTotal,
            baseGravable: saved.baseGravable,
            ivaCredito: saved.totalIVA,
            isrRetencion: saved.isrRetencion,
            ivaRetencion: saved.ivaRetencion,
            aplicaRetencionISR: saved.aplicaRetencionISR,
            aplicaRetencionIVA: saved.aplicaRetencionIVA,
            cuentaContableCode: saved.cuentaContableCode,
            cuentaContableName: saved.cuentaContableName,
            taxTag: saved.taxTag,
            clasificacionConfianza: saved.clasificacionConfianza,
          }
        };
      })
    );

    return NextResponse.json({
      success: true,
      processed: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    });
  } catch (error) {
    console.error('POST /api/fel/upload error:', error);
    return NextResponse.json({ error: 'Error procesando archivos' }, { status: 500 });
  }
}
