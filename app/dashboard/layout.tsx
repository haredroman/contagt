'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import OnboardingTutorial from '@/components/OnboardingTutorial';

const navItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard', badge: null },
  { href: '/dashboard/fel', icon: '📁', label: 'Cargar FEL', badge: null },
  { href: '/dashboard/compras', icon: '🛒', label: 'Libro de Compras', badge: null },
  { href: '/dashboard/ventas', icon: '💰', label: 'Libro de Ventas', badge: null },
  { href: '/dashboard/conciliacion', icon: '🏦', label: 'Conciliación Bancaria', badge: null },
  { href: '/dashboard/reglas', icon: '⚙️', label: 'Motor de Reglas', badge: null },
  { href: '/dashboard/reportes', icon: '📋', label: 'Reportes NIIF', badge: null },
  { href: '/dashboard/empresas', icon: '🏢', label: 'Empresas', badge: null },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-layout">
      {/* Onboarding interactive walkthrough */}
      <OnboardingTutorial />

      {/* SIDEBAR */}
      <aside className="sidebar" id="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🇬🇹</div>
          <div>
            <div className="sidebar-logo-text">ContaGT</div>
            <div className="sidebar-logo-sub">Fiscal · SAT · FEL</div>
          </div>
        </div>

        {/* Company selector */}
        <div className="sidebar-company" id="company-selector">
          <div className="sidebar-company-label">Empresa activa</div>
          <div className="sidebar-company-name">
            <span>Empresa Demo S.A.</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>▼</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
            NIT: 1234567-8 · Régimen General
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-nav-section">
            <span className="sidebar-nav-section-label">Módulos</span>
          </div>

          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                id={`nav-${item.href.split('/').pop()}`}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="nav-item-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge && (
                  <span className="nav-item-badge">{item.badge}</span>
                )}
              </Link>
            );
          })}

          <div className="sidebar-nav-section">
            <span className="sidebar-nav-section-label">Período</span>
          </div>

          <div
            style={{
              padding: '10px 12px',
              background: 'var(--color-surface-2)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>
              Período actual
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>
              {new Date().toLocaleDateString('es-GT', { month: 'long', year: 'numeric' })}
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                marginTop: 6,
                fontSize: '0.7rem',
                background: 'var(--color-success-dim)',
                color: 'var(--color-success)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                fontWeight: 600,
              }}
            >
              ● ABIERTO
            </div>
          </div>
        </nav>

        {/* Bottom user */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              background: 'var(--gradient-primary)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            C
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Contador Demo</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              contador@demo.gt
            </div>
          </div>
          <button
            id="logout-btn"
            className="btn-ghost btn btn-sm"
            title="Cerrar sesión"
            onClick={() => (window.location.href = '/login')}
          >
            ↪
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
