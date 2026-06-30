"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
  NodeProps,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";

/* ─────────────────────────── types ─────────────────────────────────── */
export interface KGNode { id: string; label: string; type: string; description?: string; }
export interface KGEdge { source: string; target: string; relationship: string; label?: string; }
export interface KGInsights {
  total_nodes: number; total_edges: number; total_departments: number;
  total_employees: number; total_systems: number; total_technologies: number;
  total_relationships: number; graph_density: number;
  most_connected_department?: string | null; most_connected_employee?: string | null;
  ai_confidence?: number | null;
}
export interface KnowledgeGraphData { nodes: KGNode[]; edges: KGEdge[]; insights: KGInsights; }

/* ─────────────────────────── palette ───────────────────────────────── */
const TYPE_PALETTE: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  department: { bg: "linear-gradient(135deg,#3b82f6,#2563eb)", border: "#2563eb", text: "#fff", icon: "🏢" },
  employee:   { bg: "linear-gradient(135deg,#10b981,#059669)", border: "#059669", text: "#fff", icon: "👤" },
  team:       { bg: "linear-gradient(135deg,#06b6d4,#0891b2)", border: "#0891b2", text: "#fff", icon: "👥" },
  role:       { bg: "linear-gradient(135deg,#8b5cf6,#7c3aed)", border: "#7c3aed", text: "#fff", icon: "🎭" },
  project:    { bg: "linear-gradient(135deg,#ec4899,#db2777)", border: "#db2777", text: "#fff", icon: "🚀" },
  system:     { bg: "linear-gradient(135deg,#f59e0b,#d97706)", border: "#d97706", text: "#fff", icon: "⚙️" },
  technology: { bg: "linear-gradient(135deg,#14b8a6,#0d9488)", border: "#0d9488", text: "#fff", icon: "💻" },
  document:   { bg: "linear-gradient(135deg,#94a3b8,#64748b)", border: "#64748b", text: "#fff", icon: "📄" },
  task:       { bg: "linear-gradient(135deg,#a855f7,#9333ea)", border: "#9333ea", text: "#fff", icon: "✅" },
  approval:   { bg: "linear-gradient(135deg,#ef4444,#dc2626)", border: "#dc2626", text: "#fff", icon: "🔐" },
};
const FALLBACK = { bg: "linear-gradient(135deg,#64748b,#475569)", border: "#475569", text: "#fff", icon: "•" };

/* ─────────────────────────── node size ─────────────────────────────── */
const KG_NODE_W = 180;
const KG_NODE_H = 70;

/* ─────────────────────────── dagre layout ──────────────────────────── */
function applyKGLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph({ compound: true });
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 50, ranksep: 120, marginx: 60, marginy: 60 });

  nodes.forEach((n) => g.setNode(n.id, { width: KG_NODE_W, height: KG_NODE_H }));
  edges.forEach((e) => { try { g.setEdge(e.source, e.target); } catch { /* skip */ } });
  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    if (!pos) return n;
    return {
      ...n,
      position: { x: pos.x - KG_NODE_W / 2, y: pos.y - KG_NODE_H / 2 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
  });
}

/* ─────────────────────────── custom node ───────────────────────────── */
function KGNodeComponent({ data }: NodeProps) {
  const d = data as { label: string; nodeType: string; description: string; dimmed: boolean };
  const palette = TYPE_PALETTE[d.nodeType] || FALLBACK;

  return (
    <div
      style={{
        background: palette.bg,
        border: `2px solid ${palette.border}`,
        borderRadius: 14,
        padding: "10px 14px",
        width: KG_NODE_W,
        color: palette.text,
        boxShadow: d.dimmed ? "none" : `0 2px 14px ${palette.border}44`,
        opacity: d.dimmed ? 0.2 : 1,
        transition: "opacity .2s, box-shadow .2s",
        cursor: "pointer",
        userSelect: "none",
      }}
      title={d.description || d.label}
    >
      <Handle type="target" position={Position.Left}
        style={{ background: palette.border, width: 8, height: 8, border: "2px solid #fff", left: -4 }} />

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 14 }}>{palette.icon}</span>
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", opacity: .75, letterSpacing: ".5px" }}>
          {d.nodeType}
        </span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3, wordBreak: "break-word" }}>
        {d.label}
      </div>

      <Handle type="source" position={Position.Right}
        style={{ background: palette.border, width: 8, height: 8, border: "2px solid #fff", right: -4 }} />
    </div>
  );
}

const kgNodeTypes = { kgNode: KGNodeComponent };

