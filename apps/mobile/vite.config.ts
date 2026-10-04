import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(configDirectory, "../..");

type ElimaViteConfigOptions = {
  product?: "full" | "revision";
  root?: string;
  outDir?: string;
  boundaryPlugin?: Plugin;
};

const SERVER_ENV_KEYS = [
  "REVISION_ALLOWED_ORIGINS",
  "ELIMA_IDENTITY_SECRET_KEY", "ELIMA_IDENTITY_SERVICE_ROLE_KEY",
  "TWILIO_ACCOUNT_SID", "TWILIO_API_KEY", "TWILIO_API_SECRET", "TWILIO_VERIFY_SERVICE_SID",
  "GOOGLE_PLAY_PACKAGE_NAME", "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON", "GOOGLE_PLAY_ACCOUNT_HASH_SECRET",
  "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT", "AZURE_DOCUMENT_INTELLIGENCE_KEY",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_ANON_KEY",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ELIMA_IDENTITY_URL",
  "VITE_ELIMA_IDENTITY_URL",
  "ELIMA_IDENTITY_PUBLISHABLE_KEY",
  "VITE_ELIMA_IDENTITY_PUBLISHABLE_KEY",
  "REVISION_SUPABASE_URL",
  "REVISION_SUPABASE_SECRET_KEY",
  "REVISION_SUPABASE_SERVICE_ROLE_KEY",
  "VITE_WEB_BASE_URL",
  "AZURE_OPENAI_ENDPOINT",
  "AZURE_OPENAI_DEPLOYMENT",
  "AZURE_OPENAI_API_VERSION",
  "AZURE_OPENAI_API_KEY",
] as const;

const LOCAL_API_HANDLERS = ["identity-bridge", "elima-profile", "activate-school", "elima-password-login", "elima-signup", "auth-verification-request", "auth-password-reset", "auth-verification-check", "elima-session", "revision-generate", "revision-document-analyze", "revision-subscription", "registration-request", "learning"] as const;
const REVISION_API_HANDLERS = ["identity-bridge", "elima-profile", "elima-password-login", "elima-signup", "auth-verification-request", "auth-password-reset", "auth-verification-check", "elima-session", "revision-generate", "revision-document-analyze", "revision-subscription", "learning"] as const;

function localServerlessApis(enabled: boolean, endpoints: readonly string[]): Plugin {
  return {
    name: "elima-local-serverless-apis",
    configureServer(server) {
      if (!enabled) return;
      for (const endpoint of endpoints) {
        server.middlewares.use(`/api/${endpoint}`, async (request, response, next) => {
          try {
            const chunks: Buffer[] = [];
            for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            const rawBody = Buffer.concat(chunks).toString("utf8");
            const body = rawBody ? JSON.parse(rawBody) : {};
            const handlerUrl = pathToFileURL(path.resolve(repositoryRoot, `apps/api/server/handlers/${endpoint}.mjs`)).href;
            const handler = (await import(/* @vite-ignore */ handlerUrl)).default as (request: unknown, response: unknown) => Promise<unknown>;
            const requestAdapter = Object.assign(request, { body });
            const responseAdapter = {
              setHeader(name: string, value: string) { response.setHeader(name, value); return responseAdapter; },
              status(statusCode: number) { response.statusCode = statusCode; return responseAdapter; },
              getHeader(name: string) { return response.getHeader(name); },
              end() { response.end(); return responseAdapter; },
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
      }
    },
  };
}

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
          const handlerUrl = pathToFileURL(path.resolve(repositoryRoot, "apps/api/server/handlers/revision-generate.mjs")).href;
          const handler = (await import(/* @vite-ignore */ handlerUrl)).default as (request: unknown, response: unknown) => Promise<unknown>;
          const requestAdapter = Object.assign(request, { body });
          const responseAdapter = {
            setHeader(name: string, value: string) { response.setHeader(name, value); return responseAdapter; },
            status(statusCode: number) { response.statusCode = statusCode; return responseAdapter; },
            getHeader(name: string) { return response.getHeader(name); },
            end() { response.end(); return responseAdapter; },
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

export function createElimaViteConfig(options: ElimaViteConfigOptions = {}) {
  const revision = options.product === "revision";
  return defineConfig(({ mode, command }) => {
  const env = { ...loadEnv(mode, repositoryRoot, ""), ...loadEnv(mode, configDirectory, "") };
  const azureEndpoint = env.AZURE_OPENAI_ENDPOINT?.replace(/\/+$/, "");
  const azureKey = env.AZURE_OPENAI_API_KEY;
  for (const key of SERVER_ENV_KEYS) {
    if (env[key] && !process.env[key]) process.env[key] = env[key];
  }

  return {
    envDir: configDirectory,
    // Root platform env stays available locally; app values override it. Only VITE_* is public.
    define: Object.fromEntries(Object.entries(env).filter(([key]) => key.startsWith("VITE_")).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])),
    plugins: [
      localRevisionApi(command === "serve" && Boolean(azureEndpoint && azureKey)),
      localServerlessApis(command === "serve", revision ? REVISION_API_HANDLERS : LOCAL_API_HANDLERS),
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["icons/elima-app.png", "brand/elima-logo.png"],
        manifest: {
          name: revision ? "Elima Révision" : "Elima Mobile",
          short_name: revision ? "Révision" : "Elima",
          description: revision ? "Révise, progresse et prépare tes examens avec Elima" : "Portail mobile Elima — scolaire et révision",
          theme_color: revision ? "#7C3AED" : "#2E8B57",
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
      ...(options.boundaryPlugin ? [options.boundaryPlugin] : []),
    ],
    ...(options.root ? { root: options.root, publicDir: path.resolve(configDirectory, "public") } : {}),
    ...(options.outDir ? { build: { outDir: options.outDir, emptyOutDir: true } } : {}),
    resolve: {
      alias: {
        "@": path.resolve(configDirectory, "./src"),
      },
    },
  };
  });
}

export default createElimaViteConfig();
