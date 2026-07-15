import path from "node:path";
import { pathToFileURL } from "node:url";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const SERVER_ENV_KEYS = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_ANON_KEY",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "AZURE_OPENAI_ENDPOINT",
  "AZURE_OPENAI_DEPLOYMENT",
  "AZURE_OPENAI_API_VERSION",
  "AZURE_OPENAI_API_KEY",
] as const;

function localRevisionApi(enabled: boolean): Plugin {
  return {
    name: "elima-local-revision-api",
    configureServer(server) {
      if (!enabled) return;
      server.middlewares.use("/api/revision-generate", async (request, response, next) => {
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          const body = Buffer.concat(chunks).toString("utf8");
          const handlerUrl = pathToFileURL(path.resolve(__dirname, "api/revision-generate.mjs")).href;
          const handler = (await import(handlerUrl)).default as (request: unknown, response: unknown) => Promise<unknown>;
          const requestAdapter = Object.assign(request, { body });
          const responseAdapter = {
            setHeader(name: string, value: string) { response.setHeader(name, value); return responseAdapter; },
            status(statusCode: number) { response.statusCode = statusCode; return responseAdapter; },
            json(payload: unknown) {
              if (!response.hasHeader("Content-Type")) response.setHeader("Content-Type", "application/json; charset=utf-8");
              response.end(JSON.stringify(payload));
              return responseAdapter;
            },
          };
          await handler(requestAdapter, responseAdapter);
        } catch (error) {
          next(error as Error);
        }
      });
    },
  };
}

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const azureEndpoint = env.AZURE_OPENAI_ENDPOINT?.replace(/\/+$/, "");
  const azureKey = env.AZURE_OPENAI_API_KEY;
  for (const key of SERVER_ENV_KEYS) {
    if (env[key] && !process.env[key]) process.env[key] = env[key];
  }

  return {
    plugins: [
      localRevisionApi(command === "serve" && Boolean(azureEndpoint && azureKey)),
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
  };
});
