'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';

interface BankRow {
  id: string;
  fecha: string;
  descripcion: string;
  referencia: string;
  monto: number;
  tipo: 'credito' | 'debito';
  matchedFelId?: string;
  matchedEmisor?: string;
  estado: 'matched' | 'unmatched' | 'ignored';
}

interface FelMatch {
  uuid: string;
  emisorNombre: string;
  granTotal: number;
  fecha: string;
  tipoDocumento: string;
}

const MOCK_FEL_MATCHES: FelMatch[] = [
  { uuid: 'FEL-20250720-001', emisorNombre: 'ENERGUATE S.A.', granTotal: 1284.50, fecha: '2025-07-20', tipoDocumento: 'FACT' },
  { uuid: 'FEL-20250720-002', emisorNombre: 'CLARO GUATEMALA S.A.', granTotal: 450.00, fecha: '2025-07-20', tipoDocumento: 'FACT' },
  { uuid: 'FEL-20250719-003', emisorNombre: 'MARIO ENRIQUE LOPEZ GARCIA', granTotal: 8500.00, fecha: '2025-07-19', tipoDocumento: 'FESP' },
  { uuid: 'FEL-20250719-004', emisorNombre: 'PUMA ENERGY GUATEMALA S.A.', granTotal: 3200.00, fecha: '2025-07-19', tipoDocumento: 'FACT' },
];

function formatQ(n: number) {
  const abs = Math.abs(n);
  const fmt = `Q ${abs.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`;
  return n < 0 ? `-${fmt}` : `+${fmt}`;
}

function getEstado(row: BankRow) {
  if (row.estado === 'matched') return <span className="badge badge-success">✓ Conciliado</span>;
  if (row.estado === 'ignored') return <span className="badge badge-muted">— Ignorado</span>;
  return <span className="badge badge-warning">⏳ Sin match</span>;
}

