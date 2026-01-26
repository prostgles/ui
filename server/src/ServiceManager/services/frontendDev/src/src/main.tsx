import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App.tsx";
import { ProstglesProvider } from "./api/ProstglesProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ProstglesProvider>
      <App />
    </ProstglesProvider>
  </StrictMode>,
);
