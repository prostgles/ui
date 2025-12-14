import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import "./index.css";

const rootNode = document.getElementById("root");
if (!rootNode) throw new Error("Root node not found");
const root = createRoot(rootNode);
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
