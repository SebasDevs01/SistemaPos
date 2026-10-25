import React, { useState, useEffect, useRef } from 'react';
import ImageUploader from './ImageUploader';
import MathPriceInput from './MathPriceInput';
import { 
  Check, 
  X, 
  Sparkles, 
  Gift, 
  Scissors, 
  Palette, 
  Package, 
  Tag, 
  AlertCircle,
  Plus,
  Calculator,
  Percent,
  TrendingUp,
  DollarSign
} from 'lucide-react';

const CATEGORIES_LIST = [
  'Bolsas de Regalo',
  'Cintas',
  'Cordones',
  'Belleza',
  'Bisutería',
  'Cuadernos',
  'Dulcería',
  'Chancletas',
  'Papelería',
  'Desechables',
  'Ropa',
  'Juguetería',
  'Alquiler',
  'Seguros'
];

const CATEGORY_EMOJIS = {
  'Bolsas de Regalo': '🎁',
  'Cintas': '🎗️',
  'Cordones': '👟',
  'Belleza': '💄',
  'Bisutería': '💍',
  'Cuadernos': '📓',
  'Dulcería': '🍬',
  'Chancletas': '🩴',
  'Papelería': '✏️',
  'Desechables': '🗑️',
  'Ropa': '👕',
  'Juguetería': '🧸',
  'Alquiler': '🪑',
  'Seguros': '🛡️'
};

const DEFAULT_MOTIVOS = ['Niño', 'Niña', 'Cumpleaños', 'Unisex', 'Amor y Amistad'];
const DEFAULT_COLORES_CINTA = ['Rojo', 'Azul', 'Dorado', 'Plateado', 'Rosado', 'Verde', 'Amarillo', 'Blanco', 'Fucsia', 'Morado'];
const DEFAULT_COLORES_BOLSA = ['Dorado', 'Plateado', 'Rojo', 'Azul', 'Rosado', 'Verde', 'Fucsia', 'Negro'];

// Cordones: tipos, longitudes y colores disponibles por defecto
const TIPOS_CORDON = ['Redondo', 'Plano'];
const LONGITUDES_CORDON = ['Corto (45cm)', 'Largo (120cm)'];
const DEFAULT_COLORES_CORDON = [
  'Blanco', 'Negro', 'Rojo', 'Azul', 'Azul Rey', 'Rosado', 'Verde', 'Amarillo',
  'Gris', 'Morado', 'Naranja', 'Fucsia', 'Dorado', 'Plateado', 'Café'
];

// Chancletas y Ropa: géneros, tallas individuales por género y sugerencias de tipos
const DEFAULT_GENEROS = ['Niño', 'Niña', 'Mujer', 'Hombre'];
const DEFAULT_TALLAS_POR_GENERO_CHANCLETA = {
  'Niño': ['24', '26', '28', '30'],
  'Niña': ['24', '26', '28', '30'],
  'Mujer': ['35', '36', '37', '38', '39'],
  'Hombre': ['38', '39', '40', '41', '42']
};
const DEFAULT_TALLAS_POR_GENERO_ROPA = {
  'Niño': ['2', '4', '6', '8', '10', '12'],
  'Niña': ['2', '4', '6', '8', '10', '12'],
  'Mujer': ['XS', 'S', 'M', 'L', 'XL'],
  'Hombre': ['S', 'M', 'L', 'XL', 'XXL']
};
const SUGGESTED_ROPA_TIPOS = ['Camisa', 'Pantalón', 'Bermuda', 'Vestido', 'Bóxer', 'Pijama', 'Sudadera', 'Blusa', 'Falda', 'Conjunto'];
const SUGGESTED_CHANCLETA_TIPOS = ['Havaianas', 'Sandalia', 'Crocs', 'Chancla de Baño', 'Chancla de Cuero', 'Chancla Playera', 'Deportiva'];

const GENDER_EMOJIS = { 'Niño': '👦', 'Niña': '👧', 'Mujer': '👩', 'Hombre': '👨' };
const GENDER_COLORS = { 'Niño': '#60a5fa', 'Niña': '#f472b6', 'Mujer': '#c084fc', 'Hombre': '#34d399' };

