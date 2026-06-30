"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ReactFlow, Background, Controls,
  Node, Edge, Position, MarkerType, NodeProps, Handle,
  ReactFlowProvider, useReactFlow
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, AlertTriangle, Cpu, LayoutTemplate, X, Zap, ChevronRight, BarChart4, DollarSign, Clock } from "lucide-react";
import type { OptimizerProps, OptimizedWorkflowStep, OriginalStep } from "./types";

/* ─────────────────────────── HELPERS ─────────────────────────── */
const NW = 240, NH = 90;

function buildDagre(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 60 });
  nodes.forEach(n => g.setNode(n.id, { width: NW, height: NH }));
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map(n => {
    const p = g.node(n.id);
    return { ...n, position: { x: p.x - NW / 2, y: p.y - NH / 2 }, sourcePosition: Position.Bottom, targetPosition: Position.Top };
  });
}

const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Start:    { bg: "linear-gradient(135deg,#10b981,#059669)", border: "#059669", text: "#fff" },
  End:      { bg: "linear-gradient(135deg,#ef4444,#dc2626)", border: "#dc2626", text: "#fff" },
  Approval: { bg: "linear-gradient(135deg,#f59e0b,#d97706)", border: "#d97706", text: "#fff" },
  Decision: { bg: "linear-gradient(135deg,#8b5cf6,#7c3aed)", border: "#7c3aed", text: "#fff" },
  Task:     { bg: "linear-gradient(135deg,#3b82f6,#2563eb)", border: "#2563eb", text: "#fff" },
};

function CustomNode({ data }: NodeProps) {
  const d = data as { label: string; stepType: string; change?: string; isSelected?: boolean; onNodeClick: (id: string) => void; id: string };
  const palette = NODE_COLORS[d.stepType] || NODE_COLORS.Task;
  
  return (
    <div 
      onClick={() => d.onNodeClick(d.id)}
      className={`relative rounded-2xl p-4 w-[240px] text-white cursor-pointer transition-all duration-300
        ${d.isSelected ? 'ring-4 ring-blue-400 ring-offset-2 scale-105' : 'hover:scale-105 hover:shadow-xl'}
      `}
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        boxShadow: `0 4px 15px ${palette.border}66`
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-white !w-3 !h-3 !border-2 !border-slate-800" />
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-md">
          {d.stepType}
        </span>
        {d.change && d.change !== 'kept' && (
          <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-400/90 text-emerald-950 px-2 py-0.5 rounded-full shadow-sm">
            {d.change}
          </span>
        )}
      </div>
      <div className="font-bold text-sm leading-tight line-clamp-2">{d.label}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-white !w-3 !h-3 !border-2 !border-slate-800" />
    </div>
  );
}

const nodeTypes = { customNode: CustomNode };

/* ─────────────────────────── COMPONENT ─────────────────────────── */

