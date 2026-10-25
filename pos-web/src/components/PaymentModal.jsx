import React, { useState } from 'react';
import { formatCOP } from '../utils/formatCOP';
import '../styles/Modals.css';

export default function PaymentModal({
  isOpen,
  onClose,
  totalAmount,
  cartItems,
  onConfirmPayment,
  orderNumber
}) {
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [cashReceived, setCashReceived] = useState('');

  if (!isOpen) return null;

  const cashNum = parseFloat(cashReceived) || 0;
  const changeDue = Math.max(0, cashNum - totalAmount);
  const isCashSufficient = cashNum >= totalAmount;

  const handleConfirm = () => {
    if (paymentMethod === 'efectivo' && !isCashSufficient) return;

    onConfirmPayment({
      method: paymentMethod,
      total: totalAmount,
      cashReceived: paymentMethod === 'efectivo' ? cashNum : totalAmount,
      changeDue: paymentMethod === 'efectivo' ? changeDue : 0,
      items: [...cartItems],
      orderNumber
    });
  };

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
        {/* HEADER */}
        <div className="modal-header">
          <div className="modal-title">
            <span>🔥</span>
            <span>Cobrar Pedido #{orderNumber}</span>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {/* BODY */}
        <div className="modal-body">
          {/* TOTAL A PAGAR */}
          <div className="payment-amount-box">
            <div className="payment-amount-label">Total a Cobrar</div>
            <div className="payment-amount-val">{formatCOP(totalAmount)}</div>
          </div>

          {/* SELECTOR DE MÉTODO DE PAGO */}
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '8px', display: 'block' }}>
              MÉTODO DE PAGO
            </label>
            <div className="payment-methods-grid">
              <button
                type="button"
                className={`btn-payment-method ${paymentMethod === 'efectivo' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('efectivo')}
              >
                <span className="method-icon">💵</span>
                <span>Efectivo</span>
              </button>

              <button
                type="button"
                className={`btn-payment-method ${paymentMethod === 'tarjeta' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('tarjeta')}
              >
                <span className="method-icon">💳</span>
                <span>Tarjeta / Datafono</span>
              </button>

              <button
                type="button"
                className={`btn-payment-method ${paymentMethod === 'nequi' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('nequi')}
              >
                <span className="method-icon">📱</span>
                <span>Nequi / Transfer</span>
              </button>
            </div>
          </div>

          {/* INPUTS ESPECÍFICOS PARA EFECTIVO */}
          {paymentMethod === 'efectivo' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                  Efectivo recibido del cliente:
                </label>
                <input
                  type="number"
                  className="search-input"
                  style={{ fontSize: '1.25rem', fontFamily: 'var(--font-mono)', textAlign: 'right' }}
                  placeholder="Ej: 50000"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  autoFocus
                />
              </div>

              {/* ATAJOS RÁPIDOS */}
              <div className="cash-shortcuts">
                <button
                  type="button"
                  className="btn-cash-chip"
                  onClick={() => setCashReceived(String(totalAmount))}
                >
                  Exacto ({formatCOP(totalAmount)})
                </button>
                {[20000, 50000, 100000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    className="btn-cash-chip"
                    onClick={() => setCashReceived(String(val))}
                  >
                    {formatCOP(val)}
                  </button>
                ))}
              </div>

              {/* VUELTO O FALTANTE */}
              {cashReceived !== '' && (
                <div className={`change-due-box ${isCashSufficient ? 'ready' : 'insufficient'}`}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    {isCashSufficient ? 'Vuelto / Cambio a entregar:' : 'Falta dinero:'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-title)', fontSize: '1.4rem' }}>
                    {isCashSufficient
                      ? formatCOP(changeDue)
                      : formatCOP(totalAmount - cashNum)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div style={{
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--divider)',
              textAlign: 'center',
              fontSize: '0.88rem',
              color: 'var(--text-muted)'
            }}>
              <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                Pago electrónico seleccionado ({paymentMethod === 'tarjeta' ? 'Tarjeta' : 'Nequi'})
              </p>
              <p>Verifica la transacción en el datáfono o celular antes de confirmar la venta.</p>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="modal-footer">
          <button type="button" className="btn-secondary-action" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary-action"
            disabled={paymentMethod === 'efectivo' && !isCashSufficient}
            onClick={handleConfirm}
          >
            <span className="material-symbols-rounded">check_circle</span>
            <span>Confirmar Cobro</span>
          </button>
        </div>
      </div>
    </div>
  );
}
