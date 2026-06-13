import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

// Copy asset directories to dist/ at build time
// (graphic design, animation, video editing are outside public/)
const assetCopyPlugin = {
  name: 'copy-asset-dirs',
  closeBundle() {
    const dirs = ['graphic design', 'animation', 'video editing'];
    for (const dir of dirs) {
      const src = path.resolve(dir);
      const dest = path.resolve('dist', dir);
      if (fs.existsSync(src)) {
        fs.cpSync(src, dest, { recursive: true });
        console.log(`[build] Copied ${dir}/ -> dist/${dir}/`);
      }
    }
  },
};

export default defineConfig({
  base: './',
  plugins: [assetCopyPlugin],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
      },
      output: {
        // Split large libraries into separate chunks for better caching
        manualChunks: {
          'vendor-three': ['three'],
          'vendor-lenis': ['@studio-freight/lenis'],
        },
      },
    },
    // Reduce CSS chunk size
    cssCodeSplit: false,
  },
});
