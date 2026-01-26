import { getSerialisableError } from "prostgles-types";
import "./App.css";
import reactLogo from "./assets/react.svg";
import { useProstgles } from "./api/ProstglesProvider";
import viteLogo from "/vite.svg";

export const App = () => {
  const prglState = useProstgles();
  if (prglState.isLoading) {
    return <div>Loading Prostgles Client...</div>;
  }
  if (prglState.hasError) {
    return (
      <div>
        Error loading Prostgles Client:{" "}
        {JSON.stringify(getSerialisableError(prglState.error))}
      </div>
    );
  }
  return (
    <>
      {prglState.auth?.user ?
        <div>Logged in as: {prglState.auth.user.id}</div>
      : <div>Not logged in</div>}
      <div>Available tables: {Object.keys(prglState.dbo).join(", ")}</div>
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
