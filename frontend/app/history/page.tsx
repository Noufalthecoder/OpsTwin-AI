"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, GitCommit, ArrowRight, RotateCcw, Check, FileText, Zap, Shield, Play, List, ArrowRightLeft } from "lucide-react";
import Link from "next/link";

export default function HistoryPage() {
  const [selectedVersion, setSelectedVersion] = useState("v3");

  const versions = [
    {
      id: "v3",
      tag: "v1.2.0 - Current",
      date: "Today, 09:45 AM",
      title: "AI Automation & Compliance Rules Added",
      author: "Lemma Optimizer Agent",
      metrics: { time: "-12h", cost: "-$45k", risk: "Low" },
      changes: [
        { type: "automate", text: "Automated Level 1 Invoice Verification using OCR." },
        { type: "compliance", text: "Added pre-screen compliance check before HR review." }
      ],
      active: true
    },
    {
      id: "v2",
      tag: "v1.1.0",
      date: "Yesterday, 14:30 PM",
      title: "Manual Approval Consolidation",
      author: "Enterprise User",
      metrics: { time: "-5h", cost: "-$12k", risk: "Medium" },
      changes: [
        { type: "remove", text: "Removed redundant Director approval step." },
        { type: "merge", text: "Merged HR and Finance onboarding forms." }
      ],
      active: false
    },
    {
      id: "v1",
      tag: "v1.0.0",
      date: "Oct 12, 2026, 09:00 AM",
      title: "Initial Workflow Discovery",
      author: "Lemma Discovery Agent",
      metrics: { time: "Baseline", cost: "Baseline", risk: "High" },
      changes: [
        { type: "create", text: "Workflow generated from uploaded standard operating procedure document." }
      ],
      active: false
    }
  ];

  return (
    <div className="p-4 md:p-8 pb-20 max-w-7xl mx-auto text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-2 flex items-center gap-3">
          <History className="w-8 h-8 text-blue-500" />
          Workflow Version History
        </h1>
        <p className="text-gray-400">Track optimizations, compare versions, and safely rollback changes.</p>
      </div>

      <div className="flex gap-2 mb-8 border-b border-white/10 pb-4">
        <Link href="/history" className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-medium flex items-center gap-2">
          <History size={16} /> Version History
        </Link>
        <Link href="/history/runs" className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <List size={16} /> All Pipeline Runs
        </Link>
        <Link href="/history/compare" className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <ArrowRightLeft size={16} /> Compare Runs
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Timeline */}
        <div className="lg:col-span-1 space-y-6 relative before:absolute before:inset-0 before:ml-[1.1rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-800 before:to-transparent">
          {versions.map((version, index) => {
            const isSelected = selectedVersion === version.id;
            return (
              <motion.div 
                key={version.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSelectedVersion(version.id)}
                className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active cursor-pointer`}
              >
                {/* Icon */}
                <div className={`flex items-center justify-center w-9 h-9 rounded-full border-4 border-[#050505] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 transition-colors ${
                  isSelected ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white"
                }`}>
                  <GitCommit size={14} />
                </div>
                
                {/* Card */}
                <div className={`w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border transition-all ${
                  isSelected ? "border-blue-500 bg-blue-900/10 shadow-[0_0_15px_rgba(59,130,246,0.1)]" : "border-white/10 bg-[#111] hover:bg-[#1a1a1a]"
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${version.active ? "bg-green-500/20 text-green-400" : "bg-white/10 text-gray-400"}`}>
                      {version.tag}
                    </span>
                    <span className="text-xs text-gray-500">{version.date}</span>
                  </div>
                  <h4 className={`font-semibold text-sm mb-1 ${isSelected ? "text-blue-100" : "text-gray-200"}`}>{version.title}</h4>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    By {version.author}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Version Details */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {versions.map((version) => {
              if (version.id !== selectedVersion) return null;
              return (
                <motion.div
                  key={version.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-6 rounded-3xl border border-white/10 bg-gradient-to-b from-[#111] to-[#050505] shadow-xl sticky top-6"
                >
                  <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-2xl font-bold text-white">{version.tag}</h2>
                        {version.active && (
                          <span className="flex items-center gap-1 text-xs font-medium text-green-400 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
                            <Check size={12} /> Currently Deployed
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400">{version.title}</p>
                    </div>
                    
                    {!version.active && (
                      <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-white/10 hover:border-white/20">
                        <RotateCcw size={14} />
                        Rollback to this version
                      </button>
                    )}
                    {version.active && (
                      <button className="flex items-center gap-2 bg-blue-600/20 text-blue-400 px-4 py-2 rounded-lg text-sm font-medium border border-blue-500/30 cursor-default">
                        <Play size={14} />
                        Live in Production
                      </button>
                    )}
                  </div>

                  {/* Impact Metrics */}
                  <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Version Impact</h4>
                  <div className="grid grid-cols-3 gap-4 mb-8">
                     <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                        <div className="text-xs text-gray-500 mb-1">Time Delta</div>
                        <div className={`text-xl font-bold ${version.metrics.time.startsWith('-') ? 'text-green-400' : 'text-white'}`}>{version.metrics.time}</div>
                     </div>
                     <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                        <div className="text-xs text-gray-500 mb-1">Cost Delta</div>
                        <div className={`text-xl font-bold ${version.metrics.cost.startsWith('-') ? 'text-green-400' : 'text-white'}`}>{version.metrics.cost}</div>
                     </div>
                     <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                        <div className="text-xs text-gray-500 mb-1">Compliance Risk</div>
                        <div className={`text-xl font-bold ${version.metrics.risk === 'Low' ? 'text-green-400' : version.metrics.risk === 'High' ? 'text-red-400' : 'text-yellow-400'}`}>{version.metrics.risk}</div>
                     </div>
                  </div>

                  {/* Changelog */}
                  <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Changelog</h4>
                  <div className="space-y-3">
                    {version.changes.map((change, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-white/5">
                        <div className="mt-0.5">
                          {change.type === 'automate' && <Zap size={16} className="text-yellow-400" />}
                          {change.type === 'compliance' && <Shield size={16} className="text-green-400" />}
                          {change.type === 'create' && <FileText size={16} className="text-blue-400" />}
                          {(change.type === 'remove' || change.type === 'merge') && <ArrowRight size={16} className="text-purple-400" />}
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed">{change.text}</p>
                      </div>
                    ))}
                  </div>

                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
