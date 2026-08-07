/**
 * Rules Engine — Automatic classification of FEL invoices to accounting accounts
 * Priority: Exact NIT > Exact Name > Keyword > Default
 */

import type { ParsedFEL } from './fel-parser';

export type RulePriority = 'NIT_EXACTO' | 'NOMBRE_EXACTO' | 'KEYWORD' | 'DEFAULT';

export interface AccountSuggestion {
  accountCode: string;
  accountName: string;
  taxTag: string;
  confidence: number;
  ruleType: RulePriority;
  ruleMatched: string;
  notas: string[];
}

export interface ClassificationRule {
  id: string;
  priority: RulePriority;
  condition: {
    nitEmisor?: string;
    nombreContiene?: string;
    keywords?: string[];
    montoMin?: number;
    montoMax?: number;
  };
  result: {
    accountCode: string;
    accountName: string;
    taxTag: string;
    notas?: string[];
  };
  activo: boolean;
  empresaId?: string;
}

export const DEFAULT_RULES: ClassificationRule[] = [
  // Utilities - Electricity
  {
    id: 'util-luz',
    priority: 'KEYWORD',
    condition: { keywords: ['EEGSA', 'ENERGUATE', 'DEORSA', 'DEOCSA', 'ENERGÍA ELÉCTRICA', 'ENERGIA ELECTRICA', 'DISTRIBUIDORA DE ELECTRICIDAD'] },
    result: { accountCode: '5102', accountName: 'Gastos de Energía Eléctrica', taxTag: 'gasto_deducible_ISR' },
    activo: true,
  },
  // Water
  {
    id: 'util-agua',
    priority: 'KEYWORD',
    condition: { keywords: ['EMPAGUA', 'AGUAS NACIONALES', 'AGUA POTABLE', 'SERVICIO DE AGUA'] },
    result: { accountCode: '5103', accountName: 'Gastos de Agua', taxTag: 'gasto_deducible_ISR' },
    activo: true,
  },
  // Telephone
  {
    id: 'util-telefono',
    priority: 'KEYWORD',
    condition: { keywords: ['CLARO', 'TIGO', 'MOVISTAR', 'TELEFONICA', 'TELECOMUNICACIONES', 'COMUNICACIONES'] },
    result: { accountCode: '5104', accountName: 'Gastos de Teléfono y Comunicaciones', taxTag: 'gasto_deducible_ISR' },
    activo: true,
  },
  // Internet
  {
    id: 'util-internet',
    priority: 'KEYWORD',
    condition: { keywords: ['INTERNET', 'FIBRA OPTICA', 'FIBERNET', 'CABLE XTREME', 'CABLEDISTRIBUCION', 'SERVICIOS DE INTERNET'] },
    result: { accountCode: '5105', accountName: 'Gastos de Internet', taxTag: 'gasto_deducible_ISR' },
    activo: true,
  },
  // Fuel
  {
    id: 'combustible',
    priority: 'KEYWORD',
    condition: { keywords: ['PUMA', 'TEXACO', 'SHELL', 'GULF', 'PETROPLUS', 'GASOLINERA', 'COMBUSTIBLE', 'DIESEL', 'GASOLINA', 'ESTACION DE SERVICIO'] },
    result: { accountCode: '5201', accountName: 'Combustibles y Lubricantes', taxTag: 'gasto_deducible_ISR' },
    activo: true,
  },
  // Food
  {
    id: 'alimentacion',
    priority: 'KEYWORD',
    condition: { keywords: ['RESTAURANTE', 'CAFETERIA', 'POLLO', 'PIZZA', 'BURGER', 'ALIMENTOS', 'SUPERMERCADO', 'LA FRAGUA', 'WALMART', 'PAIZ', 'MAXI DESPENSA', 'DESPENSA', 'COMIDA'] },
    result: { accountCode: '5301', accountName: 'Gastos de Alimentación', taxTag: 'gasto_deducible_ISR_50pct' },
    activo: true,
  },
  // Office supplies
  {
    id: 'papeleria',
    priority: 'KEYWORD',
    condition: { keywords: ['PAPELERIA', 'IMPRENTA', 'OFFICEMAX', 'COPIADORA', 'IMPRESION', 'TONER', 'CARTUCHOS', 'UTILES DE OFICINA'] },
    result: { accountCode: '5401', accountName: 'Papelería y Útiles de Oficina', taxTag: 'gasto_deducible_ISR' },
    activo: true,
  },
  // Rent
  {
    id: 'alquiler',
    priority: 'KEYWORD',
    condition: { keywords: ['ALQUILER', 'ARRENDAMIENTO', 'RENTA'] },
    result: { accountCode: '5501', accountName: 'Gastos de Alquiler', taxTag: 'gasto_deducible_ISR' },
    activo: true,
  },
  // Professional fees
  {
    id: 'honorarios',
    priority: 'KEYWORD',
    condition: { keywords: ['HONORARIOS', 'PROFESIONALES', 'ASESORIA', 'CONSULTORIA'] },
    result: { accountCode: '5601', accountName: 'Honorarios Profesionales', taxTag: 'gasto_deducible_ISR' },
    activo: true,
  },
  // Advertising & Marketing
  {
    id: 'publicidad-digital',
    priority: 'KEYWORD',
    condition: { keywords: ['FACEBOOK ADS', 'GOOGLE ADS', 'PUBLICIDAD DIGITAL', 'CAMPAÑA DIGITAL'] },
    result: { accountCode: '5902.01', accountName: 'Pauta Digital (Facebook / Google Ads)', taxTag: 'gasto_deducible_ISR' },
    activo: true,
  },
  {
    id: 'pop-merchandising',
    priority: 'KEYWORD',
    condition: { keywords: ['MATERIAL POP', 'MERCHANDISING', 'PROMOCIONALES', 'P.O.P.'] },
    result: { accountCode: '5902.02', accountName: 'Material P.O.P. y Merchandising', taxTag: 'gasto_deducible_ISR' },
    activo: true,
  },
  {
    id: 'eventos-btl',
    priority: 'KEYWORD',
    condition: { keywords: ['EVENTOS', 'BTL', 'ACTIVACIONES', 'LOGISTICA EVENTOS'] },
    result: { accountCode: '5902.03', accountName: 'Eventos y BTL', taxTag: 'gasto_deducible_ISR' },
    activo: true,
  },
  // Default fallback
  {
    id: 'gastos-varios-default',
    priority: 'DEFAULT',
    condition: {},
    result: { accountCode: '5001', accountName: 'Gastos Varios de Oficina', taxTag: 'gasto_no_deducible' },
    activo: true,
  },
];

