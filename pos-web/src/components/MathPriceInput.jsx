import React, { useState, useEffect } from "react";

/**
 * Evalúa expresiones matemáticas de forma segura (ej: 1500*15, 2000+3000, 50000-15000)
 */
export function evaluateMathExpression(val) {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === "number") return val;
  try {
    const expr = String(val)
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/,/g, ".")
      .replace(/[^0-9+\-*/().\s]/g, "");
    if (!expr.trim()) return 0;
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + expr + ")")();
    if (isFinite(result) && !isNaN(result)) {
      return Math.round(result);
    }
  } catch (_) {}
  const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(parsed) ? 0 : Math.round(parsed);
}

/**
 * Input con calculadora interna para valores monetarios
 * Permite escribir directamente expresiones como 1500*15 o 2000+3000
 * Al presionar Enter, = o perder el foco (onBlur), resuelve el cálculo de inmediato.
 */
export default function MathPriceInput({
  value,
  onChange,
  placeholder = "Ej: 1500*15 o 22500",
  className = "input-field",
  style = {},
  disabled = false,
  required = false,
  autoFocus = false,
  min = 0,
  max,
  id,
  name,
  title = "Puedes escribir sumas o multiplicaciones directas (ej: 1500*15) y presionar Enter"
}) {
  const [text, setText] = useState(value !== undefined && value !== null ? String(value) : "");

  useEffect(() => {
    setText(value !== undefined && value !== null ? String(value) : "");
  }, [value]);

  const commitCalculation = () => {
    const computed = evaluateMathExpression(text);
    let finalVal = min !== undefined ? Math.max(min, computed) : computed;
    if (max !== undefined && finalVal > max) finalVal = max;
    setText(String(finalVal));
    if (onChange) {
      onChange(finalVal);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "=") {
      e.preventDefault();
      commitCalculation();
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setText(val);
    // Si no contiene operadores matemáticos y es un número puro válido, emitir de inmediato
    if (!/[+\-*/×÷]/.test(val)) {
      const num = parseFloat(val);
      if (!isNaN(num) && onChange) {
        onChange(num);
      } else if (val.trim() === "" && onChange) {
        onChange(0);
      }
    }
  };

  return (
    <input
      type="text"
      inputMode="text"
      id={id}
      name={name}
      className={className}
      placeholder={placeholder}
      value={text}
      disabled={disabled}
      required={required}
      autoFocus={autoFocus}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={commitCalculation}
      title={title}
      style={{
        fontFamily: "var(--font-mono, monospace)",
        ...style
      }}
    />
  );
}
