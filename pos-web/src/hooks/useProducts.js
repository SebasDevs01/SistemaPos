import { useState, useMemo } from 'react';
import { MOCK_PRODUCTS, CATEGORIES } from '../data/mockProducts';

export function useProducts() {
  const [products] = useState(MOCK_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    let result = products;

    // Filtrar por categoría
    if (selectedCategory && selectedCategory !== 'todos') {
      result = result.filter(p => p.categoryId === selectedCategory);
    }

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(p => {
        const matchName = p.name.toLowerCase().includes(q);
        const matchDesc = p.description.toLowerCase().includes(q);
        const matchCategory = p.categoryId.toLowerCase().includes(q);
        const matchIngredients = p.ingredients && p.ingredients.some(ing => ing.toLowerCase().includes(q));
        return matchName || matchDesc || matchCategory || matchIngredients;
      });
    }

    return result;
  }, [products, selectedCategory, searchQuery]);

  return {
    products: filteredProducts,
    allProducts: products,
    categories: CATEGORIES,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery
  };
}

export default useProducts;
