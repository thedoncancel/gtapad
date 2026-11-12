import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: { "process.env": {} },
  resolve: { dedupe: ["@solana/web3.js", "bn.js", "buffer"] },
  build: { target: "es2022", chunkSizeWarningLimit: 2000 },
  optimizeDeps: { esbuildOptions: { target: "es2022" } },
  server: { proxy: { "/api": "http://localhost:3000" } },
});
