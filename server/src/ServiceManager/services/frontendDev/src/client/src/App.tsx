import { useProstgles } from "./api/ProstglesProvider";
import "./App.css";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";

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
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
};
