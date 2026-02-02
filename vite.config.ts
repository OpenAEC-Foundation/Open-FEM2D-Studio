import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { apiPlugin } from './vite-api-plugin';

export default defineConfig({
  plugins: [react(), apiPlugin()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      // Proxy unhandled /api requests to Python backend (e.g. /api/chat for AI)
      '/api/chat': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
});
