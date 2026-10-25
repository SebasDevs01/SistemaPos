import React from 'react';

export default function SearchBar({ value, onChange, placeholder = 'Buscar platillo, taco, ingrediente...' }) {
  return (
    <div className="search-bar-wrap">
      <span className="material-symbols-rounded search-bar-icon">search</span>
      <input
        type="text"
        className="search-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          className="search-clear-btn"
          onClick={() => onChange('')}
          title="Limpiar búsqueda"
        >
          <span className="material-symbols-rounded">close</span>
        </button>
      )}
    </div>
  );
}
