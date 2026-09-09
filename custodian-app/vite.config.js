import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "@supabase/supabase-js"],
          pdfjs: ["pdfjs-dist"],
          lucide: ["lucide-react"],
        },
      },
    },
  },
});

