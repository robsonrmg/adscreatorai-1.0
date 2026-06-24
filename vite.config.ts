import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separa as dependências da pasta node_modules em um arquivo separado
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
});