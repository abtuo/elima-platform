import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { subscribeNetworkStatus } from "@/services/networkStatusService";

export function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => subscribeNetworkStatus(setOnline), []);

  if (online) return null;

  return (
    <div role="status" className="offline-banner flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-white">
      <WifiOff className="h-4 w-4" />
      <span>Tu es hors connexion. Les actions en ligne seront disponibles au retour du réseau.</span>
    </div>
  );
}
