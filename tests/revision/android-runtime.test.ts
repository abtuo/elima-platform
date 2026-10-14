import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { backDestination, createBackDispatcher } from "../../apps/revision/src/services/androidBack.ts";
import { createCameraInbox } from "../../apps/revision/src/services/cameraInbox.ts";

const source = (file: string) => readFile(new URL(`../../apps/revision/${file}`, import.meta.url), "utf8");

test("Android Back: panneau, clavier, étape, confirmation, puis historique", async () => {
  const back = createBackDispatcher();
  const events: string[] = [];
  const flags = { panel: true, keyboard: true, step: true, cancelExit: true };
  back.register(10, () => { events.push("confirm"); return flags.cancelExit; });
  back.register(50, () => { if (!flags.step) return false; flags.step = false; events.push("step"); return true; });
  back.register(90, () => { if (!flags.keyboard) return false; flags.keyboard = false; events.push("keyboard"); return true; });
  const remove = back.register(100, () => { if (!flags.panel) return false; flags.panel = false; events.push("panel"); return true; });
  const fallback = () => { events.push("history"); };
  await back.dispatch(fallback); await back.dispatch(fallback); await back.dispatch(fallback); await back.dispatch(fallback);
  assert.deepEqual(events, ["panel", "keyboard", "step", "confirm"]);
  flags.cancelExit = false; remove(); await back.dispatch(fallback);
  assert.deepEqual(events.slice(-2), ["confirm", "history"]);
});

test("Android Back: pas de double navigation ni handlers conservés après démontage", async () => {
  const back = createBackDispatcher(); let count = 0;
  let release!: () => void;
  const remove = back.register(100, async () => { await new Promise<void>(resolve => { release = resolve; }); return true; });
  const first = back.dispatch(() => { count++; });
  await back.dispatch(() => { count++; });
  release(); await first; assert.equal(count, 0);
  remove(); await back.dispatch(() => { count++; }); assert.equal(count, 1);
});

test("minimisation seulement à la racine, lien direct revient dans l'application", () => {
  assert.equal(backDestination("/student", 4), "minimize");
  assert.equal(backDestination("/", 0), "minimize");
  assert.equal(backDestination("/student/reviser", 2), "history");
  assert.equal(backDestination("/student/reviser/quiz", 0), "/student");
  assert.equal(backDestination("/auth/login", 0), "/");
});

test("photo restaurée avant auth: conservée puis consommée une seule fois", () => {
  const inbox = createCameraInbox<{ webPath: string }>();
  const photo = { webPath: "https://localhost/_capacitor_file_/photo.jpg" };
  inbox.put(photo); assert.equal(inbox.has(), true);
  let notified = 0;
  const unsubscribe = inbox.subscribe(() => { notified++; });
  assert.deepEqual(inbox.take(), photo); assert.equal(inbox.take(), undefined);
  inbox.put(photo); assert.equal(notified, 1);
  unsubscribe(); inbox.put(photo); assert.equal(notified, 1);
});

test("caméra native sans galerie, import web conservé et analyse toujours explicite", async () => {
  const camera = await source("src/services/nativeCamera.ts");
  assert.match(camera, /Camera\.takePhoto/);
  assert.match(camera, /saveToGallery: false/);
  assert.match(camera, /appRestoredResult/);
  assert.match(camera, /result\.pluginId !== "Camera"/);
  assert.doesNotMatch(camera, /requestPermissions|localStorage|base64/);
  const main = await source("src/main.tsx");
  assert.ok(main.indexOf("initializeCameraRecovery();") < main.indexOf("createRoot(document"));
  const scanner = await source("src/features/revision/DocumentScannerPanel.tsx");
  assert.match(scanner, /takePhoto=\{isNativeRuntime\(\)\?takeNativePhoto:undefined\}/);
  const sharedScanner = await readFile(new URL("../../packages/revision-ui/src/RevisionDocumentScanner.tsx",import.meta.url),"utf8");
  assert.match(sharedScanner,/if \(!takePhoto\)/);
  assert.match(sharedScanner, /accept="application\/pdf,image\/jpeg,image\/png"/);
  assert.match(sharedScanner, /void analyzePendingDocument\(\)/);
  assert.doesNotMatch(scanner.slice(scanner.indexOf("const recover ="), scanner.indexOf("async function prepareUpload")), /analyzeRevisionDocument/);
});

test("plugins Capacitor 8, barres edge-to-edge, clavier et réseau limités au natif", async () => {
  const pkg = JSON.parse(await source("package.json"));
  for (const plugin of ["app", "camera", "keyboard", "network", "splash-screen"]) assert.match(pkg.dependencies[`@capacitor/${plugin}`], /^\^8\./);
  const config = await source("capacitor.config.ts");
  assert.match(config, /insetsHandling: "native"/);
  assert.match(config, /resizeOnFullScreen: true/);
  const runtime = await source("src/components/NativeRuntimeEffects.tsx");
  assert.match(runtime, /if \(!isNativeRuntime\(\)\) return/);
  assert.match(runtime, /Keyboard\.hide\(\)/);
  assert.match(runtime, /SystemBarsStyle.Light/);
  assert.match(runtime, /handle\.remove\(\)/);
  assert.doesNotMatch(runtime, /appUrlOpen|exitApp|setOverlaysWebView/);
  const css = await source("src/index.css");
  assert.match(css, /100dvh/); assert.match(css, /native-keyboard-open.*display: none/);
  assert.match(css, /safe-area-inset-bottom/);
  const network = await source("src/services/networkStatusService.ts");
  assert.match(network, /Network.addListener\("networkStatusChange"/);
  assert.match(network, /window.addEventListener\("offline"/);
});

test("étapes auth et exercices enregistrent leurs propres priorités Retour", async () => {
  for (const file of ["RegistrationPage", "ForgotPasswordPage"]) {
    const page = await source(`src/features/auth/${file}.tsx`);
    assert.match(page, /useAndroidBack/); assert.match(page, /if \(loading\) return true/);
    assert.match(page, /if \(!requestToken\)/);
    assert.match(page, /useRevealAuthError\(error\)/);
  }
  for (const file of ["QuizPage", "LearningSolverPage"]) {
    const page = await source(`src/features/revision/${file}.tsx`);
    assert.match(page, /useAndroidBack/); assert.match(page, /window.confirm\("Quitter/);
  }
});