export function InteractiveGraph({ optimization: o, originalWorkflow: w }: OptimizerProps) {
  const [scenario, setScenario] = useState<"current" | "optimized">("optimized");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Parse nodes
  const { origNodes, origEdges } = useMemo(() => {
    const rawN: Node[] = w.steps.map((s: OriginalStep) => ({
      id: `orig-${s.id}`, type: "customNode", position: { x: 0, y: 0 },
      data: { id: `orig-${s.id}`, label: s.title, stepType: s.type, onNodeClick: setSelectedNodeId, isSelected: selectedNodeId === `orig-${s.id}` },
    }));
    const rawE: Edge[] = [];
    w.steps.forEach((s: OriginalStep) => {
      (s.dependencies || []).forEach(dep => {
        rawE.push({ id: `oe-${dep}-${s.id}`, source: `orig-${dep}`, target: `orig-${s.id}`, type: "smoothstep", animated: false, style: { strokeWidth: 2, stroke: '#94a3b8' } });
      });
    });
    return { origNodes: buildDagre(rawN, rawE), origEdges: rawE };
  }, [w, selectedNodeId]);

  const { optNodes, optEdges } = useMemo(() => {
    const rawN: Node[] = o.optimized_graph.map(s => ({
      id: `opt-${s.id}`, type: "customNode", position: { x: 0, y: 0 },
      data: { id: `opt-${s.id}`, label: s.title, stepType: s.type, change: s.change, onNodeClick: setSelectedNodeId, isSelected: selectedNodeId === `opt-${s.id}` },
    }));
    const rawE: Edge[] = [];
    o.optimized_graph.forEach(s => {
      (s.dependencies || []).forEach(dep => {
        rawE.push({ id: `oe-${dep}-${s.id}`, source: `opt-${dep}`, target: `opt-${s.id}`, type: "smoothstep", animated: true, style: { strokeWidth: 2, stroke: '#3b82f6' } });
      });
    });
    return { optNodes: buildDagre(rawN, rawE), optEdges: rawE };
  }, [o.optimized_graph, selectedNodeId]);

  const nodes = scenario === "current" ? origNodes : optNodes;
  const edges = scenario === "current" ? origEdges : optEdges;
  
  const selectedNodeData = useMemo(() => {
    if (!selectedNodeId) return null;
    if (selectedNodeId.startsWith("orig-")) {
      const id = parseInt(selectedNodeId.split("-")[1]);
      return w.steps.find((s: OriginalStep) => s.id === id);
    } else {
      const id = parseInt(selectedNodeId.split("-")[1]);
      return o.optimized_graph.find(s => s.id === id);
    }
  }, [selectedNodeId, w, o]);

  return (
    <div className="flex flex-col h-[700px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
      
      {/* TOOLBAR */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex p-1.5 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-full shadow-lg">
        <button 
          onClick={() => { setScenario("current"); setSelectedNodeId(null); }}
          className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${scenario === 'current' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
        >
          Current Workflow
        </button>
        <button 
          onClick={() => { setScenario("optimized"); setSelectedNodeId(null); }}
          className={`px-6 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${scenario === 'optimized' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-600 hover:text-blue-600'}`}
        >
          <Zap className="w-4 h-4" /> AI Optimized
        </button>
      </div>

      {/* GRAPH AREA */}
      <div className="flex-1 relative">
        <ReactFlowProvider>
          <ReactFlow 
            nodes={nodes} 
            edges={edges} 
            nodeTypes={nodeTypes} 
            fitView 
            minZoom={0.2}
            className="bg-slate-50/50 dark:bg-slate-900/50"
          >
            <Background color="#cbd5e1" gap={24} size={2} />
            <Controls className="!bg-white/80 !backdrop-blur-md !border-slate-200 !shadow-lg !rounded-xl" />
          </ReactFlow>
        </ReactFlowProvider>
      </div>

      {/* SIDEBAR - LIVE METRICS */}
      <div className="absolute bottom-6 right-6 min-w-[280px] max-w-sm flex flex-col gap-4 z-10 pointer-events-none">
        <motion.div 
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-2xl p-5 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-xl pointer-events-auto"
        >
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Live Impact
          </h4>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Manual Hours</span>
                <span className="font-bold text-emerald-600">-{o.estimated_manual_work_reduction}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${o.estimated_manual_work_reduction}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Automation %</span>
                <span className="font-bold text-blue-600">{o.automation_score}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${o.automation_score}%` }} />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* NODE DETAILS PANEL */}
      <AnimatePresence>
        {selectedNodeId && selectedNodeData && (
          <motion.div 
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 w-[400px] h-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl border-l border-slate-200 dark:border-slate-800 shadow-2xl z-20 flex flex-col"
          >
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-100 px-2 py-1 rounded-md mb-2 inline-block">
                  {selectedNodeData.type} Node
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight mt-2">{selectedNodeData.title}</h3>
              </div>
              <button onClick={() => setSelectedNodeId(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-500 mb-1">Actor</p>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{selectedNodeData.actor || "System"}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-500 mb-1">Department</p>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{selectedNodeData.department || "Cross-functional"}</p>
                </div>
              </div>

              {/* AI Recommendations */}
              {selectedNodeId.startsWith("opt-") && (selectedNodeData as OptimizedWorkflowStep).change_reason && (
                <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 p-5 rounded-2xl">
                  <div className="flex items-center gap-2 mb-3 text-blue-700 dark:text-blue-400">
                    <Cpu className="w-5 h-5" />
                    <h4 className="font-bold text-sm uppercase tracking-wide">AI Recommendation</h4>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {(selectedNodeData as OptimizedWorkflowStep).change_reason}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 rounded-xl transition-colors shadow-md shadow-blue-500/20">
                      Apply
                    </button>
                    <button className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-sm font-semibold py-2 rounded-xl transition-colors">
                      Ignore
                    </button>
                  </div>
                </div>
              )}

              {/* Dependencies */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Dependencies</h4>
                {selectedNodeData.dependencies && selectedNodeData.dependencies.length > 0 ? (
                  <div className="space-y-2">
                    {selectedNodeData.dependencies.map((dep: number) => (
                      <div key={dep} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/50 rounded-xl">
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Depends on Step #{dep}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">No dependencies.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
