"use client";

import React, { useEffect, useState } from "react";
import { motion, useAnimation, useInView } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Cpu, TrendingDown, Clock, IndianRupee, Zap, Target } from "lucide-react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
}

function AnimatedCounter({ value, suffix = "", prefix = "" }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    const duration = 1500;
    
    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      
      // easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(Math.floor(easeProgress * value));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);

  return <span>{prefix}{displayValue}{suffix}</span>;
}

interface KPICardProps {
  title: string;
  currentValue?: number | string;
  optimizedValue: number | string;
  trend?: "up" | "down" | "neutral";
  reductionPct?: number;
  icon: React.ReactNode;
  suffix?: string;
  prefix?: string;
  colorScheme: "blue" | "emerald" | "amber" | "purple" | "rose" | "teal";
}

function KPICard({ title, currentValue, optimizedValue, trend, reductionPct, icon, suffix = "", prefix = "", colorScheme }: KPICardProps) {
  const isNumber = typeof optimizedValue === "number";

  const colorStyles = {
    blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-500 shadow-blue-500/10 hover:shadow-blue-500/20",
    emerald: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-500 shadow-emerald-500/10 hover:shadow-emerald-500/20",
    amber: "from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-500 shadow-amber-500/10 hover:shadow-amber-500/20",
    purple: "from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-500 shadow-purple-500/10 hover:shadow-purple-500/20",
    rose: "from-rose-500/20 to-rose-600/10 border-rose-500/30 text-rose-500 shadow-rose-500/10 hover:shadow-rose-500/20",
    teal: "from-teal-500/20 to-teal-600/10 border-teal-500/30 text-teal-500 shadow-teal-500/10 hover:shadow-teal-500/20",
  };

  const bgStyles = {
    blue: "bg-blue-500/10",
    emerald: "bg-emerald-500/10",
    amber: "bg-amber-500/10",
    purple: "bg-purple-500/10",
    rose: "bg-rose-500/10",
    teal: "bg-teal-500/10",
  };

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5 backdrop-blur-xl transition-all duration-300 flex flex-col justify-between h-full",
        "bg-white/60 dark:bg-slate-900/60 shadow-lg",
        colorStyles[colorScheme]
      )}
    >
      {/* Subtle Glow Background */}
      <div className={cn("absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl opacity-60", bgStyles[colorScheme])} />
      
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("p-2.5 rounded-xl backdrop-blur-md bg-white/50 dark:bg-slate-800/50", colorStyles[colorScheme].split(' ')[3])}>
          {icon}
        </div>
        <h4 className="font-semibold text-slate-700 dark:text-slate-300 tracking-tight">{title}</h4>
      </div>

      <div className="flex items-end justify-between">
        <div className="flex flex-col">
          {currentValue !== undefined && (
            <div className="flex items-center gap-2 mb-1 opacity-70">
              <span className="text-sm font-medium line-through text-slate-500">{currentValue}</span>
              <ArrowDownRight className="w-3 h-3 text-slate-400" />
            </div>
          )}
          <div className="flex items-baseline gap-1 mt-1">
            <span className={cn("font-bold text-slate-900 dark:text-white tracking-tight break-words",
              typeof optimizedValue === 'string' && optimizedValue.length > 20 ? "text-base leading-snug" : "text-3xl"
            )}>
              {isNumber ? <AnimatedCounter value={optimizedValue as number} prefix={prefix} suffix={suffix} /> : `${prefix}${optimizedValue}${suffix}`}
            </span>
          </div>
        </div>

        {reductionPct !== undefined && reductionPct > 0 && (
          <div className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold",
            trend === "down" ? "bg-emerald-100/80 text-emerald-700" : "bg-blue-100/80 text-blue-700"
          )}>
            {trend === "down" ? <TrendingDown className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
            {reductionPct}%
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function ExecutiveSummary({ optimization, originalStepsCount }: { optimization: any, originalStepsCount: number }) {
  // Parse numeric cost savings if possible
  let numericCost = 0;
  const costMatch = optimization.estimated_cost_saved.match(/(\d+[\.\d]*)/);
  if (costMatch) numericCost = parseFloat(costMatch[1]);
  const costUnit = optimization.estimated_cost_saved.replace(/[\d\.]/g, '').trim();

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
        <KPICard
          title="Workflow Steps"
          currentValue={originalStepsCount}
          optimizedValue={optimization.optimized_steps}
          reductionPct={optimization.step_reduction}
          trend="down"
          icon={<CheckCircle2 className="w-5 h-5" />}
          colorScheme="blue"
        />
        <KPICard
          title="Time Saved"
          optimizedValue={optimization.estimated_time_saved}
          icon={<Clock className="w-5 h-5" />}
          colorScheme="emerald"
        />
        <KPICard
          title="Cost Saved"
          optimizedValue={numericCost ? numericCost : optimization.estimated_cost_saved}
          suffix={numericCost ? ` ${costUnit}` : ""}
          icon={<IndianRupee className="w-5 h-5" />}
          colorScheme="amber"
        />
        <KPICard
          title="Automation Score"
          optimizedValue={optimization.automation_score}
          suffix="%"
          icon={<Cpu className="w-5 h-5" />}
          colorScheme="purple"
        />
        <KPICard
          title="Productivity Gain"
          optimizedValue={optimization.estimated_productivity_increase}
          suffix="%"
          icon={<Zap className="w-5 h-5" />}
          colorScheme="teal"
          trend="up"
          reductionPct={optimization.estimated_productivity_increase}
        />
        <KPICard
          title="Manual Work Reduced"
          optimizedValue={optimization.estimated_manual_work_reduction}
          suffix="%"
          icon={<Target className="w-5 h-5" />}
          colorScheme="rose"
        />
      </div>
    </div>
  );
}
