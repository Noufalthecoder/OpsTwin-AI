"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, CircleDashed } from "lucide-react";
import type { ImplementationPhase } from "./types";

export function OptimizationTimeline({ plan }: { plan: ImplementationPhase[] }) {
  if (!plan || plan.length === 0) {
    return <p className="text-sm text-slate-500 italic">No implementation plan available.</p>;
  }

  return (
    <div className="relative">
      {/* Background Line */}
      <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-slate-200 dark:bg-slate-800" />
      
      <div className="space-y-6">
        {plan.map((phase, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="relative flex gap-6"
          >
            {/* Timeline Icon / Node */}
            <div className="relative z-10 w-16 flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border-2 border-blue-500 shadow-lg shadow-blue-500/20 flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">W{i+1}</span>
              </div>
              {i < plan.length - 1 && (
                <div className="w-0.5 h-full bg-blue-200 dark:bg-blue-900/30 mt-2" />
              )}
            </div>

            {/* Content Card */}
            <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">{phase.phase_name}</h4>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{phase.title}</h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                    <Clock className="w-4 h-4" />
                    {phase.duration}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4" />
                    100%
                  </div>
                </div>
              </div>
              
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
                {phase.description}
              </p>

              {/* Progress bar mock */}
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: "100%" }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 1 }}
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full" 
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
