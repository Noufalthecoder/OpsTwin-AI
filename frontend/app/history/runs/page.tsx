"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, Play, CheckCircle2, AlertCircle, FileText, Activity, History, List, ArrowRightLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PipelineHistoryPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const runs = [
    { id: "RUN-9942", name: "Invoice Processing Q3", doc: "SOP_Invoice_V2.pdf", execTime: "45.2s", procTime: "4.2s", provider: "Gemini", automation: "85%", roi: "+22%", status: "success" },
    { id: "RUN-9941", name: "HR Onboarding", doc: "Employee_Handbook.pdf", execTime: "12.8s", procTime: "1.5s", provider: "Lemma", automation: "60%", roi: "+15%", status: "success" },
    { id: "RUN-9940", name: "Vendor Compliance", doc: "Vendor_Policy.pdf", execTime: "3.4s", procTime: "-", provider: "Groq (Fallback)", automation: "-", roi: "-", status: "failed" },
    { id: "RUN-9939", name: "IT Ticket Triage", doc: "IT_Support_SLA.docx", execTime: "28.5s", procTime: "2.8s", provider: "Gemini", automation: "92%", roi: "+45%", status: "success" },
  ];

  return (
    <div className="p-4 md:p-8 pb-20 max-w-[1600px] mx-auto text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Activity className="w-8 h-8 text-blue-500" />
          Pipeline Execution History
        </h1>
        <p className="text-gray-400">Search, filter, and review every workflow orchestration run.</p>
      </div>

      <div className="flex gap-2 mb-8 border-b border-white/10 pb-4">
        <Link href="/history" className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <History size={16} /> Version History
        </Link>
        <Link href="/history/runs" className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-medium flex items-center gap-2">
          <List size={16} /> All Pipeline Runs
        </Link>
        <Link href="/history/compare" className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <ArrowRightLeft size={16} /> Compare Runs
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search by Run ID, Workflow Name, or Document..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-3 bg-[#0a0a0c] border border-white/10 rounded-xl hover:bg-white/5 transition-colors">
          <Filter size={18} /> Filters
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0a0a0c]/80 backdrop-blur-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 border-b border-white/10 text-gray-400 uppercase tracking-wider text-xs font-semibold">
            <tr>
              <th className="px-6 py-4">Run ID</th>
              <th className="px-6 py-4">Workflow Name</th>
              <th className="px-6 py-4">Document</th>
              <th className="px-6 py-4">Provider</th>
              <th className="px-6 py-4">Execution Time</th>
              <th className="px-6 py-4">Automation</th>
              <th className="px-6 py-4">ROI</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {runs.map((run, i) => (
              <motion.tr 
                key={run.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="hover:bg-white/[0.02] transition-colors group"
              >
                <td className="px-6 py-4 font-mono text-blue-400">{run.id}</td>
                <td className="px-6 py-4 font-medium">{run.name}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-gray-300">
                    <FileText size={14} className="text-gray-500" /> {run.doc}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-400">{run.provider}</td>
                <td className="px-6 py-4 font-mono text-gray-300">{run.execTime}</td>
                <td className="px-6 py-4 text-green-400">{run.automation}</td>
                <td className="px-6 py-4 text-green-400 font-medium">{run.roi}</td>
                <td className="px-6 py-4">
                  {run.status === 'success' ? (
                    <span className="flex items-center gap-1.5 text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full text-xs font-medium border border-green-400/20 w-fit">
                      <CheckCircle2 size={12} /> Success
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-red-400 bg-red-400/10 px-2.5 py-1 rounded-full text-xs font-medium border border-red-400/20 w-fit">
                      <AlertCircle size={12} /> Failed
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => router.push('/upload')} 
                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs font-medium transition-all"
                  >
                    <Play size={12} fill="currentColor" /> Open Analysis
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
