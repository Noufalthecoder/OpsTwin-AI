"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Activity, ShieldCheck, Zap, AlertTriangle, Users, TrendingUp, BarChart3, Clock, DollarSign } from "lucide-react";

const KpiCard = ({ title, value, change, icon: Icon, color, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: "easeOut" }}
    className="p-6 rounded-3xl border border-white/10 bg-[#0a0a0c]/80 backdrop-blur-xl relative overflow-hidden group hover:border-white/20 transition-colors"
  >
    <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-20 ${color} group-hover:opacity-30 transition-opacity`} />
    
    <div className="flex items-start justify-between mb-8">
      <div className={`p-3 rounded-2xl bg-white/5 ${color.replace('bg-', 'text-')}`}>
        <Icon size={24} />
      </div>
      <div className={`text-sm font-semibold px-2.5 py-1 rounded-full ${change.startsWith('+') ? 'bg-green-500/10 text-green-400' : change.startsWith('-') ? 'bg-red-500/10 text-red-400' : 'bg-white/10 text-gray-400'}`}>
        {change}
      </div>
    </div>
    
    <div>
      <h3 className="text-gray-400 font-medium mb-1 text-sm">{title}</h3>
      <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
    </div>
  </motion.div>
);

export default function TwinPage() {
  const [metrics, setMetrics] = useState({
    healthScore: "92/100",
    automationIndex: "68%",
    complianceScore: "98.5%",
    riskScore: "Low",
    monthlySavings: "$142,500",
    avgTime: "1.2 Days"
  });

  useEffect(() => {
    async function fetchLatestMetrics() {
      try {
        const res = await fetch("http://localhost:8000/api/history");
        const history = await res.json();
        if (history && history.length > 0) {
          const latestRunId = history[0].id;
          const detailRes = await fetch(`http://localhost:8000/api/history/${latestRunId}`);
          const runData = await detailRes.json();

          let autoScore = 68;
          if (runData?.workflow?.insights?.automation_score) {
            autoScore = parseInt(runData.workflow.insights.automation_score);
          }
          
          let compScore = 98.5;
          let risk = "Low";
          if (runData?.compliance?.issues) {
            compScore = Math.max(0, 100 - (runData.compliance.issues.length * 5));
            risk = runData.compliance.issues.length > 2 ? "High" : runData.compliance.issues.length > 0 ? "Medium" : "Low";
          }

          let savings = 142500;
          if (runData?.optimization?.optimizations?.[0]?.estimated_impact?.cost_savings) {
            savings = parseInt(runData.optimization.optimizations[0].estimated_impact.cost_savings.replace(/[^0-9]/g, '')) || savings;
          }

          let delay = "1.2 Days";
          if (runData?.bottlenecks?.bottlenecks?.[0]?.estimated_delay) {
            delay = runData.bottlenecks.bottlenecks[0].estimated_delay;
          }

          setMetrics({
            healthScore: `${Math.round((autoScore + compScore)/2)}/100`,
            automationIndex: `${autoScore}%`,
            complianceScore: `${compScore}%`,
            riskScore: risk,
            monthlySavings: `$${savings.toLocaleString()}`,
            avgTime: delay
          });
        }
      } catch (err) {
        console.error("Failed to fetch real metrics", err);
      }
    }
    fetchLatestMetrics();
  }, []);

  return (
    <div className="p-4 md:p-8 pb-20 max-w-7xl mx-auto text-white">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-500" />
            Organizational Digital Twin
          </h1>
          <p className="text-gray-400">Live operational health, efficiency, and risk metrics across the enterprise.</p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm bg-white/5 px-4 py-2 rounded-full border border-white/10">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Live Sync Active
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard title="Org Health Score" value={metrics.healthScore} change="+2.4%" icon={Activity} color="bg-blue-500" delay={0.1} />
        <KpiCard title="Automation Index" value={metrics.automationIndex} change="+14.2%" icon={Zap} color="bg-yellow-500" delay={0.2} />
        <KpiCard title="Compliance Score" value={metrics.complianceScore} change="+0.1%" icon={ShieldCheck} color="bg-green-500" delay={0.3} />
        <KpiCard title="Risk Score" value={metrics.riskScore} change="-12%" icon={AlertTriangle} color={metrics.riskScore === 'High' ? 'bg-red-500' : metrics.riskScore === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'} delay={0.4} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Area */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 p-6 rounded-3xl border border-white/10 bg-[#0a0a0c]/80 backdrop-blur-xl h-96 flex flex-col"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Workflow Efficiency Trend
            </h3>
            <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-purple-500">
              <option>Last 30 Days</option>
              <option>This Quarter</option>
              <option>Year to Date</option>
            </select>
          </div>
          <div className="flex-1 border border-white/5 rounded-xl bg-white/[0.02] flex items-center justify-center relative overflow-hidden">
            {/* Mock Chart using CSS shapes */}
            <div className="absolute bottom-0 left-0 w-full h-[60%] bg-gradient-to-t from-purple-500/20 to-transparent" />
            <svg className="absolute w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              <path d="M0,80 Q10,70 20,75 T40,60 T60,50 T80,30 T100,10 L100,100 L0,100 Z" fill="rgba(168, 85, 247, 0.1)" />
              <path d="M0,80 Q10,70 20,75 T40,60 T60,50 T80,30 T100,10" fill="none" stroke="#a855f7" strokeWidth="2" />
            </svg>
          </div>
        </motion.div>

        {/* Secondary Metrics */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-6"
        >
          <div className="p-6 rounded-3xl border border-white/10 bg-gradient-to-br from-blue-900/20 to-indigo-900/10 backdrop-blur-xl h-[180px] flex flex-col justify-center relative overflow-hidden">
             <div className="absolute right-0 bottom-0 opacity-10 text-blue-500">
                <DollarSign className="w-32 h-32 -mr-6 -mb-6" />
             </div>
             <h3 className="text-blue-200 text-sm font-medium mb-1">Monthly Savings</h3>
             <div className="text-4xl font-bold text-white mb-2">{metrics.monthlySavings}</div>
             <div className="text-sm text-blue-300 flex items-center gap-1">
               <TrendingUp className="w-4 h-4" /> +18% vs last month
             </div>
          </div>
          
          <div className="p-6 rounded-3xl border border-white/10 bg-[#0a0a0c]/80 backdrop-blur-xl h-[180px] flex flex-col justify-center">
             <h3 className="text-gray-400 text-sm font-medium mb-1 flex items-center gap-2">
               <Clock className="w-4 h-4" /> Avg Processing Time
             </h3>
             <div className="text-3xl font-bold text-white mb-2">{metrics.avgTime}</div>
             <div className="text-sm text-green-400 flex items-center gap-1">
               -2.4 days faster
             </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
