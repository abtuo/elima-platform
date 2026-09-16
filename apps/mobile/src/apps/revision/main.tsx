import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RevisionApp } from "./RevisionApp";
import "@/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RevisionApp />
  </StrictMode>,
);
