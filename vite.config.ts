import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(), 
    tailwindcss()
  ],
  
  // Ensures Vite treats WASM files as static assets
  assetsInclude: ['**/*.wasm'],

  server: {
    headers: {
      // Required for SharedArrayBuffer and multithreaded WASM (STT/TTS)
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

  optimizeDeps: {
    // Keep these excluded so Vite doesn't try to bundle the WASM logic
    exclude: ['@runanywhere/web-llamacpp', '@runanywhere/web-onnx'],
  },

  resolve: {
    alias: { 
      '@': path.resolve(__dirname, './src') 
    },
  },

  build: {
    // Ensure the assets directory is consistent
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // This is the "Secret Sauce": 
        // It prevents Vite from adding hashes (like sherpa-onnx-123.wasm) 
        // so the SDK can find the exact filename it expects.
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