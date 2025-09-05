import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import ThemeProvider from "./theme/ThemeProvider.jsx";
import Layout from "./app/Layout.jsx";
import Dashboard from "./app/pages/Dashboard.jsx";
import Stub from "./app/pages/Stub.jsx"; // keep if you want the simple page for others
import LeadsPage from "./features/leads/pages/LeadsPage.jsx";
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"  element={<Dashboard />} />
            <Route path="leads" element={<LeadsPage />} /> 
            <Route path="todos"      element={<Stub title="Tasks" />} />
            <Route path="inventory"  element={<Stub title="Inventory" />} />
            <Route path="wall"       element={<Stub title="Sticky Wall" />} />
            <Route path="leads" element={<LeadsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
