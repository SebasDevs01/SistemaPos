import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './index.css'
import './styles/iosLiquidGlass.css'
import App from './App.jsx'
import { flushPendingOps } from './services/firestoreService.js'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('App crash:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', background: '#0f172a', color: '#f1f5f9',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '2rem', fontFamily: 'sans-serif'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#f43f5e' }}>
            Error al cargar la aplicación
          </h1>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem', textAlign: 'center', maxWidth: '500px' }}>
            {this.state.error?.message || 'Error desconocido'}
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                background: '#10b981', color: '#fff', border: 'none',
                padding: '10px 22px', borderRadius: '10px', fontSize: '1rem',
                cursor: 'pointer', fontWeight: 700
              }}
            >
              ▶️ Reanudar aplicación
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#e11d48', color: '#fff', border: 'none',
                padding: '10px 22px', borderRadius: '10px', fontSize: '1rem',
                cursor: 'pointer', fontWeight: 700
              }}
            >
              🔄 Recargar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)

// ─── Registro del Service Worker (segundo plano + soporte offline) ─────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('[SW] Service Worker registrado correctamente. Scope:', registration.scope);

      // Verificar actualizaciones del Service Worker cada 30 segundos en segundo plano
      setInterval(() => {
        registration.update();
      }, 30 * 1000);

      // Escuchar eventos de nuevo Service Worker activo
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] Nuevo Service Worker tomó control. Notificando deploy...');
        window.dispatchEvent(new CustomEvent('pos_new_deploy_detected'));
      });

      // Escuchar mensajes del Service Worker
      navigator.serviceWorker.addEventListener('message', async (event) => {
        if (!event.data) return;

        if (event.data.type === 'NEW_VERSION_AVAILABLE') {
          console.log('[SW → App] 🚀 Nuevo deploy detectado. Notificando aplicación...');
          window.dispatchEvent(new CustomEvent('pos_new_deploy_detected'));
        }

        if (event.data.type === 'SYNC_PENDING_OPS') {
          console.log('[SW → App] Solicitud de sincronización recibida desde el Service Worker.');
          try {
            const result = await flushPendingOps();
            if (result.flushed > 0) {
              console.log(`[SW → App] ✅ ${result.flushed} operaciones pendientes sincronizadas.`);
            }
          } catch (e) {
            console.warn('[SW → App] Error al sincronizar pendientes:', e);
          }
        }
      });

    } catch (error) {
      console.warn('[SW] No se pudo registrar el Service Worker:', error);
    }
  });
}
