import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    /**
     * Used in coverage reports
     */
    sourcemap: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
