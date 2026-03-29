import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Tactical WASM Plugin: Handles both Local Dev and Production builds.
 * Ensures SATHI's neural assets are served correctly from node_modules.
 */
function sathiWasmPlugin(): Plugin {
  const llamacppWasm = path.resolve(__dirname, 'node_modules/@runanywhere/web-llamacpp/wasm');
  const onnxWasm = path.resolve(__dirname, 'node_modules/@runanywhere/web-onnx/wasm');

  return {
    name: 'sathi-wasm-orchestrator',

    // 1. DEVELOPMENT SERVER MIDDLEWARE
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';

        // Handle LlamaCpp (LLM) Assets
        if (url.includes('/assets/racommons-llamacpp')) {
          const fileName = url.split('/').pop()?.split('?')[0] || '';
          const filePath = path.join(llamacppWasm, fileName);
          if (fs.existsSync(filePath)) {
            res.setHeader('Content-Type', fileName.endsWith('.wasm') ? 'application/wasm' : 'application/javascript');
            return res.end(fs.readFileSync(filePath));
          }
        }

        // Handle Sherpa-ONNX (Root Fallback & Sub-folder)
        // This fixes the 404 seen in your logs
        if (url.includes('sherpa-onnx.wasm') || url.includes('/assets/sherpa/')) {
          const fileName = url.split('/').pop()?.split('?')[0] || '';
          const filePath = path.join(onnxWasm, 'sherpa', fileName);
          
          if (fs.existsSync(filePath)) {
            res.setHeader('Content-Type', 'application/wasm');
            return res.end(fs.readFileSync(filePath));
          }
        }

        next();
      });
    },

    // 2. PRODUCTION BUILD ASSET COPYING
    writeBundle(options) {
      const outDir = options.dir ?? path.resolve(__dirname, 'dist');
      const assetsDir = path.join(outDir, 'assets');
      
      if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

      // Copy LlamaCpp Files
      const llamacppFiles = [
        'racommons-llamacpp.wasm', 'racommons-llamacpp.js',
        'racommons-llamacpp-webgpu.wasm', 'racommons-llamacpp-webgpu.js'
      ];

      llamacppFiles.forEach(file => {
        const srcPath = path.join(llamacppWasm, file);
        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, path.join(assetsDir, file));
          // Also copy to root for SDK fallback
          fs.copyFileSync(srcPath, path.join(outDir, file));
          console.log(`  ✓ Copied LLM Asset: ${file}`);
        }
      });

      
      const sherpaDir = path.join(onnxWasm, 'sherpa');
      const sherpaOut = path.join(assetsDir, 'sherpa');
      
      if (fs.existsSync(sherpaDir)) {
        if (!fs.existsSync(sherpaOut)) fs.mkdirSync(sherpaOut, { recursive: true });
        
        fs.readdirSync(sherpaDir).forEach(file => {
          const src = path.join(sherpaDir, file);
          const dest = path.join(sherpaOut, file);
          const rootDest = path.join(outDir, file); 
          
          if (fs.statSync(src).isFile()) {
            fs.copyFileSync(src, dest);
            
            if (file.endsWith('.wasm')) {
              fs.copyFileSync(src, rootDest);
              console.log(`  ✓ Copied Root Neural Engine: ${file}`);
            }
          }
        });
        console.log(`  ✓ Copied Sherpa-ONNX Neural Assets`);
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(), 
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
});