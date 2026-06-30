"use client";

import React from "react";
import { motion } from "framer-motion";
import { PieChart, LineChart as LineChartIcon, LayoutDashboard, Target, Download, Building2 } from "lucide-react";

export default function ExecutivePage() {
  return (
    <div className="p-4 md:p-8 pb-20 max-w-7xl mx-auto text-white">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-2 flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-blue-500" />
            Executive Overview
          </h1>
          <p className="text-gray-400">Boardroom-ready metrics, ROI trends, and department performance.</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="hidden md:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-800 shadow-xl border border-blue-500/30 text-center">
          <div className="text-blue-200 text-sm font-medium mb-1 uppercase tracking-wider">Total ROI</div>
          <div className="text-5xl font-bold mb-2">342%</div>
          <div className="text-blue-100 text-sm">YTD Performance</div>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-6 rounded-3xl bg-gradient-to-br from-indigo-600 to-indigo-800 shadow-xl border border-indigo-500/30 text-center">
          <div className="text-indigo-200 text-sm font-medium mb-1 uppercase tracking-wider">Total Savings</div>
          <div className="text-5xl font-bold mb-2">$2.1M</div>
          <div className="text-indigo-100 text-sm">Projected Annual</div>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-6 rounded-3xl bg-gradient-to-br from-purple-600 to-purple-800 shadow-xl border border-purple-500/30 text-center">
          <div className="text-purple-200 text-sm font-medium mb-1 uppercase tracking-wider">Manual Work %</div>
          <div className="text-5xl font-bold mb-2">14%</div>
          <div className="text-purple-100 text-sm">Down from 45%</div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl border border-white/10 bg-[#0a0a0c]/80 backdrop-blur-xl h-80 flex flex-col">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <LineChartIcon className="w-5 h-5 text-blue-400" />
            Quarterly Efficiency Growth
          </h3>
          <div className="flex-1 flex items-end gap-2 px-4 h-full pt-8">
            {[40, 55, 68, 85].map((val, i) => (
              <div key={i} className="flex-1 h-full flex flex-col items-center justify-end gap-2">
                <motion.div 
                  initial={{ height: "0%" }} animate={{ height: `${val}%` }} transition={{ delay: 0.3 + (i * 0.1), duration: 0.8 }}
                  className="w-full bg-blue-500/80 rounded-t-lg border-t border-blue-400 relative group"
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs py-1 px-2 rounded">
                    {val}%
                  </div>
                </motion.div>
                <div className="text-xs text-gray-400">Q{i+1}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-3xl border border-white/10 bg-[#0a0a0c]/80 backdrop-blur-xl h-80 flex flex-col">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            Department Heatmap
          </h3>
          <div className="flex-1 grid grid-cols-2 gap-4">
            {[
              { name: "Finance", score: 92, color: "bg-green-500/20 text-green-400 border-green-500/30" },
              { name: "HR", score: 68, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
              { name: "IT", score: 95, color: "bg-green-500/20 text-green-400 border-green-500/30" },
              { name: "Operations", score: 45, color: "bg-red-500/20 text-red-400 border-red-500/30" },
            ].map((dept, i) => (
               <div key={i} className={`rounded-xl border p-4 flex flex-col justify-center items-center text-center ${dept.color}`}>
                 <div className="text-sm font-medium mb-1 text-white">{dept.name}</div>
                 <div className="text-2xl font-bold">{dept.score}</div>
               </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
