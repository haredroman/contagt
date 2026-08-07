/**
 * FEL Parser — Transforms Guatemala SAT XML DTE files into accounting objects
 * Supports FACT, FCAM, FPEQ, FESP (Factura Especial) document types
 * Handles both UTF-8 and ISO-8859-1 encodings
 */

export type FelTipoDocumento =
  | 'FACT'
  | 'FCAM'
  | 'FPEQ'
  | 'FESP'
  | 'NABN'
  | 'RDON'
  | 'RECI'
  | 'NDEB'
  | 'NCRE';

export type FelMoneda = 'GTQ' | 'USD';

export interface FelItem {
  linea: number;
  descripcion: string;
  cantidad: number;
  unidadMedida: string;
  precioUnitario: number;
  descuento: number;
  precio: number;
  impuestos: FelImpuesto[];
  total: number;
}

export interface FelImpuesto {
  nombreCorto: string;
  codigoUnidadGravable: number;
  montoGravable: number;
  montoImpuesto: number;
}

export interface ParsedFEL {
  // Identificación
  uuid: string;
  serie: string;
  numero: string;
  tipoDocumento: FelTipoDocumento;
  fecha: string; // ISO date YYYY-MM-DD
  hora: string;
  moneda: FelMoneda;

  // Emisor
  emisorNit: string;
  emisorNombre: string;
  emisorDireccion: string;
  emisorCodigoPostal: string;
  emisorMunicipio: string;
  emisorDepartamento: string;
  emisorPais: string;
  emisorAfiliacionIVA: string;

  // Receptor
  receptorNit: string;
  receptorNombre: string;
  receptorDireccion: string;
  receptorMunicipio: string;
  receptorDepartamento: string;
  receptorPais: string;
  receptorEmail: string;

  // Items
  items: FelItem[];

  // Totales
  granTotal: number;
  totalImpuestos: number;
  totalSinImpuestos: number;
  descuentosGlobales: number;

  // Desglose IVA
  ivaCredito: number;
  ivaTasa: number;
  baseGravable: number;

  // ISR Retención (Factura Especial)
  isrRetencion: number;
  isrTasa: number;
  aplicaRetencionISR: boolean;

  // Certificación
  certificadorNit: string;
  certificadorNombre: string;
  numeroCertificacion: string;
  fechaCertificacion: string;

  // Metadata
  xmlOriginal: string;
  parseadoEn: string;
  errores: string[];
  advertencias: string[];
}

export interface FelParseResult {
  success: boolean;
  data?: ParsedFEL;
  errors: string[];
  warnings: string[];
}

/**
 * Server-side FEL XML parser using fast-xml-parser
 */
