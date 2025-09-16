import React from "react";
import { useNavigate } from "react-router-dom";
import { FiUsers, FiUserPlus, FiBriefcase } from "react-icons/fi";

export default function CrmPage(){
  const navigate = useNavigate();
  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xl font-semibold">CRM</div>
          <div className="text-sm text-slate-600">Pipeline of leads, clients and partners (front-end preview)</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card icon={<FiUsers/>} title="Leads" desc="Manage your pipeline" actionLabel="Open" onClick={()=> navigate('/leads')} />
        <Card icon={<FiUserPlus/>} title="Clients" desc="Customer records (coming soon)" disabled />
        <Card icon={<FiBriefcase/>} title="Partners" desc="Suppliers and partners (coming soon)" disabled />
      </div>
    </div>
  );
}

function Card({ icon, title, desc, actionLabel='Open', onClick, disabled=false }){
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-4 ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2 text-slate-700"><span className="text-slate-500">{icon}</span><span className="font-medium">{title}</span></div>
      <div className="text-sm text-slate-600 mt-1">{desc}</div>
      <div className="mt-3">
        <button className="px-3 py-2 rounded-lg border bg-white text-sm" onClick={!disabled ? onClick : undefined} disabled={disabled}>{actionLabel}</button>
      </div>
    </div>
  );
}
