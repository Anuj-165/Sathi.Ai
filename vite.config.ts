import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Custom plugin to ensure LlamaCpp WASM binaries are 
 * moved to the dist folder correctly.
 */
function sathiWasmPlugin(): Plugin {
  const llamacppWasm = path.resolve(__dirname, 'node_modules/@runanywhere/web-llamacpp/wasm');
  return {
    name: 'sathi-wasm-orchestrator',
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
          // Provide a fallback copy at the root of dist
          fs.copyFileSync(srcPath, path.join(outDir, file));
        }
      });
    },
  };
}

export default defineConfig({
  // Plugin order is critical: Tailwind must come first
  plugins: [tailwindcss(), react(), sathiWasmPlugin()],

  build: {
    assetsDir: 'assets',
    cssCodeSplit: false, // Prevents Tailwind from being split into multiple files
    rollupOptions: {
      output: {
        /**
         * THE ENGINE FIX:
         * This ensures the AI bridge files (sherpa, racommons, vlm) 
         * keep their original names. Without this, Vite adds a hash
         * (like -kzdtwQuK) and the SDK fails to find them (404).
         */
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || '';
          if (
            name.includes('sherpa') || 
            name.includes('racommons') || 
            name.includes('vlm-worker') || 
            name.endsWith('.wasm')
          ) {
            return 'assets/[name].[ext]';
          }
          // Standard assets (images, fonts) get the hash for cache busting
          return 'assets/[name]-[hash].[ext]';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },

  optimizeDeps: {
    // Prevents Vite from pre-bundling these, which can break WASM workers
    exclude: ['@runanywhere/web-llamacpp', '@runanywhere/web-onnx'],
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});