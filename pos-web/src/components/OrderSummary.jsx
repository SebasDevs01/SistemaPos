import React from 'react';
import { formatCOP } from '../utils/formatCOP';
import '../styles/Modals.css';

export default function OrderSummary({ isOpen, onClose, cart, totals, onProceedToPayment }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{
          maxWidth: "520px",
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
            <span className="material-symbols-rounded">receipt_long</span>
            <span>Resumen del Pedido</span>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {cart.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: 'var(--card-bg)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--divider)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {item.qty} x {formatCOP(item.price)}
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.05rem', color: 'var(--accent-gold)' }}>
                  {formatCOP(item.price * item.qty)}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span>Subtotal:</span>
              <span>{formatCOP(totals.subtotal)}</span>
            </div>
            {totals.discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#EF4444' }}>
                <span>Descuento:</span>
                <span>-{formatCOP(totals.discountAmount)}</span>
              </div>
            )}
            {totals.taxAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>IVA (19%):</span>
                <span>+{formatCOP(totals.taxAmount)}</span>
              </div>
            )}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              borderTop: '1px solid var(--divider)',
              paddingTop: '8px',
              marginTop: '4px'
            }}>
              <span style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem' }}>TOTAL:</span>
              <span style={{ fontFamily: 'var(--font-title)', fontSize: '1.6rem', color: '#22C55E' }}>
                {formatCOP(totals.total)}
              </span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary-action" onClick={onClose}>
            Modificar
          </button>
          <button
            type="button"
            className="btn-primary-action"
            onClick={() => {
              onClose();
              onProceedToPayment();
            }}
          >
            <span className="material-symbols-rounded">arrow_forward</span>
            <span>Continuar a Cobro</span>
          </button>
        </div>
      </div>
    </div>
  );
}
