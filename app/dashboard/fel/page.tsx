'use client';

import { useState, useRef, useCallback } from 'react';
import JSZip from 'jszip';

interface ParsedDoc {
  id: string;
  filename: string;
  uuid: string;
  serie: string;
  numero: string;
  tipo: string;
  fecha: string;
  emisorNit: string;
  emisorNombre: string;
  granTotal: number;
  ivaCredito: number;
  baseGravable: number;
  isrRetencion: number;
  aplicaRetencionISR: boolean;
  emisorAfiliacion: string;
  cuentaSugerida: string;
  cuentaCodigo: string;
  confianza: number;
  estado: 'ok' | 'warning' | 'error' | 'duplicate';
  advertencias: string[];
  errores: string[];
}

function formatQ(n: number) {
  return `Q ${n.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`;
}

function getTipoBadge(tipo: string) {
  const map: Record<string, string> = { FACT: 'badge-primary', FESP: 'badge-warning', NCRE: 'badge-danger', FPEQ: 'badge-info', FCAM: 'badge-secondary' };
  return <span className={`badge ${map[tipo] || 'badge-muted'}`}>{tipo}</span>;
}

function getEstadoBadge(estado: string, advertencias: string[]) {
  if (estado === 'error') return <span className="badge badge-danger">✗ Error</span>;
  if (estado === 'duplicate') return <span className="badge badge-muted">⊘ Duplicado</span>;
  if (advertencias.length > 0) return <span className="badge badge-warning">⚠ Alerta</span>;
  return <span className="badge badge-success">✓ OK</span>;
}

