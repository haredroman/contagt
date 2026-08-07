'use client';

import { useState } from 'react';

// Mock data for demo
const mockKPIs = {
  facturasCargadas: 247,
  ivaCredito: 18432.50,
  ivaDebito: 24815.00,
  ivaAPagar: 6382.50,
  retencionesPendientes: 3,
  alertas: 5,
  documentosMes: 89,
  totalCompras: 153604.17,
  totalVentas: 206791.67,
};

const mockAlertas = [
  { id: 1, tipo: 'warning', icono: '⚠️', mensaje: '3 facturas con retención ISR pendiente de aplicar', fecha: 'Hoy' },
  { id: 2, tipo: 'danger',  icono: '🔴', mensaje: 'IVA Libro de Compras vs SAT: diferencia de Q 245.00 detectada', fecha: 'Hoy' },
  { id: 3, tipo: 'info',    icono: '📋', mensaje: '15 facturas del mes anterior sin contabilizar', fecha: 'Ayer' },
  { id: 4, tipo: 'warning', icono: '⚠️', mensaje: 'Proveedor NIT 8574321-0: Facturas especiales sin retención ISR', fecha: 'Jul 18' },
  { id: 5, tipo: 'success', icono: '✅', mensaje: 'Libro de Compras junio 2025 generado y exportado', fecha: 'Jul 15' },
];

const mockUltimosDocumentos = [
  { uuid: 'A1B2C3D4', fecha: '2025-07-20', emisor: 'ENERGUATE S.A.', tipo: 'FACT', total: 1284.50, iva: 137.65, estado: 'PROCESADO', cuenta: 'Energía Eléctrica' },
  { uuid: 'E5F6G7H8', fecha: '2025-07-20', emisor: 'CLARO GUATEMALA', tipo: 'FACT', total: 450.00, iva: 48.21, estado: 'PROCESADO', cuenta: 'Teléfono y Comunicaciones' },
  { uuid: 'I9J0K1L2', fecha: '2025-07-19', emisor: 'MARIO LOPEZ (FESP)', tipo: 'FESP', total: 8500.00, iva: 910.71, estado: 'PENDIENTE', cuenta: 'Honorarios Profesionales' },
  { uuid: 'M3N4O5P6', fecha: '2025-07-19', emisor: 'OFICENTRO S.A.', tipo: 'FACT', total: 285.50, iva: 30.59, estado: 'PROCESADO', cuenta: 'Papelería y Útiles' },
  { uuid: 'Q7R8S9T0', fecha: '2025-07-18', emisor: 'PUMA ENERGY S.A.', tipo: 'FACT', total: 3200.00, iva: 342.86, estado: 'PROCESADO', cuenta: 'Combustibles' },
];

