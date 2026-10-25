import React, { createContext, useContext, useReducer, useEffect } from 'react';

const CartContext = createContext(null);

const STORAGE_KEY = 'la_diabla_pos_cart_v1';
const ORDER_NUM_KEY = 'la_diabla_order_num_counter';

const initialState = {
  items: [],
  discountType: 'percent', // 'percent' | 'fixed'
  discountValue: 0,
  taxEnabled: false,
  taxRate: 0.19, // 19% IVA estándar
  orderNumber: 1
};

function getSavedCart() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw);
    const orderNum = parseInt(localStorage.getItem(ORDER_NUM_KEY) || '1', 10);
    return {
      ...initialState,
      ...parsed,
      orderNumber: isNaN(orderNum) ? 1 : orderNum
    };
  } catch {
    return initialState;
  }
}

function cartReducer(state, action) {
  let newState;
  switch (action.type) {
    case 'ADD_TO_CART': {
      const product = action.payload;
      const existingIndex = state.items.findIndex(item => item.id === product.id);

      if (existingIndex > -1) {
        const updated = [...state.items];
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: updated[existingIndex].qty + 1
        };
        newState = { ...state, items: updated };
      } else {
        newState = {
          ...state,
          items: [...state.items, { ...product, qty: 1 }]
        };
      }
      break;
    }

    case 'REMOVE_FROM_CART': {
      newState = {
        ...state,
        items: state.items.filter(item => item.id !== action.payload)
      };
      break;
    }

    case 'UPDATE_QTY': {
      const { productId, qty } = action.payload;
      if (qty <= 0) {
        newState = {
          ...state,
          items: state.items.filter(item => item.id !== productId)
        };
      } else {
        newState = {
          ...state,
          items: state.items.map(item =>
            item.id === productId ? { ...item, qty } : item
          )
        };
      }
      break;
    }

    case 'CLEAR_CART': {
      newState = {
        ...state,
        items: [],
        discountValue: 0
      };
      break;
    }

    case 'SET_DISCOUNT': {
      const { type, value } = action.payload;
      newState = {
        ...state,
        discountType: type || state.discountType,
        discountValue: Math.max(0, Number(value) || 0)
      };
      break;
    }

    case 'TOGGLE_TAX': {
      newState = {
        ...state,
        taxEnabled: action.payload !== undefined ? action.payload : !state.taxEnabled
      };
      break;
    }

    case 'NEXT_ORDER_NUMBER': {
      const nextNum = state.orderNumber + 1;
      localStorage.setItem(ORDER_NUM_KEY, String(nextNum));
      newState = {
        ...state,
        orderNumber: nextNum
      };
      break;
    }

    default:
      return state;
  }

  // Persistir en sessionStorage
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      items: newState.items,
      discountType: newState.discountType,
      discountValue: newState.discountValue,
      taxEnabled: newState.taxEnabled
    }));
  } catch (err) {
    console.error('Error saving cart to sessionStorage', err);
  }

  return newState;
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, null, getSavedCart);

  const addToCart = (product) => {
    if (!product || !product.available) return;
    dispatch({ type: 'ADD_TO_CART', payload: product });
  };

  const removeFromCart = (productId) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: productId });
  };

  const updateQty = (productId, qty) => {
    dispatch({ type: 'UPDATE_QTY', payload: { productId, qty } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const applyDiscount = (type, value) => {
    dispatch({ type: 'SET_DISCOUNT', payload: { type, value } });
  };

  const toggleTax = (enabled) => {
    dispatch({ type: 'TOGGLE_TAX', payload: enabled });
  };

  const nextOrderNumber = () => {
    dispatch({ type: 'NEXT_ORDER_NUMBER' });
  };

  const getItemCount = () => {
    return state.items.reduce((acc, item) => acc + item.qty, 0);
  };

  const isInCart = (productId) => {
    return state.items.some(item => item.id === productId);
  };

  const getQtyInCart = (productId) => {
    const item = state.items.find(item => item.id === productId);
    return item ? item.qty : 0;
  };

  const getTotal = () => {
    const subtotal = state.items.reduce((acc, item) => acc + item.price * item.qty, 0);

    let discountAmount = 0;
    if (state.discountType === 'percent') {
      discountAmount = (subtotal * state.discountValue) / 100;
    } else {
      discountAmount = state.discountValue;
    }
    discountAmount = Math.min(subtotal, Math.max(0, discountAmount));

    const discountedSubtotal = subtotal - discountAmount;
    const taxAmount = state.taxEnabled ? discountedSubtotal * state.taxRate : 0;
    const total = discountedSubtotal + taxAmount;

    return {
      subtotal,
      discountAmount,
      discountedSubtotal,
      taxAmount,
      total: Math.round(total)
    };
  };

  const value = {
    cart: state.items,
    discountType: state.discountType,
    discountValue: state.discountValue,
    taxEnabled: state.taxEnabled,
    orderNumber: state.orderNumber,
    addToCart,
    removeFromCart,
    updateQty,
    clearCart,
    applyDiscount,
    toggleTax,
    nextOrderNumber,
    getItemCount,
    isInCart,
    getQtyInCart,
    getTotal
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export default useCart;
