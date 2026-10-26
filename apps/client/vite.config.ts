import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React本体はどのタブでも必ず使うため独立チャンクにし、ブラウザキャッシュを効かせる
          "vendor-react": ["react", "react-dom"],
          // Supabase関連は「アカウント/セーブ/WORKSHOP」タブでのみ実際に使われるため分離する
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-firebase": ["firebase/app", "firebase/auth", "firebase/firestore"],
        },
      },
    },
  },
});
