import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Keep illustrations as standalone SVG files for easy user replacement
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        agencyOs: resolve(import.meta.dirname, 'agency-os.html'),
      },
    },
  },
  server: {
    port: 3000,
    open: false,
  },
});