/* ─────────────────────────── legend ────────────────────────────────── */
function Legend() {
  return (
    <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-2xl p-3 shadow-lg border border-slate-200 z-10 pointer-events-none">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Legend</p>
      <div className="grid grid-cols-2 gap-x-5 gap-y-1.5">
        {Object.entries(TYPE_PALETTE).map(([type, p]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div style={{ width: 9, height: 9, borderRadius: 3, background: p.border, flexShrink: 0 }} />
            <span className="text-xs text-slate-600 capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
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

/* ─────────────────────────── inner canvas ───────────────────────────── */
function KGCanvas({
  initNodes, initEdges, kg, isFullscreen,
}: {
  initNodes: Node[];
  initEdges: Edge[];
  kg: KnowledgeGraphData;
  isFullscreen: boolean;
}) {
  const { fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedData, setSelectedData] = useState<KGNode | null>(null);
  const didFit = useRef(false);

  // fitView once on mount
  useEffect(() => {
    if (!didFit.current) {
      const t = setTimeout(() => { fitView({ padding: 0.15, duration: 400 }); didFit.current = true; }, 100);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // re-fit when entering fullscreen
  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.15, duration: 300 }), 100);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullscreen]);

  // Highlight neighbours on click, fade rest
  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const clickedId = node.id;

    if (selectedId === clickedId) {
      // deselect
      setSelectedId(null);
      setSelectedData(null);
      setNodes((ns) => ns.map((n) => ({ ...n, data: { ...n.data, dimmed: false } })));
      setEdges((es) => es.map((e) => ({ ...e, style: { ...e.style, opacity: 1 }, animated: true })));
      return;
    }

    setSelectedId(clickedId);
    setSelectedData(kg.nodes.find((n) => n.id === clickedId) ?? null);

    const connected = new Set<string>([clickedId]);
    kg.edges.forEach((e) => {
      if (e.source === clickedId) connected.add(e.target);
      if (e.target === clickedId) connected.add(e.source);
    });

    setNodes((ns) =>
      ns.map((n) => ({ ...n, data: { ...n.data, dimmed: !connected.has(n.id) } })),
    );
    setEdges((es) =>
      es.map((e) => {
        const active = e.source === clickedId || e.target === clickedId;
        return { ...e, style: { ...e.style, opacity: active ? 1 : 0.08 }, animated: active };
      }),
    );
  }, [selectedId, kg.edges, kg.nodes, setNodes, setEdges]);

  const handlePaneClick = useCallback(() => {
    setSelectedId(null);
    setSelectedData(null);
    setNodes((ns) => ns.map((n) => ({ ...n, data: { ...n.data, dimmed: false } })));
    setEdges((es) => es.map((e) => ({ ...e, style: { ...e.style, opacity: 1 }, animated: true })));
  }, [setNodes, setEdges]);

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={kgNodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        proOptions={{ hideAttribution: true }}
        minZoom={0.1}
        maxZoom={2.5}
        nodesDraggable
        nodesConnectable={false}
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
          nodeColor={(n) => TYPE_PALETTE[(n.data as { nodeType: string }).nodeType]?.border ?? "#94a3b8"}
          maskColor="rgba(241,245,249,.8)"
          style={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
        />
        <Legend />
      </ReactFlow>

      {/* inline node detail panel (inside canvas, bottom-right) */}
      {selectedData && (
        <div className="absolute bottom-4 right-4 z-10 w-64 bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-slate-200 pointer-events-none">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{TYPE_PALETTE[selectedData.type]?.icon ?? "•"}</span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{selectedData.type}</p>
              <p className="text-sm font-bold text-slate-900 leading-tight">{selectedData.label}</p>
            </div>
          </div>
          {selectedData.description && (
            <p className="text-xs text-slate-600 leading-relaxed mb-2">{selectedData.description}</p>
          )}
          <div className="flex gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span><strong className="text-slate-700">Out:</strong> {kg.edges.filter((e) => e.source === selectedData.id).length}</span>
            <span><strong className="text-slate-700">In:</strong> {kg.edges.filter((e) => e.target === selectedData.id).length}</span>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────── main component ────────────────────────── */
export default function KnowledgeGraph({ kg }: { kg: KnowledgeGraphData }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [search, setSearch] = useState("");

  // Escape closes fullscreen
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setIsFullscreen(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* build laid-out nodes + edges (memoised, stable until kg changes) */
  const { initNodes, initEdges } = useMemo(() => {
    const rawNodes: Node[] = kg.nodes.map((n) => ({
      id: n.id,
      type: "kgNode",
      position: { x: 0, y: 0 },
      data: { label: n.label, nodeType: n.type, description: n.description ?? "", dimmed: false },
      selectable: true,
    }));

    const rawEdges: Edge[] = kg.edges.map((e, i) => {
      const palette = TYPE_PALETTE[kg.nodes.find((n) => n.id === e.source)?.type ?? "task"] ?? FALLBACK;
      return {
        id: `ke-${i}`,
        source: e.source,
        target: e.target,
        label: (e.label || e.relationship).replace(/_/g, " "),
        type: "smoothstep",
        animated: true,
        style: { stroke: palette.border, strokeWidth: 1.6, opacity: 1 },
        labelStyle: { fontSize: 9, fill: "#64748b", fontWeight: 600 },
        labelBgStyle: { fill: "#f8fafc", fillOpacity: 0.9 },
        markerEnd: { type: MarkerType.ArrowClosed, color: palette.border, width: 12, height: 12 },
      };
    });

    const laid = applyKGLayout(rawNodes, rawEdges);
    return { initNodes: laid, initEdges: rawEdges };
  }, [kg]);

  /* search filter — highlight matching nodes */
  const searchLower = search.toLowerCase().trim();
  const matchIds = searchLower
    ? new Set(kg.nodes.filter((n) => n.label.toLowerCase().includes(searchLower) || n.type.toLowerCase().includes(searchLower)).map((n) => n.id))
    : null;

  const displayNodes = matchIds
    ? initNodes.map((n) => ({ ...n, data: { ...n.data, dimmed: !matchIds.has(n.id) } }))
    : initNodes;

  /* stats */
  const { insights } = kg;
  const densityPct = (insights.graph_density * 100).toFixed(2);

  const canvasHeight = isFullscreen ? "100%" : Math.max(560, Math.min(kg.nodes.length * 22 + 200, 820));

  const canvasEl = (
    <div className="relative w-full" style={{ height: canvasHeight }}>
      <ReactFlowProvider>
        <KGCanvas initNodes={displayNodes} initEdges={initEdges} kg={kg} isFullscreen={isFullscreen} />
      </ReactFlowProvider>
      {!isFullscreen && <FullscreenButton onClick={() => setIsFullscreen(true)} />}
    </div>
  );

  return (
    <>
      {/* ── Fullscreen modal ──────────────────────────────────────── */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Knowledge Graph</p>
              <h2 className="text-lg font-bold text-white truncate">Digital Twin — Entity Map</h2>
            </div>
            {/* search in fullscreen */}
            <div className="flex-1 max-w-xs">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search nodes…"
                className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-medium transition-colors shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </svg>
              Exit <span className="text-slate-500 text-xs ml-1">Esc</span>
            </button>
          </div>
          <div className="flex-1 overflow-hidden bg-slate-900">{canvasEl}</div>
        </div>
      )}

      {/* ── Inline section ────────────────────────────────────────── */}
      <div className="space-y-6">

        {/* header + search */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              Organizational Knowledge Graph
            </h4>
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Digital Twin — Entity Map</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-2xl">
              Every entity and relationship extracted from your document. Click any node to highlight its connections.
            </p>
          </div>
          <div className="shrink-0">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search nodes…"
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
            />
          </div>
        </div>

        {/* quick stats */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { label: "Nodes",        value: insights.total_nodes,        color: "text-blue-600",   icon: "🔵" },
            { label: "Edges",        value: insights.total_edges,        color: "text-indigo-600", icon: "🔗" },
            { label: "Departments",  value: insights.total_departments,  color: "text-blue-700",   icon: "🏢" },
            { label: "Employees",    value: insights.total_employees,    color: "text-emerald-600",icon: "👤" },
            { label: "Systems",      value: insights.total_systems,      color: "text-amber-600",  icon: "⚙️" },
            { label: "Technologies", value: insights.total_technologies, color: "text-teal-600",   icon: "💻" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <span className="text-xl mb-1">{s.icon}</span>
              <span className={`text-2xl font-extrabold ${s.color}`}>{s.value}</span>
              <span className="text-xs font-medium text-slate-500 mt-0.5">{s.label}</span>
            </div>
          ))}
        </div>

        {/* canvas */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {canvasEl}
        </div>

        {/* graph insights */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Graph Insights</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-500">Graph Density</span>
                <span className="text-lg">📡</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className="h-2.5 rounded-full" style={{ width: `${Math.min(parseFloat(densityPct) * 10, 100)}%`, background: "linear-gradient(90deg,#3b82f6,#2563eb)" }} />
                </div>
                <span className="text-sm font-bold text-slate-800">{densityPct}%</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-500">Top Department</span>
                <span className="text-lg">🏆</span>
              </div>
              <span className="text-sm font-bold text-blue-700 break-words">{insights.most_connected_department || "—"}</span>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-500">Top Employee</span>
                <span className="text-lg">👑</span>
              </div>
              <span className="text-sm font-bold text-emerald-700 break-words">{insights.most_connected_employee || "—"}</span>
            </div>

            {insights.ai_confidence != null && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-500">AI Confidence</span>
                  <span className="text-lg">🧠</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className="h-2.5 rounded-full transition-all duration-700"
                      style={{
                        width: `${insights.ai_confidence}%`,
                        background: insights.ai_confidence > 80 ? "linear-gradient(90deg,#10b981,#059669)"
                          : insights.ai_confidence > 50 ? "linear-gradient(90deg,#f59e0b,#d97706)"
                          : "linear-gradient(90deg,#ef4444,#dc2626)",
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-800">{insights.ai_confidence}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
