'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        localStorage.setItem('showOnboardingTutorial', 'true');
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError('Error al iniciar sesión. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    await signIn('google', { callbackUrl });
  }

  return (
    <main className="auth-page">
      <div className="auth-bg-glow primary" />
      <div className="auth-bg-glow secondary" />

      <div className="auth-card animate-fade-in-up">
        <div className="auth-logo">
          <div className="auth-logo-icon">🇬🇹</div>
          <h1 className="auth-title">ContaGT</h1>
          <p className="auth-subtitle">Contabilidad Fiscal Automatizada para Guatemala</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} id="login-form">
          {error && (
            <div className="alert alert-danger" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">Correo Electrónico</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="contador@empresa.com.gt"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Contraseña</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary w-full btn-lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16 }} />
                Ingresando...
              </>
            ) : (
              'Ingresar al Sistema'
            )}
          </button>

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14 }}>
            ¿No tiene cuenta?{' '}
            <Link
              href="/register"
              style={{ color: 'var(--color-primary)' }}
            >
              Registrarse gratis
            </Link>
          </p>

          <div className="divider" style={{ margin: '24px 0 16px' }} />

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="btn btn-secondary w-full"
            style={{ marginBottom: 24 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: 8 }}>
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuar con Google
          </button>

          {/* Demo badge */}
          <div className="alert alert-info" style={{ justifyContent: 'center', textAlign: 'center' }}>
            <span>🎯</span>
            <span style={{ fontSize: '0.78rem' }}>
              <strong>Demo:</strong> Use contador@demo.gt / ContaGT2025! para entrar
            </span>
          </div>
        </form>

        <div className="divider" style={{ margin: '24px 0 16px' }} />

        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          {['🔒 AES-256', '🇬🇹 FEL SAT', '📊 NIIF PYMES', '⚡ Multi-empresa'].map((badge) => (
            <span
              key={badge}
              style={{
                fontSize: '0.72rem',
                color: 'var(--color-text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {badge}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="auth-page"><div className="spinner" /></main>}>
      <LoginContent />
    </Suspense>
  );
}
