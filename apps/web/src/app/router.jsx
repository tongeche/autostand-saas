import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
const LeadsPage = React.lazy(()=>import("../features/leads/pages/LeadsPage.jsx"));
const TodosPage = React.lazy(()=>import("../features/todos/pages/TodosPage.jsx"));
const InventoryPage = React.lazy(()=>import("../features/inventory/pages/InventoryPage.jsx"));
const StickyWallPage = React.lazy(()=>import("../features/wall/pages/StickyWallPage.jsx"));
const CrmPage = React.lazy(()=>import("../features/crm/pages/CrmPage.jsx"));
const TemplatesPage = React.lazy(()=>import("../features/templates/pages/TemplatesPage.jsx"));
const BackendPage = React.lazy(()=>import("../features/backend/pages/BackendPage.jsx"));

export default function AppRoutes(){
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <Routes>
        <Route path="/" element={<Navigate to="/leads" replace />} />
        <Route path="/leads" element={<LeadsPage/>} />
        <Route path="/todos" element={<TodosPage/>} />
        <Route path="/inventory" element={<InventoryPage/>} />
        <Route path="/crm" element={<CrmPage/>} />
        <Route path="/templates" element={<TemplatesPage/>} />
        <Route path="/backend" element={<BackendPage/>} />
        <Route path="/wall" element={<StickyWallPage/>} />
        <Route path="*" element={<div className="p-6">Not found</div>} />
      </Routes>
    </Suspense>
  );
}
