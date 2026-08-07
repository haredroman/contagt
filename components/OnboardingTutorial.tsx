'use client';

import { useState } from 'react';

export interface TutorialStep {
  title: string;
  description: string;
  targetId: string; // The HTML element ID to highlight/explain
  position: 'bottom' | 'top' | 'left' | 'right' | 'center';
}

const ONBOARDING_STEPS: TutorialStep[] = [
  {
    title: '👋 ¡Bienvenido a ContaGT!',
    description: 'Hemos preparado esta guía rápida de 1 minuto para mostrarte cómo automatizar la contabilidad de tu empresa de publicidad y ahorrar horas de trabajo.',
    targetId: 'sidebar',
    position: 'center'
  },
  {
    title: '🏢 Panel Multi-empresa',
    description: 'Aquí puedes cambiar de cliente o crear nuevas empresas. Recuerda que cada empresa tiene sus propios regímenes fiscales e impuestos asignados (General, Pequeño Contribuyente, Agente Retenedor).',
    targetId: 'company-selector',
    position: 'right'
  },
  {
    title: '📁 Carga Masiva de Facturas FEL (XML)',
    description: '¡Olvídate del registro manual! Aquí puedes arrastrar todos los XMLs que descargues del portal de la SAT. Nuestro motor los parseará y clasificará automáticamente.',
    targetId: 'nav-fel',
    position: 'right'
  },
  {
    title: '📗 Libro de Compras Inteligente',
    description: 'Aquí verás el Libro de Compras. Lo más valioso para ti es que clasifica automáticamente cada compra en BIEN, SERVICIO o COMBUSTIBLE, calcula la columna BASE y pinta en rojo las facturas "mezcladas".',
    targetId: 'nav-compras',
    position: 'right'
  },
  {
    title: '⚙️ Motor de Reglas',
    description: 'Configura tus propias reglas. Por ejemplo, define que cualquier factura del NIT de un diseñador freelance se asigne a la cuenta "Honorarios Profesionales" con un 100% de confianza.',
    targetId: 'nav-reglas',
    position: 'right'
  },
  {
    title: '🏛️ Cuadre Diario de IVA',
    description: 'El sistema valida automáticamente todos los días tus compras registradas contra el portal de la SAT para avisarte de discrepancias al instante.',
    targetId: 'iva-status-bar',
    position: 'top'
  },
  {
    title: '🚀 ¡Todo listo!',
    description: 'Estás listo para usar ContaGT. Empieza por ir a la sección "Cargar FEL" y presiona el botón "Cargar datos de demostración" para ver el motor en acción.',
    targetId: 'cta-cargar-fel',
    position: 'bottom'
  }
];

export default function OnboardingTutorial() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Check if onboarding needs to be shown (triggered from login/register)
  useState(() => {
    if (typeof window !== 'undefined') {
      const shouldShow = localStorage.getItem('showOnboardingTutorial');
      if (shouldShow === 'true') {
        setIsOpen(true);
      }
    }
  });

  const step = ONBOARDING_STEPS[currentStep];

  function handleNext() {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      closeTutorial();
    }
  }

  function handlePrev() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }

  function closeTutorial() {
    setIsOpen(false);
    localStorage.removeItem('showOnboardingTutorial');
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s ease'
      }}
    >
      <div
        className="card animate-scale-in"
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-primary)',
          boxShadow: '0 20px 50px rgba(59, 130, 246, 0.25)',
          padding: '24px',
          borderRadius: 'var(--radius-lg)',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-primary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Guía de Inicio ({currentStep + 1} de {ONBOARDING_STEPS.length})
          </span>
          <button
            onClick={closeTutorial}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '1rem' }}
          >
            ✕
          </button>
        </div>

        {/* Title */}
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 10, color: 'var(--color-text-primary)' }}>
          {step.title}
        </h3>

        {/* Description */}
        <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
          {step.description}
        </p>

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={closeTutorial}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.75rem' }}
          >
            Omitir tutorial
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="btn btn-secondary btn-sm"
              >
                Atrás
              </button>
            )}
            <button
              onClick={handleNext}
              className="btn btn-primary btn-sm"
              id="tutorial-next-btn"
            >
              {currentStep === ONBOARDING_STEPS.length - 1 ? '¡Entendido!' : 'Siguiente →'}
            </button>
          </div>
        </div>

        {/* Decorative Indicator pointing to the target element if needed */}
        {step.targetId && step.position !== 'center' && (
          <div
            style={{
              position: 'absolute',
              background: 'var(--color-primary)',
              color: 'white',
              fontSize: '0.65rem',
              fontWeight: 'bold',
              padding: '2px 8px',
              borderRadius: '4px',
              top: '-10px',
              left: '20px',
              boxShadow: '0 0 10px var(--color-primary-glow)'
            }}
          >
            Foco: #{step.targetId}
          </div>
        )}
      </div>
    </div>
  );
}
