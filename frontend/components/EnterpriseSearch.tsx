"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FileText, Users, Building, Activity, Zap, MessageSquare, Terminal, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function EnterpriseSearch({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open logic is handled by parent, this just catches if already open to close it
        }
      }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const categories = [
    { name: "Documents", icon: FileText, color: "text-blue-400" },
    { name: "Actors", icon: Users, color: "text-green-400" },
    { name: "Departments", icon: Building, color: "text-purple-400" },
    { name: "Workflows", icon: Activity, color: "text-orange-400" },
    { name: "Recommendations", icon: Zap, color: "text-yellow-400" },
  ];

  const results = query.length > 1 ? [
    { type: "Documents", title: "Standard Operating Procedure Q3", desc: "Uploaded by Enterprise User" },
    { type: "Actors", title: "HR Manager", desc: "Found in 3 active workflows" },
    { type: "Workflows", title: "Invoice Approval Pipeline", desc: "Currently optimized at 92%" },
    { type: "Recommendations", title: "Automate Invoice Verification", desc: "Estimated savings: $85,000/yr" }
  ] : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#050505]/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl bg-[#0F1015] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Search Input */}
            <div className="flex items-center px-4 py-4 border-b border-white/10 bg-[#16181D]">
              <Search className="w-5 h-5 text-gray-400 mr-3" />
              <input
                autoFocus
                type="text"
                placeholder="Search across OpsTwin AI (Documents, Workflows, People...)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-white text-lg placeholder:text-gray-500 font-medium"
              />
              <div className="flex items-center gap-1 text-xs font-mono text-gray-500 bg-black/20 px-2 py-1 rounded">
                <span>ESC</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {query.length === 0 ? (
                <div className="p-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Search Filters</div>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat, i) => (
                      <button key={i} onClick={() => setQuery(cat.name + ": ")} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors">
                        <cat.icon size={14} className={cat.color} />
                        <span className="text-sm text-gray-300">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : results.length > 0 ? (
                <div className="py-2">
                  <div className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Results</div>
                  <div className="space-y-1">
                    {results.map((res, i) => {
                      const CatIcon = categories.find(c => c.name === res.type)?.icon || FileText;
                      const catColor = categories.find(c => c.name === res.type)?.color || "text-gray-400";
                      return (
                        <button 
                          key={i} 
                          onClick={() => { onClose(); router.push('/upload'); }}
                          className="w-full flex items-center justify-between p-3 px-4 hover:bg-blue-600/10 hover:border-l-2 hover:border-blue-500 border-l-2 border-transparent transition-all group text-left"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg bg-white/5 ${catColor}`}>
                              <CatIcon size={16} />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white mb-0.5 group-hover:text-blue-400 transition-colors">{res.title}</div>
                              <div className="text-xs text-gray-500">{res.desc}</div>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-gray-600 group-hover:text-blue-400 transition-colors" />
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Terminal className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <div className="text-gray-400 font-medium">No results found for "{query}"</div>
                  <div className="text-gray-500 text-sm mt-1">Try searching for a department, document name, or workflow step.</div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
