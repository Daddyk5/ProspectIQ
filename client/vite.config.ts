import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const API_TARGET = process.env.PROSPECTIQ_API_TARGET ?? 'http://127.0.0.1:8080';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      '/ws': { target: API_TARGET.replace(/^http/, 'ws'), ws: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
