export function createBackDispatcher() {
  const handlers = new Set<{ priority: number; run: () => boolean | Promise<boolean> }>();
  let busy = false;
  return {
    register(priority: number, run: () => boolean | Promise<boolean>) {
      const handler = { priority, run }; handlers.add(handler);
      return () => { handlers.delete(handler); };
    },
    async dispatch(fallback: () => void | Promise<void>) {
      if (busy) return;
      busy = true;
      try {
        for (const handler of [...handlers].sort((a, b) => b.priority - a.priority)) {
          if (handlers.has(handler) && await handler.run()) return;
        }
        await fallback();
      } finally { busy = false; }
    },
  };
}

export function backDestination(path: string, historyIndex: number): "minimize" | "history" | "/student" | "/" {
  if (path === "/" || path === "/student") return "minimize";
  if (historyIndex > 0) return "history";
  return path.startsWith("/student/") ? "/student" : "/";
}

export const androidBack = createBackDispatcher();
