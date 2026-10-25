import { useState, useEffect } from 'react';

const ORDERS_STORAGE_KEY = 'la_diabla_pos_daily_orders_v1';

export function useOrders() {
  const [orders, setOrders] = useState(() => {
    try {
      const saved = localStorage.getItem(ORDERS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    } catch (err) {
      console.error('Error saving orders to localStorage', err);
    }
  }, [orders]);

  const addOrder = (orderData) => {
    const newOrder = {
      id: `DIA-${String(Date.now()).slice(-4)}`,
      createdAt: new Date().toISOString(),
      ...orderData
    };
    setOrders(prev => [newOrder, ...prev]);
    return newOrder;
  };

  const clearOrders = () => {
    setOrders([]);
    localStorage.removeItem(ORDERS_STORAGE_KEY);
  };

  // Estadísticas del día
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysOrders = orders.filter(o => o.createdAt.startsWith(todayStr));

  const totalSalesToday = todaysOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOrdersToday = todaysOrders.length;
  const averageTicket = totalOrdersToday > 0 ? Math.round(totalSalesToday / totalOrdersToday) : 0;

  return {
    orders,
    todaysOrders,
    addOrder,
    clearOrders,
    stats: {
      totalSalesToday,
      totalOrdersToday,
      averageTicket
    }
  };
}

export default useOrders;
