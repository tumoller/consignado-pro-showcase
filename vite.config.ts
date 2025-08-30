// vite.config.ts (VERSÃO ATUALIZADA COM PROXY)

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // ======================================================
    // ADICIONE A SEÇÃO DE PROXY AQUI
    // ======================================================
    proxy: {
      // Qualquer requisição que comece com /api
      '/api': {
        // será redirecionada para o nosso servidor Express
        target: 'http://localhost:3001', 
        // Necessário para evitar erros de CORS e de origem
        changeOrigin: true,
      },
    },
    // ======================================================
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));