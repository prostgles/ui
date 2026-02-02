import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App.tsx";
import { ProstglesProvider } from "./api/ProstglesProvider";
import { BrowserRouter } from "react-router";

const onReload = () => {
  console.log("Reload requested");
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ProstglesProvider
      endpoint={import.meta.env.VITE_API_URL as string}
      onReload={onReload}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ProstglesProvider>
  </StrictMode>,
);
