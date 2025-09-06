import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage(){
  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div className="text-2xl font-bold">AutoStand</div>
          <div className="inline-flex gap-2">
            <Link to="/login" className="px-3 py-2 rounded-lg border bg-white text-sm">Sign in</Link>
            <Link to="/signup" className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm">Sign up</Link>
          </div>
        </header>
        <section className="grid md:grid-cols-2 gap-6 items-center">
          <div>
            <h1 className="text-3xl font-semibold mb-2">Sell smarter with one workspace</h1>
            <p className="text-slate-600">Leads, tasks, inventory and documents in one place. Start free and invite your team.</p>
            <div className="mt-4 inline-flex gap-2">
              <Link to="/signup" className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm">Get started</Link>
              <a href="#shots" className="px-4 py-2 rounded-lg border bg-white text-sm">See screenshots</a>
            </div>
          </div>
          <div className="rounded-2xl border bg-white p-3 shadow-sm">
            <div className="text-sm text-slate-600">Dashboard preview</div>
            <div className="h-48 bg-slate-100 rounded-lg"/>
          </div>
        </section>
        <section id="shots" className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl border bg-white p-3 shadow-sm h-56"/>
          <div className="rounded-2xl border bg-white p-3 shadow-sm h-56"/>
          <div className="rounded-2xl border bg-white p-3 shadow-sm h-56"/>
        </section>
      </div>
    </div>
  );
}

