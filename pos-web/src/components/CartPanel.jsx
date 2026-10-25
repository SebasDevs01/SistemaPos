import React, { useState, useEffect } from 'react';
import CartItem from './CartItem';
import { formatCOP } from '../utils/formatCOP';
import '../styles/CartPanel.css';

export default function CartPanel({
  cart,
  orderNumber,
  discountType,
  discountValue,
  taxEnabled,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onApplyDiscount,
  onToggleTax,
  onOpenCheckout,
  isMobileDrawerOpen = false,
  onCloseMobileDrawer
}) {
  const [bounceTotal, setBounceTotal] = useState(false);

  // Calcular totales
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);

  let discountAmount = 0;
  if (discountType === 'percent') {
    discountAmount = (subtotal * discountValue) / 100;
  } else {
    discountAmount = discountValue;
  }
  discountAmount = Math.min(subtotal, Math.max(0, discountAmount));

  const discountedSubtotal = subtotal - discountAmount;
  const taxAmount = taxEnabled ? discountedSubtotal * 0.19 : 0;
  const finalTotal = Math.round(discountedSubtotal + taxAmount);

  const itemCount = cart.reduce((acc, item) => acc + item.qty, 0);

  // Micro-animación de rebote al cambiar el total
  useEffect(() => {
    if (finalTotal > 0) {
      setBounceTotal(true);
      const timer = setTimeout(() => setBounceTotal(false), 400);
      return () => clearTimeout(timer);
    }
  }, [finalTotal]);

  return (
    <aside className={`pos-cart-column ${isMobileDrawerOpen ? 'drawer-open' : ''}`}>
      {/* Manija de arrastre para móviles */}
      <div className="mobile-drawer-close-bar" onClick={onCloseMobileDrawer}>
        <div className="drawer-handle" />
      </div>

      {/* HEADER DEL CARRITO */}
      <div className="cart-header">
        <div className="cart-order-badge">
          <span style={{ fontSize: '1.2rem' }}>🧾</span>
          <h3 className="cart-order-title">Pedido #{orderNumber}</h3>
          {itemCount > 0 && (
            <span className="cart-order-count">{itemCount}</span>
          )}
        </div>

        {cart.length > 0 && (
          <button
            type="button"
            className="btn-clear-cart"
            onClick={onClearCart}
            title="Limpiar todo el pedido"
          >
            <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>delete_sweep</span>
            <span>Limpiar</span>
          </button>
        )}
      </div>

      {/* LISTA DE ITEMS */}
      <div className="cart-items-list">
        {cart.length === 0 ? (
          <div className="cart-empty-state">
            <span className="material-symbols-rounded cart-empty-icon">shopping_bag</span>
            <div className="cart-empty-title">Tu orden está vacía</div>
            <div className="cart-empty-subtitle">Agrega platillos del menú para comenzar</div>
          </div>
        ) : (
          cart.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              onUpdateQty={onUpdateQty}
              onRemove={onRemoveItem}
            />
          ))
        )}
      </div>

      {/* FOOTER DEL RESUMEN Y COBRO */}
      <div className="cart-footer">
        {/* DESCUENTO */}
        <div className="cart-discount-section">
          <div className="discount-row">
            <div className="discount-toggle-btns">
              <button
                type="button"
                className={`btn-discount-mode ${discountType === 'percent' ? 'active' : ''}`}
                onClick={() => onApplyDiscount('percent', discountValue)}
              >
                %
              </button>
              <button
                type="button"
                className={`btn-discount-mode ${discountType === 'fixed' ? 'active' : ''}`}
                onClick={() => onApplyDiscount('fixed', discountValue)}
              >
                $
              </button>
            </div>
            <input
              type="number"
              className="discount-input"
              placeholder={discountType === 'percent' ? 'Descuento (%)' : 'Descuento ($ COP)'}
              value={discountValue || ''}
              onChange={(e) => onApplyDiscount(discountType, e.target.value)}
              min="0"
            />
          </div>

          {/* IVA TOGGLE */}
          <div className="tax-toggle-row">
            <label className="tax-switch-label">
              <input
                type="checkbox"
                className="tax-switch-checkbox"
                checked={taxEnabled}
                onChange={(e) => onToggleTax(e.target.checked)}
              />
              <span>Incluir IVA (19%)</span>
            </label>
            {taxEnabled && (
              <span>+{formatCOP(taxAmount)}</span>
            )}
          </div>
        </div>

        {/* LÍNEAS DE TOTALES */}
        <div className="cart-summary-line">
          <span>Subtotal</span>
          <span>{formatCOP(subtotal)}</span>
        </div>

        {discountAmount > 0 && (
          <div className="cart-summary-line discount-applied">
            <span>Descuento {discountType === 'percent' ? `(${discountValue}%)` : ''}</span>
            <span>-{formatCOP(discountAmount)}</span>
          </div>
        )}

        <div className="cart-total-row">
          <span className="cart-total-label">TOTAL:</span>
          <span className={`cart-total-value ${bounceTotal ? 'bounce-anim' : ''}`}>
            {formatCOP(finalTotal)}
          </span>
        </div>

        {/* BOTÓN COBRAR */}
        <button
          type="button"
          className={`btn-checkout ${cart.length > 0 ? 'active-pulse' : ''}`}
          disabled={cart.length === 0}
          onClick={onOpenCheckout}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '26px' }}>payments</span>
          <span>COBRAR ORDEN</span>
        </button>
      </div>
    </aside>
  );
}
