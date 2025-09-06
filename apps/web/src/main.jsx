import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import ThemeProvider from "./theme/ThemeProvider.jsx";
import Layout from "./app/Layout.jsx";
import Dashboard from "./app/pages/Dashboard.jsx";
import Stub from "./app/pages/Stub.jsx"; // keep if you want the simple page for others
import LeadsPage from "./features/leads/pages/LeadsPage.jsx";
import TodosPage from "./features/todos/pages/TodosPage.jsx";
import StickyWallPage from "./features/wall/pages/StickyWallPage.jsx";
import InventoryPage from "./features/inventory/pages/InventoryPage.jsx";
import CalendarPage from "./features/calendar/pages/CalendarPage.jsx";
import LoginPage from "./features/auth/pages/LoginPage.jsx";
import SignupPage from "./features/auth/pages/SignupPage.jsx";
import OnboardWizard from "./features/auth/pages/OnboardWizard.jsx";
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"  element={<Dashboard />} />
            <Route path="login"      element={<LoginPage />} />
            <Route path="signup"     element={<SignupPage />} />
            <Route path="onboard"    element={<OnboardWizard />} />
            <Route path="leads" element={<LeadsPage />} /> 
            <Route path="todos"      element={<TodosPage />} />
            <Route path="inventory"  element={<InventoryPage />} />
            <Route path="calendar"   element={<CalendarPage />} />
            <Route path="wall"       element={<StickyWallPage />} />
            <Route path="leads" element={<LeadsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
