'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

const REGIMENES = [
  { value: 'GENERAL', label: 'Régimen General (IVA 12%)' },
  { value: 'PEQUENO_CONTRIBUYENTE', label: 'Pequeño Contribuyente' },
  { value: 'EXENTO', label: 'Exento' },
];

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ nombre: '', email: '', password: '', confirm: '', empresa: '', nit: '', regimen: 'GENERAL' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleNext() {
    if (step === 1) {
      if (!form.nombre || !form.email || !form.password) { setError('Todos los campos son obligatorios'); return; }
      if (form.password !== form.confirm) { setError('Las contraseñas no coinciden'); return; }
      if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }
      setError(''); setStep(2);
    } else {
      if (!form.empresa || !form.nit) { setError('Ingrese el nombre y NIT de su empresa'); return; }
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: form.nombre,
            email: form.email,
            password: form.password,
            empresa: form.empresa,
            nit: form.nit,
            regimen: form.regimen,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'No se pudo crear la cuenta');
          return;
        }

        const login = await signIn('credentials', {
          email: form.email,
          password: form.password,
          redirect: false,
          callbackUrl: '/dashboard',
        });
        if (login?.error) {
          setError('Cuenta creada, pero no se pudo iniciar sesión automáticamente. Ingrese desde login.');
          return;
        }
        localStorage.setItem('showOnboardingTutorial', 'true');
        window.location.href = '/dashboard';
      } catch {
        setError('Error de conexión creando la cuenta. Intente de nuevo.');
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-bg-glow primary" />
      <div className="auth-bg-glow secondary" />

      <div className="auth-card animate-fade-in-up" style={{ maxWidth: 480 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">🇬🇹</div>
          <h1 className="auth-title">ContaGT</h1>
          <p className="auth-subtitle">Crea tu cuenta gratuita</p>
        </div>

        {/* Steps indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {[{ n: 1, label: 'Tu cuenta' }, { n: 2, label: 'Tu empresa' }].map(({ n, label }) => (
            <div key={n} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                height: 3, borderRadius: 2, marginBottom: 6,
                background: n <= step ? 'var(--gradient-primary)' : 'var(--color-surface-3)',
                transition: 'background 0.3s',
              }} />
              <span style={{ fontSize: '0.72rem', color: n <= step ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: 600 }}>
                {n}. {label}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        {step === 1 && (
          <div className="auth-form" id="step-1">
            <div className="form-group">
              <label htmlFor="reg-nombre" className="form-label">Nombre completo</label>
              <input id="reg-nombre" className="form-input" placeholder="Juan Pérez García" value={form.nombre} onChange={(e) => update('nombre', e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="reg-email" className="form-label">Correo electrónico</label>
              <input id="reg-email" type="email" className="form-input" placeholder="juan@empresa.com.gt" value={form.email} onChange={(e) => update('email', e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="reg-password" className="form-label">Contraseña</label>
              <input id="reg-password" type="password" className="form-input" placeholder="Mínimo 8 caracteres" value={form.password} onChange={(e) => update('password', e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="reg-confirm" className="form-label">Confirmar contraseña</label>
              <input id="reg-confirm" type="password" className="form-input" placeholder="Repita su contraseña" value={form.confirm} onChange={(e) => update('confirm', e.target.value)} />
            </div>
            <button id="btn-next-step" className="btn btn-primary w-full btn-lg" onClick={handleNext}>
              Continuar →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="auth-form" id="step-2">
            <div className="form-group">
              <label htmlFor="reg-empresa" className="form-label">Nombre de la empresa / razón social</label>
              <input id="reg-empresa" className="form-input" placeholder="Mi Empresa S.A." value={form.empresa} onChange={(e) => update('empresa', e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="reg-nit" className="form-label">NIT de la empresa</label>
              <input id="reg-nit" className="form-input" placeholder="1234567-8" value={form.nit} onChange={(e) => update('nit', e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="reg-regimen" className="form-label">Régimen fiscal</label>
              <select id="reg-regimen" className="form-select" value={form.regimen} onChange={(e) => update('regimen', e.target.value)}>
                {REGIMENES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(1)}>← Atrás</button>
              <button id="btn-register" className="btn btn-primary" style={{ flex: 2 }} onClick={handleNext} disabled={loading}>
                {loading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Creando cuenta...</> : '🚀 Crear cuenta'}
              </button>
            </div>
          </div>
        )}

        <div className="divider" style={{ margin: '20px 0 16px' }} />
        <p className="text-sm text-muted" style={{ textAlign: 'center' }}>
          ¿Ya tiene cuenta? <Link href="/login" style={{ color: 'var(--color-primary)' }}>Iniciar sesión</Link>
        </p>
      </div>
    </main>
  );
}
