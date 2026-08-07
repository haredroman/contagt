/**
 * Catalog of SAT specific codes and rules for categorization in Guatemala
 * Focuses on an advertising agency (Empresa de Publicidad)
 */

export interface SatSubaccount {
  code: string;
  name: string;
  type: 'BIEN' | 'SERVICIO' | 'COMBUSTIBLE';
  isDeductibleForAdvertising: boolean; // Tells the accountant if it's deductible for their business model
}

export const SAT_SUBACCOUNTS: Record<string, SatSubaccount> = {
  '1103.01': { code: '1103.01', name: 'Agua y Bebidas Básicas', type: 'BIEN', isDeductibleForAdvertising: true },
  '1103.03': { code: '1103.03', name: 'Bebidas no alcohólicas', type: 'BIEN', isDeductibleForAdvertising: false }, // General business representation/non-deductible unless specific client event
  '5102.01': { code: '5102.01', name: 'Energía Eléctrica Oficinas', type: 'SERVICIO', isDeductibleForAdvertising: true },
  '5104.01': { code: '5104.01', name: 'Servicio Telefónico Celular', type: 'SERVICIO', isDeductibleForAdvertising: true },
  '5105.01': { code: '5105.01', name: 'Servicio Internet / Enlace', type: 'SERVICIO', isDeductibleForAdvertising: true },
  '5201.01': { code: '5201.01', name: 'Gasolina Superior / Regular', type: 'COMBUSTIBLE', isDeductibleForAdvertising: true },
  '5201.02': { code: '5201.02', name: 'Diesel Vehículos de Reparto', type: 'COMBUSTIBLE', isDeductibleForAdvertising: true },
  '5301.01': { code: '5301.01', name: 'Almuerzos y Alimentación Personal', type: 'SERVICIO', isDeductibleForAdvertising: false }, // Strictly limited
  '5401.01': { code: '5401.01', name: 'Papelería e Insumos de Oficina', type: 'BIEN', isDeductibleForAdvertising: true },
  '5401.02': { code: '5401.02', name: 'Tintas, Vinilos y Material de Impresión', type: 'BIEN', isDeductibleForAdvertising: true }, // Core for advertising printing
  '5501.01': { code: '5501.01', name: 'Alquiler local comercial / oficinas', type: 'SERVICIO', isDeductibleForAdvertising: true },
  '5601.01': { code: '5601.01', name: 'Honorarios Diseño / Freelancers', type: 'SERVICIO', isDeductibleForAdvertising: true }, // Core service
  '5902.01': { code: '5902.01', name: 'Pauta digital (Facebook / Google Ads)', type: 'SERVICIO', isDeductibleForAdvertising: true }, // Core service
  '5902.02': { code: '5902.02', name: 'Material P.O.P. y Merchandising', type: 'BIEN', isDeductibleForAdvertising: true }, // Core bien
  '5902.03': { code: '5902.03', name: 'Eventos y BTL', type: 'SERVICIO', isDeductibleForAdvertising: true },
  '5001.01': { code: '5001.01', name: 'Gastos Varios de Oficina', type: 'BIEN', isDeductibleForAdvertising: true },
};

export interface ProductCategorization {
  suggestedCode: string;
  suggestedName: string;
  type: 'BIEN' | 'SERVICIO' | 'COMBUSTIBLE';
  summaryDescription: string;
  isDeductible: boolean;
}

/**
 * Intelligent categorization of raw product descriptions.
 * Generalizes varying items into a unified subaccount/category code.
 */
