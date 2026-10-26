# -*- coding: utf-8 -*-
"""
Script para generar src/styles/iosLiquidGlass.css con el sistema completo de diseño
Apple Liquid Glass (v3.0) para Dark Mode y Light Mode.
"""
import sys

css_content = '''/**
 * iosLiquidGlass.css
 * Capa de Rediseño UI/UX — Sistema POS estilo Apple iOS & Liquid Glass
 * v3.0 — Sistema Integral Liquid Glass & Vibrancy para Dark y Light Mode
 */

/* ==========================================================================
   0. FONDO GENERAL ATMOSFÉRICO — Profundidad y Refracción Apple
   ========================================================================== */
body {
  background: var(--bg-base, #07090E) !important;
  color: var(--text-main) !important;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter", system-ui, sans-serif !important;
  -webkit-font-smoothing: antialiased !important;
  -moz-osx-font-smoothing: grayscale !important;
  min-height: 100vh !important;
  position: relative !important;
}

/* Dark mode: orbes de luz ambiental profunda */
body::before {
  content: "" !important;
  position: fixed !important;
  inset: 0 !important;
  pointer-events: none !important;
  z-index: -1 !important;
  background:
    radial-gradient(ellipse 75% 65% at 10% 8%, rgba(0, 122, 255, 0.14) 0%, transparent 60%),
    radial-gradient(ellipse 65% 55% at 90% 85%, rgba(88, 86, 214, 0.13) 0%, transparent 55%),
    radial-gradient(ellipse 50% 45% at 50% 40%, rgba(175, 82, 222, 0.08) 0%, transparent 45%),
    radial-gradient(ellipse 55% 45% at 80% 15%, rgba(52, 199, 89, 0.07) 0%, transparent 50%) !important;
}

/* Light mode: atmósfera perlada con orbes pastel difusos */
[data-theme="light"] body {
  background: #EEF1F6 !important;
  color: #0F172A !important;
}

[data-theme="light"] body::before {
  content: "" !important;
  position: fixed !important;
  inset: 0 !important;
  pointer-events: none !important;
  z-index: -1 !important;
  background:
    radial-gradient(ellipse 70% 60% at 8% 6%, rgba(0, 122, 255, 0.12) 0%, transparent 60%),
    radial-gradient(ellipse 60% 50% at 92% 88%, rgba(175, 82, 222, 0.10) 0%, transparent 55%),
    radial-gradient(ellipse 50% 40% at 80% 20%, rgba(52, 199, 89, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse 60% 50% at 20% 90%, rgba(255, 149, 0, 0.08) 0%, transparent 50%) !important;
}

/* ==========================================================================
   1. HEADER FLOTANTE — Liquid Glass Navigation Bar
   ========================================================================== */
.app-header {
  position: sticky !important;
  top: 0 !important;
  z-index: 200 !important;
  background: rgba(7, 9, 14, 0.78) !important;
  backdrop-filter: blur(32px) saturate(190%) contrast(102%) !important;
  -webkit-backdrop-filter: blur(32px) saturate(190%) contrast(102%) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.10) !important;
  box-shadow: 
    0 1px 0 rgba(255, 255, 255, 0.08),
    0 8px 32px -4px rgba(0, 0, 0, 0.40) !important;
  transition: all 0.26s cubic-bezier(0.25, 1, 0.5, 1) !important;
}

[data-theme="light"] .app-header {
  background: rgba(255, 255, 255, 0.80) !important;
  backdrop-filter: blur(32px) saturate(190%) contrast(102%) !important;
  -webkit-backdrop-filter: blur(32px) saturate(190%) contrast(102%) !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.07) !important;
  box-shadow: 
    0 1px 0 rgba(255, 255, 255, 0.95),
    0 6px 24px -4px rgba(0, 0, 0, 0.07) !important;
}

/* Logo icon con acabado de super-elipse Apple */
.logo-icon {
  background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%) !important;
  box-shadow: 0 4px 16px rgba(0, 122, 255, 0.40) !important;
  border-radius: 14px !important;
}

/* Título de la app con gradiente sutil */
.logo-text h1 {
  font-size: 1.05rem !important;
  font-weight: 800 !important;
  letter-spacing: -0.025em !important;
  color: var(--text-main) !important;
}

[data-theme="light"] .logo-text h1 {
  color: #0F172A !important;
}

/* ── iOS Segmented Control (Pestañas Header) ── */
.header-nav {
  background: rgba(0, 0, 0, 0.35) !important;
  backdrop-filter: blur(14px) !important;
  -webkit-backdrop-filter: blur(14px) !important;
  border: 1px solid rgba(255, 255, 255, 0.09) !important;
  border-radius: 9999px !important;
  padding: 4px !important;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.35) !important;
  gap: 3px !important;
}

[data-theme="light"] .header-nav {
  background: rgba(0, 0, 0, 0.06) !important;
  border-color: rgba(0, 0, 0, 0.07) !important;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.06) !important;
}

.nav-tab {
  border-radius: 9999px !important;
  font-size: 0.82rem !important;
  font-weight: 600 !important;
  letter-spacing: -0.01em !important;
  padding: 6px 14px !important;
  transition: all 0.2s cubic-bezier(0.25, 1, 0.5, 1) !important;
  color: var(--text-muted) !important;
}

.nav-tab:hover:not(.nav-tab--active):not(:disabled) {
  background: rgba(255, 255, 255, 0.08) !important;
  color: var(--text-main) !important;
  transform: none !important;
}

[data-theme="light"] .nav-tab:hover:not(.nav-tab--active):not(:disabled) {
  background: rgba(255, 255, 255, 0.85) !important;
  color: #0F172A !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
}

/* Pestaña activa — iOS Blue Pill */
.nav-tab--active {
  background: #007AFF !important;
  color: #FFFFFF !important;
  font-weight: 700 !important;
  box-shadow: 
    0 2px 10px rgba(0, 122, 255, 0.45),
    inset 0 1px 1px rgba(255, 255, 255, 0.32) !important;
}

/* ==========================================================================
   2. PRODUCT CARDS — Liquid Glass Surface (Catálogo POS)
   ========================================================================== */
.product-card {
  background: rgba(18, 24, 38, 0.72) !important;
  backdrop-filter: blur(28px) saturate(180%) contrast(102%) !important;
  -webkit-backdrop-filter: blur(28px) saturate(180%) contrast(102%) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 20px !important;
  box-shadow: 
    0 10px 30px -4px rgba(0, 0, 0, 0.42),
    inset 0 1px 1px rgba(255, 255, 255, 0.16) !important;
  transition: 
    transform 0.26s cubic-bezier(0.25, 1, 0.5, 1),
    box-shadow 0.26s cubic-bezier(0.25, 1, 0.5, 1),
    border-color 0.2s ease !important;
  overflow: hidden !important;
  position: relative !important;
}

/* Specular highlight superior (brillo de cristal Apple) */
.product-card::before {
  content: "" !important;
  position: absolute !important;
  top: 0 !important;
  left: 14px !important;
  right: 14px !important;
  height: 1px !important;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent) !important;
  pointer-events: none !important;
  z-index: 2 !important;
}

.product-card:hover {
  transform: translateY(-4px) scale(1.01) !important;
  box-shadow: 
    0 22px 50px -8px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(0, 122, 255, 0.30),
    inset 0 1px 1px rgba(255, 255, 255, 0.22) !important;
  border-color: rgba(0, 122, 255, 0.35) !important;
}

/* ── MODO CLARO PRODUCT CARDS (Vidrio Lechoso Traslúcido) ── */
[data-theme="light"] .product-card {
  background: rgba(255, 255, 255, 0.76) !important;
  backdrop-filter: blur(28px) saturate(190%) contrast(102%) !important;
  -webkit-backdrop-filter: blur(28px) saturate(190%) contrast(102%) !important;
  border: 1px solid rgba(255, 255, 255, 0.90) !important;
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.04),
    0 12px 32px -4px rgba(0, 0, 0, 0.08),
    inset 0 1px 1px rgba(255, 255, 255, 0.95) !important;
}

[data-theme="light"] .product-card::before {
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.95), transparent) !important;
}

[data-theme="light"] .product-card:hover {
  transform: translateY(-4px) scale(1.01) !important;
  box-shadow: 
    0 8px 14px -2px rgba(0, 0, 0, 0.06),
    0 24px 50px -6px rgba(0, 0, 0, 0.13),
    0 0 0 1px rgba(0, 122, 255, 0.25),
    inset 0 1px 1px rgba(255, 255, 255, 1) !important;
  border-color: rgba(0, 122, 255, 0.30) !important;
}

/* ==========================================================================
   3. PANEL DE TICKET Y CARRITO — Liquid Glass Sidebar
   ========================================================================== */
.ticket-panel,
.sales-panel,
.cart-panel,
[class*="ticket"],
[class*="panel-right"] {
  background: rgba(13, 17, 26, 0.80) !important;
  backdrop-filter: blur(28px) saturate(170%) !important;
  -webkit-backdrop-filter: blur(28px) saturate(170%) !important;
  border: 1px solid rgba(255, 255, 255, 0.10) !important;
  border-radius: 24px !important;
  box-shadow: 
    0 12px 36px -4px rgba(0, 0, 0, 0.45),
    inset 0 1px 1px rgba(255, 255, 255, 0.12) !important;
}

[data-theme="light"] .ticket-panel,
[data-theme="light"] .sales-panel,
[data-theme="light"] .cart-panel,
[data-theme="light"] [class*="ticket"],
[data-theme="light"] [class*="panel-right"] {
  background: rgba(255, 255, 255, 0.82) !important;
  backdrop-filter: blur(28px) saturate(190%) !important;
  -webkit-backdrop-filter: blur(28px) saturate(190%) !important;
  border: 1px solid rgba(255, 255, 255, 0.95) !important;
  box-shadow: 
    0 6px 20px -2px rgba(0, 0, 0, 0.06),
    0 16px 40px -4px rgba(0, 0, 0, 0.08),
    inset 0 1px 1px rgba(255, 255, 255, 1) !important;
}

/* ==========================================================================
   4. MODALES — Vidrio Cinematográfico Flotante (Anti-Opaco)
   ========================================================================== */
.modal-overlay,
.reports-modal-overlay,
.price-audit-overlay,
[class*="modal-overlay"] {
  background: rgba(0, 0, 0, 0.60) !important;
  backdrop-filter: blur(20px) saturate(160%) !important;
  -webkit-backdrop-filter: blur(20px) saturate(160%) !important;
}

[data-theme="light"] .modal-overlay,
[data-theme="light"] .reports-modal-overlay,
[data-theme="light"] .price-audit-overlay,
[data-theme="light"] [class*="modal-overlay"] {
  background: rgba(15, 23, 42, 0.35) !important;
  backdrop-filter: blur(20px) saturate(160%) !important;
  -webkit-backdrop-filter: blur(20px) saturate(160%) !important;
}

.modal-content,
.modal-card,
.modal-box,
.reports-modal-container,
.price-audit-modal,
[class*="modal-card"],
[class*="modal-container"] {
  background: rgba(13, 17, 26, 0.88) !important;
  backdrop-filter: blur(40px) saturate(200%) !important;
  -webkit-backdrop-filter: blur(40px) saturate(200%) !important;
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
  border-radius: 26px !important;
  box-shadow:
    0 32px 80px -16px rgba(0, 0, 0, 0.75),
    0 0 0 1px rgba(255, 255, 255, 0.06),
    inset 0 1px 1px rgba(255, 255, 255, 0.15) !important;
}

[data-theme="light"] .modal-content,
[data-theme="light"] .modal-card,
[data-theme="light"] .modal-box,
[data-theme="light"] .reports-modal-container,
[data-theme="light"] .price-audit-modal,
[data-theme="light"] [class*="modal-card"],
[data-theme="light"] [class*="modal-container"] {
  background: rgba(255, 255, 255, 0.88) !important;
  backdrop-filter: blur(40px) saturate(200%) !important;
  -webkit-backdrop-filter: blur(40px) saturate(200%) !important;
  border: 1px solid rgba(255, 255, 255, 0.95) !important;
  box-shadow: 
    0 24px 64px -12px rgba(0, 0, 0, 0.18),
    0 4px 12px rgba(0, 0, 0, 0.05),
    inset 0 1px 1px rgba(255, 255, 255, 1) !important;
  color: #0F172A !important;
}

.modal-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
}

[data-theme="light"] .modal-header {
  background: rgba(248, 250, 252, 0.70) !important;
  backdrop-filter: blur(20px) !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06) !important;
}

/* ==========================================================================
   5. BOTONES iOS — Tactilidad y Dinamismo
   ========================================================================== */
.btn {
  border-radius: 12px !important;
  font-weight: 600 !important;
  letter-spacing: -0.01em !important;
  transition: transform 0.14s ease, filter 0.14s ease, box-shadow 0.14s ease !important;
}

.btn:active:not(:disabled) {
  transform: scale(0.97) !important;
}

.btn-primary {
  background: linear-gradient(135deg, #007AFF 0%, #0051A8 100%) !important;
  color: #FFFFFF !important;
  border: none !important;
  box-shadow: 
    0 4px 14px rgba(0, 122, 255, 0.40),
    inset 0 1px 1px rgba(255, 255, 255, 0.30) !important;
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(1.08) !important;
  box-shadow: 0 8px 22px rgba(0, 122, 255, 0.55) !important;
  transform: translateY(-1px) !important;
}

.btn-success {
  background: linear-gradient(135deg, #34C759 0%, #248A3D 100%) !important;
  color: #FFFFFF !important;
  border: none !important;
  box-shadow: 0 4px 14px rgba(52, 199, 89, 0.40) !important;
}

.btn-outline {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  backdrop-filter: blur(10px) !important;
  color: var(--text-main) !important;
}

.btn-outline:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.10) !important;
  border-color: rgba(255, 255, 255, 0.22) !important;
  transform: translateY(-1px) !important;
}

[data-theme="light"] .btn-outline {
  background: rgba(0, 0, 0, 0.035) !important;
  border: 1px solid rgba(0, 0, 0, 0.10) !important;
  color: #334155 !important;
}

[data-theme="light"] .btn-outline:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.065) !important;
  border-color: rgba(0, 0, 0, 0.18) !important;
  color: #0F172A !important;
}

/* ==========================================================================
   6. INPUTS — iOS Squircle Fields
   ========================================================================== */
input[type="text"],
input[type="number"],
input[type="search"],
input[type="email"],
input[type="password"],
input[type="date"],
select,
textarea,
.input-field {
  border-radius: 12px !important;
  border: 1px solid rgba(255, 255, 255, 0.10) !important;
  background: rgba(20, 26, 40, 0.70) !important;
  color: #FFFFFF !important;
  transition: border-color 0.14s ease, box-shadow 0.14s ease, background 0.14s ease !important;
}

[data-theme="light"] input[type="text"],
[data-theme="light"] input[type="number"],
[data-theme="light"] input[type="search"],
[data-theme="light"] input[type="email"],
[data-theme="light"] input[type="password"],
[data-theme="light"] input[type="date"],
[data-theme="light"] select,
[data-theme="light"] textarea,
[data-theme="light"] .input-field {
  background: rgba(255, 255, 255, 0.88) !important;
  border: 1px solid rgba(0, 0, 0, 0.12) !important;
  color: #0F172A !important;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.03) !important;
}

input:focus,
select:focus,
textarea:focus,
.input-field:focus {
  border-color: #007AFF !important;
  box-shadow: 0 0 0 3.5px rgba(0, 122, 255, 0.22) !important;
  outline: none !important;
}

/* ==========================================================================
   7. CHIPS, BADGES Y CONTRASTE VIBRANTE APPLE
   ========================================================================== */
.network-badge,
.colombia-time-chip {
  background: rgba(255, 255, 255, 0.06) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(255, 255, 255, 0.10) !important;
  border-radius: 9999px !important;
}

[data-theme="light"] .network-badge,
[data-theme="light"] .colombia-time-chip {
  background: rgba(0, 0, 0, 0.04) !important;
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
  color: #334155 !important;
}

/* Badges con alto contraste en Light Mode (legibilidad WCAG AAA) */
[data-theme="light"] .badge-emerald,
[data-theme="light"] .badge-green {
  background: rgba(5, 150, 105, 0.12) !important;
  color: #059669 !important;
  border: 1px solid rgba(5, 150, 105, 0.25) !important;
}

[data-theme="light"] .badge-blue {
  background: rgba(0, 122, 255, 0.12) !important;
  color: #007AFF !important;
  border: 1px solid rgba(0, 122, 255, 0.25) !important;
}

[data-theme="light"] .badge-purple {
  background: rgba(124, 58, 237, 0.12) !important;
  color: #7c3aed !important;
  border: 1px solid rgba(124, 58, 237, 0.25) !important;
}

[data-theme="light"] .badge-rose {
  background: rgba(225, 29, 72, 0.12) !important;
  color: #e11d48 !important;
  border: 1px solid rgba(225, 29, 72, 0.25) !important;
}

[data-theme="light"] .badge-amber,
[data-theme="light"] .badge-orange {
  background: rgba(217, 119, 6, 0.12) !important;
  color: #d97706 !important;
  border: 1px solid rgba(217, 119, 6, 0.25) !important;
}

/* ==========================================================================
   8. GLASS PANEL & STAT CARDS (Paneles de Datos)
   ========================================================================== */
.glass-panel,
.stat-card {
  background: rgba(18, 24, 38, 0.70) !important;
  backdrop-filter: blur(24px) saturate(170%) !important;
  -webkit-backdrop-filter: blur(24px) saturate(170%) !important;
  border: 1px solid rgba(255, 255, 255, 0.10) !important;
  border-radius: 20px !important;
  box-shadow: 
    0 10px 28px -4px rgba(0, 0, 0, 0.38),
    inset 0 1px 1px rgba(255, 255, 255, 0.12) !important;
  transition: all 0.24s cubic-bezier(0.25, 1, 0.5, 1) !important;
}

[data-theme="light"] .glass-panel,
[data-theme="light"] .stat-card {
  background: rgba(255, 255, 255, 0.80) !important;
  backdrop-filter: blur(24px) saturate(190%) !important;
  -webkit-backdrop-filter: blur(24px) saturate(190%) !important;
  border: 1px solid rgba(255, 255, 255, 0.95) !important;
  box-shadow: 
    0 4px 16px -2px rgba(0, 0, 0, 0.05),
    0 12px 32px -4px rgba(0, 0, 0, 0.06),
    inset 0 1px 1px rgba(255, 255, 255, 1) !important;
}

.stat-card:hover,
.glass-panel:hover {
  transform: translateY(-2px) !important;
}

/* ==========================================================================
   9. TABLAS DE DATOS (Inventario & Historial de Ventas)
   ========================================================================== */
table {
  border-collapse: separate !important;
  border-spacing: 0 !important;
}

table tr {
  transition: background 0.16s ease !important;
}

table tr:hover {
  background: rgba(255, 255, 255, 0.04) !important;
}

[data-theme="light"] table tr:hover {
  background: rgba(0, 122, 255, 0.04) !important;
}

[data-theme="light"] table th {
  color: #475569 !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08) !important;
}

[data-theme="light"] table td {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05) !important;
  color: #0F172A !important;
}

/* ==========================================================================
   10. SCROLLBARS — Minimalismo macOS
   ========================================================================== */
::-webkit-scrollbar { width: 7px; height: 7px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.16); border-radius: 9999px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.28); }
[data-theme="light"] ::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.16); }
[data-theme="light"] ::-webkit-scrollbar-thumb:hover { background: rgba(0, 0, 0, 0.28); }

/* ==========================================================================
   11. TEXTOS Y TÍTULOS GLOBALES
   ========================================================================== */
h1, h2, h3, h4, h5, h6 {
  color: var(--text-main) !important;
  letter-spacing: -0.02em !important;
}

[data-theme="light"] h1,
[data-theme="light"] h2,
[data-theme="light"] h3,
[data-theme="light"] h4,
[data-theme="light"] h5,
[data-theme="light"] h6 {
  color: #0F172A !important;
}

[data-theme="light"] p,
[data-theme="light"] span,
[data-theme="light"] label {
  color: inherit;
}
'''

with open("d:/Sistema Pos - Miselanea/pos-web/src/styles/iosLiquidGlass.css", "w", encoding="utf-8") as f:
    f.write(css_content.strip() + "\n")

print("iosLiquidGlass.css v3.0 escrito exitosamente.")
