import React, { useState, useEffect, useRef } from "react";
import { Calculator, X, Check, Delete, RotateCcw } from "lucide-react";
import { formatCOP } from "../utils/formatCOP";

/**
 * Calculadora Rápida Universal para campos de precios y dinero en el POS
 * Admite:
 * 1. Teclado numérico táctil y operaciones (+ - * /)
 * 2. Chips de billetes colombianos (+1.000, +2.000, +5.000, +10.000, +20.000, +50.000, +100.000)
 * 3. Botón "Aplicar" para transferir el resultado al input
 * 4. Botón flotante o botón popover al lado del input
 */
export default function PriceCalculatorPopover({
  value,
  onApply,
  title = "Calculadora",
  buttonStyle = {},
  iconSize = 15,
  compact = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [display, setDisplay] = useState(value !== undefined && value !== null && value !== "" ? String(value) : "0");
  const [equation, setEquation] = useState("");
  const popoverRef = useRef(null);

  // Sincronizar valor inicial cuando se abre
  useEffect(() => {
    if (isOpen) {
      const cleanVal = (value !== undefined && value !== null && value !== "") ? String(value) : "0";
      setDisplay(cleanVal);
      setEquation("");
    }
  }, [isOpen, value]);

  // Cerrar con Escape o clic afuera
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Evaluar expresión matemática de forma segura
  const evaluateMath = (expr) => {
    try {
      // Reemplazar signos para eval seguro
      const sanitized = expr
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/[^0-9+\-*/.]/g, "");
      if (!sanitized) return 0;
      // Evaluar con Function en sandbox simple
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${sanitized});`)();
      if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
        return Math.round(result);
      }
      return 0;
    } catch {
      return null;
    }
  };

  const handleDigit = (digit) => {
    setDisplay((prev) => {
      if (prev === "0" && digit !== ".") return String(digit);
      if (digit === "." && prev.includes(".")) return prev;
      return prev + digit;
    });
  };

  const handleOperator = (op) => {
    const currentNum = evaluateMath(display) ?? 0;
    setEquation(`${currentNum} ${op}`);
    setDisplay("0");
  };

  const handleCalculate = () => {
    if (!equation) return;
    const fullExpr = `${equation} ${display}`;
    const result = evaluateMath(fullExpr);
    if (result !== null) {
      setEquation("");
      setDisplay(String(result));
    }
  };

  const handleClear = () => {
    setDisplay("0");
    setEquation("");
  };

  const handleBackspace = () => {
    setDisplay((prev) => {
      if (prev.length <= 1) return "0";
      return prev.slice(0, -1);
    });
  };

  const handleAddDenomination = (amount) => {
    setDisplay((prev) => {
      const current = evaluateMath(prev) || 0;
      return String(current + amount);
    });
  };

  const handleApplyResult = () => {
    let finalVal = evaluateMath(display);
    if (finalVal === null) finalVal = 0;
    if (onApply) {
      onApply(finalVal);
    }
    setIsOpen(false);
  };

  const numVal = evaluateMath(display) || 0;

  return (
    <div style={{ position: "relative", display: "inline-block" }} ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-outline"
        title="Abrir Calculadora Rápida"
        style={{
          padding: compact ? "4px 8px" : "6px 10px",
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          borderRadius: "8px",
          borderColor: "rgba(59, 130, 246, 0.4)",
          background: isOpen ? "rgba(59, 130, 246, 0.25)" : "rgba(59, 130, 246, 0.1)",
          color: "#60a5fa",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: compact ? "0.75rem" : "0.82rem",
          transition: "all 0.15s ease",
          ...buttonStyle
        }}
      >
        <Calculator size={iconSize} />
        {!compact && <span>Calc</span>}
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            zIndex: 2500,
            marginTop: "6px",
            width: "310px",
            background: "var(--bg-secondary, #111827)",
            border: "1.5px solid var(--border-strong, #374151)",
            borderRadius: "16px",
            padding: "16px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.85), 0 0 1px rgba(255,255,255,0.15)",
            backdropFilter: "blur(12px)",
            animation: "fadeIn 0.15s ease-out"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabecera */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-main)", fontWeight: 800, fontSize: "0.88rem" }}>
              <Calculator size={16} color="var(--accent-blue, #3b82f6)" />
              <span>{title}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="btn btn-outline"
              style={{ padding: "3px 6px", borderRadius: "50%", color: "var(--text-muted)" }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Pantalla Display */}
          <div
            style={{
              background: "rgba(0, 0, 0, 0.45)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "10px",
              padding: "10px 12px",
              textAlign: "right",
              marginBottom: "12px"
            }}
          >
            {equation && (
              <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", minHeight: "16px" }}>
                {equation}
              </div>
            )}
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#34d399", fontFamily: "var(--font-mono)", overflowX: "auto" }}>
              ${numVal.toLocaleString("es-CO")}
            </div>
            <div style={{ fontSize: "0.68rem", color: "#9ca3af", marginTop: "2px" }}>
              {display}
            </div>
          </div>

          {/* Chips de Billetes Colombianos */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700, marginBottom: "4px", textTransform: "uppercase" }}>
              Suma Rápida (COP):
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px" }}>
              {[1000, 2000, 5000, 10000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleAddDenomination(amt)}
                  className="btn btn-outline"
                  style={{
                    padding: "4px 2px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    borderRadius: "6px",
                    background: "rgba(255,255,255,0.03)",
                    borderColor: "rgba(255,255,255,0.1)",
                    color: "#93c5fd"
                  }}
                >
                  +{amt >= 1000 ? `${amt / 1000}k` : amt}
                </button>
              ))}
              {[20000, 50000, 100000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleAddDenomination(amt)}
                  className="btn btn-outline"
                  style={{
                    padding: "4px 2px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    borderRadius: "6px",
                    background: "rgba(16, 185, 129, 0.08)",
                    borderColor: "rgba(16, 185, 129, 0.25)",
                    color: "#6ee7b7"
                  }}
                >
                  +{amt / 1000}k
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="btn btn-outline"
                style={{
                  padding: "4px 2px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  borderRadius: "6px",
                  borderColor: "rgba(239, 68, 68, 0.3)",
                  color: "#fca5a5"
                }}
                title="Limpiar"
              >
                C
              </button>
            </div>
          </div>

          {/* Teclado Calculadora */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "5px", marginBottom: "12px" }}>
            <button type="button" onClick={() => handleDigit("7")} className="calc-key">7</button>
            <button type="button" onClick={() => handleDigit("8")} className="calc-key">8</button>
            <button type="button" onClick={() => handleDigit("9")} className="calc-key">9</button>
            <button type="button" onClick={() => handleOperator("÷")} className="calc-op-key">÷</button>

            <button type="button" onClick={() => handleDigit("4")} className="calc-key">4</button>
            <button type="button" onClick={() => handleDigit("5")} className="calc-key">5</button>
            <button type="button" onClick={() => handleDigit("6")} className="calc-key">6</button>
            <button type="button" onClick={() => handleOperator("×")} className="calc-op-key">×</button>

            <button type="button" onClick={() => handleDigit("1")} className="calc-key">1</button>
            <button type="button" onClick={() => handleDigit("2")} className="calc-key">2</button>
            <button type="button" onClick={() => handleDigit("3")} className="calc-key">3</button>
            <button type="button" onClick={() => handleOperator("-")} className="calc-op-key">-</button>

            <button type="button" onClick={() => handleDigit("0")} className="calc-key">0</button>
            <button type="button" onClick={() => handleDigit("00")} className="calc-key">00</button>
            <button type="button" onClick={handleBackspace} className="calc-key" title="Borrar último"><Delete size={14} /></button>
            <button type="button" onClick={() => handleOperator("+")} className="calc-op-key">+</button>
          </div>

          {/* Botones de Acción: Calcular y Aplicar */}
          <div style={{ display: "grid", gridTemplateColumns: equation ? "1fr 1fr" : "1fr", gap: "6px" }}>
            {equation && (
              <button
                type="button"
                onClick={handleCalculate}
                className="btn btn-outline"
                style={{
                  padding: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  borderRadius: "8px",
                  borderColor: "rgba(59, 130, 246, 0.4)",
                  color: "#60a5fa"
                }}
              >
                = Total
              </button>
            )}
            <button
              type="button"
              onClick={handleApplyResult}
              className="btn btn-success"
              style={{
                padding: "8px",
                fontSize: "0.85rem",
                fontWeight: 800,
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px"
              }}
            >
              <Check size={16} />
              <span>Aplicar Valor</span>
            </button>
          </div>
        </div>
      )}

      <style>{`
        .calc-key {
          padding: 8px 0;
          font-size: 0.95rem;
          font-weight: 700;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
          color: var(--text-main, #fff);
          cursor: pointer;
          display: flex;
          alignItems: center;
          justifyContent: center;
          transition: all 0.1s ease;
        }
        .calc-key:active {
          transform: scale(0.95);
          background: rgba(255, 255, 255, 0.12);
        }
        .calc-op-key {
          padding: 8px 0;
          font-size: 1rem;
          font-weight: 800;
          border-radius: 8px;
          border: 1px solid rgba(59, 130, 246, 0.3);
          background: rgba(59, 130, 246, 0.12);
          color: #93c5fd;
          cursor: pointer;
          display: flex;
          alignItems: center;
          justifyContent: center;
          transition: all 0.1s ease;
        }
        .calc-op-key:active {
          transform: scale(0.95);
          background: rgba(59, 130, 246, 0.3);
        }
      `}</style>
    </div>
  );
}
