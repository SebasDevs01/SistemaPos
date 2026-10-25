import React from 'react';
import { formatCOP } from '../utils/formatCOP';
import '../styles/Modals.css';

export default function DailyHistoryModal({ isOpen, onClose, orders, stats, onSelectOrder }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{
          maxWidth: '640px',
          width: "94%",
          background: "var(--bg-secondary, #111827)",
          border: "1px solid var(--border-strong)",
          borderRadius: "20px",
          boxShadow: "0 25px 65px -10px rgba(0,0,0,0.8)",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title">
            <span className="material-symbols-rounded">history</span>
            <span>Historial de Órdenes del Día</span>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div className="modal-body">
          {/* STATS DE CAJA DEL DÍA */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <div style={{
              background: 'rgba(220, 38, 38, 0.12)',
              border: '1px solid rgba(220, 38, 38, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700 }}>VENTAS TOTALES</div>
              <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.4rem', color: '#22C55E', marginTop: '2px' }}>
                {formatCOP(stats.totalSalesToday)}
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--divider)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700 }}>ÓRDENES COBRADAS</div>
              <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.4rem', color: 'var(--text-main)', marginTop: '2px' }}>
                {stats.totalOrdersToday}
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--divider)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700 }}>TICKET PROMEDIO</div>
              <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.4rem', color: 'var(--accent-gold)', marginTop: '2px' }}>
                {formatCOP(stats.averageTicket)}
              </div>
            </div>
          </div>

          {/* LISTA DE ÓRDENES */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-dim)' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '36px', opacity: 0.5 }}>receipt_long</span>
                <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>Aún no se han registrado ventas hoy</p>
              </div>
            ) : (
              orders.map((order) => {
                const time = new Date(order.createdAt).toLocaleTimeString('es-CO', {
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={order.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'var(--card-bg)',
                      border: '1px solid var(--card-border)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{order.id}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>• {time}</span>
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          textTransform: 'uppercase'
                        }}>
                          {order.method}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {order.items ? order.items.map(i => `${i.qty}x ${i.name}`).join(', ') : ''}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', color: '#22C55E' }}>
                        {formatCOP(order.total)}
                      </div>
                      <button
                        type="button"
                        className="btn-header-action"
                        onClick={() => {
                          onClose();
                          onSelectOrder(order);
                        }}
                        title="Ver tiquete"
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>receipt</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary-action" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
