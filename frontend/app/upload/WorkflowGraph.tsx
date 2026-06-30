"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Position,
  MarkerType,
  NodeProps,
  Handle,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { create } from "xmlbuilder2";

/* ─────────────────────────── palette ──────────────────────────────── */
const NODE_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  Start:    { bg: "linear-gradient(135deg,#10b981,#059669)", border: "#059669", text: "#fff", glow: "0 0 20px rgba(16,185,129,.3)" },
  End:      { bg: "linear-gradient(135deg,#ef4444,#dc2626)", border: "#dc2626", text: "#fff", glow: "0 0 20px rgba(239,68,68,.3)" },
  Approval: { bg: "linear-gradient(135deg,#f59e0b,#d97706)", border: "#d97706", text: "#fff", glow: "0 0 20px rgba(245,158,11,.3)" },
  Decision: { bg: "linear-gradient(135deg,#8b5cf6,#7c3aed)", border: "#7c3aed", text: "#fff", glow: "0 0 20px rgba(139,92,246,.3)" },
  Task:     { bg: "linear-gradient(135deg,#3b82f6,#2563eb)", border: "#2563eb", text: "#fff", glow: "0 0 20px rgba(59,130,246,.3)" },
};
const TYPE_ICONS: Record<string, string> = {
  Start: "🚀", End: "🏁", Approval: "✅", Decision: "🔀", Task: "⚙️",
};

/* ─────────────────────────── node dimensions ───────────────────────── */
const NODE_W = 260;
const NODE_H = 100;

/* ─────────────────────────── dagre layout ──────────────────────────── */
function applyDagreLayout(nodes: Node[], edges: Edge[], direction: "LR" | "TB" = "TB"): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: direction === "LR" ? 50 : 40,
    ranksep: direction === "LR" ? 90 : 70,
    marginx: 50,
    marginy: 50,
  });

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
      sourcePosition: direction === "LR" ? Position.Right  : Position.Bottom,
      targetPosition: direction === "LR" ? Position.Left   : Position.Top,
    };
  });
}

/* ─────────────────────────── custom node ───────────────────────────── */
function WorkflowNode({ data }: NodeProps) {
  const d = data as { label: string; stepType: string; actor: string; department: string };
  const palette = NODE_COLORS[d.stepType] || NODE_COLORS.Task;
  const icon = TYPE_ICONS[d.stepType] || "⚙️";

  return (
    <div
      style={{
        background: palette.bg,
        border: `2px solid ${palette.border}`,
        borderRadius: 18,
        padding: "16px 22px",
        width: NODE_W,
        color: palette.text,
        boxShadow: palette.glow,
        backdropFilter: "blur(4px)",
      }}
    >
      <Handle type="target" position={Position.Top}
        style={{ background: palette.border, width: 10, height: 10, border: "2px solid #fff", top: -5 }} />

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".5px", textTransform: "uppercase", opacity: .8 }}>
          {d.stepType}
        </span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35, marginBottom: 8 }}>
        {d.label}
      </div>
      {(d.actor || d.department) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {d.actor && (
            <span style={{ fontSize: 11, background: "rgba(255,255,255,.22)", borderRadius: 6, padding: "2px 8px" }}>
              👤 {d.actor}
            </span>
          )}
          {d.department && (
            <span style={{ fontSize: 11, background: "rgba(255,255,255,.22)", borderRadius: 6, padding: "2px 8px" }}>
              🏢 {d.department}
            </span>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom}
        style={{ background: palette.border, width: 10, height: 10, border: "2px solid #fff", bottom: -5 }} />
    </div>
  );
}

const nodeTypes = { workflowNode: WorkflowNode };

