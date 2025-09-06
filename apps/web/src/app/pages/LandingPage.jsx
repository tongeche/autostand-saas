import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage(){
  return (
    <div className="min-h-screen bg-[#eaf5ee]">
      {/* Top nav white bar */}

      <div className="bg-white">
        <nav className="w-full max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="text-2xl md:text-3xl font-bold tracking-tight">Leads<span className="text-primary">+</span></div>
          <div className="hidden md:flex items-center gap-6 text-base text-slate-700">
          <a href="#home" className="hover:text-primary">Home</a>
          <a href="#product" className="hover:text-primary">Product</a>
          <a href="#company" className="hover:text-primary">Company</a>
          <a href="#resources" className="hover:text-primary">Resources</a>
          <a href="#contact" className="hover:text-primary">Contact</a>
          </div>
          <div className="inline-flex items-center gap-2">
            <Link to="/login" className="hidden md:inline px-3 py-2 rounded-lg border bg-white text-base">Log In</Link>
            <Link to="/signup" className="hidden md:inline px-3 py-2 rounded-lg border bg-white text-base">Sign Up</Link>
            <Link to="/signup" className="px-3 py-2 rounded-full bg-[#205e4b] text-white text-base shadow">Book a demo</Link>
          </div>
        </nav>
      </div>

      {/* Hero */}
      <section className="w-full max-w-5xl mx-auto text-center px-4 md:px-6 py-10 md:py-16">
        <div className="text-sm text-[#205e4b] font-medium">From one startup to another</div>
        <h1 className="mt-2 text-5xl md:text-6xl font-extrabold leading-tight text-[#183d32]">
          Leads+ gives you a clear view of your pipeline
        </h1>
        <p className="mt-3 text-slate-700 md:text-lg">Less time on admin, more time closing deals. Manage leads, tasks, inventory and documents in one place.</p>
        <div className="mt-6 inline-flex gap-3">
          <Link to="/signup" className="px-5 py-3 rounded-full bg-[#205e4b] text-white text-sm shadow">Get started for free</Link>
          <a href="#features" className="px-5 py-3 rounded-full border border-[#205e4b]/30 bg-white text-sm text-[#205e4b]">Explore features</a>
        </div>
      </section>

      {/* Preview panel — replace with a large screenshot image */}
      <section className="px-4 md:px-6 pb-16">
        <div className="max-w-6xl mx-auto rounded-3xl shadow-lg bg-white/80 backdrop-blur p-2 md:p-3">
          <img
            src="/landing-screenshot.svg"
            alt="Leads+ app preview"
            className="w-full h-auto rounded-2xl border object-cover"
          />
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