export function categorizeProduct(desc: string): ProductCategorization {
  const clean = desc.toUpperCase();

  // Fuel / Combustibles
  if (clean.includes('GASOLINA') || clean.includes('SUPERIOR') || clean.includes('REGULAR') || clean.includes('PUMA MAX') || clean.includes('V-POWER') || clean.includes('OCTANOS')) {
    return {
      suggestedCode: '5201.01',
      suggestedName: SAT_SUBACCOUNTS['5201.01'].name,
      type: 'COMBUSTIBLE',
      summaryDescription: 'Gasolina',
      isDeductible: true
    };
  }
  if (clean.includes('DIESEL') || clean.includes('DISMEN')) {
    return {
      suggestedCode: '5201.02',
      suggestedName: SAT_SUBACCOUNTS['5201.02'].name,
      type: 'COMBUSTIBLE',
      summaryDescription: 'Diesel',
      isDeductible: true
    };
  }

  // Beverages / Food
  if (clean.includes('COCA') || clean.includes('PEPSI') || clean.includes('BEBIDA') || clean.includes('GASEOSA') || clean.includes('JUGO') || clean.includes('AGUA DE COCO') || clean.includes('TE') || clean.includes('TEA') || clean.includes('CERVEZA') || clean.includes('LICOR')) {
    return {
      suggestedCode: '1103.03',
      suggestedName: SAT_SUBACCOUNTS['1103.03'].name,
      type: 'BIEN',
      summaryDescription: 'Bebidas no alcohólicas',
      isDeductible: false // Non-deductible for general advertising agency operations
    };
  }
  if (clean.includes('AGUA PURA') || clean.includes('AGUA SALVAVIDAS') || clean.includes('GARRAFON') || clean.includes('ECOFILTRO')) {
    return {
      suggestedCode: '1103.01',
      suggestedName: SAT_SUBACCOUNTS['1103.01'].name,
      type: 'BIEN',
      summaryDescription: 'Agua pura de oficina',
      isDeductible: true
    };
  }
  if (clean.includes('ALMUERZO') || clean.includes('DESAYUNO') || clean.includes('CENA') || clean.includes('MENU') || clean.includes('BUFFET') || clean.includes('RESTAURANTE') || clean.includes('McDONALDS') || clean.includes('BURGER') || clean.includes('POLLO') || clean.includes('PIZZA')) {
    return {
      suggestedCode: '5301.01',
      suggestedName: SAT_SUBACCOUNTS['5301.01'].name,
      type: 'SERVICIO',
      summaryDescription: 'Servicio de alimentación',
      isDeductible: false // Strictly non-deductible or limited representation expense
    };
  }

  // Print Core Advertising materials
  if (clean.includes('VINILO') || clean.includes('LONA') || clean.includes('IMPRESION') || clean.includes('IMPRESORA') || clean.includes('TINTA') || clean.includes('PLOTTER') || clean.includes('SUBLIMACION') || clean.includes('BANNER') || clean.includes('ACRILICO') || clean.includes('PVC')) {
    return {
      suggestedCode: '5401.02',
      suggestedName: SAT_SUBACCOUNTS['5401.02'].name,
      type: 'BIEN',
      summaryDescription: 'Materiales e insumos de impresión publicitaria',
      isDeductible: true
    };
  }

  // Digital Ads & Placements
  if (clean.includes('FACEBOOK') || clean.includes('FB ADS') || clean.includes('GOOGLE ADS') || clean.includes('INSTAGRAM') || clean.includes('PAUTA') || clean.includes('ADS') || clean.includes('TIKTOK ADS')) {
    return {
      suggestedCode: '5902.01',
      suggestedName: SAT_SUBACCOUNTS['5902.01'].name,
      type: 'SERVICIO',
      summaryDescription: 'Pauta publicitaria digital',
      isDeductible: true
    };
  }

  // Office Supplies
  if (clean.includes('PAPEL') || clean.includes('LAPICERO') || clean.includes('ENGRAPADORA') || clean.includes('BLOCK') || clean.includes('FOLDER') || clean.includes('CUADERNO') || clean.includes('UTILES')) {
    return {
      suggestedCode: '5401.01',
      suggestedName: SAT_SUBACCOUNTS['5401.01'].name,
      type: 'BIEN',
      summaryDescription: 'Útiles y papelería de oficina',
      isDeductible: true
    };
  }

  // Services
  if (clean.includes('LUZ') || clean.includes('EEGSA') || clean.includes('ENERGUATE') || clean.includes('ELECTRICA')) {
    return {
      suggestedCode: '5102.01',
      suggestedName: SAT_SUBACCOUNTS['5102.01'].name,
      type: 'SERVICIO',
      summaryDescription: 'Energía eléctrica',
      isDeductible: true
    };
  }
  if (clean.includes('CLARO') || clean.includes('TIGO') || clean.includes('TELEFONO') || clean.includes('CELULAR') || clean.includes('PLAN CONTENIDO')) {
    return {
      suggestedCode: '5104.01',
      suggestedName: SAT_SUBACCOUNTS['5104.01'].name,
      type: 'SERVICIO',
      summaryDescription: 'Servicio celular',
      isDeductible: true
    };
  }
  if (clean.includes('INTERNET') || clean.includes('FIBRA') || clean.includes('ENLACE')) {
    return {
      suggestedCode: '5105.01',
      suggestedName: SAT_SUBACCOUNTS['5105.01'].name,
      type: 'SERVICIO',
      summaryDescription: 'Enlace de Internet',
      isDeductible: true
    };
  }

  // Professional Services (Freelance / Design)
  if (clean.includes('DISENO') || clean.includes('DISEÑO') || clean.includes('FREELANCE') || clean.includes('ANIMACION') || clean.includes('EDICION') || clean.includes('LOCUCION') || clean.includes('FOTOGRAFIA') || clean.includes('VIDEO')) {
    return {
      suggestedCode: '5601.01',
      suggestedName: SAT_SUBACCOUNTS['5601.01'].name,
      type: 'SERVICIO',
      summaryDescription: 'Honorarios profesionales de diseño/producción',
      isDeductible: true
    };
  }

  // Defaults
  // Categorize based on common keywords or literal description
  const isService = clean.includes('SERVICIO') || clean.includes('MANO DE OBRA') || clean.includes('MANTENIMIENTO') || clean.includes('HONORARIOS') || clean.includes('ARRENDAMIENTO');
  const type = isService ? 'SERVICIO' : 'BIEN';
  const name = desc.length > 35 ? desc.substring(0, 35) + '...' : desc;

  return {
    suggestedCode: '5001.01',
    suggestedName: SAT_SUBACCOUNTS['5001.01'].name,
    type,
    summaryDescription: name,
    isDeductible: true
  };
}

