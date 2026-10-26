import React from "react";
import "./liquid-glass.css";

/**
 * Componente LiquidGlass inspirado en Apple Liquid Glass y React Bits.
 * Proporciona una superficie de cristal translúcido con desenfoque de lente,
 * reflejo especular perimetral y sombras de profundidad volumétrica.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenido interior
 * @param {keyof JSX.IntrinsicElements} [props.as='div'] - Elemento HTML semántico a renderizar
 * @param {'surface'|'card'|'modal'|'toolbar'|'button'|'pill'} [props.variant='surface'] - Variante de superficie
 * @param {'subtle'|'regular'|'prominent'|'crystal'} [props.intensity='regular'] - Intensidad del desenfoque y cristal
 * @param {'none'|'purple'|'cyan'} [props.glow='none'] - Resplandor perimetral de acento
 * @param {boolean} [props.specular=true] - Capa de reflejo especular superior
 * @param {boolean} [props.interactive=false] - Efectos de elevación y hover sutiles
 * @param {string} [props.className=''] - Clases CSS complementarias
 * @param {React.CSSProperties} [props.style] - Estilos inline
 */
export default function LiquidGlass({
  children,
  as: Component = "div",
  variant = "surface",
  intensity = "regular",
  glow = "none",
  specular = true,
  interactive = false,
  className = "",
  style = {},
  ...rest
}) {
  const classNames = [
    "liquid-glass-surface",
    `liquid-glass--${variant}`,
    `liquid-glass-intensity--${intensity}`,
    glow !== "none" ? `liquid-glass-glow--${glow}` : "",
    interactive ? "liquid-glass-interactive" : "",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Component className={classNames} style={style} {...rest}>
      {specular && <div className="liquid-glass-sheen" aria-hidden="true" />}
      {children}
    </Component>
  );
}