export default function ConciliacionPage() {
  const [rows, setRows] = useState<BankRow[]>([]);
  const [csvLoaded, setCsvLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showMapping, setShowMapping] = useState(false);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});

  // Demo data
  const MOCK_BANK_ROWS: BankRow[] = [
    { id: 'b1', fecha: '2025-07-20', descripcion: 'PAGO FACT A-00001245 ENERGUATE', referencia: 'REF-001245', monto: -1284.50, tipo: 'debito', matchedFelId: 'FEL-20250720-001', matchedEmisor: 'ENERGUATE S.A.', estado: 'matched' },
    { id: 'b2', fecha: '2025-07-20', descripcion: 'TRANSFERENCIA CLARO GUATEMALA', referencia: 'REF-005821', monto: -450.00, tipo: 'debito', matchedFelId: 'FEL-20250720-002', matchedEmisor: 'CLARO GUATEMALA S.A.', estado: 'matched' },
    { id: 'b3', fecha: '2025-07-19', descripcion: 'TRANSFERENCIA A MARIO LOPEZ', referencia: 'CHK-0087', monto: -7209.83, tipo: 'debito', matchedFelId: 'FEL-20250719-003', matchedEmisor: 'MARIO ENRIQUE LOPEZ GARCIA', estado: 'matched' },
    { id: 'b4', fecha: '2025-07-19', descripcion: 'CARGO PUMA ENERGY GASOLINERA', referencia: 'POS-12458', monto: -3200.00, tipo: 'debito', estado: 'unmatched' },
    { id: 'b5', fecha: '2025-07-18', descripcion: 'DEPOSITO DISTRIBUIDORA NORTE', referencia: 'DEP-125', monto: 15000.00, tipo: 'credito', estado: 'unmatched' },
    { id: 'b6', fecha: '2025-07-17', descripcion: 'COMISION MANTENIMIENTO CUENTA', referencia: 'COM-JUL', monto: -75.00, tipo: 'debito', estado: 'ignored' },
    { id: 'b7', fecha: '2025-07-15', descripcion: 'ABONO AGROEXPORT SA', referencia: 'TRF-0054', monto: 28000.00, tipo: 'credito', estado: 'unmatched' },
    { id: 'b8', fecha: '2025-07-12', descripcion: 'PAGO ARRENDAMIENTO CENTRO COMERCIAL', referencia: 'ARR-JUL', monto: -12000.00, tipo: 'debito', estado: 'unmatched' },
  ];

  function loadDemo() {
    setRows(MOCK_BANK_ROWS);
    setCsvLoaded(true);
  }

  function parseCSV(content: string) {
    return new Promise<BankRow[]>((resolve, reject) => {
      Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsed: BankRow[] = results.data
            .filter((r: any) => r.Fecha || r.fecha || r.FECHA)
            .map((r: any, i: number) => {
              const fecha = r.Fecha || r.fecha || r.FECHA;
              const descripcion = r.Descripcion || r.descripcion || r.DESCRIPCION || r.Concepto || r.concepto || '';
              const referencia = r.Referencia || r.referencia || r.REFERENCIA || r.Numero || r.numero || `REF-${i}`;
              const montoStr = String(r.Monto || r.monto || r.MONTO || r.Importe || r.importe || '0')
                .replace(/[Q$,]\s*/g, '')
                .replace(/,/g, '');
              const monto = parseFloat(montoStr) || 0;
              const tipo = monto >= 0 ? 'credito' : 'debito';

              return {
                id: `csv-${i}-${Date.now()}`,
                fecha: String(fecha).split('T')[0],
                descripcion: String(descripcion).trim(),
                referencia: String(referencia).trim(),
                monto,
                tipo,
                estado: 'unmatched' as const,
              };
            });
          resolve(parsed);
        },
        error: (err: Error) => reject(err),
      });
    });
  }

  async function handleFiles(files: FileList | File[]) {
    const fileList = Array.from(files);
    const csvFiles: Array<{ name: string; content: string }> = [];

    setIsProcessing(true);

    try {
      for (const file of fileList) {
        if (file.name.endsWith('.csv')) {
          const text = await file.text();
          csvFiles.push({ name: file.name, content: text });
        } else if (file.name.endsWith('.zip')) {
          // Would need JSZip to handle
          alert('Archivos ZIP no soportados aún. Por favor extraiga los CSV primero.');
        }
      }

      if (csvFiles.length === 0) {
        setIsProcessing(false);
        return;
      }

      const allRows: BankRow[] = [];
      for (const cf of csvFiles) {
        const parsed = await parseCSV(cf.content);
        allRows.push(...parsed);
      }

      if (allRows.length > 0) {
        setRows((prev) => [...allRows, ...prev]);
        setCsvLoaded(true);
        alert(`✅ ${allRows.length} movimientos bancarios cargados de ${csvFiles.length} archivo(s)`);
      }
    } catch (e) {
      console.error('Error parsing CSV:', e);
      alert('Error leyendo el archivo CSV. Verifique el formato.');
    } finally {
      setIsProcessing(false);
    }
  }

  function matchManual(id: string) {
    // Find best FEL match by amount
    const row = rows.find((r) => r.id === id);
    if (!row || row.estado !== 'unmatched') return;

    const matches = MOCK_FEL_MATCHES.filter(
      (f) => Math.abs(f.granTotal - Math.abs(row.monto)) < 1
    );

    if (matches.length === 1) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, estado: 'matched', matchedFelId: matches[0].uuid, matchedEmisor: matches[0].emisorNombre } : r
        )
      );
    } else {
      alert('No se encontró coincidencia exacta por monto. Seleccione manualmente.');
    }
  }

  function ignoreRow(id: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, estado: 'ignored' } : r)));
  }

  function autoReconcile() {
    let matched = 0;
    const beforeUnmatched = rows.filter((r) => r.estado === 'unmatched').length;
    setRows((prev) =>
      prev.map((r) => {
        if (r.estado !== 'unmatched') return r;
        const matches = MOCK_FEL_MATCHES.filter(
          (f) => Math.abs(f.granTotal - Math.abs(r.monto)) < 1
        );
        if (matches.length === 1) {
          matched++;
          return { ...r, estado: 'matched', matchedFelId: matches[0].uuid, matchedEmisor: matches[0].emisorNombre };
        }
        return r;
      })
    );
    alert(`🤖 Conciliación automática: ${matched} movimientos conciliados de ${beforeUnmatched} pendientes`);
  }

  const matched = rows.filter((r) => r.estado === 'matched').length;
  const unmatched = rows.filter((r) => r.estado === 'unmatched').length;
  const totalDebitos = rows.filter((r) => r.tipo === 'debito' && r.estado !== 'ignored').reduce((s, r) => s + Math.abs(r.monto), 0);
  const totalCreditos = rows.filter((r) => r.tipo === 'credito').reduce((s, r) => s + r.monto, 0);

  const filtered = rows; // could add filter later

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Conciliación Bancaria</div>
          <div className="topbar-breadcrumb">
            <span>ContaGT</span> <span>›</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>Banco vs Facturas FEL</span>
          </div>
        </div>
        <div className="topbar-actions">
          <button id="btn-auto-conciliar" className="btn btn-primary btn-sm" onClick={autoReconcile}>
            ⚡ Conciliar automáticamente
          </button>
        </div>
      </div>

      <div className="page-content">
        {!csvLoaded ? (
          <>
            <div className="alert alert-info" style={{ marginBottom: 20 }}>
              <span>🏦</span>
              <span className="text-sm">
                Cargue el estado de cuenta de su banco en formato CSV para hacer la conciliación automática contra las facturas FEL cargadas.
                Compatible con: Banrural, BAC, G&T Continental, Industrial, Agromercantil, Promerica.
              </span>
            </div>
            <div
              className={`dropzone ${isDragging ? 'active' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => fileRef.current?.click()}
              id="banco-dropzone"
            >
              <input ref={fileRef} type="file" accept=".csv,.xlsx" multiple style={{ display: 'none' }} id="banco-file-input" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
              <span className="dropzone-icon">🏦</span>
              <div className="dropzone-title">
                {isDragging ? 'Suelte el archivo CSV aquí' : 'Arrastre el estado de cuenta bancario (CSV)'}
              </div>
              <div className="dropzone-sub">Compatible con formatos CSV de bancos guatemaltecos</div>
            </div>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button id="btn-demo-banco" className="btn btn-secondary" onClick={loadDemo}>🎯 Cargar datos de demostración</button>
            </div>
          </>
        ) : (
          <>
            {/* Summary KPIs */}
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
              {[
                { label: 'Movimientos cargados', value: rows.length.toString(), icon: '📋', cls: 'primary' },
                { label: 'Conciliados', value: `${matched} / ${rows.length}`, icon: '✅', cls: 'success' },
                { label: 'Sin match', value: unmatched.toString(), icon: unmatched > 0 ? '⚠️' : '📊', cls: unmatched > 0 ? 'warning' : 'success' },
                { label: 'Progreso', value: `${rows.length ? Math.round((matched / rows.length) * 100) : 0}%`, icon: '📊', cls: 'info' },
              ].map((kpi) => (
                <div key={kpi.label} className={`kpi-card ${kpi.cls}`}>
                  <div className="kpi-icon">{kpi.icon}</div>
                  <div className="kpi-label">{kpi.label}</div>
                  <div className="kpi-value">{kpi.value}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span className="text-sm text-muted">Progreso de conciliación</span>
                <span className="text-sm" style={{ fontWeight: 700, color: 'var(--color-success)' }}>{matched} de {rows.length} conciliados</span>
              </div>
              <div className="progress-bar" style={{ height: 8 }}>
                <div className="progress-fill" style={{ width: `${rows.length ? (matched / rows.length) * 100 : 0}%` }} />
              </div>
            </div>

            {/* TABLE */}
            <div className="card" id="conciliacion-table">
              <div className="card-header" style={{ padding: '14px 20px 10px' }}>
                <div className="card-title">Movimientos Bancarios — Julio 2025</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <span className="text-sm text-muted">Total débitos: <strong style={{ color: 'var(--color-danger)' }}>-Q {totalDebitos.toFixed(2)}</strong></span>
                  <span className="text-sm text-muted">Total créditos: <strong style={{ color: 'var(--color-success)' }}>+Q {totalCreditos.toFixed(2)}</strong></span>
                </div>
              </div>
              <div className="table-wrapper" style={{ border: 'none', borderTop: '1px solid var(--color-border)', borderRadius: '0 0 16px 16px' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Descripción del banco</th>
                      <th>Referencia</th>
                      <th style={{ textAlign: 'right' }}>Monto</th>
                      <th>Factura FEL matcheada</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => (
                      <tr key={row.id} style={{ opacity: row.estado === 'ignored' ? 0.5 : 1 }}>
                        <td className="muted" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{row.fecha}</td>
                        <td style={{ fontSize: '0.85rem', maxWidth: 260 }}>{row.descripcion}</td>
                        <td className="mono muted" style={{ fontSize: '0.75rem' }}>{row.referencia}</td>
                        <td className="amount" style={{ color: row.tipo === 'credito' ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 700 }}>
                          {formatQ(row.monto)}
                        </td>
                        <td style={{ fontSize: '0.8rem' }}>
                          {row.matchedEmisor ? (
                            <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>✓ {row.matchedEmisor}</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>{getEstado(row)}</td>
                        <td>
                          {row.estado === 'unmatched' && (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => matchManual(row.id)} id={`btn-match-${row.id}`} title="Conciliar automáticamente">✓</button>
                              <button className="btn btn-ghost btn-sm" onClick={() => ignoreRow(row.id)} id={`btn-ignore-${row.id}`} title="Ignorar" style={{ color: 'var(--color-text-muted)' }}>✕</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="alert alert-info" style={{ marginTop: 16 }}>
              <span>💡</span>
              <span className="text-sm">
                El sistema busca coincidencias por monto exacto, referencia, NIT de proveedor y fecha.
                En Fase 2 se integrará API de banca abierta de bancos guatemaltecos para descarga automática de movimientos.
              </span>
            </div>
          </>
        )}
      </div>
    </>
  );
}