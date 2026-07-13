import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const azureEndpoint = env.AZURE_OPENAI_ENDPOINT?.replace(/\/+$/, "");
  const azureKey = env.AZURE_OPENAI_API_KEY;

  const azureProxy =
    azureEndpoint && azureKey
      ? {
          "/api/azure-openai": {
            target: azureEndpoint,
            changeOrigin: true,
            rewrite: (p: string) => p.replace(/^\/api\/azure-openai/, ""),
            configure: (proxyServer: { on: (event: string, handler: (proxyReq: { setHeader: (k: string, v: string) => void }) => void) => void }) => {
              proxyServer.on("proxyReq", (proxyReq) => {
                proxyReq.setHeader("api-key", azureKey);
              });
            },
          },
        }
      : undefined;

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["icons/elima-app.png", "brand/elima-logo.png"],
        manifest: {
          name: "Elima Mobile",
          short_name: "Elima",
          description: "Portail mobile Elima — scolaire et révision",
          theme_color: "#2E8B57",
          background_color: "#F9FAFB",
          display: "standalone",
          start_url: "/",
          icons: [
            { src: "/icons/elima-app.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: azureProxy ? { proxy: azureProxy } : {},
    preview: azureProxy ? { proxy: azureProxy } : {},
  };
});