/* ─────────────────────────── types ─────────────────────────────────── */
interface WorkflowStep {
  id: number;
  title: string;
  actor?: string;
  department?: string;
  type: string;
  inputs?: string[];
  outputs?: string[];
  dependencies?: number[];
}
interface AutomationOpportunity {
  step_title: string;
  suggestion: string;
  impact?: string;
}
interface WorkflowInsights {
  complexity: string;
  estimated_execution_time: string;
  automation_score: number;
  manual_steps: number;
  approval_count: number;
  ai_confidence?: number;
  gemini_fallback?: boolean;
  gemini_error?: string;
}
export interface WorkflowData {
  workflow_name: string;
  description?: string;
  start: string;
  end: string;
  steps: WorkflowStep[];
  actors: string[];
  departments: string[];
  inputs: string[];
  outputs: string[];
  decision_points: string[];
  approvals: string[];
  dependencies: string[];
  automation_opportunities?: AutomationOpportunity[];
  insights: WorkflowInsights;
}

/* ─────────────────────────── fullscreen button ─────────────────────── */
function FullscreenButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Open fullscreen"
      className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:border-slate-400 shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
      </svg>
      Fullscreen
    </button>
  );
}

/* ─────────────────────────── inner flow (fitView once) ─────────────── */
function FlowCanvas({ nodes, edges, isFullscreen }: {
  nodes: Node[];
  edges: Edge[];
  isFullscreen: boolean;
}) {
  const { fitView } = useReactFlow();
  const didFit = useRef(false);

  useEffect(() => {
    if (!didFit.current) {
      const t = setTimeout(() => { fitView({ padding: 0.12, duration: 400 }); didFit.current = true; }, 80);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fit when entering fullscreen (new canvas size)
  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.1, duration: 300 }), 80);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullscreen]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      proOptions={{ hideAttribution: true }}
      minZoom={0.15}
      maxZoom={2}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnDrag
      zoomOnScroll={false}
      zoomOnPinch
      panOnScroll={false}
    >
      <Background color="#e2e8f0" gap={24} size={1} />
      <Controls
        showInteractive={false}
        style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}
      />
      <MiniMap
        nodeColor={(n) => NODE_COLORS[(n.data as { stepType: string }).stepType]?.border ?? "#94a3b8"}
        maskColor="rgba(241,245,249,.7)"
        style={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
      />
    </ReactFlow>
  );
}

