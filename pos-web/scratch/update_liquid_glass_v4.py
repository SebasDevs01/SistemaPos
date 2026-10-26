# -*- coding: utf-8 -*-
"""
Script para generar src/styles/iosLiquidGlass.css v4.0
Inspirado en la guía de diseño UTS Power Zone y Apple Liquid Glass oficial
(visionOS & macOS Sequoia).
"""

css_content = '''/**
 * iosLiquidGlass.css — Versión 4.0 Definitiva
 * Sistema de Diseño Apple Liquid Glass & Vibrancy
 * Inspirado en la guía editorial y física de materiales de Apple & UTS Power Zone
 */

/* ==========================================================================
   0. ATMÓSFERA Y FONDO — Profundidad Óptica & Refracción de Luz
   ========================================================================== */
body {
  background: var(--bg-base, #0B111B) !important;
  color: var(--text-main) !important;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "DM Sans", "Inter", system-ui, sans-serif !important;
  -webkit-font-smoothing: antialiased !important;
  -moz-osx-font-smoothing: grayscale !important;
  min-height: 100vh !important;
  position: relative !important;
}

/* 🌙 DARK MODE: Orbes bioluminiscentes zafiro e índigo para que el vidrio oscuro AHUMADO refracte luz viva */
body::before {
  content: "" !important;
  position: fixed !important;
  inset: 0 !important;
  pointer-events: none !important;
  z-index: -1 !important;
  background:
    radial-gradient(ellipse 75% 65% at 10% 8%, rgba(0, 122, 255, 0.22) 0%, transparent 60%),
    radial-gradient(ellipse 65% 55% at 90% 85%, rgba(88, 86, 214, 0.20) 0%, transparent 55%),
    radial-gradient(ellipse 55% 45% at 50% 40%, rgba(175, 82, 222, 0.12) 0%, transparent 45%),
    radial-gradient(ellipse 60% 50% at 80% 15%, rgba(52, 199, 89, 0.10) 0%, transparent 50%),
    radial-gradient(ellipse 70% 60% at 25% 85%, rgba(0, 199, 190, 0.10) 0%, transparent 55%) !important;
}

/* ☀️ LIGHT MODE: Atmósfera perlada con orbes celestes, lavanda y esmeralda */
[data-theme="light"] body {
  background: #EEF2F7 !important;
  color: #0F172A !important;
}

[data-theme="light"] body::before {
  content: "" !important;
  position: fixed !important;
  inset: 0 !important;
  pointer-events: none !important;
  z-index: -1 !important;
  background:
    radial-gradient(ellipse 75% 65% at 8% 6%, rgba(0, 122, 255, 0.14) 0%, transparent 60%),
    radial-gradient(ellipse 65% 55% at 92% 88%, rgba(175, 82, 222, 0.11) 0%, transparent 55%),
    radial-gradient(ellipse 55% 45% at 75% 20%, rgba(52, 199, 89, 0.09) 0%, transparent 50%),
    radial-gradient(ellipse 65% 55% at 20% 90%, rgba(255, 149, 0, 0.09) 0%, transparent 50%) !important;
}

/* ==========================================================================
   1. HEADER FLOTANTE — Liquid Glass Navigation Bar
   ========================================================================== */
.app-header {
  position: sticky !important;
  top: 0 !important;
  z-index: 200 !important;
  background: rgba(11, 17, 27, 0.75) !important;
  backdrop-filter: blur(34px) saturate(190%) contrast(105%) !important;
  -webkit-backdrop-filter: blur(34px) saturate(190%) contrast(105%) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12) !important;
  box-shadow: 
    0 1px 0 rgba(255, 255, 255, 0.10),
    0 10px 32px -4px rgba(0, 0, 0, 0.45) !important;
}

[data-theme="light"] .app-header {
  background: rgba(255, 255, 255, 0.82) !important;
  backdrop-filter: blur(34px) saturate(190%) contrast(105%) !important;
  -webkit-backdrop-filter: blur(34px) saturate(190%) contrast(105%) !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06) !important;
  box-shadow: 
    0 1px 0 rgba(255, 255, 255, 0.98),
    0 8px 24px -4px rgba(15, 23, 42, 0.06) !important;
}

.logo-text h1 {
  font-family: -apple-system, BlinkMacSystemFont, "Manrope", "SF Pro Display", sans-serif !important;
  font-size: 1.05rem !important;
  font-weight: 800 !important;
  letter-spacing: -0.03em !important;
  color: var(--text-main) !important;
}

[data-theme="light"] .logo-text h1 {
  color: #0F172A !important;
}

/* ── Segmented Control Tabs (Header) ── */
.header-nav {
  background: rgba(0, 0, 0, 0.35) !important;
  backdrop-filter: blur(16px) !important;
  -webkit-backdrop-filter: blur(16px) !important;
  border: 1px solid rgba(255, 255, 255, 0.10) !important;
  border-radius: 9999px !important;
  padding: 4px !important;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.35) !important;
}

[data-theme="light"] .header-nav {
  background: rgba(0, 0, 0, 0.05) !important;
  border: 1px solid rgba(0, 0, 0, 0.07) !important;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05) !important;
}

.nav-tab {
  border-radius: 9999px !important;
  font-size: 0.82rem !important;
  font-weight: 600 !important;
  padding: 6px 14px !important;
  color: var(--text-muted) !important;
  transition: all 0.2s cubic-bezier(0.25, 1, 0.5, 1) !important;
}

[data-theme="light"] .nav-tab {
  color: #475569 !important;
}

[data-theme="light"] .nav-tab:hover:not(.nav-tab--active) {
  background: rgba(255, 255, 255, 0.90) !important;
  color: #0F172A !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06) !important;
}

.nav-tab--active {
  background: #007AFF !important;
  color: #FFFFFF !important;
  font-weight: 700 !important;
  box-shadow: 
    0 3px 12px rgba(0, 122, 255, 0.45),
    inset 0 1px 1px rgba(255, 255, 255, 0.35) !important;
}

/* ==========================================================================
   2. PRODUCT CARDS — Liquid Glass Surface con Borde Especular Apple
   ========================================================================== */
.product-card {
  background: linear-gradient(135deg, rgba(26, 36, 56, 0.72) 0%, rgba(14, 20, 32, 0.78) 100%) !important;
  backdrop-filter: blur(28px) saturate(190%) contrast(105%) !important;
  -webkit-backdrop-filter: blur(28px) saturate(190%) contrast(105%) !important;
  border: 1px solid rgba(255, 255, 255, 0.16) !important;
  border-radius: 20px !important;
  box-shadow: 
    0 16px 40px -8px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.20) !important;
  transition: 
    transform 0.26s cubic-bezier(0.25, 1, 0.5, 1),
    box-shadow 0.26s cubic-bezier(0.25, 1, 0.5, 1),
    border-color 0.2s ease !important;
  overflow: hidden !important;
  position: relative !important;
}

/* Brillo especular superior continuo (técnica maestra UTS Power Zone & Apple) */
.product-card::before {
  content: "" !important;
  position: absolute !important;
  left: 8% !important;
  right: 8% !important;
  top: 0 !important;
  height: 1px !important;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.60), transparent) !important;
  pointer-events: none !important;
  z-index: 2 !important;
}

.product-card:hover {
  transform: translateY(-4px) scale(1.01) !important;
  box-shadow: 
    0 24px 54px -8px rgba(0, 0, 0, 0.65),
    0 0 0 1px rgba(0, 122, 255, 0.35),
    inset 0 1px 1px rgba(255, 255, 255, 0.30) !important;
  border-color: rgba(0, 122, 255, 0.40) !important;
}

/* ── MODO CLARO PRODUCT CARDS (Vidrio Cristalino con Resplandor) ── */
[data-theme="light"] .product-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.82) 0%, rgba(246, 249, 253, 0.72) 100%) !important;
  backdrop-filter: blur(28px) saturate(190%) contrast(102%) !important;
  -webkit-backdrop-filter: blur(28px) saturate(190%) contrast(102%) !important;
  border: 1px solid rgba(255, 255, 255, 0.98) !important;
  box-shadow: 
    0 6px 20px -2px rgba(15, 23, 42, 0.06),
    0 16px 36px -4px rgba(15, 23, 42, 0.08),
    inset 0 1px 1px rgba(255, 255, 255, 1) !important;
}

[data-theme="light"] .product-card::before {
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 1), transparent) !important;
}

[data-theme="light"] .product-card:hover {
  transform: translateY(-4px) scale(1.01) !important;
  box-shadow: 
    0 10px 24px -2px rgba(15, 23, 42, 0.08),
    0 24px 54px -6px rgba(15, 23, 42, 0.12),
    0 0 0 1px rgba(0, 122, 255, 0.25),
    inset 0 1px 1px #FFFFFF !important;
  border-color: rgba(0, 122, 255, 0.35) !important;
}

/* ==========================================================================
   3. ETIQUETAS Y BADGES DE PRODUCTO (ADAPTACIÓN MODO CLARO Y OSCURO)
   ========================================================================== */
/* Badge de Categoría sobre la foto */
.product-card-category-badge {
  background: rgba(0, 0, 0, 0.65) !important;
  backdrop-filter: blur(16px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(16px) saturate(180%) !important;
  color: #FFFFFF !important;
  border: 1px solid rgba(255, 255, 255, 0.20) !important;
  border-radius: 9999px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.30), inset 0 1px 0 rgba(255, 255, 255, 0.25) !important;
  font-weight: 700 !important;
  font-size: 0.68rem !important;
  letter-spacing: 0.02em !important;
  padding: 3px 10px !important;
}

/* En Modo Claro se transforma en una cápsula de cristal translúcida y nítida */
[data-theme="light"] .product-card-category-badge {
  background: rgba(255, 255, 255, 0.88) !important;
  backdrop-filter: blur(16px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(16px) saturate(180%) !important;
  color: #0F172A !important;
  border: 1px solid rgba(255, 255, 255, 0.98) !important;
  box-shadow: 
    0 4px 12px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 #FFFFFF !important;
}

/* Status Pill (Stock en tarjeta) */
.product-status-pill {
  backdrop-filter: blur(14px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(14px) saturate(180%) !important;
  border-radius: 9999px !important;
  font-size: 0.68rem !important;
  font-weight: 800 !important;
  padding: 3px 9px !important;
}

.pill-available {
  background: rgba(16, 185, 129, 0.85) !important;
  color: #FFFFFF !important;
  border: 1px solid rgba(255, 255, 255, 0.25) !important;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35) !important;
}

.pill-warning {
  background: rgba(245, 158, 11, 0.90) !important;
  color: #FFFFFF !important;
  border: 1px solid rgba(255, 255, 255, 0.25) !important;
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35) !important;
}

.pill-unavailable {
  background: rgba(244, 63, 94, 0.85) !important;
  color: #FFFFFF !important;
  border: 1px solid rgba(255, 255, 255, 0.25) !important;
  box-shadow: 0 4px 14px rgba(244, 63, 94, 0.35) !important;
}

/* Textos dentro de la tarjeta */
.product-card-title {
  color: var(--text-main) !important;
  font-family: -apple-system, BlinkMacSystemFont, "DM Sans", "Inter", sans-serif !important;
  font-weight: 700 !important;
}

[data-theme="light"] .product-card-title {
  color: #0F172A !important;
}

.product-card-code {
  color: var(--text-dim) !important;
}

[data-theme="light"] .product-card-code {
  color: #64748B !important;
}

/* Precio en tarjeta */
.product-card-price {
  font-weight: 800 !important;
}

[data-theme="light"] .product-card-price {
  color: #059669 !important;
}

/* Botones de acción rápida en tarjeta (ojito, lápiz, basurero) */
.btn-card-icon {
  background: rgba(255, 255, 255, 0.08) !important;
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
  color: #CBD5E1 !important;
  border-radius: 8px !important;
  transition: all 0.16s ease !important;
}

.btn-card-icon:hover {
  background: rgba(255, 255, 255, 0.18) !important;
  color: #FFFFFF !important;
  transform: translateY(-1px) !important;
}

[data-theme="light"] .btn-card-icon {
  background: rgba(0, 0, 0, 0.04) !important;
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
  color: #475569 !important;
}

[data-theme="light"] .btn-card-icon:hover {
  background: rgba(0, 0, 0, 0.08) !important;
  color: #0F172A !important;
  border-color: rgba(0, 0, 0, 0.16) !important;
}

/* Toggle disponibilidad */
.card-avail-toggle {
  color: var(--text-muted) !important;
}

[data-theme="light"] .card-avail-toggle {
  color: #475569 !important;
}

/* ==========================================================================
   4. FILTROS Y CATEGORÍAS (Apple Squircle Chips)
   ========================================================================== */
.category-tab,
.filterbar .filter,
[class*="category-button"] {
  border-radius: 9999px !important;
  font-weight: 600 !important;
  font-size: 0.82rem !important;
  padding: 7px 15px !important;
  transition: all 0.18s ease !important;
  background: rgba(255, 255, 255, 0.06) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  color: var(--text-muted) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
}

.category-tab:hover,
.filterbar .filter:hover {
  background: rgba(255, 255, 255, 0.12) !important;
  color: var(--text-main) !important;
  transform: translateY(-1px) !important;
}

[data-theme="light"] .category-tab,
[data-theme="light"] .filterbar .filter,
[data-theme="light"] [class*="category-button"] {
  background: rgba(255, 255, 255, 0.72) !important;
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
  color: #334155 !important;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04) !important;
}

[data-theme="light"] .category-tab:hover,
[data-theme="light"] .filterbar .filter:hover {
  background: rgba(255, 255, 255, 0.98) !important;
  color: #0F172A !important;
  border-color: rgba(0, 0, 0, 0.15) !important;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.07) !important;
}

/* Tab / Categoría Activa */
.category-tab.active,
.filterbar .filter.active,
[class*="category-button"].active {
  background: #007AFF !important;
  color: #FFFFFF !important;
  border-color: #007AFF !important;
  box-shadow: 
    0 4px 14px rgba(0, 122, 255, 0.40),
    inset 0 1px 1px rgba(255, 255, 255, 0.35) !important;
}

/* ==========================================================================
   5. MODALES — Vidrio Cinematográfico Flotante
   ========================================================================== */
.modal-overlay,
.reports-modal-overlay,
.price-audit-overlay,
[class*="modal-overlay"] {
  background: rgba(0, 0, 0, 0.65) !important;
  backdrop-filter: blur(24px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
}

[data-theme="light"] .modal-overlay,
[data-theme="light"] .reports-modal-overlay,
[data-theme="light"] .price-audit-overlay,
[data-theme="light"] [class*="modal-overlay"] {
  background: rgba(15, 23, 42, 0.38) !important;
  backdrop-filter: blur(24px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
}

.modal-content,
.modal-card,
.modal-box,
.reports-modal-container,
.price-audit-modal,
[class*="modal-card"],
[class*="modal-container"] {
  background: linear-gradient(135deg, rgba(22, 32, 50, 0.88) 0%, rgba(12, 18, 30, 0.92) 100%) !important;
  backdrop-filter: blur(44px) saturate(200%) contrast(105%) !important;
  -webkit-backdrop-filter: blur(44px) saturate(200%) contrast(105%) !important;
  border: 1px solid rgba(255, 255, 255, 0.18) !important;
  border-radius: 26px !important;
  box-shadow:
    0 36px 90px -16px rgba(0, 0, 0, 0.80),
    0 0 0 1px rgba(255, 255, 255, 0.08),
    inset 0 1px 1px rgba(255, 255, 255, 0.20) !important;
  color: #FFFFFF !important;
}

[data-theme="light"] .modal-content,
[data-theme="light"] .modal-card,
[data-theme="light"] .modal-box,
[data-theme="light"] .reports-modal-container,
[data-theme="light"] .price-audit-modal,
[data-theme="light"] [class*="modal-card"],
[data-theme="light"] [class*="modal-container"] {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(246, 249, 253, 0.88) 100%) !important;
  backdrop-filter: blur(44px) saturate(200%) !important;
  -webkit-backdrop-filter: blur(44px) saturate(200%) !important;
  border: 1px solid rgba(255, 255, 255, 1) !important;
  box-shadow: 
    0 28px 70px -12px rgba(15, 23, 42, 0.18),
    0 4px 16px rgba(15, 23, 42, 0.06),
    inset 0 1px 1px #FFFFFF !important;
  color: #0F172A !important;
}

[data-theme="light"] .modal-header {
  background: rgba(248, 250, 252, 0.75) !important;
  backdrop-filter: blur(20px) !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06) !important;
}

[data-theme="light"] .modal-header h2,
[data-theme="light"] .modal-header h3,
[data-theme="light"] .modal-title {
  color: #0F172A !important;
}

/* ==========================================================================
   6. PANEL DE TICKET Y CARRITO (Liquid Glass Sidebar)
   ========================================================================== */
.ticket-panel,
.sales-panel,
.cart-panel,
[class*="ticket"],
[class*="panel-right"] {
  background: linear-gradient(135deg, rgba(20, 30, 48, 0.82) 0%, rgba(11, 17, 28, 0.85) 100%) !important;
  backdrop-filter: blur(32px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(32px) saturate(180%) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 24px !important;
  box-shadow: 
    0 16px 42px -4px rgba(0, 0, 0, 0.50),
    inset 0 1px 1px rgba(255, 255, 255, 0.16) !important;
}

[data-theme="light"] .ticket-panel,
[data-theme="light"] .sales-panel,
[data-theme="light"] .cart-panel,
[data-theme="light"] [class*="ticket"],
[data-theme="light"] [class*="panel-right"] {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(246, 249, 253, 0.76) 100%) !important;
  backdrop-filter: blur(32px) saturate(190%) !important;
  -webkit-backdrop-filter: blur(32px) saturate(190%) !important;
  border: 1px solid rgba(255, 255, 255, 1) !important;
  box-shadow: 
    0 8px 24px -2px rgba(15, 23, 42, 0.07),
    0 20px 48px -4px rgba(15, 23, 42, 0.09),
    inset 0 1px 1px #FFFFFF !important;
}

/* ==========================================================================
   7. INPUTS Y FORMULARIOS (iOS Squircle Fields)
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
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  background: rgba(22, 32, 50, 0.75) !important;
  color: #FFFFFF !important;
  font-family: var(--font-body) !important;
  transition: all 0.16s ease !important;
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
  background: rgba(255, 255, 255, 0.90) !important;
  border: 1px solid rgba(0, 0, 0, 0.12) !important;
  color: #0F172A !important;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.03) !important;
}

input:focus,
select:focus,
textarea:focus,
.input-field:focus {
  border-color: #007AFF !important;
  box-shadow: 0 0 0 3.5px rgba(0, 122, 255, 0.25) !important;
  outline: none !important;
}

/* ==========================================================================
   8. GLASS PANEL & STAT CARDS (Paneles de Datos)
   ========================================================================== */
.glass-panel,
.stat-card {
  background: linear-gradient(135deg, rgba(26, 36, 56, 0.70) 0%, rgba(14, 20, 32, 0.75) 100%) !important;
  backdrop-filter: blur(28px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(28px) saturate(180%) !important;
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
  border-radius: 20px !important;
  box-shadow: 
    0 14px 34px -4px rgba(0, 0, 0, 0.45),
    inset 0 1px 1px rgba(255, 255, 255, 0.16) !important;
  position: relative !important;
}

.glass-panel::before,
.stat-card::before {
  content: "" !important;
  position: absolute !important;
  left: 8% !important;
  right: 8% !important;
  top: 0 !important;
  height: 1px !important;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.50), transparent) !important;
  pointer-events: none !important;
}

[data-theme="light"] .glass-panel,
[data-theme="light"] .stat-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(246, 249, 253, 0.75) 100%) !important;
  backdrop-filter: blur(28px) saturate(190%) !important;
  -webkit-backdrop-filter: blur(28px) saturate(190%) !important;
  border: 1px solid rgba(255, 255, 255, 1) !important;
  box-shadow: 
    0 6px 20px -2px rgba(15, 23, 42, 0.06),
    0 16px 40px -4px rgba(15, 23, 42, 0.08),
    inset 0 1px 1px #FFFFFF !important;
}

[data-theme="light"] .glass-panel::before,
[data-theme="light"] .stat-card::before {
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 1), transparent) !important;
}

/* ==========================================================================
   9. TEXTOS, TÍTULOS Y ETIQUETAS GLOBALES
   ========================================================================== */
h1, h2, h3, h4, h5, h6 {
  color: var(--text-main) !important;
  letter-spacing: -0.025em !important;
}

[data-theme="light"] h1,
[data-theme="light"] h2,
[data-theme="light"] h3,
[data-theme="light"] h4,
[data-theme="light"] h5,
[data-theme="light"] h6 {
  color: #0F172A !important;
}

[data-theme="light"] label {
  color: #475569 !important;
}

/* ==========================================================================
   10. BOTONES Y CAPSULAS iOS
   ========================================================================== */
.btn {
  border-radius: 12px !important;
  font-weight: 700 !important;
  letter-spacing: -0.01em !important;
  transition: transform 0.14s ease, filter 0.14s ease, box-shadow 0.14s ease !important;
}

.btn:active:not(:disabled) {
  transform: scale(0.975) !important;
}

.btn-primary {
  background: linear-gradient(135deg, #007AFF 0%, #0051A8 100%) !important;
  color: #FFFFFF !important;
  border: none !important;
  box-shadow: 
    0 4px 16px rgba(0, 122, 255, 0.40),
    inset 0 1px 1px rgba(255, 255, 255, 0.35) !important;
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(1.08) !important;
  box-shadow: 0 8px 24px rgba(0, 122, 255, 0.55) !important;
  transform: translateY(-1px) !important;
}

.btn-outline {
  background: rgba(255, 255, 255, 0.06) !important;
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
  backdrop-filter: blur(10px) !important;
  color: var(--text-main) !important;
}

.btn-outline:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12) !important;
  border-color: rgba(255, 255, 255, 0.25) !important;
  transform: translateY(-1px) !important;
}

[data-theme="light"] .btn-outline {
  background: rgba(0, 0, 0, 0.035) !important;
  border: 1px solid rgba(0, 0, 0, 0.10) !important;
  color: #334155 !important;
}

[data-theme="light"] .btn-outline:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.07) !important;
  border-color: rgba(0, 0, 0, 0.18) !important;
  color: #0F172A !important;
}

/* ==========================================================================
   11. SCROLLBARS MINIMALISTAS
   ========================================================================== */
::-webkit-scrollbar { width: 7px; height: 7px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.18); border-radius: 9999px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.30); }
[data-theme="light"] ::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.16); }
[data-theme="light"] ::-webkit-scrollbar-thumb:hover { background: rgba(0, 0, 0, 0.28); }
'''

with open("d:/Sistema Pos - Miselanea/pos-web/src/styles/iosLiquidGlass.css", "w", encoding="utf-8") as f:
    f.write(css_content.strip() + "\n")

print("iosLiquidGlass.css v4.0 generado exitosamente.")
