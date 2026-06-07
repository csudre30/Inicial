import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Em desenvolvimento, encaminha as chamadas /api para a API Express.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
  build: {
    outDir: "dist",
  },
});
