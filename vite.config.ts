import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'; // <--- Tailwind v4 Plugin
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Tactical WASM Plugin: Handles LlamaCpp assets.
 * Sherpa-ONNX is handled via manual placement in the /public folder.
 */
function sathiWasmPlugin(): Plugin {
  const llamacppWasm = path.resolve(__dirname, 'node_modules/@runanywhere/web-llamacpp/wasm');

  return {
    name: 'sathi-wasm-orchestrator',

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        if (url.includes('racommons-llamacpp')) {
          const fileName = url.split('/').pop()?.split('?')[0] || '';
          const filePath = path.join(llamacppWasm, fileName);
          if (fs.existsSync(filePath)) {
            res.setHeader('Content-Type', fileName.endsWith('.wasm') ? 'application/wasm' : 'application/javascript');
            return res.end(fs.readFileSync(filePath));
          }
        }
        next();
      });
    },

    writeBundle(options) {
      const outDir = options.dir ?? path.resolve(__dirname, 'dist');
      const assetsDir = path.join(outDir, 'assets');
      if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

      const llamacppFiles = [
        'racommons-llamacpp.wasm', 'racommons-llamacpp.js',
        'racommons-llamacpp-webgpu.wasm', 'racommons-llamacpp-webgpu.js'
      ];
      llamacppFiles.forEach(file => {
        const srcPath = path.join(llamacppWasm, file);
        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, path.join(assetsDir, file));
          fs.copyFileSync(srcPath, path.join(outDir, file));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    tailwindcss(), // <--- Must be BEFORE react() for best compatibility in v4
    react(), 
    sathiWasmPlugin()
  ],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp', 
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp', 
    },
  },
  assetsInclude: ['**/*.wasm'],
  worker: { 
    format: 'es' 
  },
  optimizeDeps: {
    exclude: ['@runanywhere/web-llamacpp', '@runanywhere/web-onnx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.wasm')) {
            return 'assets/[name][ext]';
          }
          return 'assets/[name]-[hash][ext]';
        },
      },
    },
  },
});