/**
 * Checks if a list of items is "mixed" (i.e. contains high-diversity items
 * that don't match, e.g. buying a laptop, hamburgers, and gasoline on a single bill).
 * An advertising agency must be careful to avoid mixing deductible operational costs
 * with completely non-deductible items on the same FEL.
 */
export function checkMixedInvoice(items: Array<{ descripcion: string }>): { isMixed: boolean; reason: string; codesPresent: string[] } {
  if (items.length <= 1) {
    return { isMixed: false, reason: '', codesPresent: [] };
  }

  const categorizations = items.map(item => categorizeProduct(item.descripcion));
  const uniqueCodes = Array.from(new Set(categorizations.map(c => c.suggestedCode)));
  const uniqueTypes = Array.from(new Set(categorizations.map(c => c.type)));

  // If there are different types (e.g. BIEN and COMBUSTIBLE and SERVICIO in the same invoice)
  // or more than 2 distinct accounting codes, it is highly likely to be a mixed purchase.
  if (uniqueCodes.length >= 3 || (uniqueTypes.includes('COMBUSTIBLE') && uniqueTypes.includes('SERVICIO') && uniqueTypes.length >= 2)) {
    const categoriesText = uniqueCodes.map(code => SAT_SUBACCOUNTS[code]?.name || code).join(', ');
    return {
      isMixed: true,
      reason: `Factura mezclada detectada: contiene múltiples conceptos dispares (${categoriesText}).`,
      codesPresent: uniqueCodes
    };
  }

  return { isMixed: false, reason: '', codesPresent: uniqueCodes };
}
