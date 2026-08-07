'use client';

import { useState } from 'react';

interface ReglaPersonalizada {
  id: string;
  nombre: string;
  prioridad: 'NIT_EXACTO' | 'NOMBRE_EXACTO' | 'KEYWORD' | 'DEFAULT';
  nitEmisor?: string;
  nombreContiene?: string;
  keywords: string[];
  montoMin?: number;
  accountCode: string;
  accountName: string;
  taxTag: string;
  activo: boolean;
  tipo: 'sistema' | 'personalizada';
}

const REGLAS_SISTEMA: ReglaPersonalizada[] = [
  { id: 'util-luz', nombre: 'Energía Eléctrica', prioridad: 'KEYWORD', keywords: ['ENERGUATE', 'EEGSA', 'DEORSA', 'DEOCSA'], accountCode: '5102', accountName: 'Gastos de Energía Eléctrica', taxTag: 'gasto_deducible_ISR', activo: true, tipo: 'sistema' },
  { id: 'util-agua', nombre: 'Agua Potable', prioridad: 'KEYWORD', keywords: ['EMPAGUA', 'AGUAS NACIONALES', 'AGUA POTABLE'], accountCode: '5103', accountName: 'Gastos de Agua', taxTag: 'gasto_deducible_ISR', activo: true, tipo: 'sistema' },
  { id: 'util-telefono', nombre: 'Telefonía', prioridad: 'KEYWORD', keywords: ['CLARO', 'TIGO', 'MOVISTAR', 'TELEFONICA'], accountCode: '5104', accountName: 'Teléfono y Comunicaciones', taxTag: 'gasto_deducible_ISR', activo: true, tipo: 'sistema' },
  { id: 'util-internet', nombre: 'Internet', prioridad: 'KEYWORD', keywords: ['INTERNET', 'FIBRA', 'FIBERNET', 'CABLE XTREME'], accountCode: '5105', accountName: 'Gastos de Internet', taxTag: 'gasto_deducible_ISR', activo: true, tipo: 'sistema' },
  { id: 'combustible', nombre: 'Combustibles', prioridad: 'KEYWORD', keywords: ['PUMA', 'TEXACO', 'SHELL', 'GULF', 'GASOLINERA'], accountCode: '5201', accountName: 'Combustibles y Lubricantes', taxTag: 'gasto_deducible_ISR', activo: true, tipo: 'sistema' },
  { id: 'alimentacion', nombre: 'Alimentación', prioridad: 'KEYWORD', keywords: ['RESTAURANTE', 'CAFETERIA', 'WALMART', 'PAIZ', 'MAXI DESPENSA'], accountCode: '5301', accountName: 'Gastos de Alimentación', taxTag: 'gasto_deducible_ISR_50pct', activo: true, tipo: 'sistema' },
  { id: 'papeleria', nombre: 'Papelería', prioridad: 'KEYWORD', keywords: ['PAPELERIA', 'OFFICEMAX', 'IMPRENTA', 'TONER'], accountCode: '5401', accountName: 'Papelería y Útiles', taxTag: 'gasto_deducible_ISR', activo: true, tipo: 'sistema' },
  { id: 'alquiler', nombre: 'Arrendamiento', prioridad: 'KEYWORD', keywords: ['ARRENDAMIENTO', 'ALQUILER', 'INMOBILIARIA'], accountCode: '5501', accountName: 'Arrendamiento', taxTag: 'gasto_deducible_ISR', activo: true, tipo: 'sistema' },
  { id: 'honorarios', nombre: 'Honorarios Profesionales', prioridad: 'KEYWORD', keywords: ['HONORARIOS', 'CONSULTORIA', 'ABOGADO', 'NOTARIO'], accountCode: '5601', accountName: 'Honorarios Profesionales', taxTag: 'gasto_deducible_ISR', activo: true, tipo: 'sistema' },
  { id: 'gastos-bancarios', nombre: 'Gastos Bancarios', prioridad: 'KEYWORD', keywords: ['BANRURAL', 'BAC', 'G&T', 'INDUSTRIAL', 'AGROMERCANTIL'], accountCode: '5701', accountName: 'Gastos Bancarios', taxTag: 'gasto_no_deducible', activo: true, tipo: 'sistema' },
  { id: 'transporte', nombre: 'Transporte / Flete', prioridad: 'KEYWORD', keywords: ['TRANSPORTE', 'FLETE', 'MENSAJERIA', 'DHL', 'FEDEX'], accountCode: '5901', accountName: 'Fletes y Transportes', taxTag: 'gasto_deducible_ISR', activo: true, tipo: 'sistema' },
  { id: 'monto-alto-isr', nombre: 'Alerta Monto > Q50,000', prioridad: 'KEYWORD', keywords: [], montoMin: 50000, accountCode: '5999', accountName: 'Por Clasificar (Monto Alto)', taxTag: 'verificar_retencion_ISR', activo: true, tipo: 'sistema' },
];

