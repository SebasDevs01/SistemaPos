import React from 'react';
import { formatCOP } from '../utils/formatCOP';

export default function CartItem({ item, onUpdateQty, onRemove }) {
  const subtotal = item.price * item.qty;

  return (
    <div className="cart-item-row">
      <img
        src={item.imageUrl}
        alt={item.name}
        className="cart-item-thumb"
        loading="lazy"
      />

      <div className="cart-item-info">
        <h4 className="cart-item-name" title={item.name}>
          {item.name}
        </h4>
        <div className="cart-item-unit-price">
          {formatCOP(item.price)} c/u
        </div>
      </div>

      <div className="cart-item-controls">
        <button
          type="button"
          className="btn-qty"
          onClick={() => {
            if (item.qty > 1) {
              onUpdateQty(item.id, item.qty - 1);
            } else {
              onRemove(item.id);
            }
          }}
          title="Disminuir cantidad"
        >
          <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>remove</span>
        </button>

        <span className="cart-item-qty">{item.qty}</span>

        <button
          type="button"
          className="btn-qty"
          onClick={() => onUpdateQty(item.id, item.qty + 1)}
          title="Aumentar cantidad"
        >
          <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>add</span>
        </button>
      </div>

      <div className="cart-item-subtotal">
        {formatCOP(subtotal)}
      </div>

      <button
        type="button"
        className="btn-remove-item"
        onClick={() => onRemove(item.id)}
        title="Quitar platillo"
      >
        <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>delete</span>
      </button>
    </div>
  );
}
