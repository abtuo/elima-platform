import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { createElimaViteConfig } from "./vite.base";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const normalizedProjectRoot = projectRoot.replaceAll("\\", "/");
const normalizedRepositoryRoot = path.resolve(projectRoot, "../..").replaceAll("\\", "/");
const normalizedMobileRoot = path.resolve(projectRoot, "../mobile").replaceAll("\\", "/");
const normalizedPlatformRoot = path.resolve(projectRoot, "../platform").replaceAll("\\", "/");
const forbiddenModules = [
  "/src/features/admin/",
  "/src/features/parent/",
  "/src/features/teacher/",
  "/src/features/offline/",
  "/src/features/supplies/",
  "/src/features/messages/",
  "/src/features/scanner/",
  "/src/services/mainDataService.",
  "/src/services/paymentService.",
  "/src/services/assignmentService.",
  "/src/services/messageService.",
  "/src/types/school.",
  "/src/constants/demoData.",
  "/src/features/student/",
  "/src/app/",
  "/web/",
  `${normalizedRepositoryRoot}/server/`,
  `${normalizedRepositoryRoot}/api/`,
  `${normalizedMobileRoot}/`,
  `${normalizedPlatformRoot}/`,
] as const;

function revisionBoundaryPlugin(): Plugin {
  return {
    name: "elima-revision-boundary",
    generateBundle(_options, bundle) {
      const modules = new Set<string>();
      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk") continue;
        Object.keys(output.modules).forEach((id) => modules.add(id.replaceAll("\\", "/")));
      }

      const forbidden = [...modules].filter((id) => forbiddenModules.some((fragment) => id.includes(fragment)));
      if (forbidden.length) {
        this.error(`Le build Révision importe des modules School interdits:\n${forbidden.join("\n")}`);
      }

      const manifest = [...modules]
        .filter((id) => id.startsWith(normalizedProjectRoot))
        .map((id) => path.relative(projectRoot, id).replaceAll("\\", "/"))
        .sort();
      this.emitFile({
        type: "asset",
        fileName: "revision-build-modules.json",
        source: `${JSON.stringify(manifest, null, 2)}\n`,
      });
    },
  };
}

export default createElimaViteConfig({
  product: "revision",
  root: projectRoot,
  outDir: path.resolve(projectRoot, "dist"),
  boundaryPlugin: revisionBoundaryPlugin(),
});
