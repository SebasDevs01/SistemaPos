# 🛒 Sistema POS & Miscelánea María José

Sistema integral de punto de venta (POS), facturación, inventario, alquileres de mobiliario, seguros estudiantiles y asistente inteligente por voz impulsado por inteligencia artificial.

Desplegado en producción en: **[https://sistema-pos-miselanea.web.app](https://sistema-pos-miselanea.web.app)**

---

## 🌟 Características Principales

### 📦 Módulo Web POS (`pos-web`)
- **Caja Rápida (POS):** Búsqueda instantánea de productos con lector de código de barras o teclado (`F2`), cálculo de cambios, múltiples medios de pago (Efectivo, Nequi, Daviplata, Tarjetas) e impresión de tickets térmicos con códigos QR.
- **Atajos de Teclado Profesionales:**
  - `F2`: Foco inmediato en buscador
  - `F4`: Apertura de caja registradora y arqueo
  - `Alt + D`: Dashboard de Métricas
  - `Alt + P`: Caja POS
  - `Alt + I`: Inventario
  - `Alt + V`: Ventas y Cierre
  - `Alt + C`: Clientes
  - `Alt + A`: Alquiler de Sillas/Mesas
  - `Alt + S`: Seguros Escolares
  - `Alt + B`: Generador de Códigos de Barras / Stickers
- **Dashboard en Tiempo Real:** KPIs de facturación del día, ticket promedio, comparativas contra el día anterior, gráfica interactiva de los últimos 7 días y alertas de stock crítico.
- **Control de Inventario Avanzado:** Registro de productos con imágenes, gestión de costos/precios, bajas/mermas de inventario y pedidos sugeridos a proveedores.
- **Auditoría e Historial de Precios:** Registro inmutable de cada cambio de precio y costo (usuario responsable, fecha y variación).
- **Reportes Oficiales en PDF:** Generación y descarga con un clic de:
  - Reporte de Ventas por rango de fechas y desglose de medios de pago.
  - Valoración de Inventario total (costo vs venta) y stock crítico.
  - Arqueo y Acta de Cierre de Caja con firmas de conformidad.
- **Modo Offline & Watchdog Heartbeat:** Tolerancia completa a caídas de conexión con sincronización automática con Firebase Firestore al reanudar la red.
- **Soporte PWA:** Instalable en tablets, teléfonos y equipos de escritorio como aplicación nativa.
- **Gestión de Alquileres & Seguros:** Control de entregas de sillas/mesas, estados de devolución, depósitos y seguros estudiantiles.

### 🤖 Asistente Virtual Orion (`orion-assistant`)
- Asistente de voz y texto con Google Gemini AI y websockets en tiempo real.
- Integración autónoma con el sistema POS mediante llamadas a herramientas (`pos_tools.py`):
  - Consultas de existencias y precios en lenguaje natural.
  - Resumen ejecutivo de ventas del día.
  - Clientes más frecuentes y rentas activas o vencidas.
  - Comandos del sistema (abrir caja, ajustar volumen, consultar hora Colombia).

---

## 🛠️ Tecnologías

- **Frontend:** React 19, Vite, Lucide Icons, jsPDF, jsPDF-autotable, Canvas-Confetti, XLSX.
- **Base de Datos & Backend:** Firebase Firestore, Firebase Storage, Firebase Hosting.
- **Asistente AI:** Python 3.10+, Google Gemini API, WebSockets, Edge-TTS, SoundDevice.

---

## 🚀 Instalación y Ejecución Local

### 1. Clonar el repositorio
```bash
git clone https://github.com/SebasDevs01/SistemaPos.git
cd SistemaPos
```

### 2. Frontend (`pos-web`)
```bash
cd pos-web
npm install
npm run dev
```

### 3. Asistente Orion (`orion-assistant`)
```bash
cd ../orion-assistant
cp .env.example .env
# Configura tu GEMINI_API_KEY en .env
pip install -r requirements.txt
python orion_server.py
```

---

## 📄 Licencia y Créditos
Desarrollado para **Miscelánea María José** por [@SebasDevs01](https://github.com/SebasDevs01).