function formatQ(amount: number): string {
  return `Q ${amount.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getEstadoBadge(estado: string) {
  const map: Record<string, { cls: string; label: string }> = {
    PROCESADO:    { cls: 'badge-success', label: '✓ Procesado' },
    PENDIENTE:    { cls: 'badge-warning', label: '⏳ Pendiente' },
    CONTABILIZADO:{ cls: 'badge-primary', label: '📚 Contabilizado' },
    ERROR:        { cls: 'badge-danger',  label: '✗ Error' },
    ANULADO:      { cls: 'badge-muted',   label: '✗ Anulado' },
  };
  const item = map[estado] || { cls: 'badge-muted', label: estado };
  return <span className={`badge ${item.cls}`}>{item.label}</span>;
}

function getTipoBadge(tipo: string) {
  const map: Record<string, { cls: string }> = {
    FACT: { cls: 'badge-primary' },
    FESP: { cls: 'badge-warning' },
    NCRE: { cls: 'badge-danger' },
    FPEQ: { cls: 'badge-info' },
  };
  return (
    <span className={`badge ${map[tipo]?.cls || 'badge-muted'}`}>
      {tipo}
    </span>
  );
}

export default function DashboardPage() {
  const [periodoLabel] = useState(() =>
    new Date().toLocaleDateString('es-GT', { month: 'long', year: 'numeric' })
  );

  const ivaBalance = mockKPIs.ivaDebito - mockKPIs.ivaCredito;

  return (
    <>
      {/* TOPBAR */}
      <div className="topbar">
        <div>
          <div className="topbar-title">Dashboard</div>
          <div className="topbar-breadcrumb">
            <span>ContaGT</span>
            <span>›</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>Resumen del período</span>
          </div>
        </div>
        <div className="topbar-actions">
          <span
            style={{
              fontSize: '0.78rem',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-secondary)',
            }}
          >
            📅 {periodoLabel.charAt(0).toUpperCase() + periodoLabel.slice(1)}
          </span>
          <a href="/dashboard/fel" className="btn btn-primary btn-sm" id="cta-cargar-fel">
            ⬆️ Cargar FEL
          </a>
        </div>
      </div>

      <div className="page-content">
        {/* ALERT BANNER — IVA discrepancy */}
        <div className="alert alert-danger mb-4 animate-fade-in-up" id="alert-iva-discrepancy" style={{ marginBottom: 20 }}>
          <span>🔴</span>
          <div>
            <strong>Alerta IVA:</strong> Se detectó una diferencia de <strong>Q 245.00</strong> entre el Libro de Compras registrado y las facturas en el portal SAT.{' '}
            <a href="/dashboard/compras" style={{ color: 'inherit', textDecoration: 'underline' }}>
              Revisar →
            </a>
          </div>
        </div>

        {/* KPI GRID */}
        <div className="kpi-grid animate-stagger">
          <div className="kpi-card primary">
            <div className="kpi-icon">📄</div>
            <div className="kpi-label">Documentos FEL (mes)</div>
            <div className="kpi-value">{mockKPIs.documentosMes}</div>
            <div className="kpi-sub">De {mockKPIs.facturasCargadas} totales cargados</div>
            <div className="kpi-trend up">▲ 12% vs mes anterior</div>
          </div>

          <div className="kpi-card success">
            <div className="kpi-icon">💳</div>
            <div className="kpi-label">IVA Crédito Fiscal</div>
            <div className="kpi-value mono" style={{ fontSize: '1.4rem' }}>
              {formatQ(mockKPIs.ivaCredito)}
            </div>
            <div className="kpi-sub">Compras del período</div>
            <div className="kpi-trend up">▲ 8% vs mes anterior</div>
          </div>

          <div className="kpi-card warning">
            <div className="kpi-icon">🏛️</div>
            <div className="kpi-label">IVA Débito Fiscal</div>
            <div className="kpi-value mono" style={{ fontSize: '1.4rem' }}>
              {formatQ(mockKPIs.ivaDebito)}
            </div>
            <div className="kpi-sub">Ventas del período</div>
          </div>

          <div className="kpi-card danger">
            <div className="kpi-icon">💸</div>
            <div className="kpi-label">IVA a Pagar SAT</div>
            <div className="kpi-value mono" style={{ fontSize: '1.4rem', color: 'var(--color-danger)' }}>
              {formatQ(ivaBalance)}
            </div>
            <div className="kpi-sub">Débito − Crédito</div>
          </div>

          <div className="kpi-card info">
            <div className="kpi-icon">🛒</div>
            <div className="kpi-label">Total Compras</div>
            <div className="kpi-value mono" style={{ fontSize: '1.3rem' }}>
              {formatQ(mockKPIs.totalCompras)}
            </div>
            <div className="kpi-sub">Base gravable del mes</div>
          </div>

          <div className="kpi-card success">
            <div className="kpi-icon">💰</div>
            <div className="kpi-label">Total Ventas</div>
            <div className="kpi-value mono" style={{ fontSize: '1.3rem' }}>
              {formatQ(mockKPIs.totalVentas)}
            </div>
            <div className="kpi-sub">Base gravable del mes</div>
          </div>
        </div>

        {/* IVA STATUS BAR */}
        <div
          className={`iva-status ${ivaBalance > 0 ? 'unbalanced' : 'balanced'} mb-4`}
          style={{ marginBottom: 20 }}
          id="iva-status-bar"
        >
          <span style={{ fontSize: '1.5rem' }}>{ivaBalance > 0 ? '🏛️' : '✅'}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              {ivaBalance > 0
                ? `IVA a pagar a SAT este mes: ${formatQ(ivaBalance)}`
                : `Crédito fiscal a arrastrar: ${formatQ(Math.abs(ivaBalance))}`}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
              Débito Q{mockKPIs.ivaDebito.toFixed(2)} − Crédito Q{mockKPIs.ivaCredito.toFixed(2)}
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <a href="/dashboard/compras" className="btn btn-secondary btn-sm">
              Ver desglose →
            </a>
          </div>
        </div>

        {/* BOTTOM GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
          {/* Recent documents */}
          <div className="card" id="recent-documents">
            <div className="card-header">
              <div className="card-title">Últimos Documentos FEL</div>
              <a href="/dashboard/fel" className="btn btn-ghost btn-sm">Ver todos →</a>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Emisor</th>
                    <th>Tipo</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ textAlign: 'right' }}>IVA</th>
                    <th>Cuenta</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {mockUltimosDocumentos.map((doc) => (
                    <tr key={doc.uuid}>
                      <td className="muted">{doc.fecha}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{doc.emisor}</div>
                        <div className="text-xs text-muted">{doc.uuid.slice(0, 8)}…</div>
                      </td>
                      <td>{getTipoBadge(doc.tipo)}</td>
                      <td className="amount">{formatQ(doc.total)}</td>
                      <td className="amount" style={{ color: 'var(--color-primary)' }}>{formatQ(doc.iva)}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>{doc.cuenta}</td>
                      <td>{getEstadoBadge(doc.estado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Alerts */}
          <div className="card" id="alerts-panel">
            <div className="card-header">
              <div className="card-title">⚡ Alertas Fiscales</div>
              <span className="badge badge-danger">{mockKPIs.alertas}</span>
            </div>
            <div className="card-body" style={{ paddingTop: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {mockAlertas.map((alerta) => (
                  <div
                    key={alerta.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)',
                      transition: 'var(--transition-fast)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-hover)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                    }}
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '1rem', flexShrink: 0 }}>{alerta.icono}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
                          {alerta.mensaje}
                        </p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                          {alerta.fecha}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            marginTop: 20,
          }}
          id="quick-actions"
        >
          {[
            { href: '/dashboard/fel', icon: '📁', label: 'Cargar XMLs FEL', sub: 'Carga masiva de facturas', cls: 'primary' },
            { href: '/dashboard/compras', icon: '📗', label: 'Libro de Compras', sub: 'Exportar listo para SAT', cls: 'success' },
            { href: '/dashboard/ventas', icon: '📘', label: 'Libro de Ventas', sub: 'Exportar listo para SAT', cls: 'primary' },
            { href: '/dashboard/reglas', icon: '⚙️', label: 'Motor de Reglas', sub: 'Configurar clasificación', cls: 'warning' },
          ].map((action) => (
            <a
              key={action.href}
              href={action.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '16px 18px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                textDecoration: 'none',
                color: 'var(--color-text-primary)',
                transition: 'var(--transition-normal)',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'var(--color-primary)';
                el.style.background = 'var(--color-primary-dim)';
                el.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'var(--color-border)';
                el.style.background = 'var(--color-surface)';
                el.style.transform = 'translateY(0)';
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>{action.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{action.label}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{action.sub}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
