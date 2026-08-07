'use client';

import { useState, useEffect } from 'react';

interface PurchaseRow {
  fecha: string;
  serie: string;
  numero: string;
  nitProveedor: string;
  nombreProveedor: string;
  tipoDocumento: string;
  total: number;
  baseGravable: number;
  ivaCredito: number;
  isrRetencion: number;
  estado: string;
  tipoGiro: 'BIEN' | 'SERVICIO' | 'COMBUSTIBLE';
  codigoSAT: string;
  descripcionSAT: string;
  resumenCorto: string;
  isMixed: boolean;
  mixedReason: string;
  isDeductible: boolean;
}

export default function ComprasPage() {
  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'todos' | 'mixed' | 'anulados'>('todos');

  useEffect(() => {
    fetch('/api/export/excel?format=json')
      .then((res) => res.json())
      .then((data) => {
        if (data.rows) setRows(data.rows);
        setLoading(false);
      });
  }, []);

  function formatQ(n: number): string {
    return `Q ${n.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Filter logic
  const filtered = rows.filter((r) => {
    const matchesSearch =
      r.nombreProveedor.toLowerCase().includes(filter.toLowerCase()) ||
      r.nitProveedor.toLowerCase().includes(filter.toLowerCase()) ||
      r.codigoSAT.includes(filter);

    if (!matchesSearch) return false;

    if (activeTab === 'mixed') return r.isMixed;
    if (activeTab === 'anulados') return r.estado === 'anulado';
    return true;
  });

  // Calculate totals
  const totals = filtered.reduce(
    (acc, r) => ({
      total: acc.total + r.total,
      base: acc.base + r.baseGravable,
      iva: acc.iva + r.ivaCredito,
      isr: acc.isr + r.isrRetencion,
    }),
    { total: 0, base: 0, iva: 0, isr: 0 }
  );

  // Group by SAT Code
  const groupedCodes: Record<string, { name: string; sum: number }> = {};
  filtered.forEach((r) => {
    if (r.estado === 'anulado') return;
    if (!groupedCodes[r.codigoSAT]) {
      groupedCodes[r.codigoSAT] = { name: r.descripcionSAT, sum: 0 };
    }
    groupedCodes[r.codigoSAT].sum += r.baseGravable;
  });

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Libro de Compras Inteligente</div>
          <div className="topbar-breadcrumb">
            <span>ContaGT</span> <span>›</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>Nicho: Publicidad (Giro de Empresa)</span>
          </div>
        </div>
        <div className="topbar-actions">
          <a
            href="/api/export/excel?format=xlsx"
            download
            className="btn btn-success btn-sm"
            id="export-xlsx-button"
          >
            📊 Descargar Excel Configurado (Color & Fórmulas)
          </a>
          <a
            href="/api/libros/compras/pdf?format=pdf&mes={new Date().getMonth()+1}&año={new Date().getFullYear()}"
            target="_blank"
            className="btn btn-primary btn-sm"
            id="export-pdf-button"
          >
            📄 Generar PDF / Imprimir
          </a>
        </div>
      </div>

      <div className="page-content">
        <div className="alert alert-info mb-4" style={{ marginBottom: 20 }}>
          <span>💡</span>
          <div className="text-sm">
            <strong>Giro de Empresa: Publicidad.</strong> El sistema clasifica automáticamente los movimientos en <strong>BIEN</strong>, <strong>SERVICIO</strong> o <strong>COMBUSTIBLE</strong>.
            Filtra y etiqueta como <em>no deducibles</em> (naranja) los consumos no afines al giro de publicidad (ej: bebidas no alcohólicas directas, almuerzos generales), y marca en <strong>rojo</strong> las facturas mezcladas.
          </div>
        </div>

        {/* STATS */}
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 20 }}>
          {[
            { label: 'Facturas', value: filtered.length.toString(), icon: '📄', cls: 'primary' },
            { label: 'Total Compras', value: formatQ(totals.total), icon: '🛒', cls: 'primary' },
            { label: 'Base Gravable', value: formatQ(totals.base), icon: '💼', cls: 'success' },
            { label: 'IVA Crédito', value: formatQ(totals.iva), icon: '💳', cls: 'success' },
            { label: 'Retenciones ISR', value: formatQ(totals.isr), icon: '🏛️', cls: 'warning' },
          ].map((kpi, idx) => (
            <div key={idx} className={`kpi-card ${kpi.cls}`}>
              <div className="kpi-icon">{kpi.icon}</div>
              <div className="kpi-label">{kpi.label}</div>
              <div className="kpi-value mono" style={{ fontSize: '1.15rem' }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* TABS & SEARCH */}
        <div className="filters-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="tab-nav" style={{ margin: 0, border: 'none' }}>
            <button className={`tab-btn ${activeTab === 'todos' ? 'active' : ''}`} onClick={() => setActiveTab('todos')}>Todos</button>
            <button className={`tab-btn ${activeTab === 'mixed' ? 'active' : ''}`} onClick={() => setActiveTab('mixed')}>
              ⚠️ Mezcladas ({rows.filter(r => r.isMixed).length})
            </button>
            <button className={`tab-btn ${activeTab === 'anulados' ? 'active' : ''}`} onClick={() => setActiveTab('anulados')}>
              Anuladas ({rows.filter(r => r.estado === 'anulado').length})
            </button>
          </div>
          <input
            type="text"
            className="form-input filter-input"
            placeholder="Buscar por NIT, Proveedor, Código..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ maxWidth: 300 }}
          />
        </div>

        {/* MAIN TABLE */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Documento</th>
                    <th>NIT Proveedor</th>
                    <th>Proveedor</th>
                    <th>Giro (SAT)</th>
                    <th>Descripción</th>
                    <th>Código SAT</th>
                    <th>Deducible?</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ textAlign: 'right' }}>IVA</th>
                    <th style={{ textAlign: 'right' }}>Base</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, idx) => {
                    const isCancelled = row.estado === 'anulado';
                    const isMixed = row.isMixed;
                    const isNonDeductible = !row.isDeductible && !isCancelled;

                    // Styles mimicking the Excel sheet colors
                    let bgColor = '';
                    let color = '';
                    if (isCancelled) {
                      bgColor = 'rgba(243, 244, 246, 0.5)';
                      color = '#9CA3AF';
                    } else if (isMixed) {
                      bgColor = 'rgba(254, 226, 226, 0.8)';
                      color = '#991B1B';
                    } else if (isNonDeductible) {
                      bgColor = 'rgba(254, 243, 199, 0.8)';
                      color = '#D97706';
                    }

                    return (
                      <tr key={idx} style={{ backgroundColor: bgColor, color }}>
                        <td className="muted" style={{ whiteSpace: 'nowrap' }}>{row.fecha}</td>
                        <td className="mono">{row.serie}-{row.numero}</td>
                        <td className="mono">{row.nitProveedor}</td>
                        <td style={{ fontWeight: 600 }}>
                          {row.nombreProveedor}
                          {isCancelled && <div style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>ANULADA</div>}
                          {isMixed && <div style={{ fontSize: '0.7rem', color: '#B91C1C' }}>{row.mixedReason}</div>}
                        </td>
                        <td>
                          <span className={`badge ${row.tipoGiro === 'COMBUSTIBLE' ? 'badge-warning' : row.tipoGiro === 'SERVICIO' ? 'badge-primary' : 'badge-success'}`}>
                            {row.tipoGiro}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.78rem' }}>{row.resumenCorto}</td>
                        <td className="mono font-bold">{row.codigoSAT}</td>
                        <td className="font-bold">{row.isDeductible ? 'SÍ' : 'NO'}</td>
                        <td className="amount">{formatQ(row.total)}</td>
                        <td className="amount">{formatQ(row.ivaCredito)}</td>
                        <td className="amount" style={{ fontWeight: 'bold' }}>{formatQ(row.baseGravable)}</td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => alert(JSON.stringify(row, null, 2))}>👁</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--color-surface-2)', fontWeight: 800 }}>
                    <td colSpan={8}>TOTALES GENERALES</td>
                    <td className="amount">{formatQ(totals.total)}</td>
                    <td className="amount">{formatQ(totals.iva)}</td>
                    <td className="amount">{formatQ(totals.base)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* CODE SUMMARY */}
        <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">📊 Resumen por Código SAT (Acumulados Base)</div></div>
            <div className="table-wrapper" style={{ border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Código SAT</th>
                    <th>Descripción de Cuenta</th>
                    <th style={{ textAlign: 'right' }}>Monto Acumulado (Q)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedCodes).map(([code, data]) => (
                    <tr key={code}>
                      <td className="mono font-bold">{code}</td>
                      <td>{data.name}</td>
                      <td className="amount font-bold" style={{ color: 'var(--color-success)' }}>{formatQ(data.sum)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="empty-state-icon" style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚡</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 8 }}>Automatización de Libros Contables</div>
            <p className="text-sm text-muted" style={{ lineHeight: 1.6, marginBottom: 16 }}>
              La columna <strong>BASE</strong> se calcula restando el IVA del total de la factura. En caso de facturas anuladas, los montos se limpian a <strong>0.00</strong>.
              El botón de descarga genera un reporte de Excel listo para la junta directiva y el contador con el formato oficial de la SAT y resúmenes automáticos.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
