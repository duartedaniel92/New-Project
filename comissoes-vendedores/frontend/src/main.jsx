import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { TemaProvider } from "./context/TemaContext.jsx";
import { aplicarTemaInicial } from "./context/temaContexto.js";
import "./index.css";

// antes do primeiro render: evita a página piscar na cor padrão
aplicarTemaInicial();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <TemaProvider>
        <App />
      </TemaProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
