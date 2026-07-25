function jwtProjectRef(value) {
  try {
    const payload = value.split(".")[1];
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).ref ?? null;
  } catch {
    return null;
  }
}

export function getTargetConfig({ requireServerKey = true } = {}) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serverKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url) throw new Error("VITE_SUPABASE_URL (ou SUPABASE_URL) est manquante.");
  if (requireServerKey && !serverKey) {
    throw new Error("Ajoutez la clé serveur du NOUVEAU projet dans SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_SECRET_KEY.");
  }

  const targetRef = new URL(url).hostname.split(".")[0];
  const keyRef = serverKey ? jwtProjectRef(serverKey) : null;
  if (keyRef && keyRef !== targetRef) {
    throw new Error("Refus de sécurité : la clé serveur n'appartient pas au projet indiqué par VITE_SUPABASE_URL.");
  }
  return { url: url.replace(/\/+$/, ""), serverKey, targetRef };
}

export async function verifyServerKey(config) {
  if (!config.serverKey) throw new Error("Clé serveur manquante.");
  const response = await fetch(`${config.url}/auth/v1/settings`, {
    headers: { apikey: config.serverKey, Authorization: `Bearer ${config.serverKey}` },
  });
  if (!response.ok) {
    throw new Error(`La clé serveur n'est pas acceptée par le nouveau projet (HTTP ${response.status}).`);
  }
}

export function assertDemoTarget(config) {
  const appEnv = process.env.APP_ENV || process.env.VITE_APP_ENV;
  const demoRef = process.env.SUPABASE_DEMO_PROJECT_ID;
  const productionRef = process.env.SUPABASE_PRODUCTION_PROJECT_ID;
  if (appEnv !== "demo") {
    throw new Error("Refus de sécurité : APP_ENV (ou VITE_APP_ENV) doit valoir demo.");
  }
  if (!demoRef) {
    throw new Error("Refus de sécurité : SUPABASE_DEMO_PROJECT_ID est obligatoire.");
  }
  if (config.targetRef !== demoRef) {
    throw new Error("Refus de sécurité : la cible ne correspond pas à SUPABASE_DEMO_PROJECT_ID.");
  }
  if (productionRef && config.targetRef === productionRef) {
    throw new Error("Refus absolu : le Project ID correspond à la Production.");
  }
}
