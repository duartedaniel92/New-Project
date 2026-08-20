import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const ALVO_API = process.env.VITE_PROXY_TARGET || "http://localhost:3001";

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    // o front chama "/api/..." e o Vite repassa para a API: em desenvolvimento
    // não existe CORS nem URL absoluta espalhada pelo código
    proxy: {
      "/api": { target: ALVO_API, changeOrigin: true },
    },
  },

  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        // separa o gráfico do resto: recharts sozinho pesa mais que a aplicação,
        // e só o Painel Principal precisa dele
        manualChunks: {
          graficos: ["recharts"],
        },
      },
    },
  },

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/tests/setup.js"],
    css: false,
    coverage: {
      reporter: ["text", "lcov"],
      include: ["src/**/*.{js,jsx}"],
      exclude: ["src/tests/**", "src/main.jsx"],
    },
  },
});