export function parseFelXmlServer(xmlContent: string, filename?: string): FelParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Normalize encoding
    const normalizedXml = normalizeEncoding(xmlContent);

    // Use fast-xml-parser for server-side parsing
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { XMLParser } = require('fast-xml-parser');
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      allowBooleanAttributes: true,
      parseAttributeValue: true,
      trimValues: true,
      parseTagValue: true,
      isArray: (name: string) => ['Item', 'TotalImpuesto', 'Impuesto'].includes(name),
    });

    const parsed = parser.parse(normalizedXml);

    // Navigate the FEL structure - handles multiple namespace variations
    const root = parsed['dte:GTDocumento'] || parsed['GTDocumento'] || parsed;
    const dte =
      root?.['dte:SAT']?.['dte:DTE'] ||
      root?.SAT?.DTE ||
      root?.['SAT']?.['DTE'] ||
      parsed;

    const datosEmision =
      dte?.['dte:DatosEmision'] ||
      dte?.DatosEmision ||
      root?.['dte:DatosEmision'] ||
      root?.DatosEmision;

    if (!datosEmision) {
      // Try flat search
      const flat = flatSearch(parsed, 'DatosEmision');
      if (!flat) {
        return {
          success: false,
          errors: [`Estructura XML inválida${filename ? ` (${filename})` : ''}: No se encontró DatosEmision`],
          warnings: [],
        };
      }
    }

    const de = datosEmision || flatSearch(parsed, 'DatosEmision');
    if (!de) {
      return { success: false, errors: ['DatosEmision no encontrado'], warnings: [] };
    }

    // DatosGenerales
    const dg = de?.['dte:DatosGenerales'] || de?.DatosGenerales || {};
    const tipo = (dg?.['@_Tipo'] || 'FACT') as FelTipoDocumento;
    const fechaHora = dg?.['@_FechaHoraEmision'] || '';
    const { fecha, hora } = parseFechaHora(fechaHora);
    const moneda = (dg?.['@_CodigoMoneda'] || 'GTQ') as FelMoneda;
    const serie = String(dg?.['@_Serie'] || '');
    const numero = String(dg?.['@_Numero'] || '');

    // Emisor
    const em = de?.['dte:Emisor'] || de?.Emisor || {};
    const emisorNit = normalizeNit(String(em?.['@_NITEmisor'] || ''));
    const emisorNombre = String(em?.['@_NombreEmisor'] || '');
    const emisorAfiliacionIVA = String(em?.['@_AfiliacionIVA'] || 'GEN');

    const dirEm = em?.['dte:DireccionEmisor'] || em?.DireccionEmisor || {};
    const emisorDireccion = String(dirEm?.['dte:Direccion'] || dirEm?.Direccion || '');
    const emisorCodigoPostal = String(dirEm?.['dte:CodigoPostal'] || dirEm?.CodigoPostal || '');
    const emisorMunicipio = String(dirEm?.['dte:Municipio'] || dirEm?.Municipio || '');
    const emisorDepartamento = String(dirEm?.['dte:Departamento'] || dirEm?.Departamento || '');
    const emisorPais = String(dirEm?.['dte:Pais'] || dirEm?.Pais || 'GT');

    // Receptor
    const rec = de?.['dte:Receptor'] || de?.Receptor || {};
    const receptorNit = normalizeNit(String(rec?.['@_IDReceptor'] || 'CF'));
    const receptorNombre = String(rec?.['@_NombreReceptor'] || 'Consumidor Final');
    const receptorEmail = String(rec?.['@_CorreoReceptor'] || '');

    const dirRec = rec?.['dte:DireccionReceptor'] || rec?.DireccionReceptor || {};
    const receptorDireccion = String(dirRec?.['dte:Direccion'] || dirRec?.Direccion || '');
    const receptorMunicipio = String(dirRec?.['dte:Municipio'] || dirRec?.Municipio || '');
    const receptorDepartamento = String(dirRec?.['dte:Departamento'] || dirRec?.Departamento || '');
    const receptorPais = String(dirRec?.['dte:Pais'] || dirRec?.Pais || 'GT');

    // Items
    const itemsContainer = de?.['dte:Items'] || de?.Items || {};
    const itemsRaw = itemsContainer?.['dte:Item'] || itemsContainer?.Item || [];
    const itemsArr = Array.isArray(itemsRaw) ? itemsRaw : [itemsRaw].filter(Boolean);

    const items: FelItem[] = itemsArr.map((item: Record<string, unknown>, idx: number) => {
      const impRaw = (item?.['dte:Impuestos'] || item?.Impuestos || {}) as any;
      const impArr = Array.isArray(impRaw?.['dte:Impuesto'] || impRaw?.Impuesto)
        ? (impRaw?.['dte:Impuesto'] || impRaw?.Impuesto)
        : [(impRaw?.['dte:Impuesto'] || impRaw?.Impuesto)].filter(Boolean);

      const impuestos: FelImpuesto[] = impArr.map((imp: Record<string, unknown>) => ({
        nombreCorto: String(imp?.['dte:NombreCorto'] || imp?.NombreCorto || ''),
        codigoUnidadGravable: Number(imp?.['dte:CodigoUnidadGravable'] || imp?.CodigoUnidadGravable || 1),
        montoGravable: Number(imp?.['dte:MontoGravable'] || imp?.MontoGravable || 0),
        montoImpuesto: Number(imp?.['dte:MontoImpuesto'] || imp?.MontoImpuesto || 0),
      }));

      return {
        linea: Number(item?.['@_NumeroLinea'] || idx + 1),
        descripcion: String(item?.['dte:Descripcion'] || item?.Descripcion || ''),
        cantidad: Number(item?.['dte:Cantidad'] || item?.Cantidad || 1),
        unidadMedida: String(item?.['dte:UnidadMedida'] || item?.UnidadMedida || 'UND'),
        precioUnitario: Number(item?.['dte:PrecioUnitario'] || item?.PrecioUnitario || 0),
        descuento: Number(item?.['dte:Descuento'] || item?.Descuento || 0),
        precio: Number(item?.['dte:Precio'] || item?.Precio || 0),
        impuestos,
        total: Number(item?.['dte:Total'] || item?.Total || 0),
      };
    });

    // Totales
    const totales = de?.['dte:Totales'] || de?.Totales || {};
    const granTotal = Number(totales?.['dte:GranTotal'] || totales?.GranTotal || 0);

    const totalImpuestosEl = totales?.['dte:TotalImpuesto'] || totales?.TotalImpuesto || [];
    const tiArr = Array.isArray(totalImpuestosEl) ? totalImpuestosEl : [totalImpuestosEl].filter(Boolean);

    let ivaCredito = 0;
    let totalImpuestosSum = 0;
    tiArr.forEach((ti: Record<string, unknown>) => {
      const nc = String(ti?.['@_NombreCorto'] || '');
      const monto = Number(ti?.['@_TotalMontoImpuesto'] || 0);
      if (nc === 'IVA') ivaCredito = monto;
      totalImpuestosSum += monto;
    });

    // Tax calculations by type
    let ivaTasa = 0.12;
    let isrTasa = 0;
    let aplicaRetencionISR = false;

    if (tipo === 'FESP') {
      ivaTasa = 0.12;
      isrTasa = 0.05;
      aplicaRetencionISR = true;
      warnings.push(`FACTURA ESPECIAL: IVA y ISR son retenidos por el comprador`);
    } else if (emisorAfiliacionIVA === 'PEQ') {
      ivaTasa = 0;
      warnings.push('Emisor Pequeño Contribuyente: IVA no genera crédito fiscal');
    }

    if (ivaCredito === 0 && ivaTasa > 0 && granTotal > 0) {
      ivaCredito = parseFloat((granTotal - granTotal / (1 + ivaTasa)).toFixed(2));
    }

    const baseGravable = parseFloat((granTotal - ivaCredito).toFixed(2));
    const isrRetencion = aplicaRetencionISR ? parseFloat((baseGravable * isrTasa).toFixed(2)) : 0;

    if (granTotal > 50000) {
      warnings.push(`Alto monto (Q${granTotal.toFixed(2)}): Verificar retención ISR según régimen del emisor`);
    }

    // Certification
    const certEl =
      dte?.['dte:Certificacion'] ||
      dte?.Certificacion ||
      flatSearch(parsed, 'Certificacion') ||
      {};
    const numAutoEl = certEl?.['dte:NumeroAutorizacion'] || certEl?.NumeroAutorizacion;
    const uuid = typeof numAutoEl === 'string'
      ? numAutoEl.trim()
      : String(numAutoEl?.['#text'] || numAutoEl?.['@_NumeroAutorizacion'] || '');
    const certificadorNit = String(certEl?.['@_NITCertificador'] || '');
    const certificadorNombre = String(certEl?.['@_NombreCertificador'] || '');
    const fechaCertificacion = String(certEl?.['dte:FechaHoraCertificacion'] || certEl?.FechaHoraCertificacion || '');

    return {
      success: true,
      data: {
        uuid,
        serie,
        numero,
        tipoDocumento: tipo,
        fecha,
        hora,
        moneda,
        emisorNit,
        emisorNombre,
        emisorDireccion,
        emisorCodigoPostal,
        emisorMunicipio,
        emisorDepartamento,
        emisorPais,
        emisorAfiliacionIVA,
        receptorNit,
        receptorNombre,
        receptorDireccion,
        receptorMunicipio,
        receptorDepartamento,
        receptorPais,
        receptorEmail,
        items,
        granTotal,
        totalImpuestos: totalImpuestosSum || ivaCredito,
        totalSinImpuestos: baseGravable,
        descuentosGlobales: 0,
        ivaCredito,
        ivaTasa,
        baseGravable,
        isrRetencion,
        isrTasa,
        aplicaRetencionISR,
        certificadorNit,
        certificadorNombre,
        numeroCertificacion: uuid,
        fechaCertificacion,
        xmlOriginal: xmlContent,
        parseadoEn: new Date().toISOString(),
        errores: errors,
        advertencias: warnings,
      },
      errors,
      warnings,
    };
  } catch (err) {
    return {
      success: false,
      errors: [`Error parseando FEL${filename ? ` (${filename})` : ''}: ${err instanceof Error ? err.message : String(err)}`],
      warnings: [],
    };
  }
}

