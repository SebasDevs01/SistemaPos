import React from 'react';
import { getProductImage } from '../data/initialData';
import { 
  FileText, 
  Package, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  ShoppingCart, 
  ExternalLink,
  Layers,
  Sparkles,
  Tag
} from 'lucide-react';

export default function ProductDetailModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onEditProduct,
  onToggleAvailability
}) {
  const [activeImgIndex, setActiveImgIndex] = React.useState(0);

  if (!isOpen || !product) return null;

  const isUnlimited = product.categoria === "Cintas" || Boolean(product.stockIlimitado) || Boolean(product.ventaPorMetro);
  const isAvailable = isUnlimited || Number(product.stock) > 0;

  const allImages = Array.isArray(product.imagenes) && product.imagenes.length > 0
    ? product.imagenes
    : [getProductImage(product)];

  const currentImage = allImages[activeImgIndex] || allImages[0];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '820px',
          width: '94%',
          borderRadius: '24px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-strong)',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)'
        }}
      >
        {/* HEADER MODAL */}
        <div style={{
          padding: '16px 22px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-tertiary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              <img src="/logo-liquidglass-mj.png" alt="MJ" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            </div>
            <div>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 900,
                color: 'var(--text-main)',
                margin: 0,
                letterSpacing: '0.02em',
                textTransform: 'uppercase'
              }}>
                FICHA DEL PRODUCTO
              </h2>
              <div style={{
                fontSize: '0.8rem',
                color: 'var(--accent-warning)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '2px'
              }}>
                <span>{product.categoria === "Cordones" ? "👟" : product.categoria === "Cintas" ? "🎗️" : "⭐"}</span>
                <span>{product.categoria || 'General'}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: 700
            }}
          >
            ✕
          </button>
        </div>

        {/* BODY EN 2 COLUMNAS */}
        <div style={{
          padding: '22px',
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 320px) 1fr',
          gap: '24px',
          maxHeight: 'calc(85vh - 140px)',
          overflowY: 'auto'
        }}>
          {/* COLUMNA IZQUIERDA: IMAGEN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              position: 'relative',
              borderRadius: '18px',
              overflow: 'hidden',
              height: '240px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)'
            }}>
              <img
                src={currentImage}
                alt={product.nombre}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
              <span style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                background: 'rgba(10, 15, 29, 0.85)',
                backdropFilter: 'blur(8px)',
                color: '#f0f4ff',
                fontSize: '0.72rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                padding: '4px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                ⭐ {product.categoria || 'Miscelánea'}
              </span>

              <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 800,
                background: isAvailable ? 'rgba(16, 185, 129, 0.92)' : 'rgba(244, 63, 94, 0.92)',
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)'
              }}>
                {isAvailable ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                <span>{isAvailable ? 'DISPONIBLE' : 'AGOTADO'}</span>
              </div>
            </div>

            {/* Galería de miniaturas si tiene más de 1 imagen */}
            {allImages.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveImgIndex(i)}
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: activeImgIndex === i ? '2px solid var(--neon-indigo, #4f46e5)' : '1px solid var(--border-color)',
                      boxShadow: activeImgIndex === i ? '0 0 10px rgba(99, 102, 241, 0.4)' : 'none',
                      padding: 0,
                      background: 'none',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    <img src={img} alt={`Thumb ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              <span style={{ fontFamily: 'var(--font-mono)' }}>#prod_{product.codigo}</span>
              <a
                href={currentImage}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--accent-primary)',
                  textDecoration: 'none',
                  fontWeight: 600
                }}
              >
                <ExternalLink size={13} />
                <span>Ver Foto HD</span>
              </a>
            </div>
          </div>

          {/* COLUMNA DERECHA: DATOS DEL PRODUCTO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Título y Precio */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <h1 style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                lineHeight: 1.2,
                margin: 0
              }}>
                {product.nombre}
              </h1>
              {(() => {
                const allPrices = [
                  ...(product.preciosPorVariante ? Object.values(product.preciosPorVariante) : []),
                  ...(product.precioPorGenero ? Object.values(product.precioPorGenero) : [])
                ].map(Number).filter(v => !isNaN(v) && v > 0);

                const baseP = Number(product.precio) || 0;
                const validPrices = allPrices.length > 0 ? allPrices : (baseP > 0 ? [baseP] : []);

                let priceStr = "$0";
                if (validPrices.length > 0) {
                  const minP = Math.min(...validPrices);
                  const maxP = Math.max(...validPrices);
                  priceStr = (minP === maxP)
                    ? `$${minP.toLocaleString()}`
                    : `$${minP.toLocaleString()} - $${maxP.toLocaleString()}`;
                } else if (baseP > 0) {
                  priceStr = `$${baseP.toLocaleString()}`;
                }

                return (
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: validPrices.length > 1 && Math.min(...validPrices) !== Math.max(...validPrices) ? '1.25rem' : '1.6rem',
                    fontWeight: 900,
                    color: 'var(--neon-emerald)',
                    whiteSpace: 'nowrap'
                  }}>
                    {priceStr}
                  </div>
                );
              })()}
            </div>

            {/* DESCRIPCIÓN */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.82rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: '6px',
                letterSpacing: '0.04em'
              }}>
                <FileText size={15} color="var(--accent-primary)" />
                <span>Descripción</span>
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '12px 14px',
                fontSize: '0.88rem',
                lineHeight: 1.5,
                color: 'var(--text-main)'
              }}>
                {product.descripcion || 
                  `Artículo de inventario registrado bajo la categoría de ${product.categoria || 'Miscelánea'}. Disponible para venta directa por unidad y/o paquete en el punto de venta.`}
              </div>
            </div>

            {/* CARACTERÍSTICAS / PRESENTACIÓN */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.82rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: '8px',
                letterSpacing: '0.04em'
              }}>
                <Package size={15} color="var(--neon-violet)" />
                <span>Características y Presentación</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <span className="badge badge-blue" style={{ padding: '5px 10px', fontSize: '0.78rem' }}>
                  Cód: {product.codigo}
                </span>
                <span className="badge badge-purple" style={{ padding: '5px 10px', fontSize: '0.78rem' }}>
                  Unidad: {product.unidadMedida || 'unidad'}
                </span>
                {product.permitePaquete && (
                  <span className="badge badge-purple" style={{ padding: '5px 10px', fontSize: '0.78rem' }}>
                    📦 Paquete x{product.unidadesPorPaquete || 10} (${Number(product.precioPaquete || product.precio * 10 * 0.9).toLocaleString()})
                  </span>
                )}
                {product.tallas && product.tallas.length > 0 && (
                  <span className="badge badge-amber" style={{ padding: '5px 10px', fontSize: '0.78rem' }}>
                    Tallas: {product.tallas.join(', ')}
                  </span>
                )}
                <span className="badge badge-indigo" style={{ padding: '5px 10px', fontSize: '0.78rem' }}>
                  Categoría: {product.categoria || 'Miscelánea'}
                </span>
              </div>
            </div>

            {/* METADATOS: STOCK, CATEGORÍA, ESTADO */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              marginTop: '4px'
            }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '10px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Stock Disponible
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: isAvailable ? 'var(--text-main)' : 'var(--accent-danger)', marginTop: '2px' }}>
                  {isUnlimited ? '∞ Ilimitado' : (product.categoria === "Cordones" || product.unidadMedida === "par") ? `${product.stock} pares` : `${product.stock} unidades`}
                </div>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '10px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Categoría Menú
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-warning)', marginTop: '2px' }}>
                  ⭐ {product.categoria || 'General'}
                </div>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '10px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Disponibilidad
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: isAvailable ? '#4ade80' : '#f87171', marginTop: '2px' }}>
                  {isAvailable ? 'Activo en POS' : 'Agotado'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER DEL MODAL */}
        <div style={{
          padding: '14px 22px',
          borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            style={{ borderRadius: '12px', padding: '10px 18px' }}
          >
            Cerrar
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => onToggleAvailability && onToggleAvailability(product)}
              style={{
                borderRadius: '12px',
                padding: '10px 14px',
                fontSize: '0.82rem',
                borderColor: isAvailable ? 'rgba(244, 63, 94, 0.4)' : 'rgba(16, 185, 129, 0.4)',
                color: isAvailable ? 'var(--accent-danger)' : 'var(--neon-emerald)'
              }}
            >
              ⇄ {isAvailable ? 'Marcar como Agotado' : 'Marcar como Disponible'}
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => {
                onClose();
                if (onEditProduct) onEditProduct(product);
              }}
              style={{
                borderRadius: '12px',
                padding: '10px 16px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#ffffff',
                fontWeight: 700
              }}
            >
              <Edit3 size={15} />
              <span>Editar Producto</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              disabled={!isAvailable}
              onClick={() => {
                if (onAddToCart) onAddToCart(product, 'unidad');
                onClose();
              }}
              style={{
                borderRadius: '12px',
                padding: '10px 20px',
                fontWeight: 800,
                fontSize: '0.92rem'
              }}
            >
              <ShoppingCart size={16} />
              <span>Vender en POS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