/* ─────────────────────────── main component ─────────────────────────── */
export default function WorkflowGraph({ workflow }: { workflow: WorkflowData }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<"flow" | "mermaid" | "bpmn">("flow");

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setIsFullscreen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const { nodes, edges } = useMemo(() => {
    const rawNodes: Node[] = workflow.steps.map((step) => ({
      id: `step-${step.id}`,
      type: "workflowNode",
      position: { x: 0, y: 0 },
      data: {
        label: step.title,
        stepType: step.type,
        actor: step.actor || "",
        department: step.department || "",
      },
    }));

    const rawEdges: Edge[] = [];
    workflow.steps.forEach((step) => {
      (step.dependencies || []).forEach((depId) => {
        const color = NODE_COLORS[step.type]?.border || "#94a3b8";
        rawEdges.push({
          id: `e-${depId}-${step.id}`,
          source: `step-${depId}`,
          target: `step-${step.id}`,
          type: "smoothstep",
          animated: true,
          style: { stroke: color, strokeWidth: 2.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color, width: 18, height: 18 },
        });
      });
    });

    const laidOut = applyDagreLayout(rawNodes, rawEdges, "TB");
    return { nodes: laidOut, edges: rawEdges };
  }, [workflow]);

  /* stats */
  const stepCount = workflow.steps.length;
  const complexityColor: Record<string, string> = {
    Low: "bg-emerald-100 text-emerald-800 border-emerald-200",
    Medium: "bg-amber-100 text-amber-800 border-amber-200",
    High: "bg-red-100 text-red-800 border-red-200",
  };
  const aiConfidence = workflow.insights.ai_confidence;

  /* graph panel — used in both inline and fullscreen */
  // TB layout: each step takes ~170px vertical space, cap at 700px inline
  const graphHeight = isFullscreen ? "100%" : Math.max(480, Math.min(stepCount * 170 + 100, 700));

  const canvasEl = (
    <div className="relative w-full" style={{ height: graphHeight }}>
      <ReactFlowProvider>
        <FlowCanvas nodes={nodes} edges={edges} isFullscreen={isFullscreen} />
      </ReactFlowProvider>
      {!isFullscreen && <FullscreenButton onClick={() => setIsFullscreen(true)} />}
    </div>
  );

  /* Mermaid & BPMN Generation */
  const mermaidCode = useMemo(() => {
    let m = "graph TD;\n";
    workflow.steps.forEach(step => {
      m += `  step${step.id}["${step.title}"];\n`;
      if (step.dependencies) {
        step.dependencies.forEach(dep => {
          m += `  step${dep} --> step${step.id};\n`;
        });
      }
    });
    return m;
  }, [workflow]);

  const bpmnCode = useMemo(() => {
    const root = create({ version: "1.0", encoding: "UTF-8" })
      .ele("bpmn:definitions", {
        "xmlns:bpmn": "http://www.omg.org/spec/BPMN/20100524/MODEL",
        "id": "Definitions_1",
        "targetNamespace": "http://bpmn.io/schema/bpmn"
      })
      .ele("bpmn:process", { id: "Process_1", isExecutable: "true" });

    workflow.steps.forEach(step => {
      root.ele("bpmn:task", { id: `Task_${step.id}`, name: step.title }).up();
    });

    return root.end({ prettyPrint: true });
  }, [workflow]);

  return (
    <>
      {/* ── Fullscreen modal ──────────────────────────────────────── */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          {/* header bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Workflow Discovery</p>
              <h2 className="text-lg font-bold text-white">{workflow.workflow_name}</h2>
            </div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-medium transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </svg>
              Exit <span className="text-slate-500 text-xs ml-1">Esc</span>
            </button>
          </div>
          {/* canvas */}
          <div className="flex-1 overflow-hidden bg-slate-900">
            {canvasEl}
          </div>
        </div>
      )}

      {/* ── Inline section ────────────────────────────────────────── */}
      <div className="space-y-6">

        {/* header */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Workflow Discovery</h4>
          <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{workflow.workflow_name}</h3>
          {workflow.description && (
            <p className="mt-1.5 text-sm text-slate-500 leading-relaxed max-w-2xl">{workflow.description}</p>
          )}
        </div>

        {/* fallback warning */}
        {workflow.insights.gemini_fallback && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
            <span className="text-xl mt-0.5">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-amber-900">Showing rule-based preview — AI temporarily unavailable</p>
              <p className="text-xs text-amber-700 mt-1">
                {workflow.insights.gemini_error?.includes("503") || workflow.insights.gemini_error?.includes("UNAVAILABLE")
                  ? "Gemini is experiencing high demand right now. Try uploading again in a moment."
                  : workflow.insights.gemini_error?.includes("429") || workflow.insights.gemini_error?.includes("RESOURCE_EXHAUSTED")
                  ? "API rate limit reached. Please wait a few minutes and try again."
                  : "AI workflow generation failed. The rule-based preview is shown instead."}
              </p>
            </div>
          </div>
        )}

        {/* quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: "Steps",        value: stepCount,                          color: "text-blue-600",   icon: "📋" },
            { label: "Departments",  value: workflow.departments.length,         color: "text-purple-600", icon: "🏢" },
            { label: "Actors",       value: workflow.actors.length,              color: "text-indigo-600", icon: "👥" },
            { label: "Approvals",    value: workflow.insights.approval_count,    color: "text-amber-600",  icon: "✅" },
            { label: "Decision Pts", value: workflow.decision_points.length,     color: "text-violet-600", icon: "🔀" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <span className="text-xl mb-1">{s.icon}</span>
              <span className={`text-2xl font-extrabold ${s.color}`}>{s.value}</span>
              <span className="text-xs font-medium text-slate-500 mt-0.5">{s.label}</span>
            </div>
          ))}
        </div>

        {/* graph canvas & tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="flex items-center gap-4 border-b border-slate-200 px-4 bg-slate-50">
            {([
              { id: "flow", label: "Workflow Diagram" },
              { id: "mermaid", label: "Mermaid" },
              { id: "bpmn", label: "BPMN" }
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="w-full relative" style={{ minHeight: "400px" }}>
            {activeTab === "flow" && canvasEl}
            {activeTab === "mermaid" && (
              <div className="p-4 overflow-auto h-full text-sm">
                <SyntaxHighlighter language="markdown" style={vscDarkPlus} customStyle={{ margin: 0, borderRadius: '8px' }}>
                  {mermaidCode}
                </SyntaxHighlighter>
              </div>
            )}
            {activeTab === "bpmn" && (
              <div className="p-4 overflow-auto h-full text-sm">
                <SyntaxHighlighter language="xml" style={vscDarkPlus} customStyle={{ margin: 0, borderRadius: '8px' }}>
                  {bpmnCode}
                </SyntaxHighlighter>
              </div>
            )}
          </div>
        </div>

        {/* insights */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Insights</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-500">Complexity</span>
                <span className="text-lg">📊</span>
              </div>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-bold border ${complexityColor[workflow.insights.complexity] ?? complexityColor.Medium}`}>
                {workflow.insights.complexity}
              </span>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-500">Execution Time</span>
                <span className="text-lg">⏱️</span>
              </div>
              <span className="text-xl font-extrabold text-slate-900">{workflow.insights.estimated_execution_time}</span>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-500">Automation Score</span>
                <span className="text-lg">🤖</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className="h-2.5 rounded-full transition-all duration-700"
                    style={{
                      width: `${workflow.insights.automation_score}%`,
                      background: workflow.insights.automation_score > 60 ? "linear-gradient(90deg,#10b981,#059669)"
                        : workflow.insights.automation_score > 30 ? "linear-gradient(90deg,#f59e0b,#d97706)"
                        : "linear-gradient(90deg,#ef4444,#dc2626)",
                    }}
                  />
                </div>
                <span className="text-base font-extrabold text-slate-900">{workflow.insights.automation_score}%</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-500">Manual Steps</span>
                <span className="text-lg">🖐️</span>
              </div>
              <span className="text-xl font-extrabold text-slate-900">
                {workflow.insights.manual_steps}
                <span className="text-sm font-medium text-slate-400 ml-1">/ {stepCount}</span>
              </span>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-500">Approvals</span>
                <span className="text-lg">📝</span>
              </div>
              <span className="text-xl font-extrabold text-amber-600">{workflow.insights.approval_count}</span>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-500">Actors</span>
                <span className="text-lg">👥</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {workflow.actors.map((actor, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {actor}
                  </span>
                ))}
              </div>
            </div>

            {aiConfidence != null && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-500">AI Confidence</span>
                  <span className="text-lg">🧠</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className="h-2.5 rounded-full transition-all duration-700"
                      style={{
                        width: `${aiConfidence}%`,
                        background: aiConfidence > 80 ? "linear-gradient(90deg,#10b981,#059669)"
                          : aiConfidence > 50 ? "linear-gradient(90deg,#f59e0b,#d97706)"
                          : "linear-gradient(90deg,#ef4444,#dc2626)",
                      }}
                    />
                  </div>
                  <span className="text-base font-extrabold text-slate-900">{aiConfidence}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* automation opportunities */}
        {workflow.automation_opportunities && workflow.automation_opportunities.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Automation Opportunities</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {workflow.automation_opportunities.map((opp, i) => {
                const impactColor: Record<string, string> = {
                  High:   "bg-emerald-100 text-emerald-800 border-emerald-200",
                  Medium: "bg-amber-100 text-amber-800 border-amber-200",
                  Low:    "bg-slate-100 text-slate-700 border-slate-200",
                };
                return (
                  <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-slate-800">🤖 {opp.step_title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${impactColor[opp.impact ?? "Medium"] ?? impactColor.Medium}`}>
                        {opp.impact ?? "Medium"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{opp.suggestion}</p>
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