function CordonesFormSection({ formData, setFormData, nuevoColor, setNuevoColor }) {
  const tipos = formData.tiposCordón && formData.tiposCordón.length > 0 ? formData.tiposCordón : TIPOS_CORDON;
  const longitudes = formData.longitudesCordón && formData.longitudesCordón.length > 0 ? formData.longitudesCordón : LONGITUDES_CORDON;
  const colores = formData.colores && formData.colores.length > 0 ? formData.colores : DEFAULT_COLORES_CORDON;
  const [nuevoColorStock, setNuevoColorStock] = useState(5);

  // Combinaciones habilitadas según lo seleccionado
  const enabledCombos = [];
  tipos.forEach(t => {
    longitudes.forEach(l => {
      const shortL = l.includes('(') ? l.split(' ')[0] : l;
      enabledCombos.push({
        id: `${t}|${l}`,
        tipo: t,
        longitud: l,
        label: `${t} • ${shortL}`,
        icon: t === 'Redondo' ? '🔘' : '➖'
      });
    });
  });

  const [activeComboId, setActiveComboId] = useState(enabledCombos[0]?.id || 'Redondo|Largo (120cm)');
  const currentCombo = enabledCombos.find(cb => cb.id === activeComboId) || enabledCombos[0];

  // Calcular el total de pares de una combinación específica
  const getComboTotalStock = (cb, stockMap = formData.stockPorVariante) => {
    if (!stockMap || !cb) return 0;
    let sum = 0;
    colores.forEach(c => {
      const kFull = `${cb.tipo}|${cb.longitud}|${c}`;
      const kSimple = `${cb.tipo}|${c}`;
      if (stockMap[kFull] !== undefined) sum += Number(stockMap[kFull] || 0);
      else if (stockMap[kSimple] !== undefined) sum += Number(stockMap[kSimple] || 0);
      else if (enabledCombos.length === 1 && stockMap[c] !== undefined) sum += Number(stockMap[c] || 0);
    });
    return sum;
  };

  // Calcular el stock total global sumando solo las combinaciones habilitadas
  const calcGlobalStock = (nextMap, combosList = enabledCombos) => {
    if (!nextMap) return 0;
    if (combosList.length > 1) {
      let sum = 0;
      combosList.forEach(cb => {
        colores.forEach(c => {
          const kFull = `${cb.tipo}|${cb.longitud}|${c}`;
          const kSimple = `${cb.tipo}|${c}`;
          if (nextMap[kFull] !== undefined) sum += Number(nextMap[kFull] || 0);
          else if (nextMap[kSimple] !== undefined) sum += Number(nextMap[kSimple] || 0);
        });
      });
      return sum;
    }
    // Única combinación seleccionada
    const singleCombo = combosList[0];
    let sum = 0;
    colores.forEach(c => {
      const kFull = singleCombo ? `${singleCombo.tipo}|${singleCombo.longitud}|${c}` : null;
      const kSimple = singleCombo ? `${singleCombo.tipo}|${c}` : null;
      if (kFull && nextMap[kFull] !== undefined) sum += Number(nextMap[kFull] || 0);
      else if (kSimple && nextMap[kSimple] !== undefined) sum += Number(nextMap[kSimple] || 0);
      else if (nextMap[c] !== undefined) sum += Number(nextMap[c] || 0);
      else sum += 5;
    });
    return sum;
  };

  const toggleTipo = (t) => {
    let nextTipos;
    if (tipos.includes(t)) {
      if (tipos.length === 1) return; // Mínimo 1 tipo seleccionado
      nextTipos = tipos.filter(item => item !== t);
    } else {
      nextTipos = [...tipos, t];
    }
    const nextCombos = [];
    nextTipos.forEach(nt => {
      longitudes.forEach(nl => {
        nextCombos.push({ id: `${nt}|${nl}`, tipo: nt, longitud: nl });
      });
    });
    if (!nextCombos.some(cb => cb.id === activeComboId) && nextCombos[0]) {
      setActiveComboId(nextCombos[0].id);
    }
    const total = calcGlobalStock(formData.stockPorVariante, nextCombos);
    setFormData(prev => ({ ...prev, tiposCordón: nextTipos, stock: total }));
  };

  const toggleLongitud = (l) => {
    let nextLongs;
    if (longitudes.includes(l)) {
      if (longitudes.length === 1) return; // Mínimo 1 longitud seleccionada
      nextLongs = longitudes.filter(item => item !== l);
    } else {
      nextLongs = [...longitudes, l];
    }
    const nextCombos = [];
    tipos.forEach(nt => {
      nextLongs.forEach(nl => {
        nextCombos.push({ id: `${nt}|${nl}`, tipo: nt, longitud: nl });
      });
    });
    if (!nextCombos.some(cb => cb.id === activeComboId) && nextCombos[0]) {
      setActiveComboId(nextCombos[0].id);
    }
    const total = calcGlobalStock(formData.stockPorVariante, nextCombos);
    setFormData(prev => ({ ...prev, longitudesCordón: nextLongs, stock: total }));
  };

  // Obtener stock actual para un color específico
  const getColorQty = (c) => {
    if (!formData.stockPorVariante) return 5;
    if (enabledCombos.length > 1 && currentCombo) {
      const kFull = `${currentCombo.tipo}|${currentCombo.longitud}|${c}`;
      const kSimple = `${currentCombo.tipo}|${c}`;
      if (formData.stockPorVariante[kFull] !== undefined) return formData.stockPorVariante[kFull];
      if (formData.stockPorVariante[kSimple] !== undefined) return formData.stockPorVariante[kSimple];
      return 0;
    }
    if (currentCombo) {
      const kFull = `${currentCombo.tipo}|${currentCombo.longitud}|${c}`;
      const kSimple = `${currentCombo.tipo}|${c}`;
      if (formData.stockPorVariante[kFull] !== undefined) return formData.stockPorVariante[kFull];
      if (formData.stockPorVariante[kSimple] !== undefined) return formData.stockPorVariante[kSimple];
    }
    return formData.stockPorVariante[c] !== undefined ? formData.stockPorVariante[c] : 5;
  };

  // Cambiar stock de un color para la combinación activa
  const handleStockColorChange = (colorName, val) => {
    const qty = Math.max(0, parseInt(val) || 0);
    const nextMap = { ...(formData.stockPorVariante || {}) };

    if (enabledCombos.length > 1 && currentCombo) {
      const kFull = `${currentCombo.tipo}|${currentCombo.longitud}|${colorName}`;
      const kSimple = `${currentCombo.tipo}|${colorName}`;
      nextMap[kFull] = qty;
      nextMap[kSimple] = qty;
    } else if (currentCombo) {
      const kFull = `${currentCombo.tipo}|${currentCombo.longitud}|${colorName}`;
      const kSimple = `${currentCombo.tipo}|${colorName}`;
      nextMap[kFull] = qty;
      nextMap[kSimple] = qty;
      nextMap[colorName] = qty;
    } else {
      nextMap[colorName] = qty;
    }

    const total = calcGlobalStock(nextMap);
    setFormData(prev => ({
      ...prev,
      stockPorVariante: nextMap,
      stock: total
    }));
  };

  const removeColor = (colorToRemove) => {
    const nextColores = colores.filter(c => c !== colorToRemove);
    const nextMap = { ...(formData.stockPorVariante || {}) };
    delete nextMap[colorToRemove];
    enabledCombos.forEach(cb => {
      delete nextMap[`${cb.tipo}|${cb.longitud}|${colorToRemove}`];
      delete nextMap[`${cb.tipo}|${colorToRemove}`];
    });
    const total = calcGlobalStock(nextMap);
    setFormData(prev => ({
      ...prev,
      colores: nextColores,
      stockPorVariante: nextMap,
      stock: total
    }));
  };

  const addColor = () => {
    const trimmed = (nuevoColor || "").trim();
    if (!trimmed) return;
    if (!colores.includes(trimmed)) {
      const nextColores = [...colores, trimmed];
      const nextMap = { ...(formData.stockPorVariante || {}) };
      if (enabledCombos.length > 1 && currentCombo) {
        nextMap[`${currentCombo.tipo}|${currentCombo.longitud}|${trimmed}`] = nuevoColorStock;
        nextMap[`${currentCombo.tipo}|${trimmed}`] = nuevoColorStock;
      } else if (currentCombo) {
        nextMap[`${currentCombo.tipo}|${currentCombo.longitud}|${trimmed}`] = nuevoColorStock;
        nextMap[`${currentCombo.tipo}|${trimmed}`] = nuevoColorStock;
        nextMap[trimmed] = nuevoColorStock;
      } else {
        nextMap[trimmed] = nuevoColorStock;
      }
      const total = calcGlobalStock(nextMap);
      setFormData(prev => ({
        ...prev,
        colores: nextColores,
        stockPorVariante: nextMap,
        stock: total
      }));
    }
    setNuevoColor("");
    setNuevoColorStock(5);
  };

  const aplicarStockATodos = (qty) => {
    const nextMap = { ...(formData.stockPorVariante || {}) };
    colores.forEach(c => {
      if (enabledCombos.length > 1 && currentCombo) {
        nextMap[`${currentCombo.tipo}|${currentCombo.longitud}|${c}`] = qty;
        nextMap[`${currentCombo.tipo}|${c}`] = qty;
      } else if (currentCombo) {
        nextMap[`${currentCombo.tipo}|${currentCombo.longitud}|${c}`] = qty;
        nextMap[`${currentCombo.tipo}|${c}`] = qty;
        nextMap[c] = qty;
      } else {
        nextMap[c] = qty;
      }
    });
    const total = calcGlobalStock(nextMap);
    setFormData(prev => ({
      ...prev,
      stockPorVariante: nextMap,
      stock: total
    }));
  };

  const resetColoresConStock = (qty = 5) => {
    const nextMap = { ...(formData.stockPorVariante || {}) };
    DEFAULT_COLORES_CORDON.forEach(c => {
      if (enabledCombos.length > 1 && currentCombo) {
        nextMap[`${currentCombo.tipo}|${currentCombo.longitud}|${c}`] = qty;
        nextMap[`${currentCombo.tipo}|${c}`] = qty;
      } else if (currentCombo) {
        nextMap[`${currentCombo.tipo}|${currentCombo.longitud}|${c}`] = qty;
        nextMap[`${currentCombo.tipo}|${c}`] = qty;
        nextMap[c] = qty;
      } else {
        nextMap[c] = qty;
      }
    });
    const total = calcGlobalStock(nextMap);
    setFormData(prev => ({
      ...prev,
      colores: DEFAULT_COLORES_CORDON,
      stockPorVariante: nextMap,
      stock: total
    }));
  };

  const unselectedTipos = TIPOS_CORDON.filter(t => !tipos.includes(t));
  const unselectedLongs = LONGITUDES_CORDON.filter(l => !longitudes.includes(l));

  return (
    <div style={{
      padding: '16px',
      borderRadius: '16px',
      background: 'rgba(249, 115, 22, 0.08)',
      border: '1.5px solid rgba(249, 115, 22, 0.35)',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.2rem' }}>👟</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f97316' }}>
            Configuración de Cordones (Stock Individual por Color)
          </span>
        </div>
        <span style={{
          background: 'rgba(249, 115, 22, 0.2)',
          color: '#fb923c',
          fontSize: '0.78rem',
          padding: '4px 10px',
          borderRadius: '8px',
          fontWeight: 800
        }}>
          Total: {formData.stock} pares
        </span>
      </div>

      {/* 1. Tipos de Cordón admitidos */}
      <div>
        <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
          Tipos de Cordón Habilitados:
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {TIPOS_CORDON.map(t => {
            const isChecked = tipos.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTipo(t)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '10px',
                  border: isChecked ? '2px solid #f97316' : '1px solid var(--border-color)',
                  background: isChecked ? 'rgba(249, 115, 22, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                  color: isChecked ? '#fed7aa' : 'var(--text-muted)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>{t === 'Redondo' ? '🔘' : '➖'}</span>
                <span>{t}</span>
                {isChecked && <Check size={14} color="#f97316" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Longitudes admitidas */}
      <div>
        <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
          Longitudes Habilitadas:
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {LONGITUDES_CORDON.map(l => {
            const isChecked = longitudes.includes(l);
            const isCorto = l.toLowerCase().includes('corto');
            return (
              <button
                key={l}
                type="button"
                onClick={() => toggleLongitud(l)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '10px',
                  border: isChecked ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                  background: isChecked ? 'rgba(245, 158, 11, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                  color: isChecked ? '#fef3c7' : 'var(--text-muted)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>{isCorto ? '📏' : '📐'}</span>
                <span>{l}</span>
                {isChecked && <Check size={14} color="#f59e0b" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Banner de Exclusividad de Stock */}
      <div style={{
        padding: '10px 14px',
        borderRadius: '12px',
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <span style={{ fontSize: '1.2rem' }}>🎯</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#93c5fd', display: 'block' }}>
            {enabledCombos.length === 1 
              ? `Stock asignado exclusivamente a: ${tipos.join(', ')} • ${longitudes.map(l => l.includes('(') ? l.split(' ')[0] : l).join(', ')}`
              : `Gestionando existencias por combinación (${enabledCombos.length} combinaciones habilitadas)`}
          </span>
          <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
            {(unselectedTipos.length > 0 || unselectedLongs.length > 0) ? (
              <>Las opciones no seleccionadas ({[...unselectedTipos, ...unselectedLongs].join(', ')}) quedarán sin stock y aparecerán bloqueadas en caja.</>
            ) : (
              <>Todas las combinaciones están activas para venta.</>
            )}
          </span>
        </div>
      </div>

      {/* Pestañas si hay más de 1 combinación habilitada */}
      {enabledCombos.length > 1 && (
        <div>
          <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
            Selecciona la combinación para asignar sus pares por color:
          </label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {enabledCombos.map(cb => {
              const isSelected = (currentCombo?.id === cb.id);
              const comboStock = getComboTotalStock(cb);
              return (
                <button
                  key={cb.id}
                  type="button"
                  onClick={() => setActiveComboId(cb.id)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '10px',
                    border: isSelected ? '2px solid #f97316' : '1px solid var(--border-color)',
                    background: isSelected ? 'rgba(249, 115, 22, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                    color: isSelected ? '#fed7aa' : 'var(--text-main)',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{cb.icon}</span>
                  <span>{cb.label}</span>
                  <span style={{
                    fontSize: '0.68rem',
                    padding: '1px 5px',
                    borderRadius: '6px',
                    background: isSelected ? 'rgba(249, 115, 22, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                    color: isSelected ? '#fff' : 'var(--text-muted)'
                  }}>
                    {comboStock} pares
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Colores con Stock Individual en Pares */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            Colores y Existencias Individuales en Pares ({colores.length} colores):
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => resetColoresConStock(5)}
              style={{ background: 'none', border: 'none', color: '#fb923c', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Restablecer colores estándar (5 c/u)
            </button>
            <button
              type="button"
              onClick={() => {
                const q = prompt("¿Cuántos pares deseas asignar a cada color?", "10");
                if (q !== null && !isNaN(parseInt(q))) {
                  aplicarStockATodos(Math.max(0, parseInt(q)));
                }
              }}
              style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Asignar misma cantidad a todos
            </button>
          </div>
        </div>

        {/* Lista de colores con inputs de stock */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', marginBottom: '10px' }}>
          {colores.map((c, idx) => {
            const currentQty = getColorQty(c);
            return (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '6px 10px',
                gap: '8px'
              }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fb923c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Pares:</span>
                  <input
                    type="number"
                    min="0"
                    value={currentQty}
                    onChange={(e) => handleStockColorChange(c, e.target.value)}
                    style={{
                      width: '56px',
                      padding: '4px 6px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card, #1f2937)',
                      color: 'var(--text-main)',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      textAlign: 'center'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeColor(c)}
                    style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px' }}
                    title={`Eliminar color ${c}`}
                  >✕</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input agregar nuevo color con stock inicial */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            type="text"
            placeholder="Nombre nuevo color (ej: Beige, Azul Marino)..."
            value={nuevoColor}
            onChange={(e) => setNuevoColor(e.target.value)}
            className="input-field"
            style={{ fontSize: '0.8rem', padding: '6px 10px', flex: 2 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addColor();
              }
            }}
          />
          <input
            type="number"
            min="0"
            placeholder="Pares"
            value={nuevoColorStock}
            onChange={(e) => setNuevoColorStock(Math.max(0, parseInt(e.target.value) || 0))}
            className="input-field"
            style={{ fontSize: '0.8rem', padding: '6px 10px', width: '80px', textAlign: 'center' }}
          />
          <button
            type="button"
            className="btn btn-outline"
            onClick={addColor}
            style={{ padding: '6px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
          >
            + Agregar Color
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductEditModal({ 
  product, 
  isOpen, 
  onClose, 
  onSave, 
  defaultCategory = 'Papelería',
  autoCode = ''
}) {
  const isEditing = Boolean(product && (product.id || product.codigo));

  const getSuggestedMargin = (cat) => {
    return (cat && String(cat).toLowerCase().includes('dulc')) ? 30 : 50;
  };

  const [redondeoComercial, setRedondeoComercial] = useState(true);

  const calculateSellingPrice = (costVal, marginVal, shouldRound = redondeoComercial) => {
    const cost = parseFloat(costVal) || 0;
    if (cost <= 0) return 0;
    const margin = parseFloat(marginVal) || 0;
    const rawPrice = cost * (1 + margin / 100);
    return shouldRound ? Math.round(rawPrice / 50) * 50 : Math.round(rawPrice);
  };

  const [margenPorcentaje, setMargenPorcentaje] = useState(() => {
    return product?.margenGanancia || getSuggestedMargin(product?.categoria || defaultCategory);
  });

  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    categoria: defaultCategory,
    subcategoria: '',
    tipoArticulo: '',
    motivos: [],
    colores: [],
    tallas: [],
    generos: [],
    tallasPorGenero: {},
    stockPorVariante: {},
    preciosPorVariante: {},
    precioPorGenero: {},
    ventaPorMetro: false,
    stockIlimitado: false,
    precioCosto: '',
    costo: '',
    precio: 0,
    stock: 0,
    permitePaquete: false,
    unidadesPorPaquete: 10,
    precioPaquete: 0,
    unidadMedida: 'unidad',
    imagen: '',
    imagenes: [],
    descripcion: ''
  });

  const handleCostChange = (val) => {
    const cost = parseFloat(val) || 0;
    const newPrice = cost > 0 ? calculateSellingPrice(cost, margenPorcentaje) : formData.precio;
    setFormData(prev => ({
      ...prev,
      precioCosto: val,
      costo: val,
      ...(cost > 0 ? { precio: newPrice } : {})
    }));
  };

  const handleMarginChange = (newMargin) => {
    setMargenPorcentaje(newMargin);
    const cost = parseFloat(formData.precioCosto) || 0;
    if (cost > 0 && newMargin !== '' && !isNaN(newMargin)) {
      const newPrice = calculateSellingPrice(cost, newMargin);
      setFormData(prev => ({
        ...prev,
        precio: newPrice
      }));
    }
  };

  const handleToggleRedondeo = (checked) => {
    setRedondeoComercial(checked);
    const cost = parseFloat(formData.precioCosto) || 0;
    if (cost > 0) {
      const newPrice = calculateSellingPrice(cost, margenPorcentaje, checked);
      setFormData(prev => ({
        ...prev,
        precio: newPrice
      }));
    }
  };

  const handleAplicarPrecioATodasLasTallas = (precio) => {
    const p = Math.max(0, parseFloat(precio) || 0);
    const nextPrecioMap = { ...(formData.preciosPorVariante || {}) };
    const nextPrecioPorGenero = { ...(formData.precioPorGenero || {}) };
    Object.entries(formData.tallasPorGenero || {}).forEach(([g, tList]) => {
      nextPrecioPorGenero[g] = p;
      (tList || []).forEach(t => {
        nextPrecioMap[`${g}|${t}`] = p;
      });
    });
    setFormData(prev => ({
      ...prev,
      precio: p,
      preciosPorVariante: nextPrecioMap,
      precioPorGenero: nextPrecioPorGenero
    }));
  };

  const [nuevoMotivo, setNuevoMotivo] = useState('');
  const [nuevoMotivoStock, setNuevoMotivoStock] = useState(10);
  const [nuevoColor, setNuevoColor] = useState('');
  const [nuevoColorStock, setNuevoColorStock] = useState(5);
  const [nuevaTalla, setNuevaTalla] = useState('');
  
  // Chancletas/Ropa: inputs por género para agregar talla, stock y precio
  const [nuevaTallaNombre, setNuevaTallaNombre] = useState({});
  const [nuevaTallaStock, setNuevaTallaStock] = useState({});
  const [nuevaTallaPrecio, setNuevaTallaPrecio] = useState({});
  const [precioGeneralGenero, setPrecioGeneralGenero] = useState({});

  // Ref para controlar cuándo re-inicializar el formulario.
  // Solo re-inicializamos cuando:
  //   1. El modal pasa de cerrado a abierto (isOpen true).
  //   2. Cambia el producto que se está editando (distinto id/código).
  // Con esto evitamos que un cambio de `autoCode` o `defaultCategory` en el
  // padre resetee lo que el usuario está escribiendo.
  const lastInitKeyRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      // Cuando el modal se cierra, reseteamos el key para que la próxima
      // apertura siempre vuelva a inicializar el formulario.
      lastInitKeyRef.current = null;
      return;
    }

    // Clave única que identifica este "contexto" de apertura.
    const productKey = product ? (product.id || product.codigo || '__product__') : '__new__';
    const initKey = `${productKey}`;

    // Si ya inicializamos con esta misma clave, no hacemos nada.
    if (lastInitKeyRef.current === initKey) return;
    lastInitKeyRef.current = initKey;

    if (product) {
      const initialImages = Array.isArray(product.imagenes) && product.imagenes.length > 0
        ? product.imagenes
        : (product.imagen ? [product.imagen] : []);

      const cat = product.categoria || defaultCategory || 'Papelería';
      const isCinta = cat === 'Cintas' || Boolean(product.ventaPorMetro);
      const isBolsa = cat === 'Bolsas de Regalo';

      const initialMotivos = Array.isArray(product.motivos) && product.motivos.length > 0
        ? product.motivos 
        : (isBolsa ? DEFAULT_MOTIVOS : []);

      const isCordón_init = cat === 'Cordones';
      const initialColores = Array.isArray(product.colores) && product.colores.length > 0 
        ? product.colores 
        : (isCinta ? DEFAULT_COLORES_CINTA : (isBolsa ? DEFAULT_COLORES_BOLSA : (isCordón_init ? DEFAULT_COLORES_CORDON : [])));

      const isCalzadoRopa = cat === 'Chancletas' || cat === 'Ropa';

      // Construir stockPorVariante con valores por defecto si no existen
      let initialStockPorVariante = product.stockPorVariante ? { ...product.stockPorVariante } : {};
      if (isBolsa) {
        const keys = product.subcategoria === 'Bolsa Brillante' ? initialColores : initialMotivos;
        const defaultQty = Math.max(1, Math.floor((Number(product.stock) || 50) / (keys.length || 1)));
        keys.forEach(k => {
          if (initialStockPorVariante[k] === undefined) {
            initialStockPorVariante[k] = defaultQty;
          }
        });
      }
      if (isCordón_init) {
        // Stock por color (clave simple), igual que Bolsa Brillante
        // Limpiar claves antiguas tipo "Redondo|Corto|Blanco" si existen
        const hasOldKeys = Object.keys(initialStockPorVariante).some(k => k.includes('|'));
        if (hasOldKeys) initialStockPorVariante = {};
        const cols = initialColores.length > 0 ? initialColores : DEFAULT_COLORES_CORDON;
        const defaultQty = Math.max(1, Math.floor((Number(product.stock) || cols.length * 5) / (cols.length || 1)));
        cols.forEach(c => {
          if (initialStockPorVariante[c] === undefined) {
            initialStockPorVariante[c] = defaultQty;
          }
        });
      }

      // Inicializar variantes de Chancletas/Ropa (tallas individuales por género y precios individuales)
      let initialTallasPorGenero = {};
      let initialPreciosPorVariante = product.preciosPorVariante ? { ...product.preciosPorVariante } : {};
      let initialPrecioPorGenero = product.precioPorGenero ? { ...product.precioPorGenero } : {};

      if (isCalzadoRopa) {
        const defaultMap = cat === 'Chancletas' ? DEFAULT_TALLAS_POR_GENERO_CHANCLETA : DEFAULT_TALLAS_POR_GENERO_ROPA;
        
        if (product.tallasPorGenero && typeof product.tallasPorGenero === 'object' && Object.keys(product.tallasPorGenero).length > 0) {
          initialTallasPorGenero = { ...product.tallasPorGenero };
        } else if (Object.keys(initialStockPorVariante).length > 0) {
          // Reconstruir tallasPorGenero desde las claves stockPorVariante
          Object.keys(initialStockPorVariante).forEach(k => {
            const parts = k.split('|');
            if (parts.length === 2) {
              const [g, t] = parts;
              if (!initialTallasPorGenero[g]) initialTallasPorGenero[g] = [];
              if (!initialTallasPorGenero[g].includes(t)) initialTallasPorGenero[g].push(t);
            }
          });
        }

        // Si todavía está vacío, usar SOLO los géneros que el producto tenía guardados
        // (nunca forzar DEFAULT_GENEROS para no restaurar géneros eliminados)
        if (Object.keys(initialTallasPorGenero).length === 0) {
          const gens = Array.isArray(product.generos) && product.generos.length > 0
            ? product.generos
            : DEFAULT_GENEROS; // Solo si el producto nunca tuvo géneros guardados
          gens.forEach(g => {
            initialTallasPorGenero[g] = defaultMap[g] ? [...defaultMap[g]] : ['S', 'M', 'L'];
          });
        }

        // Asegurar stock y precio para cada talla de cada género
        Object.entries(initialTallasPorGenero).forEach(([g, tList]) => {
          tList.forEach(t => {
            const k = `${g}|${t}`;
            if (initialStockPorVariante[k] === undefined) {
              initialStockPorVariante[k] = 0;
            }
            if (initialPreciosPorVariante[k] === undefined) {
              initialPreciosPorVariante[k] = initialPrecioPorGenero[g] || product.precio || 0;
            }
          });
        });
      }

      const totalCalculatedStock = (isBolsa || isCalzadoRopa || isCordón_init) && Object.keys(initialStockPorVariante).length > 0
        ? Object.values(initialStockPorVariante).reduce((acc, v) => acc + Number(v || 0), 0)
        : (product.stock ?? 0);

      const allActiveGeneros = isCalzadoRopa
        ? (Array.isArray(product.generos) && product.generos.length > 0 ? product.generos : Object.keys(initialTallasPorGenero))
        : [];

      const initialCost = product.precioCosto || product.costo || '';
      const initialMargin = product.margenGanancia || getSuggestedMargin(cat);
      setMargenPorcentaje(initialMargin);

      setFormData({
        id: product.id || (product.codigo ? `PROD-${String(product.codigo).trim()}` : undefined),
        legacyId: product.legacyId,
        nombre: product.nombre || '',
        codigo: product.codigo || '',
        categoria: cat,
        subcategoria: product.tipoArticulo || product.subcategoria || (
          isBolsa ? 'Bolsa de Papel' : (isCinta ? 'Cinta de Papel (Delgada)' : '')
        ),
        tipoArticulo: product.tipoArticulo || product.subcategoria || '',
        motivos: initialMotivos,
        colores: initialColores,
        tallas: Array.isArray(product.tallas) ? product.tallas : [],
        generos: allActiveGeneros,
        tallasPorGenero: initialTallasPorGenero,
        stockPorVariante: initialStockPorVariante,
        preciosPorVariante: initialPreciosPorVariante,
        precioPorGenero: initialPrecioPorGenero,
        ventaPorMetro: isCinta,
        stockIlimitado: isCinta || Boolean(product.stockIlimitado),
        precioCosto: initialCost,
        costo: initialCost,
        precio: product.precio || 0,
        stock: isCinta ? 99999 : totalCalculatedStock,
        permitePaquete: Boolean(product.permitePaquete),
        unidadesPorPaquete: product.unidadesPorPaquete || 10,
        precioPaquete: product.precioPaquete || (product.precio ? product.precio * 10 * 0.9 : 0),
        unidadMedida: product.unidadMedida || (isCinta ? 'metro' : 'unidad'),
        imagen: initialImages[0] || product.imagen || '',
        imagenes: initialImages,
        descripcion: product.descripcion || ''
      });
    } else {
      // Modo Nuevo Producto
      const cat = defaultCategory || 'Papelería';
      const isCinta = cat === 'Cintas';
      const isBolsa = cat === 'Bolsas de Regalo';
      const isCalzadoRopa = cat === 'Chancletas' || cat === 'Ropa';
      const isCordón_new = cat === 'Cordones';

      const initialMargin = getSuggestedMargin(cat);
      setMargenPorcentaje(initialMargin);

      const initialStockMap = {};
      const initialPreciosMap = {};
      const initialTallasPorGenero = {};

      if (isBolsa) {
        DEFAULT_MOTIVOS.forEach(m => { initialStockMap[m] = 10; });
      } else if (isCalzadoRopa) {
        const defaultMap = cat === 'Chancletas' ? DEFAULT_TALLAS_POR_GENERO_CHANCLETA : DEFAULT_TALLAS_POR_GENERO_ROPA;
        DEFAULT_GENEROS.forEach(g => {
          initialTallasPorGenero[g] = defaultMap[g] ? [...defaultMap[g]] : ['S', 'M', 'L'];
          initialTallasPorGenero[g].forEach(t => {
            initialStockMap[`${g}|${t}`] = 0;
            initialPreciosMap[`${g}|${t}`] = 0;
          });
        });
      } else if (isCordón_new) {
        // Stock por color (clave simple), igual que Bolsa Brillante
        DEFAULT_COLORES_CORDON.forEach(c => { initialStockMap[c] = 5; });
      }

      const cordónInitialTotal = isCordón_new ? DEFAULT_COLORES_CORDON.length * 5 : 0;

      setFormData({
        nombre: '',
        codigo: autoCode || '',
        categoria: cat,
        subcategoria: isBolsa ? 'Bolsa de Papel' : (isCinta ? 'Cinta de Papel (Delgada)' : ''),
        tipoArticulo: '',
        motivos: isBolsa ? DEFAULT_MOTIVOS : [],
        colores: isCinta ? DEFAULT_COLORES_CINTA : (isBolsa ? DEFAULT_COLORES_BOLSA : (isCordón_new ? DEFAULT_COLORES_CORDON : [])),
        tallas: [],
        generos: isCalzadoRopa ? DEFAULT_GENEROS : [],
        tallasPorGenero: initialTallasPorGenero,
        stockPorVariante: initialStockMap,
        preciosPorVariante: initialPreciosMap,
        precioPorGenero: {},
        ventaPorMetro: isCinta,
        stockIlimitado: isCinta,
        precioCosto: '',
        costo: '',
        precio: isCinta ? 500 : (isBolsa ? 2500 : (isCordón_new ? 1000 : 0)),
        stock: isCinta ? 99999 : (isBolsa ? 50 : (isCordón_new ? cordónInitialTotal : 0)),
        permitePaquete: false,
        unidadesPorPaquete: 10,
        precioPaquete: 0,
        unidadMedida: isCinta ? 'metro' : (isCordón_new ? 'par' : 'unidad'),
        tiposCordón: isCordón_new ? TIPOS_CORDON : [],
        longitudesCordón: isCordón_new ? LONGITUDES_CORDON : [],
        imagen: '',
        imagenes: [],
        descripcion: ''
      });
    }
    setNuevoMotivo('');
    setNuevoMotivoStock(10);
    setNuevoColor('');
    setNuevoColorStock(5);
    setNuevaTalla('');
    setNuevaTallaNombre({});
    setNuevaTallaStock({});
    setNuevaTallaPrecio({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, product, defaultCategory, autoCode]);

  if (!isOpen) return null;

  const isCinta = formData.categoria === 'Cintas' || Boolean(formData.ventaPorMetro);
  const isBolsa = formData.categoria === 'Bolsas de Regalo';
  const isCalzadoRopa = formData.categoria === 'Chancletas' || formData.categoria === 'Ropa';
  const isAlquiler = formData.categoria === 'Alquiler';
  const isCordón = formData.categoria === 'Cordones';
  const isAvailable = isCinta || isCordón || Number(formData.stock) > 0;

  const handleCategoryChange = (nextCat) => {
    const isNowCinta = nextCat === 'Cintas';
    const isNowBolsa = nextCat === 'Bolsas de Regalo';
    const isNowCalzadoRopa = nextCat === 'Chancletas' || nextCat === 'Ropa';
    const isNowCordón = nextCat === 'Cordones';

    const newMargin = getSuggestedMargin(nextCat);
    setMargenPorcentaje(newMargin);
    const costNum = parseFloat(formData.precioCosto) || 0;
    const calcPrice = costNum > 0 ? calculateSellingPrice(costNum, newMargin) : undefined;

    let initialStockMap = {};
    let initialPreciosMap = {};
    let initialTallasPorGenero = {};

    if (isNowBolsa) {
      DEFAULT_MOTIVOS.forEach(m => { initialStockMap[m] = 10; });
    } else if (isNowCalzadoRopa) {
      const defaultMap = nextCat === 'Chancletas' ? DEFAULT_TALLAS_POR_GENERO_CHANCLETA : DEFAULT_TALLAS_POR_GENERO_ROPA;
      // Preservar géneros activos si ya hay alguno seleccionado; de lo contrario usar defaults
      const activeGens = (formData.generos && formData.generos.length > 0) ? formData.generos : DEFAULT_GENEROS;
      activeGens.forEach(g => {
        initialTallasPorGenero[g] = defaultMap[g] ? [...defaultMap[g]] : ['S', 'M', 'L'];
        initialTallasPorGenero[g].forEach(t => {
          initialStockMap[`${g}|${t}`] = 0;
          initialPreciosMap[`${g}|${t}`] = 0;
        });
      });
    } else if (isNowCordón) {
      // Stock por color (clave simple), igual que Bolsa Brillante
      const cols = (formData?.colores && Array.isArray(formData.colores) && formData.colores.length > 0) 
        ? formData.colores 
        : DEFAULT_COLORES_CORDON;
      cols.forEach(c => { initialStockMap[c] = 5; });
    }

    setFormData(prev => ({
      ...prev,
      categoria: nextCat,
      ...(calcPrice !== undefined ? { precio: calcPrice } : {}),
      subcategoria: isNowBolsa 
        ? (prev.subcategoria && prev.subcategoria.includes('Bolsa') ? prev.subcategoria : 'Bolsa de Papel')
        : (isNowCinta ? (prev.subcategoria && prev.subcategoria.includes('Cinta') ? prev.subcategoria : 'Cinta de Papel (Delgada)') : prev.subcategoria),
      tipoArticulo: isNowCalzadoRopa ? prev.tipoArticulo : '',
      ventaPorMetro: isNowCinta,
      stockIlimitado: isNowCinta,
      unidadMedida: isNowCinta ? 'metro' : (isNowCordón ? 'par' : 'unidad'),
      stock: isNowCinta ? 99999 : (isNowBolsa ? 50 : (isNowCalzadoRopa ? 0 : (isNowCordón ? Object.values(initialStockMap).reduce((s, v) => s + Number(v || 0), 0) : (prev.stock === 99999 ? 20 : prev.stock)))),
      motivos: isNowBolsa ? (prev.motivos.length > 0 ? prev.motivos : DEFAULT_MOTIVOS) : prev.motivos,
      colores: isNowCinta 
        ? (prev.colores?.length > 0 ? prev.colores : DEFAULT_COLORES_CINTA)
        : (isNowBolsa ? (prev.colores?.length > 0 ? prev.colores : DEFAULT_COLORES_BOLSA)
        : (isNowCordón ? (prev.colores?.length > 0 ? prev.colores : DEFAULT_COLORES_CORDON) : prev.colores)),
      // Al cambiar a CalzadoRopa, preservar géneros activos si ya existían
      generos: isNowCalzadoRopa ? ((prev.generos && prev.generos.length > 0) ? prev.generos : DEFAULT_GENEROS) : prev.generos,
      tallasPorGenero: isNowCalzadoRopa ? initialTallasPorGenero : {},
      // Para cordones: tipos y longitudes se guardan en subcampos especiales
      tiposCordón: isNowCordón ? (prev.tiposCordón && prev.tiposCordón.length > 0 ? prev.tiposCordón : TIPOS_CORDON) : prev.tiposCordón,
      longitudesCordón: isNowCordón ? (prev.longitudesCordón && prev.longitudesCordón.length > 0 ? prev.longitudesCordón : LONGITUDES_CORDON) : prev.longitudesCordón,
      stockPorVariante: (isNowBolsa || isNowCalzadoRopa || isNowCordón)
        ? (Object.keys(prev.stockPorVariante || {}).length > 0 && (
            (isNowBolsa && Object.keys(prev.stockPorVariante)[0] && !Object.keys(prev.stockPorVariante)[0].includes('|')) ||
            (isNowCalzadoRopa && Object.keys(prev.stockPorVariante)[0] && Object.keys(prev.stockPorVariante)[0].includes('|')) ||
            (isNowCordón && Object.keys(prev.stockPorVariante)[0] && !Object.keys(prev.stockPorVariante)[0].includes('|'))
          ) ? prev.stockPorVariante : initialStockMap)
        : {},
      preciosPorVariante: (isNowCalzadoRopa || isNowCordón) ? (prev.preciosPorVariante || initialPreciosMap) : {},
      permitePaquete: (isNowCinta || isNowBolsa || isNowCalzadoRopa || isNowCordón || nextCat === 'Alquiler') ? false : prev.permitePaquete
    }));
  };

  // Modificar stock de una talla de un género específico
  const handleCambiarStockTalla = (genero, talla, val) => {
    const key = `${genero}|${talla}`;
    const nextStockMap = { ...(formData.stockPorVariante || {}), [key]: Math.max(0, parseInt(val) || 0) };
    const total = Object.values(nextStockMap).reduce((a, b) => a + Number(b || 0), 0);
    setFormData(prev => ({
      ...prev,
      stockPorVariante: nextStockMap,
      stock: total
    }));
  };

  // Modificar precio individual de una talla de un género específico
  const handleCambiarPrecioTalla = (genero, talla, val) => {
    const key = `${genero}|${talla}`;
    const nextPrecioMap = { ...(formData.preciosPorVariante || {}), [key]: Math.max(0, parseFloat(val) || 0) };
    setFormData(prev => ({
      ...prev,
      preciosPorVariante: nextPrecioMap
    }));
  };

  // Aplicar un precio general a todas las tallas de un género específico
  const handleAplicarPrecioAGenero = (genero, precio) => {
    const p = Math.max(0, parseFloat(precio) || 0);
    const tallasDelGen = (formData.tallasPorGenero && formData.tallasPorGenero[genero]) || [];
    const nextPrecioMap = { ...(formData.preciosPorVariante || {}) };
    tallasDelGen.forEach(t => {
      nextPrecioMap[`${genero}|${t}`] = p;
    });
    setFormData(prev => ({
      ...prev,
      preciosPorVariante: nextPrecioMap,
      precioPorGenero: { ...(prev.precioPorGenero || {}), [genero]: p }
    }));
  };

  // Agregar una talla a un género específico de forma individual
  const handleAgregarTallaAGenero = (genero, nombre, stock, precio) => {
    const tName = String(nombre || '').trim();
    if (!tName) return;
    const currentTallas = (formData.tallasPorGenero && formData.tallasPorGenero[genero]) || [];
    if (currentTallas.includes(tName)) {
      alert(`La talla "${tName}" ya existe para ${genero}.`);
      return;
    }

    const nextTallas = [...currentTallas, tName];
    const key = `${genero}|${tName}`;
    const s = Math.max(0, parseInt(stock) || 0);
    const p = Math.max(0, parseFloat(precio) || (formData.precioPorGenero?.[genero] ?? formData.precio) || 0);

    const nextTallasPorGenero = {
      ...(formData.tallasPorGenero || {}),
      [genero]: nextTallas
    };

    const nextStockMap = {
      ...(formData.stockPorVariante || {}),
      [key]: s
    };

    const nextPreciosMap = {
      ...(formData.preciosPorVariante || {}),
      [key]: p
    };

    const total = Object.values(nextStockMap).reduce((a, b) => a + Number(b || 0), 0);

    setFormData(prev => ({
      ...prev,
      tallasPorGenero: nextTallasPorGenero,
      stockPorVariante: nextStockMap,
      preciosPorVariante: nextPreciosMap,
      stock: total
    }));

    setNuevaTallaNombre(prev => ({ ...prev, [genero]: '' }));
    setNuevaTallaStock(prev => ({ ...prev, [genero]: '' }));
    setNuevaTallaPrecio(prev => ({ ...prev, [genero]: '' }));
  };

  // Quitar una talla de un género específico
  const handleQuitarTallaDeGenero = (genero, talla) => {
    const currentTallas = (formData.tallasPorGenero && formData.tallasPorGenero[genero]) || [];
    const nextTallas = currentTallas.filter(t => t !== talla);

    const nextTallasPorGenero = {
      ...(formData.tallasPorGenero || {}),
      [genero]: nextTallas
    };

    const key = `${genero}|${talla}`;
    const nextStockMap = { ...(formData.stockPorVariante || {}) };
    delete nextStockMap[key];

    const nextPreciosMap = { ...(formData.preciosPorVariante || {}) };
    delete nextPreciosMap[key];

    const total = Object.values(nextStockMap).reduce((a, b) => a + Number(b || 0), 0);

    setFormData(prev => ({
      ...prev,
      tallasPorGenero: nextTallasPorGenero,
      stockPorVariante: nextStockMap,
      preciosPorVariante: nextPreciosMap,
      stock: total
    }));
  };

  // Quitar un género completo
  const handleQuitarGeneroCompleto = (genero) => {
    const currentGeneros = (formData.generos && formData.generos.length > 0) ? formData.generos : DEFAULT_GENEROS;
    const nextGeneros = currentGeneros.filter(g => g !== genero);

    const nextTallasPorGenero = { ...(formData.tallasPorGenero || {}) };
    delete nextTallasPorGenero[genero];

    const nextStockMap = {};
    Object.entries(formData.stockPorVariante || {}).forEach(([k, v]) => {
      if (!k.startsWith(`${genero}|`)) nextStockMap[k] = v;
    });

    const nextPreciosMap = {};
    Object.entries(formData.preciosPorVariante || {}).forEach(([k, v]) => {
      if (!k.startsWith(`${genero}|`)) nextPreciosMap[k] = v;
    });

    const total = Object.values(nextStockMap).reduce((a, b) => a + Number(b || 0), 0);

    setFormData(prev => ({
      ...prev,
      generos: nextGeneros,
      tallasPorGenero: nextTallasPorGenero,
      stockPorVariante: nextStockMap,
      preciosPorVariante: nextPreciosMap,
      stock: total
    }));
  };

  // Volver a activar un género
  const handleAgregarGeneroNuevo = (genero) => {
    const currentGeneros = (formData.generos && formData.generos.length > 0) ? formData.generos : [];
    if (currentGeneros.includes(genero)) return;

    const defaultMap = formData.categoria === 'Chancletas' 
      ? DEFAULT_TALLAS_POR_GENERO_CHANCLETA 
      : DEFAULT_TALLAS_POR_GENERO_ROPA;

    const initialTallas = defaultMap[genero] ? [...defaultMap[genero]] : ['S', 'M', 'L'];
    const nextGeneros = [...currentGeneros, genero];

    const nextTallasPorGenero = {
      ...(formData.tallasPorGenero || {}),
      [genero]: initialTallas
    };

    const nextStockMap = { ...(formData.stockPorVariante || {}) };
    const nextPreciosMap = { ...(formData.preciosPorVariante || {}) };

    initialTallas.forEach(t => {
      nextStockMap[`${genero}|${t}`] = 0;
      nextPreciosMap[`${genero}|${t}`] = formData.precio || 0;
    });

    setFormData(prev => ({
      ...prev,
      generos: nextGeneros,
      tallasPorGenero: nextTallasPorGenero,
      stockPorVariante: nextStockMap,
      preciosPorVariante: nextPreciosMap
    }));
  };

  const handleSubcategoriaBolsaChange = (sub) => {
    const isBrillante = sub === 'Bolsa Brillante';
    const keys = isBrillante ? (formData.colores.length > 0 ? formData.colores : DEFAULT_COLORES_BOLSA) : (formData.motivos.length > 0 ? formData.motivos : DEFAULT_MOTIVOS);
    const newStockMap = {};
    keys.forEach(k => {
      newStockMap[k] = formData.stockPorVariante?.[k] !== undefined ? formData.stockPorVariante[k] : 5;
    });
    const total = Object.values(newStockMap).reduce((a, b) => a + Number(b || 0), 0);

    setFormData(prev => ({
      ...prev,
      subcategoria: sub,
      colores: isBrillante && prev.colores.length === 0 ? DEFAULT_COLORES_BOLSA : prev.colores,
      motivos: !isBrillante && prev.motivos.length === 0 ? DEFAULT_MOTIVOS : prev.motivos,
      stockPorVariante: newStockMap,
      stock: total
    }));
  };

  const handleToggleAvailable = () => {
    if (isCinta) return;
    setFormData(prev => ({
      ...prev,
      stock: prev.stock > 0 ? 0 : 10
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalNombre = isCalzadoRopa 
      ? (formData.tipoArticulo || formData.subcategoria || formData.nombre || '').trim()
      : formData.nombre.trim();

    if (!finalNombre) {
      alert(formData.categoria === 'Chancletas' 
        ? 'Por favor escribe el modelo o tipo de chancleta.' 
        : (isCalzadoRopa ? 'Por favor escribe el tipo de prenda.' : 'Por favor escribe el nombre del producto.'));
      return;
    }
    if (!String(formData.codigo).trim()) {
      alert('Por favor ingresa un código de barras o referencia para el producto.');
      return;
    }

    const mainImage = formData.imagenes && formData.imagenes.length > 0 
      ? formData.imagenes[0] 
      : (formData.imagen || '');

    const hasVariantStock = (isBolsa || isCalzadoRopa || isCordón) && Object.keys(formData.stockPorVariante || {}).length > 0;
    const resolvedStock = isCinta 
      ? 99999 
      : (hasVariantStock
          ? Object.values(formData.stockPorVariante).reduce((acc, curr) => acc + Number(curr || 0), 0)
          : Math.max(0, parseInt(formData.stock) || 0));

    const variantPrices = isCalzadoRopa && formData.preciosPorVariante
      ? Object.values(formData.preciosPorVariante).map(Number).filter(v => !isNaN(v) && v > 0)
      : [];
    const minVariantPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : 0;

    const resolvedPrecio = Math.max(0, parseFloat(formData.precio) || minVariantPrice || 0);

    const allUniqueTallas = isCalzadoRopa
      ? [...new Set(Object.values(formData.tallasPorGenero || {}).flat())]
      : (formData.tallas || []);

    const productPayload = {
      ...(product || {}),
      ...formData,
      id: product?.id || formData.id || (formData.codigo ? `PROD-${String(formData.codigo).trim()}` : undefined),
      codigo: String(formData.codigo).trim(),
      nombre: finalNombre,
      categoria: formData.categoria,
      subcategoria: isCalzadoRopa ? finalNombre : (isCordón ? '' : (formData.tipoArticulo || formData.subcategoria || '')),
      tipoArticulo: isCalzadoRopa ? finalNombre : (isCordón ? '' : (formData.tipoArticulo || formData.subcategoria || '')),
      motivos: isBolsa ? formData.motivos : [],
      colores: (isCinta || (isBolsa && formData.subcategoria === 'Bolsa Brillante') || isCordón) ? formData.colores : [],
      tallas: isCalzadoRopa ? allUniqueTallas : [],
      generos: isCalzadoRopa ? (formData.generos && formData.generos.length > 0 ? formData.generos : Object.keys(formData.tallasPorGenero || {})) : [],
      tallasPorGenero: isCalzadoRopa ? formData.tallasPorGenero : undefined,
      // Cordones: tipos y longitudes como arrays propios
      tiposCordón: isCordón ? (formData.tiposCordón && formData.tiposCordón.length > 0 ? formData.tiposCordón : TIPOS_CORDON) : undefined,
      longitudesCordón: isCordón ? (formData.longitudesCordón && formData.longitudesCordón.length > 0 ? formData.longitudesCordón : LONGITUDES_CORDON) : undefined,
      stockPorVariante: (isBolsa || isCalzadoRopa || isCordón) ? formData.stockPorVariante : undefined,
      preciosPorVariante: (isCalzadoRopa || isCordón) ? formData.preciosPorVariante : undefined,
      precioPorGenero: isCalzadoRopa ? formData.precioPorGenero : undefined,
      imagen: mainImage,
      imagenes: formData.imagenes || [],
      costo: parseFloat(formData.precioCosto) || 0,
      precioCosto: parseFloat(formData.precioCosto) || 0,
      margenGanancia: Number(margenPorcentaje) || 50,
      precio: resolvedPrecio,
      stock: resolvedStock,
      stockIlimitado: isCinta || Boolean(formData.stockIlimitado),
      ventaPorMetro: isCinta,
      unidadMedida: isCinta ? 'metro' : (isCordón ? 'par' : (formData.unidadMedida || 'unidad')),
      permitePaquete: (!isCinta && !isBolsa && !isCalzadoRopa && !isCordón && !isAlquiler) ? Boolean(formData.permitePaquete) : false,
      unidadesPorPaquete: formData.permitePaquete ? (parseInt(formData.unidadesPorPaquete) || 10) : null,
      precioPaquete: formData.permitePaquete ? (parseFloat(formData.precioPaquete) || 0) : null,
    };

    onSave(productPayload, product?.id || product?.codigo);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1300 }}>
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '680px',
          width: '95%',
          maxHeight: '92vh',
          borderRadius: '24px',
          background: 'var(--bg-secondary, #111827)',
          border: '1px solid var(--border-strong)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 65px rgba(0, 0, 0, 0.75)'
        }}
      >
        {/* Cabecera del Modal */}
        <div style={{
          padding: '16px 22px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-tertiary)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>
              {isCinta ? '🎗️' : isBolsa ? '🎁' : isCordón ? '👟' : isEditing ? '✏️' : '✨'}
            </span>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {isEditing ? `Editar: ${formData.nombre || 'Producto'}` : 'Crear Nuevo Producto'}
              </h2>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Sección: <strong>{formData.categoria}</strong> • {isCinta ? 'Venta x Metro (∞)' : isBolsa ? 'Stock Individual por Variante' : isCordón ? 'Cordones — Venta por Par (Color + Tipo + Longitud)' : 'Inventario General'}
              </span>
            </div>
          </div>

          <button 
            type="button" 
            onClick={onClose} 
            className="btn btn-outline"
            style={{ padding: '6px 10px', borderRadius: '10px' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflowY: 'auto',
            flex: 1
          }}>
            
            {/* Selector Visual de Categorías */}
            <div>
              <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                Categoría del Producto *:
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {CATEGORIES_LIST.map((c) => {
                  const isSelected = formData.categoria === c;
                  const emoji = CATEGORY_EMOJIS[c] || '🏷️';
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleCategoryChange(c)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid var(--accent-blue, #3b82f6)' : '1px solid var(--border-color)',
                        background: isSelected 
                          ? (c === 'Cintas' ? 'rgba(16, 185, 129, 0.22)' : c === 'Bolsas de Regalo' ? 'rgba(236, 72, 153, 0.22)' : c === 'Cordones' ? 'rgba(251, 146, 60, 0.22)' : c === 'Bisutería' ? 'rgba(234, 179, 8, 0.22)' : c === 'Seguros' ? 'rgba(20, 184, 166, 0.25)' : 'rgba(59, 130, 246, 0.22)')
                          : 'rgba(255, 255, 255, 0.04)',
                        color: isSelected 
                          ? (c === 'Cintas' ? '#6ee7b7' : c === 'Bolsas de Regalo' ? '#f472b6' : c === 'Cordones' ? '#fb923c' : c === 'Bisutería' ? '#facc15' : c === 'Seguros' ? '#2dd4bf' : '#93c5fd')
                          : 'var(--text-muted)',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>{emoji}</span>
                      <span>{c}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* IDENTIFICACIÓN DEL PRODUCTO: UNIFICADA PARA ROPA/CHANCLETAS VS NORMAL */}
            {isCalzadoRopa ? (
              <div style={{
                padding: '14px 16px',
                borderRadius: '16px',
                background: formData.categoria === 'Chancletas' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(139, 92, 246, 0.08)',
                border: `1.5px solid ${formData.categoria === 'Chancletas' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(139, 92, 246, 0.35)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px', alignItems: 'flex-start' }}>
                  {/* Tipo de Prenda / Modelo */}
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: formData.categoria === 'Chancletas' ? '#fbbf24' : '#c084fc', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <span>{formData.categoria === 'Chancletas' ? '🩴' : '👕'}</span>
                      <span>{formData.categoria === 'Chancletas' ? 'Tipo o Modelo de Chancleta (por escrito) *:' : 'Tipo de Prenda / Artículo de Ropa (por escrito) *:'}</span>
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.tipoArticulo || formData.subcategoria || formData.nombre || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, tipoArticulo: val, subcategoria: val, nombre: val });
                      }}
                      placeholder={formData.categoria === 'Chancletas' ? 'Ej: Havaianas, Sandalia playera, Crocs...' : 'Ej: Camisa, Pantalón, Bóxer, Vestido, Pijama...'}
                      required
                      style={{ fontSize: '0.88rem', fontWeight: 700 }}
                    />
                  </div>

                  {/* Código de Barras */}
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <span>📦</span>
                      <span>Código de Barras *:</span>
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                      placeholder="Ej: 8203"
                      required
                      style={{ textAlign: 'center', fontWeight: 800, letterSpacing: '2px', fontSize: '0.95rem' }}
                    />
                  </div>
                </div>

                {/* Sugerencias rápidas de un clic */}
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700 }}>Sugerencias rápidas:</span>
                  {(formData.categoria === 'Chancletas' ? SUGGESTED_CHANCLETA_TIPOS : SUGGESTED_ROPA_TIPOS).map(sug => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setFormData({ ...formData, tipoArticulo: sug, subcategoria: sug, nombre: sug })}
                      style={{
                        background: (formData.tipoArticulo || formData.subcategoria || formData.nombre) === sug ? (formData.categoria === 'Chancletas' ? '#f59e0b' : '#8b5cf6') : 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-color)',
                        color: (formData.tipoArticulo || formData.subcategoria || formData.nombre) === sug ? '#000' : 'var(--text-main)',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Nombre del Producto *:
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder={isCinta ? "Ej: Cinta de Papel Ancha..." : isBolsa ? "Ej: Bolsa de Regalo Mediana..." : formData.categoria === 'Bisutería' ? "Ej: Aretes de Acero, Collar Perlas..." : "Nombre comercial..."}
                    required
                  />
                  {formData.categoria === 'Bisutería' && (
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '6px' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700 }}>Sugerencias:</span>
                      {['Aretes', 'Topos', 'Collar', 'Pulsera', 'Anillo', 'Cadena', 'Tobillera', 'Choker', 'Set'].map(sug => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => setFormData({ ...formData, nombre: formData.nombre ? `${sug} ${formData.nombre.replace(/^(Aretes|Topos|Collar|Pulsera|Anillo|Cadena|Tobillera|Choker|Set)\s*/i, '')}` : sug })}
                          style={{
                            background: 'rgba(234, 179, 8, 0.12)',
                            border: '1px solid rgba(234, 179, 8, 0.3)',
                            color: '#facc15',
                            borderRadius: '6px',
                            padding: '2px 7px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Código de Barras / Ref *:
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder="Ej: 8001"
                    required
                  />
                </div>
              </div>
            )}

            {/* SECCIÓN ESPECIAL DINÁMICA: CINTAS */}
            {isCinta && (
              <div style={{
                padding: '16px',
                borderRadius: '16px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1.5px solid rgba(16, 185, 129, 0.35)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Scissors size={18} color="#34d399" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#34d399' }}>
                      Configuración de Cinta para Venta por Metros
                    </span>
                  </div>
                  <span style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#34d399',
                    fontSize: '0.72rem',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    fontWeight: 800
                  }}>
                    Stock Ilimitado (∞)
                  </span>
                </div>

                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0 }}>
                  Las cintas se venden fraccionadas en metros a solicitud del cliente. Al cobrarlas en caja POS se abrirá automáticamente el selector de longitud y color.
                </p>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Tipo / Material de Cinta:
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.subcategoria || ''}
                    onChange={(e) => setFormData({ ...formData, subcategoria: e.target.value })}
                    placeholder="Ej: Cinta de Tela Satinada, Cinta Navideña, Cinta de Papel Ancha..."
                    style={{ fontSize: '0.85rem' }}
                  />
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    Escribe el tipo o estilo de cinta libremente. Este texto aparecerá como referencia interna del producto.
                  </p>
                </div>

                {/* Colores de cinta */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      Colores de cinta disponibles para este producto:
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, colores: DEFAULT_COLORES_CINTA })}
                      style={{ background: 'none', border: 'none', color: '#6ee7b7', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Restablecer colores surtidos
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {formData.colores.map((c, idx) => (
                      <span key={idx} className="badge" style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: 'var(--text-main)',
                        fontSize: '0.75rem',
                        padding: '4px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span>{c}</span>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, colores: formData.colores.filter((_, i) => i !== idx) })}
                          style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0 }}
                        >✕</button>
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      placeholder="Agregar otro color (ej: Dorado Brillante, Vinotinto)..."
                      value={nuevoColor}
                      onChange={(e) => setNuevoColor(e.target.value)}
                      className="input-field"
                      style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (nuevoColor.trim() && !formData.colores.includes(nuevoColor.trim())) {
                            setFormData({ ...formData, colores: [...formData.colores, nuevoColor.trim()] });
                            setNuevoColor('');
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => {
                        if (!nuevoColor.trim()) return;
                        if (!formData.colores.includes(nuevoColor.trim())) {
                          setFormData({ ...formData, colores: [...formData.colores, nuevoColor.trim()] });
                        }
                        setNuevoColor('');
                      }}
                      style={{ padding: '6px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                    >
                      + Agregar Color
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SECCIÓN ESPECIAL DINÁMICA: CORDONES POR COLOR, TIPO Y LONGITUD */}
            {isCordón && (
              <CordonesFormSection
                formData={formData}
                setFormData={setFormData}
                nuevoColor={nuevoColor}
                setNuevoColor={setNuevoColor}
              />
            )}

            {/* SECCIÓN ESPECIAL DINÁMICA: BOLSAS DE REGALO CON STOCK INDIVIDUAL */}
            {isBolsa && (
              <div style={{
                padding: '16px',
                borderRadius: '16px',
                background: 'rgba(236, 72, 153, 0.08)',
                border: '1.5px solid rgba(236, 72, 153, 0.35)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Gift size={18} color="#f472b6" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f472b6' }}>
                      Configuración de Bolsa de Regalo (Control de Stock por Variante)
                    </span>
                  </div>
                  <span style={{
                    background: 'rgba(236, 72, 153, 0.2)',
                    color: '#f472b6',
                    fontSize: '0.75rem',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    fontWeight: 800
                  }}>
                    Total: {formData.stock} unidades
                  </span>
                </div>

                {/* Subcategoría: Papel vs Brillante */}
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Tipo de Bolsa:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleSubcategoriaBolsaChange('Bolsa de Papel')}
                      style={{
                        padding: '10px',
                        borderRadius: '10px',
                        border: formData.subcategoria === 'Bolsa de Papel' || !formData.subcategoria ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                        background: formData.subcategoria === 'Bolsa de Papel' || !formData.subcategoria ? 'rgba(59, 130, 246, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                        color: formData.subcategoria === 'Bolsa de Papel' || !formData.subcategoria ? '#93c5fd' : 'var(--text-muted)',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                    >
                      📜 Bolsa de Papel (Stock x Motivo)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSubcategoriaBolsaChange('Bolsa Brillante')}
                      style={{
                        padding: '10px',
                        borderRadius: '10px',
                        border: formData.subcategoria === 'Bolsa Brillante' ? '2px solid #ec4899' : '1px solid var(--border-color)',
                        background: formData.subcategoria === 'Bolsa Brillante' ? 'rgba(236, 72, 153, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                        color: formData.subcategoria === 'Bolsa Brillante' ? '#f472b6' : 'var(--text-muted)',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                    >
                      ✨ Bolsa Brillante (Stock x Color)
                    </button>
                  </div>
                </div>

                {/* Si es de Papel: Gestor de Motivos con STOCK INDIVIDUAL */}
                {(formData.subcategoria === 'Bolsa de Papel' || !formData.subcategoria) && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                        Motivos / Temáticas y sus unidades disponibles:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextMap = {};
                          DEFAULT_MOTIVOS.forEach(m => { nextMap[m] = 10; });
                          setFormData({
                            ...formData,
                            motivos: DEFAULT_MOTIVOS,
                            stockPorVariante: nextMap,
                            stock: DEFAULT_MOTIVOS.length * 10
                          });
                        }}
                        style={{ background: 'none', border: 'none', color: '#f472b6', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Restablecer motivos estándar (10 c/u)
                      </button>
                    </div>

                    {/* Lista con inputs de stock */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                      {formData.motivos.map((m, idx) => {
                        const currentQty = formData.stockPorVariante?.[m] !== undefined ? formData.stockPorVariante[m] : 10;
                        return (
                          <div key={idx} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '10px',
                            padding: '6px 10px',
                            gap: '8px'
                          }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#93c5fd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {m}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Stock:</span>
                              <input
                                type="number"
                                min="0"
                                value={currentQty}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  const nextMap = { ...(formData.stockPorVariante || {}), [m]: val };
                                  const total = Object.values(nextMap).reduce((acc, curr) => acc + Number(curr || 0), 0);
                                  setFormData({
                                    ...formData,
                                    stockPorVariante: nextMap,
                                    stock: total
                                  });
                                }}
                                style={{
                                  width: '56px',
                                  padding: '4px 6px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border-color)',
                                  background: 'var(--bg-card, #1f2937)',
                                  color: 'var(--text-main)',
                                  fontSize: '0.8rem',
                                  fontWeight: 800,
                                  textAlign: 'center'
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const nextMotivos = formData.motivos.filter((_, i) => i !== idx);
                                  const nextMap = { ...(formData.stockPorVariante || {}) };
                                  delete nextMap[m];
                                  const total = Object.values(nextMap).reduce((acc, curr) => acc + Number(curr || 0), 0);
                                  setFormData({
                                    ...formData,
                                    motivos: nextMotivos,
                                    stockPorVariante: nextMap,
                                    stock: total
                                  });
                                }}
                                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px' }}
                                title="Eliminar motivo"
                              >✕</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Agregar nuevo motivo con stock inicial */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="Nombre nuevo motivo (ej: Grado)..."
                        value={nuevoMotivo}
                        onChange={(e) => setNuevoMotivo(e.target.value)}
                        className="input-field"
                        style={{ fontSize: '0.8rem', padding: '6px 10px', flex: 2 }}
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="Stock"
                        value={nuevoMotivoStock}
                        onChange={(e) => setNuevoMotivoStock(Math.max(0, parseInt(e.target.value) || 0))}
                        className="input-field"
                        style={{ fontSize: '0.8rem', padding: '6px 10px', width: '80px', textAlign: 'center' }}
                      />
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => {
                          if (!nuevoMotivo.trim()) return;
                          const name = nuevoMotivo.trim();
                          if (!formData.motivos.includes(name)) {
                            const nextMotivos = [...formData.motivos, name];
                            const nextMap = { ...(formData.stockPorVariante || {}), [name]: nuevoMotivoStock };
                            const total = Object.values(nextMap).reduce((acc, curr) => acc + Number(curr || 0), 0);
                            setFormData({
                              ...formData,
                              motivos: nextMotivos,
                              stockPorVariante: nextMap,
                              stock: total
                            });
                          }
                          setNuevoMotivo('');
                          setNuevoMotivoStock(10);
                        }}
                        style={{ padding: '6px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                      >
                        + Agregar
                      </button>
                    </div>
                  </div>
                )}

                {/* Si es Brillante: Gestor de Colores con STOCK INDIVIDUAL */}
                {formData.subcategoria === 'Bolsa Brillante' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                        Colores brillantes y sus existencias en tienda:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextMap = {};
                          DEFAULT_COLORES_BOLSA.forEach(c => { nextMap[c] = 5; });
                          setFormData({
                            ...formData,
                            colores: DEFAULT_COLORES_BOLSA,
                            stockPorVariante: nextMap,
                            stock: DEFAULT_COLORES_BOLSA.length * 5
                          });
                        }}
                        style={{ background: 'none', border: 'none', color: '#f472b6', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Restablecer colores estándar (5 c/u)
                      </button>
                    </div>

                    {/* Lista con inputs de stock */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                      {formData.colores.map((c, idx) => {
                        const currentQty = formData.stockPorVariante?.[c] !== undefined ? formData.stockPorVariante[c] : 5;
                        return (
                          <div key={idx} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '10px',
                            padding: '6px 10px',
                            gap: '8px'
                          }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f472b6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {c}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Stock:</span>
                              <input
                                type="number"
                                min="0"
                                value={currentQty}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  const nextMap = { ...(formData.stockPorVariante || {}), [c]: val };
                                  const total = Object.values(nextMap).reduce((acc, curr) => acc + Number(curr || 0), 0);
                                  setFormData({
                                    ...formData,
                                    stockPorVariante: nextMap,
                                    stock: total
                                  });
                                }}
                                style={{
                                  width: '56px',
                                  padding: '4px 6px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border-color)',
                                  background: 'var(--bg-card, #1f2937)',
                                  color: 'var(--text-main)',
                                  fontSize: '0.8rem',
                                  fontWeight: 800,
                                  textAlign: 'center'
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const nextColores = formData.colores.filter((_, i) => i !== idx);
                                  const nextMap = { ...(formData.stockPorVariante || {}) };
                                  delete nextMap[c];
                                  const total = Object.values(nextMap).reduce((acc, curr) => acc + Number(curr || 0), 0);
                                  setFormData({
                                    ...formData,
                                    colores: nextColores,
                                    stockPorVariante: nextMap,
                                    stock: total
                                  });
                                }}
                                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px' }}
                                title="Eliminar color"
                              >✕</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Agregar nuevo color con stock inicial */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="Nombre nuevo color (ej: Turquesa)..."
                        value={nuevoColor}
                        onChange={(e) => setNuevoColor(e.target.value)}
                        className="input-field"
                        style={{ fontSize: '0.8rem', padding: '6px 10px', flex: 2 }}
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="Stock"
                        value={nuevoColorStock}
                        onChange={(e) => setNuevoColorStock(Math.max(0, parseInt(e.target.value) || 0))}
                        className="input-field"
                        style={{ fontSize: '0.8rem', padding: '6px 10px', width: '80px', textAlign: 'center' }}
                      />
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => {
                          if (!nuevoColor.trim()) return;
                          const name = nuevoColor.trim();
                          if (!formData.colores.includes(name)) {
                            const nextColores = [...formData.colores, name];
                            const nextMap = { ...(formData.stockPorVariante || {}), [name]: nuevoColorStock };
                            const total = Object.values(nextMap).reduce((acc, curr) => acc + Number(curr || 0), 0);
                            setFormData({
                              ...formData,
                              colores: nextColores,
                              stockPorVariante: nextMap,
                              stock: total
                            });
                          }
                          setNuevoColor('');
                          setNuevoColorStock(5);
                        }}
                        style={{ padding: '6px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                      >
                        + Agregar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECCIÓN ESPECIAL: CHANCLETAS / ROPA — TALLAS, STOCK Y PRECIOS INDIVIDUALES POR GÉNERO */}
            {isCalzadoRopa && (() => {
              const generos = formData.generos && formData.generos.length > 0 ? formData.generos : DEFAULT_GENEROS;
              const totalStock = Object.values(formData.stockPorVariante || {}).reduce((acc, v) => acc + Number(v || 0), 0);
              const defaultMap = formData.categoria === 'Chancletas' 
                ? DEFAULT_TALLAS_POR_GENERO_CHANCLETA 
                : DEFAULT_TALLAS_POR_GENERO_ROPA;

              return (
                <div style={{
                  padding: '16px',
                  borderRadius: '16px',
                  background: 'rgba(245, 158, 11, 0.06)',
                  border: '1.5px solid rgba(245, 158, 11, 0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>{formData.categoria === 'Chancletas' ? '🩴' : '👕'}</span>
                      <div>
                        <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fbbf24', display: 'block' }}>
                          Tallas, Stock y Precios Individuales por Género
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Cada género maneja sus propias tallas, su propio stock y su propio precio individual
                        </span>
                      </div>
                    </div>
                    <span style={{
                      background: 'rgba(245, 158, 11, 0.2)',
                      color: '#fbbf24',
                      fontSize: '0.78rem',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontWeight: 800
                    }}>
                      Stock Total: {totalStock} uds
                    </span>
                  </div>

                  {/* Tarjetas por Género */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {generos.map((g) => {
                      const gColor = GENDER_COLORS[g] || '#fbbf24';
                      const gEmoji = GENDER_EMOJIS[g] || '👤';
                      const tallasDelGen = (formData.tallasPorGenero && formData.tallasPorGenero[g]) || [];
                      const gStockTotal = tallasDelGen.reduce((acc, t) => acc + Number(formData.stockPorVariante?.[`${g}|${t}`] || 0), 0);

                      return (
                        <div key={g} style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: `1.5px solid ${gColor}44`,
                          borderRadius: '14px',
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}>
                          {/* Encabezado del género */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${gColor}22`, paddingBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '1.2rem' }}>{gEmoji}</span>
                              <span style={{ fontSize: '0.95rem', fontWeight: 900, color: gColor }}>
                                {g}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '6px' }}>
                                {tallasDelGen.length} tallas
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                                Stock {g}: <strong style={{ color: gColor }}>{gStockTotal}</strong> uds
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQuitarGeneroCompleto(g)}
                                style={{
                                  background: 'none',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  borderRadius: '6px',
                                  color: '#f87171',
                                  cursor: 'pointer',
                                  fontSize: '0.7rem',
                                  padding: '2px 6px',
                                  fontWeight: 700
                                }}
                                title={`Quitar género ${g} de este producto`}
                              >
                                ✕ Quitar {g}
                              </button>
                            </div>
                          </div>

                          {/* Control de Precio Rápido para este Género */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            background: 'rgba(0, 0, 0, 0.2)',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            flexWrap: 'wrap'
                          }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              ⚡ Precio rápido para {g}:
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input
                                type="number"
                                min="0"
                                placeholder={`Ej: ${formData.precio || 25000}`}
                                value={precioGeneralGenero[g] ?? ''}
                                onChange={(e) => setPrecioGeneralGenero({ ...precioGeneralGenero, [g]: e.target.value })}
                                style={{
                                  width: '90px',
                                  padding: '4px 6px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border-color)',
                                  background: 'var(--bg-card, #1f2937)',
                                  color: 'var(--text-main)',
                                  fontSize: '0.78rem',
                                  fontWeight: 700
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const val = precioGeneralGenero[g] || formData.precio;
                                  if (val !== undefined && val !== '') {
                                    handleAplicarPrecioAGenero(g, val);
                                  }
                                }}
                                className="btn btn-outline"
                                style={{ padding: '4px 8px', fontSize: '0.7rem', fontWeight: 700 }}
                              >
                                Aplicar a todas las tallas
                              </button>
                            </div>
                          </div>

                          {/* Lista de Tallas Individuales con Stock y Precio Individual */}
                          {tallasDelGen.length === 0 ? (
                            <div style={{ padding: '8px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                              No hay tallas agregadas para {g}. Agrega una abajo.
                            </div>
                          ) : (
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                              gap: '8px'
                            }}>
                              {tallasDelGen.map((t) => {
                                const key = `${g}|${t}`;
                                const qty = formData.stockPorVariante?.[key] !== undefined ? formData.stockPorVariante[key] : 0;
                                const precioIndividual = formData.preciosPorVariante?.[key] !== undefined
                                  ? formData.preciosPorVariante[key]
                                  : (formData.precioPorGenero?.[g] ?? formData.precio ?? 0);

                                return (
                                  <div
                                    key={key}
                                    style={{
                                      background: qty > 0 ? `${gColor}12` : 'rgba(255,255,255,0.02)',
                                      border: qty > 0 ? `1.5px solid ${gColor}66` : '1px solid var(--border-color)',
                                      borderRadius: '12px',
                                      padding: '10px 8px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      gap: '8px',
                                      textAlign: 'center'
                                    }}
                                  >
                                    {/* Talla + botón eliminar */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                      <span style={{ fontSize: '0.88rem', fontWeight: 900, color: gColor }}>
                                        {isNaN(Number(t)) ? t : `Talla ${t}`}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleQuitarTallaDeGenero(g, t)}
                                        style={{
                                          background: 'rgba(239, 68, 68, 0.12)',
                                          border: '1px solid rgba(239, 68, 68, 0.3)',
                                          color: '#f87171',
                                          cursor: 'pointer',
                                          fontSize: '0.75rem',
                                          padding: '1px 5px',
                                          borderRadius: '6px',
                                          lineHeight: '1',
                                          fontWeight: 800
                                        }}
                                        title={`Eliminar talla ${t} de ${g}`}
                                      >
                                        ✕
                                      </button>
                                    </div>
                                    {/* Stock - centrado */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                      <span style={{ fontSize: '0.63rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stock</span>
                                      <input
                                        type="number"
                                        min="0"
                                        value={qty}
                                        onChange={(e) => handleCambiarStockTalla(g, t, e.target.value)}
                                        style={{
                                          width: '64px', padding: '4px 6px', borderRadius: '8px',
                                          border: qty > 0 ? `1.5px solid ${gColor}88` : '1px solid var(--border-color)',
                                          background: qty > 0 ? `${gColor}10` : 'var(--bg-card, #111827)',
                                          color: qty > 0 ? gColor : 'var(--text-muted)',
                                          fontSize: '0.88rem', fontWeight: 800, textAlign: 'center'
                                        }}
                                      />
                                    </div>
                                    {/* Precio - centrado */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                      <span style={{ fontSize: '0.63rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>$ Precio</span>
                                      <input
                                        type="number"
                                        min="0"
                                        value={precioIndividual}
                                        onChange={(e) => handleCambiarPrecioTalla(g, t, e.target.value)}
                                        style={{
                                          width: '76px', padding: '4px 6px', borderRadius: '8px',
                                          border: '1.5px solid rgba(16,185,129,0.3)',
                                          background: 'rgba(16,185,129,0.06)',
                                          color: '#10b981', fontSize: '0.82rem', fontWeight: 800, textAlign: 'center'
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Agregar Nueva Talla Individual para este Género */}
                          <div style={{
                            marginTop: '4px',
                            background: 'rgba(0,0,0,0.18)',
                            padding: '8px 10px',
                            borderRadius: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                              + Agregar talla individual a {g}:
                            </span>
                            
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                              <input
                                type="text"
                                placeholder="Talla (ej: 34, M, XL)..."
                                value={nuevaTallaNombre[g] || ''}
                                onChange={(e) => setNuevaTallaNombre({ ...nuevaTallaNombre, [g]: e.target.value })}
                                className="input-field"
                                style={{ flex: '1 1 110px', fontSize: '0.78rem', padding: '5px 8px' }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAgregarTallaAGenero(
                                      g,
                                      nuevaTallaNombre[g],
                                      nuevaTallaStock[g] || 0,
                                      nuevaTallaPrecio[g] || formData.precioPorGenero?.[g] || formData.precio || 0
                                    );
                                  }
                                }}
                              />
                              <input
                                type="number"
                                min="0"
                                placeholder="Stock (0)"
                                value={nuevaTallaStock[g] ?? ''}
                                onChange={(e) => setNuevaTallaStock({ ...nuevaTallaStock, [g]: e.target.value })}
                                className="input-field"
                                style={{ width: '70px', fontSize: '0.78rem', padding: '5px 6px', textAlign: 'center' }}
                              />
                              <input
                                type="number"
                                min="0"
                                placeholder={`Precio ($${formData.precioPorGenero?.[g] ?? formData.precio ?? 0})`}
                                value={nuevaTallaPrecio[g] ?? ''}
                                onChange={(e) => setNuevaTallaPrecio({ ...nuevaTallaPrecio, [g]: e.target.value })}
                                className="input-field"
                                style={{ width: '90px', fontSize: '0.78rem', padding: '5px 6px', textAlign: 'right' }}
                              />
                              <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => {
                                  handleAgregarTallaAGenero(
                                    g,
                                    nuevaTallaNombre[g],
                                    nuevaTallaStock[g] || 0,
                                    nuevaTallaPrecio[g] || formData.precioPorGenero?.[g] || formData.precio || 0
                                  );
                                }}
                                style={{ padding: '5px 12px', fontSize: '0.76rem', fontWeight: 800, whiteSpace: 'nowrap' }}
                              >
                                + Agregar
                              </button>
                            </div>

                            {/* Sugerencias Rápidas para este género */}
                            {defaultMap[g] && defaultMap[g].length > 0 && (
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center', marginTop: '2px' }}>
                                <span style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>Sugerencias:</span>
                                {defaultMap[g].filter(st => !tallasDelGen.includes(st)).slice(0, 7).map(st => (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => {
                                      handleAgregarTallaAGenero(
                                        g,
                                        st,
                                        0,
                                        formData.precioPorGenero?.[g] || formData.precio || 0
                                      );
                                    }}
                                    style={{
                                      background: 'rgba(255, 255, 255, 0.05)',
                                      border: '1px solid var(--border-color)',
                                      color: 'var(--text-main)',
                                      borderRadius: '4px',
                                      padding: '1px 5px',
                                      fontSize: '0.68rem',
                                      cursor: 'pointer'
                                    }}
                                    title={`Agregar talla ${st} a ${g}`}
                                  >
                                    +{st}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Volver a agregar un género eliminado */}
                  {generos.length < DEFAULT_GENEROS.length && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                        + Agregar género:
                      </span>
                      {DEFAULT_GENEROS.filter(g => !generos.includes(g)).map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => handleAgregarGeneroNuevo(g)}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            border: '1px dashed rgba(245, 158, 11, 0.5)',
                            background: 'rgba(245, 158, 11, 0.08)',
                            color: '#fbbf24',
                            cursor: 'pointer'
                          }}
                        >
                          + {GENDER_EMOJIS[g]} {g}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}


            {/* SECCIÓN ESPECIAL: ALQUILER */}
            {isAlquiler && (
              <div style={{
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontSize: '0.78rem',
                color: '#fca5a5',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={18} />
                <span>
                  Los productos de alquiler (como mesas y sillas) se rentan formalmente desde la sección <strong>📦 Alquiler</strong> donde se registran datos del cliente, dirección y depósito.
                </span>
              </div>
            )}

            {/* CALCULADORA INTELIGENTE DE PRECIO (COSTO PROVEEDOR + MARGEN DE GANANCIA) */}
            <div style={{
              padding: '14px 16px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(16, 185, 129, 0.06) 100%)',
              border: '1.5px solid rgba(59, 130, 246, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: '#60a5fa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Calculator size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Calculadora de Precios (Costo Proveedor)
                      {formData.categoria?.toLowerCase().includes('dulc') ? (
                        <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6', fontWeight: 800 }}>
                          🍬 Dulcería (+30%)
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.2)', color: '#93c5fd', fontWeight: 800 }}>
                          ⭐ General (+50%)
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Ingresa el precio que te da el proveedor y el sistema calcula automáticamente el precio de venta sugerido.
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Precio de Compra / Costo Proveedor ($ COP):
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <MathPriceInput
                      value={formData.precioCosto ?? ''}
                      onChange={(val) => handleCostChange(String(val))}
                      placeholder="Ej: 2000 o 2465"
                      className="input-field"
                      style={{ fontWeight: 800, fontSize: '0.95rem', color: '#34d399', paddingRight: '45px' }}
                      min={0}
                    />
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.72rem', color: '#34d399', fontWeight: 800, pointerEvents: 'none' }}>
                      COP
                    </span>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Margen de Ganancia:</span>
                    <span style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 800 }}>+{margenPorcentaje}%</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    {[30, 40, 50, 60, 70, 100].map((m) => {
                      const isSelected = Number(margenPorcentaje) === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleMarginChange(m)}
                          style={{
                            padding: '4px 7px',
                            borderRadius: '8px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            border: isSelected ? '1.5px solid #3b82f6' : '1px solid var(--border-color)',
                            background: isSelected ? 'rgba(59, 130, 246, 0.28)' : 'rgba(255, 255, 255, 0.04)',
                            color: isSelected ? '#60a5fa' : 'var(--text-muted)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          +{m}%
                        </button>
                      );
                    })}

                    {/* % Personalizado Libre */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', marginLeft: '2px' }}>
                      <div style={{ position: 'relative', width: '74px' }}>
                        <input
                          type="number"
                          min="0"
                          max="1000"
                          step="any"
                          placeholder="Otro %"
                          value={![30, 40, 50, 60, 70, 100].includes(Number(margenPorcentaje)) ? margenPorcentaje : ''}
                          onChange={(e) => handleMarginChange(e.target.value)}
                          className="input-field"
                          title="Ingresa cualquier porcentaje personalizado (ej: 15, 25, 35, 45, etc.)"
                          style={{
                            padding: '3px 18px 3px 6px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            height: '27px',
                            textAlign: 'center',
                            borderRadius: '8px',
                            border: ![30, 40, 50, 60, 70, 100].includes(Number(margenPorcentaje)) ? '1.5px solid #3b82f6' : '1px solid var(--border-color)',
                            background: ![30, 40, 50, 60, 70, 100].includes(Number(margenPorcentaje)) ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                            color: ![30, 40, 50, 60, 70, 100].includes(Number(margenPorcentaje)) ? '#60a5fa' : 'var(--text-main)'
                          }}
                        />
                        <span style={{ position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.68rem', color: 'var(--text-muted)', pointerEvents: 'none', fontWeight: 800 }}>%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumen dinámico en vivo */}
              {Number(formData.precioCosto) > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: 'rgba(0, 0, 0, 0.28)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: '0.76rem',
                  flexWrap: 'wrap',
                  gap: '6px'
                }}>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Costo: <strong style={{ color: '#34d399' }}>${Number(formData.precioCosto).toLocaleString('es-CO')}</strong>
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Ganancia (+{margenPorcentaje}%): <strong style={{ color: '#60a5fa' }}>+${Math.max(0, (Number(formData.precio) || 0) - Number(formData.precioCosto)).toLocaleString('es-CO')}</strong>
                  </span>
                  <span style={{ color: 'var(--text-main)', fontWeight: 800 }}>
                    Venta Sugerida: <strong style={{ color: '#fbbf24', fontSize: '0.85rem' }}>${Number(formData.precio || 0).toLocaleString('es-CO')}</strong>
                  </span>
                </div>
              )}

              {/* Opción para alternar entre redondeo a $50 o precio exacto */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px', fontSize: '0.74rem' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={redondeoComercial}
                    onChange={(e) => handleToggleRedondeo(e.target.checked)}
                    style={{ accentColor: '#3b82f6', width: '14px', height: '14px' }}
                  />
                  <span>Redondear sugerencia a múltiplo de $50 comercial (desmarca para precio exacto al peso)</span>
                </label>
              </div>

              {/* Para Chancletas y Ropa: botón para propagar precio sugerido a todas las tallas */}
              {isCalzadoRopa && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => handleAplicarPrecioATodasLasTallas(formData.precio)}
                    className="btn btn-outline"
                    style={{ fontSize: '0.74rem', padding: '4px 10px', fontWeight: 700, borderColor: 'rgba(96, 165, 250, 0.4)', color: '#60a5fa' }}
                  >
                    ⚡ Aplicar ${Number(formData.precio || 0).toLocaleString('es-CO')} a todas las tallas de ropa/calzado
                  </button>
                </div>
              )}
            </div>

            {/* Precios y Stock — solo para productos normales, cintas y bolsas. Ropa/Chancletas lo manejan por variante */}
            {!isCalzadoRopa && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    {isCinta ? 'Precio por Metro ($ COP) *:' : isCordón ? 'Precio por Par ($ COP) *:' : 'Precio Unitario ($ COP) *:'}
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <MathPriceInput
                      value={formData.precio}
                      onChange={(val) => setFormData({ ...formData, precio: val })}
                      placeholder="Ej: 2465"
                      className="input-field"
                      style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--accent-blue, #60a5fa)' }}
                      min={0}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    {isCinta ? 'Stock (Ilimitado):' : isBolsa ? 'Stock Total (Suma variantes):' : isCordón ? 'Stock Físico (Pares) *:' : 'Stock Físico en Tienda *:'}
                  </label>
                  <input
                    type={isCinta ? "text" : "number"}
                    className="input-field"
                    value={isCinta ? "∞ Ilimitado (Rollos)" : formData.stock}
                    onChange={(e) => !isCinta && !isBolsa && !isCordón && setFormData({ ...formData, stock: e.target.value })}
                    disabled={isCinta || isBolsa || isCordón}
                    required={!isCinta}
                    min="0"
                    style={{ fontWeight: 700, opacity: (isCinta || isBolsa || isCordón) ? 0.9 : 1 }}
                    title={isBolsa ? "El stock total se calcula automáticamente de la suma de todas las variantes" : (isCordón ? "El stock total se calcula automáticamente sumando los pares de cada color" : undefined)}
                  />
                </div>
              </div>
            )}

            {/* Paquete / Mayorista (Solo para productos generales — NO aplica para ropa, chancletas, bolsas, cordones ni cintas) */}
            {!isCinta && !isBolsa && !isAlquiler && !isCalzadoRopa && !isCordón && (
              <div style={{
                padding: '12px 14px',
                borderRadius: '14px',
                background: 'rgba(99, 102, 241, 0.05)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  <input
                    type="checkbox"
                    checked={formData.permitePaquete}
                    onChange={(e) => setFormData({ ...formData, permitePaquete: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Permitir venta por Paquete / Docena / Caja 📦 (Cuadernos, Dulces, Desechables)</span>
                </label>

                {formData.permitePaquete && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                    <div>
                      <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px', fontWeight: 600 }}>
                        Unidades en el Paquete:
                      </label>
                      <input
                        type="number"
                        className="input-field"
                        value={formData.unidadesPorPaquete}
                        onChange={(e) => setFormData({ ...formData, unidadesPorPaquete: e.target.value })}
                        min="2"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px', fontWeight: 600 }}>
                        Precio del Paquete Completo ($):
                      </label>
                      <input
                        type="number"
                        className="input-field"
                        value={formData.precioPaquete}
                        onChange={(e) => setFormData({ ...formData, precioPaquete: e.target.value })}
                        min="0"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sección de Fotos */}
            <div style={{
              padding: '16px',
              borderRadius: '16px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)'
            }}>
              <ImageUploader
                images={formData.imagenes}
                productId={formData.codigo || product?.id || 'nuevo'}
                onChange={(newImgs) => setFormData({
                  ...formData,
                  imagenes: newImgs,
                  imagen: newImgs[0] || ''
                })}
              />
            </div>

            {/* Switch de Disponibilidad para venta */}
            {!isCinta && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-color)'
              }}>
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    Disponible para venta en mostrador
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {isAvailable ? '✅ El producto se mostrará activo en el POS' : '⚠️ Marcado como agotado'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleAvailable}
                  style={{
                    width: '46px',
                    height: '26px',
                    borderRadius: '9999px',
                    background: isAvailable ? '#10b981' : '#cbd5e1',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background-color 0.2s ease',
                    padding: '2px'
                  }}
                >
                  <span style={{
                    display: 'block',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                    transform: isAvailable ? 'translateX(20px)' : 'translateX(0)',
                    transition: 'transform 0.2s ease'
                  }} />
                </button>
              </div>
            )}
          </div>

          {/* Footer Fijo con Botones */}
          <div style={{
            padding: '14px 22px',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-tertiary)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            flexShrink: 0
          }}>
            <button 
              type="button" 
              className="btn btn-outline" 
              onClick={onClose}
              style={{ padding: '9px 20px', borderRadius: '12px', fontWeight: 700 }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              style={{
                padding: '9px 26px',
                background: isCinta 
                  ? 'linear-gradient(135deg, #059669, #047857)' 
                  : isBolsa 
                    ? 'linear-gradient(135deg, #db2777, #be185d)' 
                    : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '0.92rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: isCinta 
                  ? '0 4px 14px rgba(5, 150, 105, 0.4)' 
                  : isBolsa 
                    ? '0 4px 14px rgba(219, 39, 119, 0.4)' 
                    : '0 4px 14px rgba(37, 99, 235, 0.4)'
              }}
            >
              <Check size={16} />
              <span>{isEditing ? 'Guardar Cambios' : 'Crear Producto'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
