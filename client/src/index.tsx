import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./App";
import "./index.css";
import { AlertProvider } from "@components/AlertProvider";

const rootNode = document.getElementById("root");
if (!rootNode) throw new Error("Root node not found");
const root = createRoot(rootNode);
root.render(
  <BrowserRouter>
    <AlertProvider>
      <App />
    </AlertProvider>
  </BrowserRouter>,
);
