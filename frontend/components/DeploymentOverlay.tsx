"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle, Loader2, ArrowRight, Activity, 
  GitBranch, Database, Presentation, Zap, 
  Cpu, FileText, X, TerminalSquare
} from "lucide-react";

interface DeploymentOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  scenarioName: string;
  scenarios: string[];
  metrics: {
    timeSaved: number;
    costSaved: number;
  };
}

const SYSTEM_UPDATES = [
  { id: "history", label: "v1.3.0 Created", icon: GitBranch },
  { id: "exec", label: "Executive Dashboard", icon: Presentation },
  { id: "twin", label: "Digital Twin", icon: Database },
  { id: "status", label: "Recommendations", icon: CheckCircle },
  { id: "graph", label: "Workflow Graph", icon: Activity },
  { id: "kg", label: "Knowledge Graph", icon: Database },
  { id: "copilot", label: "Copilot Memory", icon: Cpu }
];

interface LogEntry {
  id: string;
  time: string;
  message: string;
}

export default function DeploymentOverlay({
  isOpen,
  onClose,
  scenarioName,
  scenarios,
  metrics
}: DeploymentOverlayProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<"deploying" | "success" | "updating">("deploying");
  const [progress, setProgress] = useState(0);
  const [currentAgent, setCurrentAgent] = useState("Initializing...");
  const [currentTask, setCurrentTask] = useState("Preparing deployment...");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentUpdateIndex, setCurrentUpdateIndex] = useState(-1);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Reset state and trigger deployment when opened
  useEffect(() => {
    if (isOpen) {
      setPhase("deploying");
      setProgress(0);
      setCurrentAgent("Initializing...");
      setCurrentTask("Preparing deployment...");
      setLogs([]);
      setCurrentUpdateIndex(-1);

      // Start deployment fetch
      const startDeployment = async () => {
        try {
          const response = await fetch("http://localhost:8000/deployment/deploy", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              scenarios: scenarios,
              time_saved: metrics.timeSaved,
              cost_saved: metrics.costSaved,
              optimization_name: scenarioName
            })
          });

          if (!response.body) throw new Error("No response body");

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // Process SSE chunks
            const parts = buffer.split("\n\n");
            buffer = parts.pop() || ""; // Keep the last incomplete part in the buffer

            for (const part of parts) {
              if (part.startsWith("data: ")) {
                try {
                  const data = JSON.parse(part.replace("data: ", ""));
                  
                  if (data.type === "agent") {
                    setCurrentAgent(data.name);
                    setCurrentTask(data.task);
                  } else if (data.type === "log") {
                    const now = new Date();
                    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
                    setLogs(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), time: timeString, message: data.message }]);
                    setProgress(data.progress);
                  } else if (data.type === "complete") {
                    setProgress(100);
                    
                    // Store deployed scenarios for OptimizationChanges to pick up
                    try {
                      const existing = JSON.parse(localStorage.getItem("deployed_scenarios") || "[]");
                      const newScenarios = [...existing, scenarioName];
                      localStorage.setItem("deployed_scenarios", JSON.stringify(newScenarios));
                    } catch (err) {}

                    setTimeout(() => setPhase("success"), 800);
                  }
                } catch (e) {
                  console.error("Error parsing SSE data", e);
                }
              }
            }
          }
        } catch (e) {
          console.error("Deployment failed", e);
        }
      };

      startDeployment();
    }
  }, [isOpen]); // only trigger on open

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Transition from Success to Updating Systems
  useEffect(() => {
    if (phase === "success") {
      const timer = setTimeout(() => {
        setPhase("updating");
        setCurrentUpdateIndex(0);
      }, 2000); 
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // System Updates Animation
  useEffect(() => {
    if (phase === "updating" && currentUpdateIndex < SYSTEM_UPDATES.length) {
      const timer = setTimeout(() => {
        setCurrentUpdateIndex(prev => prev + 1);
      }, 500); 
      return () => clearTimeout(timer);
    }
  }, [phase, currentUpdateIndex]);


  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 md:p-8"
      >
        <div className="max-w-6xl w-full h-full max-h-[90vh] flex flex-col relative">
          
          {/* Header */}
          <div className="text-center mb-8 shrink-0">
            <h2 className="text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3">
              {phase === "deploying" ? (
                <>Deploying Optimization<span className="animate-pulse">...</span></>
              ) : (
                <span className="text-green-400 flex items-center gap-3"><CheckCircle className="w-10 h-10" /> Deployment Successful</span>
              )}
            </h2>
            {phase === "deploying" && (
              <div className="flex justify-center items-center gap-6 text-sm">
                <div className="flex flex-col text-right">
                  <span className="text-slate-500">Current Version</span>
                  <span className="text-slate-300 font-mono">v1.2.0</span>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-600" />
                <div className="flex flex-col text-left">
                  <span className="text-slate-500">Target Version</span>
                  <span className="text-blue-400 font-mono font-bold">v1.3.0</span>
                </div>
                <div className="w-px h-8 bg-white/10 mx-2"></div>
                <div className="flex flex-col text-left">
                  <span className="text-slate-500">Optimization Selected</span>
                  <span className="text-white font-medium">{scenarioName || "Automate Invoice Verification"}</span>
                </div>
                <div className="w-px h-8 bg-white/10 mx-2"></div>
                <div className="flex flex-col text-left">
                  <span className="text-slate-500">Estimated Time</span>
                  <span className="text-white font-medium">8 seconds</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative flex-1 flex flex-col">
            
            {/* Deploying Phase */}
            {phase === "deploying" && (
              <div className="flex flex-col md:flex-row h-full">
                
                {/* Left Side: Agent Execution & Progress */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex-1 p-8 md:p-12 border-r border-white/5 flex flex-col justify-center"
                >
                  <div className="mb-12">
                    <div className="flex items-end justify-between mb-4">
                      <span className="text-slate-400 font-mono text-sm uppercase tracking-wider">Overall Progress</span>
                      <span className="text-blue-400 font-mono text-3xl font-bold">{progress}%</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden shadow-inner">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-400"
                        animate={{ width: `${progress}%` }}
                        transition={{ ease: "linear", duration: 0.5 }}
                      />
                    </div>
                  </div>

                  <div className="bg-black/50 border border-white/10 rounded-2xl p-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
                    
                    <div className="flex items-center gap-4 text-blue-400 font-bold text-2xl mb-6">
                      <div className="p-3 bg-blue-500/20 rounded-xl">
                        <Zap className="w-8 h-8 animate-pulse" fill="currentColor" />
                      </div>
                      {currentAgent}
                    </div>
                    
                    <div className="space-y-4">
                      <div className="text-sm text-slate-500 font-mono uppercase tracking-wider">Status</div>
                      <div className="flex items-center gap-4 text-xl text-white font-medium">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                        {currentTask}
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Right Side: Live Log Terminal */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="w-full md:w-[450px] bg-[#050505] p-6 flex flex-col font-mono text-sm relative"
                >
                  <div className="flex items-center gap-3 text-slate-500 mb-6 pb-4 border-b border-white/5">
                    <TerminalSquare className="w-5 h-5" />
                    <span className="uppercase tracking-widest text-xs font-bold">Deployment Logs</span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                    {logs.map((log) => (
                      <motion.div 
                        key={log.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-3 text-slate-300"
                      >
                        <span className="text-slate-600 shrink-0">[{log.time}]</span>
                        <span className="flex-1">{log.message}</span>
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      </motion.div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                </motion.div>

              </div>
            )}

            {/* Success & Updating Phase */}
            {(phase === "success" || phase === "updating") && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 md:p-16 h-full flex flex-col"
              >
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12 flex-1">
                  <div className="bg-gradient-to-br from-[#151515] to-black border border-white/10 rounded-2xl p-8 flex flex-col justify-center items-center shadow-lg relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="text-slate-400 text-sm mb-3 uppercase tracking-wider font-mono">Time Saved</div>
                    <div className="text-5xl font-bold text-white mb-2">{Math.abs(metrics.timeSaved)}<span className="text-2xl text-slate-500">h</span></div>
                  </div>
                  <div className="bg-gradient-to-br from-[#151515] to-black border border-green-500/20 rounded-2xl p-8 flex flex-col justify-center items-center shadow-lg shadow-green-900/20 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="text-slate-400 text-sm mb-3 uppercase tracking-wider font-mono">Annual Savings</div>
                    <div className="text-5xl font-bold text-green-400 mb-2">${metrics.costSaved.toLocaleString('en-US')}</div>
                  </div>
                  <div className="bg-gradient-to-br from-[#151515] to-black border border-white/10 rounded-2xl p-8 flex flex-col justify-center items-center shadow-lg relative overflow-hidden group">
                    <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="text-slate-400 text-sm mb-3 uppercase tracking-wider font-mono">Automation Score</div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 line-through text-2xl font-light">68%</span>
                      <ArrowRight className="w-6 h-6 text-purple-500" />
                      <span className="text-5xl font-bold text-white">82%</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-[#151515] to-black border border-blue-500/20 rounded-2xl p-8 flex flex-col justify-center items-center shadow-lg shadow-blue-900/20 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="text-slate-400 text-sm mb-3 uppercase tracking-wider font-mono">ROI</div>
                    <div className="text-5xl font-bold text-blue-400 mb-2">98.2<span className="text-3xl">%</span></div>
                  </div>
                </div>

                {/* System Evolution Sequence */}
                <div className="mb-12 bg-black/40 border border-white/5 rounded-2xl p-8 shrink-0">
                  <div className="text-sm font-mono text-slate-400 mb-6 text-center uppercase tracking-widest flex items-center justify-center gap-3">
                    <Activity className="w-4 h-4 text-blue-500" /> Automatic Platform Evolution
                  </div>
                  <div className="flex flex-wrap justify-center gap-4">
                    {SYSTEM_UPDATES.map((update, idx) => {
                      const isComplete = currentUpdateIndex > idx;
                      const isCurrent = currentUpdateIndex === idx;
                      const isPending = currentUpdateIndex < idx;
                      
                      return (
                        <motion.div
                          key={update.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ 
                            opacity: isPending ? 0.4 : 1, 
                            y: 0,
                            scale: isCurrent ? 1.05 : 1
                          }}
                          className={`flex items-center gap-3 px-5 py-3 rounded-xl border text-sm font-medium transition-all duration-500 ${
                            isComplete 
                              ? "bg-green-500/10 border-green-500/30 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.1)]" 
                              : isCurrent
                              ? "bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.25)] ring-1 ring-blue-500/50"
                              : "bg-[#111] border-white/5 text-slate-500"
                          }`}
                        >
                          <update.icon className={`w-4 h-4 ${isCurrent ? "animate-pulse text-blue-400" : ""}`} />
                          {update.label}
                          {isComplete && <CheckCircle className="w-4 h-4 text-green-500 ml-1" />}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Post Deployment Actions */}
                {currentUpdateIndex >= SYSTEM_UPDATES.length && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-wrap items-center justify-center gap-4 pt-6 border-t border-white/5 shrink-0"
                  >
                    <button onClick={() => { onClose(); router.push('/history/runs'); }} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors flex items-center gap-2 font-medium">
                      <GitBranch className="w-4 h-4 text-slate-400" /> Open Version History
                    </button>
                    <button onClick={() => { onClose(); router.push('/executive'); }} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors flex items-center gap-2 font-medium">
                      <FileText className="w-4 h-4 text-slate-400" /> View Executive Report
                    </button>
                    <button onClick={() => { onClose(); router.push('/command-center'); }} className="px-6 py-3 rounded-xl bg-blue-600/20 border border-blue-500/50 text-blue-300 hover:bg-blue-600/30 transition-colors flex items-center gap-2 font-medium shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                      <Cpu className="w-4 h-4 text-blue-400" /> Ask Copilot
                    </button>
                    <button onClick={() => { onClose(); router.push('/upload'); }} className="px-6 py-3 rounded-xl bg-white text-black hover:bg-slate-200 transition-colors flex items-center gap-2 font-bold shadow-lg ml-auto">
                      Return to Dashboard
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}
            
            {/* Close Button top right */}
            {phase !== "deploying" && (
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors bg-black/50 backdrop-blur-sm border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