// ============ Helpers ============

function normalizeEncoding(xml: string): string {
  return xml.replace(/encoding=['"]ISO-8859-1['"]/gi, 'encoding="UTF-8"');
}

function flatSearch(obj: unknown, key: string): Record<string, unknown> | null {
  if (!obj || typeof obj !== 'object') return null;
  const record = obj as Record<string, unknown>;
  for (const k of Object.keys(record)) {
    if (k === key || k === `dte:${key}`) return record[k] as Record<string, unknown>;
    const found = flatSearch(record[k], key);
    if (found) return found;
  }
  return null;
}

function parseFechaHora(fechaHora: string): { fecha: string; hora: string } {
  if (!fechaHora) return { fecha: new Date().toISOString().split('T')[0], hora: '00:00:00' };
  const parts = String(fechaHora).split('T');
  return {
    fecha: parts[0] || String(fechaHora).substring(0, 10),
    hora: parts[1]?.substring(0, 8) || '00:00:00',
  };
}

export function normalizeNit(nit: string): string {
  if (!nit || nit === 'CF') return 'CF';
  return String(nit).toUpperCase().replace(/\s/g, '');
}

export function formatNit(nit: string): string {
  if (!nit || nit === 'CF') return 'CF';
  const clean = nit.replace(/[^0-9A-Za-z]/g, '');
  if (clean.length > 1) return clean.slice(0, -1) + '-' + clean.slice(-1);
  return clean;
}

export function formatCurrency(amount: number, currency: FelMoneda = 'GTQ'): string {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: currency === 'USD' ? 'USD' : 'GTQ',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function isNotaCredito(tipo: FelTipoDocumento): boolean { return tipo === 'NCRE'; }
export function isNotaDebito(tipo: FelTipoDocumento): boolean { return tipo === 'NDEB'; }
export function isCancelacion(tipo: FelTipoDocumento): boolean { return tipo === 'NABN'; }
export function isFacturaEspecial(tipo: FelTipoDocumento): boolean { return tipo === 'FESP'; }
