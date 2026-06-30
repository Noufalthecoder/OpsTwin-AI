"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, 
  Terminal, 
  Cpu, 
  Database, 
  Network, 
  ShieldCheck, 
  Zap, 
  MessageSquare,
  Server,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight
} from "lucide-react";

import AgentInspector from "../../components/AgentInspector";

export default function CommandCenter() {
  const [activeNode, setActiveNode] = useState(0);
  const [agentStatus, setAgentStatus] = useState<Record<string, any>>({});
  const [events, setEvents] = useState<Array<{time: string, msg: string, type: string}>>([]);
  const [sysHealth, setSysHealth] = useState({ kg: "Healthy", vector: "Optimal", mem: "42%", resp: "0.8s" });
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const runSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    
    setActiveNode(0);
    setAgentStatus({});
    setEvents([{ time: new Date().toLocaleTimeString(), msg: "Simulation Started. Initializing orchestration...", type: "info" }]);

    const schedule = [
      { agent: "orchestrator", name: "Orchestrator", duration: 1500 },
      { agent: "doc", name: "Document Intelligence", duration: 3000 },
      { agent: "workflow", name: "Workflow Discovery", duration: 4000 },
      { agent: "kg", name: "Knowledge Graph", duration: 3500 },
      { agent: "compliance", name: "Compliance & Bottlenecks", duration: 3000 },
      { agent: "optimization", name: "Workflow Optimization", duration: 4500 },
      { agent: "copilot", name: "Workflow Copilot", duration: 2500 },
    ];

    let cumulativeDelay = 1000;

    schedule.forEach((task, index) => {
      setTimeout(() => {
        setEvents(prev => [{ time: new Date().toLocaleTimeString(), msg: `[${task.name}] Started processing...`, type: "info" }, ...prev].slice(0, 50));
        setAgentStatus(prev => ({
          ...prev, 
          [task.agent]: { status: "Running", time: "0.0s", tokens: "-", provider: task.agent === "orchestrator" ? "System" : "Lemma" }
        }));
        
        const nodeMap: Record<string, number> = { "doc": 1, "workflow": 2, "kg": 3, "compliance": 4, "optimization": 5, "copilot": 8 };
        if (nodeMap[task.agent] !== undefined) setActiveNode(nodeMap[task.agent]);
      }, cumulativeDelay);

      cumulativeDelay += task.duration;
      setTimeout(() => {
        setEvents(prev => [{ time: new Date().toLocaleTimeString(), msg: `[${task.name}] Completed successfully.`, type: "success" }, ...prev].slice(0, 50));
        setAgentStatus(prev => ({
          ...prev, 
          [task.agent]: { status: "Completed", time: `${(task.duration/1000).toFixed(1)}s`, tokens: task.agent === "orchestrator" ? "-" : Math.floor(Math.random() * 2000 + 500).toString(), provider: task.agent === "orchestrator" ? "System" : "Lemma" }
        }));
        
        if (index === schedule.length - 1) {
          setActiveNode(9); // All complete
          setIsSimulating(false);
          setEvents(prev => [{ time: new Date().toLocaleTimeString(), msg: "Pipeline execution completed successfully.", type: "success" }, ...prev].slice(0, 50));
        }
      }, cumulativeDelay);
    });
  };

  useEffect(() => {
    setEvents([
      { time: new Date().toLocaleTimeString(), msg: "Command Center Initialized. Awaiting pipeline execution...", type: "info" }
    ]);

    const eventSource = new EventSource("http://localhost:8000/api/pipeline/stream");

    eventSource.addEventListener("agent_status", (e) => {
      try {
        const data = JSON.parse(e.data);
        setAgentStatus(prev => ({ ...prev, [data.agent]: data }));
        
        // Update active node in diagram based on agent progress
        // UI Nodes: 0:Upload, 1:Doc Intel, 2:Discovery, 3:Knowledge, 4:Bottlenecks, 5:Optimize, 6:Compliance, 7:Report, 8:Copilot
        const nodeMap: Record<string, number> = {
          "doc": 1, "workflow": 2, "kg": 3, "compliance": 4, "optimization": 5, "copilot": 8
        };
        if (nodeMap[data.agent] !== undefined && data.status === "Running") {
          setActiveNode(nodeMap[data.agent]);
        }
        // If the pipeline is completely finished, fill the entire bar
        if (data.agent === "copilot" && data.status === "Completed") {
          setActiveNode(9); // 9 > all indices, so all will be green
        }
      } catch (err) {}
    });

    eventSource.addEventListener("feed", (e) => {
      try {
        const data = JSON.parse(e.data);
        setEvents(prev => [{ time: new Date().toLocaleTimeString(), ...data }, ...prev].slice(0, 50));
      } catch (err) {}
    });

    return () => eventSource.close();
  }, []);

  const agents = [
    { name: "Document Intelligence", id: "doc", icon: Database, provider: "Lemma" },
    { name: "Workflow Discovery", id: "workflow", icon: Network, provider: "Lemma" },
    { name: "Knowledge Graph", id: "kg", icon: Share2, provider: "Lemma" },
    { name: "Workflow Optimization", id: "optimization", icon: Zap, provider: "Lemma" },
    { name: "Compliance & Bottlenecks", id: "compliance", icon: ShieldCheck, provider: "Lemma" },
    { name: "Workflow Copilot", id: "copilot", icon: MessageSquare, provider: "Lemma" },
    { name: "Orchestrator", id: "orchestrator", icon: Server, provider: "System" }
  ].map(a => {
    const status = agentStatus[a.id];
    return {
      ...a,
      provider: status?.provider || a.provider,
      status: status?.status || "Idle",
      time: status?.time || "-",
      tokens: status?.tokens || "-"
    };
  });



  return (
    <div className="p-4 md:p-8 pb-20 max-w-[1600px] mx-auto text-white">
      <AgentInspector 
        isOpen={isInspectorOpen} 
        onClose={() => setIsInspectorOpen(false)} 
        agent={selectedAgent} 
      />
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Terminal className="w-8 h-8 text-blue-500" />
            Enterprise AI Command Center
          </h1>
          <p className="text-gray-400">Centralized orchestration, live pipeline telemetry, and system health.</p>
        </div>
        <button 
          onClick={runSimulation}
          disabled={isSimulating}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-full font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)]"
        >
          {isSimulating ? <Activity className="animate-spin w-5 h-5" /> : <Activity className="w-5 h-5" />}
          {isSimulating ? "Running Simulation..." : "Simulate Pipeline"}
        </button>
      </div>

      {/* Pipeline Visualization */}
      <div className="mb-8 p-6 rounded-3xl border border-white/10 bg-[#0a0a0c]/80 backdrop-blur-xl overflow-x-auto">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-6">Live Execution Pipeline</h3>
        <div className="flex items-center min-w-max pb-4 px-2">
          {["Upload", "Doc Intel", "Discovery", "Knowledge", "Bottlenecks", "Optimize", "Compliance", "Report", "Copilot"].map((step, idx) => {
            const isCompleted = activeNode > idx;
            const isRunning = activeNode === idx;
            return (
              <React.Fragment key={idx}>
                <div className="flex flex-col items-center gap-3 relative">
                  <motion.div
                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center relative z-10 transition-colors duration-500 ${
                      isCompleted ? "border-green-500 bg-green-500/20 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]" : 
                      isRunning ? "border-blue-500 bg-blue-500/20 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.6)] animate-pulse" : 
                      "border-slate-700 bg-slate-800 text-slate-500"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 size={20} /> : <Activity size={20} />}
                  </motion.div>
                  <span className={`text-xs font-medium ${isCompleted ? "text-green-400" : isRunning ? "text-blue-400" : "text-slate-500"}`}>
                    {step}
                  </span>
                </div>
                {idx < 8 && (
                  <div className="w-16 md:w-24 h-0.5 bg-slate-800 relative -top-3">
                    <motion.div 
                      initial={{ width: "0%" }}
                      animate={{ width: isCompleted ? "100%" : isRunning ? "50%" : "0%" }}
                      transition={{ duration: 0.5 }}
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-green-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                    />
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column: Agents & Provider */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* Agent Grid */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
              <Cpu size={16} /> Live Agent Orchestration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agents.map((agent, i) => (
                <div 
                  key={i} 
                  className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors flex flex-col gap-3 relative overflow-hidden group cursor-pointer hover:border-white/20"
                  onClick={() => { setSelectedAgent(agent); setIsInspectorOpen(true); }}
                >
                  {agent.status === 'Running' && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/20">
                      <motion.div className="h-full bg-blue-500" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ repeat: Infinity, duration: 2 }} />
                    </div>
                  )}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${agent.status === 'Completed' ? 'bg-green-500/10 text-green-400' : agent.status === 'Running' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
                        <agent.icon size={20} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">{agent.name}</h4>
                        <div className="text-xs text-gray-500 mt-0.5">Provider: <span className="text-gray-300">{agent.provider}</span></div>
                      </div>
                    </div>
                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${
                      agent.status === 'Completed' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 
                      agent.status === 'Running' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 
                      'bg-slate-800 border-slate-700 text-slate-500'
                    }`}>
                      {agent.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                    <div>
                      <div className="text-[10px] text-gray-500 mb-0.5">Execution Time</div>
                      <div className="text-xs font-mono text-gray-300">{agent.time}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 mb-0.5">Tokens Used</div>
                      <div className="text-xs font-mono text-gray-300">{agent.tokens}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Provider Monitor & System Health */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl border border-white/10 bg-[#0a0a0c]/80 backdrop-blur-xl">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">AI Provider Status</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-lg border border-blue-500/30 bg-blue-500/5 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2" />
                  <div>
                    <div className="font-bold flex items-center gap-2">Gemini <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /></div>
                    <div className="text-xs text-gray-400 mt-1">Active Primary Model (Pro)</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono text-green-400">42ms</div>
                    <div className="text-xs text-gray-500 mt-1">Latency</div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg border border-slate-800 bg-slate-900/50">
                  <div>
                    <div className="font-bold text-gray-400 flex items-center gap-2">Groq <span className="w-2 h-2 rounded-full bg-slate-600" /></div>
                    <div className="text-xs text-gray-500 mt-1">Standby Fallback</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono text-gray-400">Ready</div>
                    <div className="text-xs text-gray-600 mt-1">Status</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-white/10 bg-[#0a0a0c]/80 backdrop-blur-xl">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">System Health</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Knowledge Graph</div>
                  <div className="text-lg font-bold text-white flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Healthy
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Vector Store</div>
                  <div className="text-lg font-bold text-white flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Optimal
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Memory Usage</div>
                  <div className="text-lg font-bold text-white">42%</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Avg Response</div>
                  <div className="text-lg font-bold text-white">0.8s</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Event Feed & Notifications */}
        <div className="space-y-6">
          <div className="p-5 rounded-2xl border border-white/10 bg-[#0a0a0c]/80 backdrop-blur-xl h-[600px] flex flex-col">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4 flex items-center justify-between">
              <span>Live Event Feed</span>
              <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-400/10 px-2 py-0.5 rounded border border-green-400/20">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> LIVE
              </span>
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar relative">
              {/* Gradient fade out at bottom */}
              <div className="sticky top-0 h-4 bg-gradient-to-b from-[#0a0a0c] to-transparent z-10 -mt-2" />
              
              <AnimatePresence>
                {events.map((evt, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex gap-3 relative before:absolute before:left-3.5 before:top-8 before:bottom-[-16px] before:w-px before:bg-white/5 last:before:hidden"
                  >
                    <div className={`mt-1 shrink-0 w-7 h-7 rounded-full flex items-center justify-center border bg-[#050505] relative z-10 ${
                      evt.type === 'success' ? 'border-green-500/50 text-green-400' : 
                      evt.type === 'warning' ? 'border-yellow-500/50 text-yellow-400' : 
                      'border-blue-500/50 text-blue-400'
                    }`}>
                      {evt.type === 'success' ? <CheckCircle2 size={12} /> : 
                       evt.type === 'warning' ? <AlertCircle size={12} /> : 
                       <Clock size={12} />}
                    </div>
                    <div>
                      <div className="text-xs font-mono text-gray-500 mb-0.5">{evt.time}</div>
                      <div className="text-sm text-gray-300 leading-snug">{evt.msg}</div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Need to import Share2 to fix missing icon from earlier
import { Share2 } from "lucide-react";
