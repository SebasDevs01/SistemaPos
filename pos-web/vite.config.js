import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import fs from 'fs'

const buildTime = Date.now().toString();

const versionPlugin = () => ({
  name: 'version-generator',
  buildStart() {
    try {
      const data = JSON.stringify({ version: buildTime, builtAt: new Date().toISOString() });
      if (!fs.existsSync('./public')) fs.mkdirSync('./public', { recursive: true });
      fs.writeFileSync('./public/version.json', data);
    } catch (_) {}
  },
  closeBundle() {
    try {
      const data = JSON.stringify({ version: buildTime, builtAt: new Date().toISOString() });
      if (!fs.existsSync('./dist')) fs.mkdirSync('./dist', { recursive: true });
      fs.writeFileSync('./dist/version.json', data);
    } catch (_) {}
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), versionPlugin()],
  define: {
    __APP_BUILD_TIME__: JSON.stringify(buildTime)
  },
  optimizeDeps: {
    exclude: ['exceljs']
  },
  esbuild: {
    // Use minimal transforms to reduce memory usage
    target: 'es2020',
    logLevel: 'silent'
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      maxParallelFileOps: 1,
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/storage'],
          'vendor-ui': ['lucide-react', 'canvas-confetti'],
          'vendor-xlsx': ['xlsx']
        }
      }
    }
  }
})


