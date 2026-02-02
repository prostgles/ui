import { Route, Routes } from "react-router";
import { useProstgles } from "./api/ProstglesProvider";
import "./App.css";
import { ComponentPreview } from "./pages/ComponentPreview";
import { Home } from "./pages/Home";

export const App = () => {
  const { auth, db } = useProstgles();
  return (
    <>
      {auth?.user ?
        <div>
          Logged in as: <strong>{auth.user.type}</strong> {auth.user.id}
        </div>
      : <div>Not logged in</div>}
      <div>
        Available tables: <strong>{Object.keys(db).join(", ")}</strong>
      </div>
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
