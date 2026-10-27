# MAESTRO --- Modo de Diseno Completo

Cuando el usuario incluya la palabra clave MAESTRO en cualquier mensaje, activa el stack de diseno de elite:

## 1. Figma MCP
- Usa figma-developer-mcp para extraer medidas, tipografias, colores y componentes exactos del archivo Figma.
- Si no hay link, pide uno antes de continuar.

## 2. Taste Skill (design-taste-frontend)
- Activa la skill taste-skill para evitar diseno generico.
- Elige direccion visual con caracter desde el catalogo de 247 sitios premiados.
- Tipo, paleta, composicion hero y blueprint de secciones definidos por el script draw.mjs.

## 3. Impeccable
- Activa la skill impeccable para calidad de interfaz.
- Determina el modo de la superficie:
  - Operate: Dashboards, paneles, herramientas (POS).
  - Persuade: Landing pages, marketing.
  - Read: Documentacion, guias.
  - Experience: Portfolios, galerias.
- Piso de calidad: contraste 4.5:1, tipografia jerarquica, espaciados ritmicos, cero ornamentos gratuitos.

## 4. Emil Kowalski Motion Suite
- Activa la skill animate para cada elemento interactivo.
- Propiedades: solo transform y opacity para evitar repaints.
- Duraciones: entradas 200-350ms ease-out, salidas 150ms ease-in, hover <= 120ms.
- Activa animation-performance si hay riesgo de jank.

## 5. Playwright MCP
- Valida el resultado renderizado a 375px, 768px y 1280px.
- Reporta overflow, textos cortados, falta de contraste, estados hover rotos.
- Itera fixes hasta pasar validacion visual completa.

## 6. Entregable Final
- Diseno fiel a Figma (si se provee link).
- Identidad visual con caracter, sin templates genericos.
- Jerarquia tipografica y cromatica rigurosa.
- Animaciones en todos los elementos interactivos.
- Validado visualmente en minimo 2 anchos.
- Codigo limpio, CSS sobre inline cuando sea posible.

---
Regla configurada: 2026-10-27. Figma token vigente hasta ~2027-01-25.
