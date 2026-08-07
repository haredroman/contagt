'use client';

import { useState } from 'react';

interface Empresa {
  id: string;
  nombre: string;
  nombreComercial: string;
  nit: string;
  regimen: 'GENERAL' | 'PEQUENO_CONTRIBUYENTE' | 'EXENTO';
  esAgenteRetenedor: boolean;
  departamento: string;
  municipio: string;
  telefono: string;
  email: string;
  activa: boolean;
  usuariosCount: number;
  documentosMes: number;
}

const MOCK_EMPRESAS: Empresa[] = [
  { id: '1', nombre: 'Empresa Demo S.A.', nombreComercial: 'Demo SA', nit: '1234567-8', regimen: 'GENERAL', esAgenteRetenedor: false, departamento: 'Guatemala', municipio: 'Guatemala', telefono: '2222-3333', email: 'contador@demo.gt', activa: true, usuariosCount: 3, documentosMes: 89 },
  { id: '2', nombre: 'Comercial El Roble S.A.', nombreComercial: 'El Roble', nit: '8765432-1', regimen: 'GENERAL', esAgenteRetenedor: true, departamento: 'Quetzaltenango', municipio: 'Quetzaltenango', telefono: '7777-8888', email: 'contabilidad@roble.gt', activa: true, usuariosCount: 1, documentosMes: 45 },
  { id: '3', nombre: 'Tienda El Progreso', nombreComercial: 'El Progreso', nit: '9876543-2', regimen: 'PEQUENO_CONTRIBUYENTE', esAgenteRetenedor: false, departamento: 'Escuintla', municipio: 'Escuintla', telefono: '7654-3210', email: 'tienda@progreso.gt', activa: true, usuariosCount: 1, documentosMes: 12 },
];

const REGIMEN_LABELS: Record<string, { label: string; cls: string }> = {
  GENERAL: { label: 'Régimen General', cls: 'badge-primary' },
  PEQUENO_CONTRIBUYENTE: { label: 'Pequeño Contribuyente', cls: 'badge-info' },
  EXENTO: { label: 'Exento', cls: 'badge-muted' },
};

const DEPARTAMENTOS = ['Guatemala', 'Quetzaltenango', 'Escuintla', 'Sacatepéquez', 'Chimaltenango', 'Alta Verapaz', 'Baja Verapaz', 'Huehuetenango', 'San Marcos', 'Totonicapán', 'Sololá', 'Retalhuleu', 'Suchitepéquez', 'Jutiapa', 'Jalapa', 'Chiquimula', 'Zacapa', 'Izabal', 'El Progreso', 'El Quiché', 'Petén', 'Santa Rosa'];

