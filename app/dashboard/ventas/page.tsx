'use client';

import { useState } from 'react';

interface LibroVentaRow {
  id: string;
  fecha: string;
  serie: string;
  numero: string;
  nit: string;
  cliente: string;
  tipo: string;
  total: number;
  gravado: number;
  exento: number;
  iva: number;
  estado: 'ok' | 'warning' | 'error';
  alerta?: string;
}

const MOCK_VENTAS: LibroVentaRow[] = [
  { id: '1', fecha: '2025-07-20', serie: 'A', numero: '00000125', nit: '1111111-1', cliente: 'DISTRIBUIDORA NORTE S.A.', tipo: 'FACT', total: 15000.00, gravado: 13392.86, exento: 0, iva: 1607.14, estado: 'ok' },
  { id: '2', fecha: '2025-07-19', serie: 'A', numero: '00000126', nit: 'CF', cliente: 'Consumidor Final', tipo: 'FACT', total: 850.00, gravado: 758.93, exento: 0, iva: 91.07, estado: 'ok' },
  { id: '3', fecha: '2025-07-18', serie: 'A', numero: '00000127', nit: '2222222-2', cliente: 'COMERCIAL EL ROBLE S.A.', tipo: 'FACT', total: 42500.00, gravado: 37946.43, exento: 0, iva: 4553.57, estado: 'ok' },
  { id: '4', fecha: '2025-07-17', serie: 'A', numero: '00000128', nit: '3333333-3', cliente: 'CONSTRUCTORA DEL PACIFICO', tipo: 'FACT', total: 68000.00, gravado: 60714.29, exento: 0, iva: 7285.71, estado: 'warning', alerta: 'Monto > Q50,000: Verificar si el cliente aplica retención' },
  { id: '5', fecha: '2025-07-16', serie: 'B', numero: '00000001', nit: '4444444-4', cliente: 'HOSPITAL SAN MARCOS', tipo: 'FACT', total: 5200.00, gravado: 0, exento: 5200.00, iva: 0, estado: 'ok' },
  { id: '6', fecha: '2025-07-15', serie: 'A', numero: '00000129', nit: '5555555-5', cliente: 'AGROEXPORT S.A.', tipo: 'FACT', total: 28000.00, gravado: 25000.00, exento: 0, iva: 3000.00, estado: 'ok' },
  { id: '7', fecha: '2025-07-14', serie: 'A', numero: '00000130', nit: 'CF', cliente: 'Consumidor Final', tipo: 'FACT', total: 1250.00, gravado: 1116.07, exento: 0, iva: 133.93, estado: 'ok' },
  { id: '8', fecha: '2025-07-12', serie: 'NCRE', numero: '00000003', nit: '1111111-1', cliente: 'DISTRIBUIDORA NORTE S.A.', tipo: 'NCRE', total: -2500.00, gravado: -2232.14, exento: 0, iva: -267.86, estado: 'ok' },
];

function formatQ(n: number): string {
  const abs = Math.abs(n);
  const formatted = `Q ${abs.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`;
  return n < 0 ? `-${formatted}` : formatted;
}

function getTipoBadge(tipo: string) {
  const m: Record<string, string> = { FACT: 'badge-primary', NCRE: 'badge-danger', NDEB: 'badge-warning', FPEQ: 'badge-info' };
  return <span className={`badge ${m[tipo] || 'badge-muted'}`}>{tipo}</span>;
}

