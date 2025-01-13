import React from "react";
import "./index.css";
import { App } from "./App";
import { BrowserRouter } from "react-router-dom";
import { createRoot } from "react-dom/client";
const rootNode = document.getElementById("root");
if (!rootNode) throw new Error("Root node not found");
const root = createRoot(rootNode);
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
