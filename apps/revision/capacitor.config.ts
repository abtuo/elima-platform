import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ci.elima.revision",
  appName: "Elima Révision",
  webDir: "dist",
  plugins: {
    SystemBars: { insetsHandling: "native", initialViewportFitValueHint: "cover", style: "LIGHT", hidden: false },
    Keyboard: { resizeOnFullScreen: true },
    SplashScreen: { launchAutoHide: true, launchShowDuration: 1000, backgroundColor: "#f4f7f5" },
  },
  server: {
    hostname: "localhost",
    androidScheme: "https",
  },
};

export default config;
