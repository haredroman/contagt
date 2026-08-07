'use client';

import { useState } from 'react';

type ReporteType = 'balance_general' | 'estado_resultados' | 'flujo_efectivo' | 'iva_mensual' | 'isr_trimestral' | 'retenciones';

interface ReporteItem {
  id: ReporteType;
  nombre: string;
  descripcion: string;
  icon: string;
  norma: string;
  frecuencia: string;
}

const REPORTES: ReporteItem[] = [
  { id: 'balance_general', nombre: 'Balance General', descripcion: 'Activos, Pasivos y Capital a una fecha determinada. Conforme NIIF para PYMES Sección 4.', icon: '⚖️', norma: 'NIIF PYMES §4', frecuencia: 'Mensual / Anual' },
  { id: 'estado_resultados', nombre: 'Estado de Resultados', descripcion: 'Ingresos, costos, gastos y utilidad del período. Incluye desglose por categoría SAT.', icon: '📈', norma: 'NIIF PYMES §5', frecuencia: 'Mensual / Anual' },
  { id: 'flujo_efectivo', nombre: 'Flujo de Efectivo', descripcion: 'Entradas y salidas de efectivo por actividades de operación, inversión y financiamiento.', icon: '💧', norma: 'NIIF PYMES §7', frecuencia: 'Trimestral / Anual' },
  { id: 'iva_mensual', nombre: 'Resumen IVA Mensual', descripcion: 'IVA Débito vs Crédito, saldo a favor o a pagar a SAT. Validado contra portal SAT.', icon: '🏛️', norma: 'Decreto 27-92', frecuencia: 'Mensual (antes del 15)' },
  { id: 'isr_trimestral', nombre: 'Pago Trimestral ISR', descripcion: 'Base imponible ISR, impuesto del trimestre y acumulado anual. Regímenes General y Opcional.', icon: '📋', norma: 'Decreto 10-2012', frecuencia: 'Trimestral' },
  { id: 'retenciones', nombre: 'Constancias de Retención', descripcion: 'Generación de constancias de retención IVA e ISR para Factura Especial y agentes retenedores.', icon: '🧾', norma: 'SAT / RTD', frecuencia: 'Por factura FESP' },
];

const MOCK_BALANCE: { cuenta: string; nombre: string; monto: number; tipo: 'activo' | 'pasivo' | 'capital' }[] = [
  { cuenta: '1101', nombre: 'Caja y Bancos', monto: 85420.50, tipo: 'activo' },
  { cuenta: '1201', nombre: 'Cuentas por Cobrar', monto: 43000.00, tipo: 'activo' },
  { cuenta: '1401', nombre: 'IVA Crédito Fiscal', monto: 18432.50, tipo: 'activo' },
  { cuenta: '1501', nombre: 'Inventarios', monto: 125000.00, tipo: 'activo' },
  { cuenta: '1601', nombre: 'Activos Fijos (neto)', monto: 380000.00, tipo: 'activo' },
  { cuenta: '2101', nombre: 'Proveedores por Pagar', monto: 67500.00, tipo: 'pasivo' },
  { cuenta: '2201', nombre: 'IVA Débito Fiscal', monto: 24815.00, tipo: 'pasivo' },
  { cuenta: '2301', nombre: 'ISR por Pagar', monto: 12400.00, tipo: 'pasivo' },
  { cuenta: '2401', nombre: 'ISR Retenciones por Pagar', monto: 3800.00, tipo: 'pasivo' },
  { cuenta: '3101', nombre: 'Capital Social', monto: 300000.00, tipo: 'capital' },
  { cuenta: '3201', nombre: 'Utilidades Acumuladas', monto: 243337.00, tipo: 'capital' },
];

