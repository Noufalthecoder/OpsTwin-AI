"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import {
  ReactFlow, Background, Controls, MiniMap,
  Node, Edge, Position, MarkerType, NodeProps, Handle,
  useReactFlow, ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";

/* ─────────────────────────── types ─────────────────────────────────── */
interface OptimizedStep {
  id: number; title: string; actor: string; department: string;
  type: string; execution_mode: string;
  inputs: string[]; outputs: string[]; dependencies: number[];
  change: string; change_reason: string;
}
interface OptimizationRecommendation {
  category: string; title: string; description: string;
  expected_impact: string; implementation_difficulty: string;
  estimated_time_saved: string; estimated_cost_saved: string;
  confidence: number;
}
interface ComparisonMetrics {
  original_steps: number; optimized_steps: number;
  original_approvals: number; optimized_approvals: number;
  original_decision_points: number; optimized_decision_points: number;
  original_manual_steps: number; optimized_manual_steps: number;
  original_execution_time: string; optimized_execution_time: string;
  original_automation_score: number; optimized_automation_score: number;
}
export interface OptimizationData {
  original_step_count: number; optimized_step_count: number;
  time_reduction_pct: number; manual_work_reduction_pct: number;
  cost_savings: string; optimization_confidence: number;
  comparison: ComparisonMetrics;
  optimized_steps: OptimizedStep[];
  recommendations: OptimizationRecommendation[];
  executive_summary: string;
  ai_confidence: number;
}
interface OriginalStep {
  id: number; title: string; actor?: string; department?: string; type: string;
}

/* ─────────────────────────── workflow graph helpers ────────────────── */
const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Start:    { bg: "linear-gradient(135deg,#10b981,#059669)", border: "#059669", text: "#fff" },
  End:      { bg: "linear-gradient(135deg,#ef4444,#dc2626)", border: "#dc2626", text: "#fff" },
  Approval: { bg: "linear-gradient(135deg,#f59e0b,#d97706)", border: "#d97706", text: "#fff" },
  Decision: { bg: "linear-gradient(135deg,#8b5cf6,#7c3aed)", border: "#7c3aed", text: "#fff" },
  Task:     { bg: "linear-gradient(135deg,#3b82f6,#2563eb)", border: "#2563eb", text: "#fff" },
};
const CHANGE_RING: Record<string, string> = {
  automated:    "#10b981",
  merged:       "#f59e0b",
  parallelized: "#8b5cf6",
  removed:      "#ef4444",
  new:          "#06b6d4",
  kept:         "transparent",
};
const TYPE_ICONS: Record<string, string> = {
  Start: "🚀", End: "🏁", Approval: "✅", Decision: "🔀", Task: "⚙️",
};
const CHANGE_ICONS: Record<string, string> = {
  automated: "🤖", merged: "🔗", parallelized: "⚡", removed: "✂️", new: "✨", kept: "",
};

const NW = 240, NH = 96;

function buildDagre(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 65, marginx: 50, marginy: 50 });
  nodes.forEach(n => g.setNode(n.id, { width: NW, height: NH }));
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map(n => {
    const p = g.node(n.id);
    return { ...n, position: { x: p.x - NW / 2, y: p.y - NH / 2 }, sourcePosition: Position.Bottom, targetPosition: Position.Top };
  });
}

function OptNode({ data }: NodeProps) {
  const d = data as { label: string; stepType: string; actor: string; executionMode: string; change: string; changeReason: string };
  const palette = NODE_COLORS[d.stepType] || NODE_COLORS.Task;
  const ring = CHANGE_RING[d.change] || "transparent";
  const icon = TYPE_ICONS[d.stepType] || "⚙️";
  const changeIcon = CHANGE_ICONS[d.change] || "";

  return (
    <div style={{
      background: palette.bg, border: `2px solid ${palette.border}`,
      outline: ring !== "transparent" ? `3px solid ${ring}` : undefined,
      outlineOffset: 2,
      borderRadius: 16, padding: "12px 18px", width: NW, color: palette.text,
      boxShadow: `0 2px 16px ${palette.border}44`,
    }} title={d.changeReason || d.label}>
      <Handle type="target" position={Position.Top} style={{ background: palette.border, width: 8, height: 8, border: "2px solid #fff", top: -4 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", opacity: .8, letterSpacing: ".4px" }}>{d.stepType}</span>
        {changeIcon && <span style={{ fontSize: 13, marginLeft: "auto" }} title={d.change}>{changeIcon}</span>}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, marginBottom: 5 }}>{d.label}</div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {d.actor && <span style={{ fontSize: 10, background: "rgba(255,255,255,.22)", borderRadius: 5, padding: "1px 7px" }}>👤 {d.actor}</span>}
        {d.executionMode === "Automated" && <span style={{ fontSize: 10, background: "rgba(16,185,129,.35)", borderRadius: 5, padding: "1px 7px" }}>🤖 Auto</span>}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: palette.border, width: 8, height: 8, border: "2px solid #fff", bottom: -4 }} />
    </div>
  );
}
const optNodeTypes = { optNode: OptNode };

