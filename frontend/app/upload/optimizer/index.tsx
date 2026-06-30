"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import type { OptimizerProps } from "./types";
import { ExecutiveSummary } from "./ExecutiveSummary";
import { InteractiveGraph } from "./InteractiveGraph";
import { OptimizationChanges } from "./OptimizationChanges";
import { OptimizationTimeline } from "./OptimizationTimeline";
import { AskWorkflow } from "./AskWorkflow";
import { ExportCenter } from "./ExportCenter";

export default function AIWorkflowPlayground({ optimization, originalWorkflow }: OptimizerProps) {
  return (
    <div className="bg-slate-50 dark:bg-slate-950 p-6 md:p-10 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-12 shadow-sm animate-in fade-in duration-700 font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col items-center text-center space-y-4 max-w-3xl mx-auto mb-4">
        <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm">
          <Sparkles className="w-4 h-4" /> AI Workflow Playground
        </div>
        <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Optimization Center
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
          Simulate, compare, and apply AI-driven workflow improvements. We&apos;ve eliminated redundancies and automated steps to maximize business ROI.
        </p>
      </div>

      {/* 1. EXECUTIVE SUMMARY */}
      <ExecutiveSummary optimization={optimization} originalStepsCount={originalWorkflow.steps.length} />

      {/* 2 & 3. INTERACTIVE BEFORE VS AFTER (PLAYGROUND) */}
      <InteractiveGraph optimization={optimization} originalWorkflow={originalWorkflow} />

      {/* 4 & 5. OPTIMIZATION CHANGES (Tabs) */}
      <OptimizationChanges optimization={optimization} />

      {/* 6. IMPLEMENTATION ROADMAP */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
        <div className="mb-8">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Deployment Roadmap</h3>
          <p className="text-sm text-slate-500 mt-1">Recommended phases to fully implement the AI optimization plan.</p>
        </div>
        <OptimizationTimeline plan={optimization.implementation_plan} />
      </div>

      {/* 7 & 8. ASK WORKFLOW & EXPORT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AskWorkflow workflow={originalWorkflow} optimization={optimization} />
        <div className="flex flex-col gap-8 h-full">
          <ExportCenter optimization={optimization} originalWorkflow={originalWorkflow} />
        </div>
      </div>
    </div>
  );
}