const MOCK_RESULTADOS: { cuenta: string; nombre: string; monto: number; tipo: 'ingreso' | 'costo' | 'gasto' }[] = [
  { cuenta: '4101', nombre: 'Ventas de Mercancías', monto: 206791.67, tipo: 'ingreso' },
  { cuenta: '4201', nombre: 'Otros Ingresos', monto: 5000.00, tipo: 'ingreso' },
  { cuenta: '5001', nombre: 'Costo de Ventas', monto: 124074.99, tipo: 'costo' },
  { cuenta: '5102', nombre: 'Energía Eléctrica', monto: 1284.50, tipo: 'gasto' },
  { cuenta: '5104', nombre: 'Teléfono y Comunicaciones', monto: 450.00, tipo: 'gasto' },
  { cuenta: '5201', nombre: 'Combustibles', monto: 3200.00, tipo: 'gasto' },
  { cuenta: '5401', nombre: 'Papelería y Útiles', monto: 1450.00, tipo: 'gasto' },
  { cuenta: '5501', nombre: 'Arrendamiento', monto: 12000.00, tipo: 'gasto' },
  { cuenta: '5601', nombre: 'Honorarios Profesionales', monto: 8500.00, tipo: 'gasto' },
  { cuenta: '5701', nombre: 'Gastos Bancarios', monto: 350.00, tipo: 'gasto' },
];

function formatQ(n: number): string {
  return `Q ${n.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`;
}

