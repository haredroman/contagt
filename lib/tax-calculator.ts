/**
 * Tax Calculator for Guatemala
 * IVA 12%, ISR retenciones, Factura Especial, Pequeño Contribuyente
 */

import type { FelTipoDocumento } from './fel-parser';

export type RegimenFiscal = 'GENERAL' | 'PEQUENO_CONTRIBUYENTE' | 'EXENTO';

export interface TaxBreakdown {
  baseGravable: number;
  iva: number;
  ivaTasa: number;
  isrRetencion: number;
  isrTasa: number;
  ivaRetencion: number;
  ivaRetencionTasa: number;
  totalImpuestos: number;
  totalAPagar: number;
  totalLiquidar: number;
  aplicaRetencionIVA: boolean;
  aplicaRetencionISR: boolean;
  notas: string[];
}

export const TAX_CONSTANTS = {
  IVA_GENERAL: 0.12,
  IVA_PEQUENO: 0.0,
  IVA_RETENCION_TASA: 0.15,
  ISR_FESP_TASA: 0.05,
  ISR_UMBRAL_RETENCION: 30000,
  IVA_RETENCION_UMBRAL: 2500,
} as const;

export function calcularImpuestosCompra(
  granTotal: number,
  ivaFEL: number,
  tipoDocumento: FelTipoDocumento,
  emisorAfiliacion: string,
  regimenComprador: RegimenFiscal = 'GENERAL',
  esAgenteRetenedor: boolean = false
): TaxBreakdown {
  const notas: string[] = [];
  let ivaCredito = 0;
  let isrRetencion = 0;
  let ivaRetencion = 0;
  let aplicaRetencionISR = false;
  let aplicaRetencionIVA = false;

  const base = ivaFEL > 0
    ? parseFloat((granTotal - ivaFEL).toFixed(2))
    : parseFloat((granTotal / (1 + TAX_CONSTANTS.IVA_GENERAL)).toFixed(2));
  const iva = ivaFEL > 0 ? ivaFEL : parseFloat((granTotal - base).toFixed(2));

  switch (tipoDocumento) {
    case 'FACT':
    case 'FCAM': {
      if (regimenComprador === 'GENERAL' && emisorAfiliacion !== 'PEQ') {
        ivaCredito = iva;
        notas.push(`IVA Crédito Fiscal: Q${ivaCredito.toFixed(2)}`);
      } else if (emisorAfiliacion === 'PEQ') {
        notas.push('Emisor Pequeño Contribuyente: IVA NO genera crédito fiscal');
      }
      if (esAgenteRetenedor && granTotal > TAX_CONSTANTS.IVA_RETENCION_UMBRAL) {
        ivaRetencion = parseFloat((iva * TAX_CONSTANTS.IVA_RETENCION_TASA).toFixed(2));
        aplicaRetencionIVA = true;
        notas.push(`⚠️ Agente Retenedor IVA: Retener Q${ivaRetencion.toFixed(2)}`);
      }
      break;
    }
    case 'FESP': {
      ivaCredito = iva;
      aplicaRetencionISR = true;
      aplicaRetencionIVA = true;
      isrRetencion = parseFloat((base * TAX_CONSTANTS.ISR_FESP_TASA).toFixed(2));
      ivaRetencion = iva;
      notas.push(`🧾 FACTURA ESPECIAL`);
      notas.push(`  Base gravable: Q${base.toFixed(2)}`);
      notas.push(`  IVA (12%): Q${iva.toFixed(2)} — RETENIDO`);
      notas.push(`  ISR (5%): Q${isrRetencion.toFixed(2)} — RETENIDO`);
      notas.push(`  Pago neto al proveedor: Q${(granTotal - iva - isrRetencion).toFixed(2)}`);
      break;
    }
    case 'FPEQ': {
      notas.push('Pequeño Contribuyente: sin IVA crédito fiscal');
      break;
    }
    case 'NCRE': {
      ivaCredito = -iva;
      notas.push(`Nota de Crédito: IVA reverso Q${Math.abs(ivaCredito).toFixed(2)}`);
      break;
    }
  }

  return {
    baseGravable: base,
    iva: ivaCredito,
    ivaTasa: tipoDocumento === 'FESP' || emisorAfiliacion !== 'PEQ' ? TAX_CONSTANTS.IVA_GENERAL : 0,
    isrRetencion,
    isrTasa: aplicaRetencionISR ? TAX_CONSTANTS.ISR_FESP_TASA : 0,
    ivaRetencion,
    ivaRetencionTasa: aplicaRetencionIVA ? TAX_CONSTANTS.IVA_RETENCION_TASA : 0,
    totalImpuestos: ivaCredito + isrRetencion + ivaRetencion,
    totalAPagar: granTotal,
    totalLiquidar: granTotal - ivaRetencion - isrRetencion,
    aplicaRetencionIVA,
    aplicaRetencionISR,
    notas,
  };
}

export function calcularResumenIVAMensual(
  ivaDebito: number,
  ivaCredito: number
): { ivaDebito: number; ivaCredito: number; diferencia: number; accion: 'PAGAR' | 'ARRASTRE'; descripcion: string } {
  const diferencia = parseFloat((ivaDebito - ivaCredito).toFixed(2));
  return {
    ivaDebito,
    ivaCredito,
    diferencia: Math.abs(diferencia),
    accion: diferencia >= 0 ? 'PAGAR' : 'ARRASTRE',
    descripcion: diferencia >= 0
      ? `Pagar a SAT: Q${diferencia.toFixed(2)}`
      : `Crédito fiscal a arrastrar: Q${Math.abs(diferencia).toFixed(2)}`,
  };
}
