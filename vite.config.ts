import { defineConfig } from 'vite';

export default defineConfig({
  root: 'client',
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          physics: ['cannon-es'],
          socket: ['socket.io-client']
        }
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    fs: {
      allow: ['..']
    },
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 5173
  }
});