export function matchRule(fel: ParsedFEL, rule: ClassificationRule): { matched: boolean; confidence: number } {
  const cond = rule.condition;
  const emisorUpper = fel.emisorNombre.toUpperCase();
  const fullText = (emisorUpper + ' ' + fel.items.map(item => item.descripcion).join(' ')).toUpperCase();

  if (cond.nitEmisor) {
    return { matched: fel.emisorNit === cond.nitEmisor, confidence: 100 };
  }
  if (cond.nombreContiene) {
    return {
      matched: emisorUpper.includes(cond.nombreContiene.toUpperCase()),
      confidence: 95,
    };
  }
  if (cond.montoMin && !cond.keywords) {
    return { matched: fel.granTotal >= cond.montoMin, confidence: 80 };
  }
  if (cond.keywords && cond.keywords.length > 0) {
    const matchedKw = cond.keywords.find((kw) => fullText.includes(kw.toUpperCase()));
    if (!matchedKw) return { matched: false, confidence: 0 };
    if (cond.montoMin && fel.granTotal < cond.montoMin) return { matched: false, confidence: 0 };
    if (cond.montoMax && fel.granTotal > cond.montoMax) return { matched: false, confidence: 0 };
    return { matched: true, confidence: 85 };
  }
  // Default rule (no conditions)
  if (Object.keys(cond).length === 0) return { matched: true, confidence: 30 };

  return { matched: false, confidence: 0 };
}

