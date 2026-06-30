"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scissors, Link, Cpu, ArrowRight, Zap, Info, Clock } from "lucide-react";
import type { WorkflowOptimizationData } from "./types";

export function OptimizationChanges({ optimization: initialO }: { optimization: WorkflowOptimizationData }) {
  const [activeTab, setActiveTab] = useState<"removed" | "merged" | "automated">("automated");
  const [o, setO] = useState(initialO);

  useEffect(() => {
    try {
      const deployed = JSON.parse(localStorage.getItem("deployed_scenarios") || "[]");
      if (deployed.length > 0) {
        const newO = JSON.parse(JSON.stringify(initialO)); // deep copy
        
        deployed.forEach((scenarioStr: string) => {
          const scenarios = scenarioStr.split(" + ");
          scenarios.forEach(scenario => {
            const s = scenario.toLowerCase();
            if (s.includes("remove")) {
              if (!newO.removed_steps.find((x: any) => x.step_title === scenario)) {
                newO.removed_steps.push({ step_title: scenario, reason: "Deployed via Simulator", impact: "Efficiency improved" });
              }
            } else if (s.includes("merge") || s.includes("combine")) {
              if (!newO.merged_steps.find((x: any) => x.new_step === scenario)) {
                newO.merged_steps.push({ original_steps: ["Multiple steps"], new_step: scenario, reason: "Deployed via Simulator" });
              }
            } else {
              if (!newO.automation_candidates.find((x: any) => x.step_title === scenario)) {
                newO.automation_candidates.push({ step_title: scenario, suggestion: "Automated via Simulator", time_saved: "Variable" });
              }
            }
          });
        });
        
        if (deployed.length > 0) {
          newO.executive_summary = "AI Executive Analysis updated to reflect deployed simulated scenarios and optimizations.";
        }
        
        setO(newO);
      } else {
        setO(initialO);
      }
    } catch (e) {
      setO(initialO);
    }
  }, [initialO]);

  const tabs = [
    { id: "automated", label: "Automated / Parallelized", icon: <Cpu className="w-4 h-4" />, count: o.automation_candidates.length },
    { id: "merged", label: "Merged Steps", icon: <Link className="w-4 h-4" />, count: o.merged_steps.length },
    { id: "removed", label: "Removed Steps", icon: <Scissors className="w-4 h-4" />, count: o.removed_steps.length },
  ] as const;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
      
      {/* TABS HEADER */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all
              ${activeTab === tab.id 
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md" 
                : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
          >
            {tab.icon}
            {tab.label}
            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* TABS CONTENT */}
      <div className="min-h-[250px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {activeTab === "automated" && (
              o.automation_candidates.length === 0 ? <p className="text-slate-500 italic p-4">No automation candidates.</p> :
              o.automation_candidates.map((a, i) => (
                <div key={i} className="group p-5 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-100 dark:border-blue-800/30 rounded-2xl hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">{a.step_title}</h4>
                    <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Saved: {a.time_saved}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-medium text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-800/50 p-3 rounded-xl">
                    <span className="opacity-50 line-through">Manual Step</span>
                    <ArrowRight className="w-4 h-4 text-blue-500" />
                    <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1"><Zap className="w-3 h-3"/> {a.suggestion}</span>
                  </div>
                </div>
              ))
            )}

            {activeTab === "merged" && (
              o.merged_steps.length === 0 ? <p className="text-slate-500 italic p-4">No merged steps.</p> :
              o.merged_steps.map((m, i) => (
                <div key={i} className="group p-5 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10 border border-amber-100 dark:border-amber-800/30 rounded-2xl hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex flex-col gap-1 text-sm font-medium text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-800/50 p-3 rounded-xl line-through opacity-70">
                      {m.original_steps.map((orig, idx) => <span key={idx}>{orig} {idx < m.original_steps.length - 1 && "+"}</span>)}
                    </div>
                    <ArrowRight className="w-5 h-5 text-amber-500 mt-2 mx-2 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200">{m.new_step}</h4>
                    </div>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-3 py-2 rounded-lg flex items-start gap-2">
                    <Info className="w-4 h-4 flex-shrink-0" /> {m.reason}
                  </p>
                </div>
              ))
            )}

            {activeTab === "removed" && (
              o.removed_steps.length === 0 ? <p className="text-slate-500 italic p-4">No removed steps.</p> :
              o.removed_steps.map((r, i) => (
                <div key={i} className="group p-5 bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-900/10 dark:to-red-900/10 border border-rose-100 dark:border-rose-800/30 rounded-2xl hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 line-through opacity-60">{r.step_title}</h4>
                    <span className="bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      {r.impact}
                    </span>
                  </div>
                  <p className="text-xs text-rose-700 dark:text-rose-400 bg-white/50 dark:bg-slate-800/50 px-3 py-2 rounded-lg flex items-start gap-2">
                    <Info className="w-4 h-4 flex-shrink-0" /> {r.reason}
                  </p>
                </div>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* AI EXPLAINABILITY COLLAPSIBLE */}
      <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-3 text-blue-600 dark:text-blue-400">
            <Cpu className="w-5 h-5" />
            <h4 className="font-bold text-sm uppercase tracking-widest">AI Executive Analysis</h4>
          </div>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
            {o.executive_summary}
          </p>
        </div>
      </div>
    </div>
  );
}
