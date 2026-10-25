import React, { useState, useEffect } from 'react';
import { formatCOP } from '../utils/formatCOP';
import '../styles/ProductCard.css';

export default function ProductCard({
  product,
  isInCart = false,
  qtyInCart = 0,
  onAddToCart,
  categoryLabel = ''
}) {
  const [animateBadge, setAnimateBadge] = useState(false);

  // Micro-animación pop al cambiar cantidad
  useEffect(() => {
    if (qtyInCart > 0) {
      setAnimateBadge(true);
      const timer = setTimeout(() => setAnimateBadge(false), 350);
      return () => clearTimeout(timer);
    }
  }, [qtyInCart]);

  // Texto y emojis de picante
  const getSpicyBadge = (level) => {
    switch (level) {
      case 1:
        return '🌶️ Suave';
      case 2:
        return '🌶️🌶️ Medio';
      case 3:
        return '🔥 DIABLA 🔥';
      default:
        return null;
    }
  };

  const spicyText = getSpicyBadge(product.spicyLevel);

  return (
    <div className={`product-card ${!product.available ? 'unavailable' : ''} ${isInCart ? 'in-cart' : ''}`}>
      <div className="product-card-img-wrap">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="product-card-img"
          loading="lazy"
        />
        <span className="product-card-category-badge">{categoryLabel || product.categoryId}</span>
        {product.spicyLevel > 0 && <span className="product-card-spicy-badge">{spicyText}</span>}

        <div className={`product-status-pill ${product.available ? 'pill-available' : 'pill-unavailable'}`}>
          <span className="material-symbols-rounded">
            {product.available ? 'check_circle' : 'cancel'}
          </span>
          <span>{product.available ? 'DISPONIBLE' : 'AGOTADO'}</span>
        </div>

        {isInCart && (
          <div className={`product-cart-qty-badge ${animateBadge ? 'pop-anim' : ''}`}>
            {qtyInCart}
          </div>
        )}
      </div>

      <div className="product-card-body">
        <div className="product-card-title-row">
          <span className="product-card-title diabla-font">{product.name}</span>
          <span className="product-card-price diabla-font">{formatCOP(product.price)}</span>
        </div>

        <p className="product-card-desc">{product.description}</p>

        <div className="product-ingredients-wrap">
          {product.ingredients && product.ingredients.map((ing, idx) => (
            <span key={idx} className="product-ingredient-chip">
              {ing}
            </span>
          ))}
        </div>

        <button
          className={`btn-add-to-cart ${!product.available ? 'disabled' : ''}`}
          onClick={() => onAddToCart && onAddToCart(product)}
          disabled={!product.available}
        >
          <span className="material-symbols-rounded">add_shopping_cart</span>
          <span>{isInCart ? `Agregar más (${qtyInCart})` : 'Agregar al pedido'}</span>
        </button>
      </div>
    </div>
  );
}