const BLANK: Partial<Empresa> = { nombre: '', nombreComercial: '', nit: '', regimen: 'GENERAL', esAgenteRetenedor: false, departamento: 'Guatemala', municipio: '', telefono: '', email: '', activa: true };

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>(MOCK_EMPRESAS);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Partial<Empresa>>(BLANK);
  const [activeId, setActiveId] = useState('1');
  const [saving, setSaving] = useState(false);

  function openNew() { setForm({ ...BLANK }); setShowModal(true); }
  function openEdit(e: Empresa) { setForm({ ...e }); setShowModal(true); }

  async function save() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    if (form.id) {
      setEmpresas((prev) => prev.map((e) => (e.id === form.id ? { ...e, ...form } as Empresa : e)));
    } else {
      const nueva: Empresa = { ...(form as Empresa), id: `emp-${Date.now()}`, usuariosCount: 1, documentosMes: 0 };
      setEmpresas((prev) => [...prev, nueva]);
    }
    setSaving(false);
    setShowModal(false);
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Gestión de Empresas</div>
          <div className="topbar-breadcrumb">
            <span>ContaGT</span> <span>›</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>Multi-empresa</span>
          </div>
        </div>
        <div className="topbar-actions">
          <button id="btn-nueva-empresa" className="btn btn-primary btn-sm" onClick={openNew}>
            + Agregar empresa
          </button>
        </div>
      </div>

      <div className="page-content">
        <div className="alert alert-info" style={{ marginBottom: 20 }}>
          <span>🏢</span>
          <span className="text-sm">
            Como contador, puedes gestionar múltiples empresas desde una sola cuenta. Cada empresa tiene su propio catálogo de cuentas, reglas de clasificación y períodos contables.
          </span>
        </div>

        {/* EMPRESA CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16, marginBottom: 24 }} id="empresas-grid">
          {empresas.map((emp) => (
            <div
              key={emp.id}
              className="card"
              style={{
                padding: 0,
                overflow: 'hidden',
                cursor: 'pointer',
                border: activeId === emp.id ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                transition: 'var(--transition-normal)',
              }}
              onClick={() => setActiveId(emp.id)}
              id={`empresa-card-${emp.id}`}
            >
              {/* Card header stripe */}
              <div style={{ height: 4, background: activeId === emp.id ? 'var(--gradient-primary)' : 'var(--color-surface-3)' }} />

              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{emp.nombre}</div>
                    <div className="text-muted text-sm">NIT: {emp.nit}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span className={`badge ${REGIMEN_LABELS[emp.regimen]?.cls}`}>
                      {REGIMEN_LABELS[emp.regimen]?.label}
                    </span>
                    {emp.esAgenteRetenedor && (
                      <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>🏛️ Agente Retenedor</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: 'Departamento', val: emp.departamento },
                    { label: 'Teléfono', val: emp.telefono },
                    { label: 'Documentos mes', val: emp.documentosMes.toString() },
                    { label: 'Usuarios', val: emp.usuariosCount.toString() },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ background: 'var(--color-surface-2)', padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{val}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    onClick={(e) => { e.stopPropagation(); setActiveId(emp.id); }}
                    id={`btn-seleccionar-${emp.id}`}
                  >
                    {activeId === emp.id ? '✓ Seleccionada' : 'Seleccionar'}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => { e.stopPropagation(); openEdit(emp); }}
                    id={`btn-editar-empresa-${emp.id}`}
                  >
                    ✏️ Editar
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add new card */}
          <div
            className="card"
            style={{ padding: '32px 20px', textAlign: 'center', cursor: 'pointer', border: '2px dashed var(--color-border)', background: 'transparent', minHeight: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'var(--transition-fast)' }}
            onClick={openNew}
            id="btn-add-empresa-card"
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-dim)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <div style={{ fontSize: '2rem', marginBottom: 12, opacity: 0.5 }}>+</div>
            <div style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Agregar empresa</div>
            <div className="text-sm text-muted" style={{ marginTop: 4 }}>Gestiona múltiples clientes</div>
          </div>
        </div>

        {/* RBAC INFO */}
        <div className="card" id="rbac-card">
          <div className="card-header"><div className="card-title">🔐 Control de Acceso (RBAC)</div></div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { rol: 'Dueño', icon: '👑', permisos: ['Administración total', 'Configuración empresa', 'Gestión de usuarios', 'Ver y exportar todo', 'Cerrar períodos'] },
                { rol: 'Contador', icon: '📊', permisos: ['Cargar documentos FEL', 'Crear asientos', 'Ver libros contables', 'Exportar reportes', 'Configurar reglas'] },
                { rol: 'Auditor', icon: '🔍', permisos: ['Solo lectura', 'Ver todos los asientos', 'Ver audit log', 'Exportar reportes', 'Sin modificaciones'] },
              ].map(({ rol, icon, permisos }) => (
                <div key={rol} style={{ background: 'var(--color-surface-2)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1.2rem' }}>{icon}</span> {rol}
                  </div>
                  <ul style={{ paddingLeft: 16, fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
                    {permisos.map((p) => <li key={p}>{p}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)} id="modal-empresa">
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div className="modal-title">{form.id ? 'Editar Empresa' : 'Nueva Empresa'}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)} id="btn-close-empresa">✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Razón Social *</label>
                  <input id="emp-nombre" className="form-input" placeholder="Empresa S.A." value={form.nombre || ''} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre Comercial</label>
                  <input id="emp-comercial" className="form-input" placeholder="Nombre de uso diario" value={form.nombreComercial || ''} onChange={(e) => setForm((p) => ({ ...p, nombreComercial: e.target.value }))} />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">NIT *</label>
                  <input id="emp-nit" className="form-input" placeholder="1234567-8" value={form.nit || ''} onChange={(e) => setForm((p) => ({ ...p, nit: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Régimen Fiscal *</label>
                  <select id="emp-regimen" className="form-select" value={form.regimen} onChange={(e) => setForm((p) => ({ ...p, regimen: e.target.value as Empresa['regimen'] }))}>
                    <option value="GENERAL">Régimen General</option>
                    <option value="PEQUENO_CONTRIBUYENTE">Pequeño Contribuyente</option>
                    <option value="EXENTO">Exento</option>
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Departamento</label>
                  <select id="emp-depto" className="form-select" value={form.departamento} onChange={(e) => setForm((p) => ({ ...p, departamento: e.target.value }))}>
                    {DEPARTAMENTOS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Municipio</label>
                  <input id="emp-municipio" className="form-input" placeholder="Municipio" value={form.municipio || ''} onChange={(e) => setForm((p) => ({ ...p, municipio: e.target.value }))} />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input id="emp-telefono" className="form-input" placeholder="2222-3333" value={form.telefono || ''} onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Correo Electrónico</label>
                  <input id="emp-email" className="form-input" type="email" placeholder="contador@empresa.gt" value={form.email || ''} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <input
                  id="emp-agente-retenedor"
                  type="checkbox"
                  checked={form.esAgenteRetenedor || false}
                  onChange={(e) => setForm((p) => ({ ...p, esAgenteRetenedor: e.target.checked }))}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                />
                <div>
                  <label htmlFor="emp-agente-retenedor" style={{ fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>
                    🏛️ Agente Retenedor de IVA
                  </label>
                  <p className="text-xs text-muted">Activa la retención automática de IVA en facturas &gt; Q2,500</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button id="btn-guardar-empresa" className="btn btn-primary" onClick={save} disabled={!form.nombre || !form.nit || saving}>
                {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Guardando...</> : '💾 Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
