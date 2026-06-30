"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRightLeft, Clock, DollarSign, Activity, FileText, CheckCircle2, AlertTriangle, ArrowRight, History, List } from "lucide-react";
import Link from "next/link";

export default function WorkflowComparePage() {
  const [runA, setRunA] = useState("RUN-9939");
  const [runB, setRunB] = useState("RUN-9942");

  const comparison = {
    A: {
      name: "Invoice Processing Baseline",
      steps: 12,
      time: "48h",
      cost: "$250,000",
      compliance: "94%",
      risk: "Medium",
      automation: "15%"
    },
    B: {
      name: "Invoice Processing Optimized",
      steps: 8,
      time: "12h",
      cost: "$165,000",
      compliance: "99%",
      risk: "Low",
      automation: "85%"
    },
    diff: {
      steps: -4,
      time: "-36h",
      cost: "-$85,000",
      compliance: "+5%",
      automation: "+70%"
    },
    changes: [
      { step: "Initial Review", action: "Automated via OCR", type: "positive" },
      { step: "Director Approval", action: "Removed (Redundant)", type: "positive" },
      { step: "Compliance Check", action: "AI Pre-Screening Added", type: "positive" },
      { step: "Manual Data Entry", action: "Replaced with API integration", type: "positive" }
    ]
  };

  return (
    <div className="p-4 md:p-8 pb-20 max-w-[1600px] mx-auto text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <ArrowRightLeft className="w-8 h-8 text-purple-500" />
          Workflow Comparison
        </h1>
        <p className="text-gray-400">Compare pipeline runs side-by-side to analyze ROI and architectural changes.</p>
      </div>

      <div className="flex gap-2 mb-8 border-b border-white/10 pb-4">
        <Link href="/history" className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <History size={16} /> Version History
        </Link>
        <Link href="/history/runs" className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <List size={16} /> All Pipeline Runs
        </Link>
        <Link href="/history/compare" className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-medium flex items-center gap-2">
          <ArrowRightLeft size={16} /> Compare Runs
        </Link>
      </div>

      {/* Selectors */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1 bg-[#0a0a0c]/80 border border-white/10 rounded-2xl p-4 flex items-center justify-between backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-white/5">
              <FileText className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">Run A (Baseline)</div>
              <select 
                value={runA} onChange={(e) => setRunA(e.target.value)}
                className="bg-transparent border-none text-white font-semibold text-lg outline-none cursor-pointer"
              >
                <option value="RUN-9939" className="bg-slate-900">RUN-9939 - Invoice Baseline</option>
              </select>
            </div>
          </div>
        </div>

        <div className="w-12 h-12 shrink-0 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
          <ArrowRightLeft size={20} />
        </div>

        <div className="flex-1 bg-[#0a0a0c]/80 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.1)] rounded-2xl p-4 flex items-center justify-between backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
              <Activity className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-xs text-purple-300/70 font-medium">Run B (Optimized)</div>
              <select 
                value={runB} onChange={(e) => setRunB(e.target.value)}
                className="bg-transparent border-none text-white font-semibold text-lg outline-none cursor-pointer"
              >
                <option value="RUN-9942" className="bg-slate-900">RUN-9942 - Invoice Optimized</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Run A Column */}
        <div className="p-6 rounded-3xl border border-white/10 bg-[#050505] opacity-80">
          <h3 className="text-xl font-bold mb-6 text-slate-300">{comparison.A.name}</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-white/5">
              <span className="text-gray-400">Total Steps</span>
              <span className="font-semibold text-lg">{comparison.A.steps}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-white/5">
              <span className="text-gray-400">Processing Time</span>
              <span className="font-semibold text-lg">{comparison.A.time}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-white/5">
              <span className="text-gray-400">Total Cost</span>
              <span className="font-semibold text-lg">{comparison.A.cost}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-white/5">
              <span className="text-gray-400">Automation Level</span>
              <span className="font-semibold text-lg">{comparison.A.automation}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-400">Compliance Risk</span>
              <span className="font-semibold text-yellow-500">{comparison.A.risk}</span>
            </div>
          </div>
        </div>

        {/* Diff Column */}
        <div className="flex flex-col items-center justify-center p-6 gap-6 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-transparent pointer-events-none rounded-3xl" />
          
          <div className="text-center w-full">
            <div className="text-xs text-purple-400 uppercase tracking-widest font-bold mb-2">Net Improvement</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20">
                <div className="text-xs text-green-400/70 mb-1">Time Saved</div>
                <div className="text-2xl font-bold text-green-400">{comparison.diff.time}</div>
              </div>
              <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20">
                <div className="text-xs text-green-400/70 mb-1">Cost Reduced</div>
                <div className="text-2xl font-bold text-green-400">{comparison.diff.cost}</div>
              </div>
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 col-span-2">
                <div className="text-xs text-blue-400/70 mb-1">Automation Increase</div>
                <div className="text-2xl font-bold text-blue-400">{comparison.diff.automation}</div>
              </div>
            </div>
          </div>
          
          <div className="w-full mt-4">
             <h4 className="text-sm font-semibold text-gray-400 mb-4 text-center">Architectural Changes</h4>
             <div className="space-y-3">
               {comparison.changes.map((change, i) => (
                 <div key={i} className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 border border-white/5">
                   <div className="text-xs text-gray-500 font-mono">{change.step}</div>
                   <div className="flex items-center gap-2 text-sm text-green-400 font-medium">
                     <ArrowRight size={14} /> {change.action}
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Run B Column */}
        <div className="p-6 rounded-3xl border border-purple-500/20 bg-gradient-to-b from-purple-900/10 to-[#050505] shadow-[0_0_30px_rgba(168,85,247,0.05)]">
          <h3 className="text-xl font-bold mb-6 text-purple-100">{comparison.B.name}</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-white/5">
              <span className="text-gray-400">Total Steps</span>
              <span className="font-semibold text-lg text-green-400 flex items-center gap-2">
                {comparison.B.steps} <span className="text-xs bg-green-500/20 px-1.5 py-0.5 rounded text-green-400">{comparison.diff.steps}</span>
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-white/5">
              <span className="text-gray-400">Processing Time</span>
              <span className="font-semibold text-lg text-green-400 flex items-center gap-2">
                {comparison.B.time} <span className="text-xs bg-green-500/20 px-1.5 py-0.5 rounded text-green-400">{comparison.diff.time}</span>
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-white/5">
              <span className="text-gray-400">Total Cost</span>
              <span className="font-semibold text-lg text-green-400 flex items-center gap-2">
                {comparison.B.cost} <span className="text-xs bg-green-500/20 px-1.5 py-0.5 rounded text-green-400">{comparison.diff.cost}</span>
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-white/5">
              <span className="text-gray-400">Automation Level</span>
              <span className="font-semibold text-lg text-blue-400 flex items-center gap-2">
                {comparison.B.automation} <span className="text-xs bg-blue-500/20 px-1.5 py-0.5 rounded text-blue-400">{comparison.diff.automation}</span>
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-400">Compliance Risk</span>
              <span className="font-semibold text-green-500 flex items-center gap-1">
                <CheckCircle2 size={16} /> {comparison.B.risk}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