export interface JournalLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
  taxTag: string;
}

export function generarLineasAsientoCompra(
  fel: ParsedFEL,
  suggestion: AccountSuggestion,
  aplicaRetencionISR: boolean = false,
  isrMonto: number = 0,
  aplicaRetencionIVA: boolean = false,
  ivaMonto: number = 0
): JournalLine[] {
  const lines: JournalLine[] = [];

  lines.push({
    accountCode: suggestion.accountCode,
    accountName: suggestion.accountName,
    debit: fel.baseGravable,
    credit: 0,
    description: `${fel.emisorNombre} — ${fel.serie}-${fel.numero}`,
    taxTag: suggestion.taxTag,
  });

  if (fel.ivaCredito > 0 && fel.emisorAfiliacionIVA !== 'PEQ') {
    const netIVA = fel.ivaCredito - (aplicaRetencionIVA ? ivaMonto : 0);
    if (netIVA > 0) {
      lines.push({
        accountCode: '1401',
        accountName: 'IVA Crédito Fiscal',
        debit: netIVA,
        credit: 0,
        description: `IVA — ${fel.serie}-${fel.numero}`,
        taxTag: 'IVA_credito',
      });
    }
    if (aplicaRetencionIVA && ivaMonto > 0) {
      lines.push({
        accountCode: '2402',
        accountName: 'IVA Retenciones por Pagar',
        debit: 0,
        credit: ivaMonto,
        description: `IVA Retenido — ${fel.serie}-${fel.numero}`,
        taxTag: 'IVA_retencion',
      });
    }
  }

  if (aplicaRetencionISR && isrMonto > 0) {
    lines.push({
      accountCode: '2401',
      accountName: 'ISR Retenciones por Pagar',
      debit: 0,
      credit: isrMonto,
      description: `ISR Retenido FESP — ${fel.serie}-${fel.numero}`,
      taxTag: 'ISR_retencion',
    });
  }

  lines.push({
    accountCode: '2101',
    accountName: 'Proveedores por Pagar',
    debit: 0,
    credit: fel.granTotal - (aplicaRetencionIVA ? ivaMonto : 0),
    description: `${fel.emisorNombre} — ${fel.serie}-${fel.numero}`,
    taxTag: 'pasivo_comercial',
  });

  return lines;
}

export function clasificarFEL(fel: ParsedFEL): AccountSuggestion {
  let bestSuggestion: AccountSuggestion = {
    accountCode: '5001',
    accountName: 'Gastos Varios',
    taxTag: 'gasto_no_deducible',
    confidence: 10,
    ruleType: 'DEFAULT',
    ruleMatched: 'default-001',
    notas: ['No se encontró regla específica, se asignó Gastos Varios.']
  };

  let bestMatch: { rule: ClassificationRule; confidence: number } | null = null;

  // First, check for company-specific rules (if any, would be loaded from DB)
  // For now, only using DEFAULT_RULES

  for (const rule of DEFAULT_RULES) {
    if (!rule.activo) continue;

    const { matched, confidence } = matchRule(fel, rule);

    if (matched) {
      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = { rule, confidence };
      }
    }
  }

  if (bestMatch) {
    bestSuggestion = {
      accountCode: bestMatch.rule.result.accountCode,
      accountName: bestMatch.rule.result.accountName,
      taxTag: bestMatch.rule.result.taxTag,
      confidence: bestMatch.confidence,
      ruleType: bestMatch.rule.priority,
      ruleMatched: bestMatch.rule.id,
      notas: bestMatch.rule.result.notas || []
    };
  }

  return bestSuggestion;
}

export function formatQ(n: number): string {
  return `Q ${n.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
