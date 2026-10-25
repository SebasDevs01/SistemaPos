import React, { useState, useEffect, useRef } from "react";
import { ShieldCheck, UserCheck, Eye, EyeOff, LogIn, Lock, Store } from "lucide-react";

export default function LoginView({ users = [], onLogin, storeConfig = {} }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [step, setStep] = useState("select"); // "select" | "pin"
  const pinRef = useRef(null);

  useEffect(() => {
    if (step === "pin" && pinRef.current) {
      pinRef.current.focus();
    }
  }, [step]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setPin("");
    setError("");
    setShowPin(false);
    setStep("pin");
  };

  const handleBack = () => {
    setStep("select");
    setSelectedUser(null);
    setPin("");
    setError("");
    setShowPin(false);
  };

  const verifyPin = (candidatePin) => {
    if (!selectedUser) return;
    if (candidatePin === selectedUser.pass) {
      setError("");
      onLogin(selectedUser);
    } else {
      setError("PIN incorrecto. Inténtalo de nuevo.");
      setShake(true);
      setTimeout(() => {
        setPin("");
        setShake(false);
      }, 600);
    }
  };

  const handleLogin = () => {
    if (pin.length < 4) {
      setError("Ingresa los 4 dígitos de tu PIN.");
      return;
    }
    verifyPin(pin);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  const handleNumPad = (val) => {
    if (val === "del") {
      setPin((p) => p.slice(0, -1));
      setError("");
    } else {
      if (pin.length < 4) {
        const next = pin + val;
        setPin(next);
        setError("");
        // Verificación instantánea automática al completar los 4 dígitos
        if (next.length === 4) {
          verifyPin(next);
        }
      }
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-bg">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />
      </div>

      <div className="login-container">
        {/* Marca y encabezado */}
        <div className="login-brand">
          <div className="login-store-icon">
            <Store size={28} color="#DC2626" />
          </div>
          <h1 className="login-title">{storeConfig?.nombre || "Miscelánea María José"}</h1>
          <p className="login-subtitle">Sistema POS · Selecciona tu perfil para ingresar</p>
        </div>

        {/* PASO 1: SELECCIONAR USUARIO */}
        {step === "select" && (
          <div className="login-card">
            <div className="login-card-header">
              <Lock size={16} color="var(--accent-blue)" />
              <span>Selecciona tu usuario</span>
            </div>
            <div className="login-user-grid">
              {users.map((user) => {
                const isAdmin = user.rol === "Administrador";
                return (
                  <button
                    key={user.id}
                    className={`login-user-btn ${isAdmin ? "login-user-btn--admin" : "login-user-btn--staff"}`}
                    onClick={() => handleSelectUser(user)}
                    type="button"
                  >
                    <div className="login-user-avatar">
                      {isAdmin
                        ? <ShieldCheck size={24} color="#818cf8" />
                        : <UserCheck size={24} color="#34d399" />
                      }
                    </div>
                    <div className="login-user-info">
                      <span className="login-user-name">{user.nombre}</span>
                      <span className="login-user-sub">{isAdmin ? "Acceso Total · Administrador" : "Caja & Ventas · Asistente"}</span>
                    </div>
                    <span className={`badge ${isAdmin ? "badge-indigo" : "badge-green"} login-user-badge`}>
                      {user.rol}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* PASO 2: INGRESAR PIN DE 4 DÍGITOS */}
        {step === "pin" && selectedUser && (
          <div className="login-card">
            <div className="login-card-header">
              {selectedUser.rol === "Administrador"
                ? <ShieldCheck size={16} color="#818cf8" />
                : <UserCheck size={16} color="#34d399" />
              }
              <span style={{ fontWeight: 700 }}>{selectedUser.nombre}</span>
              <span className={`badge ${selectedUser.rol === "Administrador" ? "badge-indigo" : "badge-green"} login-user-badge`}>
                {selectedUser.rol}
              </span>
            </div>

            {/* Visualizador de PIN con 4 casillas exactas */}
            <div className={`login-pin-display ${shake ? "login-shake" : ""}`}>
              {Array.from({ length: 4 }).map((_, i) => {
                const hasDigit = i < pin.length;
                const digit = pin[i];
                return (
                  <div
                    key={i}
                    className={`login-pin-box ${hasDigit ? "login-pin-box--filled" : ""}`}
                    onClick={() => pinRef.current?.focus()}
                  >
                    {hasDigit ? (
                      showPin ? (
                        <span className="login-pin-digit">{digit}</span>
                      ) : (
                        <span className="login-pin-circle" />
                      )
                    ) : (
                      <span className="login-pin-empty" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Input invisible para teclear directamente en teclado físico */}
            <input
              ref={pinRef}
              type={showPin ? "text" : "password"}
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                setPin(val);
                setError("");
                if (val.length === 4) {
                  verifyPin(val);
                }
              }}
              onKeyDown={handleKeyDown}
              className="login-pin-input"
              maxLength={4}
              inputMode="numeric"
            />

            {/* Botón Mostrar/Ocultar contraseña */}
            <button
              className="login-show-pin"
              onClick={() => setShowPin(!showPin)}
              type="button"
            >
              {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{showPin ? "Ocultar PIN" : "Mostrar PIN"}</span>
            </button>

            {/* Teclado numérico táctil */}
            <div className="login-numpad">
              {["1","2","3","4","5","6","7","8","9","","0","del"].map((k, i) => (
                k === "" ? (
                  <div key={i} />
                ) : (
                  <button
                    key={i}
                    className={`login-numpad-key ${k === "del" ? "login-numpad-del" : ""}`}
                    onClick={() => handleNumPad(k)}
                    type="button"
                  >
                    {k === "del" ? "⌫" : k}
                  </button>
                )
              ))}
            </div>

            {error && (
              <div className="login-error">
                <Lock size={13} /> {error}
              </div>
            )}

            <div className="login-actions">
              <button className="btn btn-outline btn-sm" onClick={handleBack} type="button">
                ← Cambiar usuario
              </button>
              <button
                className="btn btn-primary"
                onClick={handleLogin}
                disabled={pin.length < 4}
                type="button"
                style={{ padding: "8px 16px" }}
              >
                <LogIn size={15} />
                Ingresar
              </button>
            </div>
          </div>
        )}

        <p className="login-footer">
          POS 2.0 · {storeConfig?.nombre || "Miscelánea María José"} · Sistema Seguro
        </p>
      </div>
    </div>
  );
}
