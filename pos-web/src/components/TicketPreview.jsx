import React from 'react';
import { formatCOP } from '../utils/formatCOP';
import '../styles/Modals.css';

export default function TicketPreview({ isOpen, order, onNewSale }) {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(order.createdAt || Date.now()).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  return (
    <div className="modal-overlay">
      <div
        className="modal-card"
        style={{
          maxWidth: '440px',
          width: "94%",
          background: "var(--bg-secondary, #111827)",
          border: "1px solid var(--border-strong)",
          borderRadius: "20px",
          boxShadow: "0 25px 65px -10px rgba(0,0,0,0.8)",
          overflow: "hidden"
        }}
      >
        <div className="modal-header">
          <div className="modal-title">
            <span>🧾</span>
            <span>Recibo de Venta</span>
          </div>
          <button type="button" className="btn-close-modal" onClick={onNewSale}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div className="modal-body" style={{ background: '#0a0504', padding: '1.25rem' }}>
          {/* TIQUETE TÉRMICO */}
          <div className="ticket-wrapper" id="printable-ticket">
            <div className="ticket-header">
              <div style={{ fontSize: '26px' }}>🌶️🔥</div>
              <div className="ticket-logo-text">LA DIABLA</div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px' }}>
                RESTAURANTE MEXICANO
              </div>
              <div style={{ fontSize: '10px', marginTop: '4px' }}>
                NIT: 901.458.239-1 • Régimen Común
              </div>
              <div style={{ fontSize: '10px' }}>
                Cra. 35 # 8A-42, Medellín, Antioquia
              </div>
              <div style={{ fontSize: '10px' }}>
                Tel: (+57) 314 888 2211
              </div>
            </div>

            <hr className="ticket-divider" />

            <div style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
              <span>ORDEN: <strong>{order.id || '#DIA-0001'}</strong></span>
              <span>{order.orderNumber ? `Mesa/Ped #${order.orderNumber}` : ''}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#444', marginTop: '2px' }}>
              FECHA: {formattedDate}
            </div>
            <div style={{ fontSize: '11px', color: '#444' }}>
              CAJERO: {order.cashier || 'Caja Principal'}
            </div>

            <hr className="ticket-divider" />

            <table className="ticket-table">
              <thead>
                <tr>
                  <th style={{ width: '45%' }}>DESCRIPCIÓN</th>
                  <th style={{ textAlign: 'center', width: '20%' }}>CANT</th>
                  <th style={{ textAlign: 'right', width: '35%' }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {order.items && order.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <div>{item.name}</div>
                      <div style={{ fontSize: '9px', color: '#666' }}>{formatCOP(item.price)}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>{item.qty}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatCOP(item.price * item.qty)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <hr className="ticket-divider" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>SUBTOTAL:</span>
                <span>{formatCOP(order.subtotal || order.total)}</span>
              </div>

              {order.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d00' }}>
                  <span>DESCUENTO:</span>
                  <span>-{formatCOP(order.discountAmount)}</span>
                </div>
              )}

              {order.taxAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>IVA (19%):</span>
                  <span>+{formatCOP(order.taxAmount)}</span>
                </div>
              )}

              <hr className="ticket-divider" />

              <div className="ticket-total-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span>TOTAL A PAGAR:</span>
                <span>{formatCOP(order.total)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', textTransform: 'uppercase' }}>
                <span>FORMA DE PAGO:</span>
                <span><strong>{order.method || 'Efectivo'}</strong></span>
              </div>

              {order.method === 'efectivo' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>RECIBIDO:</span>
                    <span>{formatCOP(order.cashReceived)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>CAMBIO / VUELTO:</span>
                    <span>{formatCOP(order.changeDue)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="ticket-footer">
              <p>¡Gracias por comer con la auténtica pasión mexicana!</p>
              <p style={{ marginTop: '3px', fontWeight: 700 }}>www.ladiabla.com</p>
              <p style={{ fontSize: '9px', marginTop: '6px' }}>Software POS La Diabla App</p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary-action" onClick={handlePrint}>
            <span className="material-symbols-rounded">print</span>
            <span>Imprimir Tiquete</span>
          </button>
          <button type="button" className="btn-primary-action" onClick={onNewSale}>
            <span className="material-symbols-rounded">add_circle</span>
            <span>Nueva Venta</span>
          </button>
        </div>
      </div>
    </div>
  );
}
