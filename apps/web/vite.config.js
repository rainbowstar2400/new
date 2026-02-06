import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        allowedHosts: [".ngrok-free.dev", ".ngrok-free.app", ".ngrok.app", ".ngrok.io"],
        proxy: {
            "/v1": {
                target: "http://localhost:8787",
                changeOrigin: true
            }
        }
    }
});