const PRIORIDADES = ['NIT_EXACTO', 'NOMBRE_EXACTO', 'KEYWORD'] as const;
const TAX_TAGS = ['gasto_deducible_ISR', 'gasto_deducible_ISR_50pct', 'gasto_no_deducible', 'IVA_credito', 'verificar_retencion_ISR'] as const;

const prioridadLabel: Record<string, { label: string; cls: string }> = {
  NIT_EXACTO:   { label: 'NIT Exacto', cls: 'badge-primary' },
  NOMBRE_EXACTO:{ label: 'Nombre Exacto', cls: 'badge-info' },
  KEYWORD:      { label: 'Palabra Clave', cls: 'badge-success' },
  DEFAULT:      { label: 'Default', cls: 'badge-muted' },
};

const BLANK_RULE: Omit<ReglaPersonalizada, 'id' | 'tipo'> = {
  nombre: '', prioridad: 'KEYWORD', keywords: [], accountCode: '', accountName: '', taxTag: 'gasto_deducible_ISR', activo: true,
};

export default function ReglasPage() {
  const [reglasPers, setReglasPers] = useState<ReglaPersonalizada[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editRegla, setEditRegla] = useState<Partial<ReglaPersonalizada>>(BLANK_RULE);
  const [keywordInput, setKeywordInput] = useState('');
  const [testNombre, setTestNombre] = useState('');
  const [testMonto, setTestMonto] = useState('');
  const [testResult, setTestResult] = useState<ReglaPersonalizada | null>(null);
  const [activeTab, setActiveTab] = useState<'sistema' | 'personalizadas' | 'probar'>('sistema');

  function openNew() { setEditRegla({ ...BLANK_RULE }); setKeywordInput(''); setShowModal(true); }
  function openEdit(r: ReglaPersonalizada) { setEditRegla({ ...r }); setKeywordInput(r.keywords.join(', ')); setShowModal(true); }

  function saveRegla() {
    const kws = keywordInput.split(',').map((k) => k.trim().toUpperCase()).filter(Boolean);
    const nueva: ReglaPersonalizada = {
      ...(editRegla as ReglaPersonalizada),
      id: editRegla.id || `custom-${Date.now()}`,
      keywords: kws,
      tipo: 'personalizada',
    };
    setReglasPers((prev) =>
      prev.find((r) => r.id === nueva.id)
        ? prev.map((r) => (r.id === nueva.id ? nueva : r))
        : [...prev, nueva]
    );
    setShowModal(false);
  }

  function deleteRegla(id: string) {
    setReglasPers((prev) => prev.filter((r) => r.id !== id));
  }

  function toggleSistema(id: string) {
    // In production, this would persist; here just visual feedback
    alert(`Regla del sistema "${id}" — En producción puedes desactivarlas por empresa.`);
  }

  function probarReglas() {
    if (!testNombre) return;
    const upper = testNombre.toUpperCase();
    const monto = parseFloat(testMonto || '0');
    const allRules = [...reglasPers, ...REGLAS_SISTEMA];

    const prioOrd: ReglaPersonalizada['prioridad'][] = ['NIT_EXACTO', 'NOMBRE_EXACTO', 'KEYWORD', 'DEFAULT'];
    const sorted = allRules.sort((a, b) => prioOrd.indexOf(a.prioridad) - prioOrd.indexOf(b.prioridad));

    for (const r of sorted) {
      if (!r.activo) continue;
      if (r.prioridad === 'KEYWORD' && r.montoMin && !r.keywords.length) {
        if (monto >= r.montoMin) { setTestResult(r); return; }
        continue;
      }
      if (r.keywords.some((kw) => upper.includes(kw))) {
        if (r.montoMin && monto < r.montoMin) continue;
        setTestResult(r); return;
      }
    }
    setTestResult(null);
  }

  const allTabRules = activeTab === 'sistema' ? REGLAS_SISTEMA : reglasPers;

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Motor de Reglas</div>
          <div className="topbar-breadcrumb">
            <span>ContaGT</span> <span>›</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>Clasificación automática</span>
          </div>
        </div>
        <div className="topbar-actions">
          <button id="btn-nueva-regla" className="btn btn-primary btn-sm" onClick={openNew}>
            + Nueva Regla
          </button>
        </div>
      </div>

      <div className="page-content">
        <div className="alert alert-info" style={{ marginBottom: 20 }} id="reglas-info">
          <span>⚙️</span>
          <span style={{ fontSize: '0.85rem' }}>
            El motor de reglas clasifica automáticamente las facturas FEL por prioridad: <strong>NIT Exacto</strong> → <strong>Nombre Exacto</strong> → <strong>Palabra Clave</strong> → Default.
            Las reglas personalizadas tienen prioridad sobre las del sistema.
          </span>
        </div>

        {/* TABS */}
        <div className="tab-nav" id="reglas-tabs">
          <button className={`tab-btn ${activeTab === 'sistema' ? 'active' : ''}`} onClick={() => setActiveTab('sistema')} id="tab-sistema">
            🏭 Reglas del Sistema ({REGLAS_SISTEMA.length})
          </button>
          <button className={`tab-btn ${activeTab === 'personalizadas' ? 'active' : ''}`} onClick={() => setActiveTab('personalizadas')} id="tab-personalizadas">
            ✏️ Mis Reglas ({reglasPers.length})
          </button>
          <button className={`tab-btn ${activeTab === 'probar' ? 'active' : ''}`} onClick={() => setActiveTab('probar')} id="tab-probar">
            🧪 Probar Reglas
          </button>
        </div>

        {/* PROBAR REGLAS */}
        {activeTab === 'probar' && (
          <div className="card animate-fade-in-up" id="reglas-tester">
            <div className="card-header"><div className="card-title">🧪 Probar clasificación</div></div>
            <div className="card-body">
              <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
                Ingrese el nombre del emisor y monto de una factura para ver qué cuenta contable le asignaría el motor de reglas.
              </p>
              <div className="grid-2" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">Nombre del Emisor</label>
                  <input id="test-nombre" className="form-input" placeholder="ej. CLARO GUATEMALA S.A." value={testNombre} onChange={(e) => setTestNombre(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Monto Total (Q)</label>
                  <input id="test-monto" className="form-input" type="number" placeholder="ej. 1500.00" value={testMonto} onChange={(e) => setTestMonto(e.target.value)} />
                </div>
              </div>
              <button id="btn-probar" className="btn btn-primary" onClick={probarReglas}>🔍 Clasificar</button>

              {testResult && (
                <div style={{ marginTop: 20, padding: '16px', background: 'var(--color-primary-dim)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>✅ Resultado de clasificación:</div>
                  <div className="grid-2">
                    <div><span className="text-muted text-sm">Cuenta:</span><br /><strong>{testResult.accountCode} — {testResult.accountName}</strong></div>
                    <div><span className="text-muted text-sm">Tag Fiscal:</span><br /><strong>{testResult.taxTag}</strong></div>
                    <div><span className="text-muted text-sm">Regla aplicada:</span><br /><strong>{testResult.nombre}</strong></div>
                    <div><span className="text-muted text-sm">Prioridad:</span><br /><span className={`badge ${prioridadLabel[testResult.prioridad]?.cls}`}>{prioridadLabel[testResult.prioridad]?.label}</span></div>
                  </div>
                </div>
              )}
              {testNombre && testResult === null && (
                <div className="alert alert-warning" style={{ marginTop: 16 }}>
                  <span>⚠️</span><span>Ninguna regla coincide. Se usará cuenta por defecto: <strong>5001 — Gastos Generales</strong></span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* REGLAS TABLE */}
        {activeTab !== 'probar' && (
          <div className="card animate-fade-in-up" id="reglas-table">
            {activeTab === 'personalizadas' && reglasPers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">⚙️</div>
                <div className="empty-state-title">Sin reglas personalizadas</div>
                <div className="empty-state-desc">
                  Crea reglas propias para clasificar proveedores específicos de tu empresa con mayor precisión.
                </div>
                <button className="btn btn-primary" onClick={openNew} id="btn-primera-regla">+ Crear primera regla</button>
              </div>
            ) : (
              <div className="table-wrapper" style={{ borderRadius: 'var(--radius-lg)', border: 'none' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nombre de regla</th>
                      <th>Prioridad</th>
                      <th>Condición</th>
                      <th>Cuenta asignada</th>
                      <th>Tag fiscal</th>
                      <th>Estado</th>
                      {activeTab === 'personalizadas' && <th>Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {allTabRules.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.nombre}</td>
                        <td><span className={`badge ${prioridadLabel[r.prioridad]?.cls || 'badge-muted'}`}>{prioridadLabel[r.prioridad]?.label}</span></td>
                        <td style={{ maxWidth: 280 }}>
                          {r.nitEmisor && <div className="text-sm">NIT: <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>{r.nitEmisor}</code></div>}
                          {r.nombreContiene && <div className="text-sm">Nombre contiene: <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>{r.nombreContiene}</code></div>}
                          {r.keywords.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                              {r.keywords.slice(0, 4).map((kw) => (
                                <span key={kw} style={{ background: 'var(--color-surface-3)', padding: '1px 6px', borderRadius: 4, fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>{kw}</span>
                              ))}
                              {r.keywords.length > 4 && <span className="text-muted text-xs">+{r.keywords.length - 4} más</span>}
                            </div>
                          )}
                          {r.montoMin && <div className="text-xs text-muted" style={{ marginTop: 2 }}>Monto ≥ Q{r.montoMin.toLocaleString()}</div>}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.accountCode}</div>
                          <div className="text-xs text-muted">{r.accountName}</div>
                        </td>
                        <td>
                          <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-secondary)', background: 'var(--color-secondary-dim)', padding: '2px 6px', borderRadius: 4 }}>
                            {r.taxTag}
                          </code>
                        </td>
                        <td>
                          <span className={`badge ${r.activo ? 'badge-success' : 'badge-muted'}`}>
                            {r.activo ? '● Activa' : '○ Inactiva'}
                          </span>
                        </td>
                        {activeTab === 'personalizadas' && (
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)} id={`btn-edit-${r.id}`}>✏️</button>
                              <button className="btn btn-ghost btn-sm" onClick={() => deleteRegla(r.id)} id={`btn-del-${r.id}`} style={{ color: 'var(--color-danger)' }}>🗑</button>
                            </div>
                          </td>
                        )}
                        {activeTab === 'sistema' && (
                          <td>
                            <button className="btn btn-ghost btn-sm" onClick={() => toggleSistema(r.id)} style={{ fontSize: '0.75rem' }}>Configurar</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)} id="modal-regla">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editRegla.id?.startsWith('custom') || !editRegla.id ? 'Nueva Regla' : 'Editar Regla'}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)} id="btn-close-regla">✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Nombre de la regla</label>
                <input id="regla-nombre" className="form-input" placeholder="ej. Mi proveedor de insumos" value={editRegla.nombre || ''} onChange={(e) => setEditRegla((p) => ({ ...p, nombre: e.target.value }))} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Prioridad</label>
                  <select id="regla-prioridad" className="form-select" value={editRegla.prioridad} onChange={(e) => setEditRegla((p) => ({ ...p, prioridad: e.target.value as ReglaPersonalizada['prioridad'] }))}>
                    {PRIORIDADES.map((p) => <option key={p} value={p}>{prioridadLabel[p].label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Monto mínimo (opcional)</label>
                  <input id="regla-monto-min" className="form-input" type="number" placeholder="ej. 50000" value={editRegla.montoMin || ''} onChange={(e) => setEditRegla((p) => ({ ...p, montoMin: parseFloat(e.target.value) || undefined }))} />
                </div>
              </div>
              {editRegla.prioridad === 'NIT_EXACTO' && (
                <div className="form-group">
                  <label className="form-label">NIT Exacto del emisor</label>
                  <input id="regla-nit" className="form-input" placeholder="ej. 1234567-8" value={editRegla.nitEmisor || ''} onChange={(e) => setEditRegla((p) => ({ ...p, nitEmisor: e.target.value }))} />
                </div>
              )}
              {editRegla.prioridad === 'NOMBRE_EXACTO' && (
                <div className="form-group">
                  <label className="form-label">Nombre contiene (parcial)</label>
                  <input id="regla-nombre-contiene" className="form-input" placeholder="ej. DISTRIBUIDORA XYZ" value={editRegla.nombreContiene || ''} onChange={(e) => setEditRegla((p) => ({ ...p, nombreContiene: e.target.value }))} />
                </div>
              )}
              {editRegla.prioridad === 'KEYWORD' && (
                <div className="form-group">
                  <label className="form-label">Palabras clave (separadas por coma)</label>
                  <input id="regla-keywords" className="form-input" placeholder="ej. GASOLINERA, COMBUSTIBLE, DIESEL" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} />
                  <p className="text-xs text-muted" style={{ marginTop: 4 }}>Se buscarán estas palabras en el nombre del emisor y descripción de los items.</p>
                </div>
              )}
              <div className="divider" />
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Código de cuenta</label>
                  <input id="regla-codigo" className="form-input" placeholder="ej. 5201" value={editRegla.accountCode || ''} onChange={(e) => setEditRegla((p) => ({ ...p, accountCode: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre de cuenta</label>
                  <input id="regla-cuenta-nombre" className="form-input" placeholder="ej. Combustibles y Lubricantes" value={editRegla.accountName || ''} onChange={(e) => setEditRegla((p) => ({ ...p, accountName: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Tag fiscal</label>
                <select id="regla-tag" className="form-select" value={editRegla.taxTag || ''} onChange={(e) => setEditRegla((p) => ({ ...p, taxTag: e.target.value }))}>
                  {TAX_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button id="btn-guardar-regla" className="btn btn-primary" onClick={saveRegla} disabled={!editRegla.nombre || !editRegla.accountCode}>
                💾 Guardar Regla
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