function OptFlowCanvas({ nodes, edges, isFS }: { nodes: Node[]; edges: Edge[]; isFS: boolean }) {
  const { fitView } = useReactFlow();
  const did = useRef(false);
  useEffect(() => {
    if (!did.current) { const t = setTimeout(() => { fitView({ padding: 0.12, duration: 400 }); did.current = true; }, 80); return () => clearTimeout(t); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.1, duration: 300 }), 80);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFS]);
  return (
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={optNodeTypes} proOptions={{ hideAttribution: true }}
      minZoom={0.15} maxZoom={2} nodesDraggable={false} nodesConnectable={false}
      elementsSelectable={false} panOnDrag zoomOnScroll={false} zoomOnPinch panOnScroll={false}>
      <Background color="#e2e8f0" gap={24} size={1} />
      <Controls showInteractive={false} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,.08)" }} />
      <MiniMap nodeColor={n => NODE_COLORS[(n.data as { stepType: string }).stepType]?.border ?? "#94a3b8"} maskColor="rgba(241,245,249,.7)" style={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
    </ReactFlow>
  );
}

/* ─────────────────────────── small helpers ─────────────────────────── */
function Delta({ label, from, to, unit = "", lowerIsBetter = false }: {
  label: string; from: number | string; to: number | string; unit?: string; lowerIsBetter?: boolean;
}) {
  const fNum = typeof from === "number" ? from : parseFloat(String(from)) || 0;
  const tNum = typeof to   === "number" ? to   : parseFloat(String(to))   || 0;
  const improved = lowerIsBetter ? tNum < fNum : tNum > fNum;
  const same = fNum === tNum;
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col gap-3">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-3">
        <div className="flex-1 text-center">
          <p className="text-2xl font-extrabold text-slate-700">{from}{unit}</p>
          <p className="text-xs text-slate-400 mt-0.5">Current</p>
        </div>
        <div className="text-slate-300 text-xl">→</div>
        <div className="flex-1 text-center">
          <p className={`text-2xl font-extrabold ${same ? "text-slate-700" : improved ? "text-emerald-600" : "text-red-500"}`}>
            {to}{unit}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Optimized</p>
        </div>
      </div>
      {!same && (
        <div className={`text-center text-xs font-semibold px-2 py-0.5 rounded-full ${improved ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
          {improved ? "▼ Improved" : "▲ Increased"}
        </div>
      )}
    </div>
  );
}

function HeroStat({ value, label, sub, color }: { value: string | number; label: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-2xl p-6 flex flex-col items-center text-center border ${color}`}>
      <span className="text-4xl font-black leading-none mb-1">{value}</span>
      <span className="text-sm font-bold opacity-90">{label}</span>
      {sub && <span className="text-xs opacity-70 mt-0.5">{sub}</span>}
    </div>
  );
}

/* ─────────────────────────── main component ────────────────────────── */
export default function OptimizationPanel({
  optimization, originalSteps,
}: {
  optimization: OptimizationData;
  originalSteps?: OriginalStep[];
}) {
  const [isFS, setIsFS] = useState(false);
  const o = optimization;
  const cmp = o.comparison;

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setIsFS(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* Build optimized graph */
  const { optNodes, optEdges } = useMemo(() => {
    const rawN: Node[] = o.optimized_steps.map(s => ({
      id: `opt-${s.id}`, type: "optNode", position: { x: 0, y: 0 },
      data: { label: s.title, stepType: s.type, actor: s.actor, department: s.department, executionMode: s.execution_mode, change: s.change, changeReason: s.change_reason },
    }));
    const rawE: Edge[] = [];
    o.optimized_steps.forEach(s => {
      (s.dependencies || []).forEach(dep => {
        const color = NODE_COLORS[s.type]?.border || "#94a3b8";
        rawE.push({ id: `oe-${dep}-${s.id}`, source: `opt-${dep}`, target: `opt-${s.id}`, type: "smoothstep", animated: true, style: { stroke: color, strokeWidth: 2.5 }, markerEnd: { type: MarkerType.ArrowClosed, color, width: 18, height: 18 } });
      });
    });
    return { optNodes: buildDagre(rawN, rawE), optEdges: rawE };
  }, [o.optimized_steps]);

  const optH = isFS ? "100%" : Math.max(420, Math.min(o.optimized_steps.length * 160 + 80, 640));

  const graphEl = (
    <div className="relative w-full" style={{ height: optH }}>
      <ReactFlowProvider>
        <OptFlowCanvas nodes={optNodes} edges={optEdges} isFS={isFS} />
      </ReactFlowProvider>
      {!isFS && (
        <button onClick={() => setIsFS(true)} className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:border-slate-400 shadow-sm transition-all flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
          Fullscreen
        </button>
      )}
    </div>
  );

  /* Recommendation category config */
  const catConfig: Record<string, { icon: string; bg: string; border: string; label: string }> = {
    "Quick Win":      { icon: "🟢", bg: "bg-emerald-50", border: "border-emerald-200", label: "Quick Win" },
    "Medium Effort":  { icon: "🟡", bg: "bg-amber-50",   border: "border-amber-200",   label: "Medium Effort" },
    "Strategic":      { icon: "🔴", bg: "bg-red-50",     border: "border-red-200",     label: "Strategic" },
  };
  const grouped = {
    "Quick Win":     o.recommendations.filter(r => r.category === "Quick Win"),
    "Medium Effort": o.recommendations.filter(r => r.category === "Medium Effort"),
    "Strategic":     o.recommendations.filter(r => r.category === "Strategic"),
  };

  return (
    <>
      {/* ── Fullscreen modal ──────────────────────────────────────── */}
      {isFS && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">AI Workflow Optimization</p>
              <h2 className="text-lg font-bold text-white">Optimized Process Graph</h2>
            </div>
            <button onClick={() => setIsFS(false)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-medium transition-colors">
              Exit <span className="text-slate-500 text-xs ml-1">Esc</span>
            </button>
          </div>
          <div className="flex-1 overflow-hidden bg-slate-900">{graphEl}</div>
        </div>
      )}

      <div className="space-y-8">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">AI Workflow Optimization</h4>
          <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Optimized Process Analysis</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">
            Gemini analysed your workflow and produced a leaner, more automated version with actionable recommendations.
          </p>
        </div>

        {/* ── Hero metrics ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <HeroStat value={o.original_step_count}   label="Original Steps"   color="bg-slate-100 border-slate-200 text-slate-700" />
          <HeroStat value={o.optimized_step_count}  label="Optimized Steps"  color="bg-emerald-50 border-emerald-200 text-emerald-800" />
          <HeroStat value={`${o.time_reduction_pct}%`}         label="Time Reduction"         color="bg-blue-50 border-blue-200 text-blue-800" />
          <HeroStat value={`${o.manual_work_reduction_pct}%`}  label="Manual Work Reduced"    color="bg-violet-50 border-violet-200 text-violet-800" />
          <HeroStat value={o.cost_savings}           label="Cost Savings"    sub="estimated" color="bg-amber-50 border-amber-200 text-amber-800" />
          <HeroStat value={`${o.optimization_confidence}%`}   label="Confidence"             color="bg-teal-50 border-teal-200 text-teal-800" />
        </div>

        {/* ── Executive Summary ───────────────────────────────────── */}
        {o.executive_summary && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">📋</span>
              <h5 className="text-sm font-bold text-emerald-900 uppercase tracking-wider">Executive Summary</h5>
            </div>
            <p className="text-emerald-900 leading-relaxed text-sm">{o.executive_summary}</p>
          </div>
        )}

        {/* ── Before vs After Comparison ──────────────────────────── */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Before vs After</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Delta label="Total Steps"      from={cmp.original_steps}           to={cmp.optimized_steps}           lowerIsBetter />
            <Delta label="Approvals"        from={cmp.original_approvals}        to={cmp.optimized_approvals}        lowerIsBetter />
            <Delta label="Decision Points"  from={cmp.original_decision_points}  to={cmp.optimized_decision_points}  lowerIsBetter />
            <Delta label="Manual Steps"     from={cmp.original_manual_steps}     to={cmp.optimized_manual_steps}     lowerIsBetter />
            <Delta label="Execution Time"   from={cmp.original_execution_time}  to={cmp.optimized_execution_time} />
            <Delta label="Automation Score" from={cmp.original_automation_score} to={cmp.optimized_automation_score} unit="%" />
          </div>
        </div>

        {/* ── Optimized Workflow Graph ─────────────────────────────── */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Optimized Workflow Graph</h4>
          {/* Change legend */}
          <div className="flex flex-wrap gap-3 mb-3">
            {[
              { change: "automated",    label: "Automated",    color: "#10b981" },
              { change: "merged",       label: "Merged",       color: "#f59e0b" },
              { change: "parallelized", label: "Parallelized", color: "#8b5cf6" },
              { change: "removed",      label: "Removed",      color: "#ef4444" },
              { change: "new",          label: "New Step",     color: "#06b6d4" },
              { change: "kept",         label: "Unchanged",    color: "#94a3b8" },
            ].map(item => (
              <div key={item.change} className="flex items-center gap-1.5 text-xs text-slate-600">
                <div style={{ width: 10, height: 10, borderRadius: 3, background: item.color, flexShrink: 0 }} />
                {item.label}
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {graphEl}
          </div>
        </div>

        {/* ── Optimization Recommendations ────────────────────────── */}
        {o.recommendations.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              Optimization Recommendations
            </h4>
            <div className="space-y-6">
              {(["Quick Win", "Medium Effort", "Strategic"] as const).map(cat => {
                const items = grouped[cat];
                if (!items.length) return null;
                const cfg = catConfig[cat];
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{cfg.icon}</span>
                      <span className="text-sm font-bold text-slate-700">{cfg.label}</span>
                      <span className="ml-1 text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{items.length}</span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {items.map((rec, i) => {
                        const diffColor: Record<string, string> = {
                          Low:    "bg-emerald-100 text-emerald-700 border-emerald-200",
                          Medium: "bg-amber-100 text-amber-700 border-amber-200",
                          High:   "bg-red-100 text-red-700 border-red-200",
                        };
                        return (
                          <div key={i} className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-5 space-y-3`}>
                            <div className="flex items-start justify-between gap-2">
                              <h6 className="text-sm font-bold text-slate-900 leading-tight">{rec.title}</h6>
                              <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border ${diffColor[rec.implementation_difficulty] ?? diffColor.Medium}`}>
                                {rec.implementation_difficulty}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">{rec.description}</p>
                            <div className="bg-white/70 rounded-xl p-3 border border-white">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Expected Impact</p>
                              <p className="text-sm text-slate-700">{rec.expected_impact}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="bg-white/70 rounded-xl p-2.5 border border-white">
                                <p className="font-semibold text-slate-400 mb-0.5">Time Saved</p>
                                <p className="font-bold text-emerald-700">⏱ {rec.estimated_time_saved}</p>
                              </div>
                              <div className="bg-white/70 rounded-xl p-2.5 border border-white">
                                <p className="font-semibold text-slate-400 mb-0.5">Cost Saved</p>
                                <p className="font-bold text-emerald-700">💰 {rec.estimated_cost_saved}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-xs text-slate-400">AI Confidence</span>
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div className="h-1.5 rounded-full" style={{ width: `${rec.confidence}%`, background: rec.confidence > 80 ? "#10b981" : rec.confidence > 50 ? "#f59e0b" : "#ef4444" }} />
                                </div>
                                <span className="text-xs font-bold text-slate-600">{rec.confidence}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
