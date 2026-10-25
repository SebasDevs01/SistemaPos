import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import CategoryTabs from './CategoryTabs';
import SearchBar from './SearchBar';

export default function ProductGrid({
  products,
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  isInCart,
  getQtyInCart,
  onAddToCart
}) {
  const [filterKey, setFilterKey] = useState(0);

  // Micro-animación: trigger rerender stagger al cambiar filtro o búsqueda
  useEffect(() => {
    setFilterKey((prev) => prev + 1);
  }, [selectedCategory, searchQuery]);

  // Mapa de nombres legibles para categorías
  const categoryMap = categories.reduce((acc, cat) => {
    acc[cat.id] = cat.name;
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="catalog-controls">
        <CategoryTabs
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={onSelectCategory}
        />
        <SearchBar
          value={searchQuery}
          onChange={onSearchChange}
        />
      </div>

      <div className="product-grid-container" key={filterKey}>
        {products.length === 0 ? (
          <div className="grid-empty-state">
            <span className="material-symbols-rounded">search_off</span>
            <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px' }}>
              No se encontraron platillos
            </p>
            <p style={{ fontSize: '0.85rem' }}>
              Intenta cambiar la categoría o buscar con otra palabra clave.
            </p>
          </div>
        ) : (
          products.map((product, index) => {
            const inCart = isInCart(product.id);
            const qty = getQtyInCart(product.id);
            const categoryLabel = categoryMap[product.categoryId] || product.categoryId;

            return (
              <div
                key={product.id}
                style={{
                  animation: 'fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) both',
                  animationDelay: `${index * 40}ms`
                }}
              >
                <ProductCard
                  product={product}
                  isInCart={inCart}
                  qtyInCart={qty}
                  onAddToCart={onAddToCart}
                  categoryLabel={categoryLabel}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
