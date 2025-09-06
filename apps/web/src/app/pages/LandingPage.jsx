import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage(){
  return (
    <div className="min-h-screen bg-[#eaf5ee]">
      {/* Top nav */}
      <nav className="w-full max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
        <div className="text-xl md:text-2xl font-bold tracking-tight">Leads<span className="text-primary">+</span></div>
        <div className="hidden md:flex items-center gap-6 text-sm text-slate-700">
          <a href="#home" className="hover:text-primary">Home</a>
          <a href="#product" className="hover:text-primary">Product</a>
          <a href="#company" className="hover:text-primary">Company</a>
          <a href="#resources" className="hover:text-primary">Resources</a>
          <a href="#contact" className="hover:text-primary">Contact</a>
        </div>
        <div className="inline-flex items-center gap-2">
          <Link to="/login" className="hidden md:inline px-3 py-2 rounded-lg border bg-white text-sm">Log In</Link>
          <Link to="/signup" className="hidden md:inline px-3 py-2 rounded-lg border bg-white text-sm">Sign Up</Link>
          <Link to="/signup" className="px-3 py-2 rounded-full bg-[#205e4b] text-white text-sm shadow">Book a demo</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="w-full max-w-5xl mx-auto text-center px-4 md:px-6 py-10 md:py-16">
        <div className="text-sm text-[#205e4b] font-medium">From one startup to another</div>
        <h1 className="mt-2 text-4xl md:text-5xl font-extrabold leading-tight text-[#183d32]">
          Leads+ gives you a clear view of your pipeline
        </h1>
        <p className="mt-3 text-slate-700 md:text-lg">Less time on admin, more time closing deals. Manage leads, tasks, inventory and documents in one place.</p>
        <div className="mt-6 inline-flex gap-3">
          <Link to="/signup" className="px-5 py-3 rounded-full bg-[#205e4b] text-white text-sm shadow">Get started for free</Link>
          <a href="#features" className="px-5 py-3 rounded-full border border-[#205e4b]/30 bg-white text-sm text-[#205e4b]">Explore features</a>
        </div>
      </section>

      {/* Preview panel */}
      <section className="px-4 md:px-6 pb-16">
        <div className="max-w-6xl mx-auto rounded-3xl shadow-lg bg-white/80 backdrop-blur border p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* mini sidebar mock */}
            <aside className="md:col-span-1 bg-[#ecf5ef] rounded-2xl p-3">
              <div className="text-sm font-semibold mb-2">Leads+</div>
              <ul className="space-y-2 text-sm">
                <li className="rounded-lg bg-white px-3 py-2">Dashboard</li>
                <li className="rounded-lg px-3 py-2">Leads</li>
                <li className="rounded-lg px-3 py-2">Tasks</li>
                <li className="rounded-lg px-3 py-2">Inventory</li>
                <li className="rounded-lg px-3 py-2">Documents</li>
              </ul>
            </aside>
            {/* main cards mock */}
            <div className="md:col-span-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard title="New Leads" value="34" note="This week"/>
                <MetricCard title="Responses" value="65%" note="Rate"/>
                <MetricCard title="Tasks due" value="18" note="Today"/>
                <MetricCard title="Docs sent" value="7" note="This month"/>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="rounded-2xl border p-3">
                  <div className="text-sm font-medium mb-2">Recent Leads</div>
                  <ul className="text-sm space-y-2 text-slate-700">
                    <li className="flex items-center justify-between"><span>João Silva</span><span className="text-slate-500">2h ago</span></li>
                    <li className="flex items-center justify-between"><span>Ana Costa</span><span className="text-slate-500">5h ago</span></li>
                    <li className="flex items-center justify-between"><span>Diogo Lopes</span><span className="text-slate-500">Yesterday</span></li>
                  </ul>
                </div>
                <div className="rounded-2xl border p-3">
                  <div className="text-sm font-medium mb-2">Upcoming Tasks</div>
                  <ul className="text-sm space-y-2 text-slate-700">
                    <li className="flex items-center justify-between"><span>Send proposal</span><span className="text-slate-500">10:00</span></li>
                    <li className="flex items-center justify-between"><span>Call Ana</span><span className="text-slate-500">14:30</span></li>
                    <li className="flex items-center justify-between"><span>Upload photos</span><span className="text-slate-500">Tomorrow</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ title, value, note }){
  return (
    <div className="rounded-2xl border p-3 bg-white">
      <div className="text-xs text-slate-600">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-slate-500">{note}</div>
    </div>
  );
}
