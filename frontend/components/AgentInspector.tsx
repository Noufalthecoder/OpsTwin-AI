import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Server, Cpu, Clock, Zap, Database, Hash, CheckCircle2, AlertCircle } from "lucide-react";

interface AgentData {
  id: string;
  name: string;
  provider: string;
  status: string;
  time: string;
  tokens: string | number;
  confidence?: number;
  model?: string;
  error?: string;
  [key: string]: any;
}

interface AgentInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  agent: AgentData | null;
}

export default function AgentInspector({ isOpen, onClose, agent }: AgentInspectorProps) {
  return (
    <AnimatePresence>
      {isOpen && agent && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          
          {/* Side Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-[450px] bg-[#0f1115] border-l border-white/10 z-50 overflow-y-auto shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#0f1115]/90 backdrop-blur-xl z-10">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${agent.status === 'Completed' ? 'bg-green-500/10 text-green-400' : agent.status === 'Running' ? 'bg-blue-500/10 text-blue-400' : agent.status === 'Error' ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                  <Server size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{agent.name}</h2>
                  <div className="flex items-center gap-2 mt-1 text-xs font-mono">
                    <span className={`px-2 py-0.5 rounded-sm border ${agent.status === 'Completed' ? 'bg-green-500/10 border-green-500/30 text-green-400' : agent.status === 'Running' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : agent.status === 'Error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                      {agent.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 flex-1">
              {/* Primary Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-2 uppercase tracking-wider">
                    <Cpu size={14} /> Provider
                  </div>
                  <div className="text-sm font-semibold text-white">{agent.provider}</div>
                  <div className="text-xs text-gray-400 mt-1">{agent.model || "Primary Model"}</div>
                </div>
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-2 uppercase tracking-wider">
                    <Clock size={14} /> Execution Time
                  </div>
                  <div className="text-sm font-mono text-white">{agent.time !== "-" ? agent.time : "In Progress"}</div>
                </div>
              </div>

              {/* Token Usage */}
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-3 text-gray-400">
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                    <Hash size={16} />
                  </div>
                  <span className="text-sm">Tokens Processed</span>
                </div>
                <div className="text-lg font-mono font-bold text-white">{agent.tokens}</div>
              </div>

              {/* Error State */}
              {agent.error && (
                <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10">
                  <div className="flex items-center gap-2 text-red-400 font-semibold mb-2 text-sm">
                    <AlertCircle size={16} /> Execution Error
                  </div>
                  <p className="text-xs text-red-300 font-mono break-words">{agent.error}</p>
                </div>
              )}

              {/* Confidence & Explainability (If Available) */}
              {agent.confidence && (
                <div className="p-4 rounded-xl border border-white/5 bg-gradient-to-br from-green-500/5 to-transparent">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
                      <CheckCircle2 size={16} /> AI Confidence
                    </div>
                    <div className="text-lg font-bold text-green-400">{agent.confidence}%</div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${agent.confidence}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                    />
                  </div>
                </div>
              )}

              {/* Raw Telemetry */}
              <div className="mt-8">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Database size={14} /> Raw Telemetry
                </h3>
                <div className="p-4 rounded-xl border border-white/5 bg-[#0a0a0c] overflow-x-auto">
                  <pre className="text-[10px] text-gray-400 font-mono whitespace-pre-wrap">
                    {JSON.stringify(agent, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
            
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
