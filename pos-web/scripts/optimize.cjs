const fs = require('fs');
const path = require('path');

// 1. Optimizar App.jsx (Cache-first instant loading)
const appPath = path.join(__dirname, '../src/App.jsx');
let appContent = fs.readFileSync(appPath, 'utf8');

const targetApp = /const \[products, setProducts\] = useState\(\[\]\);\s*const \[rentals, setRentals\] = useState\(\[\]\);\s*const \[sales, setSales\] = useState\(\[\]\);\s*const \[clients, setClients\] = useState\(\[\]\);/;

const replacementApp = `const [products, setProducts] = useState(() => {
    try {
      const cached = localStorage.getItem("pos_products");
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [rentals, setRentals] = useState(() => {
    try {
      const cached = localStorage.getItem("pos_rentals");
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [sales, setSales] = useState(() => {
    try {
      const cached = localStorage.getItem("pos_sales");
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [clients, setClients] = useState(() => {
    try {
      const cached = localStorage.getItem("pos_clients");
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });`;

if (targetApp.test(appContent)) {
  appContent = appContent.replace(targetApp, replacementApp);
  fs.writeFileSync(appPath, appContent, 'utf8');
  console.log('✅ App.jsx optimizado con carga instantánea (Cache-First)');
} else {
  console.log('ℹ️ App.jsx ya estaba optimizado');
}

// 2. Optimizar PosView.jsx (Reutilizar AudioContext para 0ms latencia)
const posPath = path.join(__dirname, '../src/components/PosView.jsx');
let posContent = fs.readFileSync(posPath, 'utf8');

const targetAudio = /const playScannerBeep = \(success = true\) => \{\s*try \{\s*const AudioCtx = window\.AudioContext \|\| window\.webkitAudioContext;\s*if \(!AudioCtx\) return;\s*const ctx = new AudioCtx\(\);/;

const replacementAudio = `let _scannerAudioCtx = null;
const getScannerAudioContext = () => {
  try {
    if (!_scannerAudioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) _scannerAudioCtx = new AudioCtx();
    }
    if (_scannerAudioCtx && _scannerAudioCtx.state === "suspended") {
      _scannerAudioCtx.resume();
    }
  } catch (_) {}
  return _scannerAudioCtx;
};

  const playScannerBeep = (success = true) => {
    try {
      const ctx = getScannerAudioContext();
      if (!ctx) return;`;

if (targetAudio.test(posContent)) {
  posContent = posContent.replace(targetAudio, replacementAudio);
  fs.writeFileSync(posPath, posContent, 'utf8');
  console.log('✅ PosView.jsx optimizado con sonido sin latencia (0ms)');
} else {
  console.log('ℹ️ PosView.jsx ya tenía el sonido optimizado');
}