function getConfianzaColor(c: number) {
  if (c >= 85) return 'var(--color-success)';
  if (c >= 60) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

// Simulated rules for demo (mirrors the real rules engine logic)
const DEMO_KEYWORDS: Record<string, { code: string; name: string }> = {
  ENERGUATE: { code: '5102', name: 'Energía Eléctrica' },
  EEGSA: { code: '5102', name: 'Energía Eléctrica' },
  CLARO: { code: '5104', name: 'Teléfono y Comunicaciones' },
  TIGO: { code: '5104', name: 'Teléfono y Comunicaciones' },
  MOVISTAR: { code: '5104', name: 'Teléfono y Comunicaciones' },
  PUMA: { code: '5201', name: 'Combustibles' },
  TEXACO: { code: '5201', name: 'Combustibles' },
  SHELL: { code: '5201', name: 'Combustibles' },
  RESTAURANTE: { code: '5301', name: 'Alimentación' },
  PAPELERIA: { code: '5401', name: 'Papelería' },
  OFFICEM: { code: '5401', name: 'Papelería y Útiles' },
  ALQUILER: { code: '5501', name: 'Arrendamiento' },
  HONORARIO: { code: '5601', name: 'Honorarios Profesionales' },
  BANCO: { code: '5701', name: 'Gastos Bancarios' },
  BANRURAL: { code: '5701', name: 'Gastos Bancarios' },
  FARMACIA: { code: '5801', name: 'Gastos Médicos' },
  TRANSPORTE: { code: '5901', name: 'Fletes y Transportes' },
  PUBLICIDAD: { code: '5902', name: 'Publicidad y Mercadeo' },
};

function classifyByName(emisorNombre: string, total: number): { code: string; name: string; confidence: number } {
  const upper = emisorNombre.toUpperCase();
  for (const [kw, result] of Object.entries(DEMO_KEYWORDS)) {
    if (upper.includes(kw)) return { ...result, confidence: 85 };
  }
  if (total > 50000) return { code: '5999', name: 'Por Clasificar (Monto Alto)', confidence: 40 };
  return { code: '5001', name: 'Gastos Generales', confidence: 30 };
}

// Demo XML parser (client-side simplified version)
async function parseXmlContent(content: string, filename: string, existingUuids: Set<string>): Promise<ParsedDoc> {
  const id = Math.random().toString(36).slice(2);
  const advertencias: string[] = [];
  const errores: string[] = [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content.replace(/encoding=['"]ISO-8859-1['"]/gi, 'encoding="UTF-8"'), 'text/xml');

    const getAttr = (tags: string[], attr: string) => {
      for (const tag of tags) {
        const el = doc.querySelector(tag) || doc.getElementsByTagName(tag.split(':').pop() || tag)[0];
        if (el) return el.getAttribute(attr) || '';
      }
      return '';
    };

    const getText = (tags: string[]) => {
      for (const tag of tags) {
        const el = doc.querySelector(tag) || doc.getElementsByTagName(tag.split(':').pop() || tag)[0];
        if (el && el.textContent) return el.textContent.trim();
      }
      return '';
    };

    // UUID from certification
    const uuid = getText(['dte\\:NumeroAutorizacion', 'NumeroAutorizacion']) ||
      getAttr(['NumeroAutorizacion'], 'NumeroAutorizacion') || `DEMO-${id}`;

    // DatosGenerales
    const tipo = (getAttr(['DatosGenerales', 'dte\\:DatosGenerales'], 'Tipo') || 'FACT');
    const fechaHora = getAttr(['DatosGenerales', 'dte\\:DatosGenerales'], 'FechaHoraEmision') || '';
    const fecha = fechaHora.split('T')[0] || new Date().toISOString().split('T')[0];
    const serie = String(getAttr(['DatosGenerales', 'dte\\:DatosGenerales'], 'Serie') || 'A');
    const numero = String(getAttr(['DatosGenerales', 'dte\\:DatosGenerales'], 'Numero') || '1');

    // Emisor
    const emisorNit = (getAttr(['Emisor', 'dte\\:Emisor'], 'NITEmisor') || 'CF').toUpperCase();
    const emisorNombre = getAttr(['Emisor', 'dte\\:Emisor'], 'NombreEmisor') || 'Emisor Desconocido';
    const afiliacion = getAttr(['Emisor', 'dte\\:Emisor'], 'AfiliacionIVA') || 'GEN';

    // Totales
    const granTotalText = getText(['GranTotal', 'dte\\:GranTotal']);
    const granTotal = parseFloat(granTotalText || '0');

    // IVA
    let ivaCredito = 0;
    const tiEls = doc.querySelectorAll('TotalImpuesto');
    tiEls.forEach((ti) => {
      if (ti.getAttribute('NombreCorto') === 'IVA') {
        ivaCredito = parseFloat(ti.getAttribute('TotalMontoImpuesto') || '0');
      }
    });
    if (ivaCredito === 0 && afiliacion !== 'PEQ' && tipo !== 'FPEQ') {
      ivaCredito = parseFloat((granTotal - granTotal / 1.12).toFixed(2));
    }
    const baseGravable = parseFloat((granTotal - ivaCredito).toFixed(2));

    // ISR for FESP
    const aplicaRetencionISR = tipo === 'FESP';
    const isrRetencion = aplicaRetencionISR ? parseFloat((baseGravable * 0.05).toFixed(2)) : 0;

    if (tipo === 'FESP') {
      advertencias.push(`FACTURA ESPECIAL: Retener IVA Q${ivaCredito.toFixed(2)} + ISR Q${isrRetencion.toFixed(2)}`);
    }
    if (afiliacion === 'PEQ') {
      advertencias.push('Pequeño Contribuyente: IVA NO genera crédito fiscal');
    }
    if (granTotal > 50000) {
      advertencias.push(`Monto alto Q${granTotal.toFixed(2)}: Verificar retención ISR`);
    }

    // Classification
    const classification = classifyByName(emisorNombre, granTotal);

    // Check duplicate
    const isDuplicate = existingUuids.has(uuid);
    if (isDuplicate) errores.push('UUID duplicado: esta factura ya fue cargada');
    if (!isDuplicate) existingUuids.add(uuid);

    return {
      id,
      filename,
      uuid,
      serie,
      numero,
      tipo,
      fecha,
      emisorNit,
      emisorNombre,
      granTotal,
      ivaCredito,
      baseGravable,
      isrRetencion,
      aplicaRetencionISR,
      emisorAfiliacion: afiliacion,
      cuentaSugerida: classification.name,
      cuentaCodigo: classification.code,
      confianza: classification.confidence,
      estado: isDuplicate ? 'duplicate' : (errores.length > 0 ? 'error' : (advertencias.length > 0 ? 'warning' : 'ok')),
      advertencias,
      errores,
    };
  } catch (err) {
    errores.push(`Error parsing XML: ${err instanceof Error ? err.message : String(err)}`);
    return {
      id,
      filename,
      uuid: `ERROR-${id}`,
      serie: '', numero: '', tipo: 'FACT', fecha: '',
      emisorNit: '', emisorNombre: '', granTotal: 0, ivaCredito: 0,
      baseGravable: 0, isrRetencion: 0, aplicaRetencionISR: false,
      emisorAfiliacion: 'GEN', cuentaSugerida: 'Error', cuentaCodigo: '0000',
      confianza: 0, estado: 'error', advertencias: [], errores,
    };
  }
}

async function parseXmlFile(file: File, existingUuids: Set<string>): Promise<ParsedDoc> {
  const content = await file.text();
  return parseXmlContent(content, file.name, existingUuids);
}

export default function FELPage() {
  const [docs, setDocs] = useState<ParsedDoc[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedDoc, setSelectedDoc] = useState<ParsedDoc | null>(null);
  const [filter, setFilter] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uuidsRef = useRef(new Set<string>());

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    const xmlFiles: Array<{ name: string; content: string }> = [];

    setIsProcessing(true);
    setProgress(0);

    try {
      for (const file of fileList) {
        if (file.name.endsWith('.xml')) {
          const text = await file.text();
          xmlFiles.push({ name: file.name, content: text });
        } else if (file.name.endsWith('.zip')) {
          // Decompress zip file client-side
          const zip = await JSZip.loadAsync(file);
          const zipEntries = Object.keys(zip.files).filter(name => name.endsWith('.xml'));
          
          for (const entryName of zipEntries) {
            const xmlContent = await zip.files[entryName].async('text');
            // Extract filename from entry
            const name = entryName.split('/').pop() || entryName;
            xmlFiles.push({ name, content: xmlContent });
          }
        }
      }

      if (xmlFiles.length === 0) {
        setIsProcessing(false);
        return;
      }

      const results: ParsedDoc[] = [];
      for (let i = 0; i < xmlFiles.length; i++) {
        const result = await parseXmlContent(xmlFiles[i].content, xmlFiles[i].name, uuidsRef.current);
        results.push(result);
        setProgress(Math.round(((i + 1) / xmlFiles.length) * 100));
        await new Promise((r) => setTimeout(r, 20));
      }

      setDocs((prev) => [...results, ...prev]);
    } catch (e) {
      console.error('Error unpacking or parsing uploads:', e);
      alert('Ocurrió un error leyendo o descomprimiendo el archivo. Por favor verifica que el archivo .zip sea válido.');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // Summary stats
  const totalIVA = docs.filter((d) => d.estado !== 'error' && d.estado !== 'duplicate').reduce((s, d) => s + d.ivaCredito, 0);
  const totalBase = docs.filter((d) => d.estado !== 'error' && d.estado !== 'duplicate').reduce((s, d) => s + d.baseGravable, 0);
  const totalRetISR = docs.filter((d) => d.aplicaRetencionISR).reduce((s, d) => s + d.isrRetencion, 0);
  const withWarnings = docs.filter((d) => d.advertencias.length > 0).length;
  const withErrors = docs.filter((d) => d.estado === 'error').length;

  const filtered = docs.filter((d) =>
    !filter ||
    d.emisorNombre.toLowerCase().includes(filter.toLowerCase()) ||
    d.emisorNit.toLowerCase().includes(filter.toLowerCase()) ||
    d.uuid.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Carga de Facturas FEL</div>
          <div className="topbar-breadcrumb">
            <span>ContaGT</span> <span>›</span> <span style={{ color: 'var(--color-text-secondary)' }}>FEL Import</span>
          </div>
        </div>
        <div className="topbar-actions">
          {docs.length > 0 && (
            <>
              <a href="/dashboard/compras" className="btn btn-secondary btn-sm">
                📗 Ver Libro Compras
              </a>
              <button
                id="btn-contabilizar"
                className="btn btn-primary btn-sm"
                onClick={() => alert('✅ Documentos enviados a contabilidad. Ver en Libro de Compras.')}
              >
                📚 Contabilizar todos
              </button>
            </>
          )}
        </div>
      </div>

      <div className="page-content">
        {/* DROPZONE */}
        <div
          id="fel-dropzone"
          className={`dropzone ${isDragging ? 'active' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => fileInputRef.current?.click()}
          style={{ marginBottom: 24, cursor: 'pointer' }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xml,.zip"
            multiple
            style={{ display: 'none' }}
            id="fel-file-input"
            onChange={(e) => e.target.files && processFiles(e.target.files)}
          />

          {isProcessing ? (
            <div>
              <span className="dropzone-icon">⚙️</span>
              <div className="dropzone-title">Procesando facturas FEL...</div>
              <div style={{ maxWidth: 300, margin: '16px auto 0' }}>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <div className="text-sm text-muted" style={{ textAlign: 'center', marginTop: 8 }}>
                  {progress}%
                </div>
              </div>
            </div>
          ) : (
            <div>
              <span className="dropzone-icon">📁</span>
              <div className="dropzone-title">
                {isDragging ? 'Suelte los archivos XML o ZIP aquí' : 'Arrastre y suelte archivos XML o ZIP con facturas FEL'}
              </div>
              <div className="dropzone-sub" style={{ marginTop: 8 }}>
                O haga clic para seleccionar archivos • Soporta carga de archivos .zip y múltiples XMLs
              </div>
              <div className="dropzone-sub" style={{ marginTop: 6 }}>
                Tipos soportados: XML individuales, **ZIP comprimidos**, FACT, FESP, NCRE
              </div>
            </div>
          )}
        </div>

        {/* DEMO BUTTON */}
        {docs.length === 0 && !isProcessing && (
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <button
              id="btn-demo-data"
              className="btn btn-secondary"
              onClick={() => {
                const demoDocs: ParsedDoc[] = [
                  { id: '1', filename: 'factura_energuate.xml', uuid: 'UUID-001-ENERGUATE', serie: 'A', numero: '00001245', tipo: 'FACT', fecha: '2025-07-20', emisorNit: '1234567-8', emisorNombre: 'ENERGUATE S.A.', granTotal: 1284.50, ivaCredito: 137.65, baseGravable: 1146.85, isrRetencion: 0, aplicaRetencionISR: false, emisorAfiliacion: 'GEN', cuentaSugerida: 'Energía Eléctrica', cuentaCodigo: '5102', confianza: 95, estado: 'ok', advertencias: [], errores: [] },
                  { id: '2', filename: 'factura_claro.xml', uuid: 'UUID-002-CLARO', serie: 'B', numero: '00005821', tipo: 'FACT', fecha: '2025-07-20', emisorNit: '8765432-1', emisorNombre: 'CLARO GUATEMALA S.A.', granTotal: 450.00, ivaCredito: 48.21, baseGravable: 401.79, isrRetencion: 0, aplicaRetencionISR: false, emisorAfiliacion: 'GEN', cuentaSugerida: 'Teléfono y Comunicaciones', cuentaCodigo: '5104', confianza: 90, estado: 'ok', advertencias: [], errores: [] },
                  { id: '3', filename: 'factura_especial_lopez.xml', uuid: 'UUID-003-FESP', serie: 'FESP', numero: '00000087', tipo: 'FESP', fecha: '2025-07-19', emisorNit: '5432109-8', emisorNombre: 'MARIO ENRIQUE LOPEZ GARCIA', granTotal: 8500.00, ivaCredito: 910.71, baseGravable: 7589.29, isrRetencion: 379.46, aplicaRetencionISR: true, emisorAfiliacion: 'GEN', cuentaSugerida: 'Honorarios Profesionales', cuentaCodigo: '5601', confianza: 70, estado: 'warning', advertencias: ['FACTURA ESPECIAL: Retener IVA Q910.71 + ISR Q379.46', 'Pago neto al proveedor: Q7,209.83'], errores: [] },
                  { id: '4', filename: 'factura_puma.xml', uuid: 'UUID-004-PUMA', serie: 'C', numero: '00012458', tipo: 'FACT', fecha: '2025-07-19', emisorNit: '2345678-9', emisorNombre: 'PUMA ENERGY GUATEMALA S.A.', granTotal: 3200.00, ivaCredito: 342.86, baseGravable: 2857.14, isrRetencion: 0, aplicaRetencionISR: false, emisorAfiliacion: 'GEN', cuentaSugerida: 'Combustibles', cuentaCodigo: '5201', confianza: 95, estado: 'ok', advertencias: [], errores: [] },
                  { id: '5', filename: 'factura_pequeno.xml', uuid: 'UUID-005-FPEQ', serie: 'P', numero: '00000542', tipo: 'FPEQ', fecha: '2025-07-18', emisorNit: '9876543-2', emisorNombre: 'TIENDA EL PROGRESO (PEQ)', granTotal: 125.00, ivaCredito: 0, baseGravable: 125.00, isrRetencion: 0, aplicaRetencionISR: false, emisorAfiliacion: 'PEQ', cuentaSugerida: 'Gastos Generales', cuentaCodigo: '5001', confianza: 30, estado: 'warning', advertencias: ['Pequeño Contribuyente: IVA NO genera crédito fiscal'], errores: [] },
                  { id: '6', filename: 'factura_alta.xml', uuid: 'UUID-006-ALTA', serie: 'D', numero: '00000021', tipo: 'FACT', fecha: '2025-07-17', emisorNit: '3456789-0', emisorNombre: 'MAQUINARIA INDUSTRIAL S.A.', granTotal: 85000.00, ivaCredito: 9107.14, baseGravable: 75892.86, isrRetencion: 0, aplicaRetencionISR: false, emisorAfiliacion: 'GEN', cuentaSugerida: 'Por Clasificar (Monto Alto)', cuentaCodigo: '5999', confianza: 40, estado: 'warning', advertencias: ['Monto alto Q85000.00: Verificar retención ISR según régimen del proveedor'], errores: [] },
                ];
                demoDocs.forEach((d) => uuidsRef.current.add(d.uuid));
                setDocs(demoDocs);
              }}
            >
              🎯 Cargar datos de demostración
            </button>
            <p className="text-muted text-sm" style={{ marginTop: 8 }}>
              Para probar el sistema sin archivos XML reales
            </p>
          </div>
        )}

        {/* SUMMARY STATS */}
        {docs.length > 0 && (
          <div className="kpi-grid animate-stagger" style={{ marginBottom: 20 }}>
            <div className="kpi-card primary">
              <div className="kpi-label">Documentos cargados</div>
              <div className="kpi-value">{docs.length}</div>
              <div className="kpi-sub">{docs.filter((d) => d.estado === 'ok').length} OK · {withWarnings} con alertas · {withErrors} errores</div>
            </div>
            <div className="kpi-card success">
              <div className="kpi-label">Total Base Gravable</div>
              <div className="kpi-value mono" style={{ fontSize: '1.3rem' }}>{formatQ(totalBase)}</div>
            </div>
            <div className="kpi-card success">
              <div className="kpi-label">IVA Crédito Fiscal</div>
              <div className="kpi-value mono" style={{ fontSize: '1.3rem' }}>{formatQ(totalIVA)}</div>
            </div>
            <div className="kpi-card warning">
              <div className="kpi-label">ISR Retenciones (FESP)</div>
              <div className="kpi-value mono" style={{ fontSize: '1.3rem' }}>{formatQ(totalRetISR)}</div>
            </div>
          </div>
        )}

        {/* TABLE */}
        {docs.length > 0 && (
          <div className="card" id="fel-documents-table">
            <div className="card-header" style={{ padding: '20px 24px 12px' }}>
              <div className="card-title">Documentos FEL procesados</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  id="filter-fel"
                  type="text"
                  className="form-input"
                  placeholder="Buscar por emisor, NIT, UUID..."
                  style={{ width: 260 }}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setDocs([]); uuidsRef.current.clear(); setFilter(''); }}
                  id="btn-clear"
                >
                  🗑 Limpiar
                </button>
              </div>
            </div>
            <div className="table-wrapper" style={{ margin: '0 0 0 0', borderRadius: '0 0 16px 16px', border: 'none', borderTop: '1px solid var(--color-border)' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Emisor</th>
                    <th>NIT</th>
                    <th>Tipo</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ textAlign: 'right' }}>IVA</th>
                    <th style={{ textAlign: 'right' }}>ISR Ret.</th>
                    <th>Cuenta sugerida</th>
                    <th>Confianza</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((doc) => (
                    <tr key={doc.id} style={{ opacity: doc.estado === 'error' || doc.estado === 'duplicate' ? 0.6 : 1 }}>
                      <td className="muted" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{doc.fecha}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', maxWidth: 200 }}>{doc.emisorNombre}</div>
                        <div className="text-xs text-muted">{doc.filename}</div>
                      </td>
                      <td className="mono muted" style={{ fontSize: '0.75rem' }}>{doc.emisorNit}</td>
                      <td>{getTipoBadge(doc.tipo)}</td>
                      <td className="amount">{formatQ(doc.granTotal)}</td>
                      <td className="amount" style={{ color: 'var(--color-primary)' }}>
                        {doc.ivaCredito > 0 ? formatQ(doc.ivaCredito) : <span className="text-muted">—</span>}
                      </td>
                      <td className="amount" style={{ color: 'var(--color-warning)' }}>
                        {doc.isrRetencion > 0 ? formatQ(doc.isrRetencion) : <span className="text-muted">—</span>}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.78rem' }}>
                          <span className="text-muted">{doc.cuentaCodigo}</span>{' '}
                          {doc.cuentaSugerida}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 40, height: 4, background: 'var(--color-surface-3)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${doc.confianza}%`, height: '100%', background: getConfianzaColor(doc.confianza), borderRadius: 2, transition: 'width 0.3s' }} />
                          </div>
                          <span style={{ fontSize: '0.72rem', color: getConfianzaColor(doc.confianza), fontWeight: 700 }}>{doc.confianza}%</span>
                        </div>
                      </td>
                      <td>{getEstadoBadge(doc.estado, doc.advertencias)}</td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setSelectedDoc(doc)}
                          id={`btn-detail-${doc.id}`}
                        >
                          👁
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {selectedDoc && (
        <div className="modal-overlay" onClick={() => setSelectedDoc(null)} id="detail-modal">
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">{selectedDoc.emisorNombre}</div>
                <div className="text-muted text-sm" style={{ fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {selectedDoc.uuid}
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSelectedDoc(null)}
                id="btn-close-modal"
              >✕</button>
            </div>
            <div className="modal-body">
              <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
                {[
                  { label: 'Fecha', value: selectedDoc.fecha },
                  { label: 'Serie / Número', value: `${selectedDoc.serie}-${selectedDoc.numero}` },
                  { label: 'NIT Emisor', value: selectedDoc.emisorNit },
                  { label: 'Tipo de documento', value: selectedDoc.tipo },
                  { label: 'Gran Total', value: formatQ(selectedDoc.granTotal) },
                  { label: 'Base Gravable', value: formatQ(selectedDoc.baseGravable) },
                  { label: 'IVA Crédito Fiscal', value: formatQ(selectedDoc.ivaCredito) },
                  { label: 'Afiliación IVA emisor', value: selectedDoc.emisorAfiliacion },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: 'var(--color-surface-2)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <div className="text-xs text-muted" style={{ marginBottom: 2 }}>{label}</div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>{value}</div>
                  </div>
                ))}
              </div>

              {selectedDoc.aplicaRetencionISR && (
                <div className="alert alert-warning" style={{ marginBottom: 12 }}>
                  <span>🧾</span>
                  <div>
                    <strong>Factura Especial — Retenciones a aplicar:</strong>
                    <ul style={{ marginTop: 6, paddingLeft: 16, fontSize: '0.85rem' }}>
                      <li>IVA retenido: <strong>{formatQ(selectedDoc.ivaCredito)}</strong></li>
                      <li>ISR retenido (5%): <strong>{formatQ(selectedDoc.isrRetencion)}</strong></li>
                      <li>Pago neto al proveedor: <strong>{formatQ(selectedDoc.granTotal - selectedDoc.ivaCredito - selectedDoc.isrRetencion)}</strong></li>
                    </ul>
                  </div>
                </div>
              )}

              {selectedDoc.advertencias.length > 0 && (
                <div>
                  <div className="form-label" style={{ marginBottom: 8 }}>⚠️ Advertencias</div>
                  {selectedDoc.advertencias.map((w, i) => (
                    <div key={i} className="alert alert-warning" style={{ marginBottom: 6 }}>
                      <span>⚠</span><span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="divider" />
              <div>
                <div className="form-label" style={{ marginBottom: 8 }}>📊 Cuenta Contable Sugerida</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--color-primary-dim)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <span style={{ fontSize: '1.5rem' }}>📂</span>
                  <div>
                    <div style={{ fontWeight: 700 }}>{selectedDoc.cuentaCodigo} — {selectedDoc.cuentaSugerida}</div>
                    <div className="text-xs text-muted">Confianza: {selectedDoc.confianza}% · Regla: keyword match</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedDoc(null)}>Cerrar</button>
              <button className="btn btn-primary" id="btn-contabilizar-single">📚 Contabilizar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
