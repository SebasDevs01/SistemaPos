import React, { useEffect, useState } from "react";

/**
 * SplashScreen — Apple-style preloader con logo MJ animado
 * Se muestra 1 sola vez por sesión (localStorage flag).
 * Llama a onComplete() cuando termina la animación de salida.
 */
export default function SplashScreen({ onComplete, storeName = "Miscelánea María José" }) {
  const [phase, setPhase] = useState("enter"); // "enter" | "hold" | "exit"

  useEffect(() => {
    // Fase 1: entrada (0→800ms)
    const t1 = setTimeout(() => setPhase("hold"), 800);
    // Fase 2: mantener logo (800→2200ms)
    const t2 = setTimeout(() => setPhase("exit"), 2200);
    // Fase 3: salida + llamar onComplete (2200→2750ms)
    const t3 = setTimeout(() => onComplete?.(), 2750);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div
      className="splash-overlay"
      data-phase={phase}
      aria-label="Cargando Sistema POS"
      role="status"
    >
      {/* Fondo atmosférico */}
      <div className="splash-atmosphere" />

      {/* Anillos orbitales de energía */}
      <div className="splash-rings">
        <div className="splash-ring splash-ring-1" />
        <div className="splash-ring splash-ring-2" />
        <div className="splash-ring splash-ring-3" />
      </div>

      {/* Logo central */}
      <div className="splash-logo-wrap">
        <img
          src="/logo-liquidglass-mj.png"
          alt="MJ Logo"
          className="splash-logo-img"
          draggable={false}
        />
        {/* Reflejo especular debajo */}
        <div className="splash-logo-reflection">
          <img
            src="/logo-liquidglass-mj.png"
            alt=""
            className="splash-logo-img splash-logo-mirror"
            draggable={false}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Nombre de la tienda */}
      <div className="splash-store-name">{storeName}</div>
      {/* Indicador de carga */}
      <div className="splash-loader-dots">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