export default function ReportesPage() {
  const [selectedReporte, setSelectedReporte] = useState<ReporteType | null>(null);
  const [periodo, setPeriodo] = useState('2025-07');
  const [generating, setGenerating] = useState(false);

  const totalActivos = MOCK_BALANCE.filter((r) => r.tipo === 'activo').reduce((s, r) => s + r.monto, 0);
  const totalPasivos = MOCK_BALANCE.filter((r) => r.tipo === 'pasivo').reduce((s, r) => s + r.monto, 0);
  const totalCapital = MOCK_BALANCE.filter((r) => r.tipo === 'capital').reduce((s, r) => s + r.monto, 0);

  const totalIngresos = MOCK_RESULTADOS.filter((r) => r.tipo === 'ingreso').reduce((s, r) => s + r.monto, 0);
  const totalCostos = MOCK_RESULTADOS.filter((r) => r.tipo === 'costo').reduce((s, r) => s + r.monto, 0);
  const totalGastos = MOCK_RESULTADOS.filter((r) => r.tipo === 'gasto').reduce((s, r) => s + r.monto, 0);
  const utilidad = totalIngresos - totalCostos - totalGastos;

  async function generateReport(type: ReporteType, format: string) {
    setGenerating(true);
    try {
      const empresaRes = await fetch('/api/auth/session');
      const session = await empresaRes.json();
      
      // eslint-disable-line
      
      const response = await fetch(`/api/libros/compras/pdf?format=${format}&mes=${new Date(periodo).getMonth()+1}&año=${new Date(periodo).getFullYear()}`, {
        headers: { 'Accept': format === 'pdf' ? 'application/pdf' : 'text/html' }
      });
      
      if (response.ok) {
        if (format === 'pdf') {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Reporte_${type}_${periodo}.${format}`;
          a.click();
          window.URL.revokeObjectURL(url);
        } else {
          const html = await response.text();
          const w = window.open('', '_blank');
          w?.document.write(html);
          w?.document.close();
        }
        alert(`✅ Reporte "${REPORTES.find(r => r.id === type)?.nombre}" generado en formato ${format.toUpperCase()}.`);
      } else {
        alert('Error generando reporte');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generando reporte');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Reportes NIIF para PYMES</div>
          <div className="topbar-breadcrumb">
            <span>ContaGT</span> <span>›</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>Estados Financieros y Reportes Fiscales</span>
          </div>
        </div>
        <div className="topbar-actions">
          <input
            id="periodo-reportes"
            type="month"
            className="form-input"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            style={{ width: 160 }}
          />
        </div>
      </div>

      <div className="page-content">
        {/* REPORTES GRID */}
        {!selectedReporte && (
          <>
            <div className="page-header">
              <div>
                <h1 className="page-title">Reportes disponibles</h1>
                <p className="page-subtitle">Estados financieros conforme NIIF para PYMES y reportes fiscales SAT Guatemala</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }} className="animate-stagger" id="reportes-grid">
              {REPORTES.map((rep) => (
                <div
                  key={rep.id}
                  className="card"
                  style={{ padding: '20px', cursor: 'pointer', transition: 'var(--transition-normal)' }}
                  id={`reporte-${rep.id}`}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--color-primary)'; el.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--color-border)'; el.style.transform = 'translateY(0)'; }}
                  onClick={() => setSelectedReporte(rep.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ fontSize: '2rem', flexShrink: 0 }}>{rep.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{rep.nombre}</div>
                      <div className="text-sm text-muted" style={{ lineHeight: 1.5 }}>{rep.descripcion}</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <span className="badge badge-primary">{rep.norma}</span>
                        <span className="badge badge-muted">{rep.frecuencia}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    {['PDF', 'Excel', 'CSV'].map((fmt) => (
                      <button
                        key={fmt}
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1 }}
                        id={`btn-gen-${rep.id}-${fmt.toLowerCase()}`}
                        onClick={(e) => { e.stopPropagation(); generateReport(rep.id, fmt); }}
                        disabled={generating}
                      >
                        {generating ? '...' : fmt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* BALANCE GENERAL PREVIEW */}
        {selectedReporte === 'balance_general' && (
          <div className="animate-fade-in-up" id="balance-general-preview">
            <div className="page-header">
              <div>
                <h1 className="page-title">⚖️ Balance General</h1>
                <p className="page-subtitle">Empresa Demo S.A. · Al 31 de julio 2025 · NIIF para PYMES §4</p>
              </div>
              <div className="page-actions">
                <button className="btn btn-secondary" onClick={() => setSelectedReporte(null)}>← Volver</button>
                <button id="btn-export-balance-pdf" className="btn btn-primary" onClick={() => generateReport('balance_general', 'pdf')}>📋 Exportar PDF</button>
                <button id="btn-export-balance-xlsx" className="btn btn-secondary" onClick={() => generateReport('balance_general', 'xlsx')}>📊 Excel</button>
              </div>
            </div>

            <div className="grid-2" style={{ gap: 20 }}>
              {/* ACTIVOS */}
              <div className="card">
                <div className="card-header"><div className="card-title" style={{ color: 'var(--color-success)' }}>ACTIVOS</div></div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <tbody>
                      {MOCK_BALANCE.filter((r) => r.tipo === 'activo').map((r) => (
                        <tr key={r.cuenta}>
                          <td className="mono muted" style={{ width: 60, fontSize: '0.75rem' }}>{r.cuenta}</td>
                          <td>{r.nombre}</td>
                          <td className="amount">{formatQ(r.monto)}</td>
                        </tr>
                      ))}
                      <tr style={{ background: 'var(--color-success-dim)', fontWeight: 800 }}>
                        <td colSpan={2} style={{ padding: '10px 16px', fontSize: '0.8rem', textTransform: 'uppercase' }}>Total Activos</td>
                        <td className="amount" style={{ color: 'var(--color-success)' }}>{formatQ(totalActivos)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PASIVOS + CAPITAL */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="card">
                  <div className="card-header"><div className="card-title" style={{ color: 'var(--color-danger)' }}>PASIVOS</div></div>
                  <table className="table">
                    <tbody>
                      {MOCK_BALANCE.filter((r) => r.tipo === 'pasivo').map((r) => (
                        <tr key={r.cuenta}>
                          <td className="mono muted" style={{ width: 60, fontSize: '0.75rem' }}>{r.cuenta}</td>
                          <td>{r.nombre}</td>
                          <td className="amount">{formatQ(r.monto)}</td>
                        </tr>
                      ))}
                      <tr style={{ background: 'var(--color-danger-dim)', fontWeight: 800 }}>
                        <td colSpan={2} style={{ padding: '10px 16px', fontSize: '0.8rem', textTransform: 'uppercase' }}>Total Pasivos</td>
                        <td className="amount" style={{ color: 'var(--color-danger)' }}>{formatQ(totalPasivos)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="card">
                  <div className="card-header"><div className="card-title" style={{ color: 'var(--color-primary)' }}>CAPITAL</div></div>
                  <table className="table">
                    <tbody>
                      {MOCK_BALANCE.filter((r) => r.tipo === 'capital').map((r) => (
                        <tr key={r.cuenta}>
                          <td className="mono muted" style={{ width: 60, fontSize: '0.75rem' }}>{r.cuenta}</td>
                          <td>{r.nombre}</td>
                          <td className="amount">{formatQ(r.monto)}</td>
                        </tr>
                      ))}
                      <tr style={{ background: 'var(--color-primary-dim)', fontWeight: 800 }}>
                        <td colSpan={2} style={{ padding: '10px 16px', fontSize: '0.8rem', textTransform: 'uppercase' }}>Total Capital</td>
                        <td className="amount" style={{ color: 'var(--color-primary)' }}>{formatQ(totalCapital)}</td>
                      </tr>
                      <tr style={{ background: 'var(--color-surface-3)', fontWeight: 900 }}>
                        <td colSpan={2} style={{ padding: '12px 16px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>PASIVO + CAPITAL</td>
                        <td className="amount" style={{ fontSize: '1rem' }}>{formatQ(totalPasivos + totalCapital)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Cuadre check */}
            <div className={`iva-status ${Math.abs(totalActivos - (totalPasivos + totalCapital)) < 0.01 ? 'balanced' : 'unbalanced'}`} style={{ marginTop: 16 }}>
              <span style={{ fontSize: '1.5rem' }}>{Math.abs(totalActivos - (totalPasivos + totalCapital)) < 0.01 ? '✅' : '⚠️'}</span>
              <div style={{ fontWeight: 700 }}>
                {Math.abs(totalActivos - (totalPasivos + totalCapital)) < 0.01
                  ? 'Balance cuadrado: Activos = Pasivo + Capital'
                  : `Descuadre de Q${Math.abs(totalActivos - totalPasivos - totalCapital).toFixed(2)}`}
              </div>
            </div>
          </div>
        )}

        {/* ESTADO DE RESULTADOS PREVIEW */}
        {selectedReporte === 'estado_resultados' && (
          <div className="animate-fade-in-up" id="estado-resultados-preview">
            <div className="page-header">
              <div>
                <h1 className="page-title">📈 Estado de Resultados</h1>
                <p className="page-subtitle">Empresa Demo S.A. · Julio 2025 · NIIF para PYMES §5</p>
              </div>
              <div className="page-actions">
                <button className="btn btn-secondary" onClick={() => setSelectedReporte(null)}>← Volver</button>
                <button id="btn-export-resultados-pdf" className="btn btn-primary" onClick={() => generateReport('estado_resultados', 'pdf')}>📋 PDF</button>
                <button id="btn-export-resultados-xlsx" className="btn btn-secondary" onClick={() => generateReport('estado_resultados', 'xlsx')}>📊 Excel</button>
              </div>
            </div>

            <div className="card" style={{ maxWidth: 700 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Cuenta</th>
                    <th style={{ textAlign: 'right' }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: 'var(--color-success-dim)' }}>
                    <td colSpan={3} style={{ padding: '8px 16px', fontWeight: 700, color: 'var(--color-success)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.06em' }}>INGRESOS</td>
                  </tr>
                  {MOCK_RESULTADOS.filter((r) => r.tipo === 'ingreso').map((r) => (
                    <tr key={r.cuenta}>
                      <td className="mono muted" style={{ width: 60, fontSize: '0.75rem' }}>{r.cuenta}</td>
                      <td>{r.nombre}</td>
                      <td className="amount" style={{ color: 'var(--color-success)' }}>{formatQ(r.monto)}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 800 }}>
                    <td colSpan={2} style={{ padding: '10px 16px', color: 'var(--color-success)' }}>Total Ingresos</td>
                    <td className="amount" style={{ color: 'var(--color-success)' }}>{formatQ(totalIngresos)}</td>
                  </tr>

                  <tr style={{ background: 'var(--color-danger-dim)' }}>
                    <td colSpan={3} style={{ padding: '8px 16px', fontWeight: 700, color: 'var(--color-danger)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.06em' }}>COSTOS</td>
                  </tr>
                  {MOCK_RESULTADOS.filter((r) => r.tipo === 'costo').map((r) => (
                    <tr key={r.cuenta}>
                      <td className="mono muted" style={{ width: 60, fontSize: '0.75rem' }}>{r.cuenta}</td>
                      <td>{r.nombre}</td>
                      <td className="amount" style={{ color: 'var(--color-danger)' }}>{formatQ(r.monto)}</td>
                    </tr>
                  ))}

                  <tr style={{ background: 'var(--color-warning-dim)' }}>
                    <td colSpan={3} style={{ padding: '8px 16px', fontWeight: 700, color: 'var(--color-warning)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.06em' }}>GASTOS OPERATIVOS</td>
                  </tr>
                  {MOCK_RESULTADOS.filter((r) => r.tipo === 'gasto').map((r) => (
                    <tr key={r.cuenta}>
                      <td className="mono muted" style={{ width: 60, fontSize: '0.75rem' }}>{r.cuenta}</td>
                      <td>{r.nombre}</td>
                      <td className="amount" style={{ color: 'var(--color-warning)' }}>{formatQ(r.monto)}</td>
                    </tr>
                  ))}

                  <tr style={{ fontWeight: 800, fontSize: '1rem', background: utilidad > 0 ? 'var(--color-success-dim)' : 'var(--color-danger-dim)' }}>
                    <td colSpan={2} style={{ padding: '14px 16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {utilidad > 0 ? '✅ UTILIDAD DEL PERÍODO' : '⚠️ PÉRDIDA DEL PERÍODO'}
                    </td>
                    <td className="amount" style={{ color: utilidad > 0 ? 'var(--color-success)' : 'var(--color-danger)', fontSize: '1.1rem' }}>
                      {formatQ(utilidad)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* IVA MENSUAL PREVIEW */}
        {selectedReporte === 'iva_mensual' && (
          <div className="animate-fade-in-up" id="iva-mensual-preview">
            <div className="page-header">
              <div>
                <h1 className="page-title">🏛️ Resumen IVA Mensual</h1>
                <p className="page-subtitle">Empresa Demo S.A. · Julio 2025 · Decreto 27-92</p>
              </div>
              <div className="page-actions">
                <button className="btn btn-secondary" onClick={() => setSelectedReporte(null)}>← Volver</button>
                <button id="btn-export-iva-pdf" className="btn btn-primary" onClick={() => generateReport('iva_mensual', 'pdf')}>📋 PDF</button>
              </div>
            </div>

            <div style={{ maxWidth: 600 }}>
              <div className="card" style={{ padding: '24px' }}>
                {[
                  { label: 'IVA Débito (por ventas)', value: 24815.00, color: 'var(--color-warning)' },
                  { label: 'IVA Crédito (por compras)', value: -18432.50, color: 'var(--color-success)' },
                  { label: 'IVA Retenciones pagadas', value: -910.71, color: 'var(--color-primary)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>{formatQ(value)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0 0', fontWeight: 800, fontSize: '1.1rem' }}>
                  <span>IVA A PAGAR A SAT</span>
                  <span style={{ color: 'var(--color-danger)', fontFamily: 'var(--font-mono)' }}>{formatQ(24815.00 - 18432.50 - 910.71)}</span>
                </div>
                <p className="text-xs text-muted" style={{ marginTop: 12 }}>Vence: 15 de agosto 2025</p>
              </div>
            </div>
          </div>
        )}

        {/* Placeholder for other reports */}
        {selectedReporte && !['balance_general', 'estado_resultados', 'iva_mensual'].includes(selectedReporte) && (
          <div className="animate-fade-in-up">
            <div className="page-header">
              <div>
                <h1 className="page-title">{REPORTES.find(r => r.id === selectedReporte)?.icon} {REPORTES.find(r => r.id === selectedReporte)?.nombre}</h1>
              </div>
              <button className="btn btn-secondary" onClick={() => setSelectedReporte(null)}>← Volver</button>
            </div>
            <div className="empty-state" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
              <div className="empty-state-icon">{REPORTES.find(r => r.id === selectedReporte)?.icon}</div>
              <div className="empty-state-title">{REPORTES.find(r => r.id === selectedReporte)?.nombre}</div>
              <div className="empty-state-desc">Este reporte se genera automáticamente con los datos reales de la base de datos PostgreSQL en la versión de producción.</div>
              <button className="btn btn-primary" onClick={() => generateReport(selectedReporte, 'pdf')} id="btn-gen-placeholder">📋 Generar demo en PDF</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
