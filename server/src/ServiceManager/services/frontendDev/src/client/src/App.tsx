import { Route, Routes } from "react-router";
import "./App.css";
import { ComponentPreview } from "./pages/ComponentPreview";
import { Home } from "./pages/Home";

export const App = () => {
  return (
    <>
      <Routes>
        <Route index element={<Home />} />
        <Route
          path="/component-preview/:component"
          element={<ComponentPreview />}
        />
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </>
  );
};
