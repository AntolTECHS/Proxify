// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // ✅ top-level router
import { AuthProvider } from "./context/AuthContext.jsx";
import App from "./App.jsx";
import "./index.css";

/* ✅ REQUIRED FOR LEAFLET */
import "leaflet/dist/leaflet.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App /> {/* ⚠️ App should NOT include another <BrowserRouter> */}
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);