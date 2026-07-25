type Level = "INFO" | "WARN" | "ERROR";

export function logEvent(level: Level, event: string, payload?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    payload: payload ?? {},
  };

  if (level === "ERROR") {
    console.error(JSON.stringify(entry));
    return;
  }

  console.log(JSON.stringify(entry));
}
