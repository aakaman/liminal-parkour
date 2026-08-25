import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 5000,
  },
  server: {
    host: true,
    port: 5173,
  },
});