export default function VentasPage() {
  const [filter, setFilter] = useState('');
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  const filtered = MOCK_VENTAS.filter((r) =>
    !filter ||
    r.cliente.toLowerCase().includes(filter.toLowerCase()) ||
    r.nit.toLowerCase().includes(filter.toLowerCase())
  );

  const totales = filtered.reduce(
    (acc, r) => ({ total: acc.total + r.total, gravado: acc.gravado + r.gravado, exento: acc.exento + r.exento, iva: acc.iva + r.iva }),
    { total: 0, gravado: 0, exento: 0, iva: 0 }
  );

  async function handleExport(format: string) {
    setExportLoading(format);
    await new Promise((r) => setTimeout(r, 1200));
    if (format === 'csv') {
      const rows = [
        ['Fecha', 'Serie', 'Numero', 'NIT Cliente', 'Nombre Cliente', 'Total', 'Gravado', 'Exento', 'IVA Debito'],
        ...filtered.map((r) => [r.fecha, r.serie, r.numero, r.nit, r.cliente, r.total.toFixed(2), r.gravado.toFixed(2), r.exento.toFixed(2), r.iva.toFixed(2)]),
        ['', '', '', '', 'TOTALES', totales.total.toFixed(2), totales.gravado.toFixed(2), totales.exento.toFixed(2), totales.iva.toFixed(2)],
      ];
      const csv = rows.map((r) => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `LibroVentas_Julio_2025.csv`;
      a.click();
    } else {
      alert(`Exportación ${format.toUpperCase()} — Genera el archivo listo para la SAT.`);
    }
    setExportLoading(null);
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Libro de Ventas</div>
          <div className="topbar-breadcrumb">
            <span>ContaGT</span> <span>›</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>Libro de Ventas · Julio 2025</span>
          </div>
        </div>
        <div className="topbar-actions">
          {(['csv', 'xlsx', 'pdf'] as const).map((fmt) => (
            <button
              key={fmt}
              id={`export-ventas-${fmt}`}
              className="btn btn-secondary btn-sm"
              onClick={() => handleExport(fmt)}
              disabled={exportLoading === fmt}
            >
              {exportLoading === fmt ? <><div className="spinner" style={{ width: 14, height: 14 }} />Exportando...</> : (
                fmt === 'csv' ? '📄 CSV (SAT)' : fmt === 'xlsx' ? '📊 Excel' : '📄 PDF'
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="page-content">
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
          {[
            { label: 'Facturas emitidas', value: filtered.filter(r => r.tipo !== 'NCRE').length.toString(), icon: '📄', cls: 'primary' },
            { label: 'Monto Gravado', value: formatQ(totales.gravado), icon: '💰', cls: 'success', mono: true },
            { label: 'Monto Exento', value: formatQ(totales.exento), icon: '🏥', cls: 'info', mono: true },
            { label: 'IVA Débito Fiscal', value: formatQ(totales.iva), icon: '🏛️', cls: 'warning', mono: true },
          ].map((kpi) => (
            <div key={kpi.label} className={`kpi-card ${kpi.cls}`}>
              <div className="kpi-icon">{kpi.icon}</div>
              <div className="kpi-label">{kpi.label}</div>
              <div className={`kpi-value ${kpi.mono ? 'mono' : ''}`} style={{ fontSize: kpi.mono ? '1.2rem' : '1.75rem' }}>
                {kpi.value}
              </div>
            </div>
          ))}
        </div>

        <div className="card" id="libro-ventas-table">
          <div className="card-header" style={{ padding: '16px 20px 12px', gap: 10 }}>
            <div className="card-title">Detalle Libro de Ventas</div>
            <input
              id="filter-ventas"
              type="text"
              className="form-input"
              placeholder="Buscar cliente, NIT..."
              style={{ width: 240 }}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <div className="table-wrapper" style={{ borderRadius: '0 0 16px 16px', border: 'none', borderTop: '1px solid var(--color-border)' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Serie</th>
                  <th>Número</th>
                  <th>NIT Cliente</th>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>Gravado</th>
                  <th style={{ textAlign: 'right' }}>Exento</th>
                  <th style={{ textAlign: 'right' }}>IVA Débito</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} style={{ opacity: row.tipo === 'NCRE' ? 0.75 : 1 }}>
                    <td className="muted" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{row.fecha}</td>
                    <td className="mono muted">{row.serie}</td>
                    <td className="mono muted">{row.numero}</td>
                    <td className="mono muted" style={{ fontSize: '0.78rem' }}>{row.nit}</td>
                    <td style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                      {row.cliente}
                      {row.alerta && <div className="text-xs" style={{ color: 'var(--color-warning)', marginTop: 2 }}>{row.alerta}</div>}
                    </td>
                    <td>{getTipoBadge(row.tipo)}</td>
                    <td className="amount" style={{ color: row.total < 0 ? 'var(--color-danger)' : undefined }}>{formatQ(row.total)}</td>
                    <td className="amount">{row.gravado !== 0 ? formatQ(row.gravado) : <span className="text-muted">—</span>}</td>
                    <td className="amount" style={{ color: 'var(--color-info)' }}>{row.exento !== 0 ? formatQ(row.exento) : <span className="text-muted">—</span>}</td>
                    <td className="amount" style={{ color: 'var(--color-warning)' }}>{row.iva !== 0 ? formatQ(row.iva) : <span className="text-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--color-surface-2)', fontWeight: 700 }}>
                  <td colSpan={6} style={{ padding: '12px 16px', color: 'var(--color-text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                    TOTALES ({filtered.length} documentos)
                  </td>
                  <td className="amount" style={{ fontWeight: 800 }}>{formatQ(totales.total)}</td>
                  <td className="amount" style={{ fontWeight: 800 }}>{formatQ(totales.gravado)}</td>
                  <td className="amount" style={{ fontWeight: 800, color: 'var(--color-info)' }}>{formatQ(totales.exento)}</td>
                  <td className="amount" style={{ fontWeight: 800, color: 'var(--color-warning)' }}>{formatQ(totales.iva)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
