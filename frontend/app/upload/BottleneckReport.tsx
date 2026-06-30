"use client";

import { useMemo } from "react";

/* ─────────────────────────── types ─────────────────────────────────── */
export interface Bottleneck {
  severity: string;
  title: string;
  description: string;
  reason: string;
  impact: string;
  affected_steps: string[];
  affected_actors: string[];
  estimated_delay: string;
  recommendation: string;
  confidence: number;
}

export interface BottleneckSummary {
  overall_health_score: number;
  workflow_complexity: string;
  automation_readiness: string;
  estimated_time_savings: string;
  risk_score: number;
  ai_confidence: number;
  total_bottlenecks: number;
  high_severity: number;
  medium_severity: number;
  low_severity: number;
}

export interface BottleneckReportData {
  summary: BottleneckSummary;
  bottlenecks: Bottleneck[];
}

/* ─────────────────────────── severity palette ───────────────────────── */
const SEVERITY: Record<string, {
  badge: string; card: string; border: string; dot: string; icon: string;
}> = {
  High: {
    badge:  "bg-red-100 text-red-700 border border-red-200",
    card:   "bg-red-50/60 border-red-200",
    border: "border-l-red-500",
    dot:    "bg-red-500",
    icon:   "🔴",
  },
  Medium: {
    badge:  "bg-orange-100 text-orange-700 border border-orange-200",
    card:   "bg-orange-50/60 border-orange-200",
    border: "border-l-orange-400",
    dot:    "bg-orange-400",
    icon:   "🟠",
  },
  Low: {
    badge:  "bg-blue-100 text-blue-700 border border-blue-200",
    card:   "bg-blue-50/60 border-blue-200",
    border: "border-l-blue-400",
    dot:    "bg-blue-400",
    icon:   "🔵",
  },
};
const FALLBACK_SEV = SEVERITY.Medium;

/* ─────────────────────────── circular health ring ──────────────────── */
function HealthRing({ score }: { score: number }) {
  const R = 54;
  const CIRC = 2 * Math.PI * R;
  const filled = (score / 100) * CIRC;
  const gap = CIRC - filled;

  const color =
    score >= 75 ? "#10b981" :
    score >= 50 ? "#f59e0b" :
                  "#ef4444";

  const label =
    score >= 75 ? "Healthy" :
    score >= 50 ? "Moderate" :
                  "At Risk";

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={140} height={140} viewBox="0 0 140 140" className="-rotate-90">
        {/* track */}
        <circle cx={70} cy={70} r={R} fill="none" stroke="#e2e8f0" strokeWidth={12} />
        {/* filled arc */}
        <circle
          cx={70} cy={70} r={R}
          fill="none"
          stroke={color}
          strokeWidth={12}
          strokeDasharray={`${filled} ${gap}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      {/* centre label — absolutely positioned inside the SVG area */}
      <div className="absolute flex flex-col items-center pointer-events-none" style={{ marginTop: -96 }}>
        <span className="text-3xl font-black text-slate-900">{score}</span>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Health</span>
      </div>
      <span
        className="text-sm font-bold px-3 py-1 rounded-full"
        style={{ background: `${color}22`, color }}
      >
        {label}
      </span>
    </div>
  );
}

/* ─────────────────────────── score bar ─────────────────────────────── */
function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <span className="text-sm font-bold text-slate-700 w-10 text-right">{value}%</span>
    </div>
  );
}

/* ─────────────────────────── bottleneck card ───────────────────────── */
function BottleneckCard({ b }: { b: Bottleneck }) {
  const sev = SEVERITY[b.severity] ?? FALLBACK_SEV;
  const imp = SEVERITY[b.impact]   ?? FALLBACK_SEV;

  return (
    <div className={`rounded-2xl border ${sev.card} border-l-4 ${sev.border} p-5 space-y-3 transition-shadow hover:shadow-md`}>

      {/* title row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{sev.icon}</span>
          <h5 className="text-base font-bold text-slate-900 leading-tight">{b.title}</h5>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sev.badge}`}>
            {b.severity}
          </span>
        </div>
      </div>

      {/* description */}
      <p className="text-sm text-slate-700 leading-relaxed">{b.description}</p>

      {/* reason */}
      <div className="bg-white/70 rounded-xl p-3 border border-white">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Root Cause</p>
        <p className="text-sm text-slate-700">{b.reason}</p>
      </div>

      {/* meta row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/70 rounded-xl p-3 border border-white">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Business Impact</p>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${imp.badge}`}>{b.impact}</span>
        </div>
        <div className="bg-white/70 rounded-xl p-3 border border-white">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Est. Delay</p>
          <p className="text-sm font-bold text-slate-800">⏱ {b.estimated_delay}</p>
        </div>
      </div>

      {/* affected */}
      {(b.affected_steps.length > 0 || b.affected_actors.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {b.affected_steps.length > 0 && (
            <div className="bg-white/70 rounded-xl p-3 border border-white">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Affected Steps</p>
              <div className="flex flex-wrap gap-1">
                {b.affected_steps.map((s, i) => (
                  <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {b.affected_actors.length > 0 && (
            <div className="bg-white/70 rounded-xl p-3 border border-white">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Affected Actors</p>
              <div className="flex flex-wrap gap-1">
                {b.affected_actors.map((a, i) => (
                  <span key={i} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100">
                    👤 {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* recommendation */}
      <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
        <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">💡 Recommendation</p>
        <p className="text-sm text-emerald-900 leading-relaxed">{b.recommendation}</p>
      </div>

      {/* confidence */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-slate-400 font-medium">AI Confidence</span>
        <div className="flex items-center gap-2">
          <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-1.5 rounded-full"
              style={{
                width: `${b.confidence}%`,
                background: b.confidence > 80 ? "#10b981" : b.confidence > 50 ? "#f59e0b" : "#ef4444",
              }}
            />
          </div>
          <span className="text-xs font-bold text-slate-600">{b.confidence}%</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── main component ────────────────────────── */
export default function BottleneckReport({ report }: { report: BottleneckReportData }) {
  const { summary, bottlenecks } = report;

  const complexityColor: Record<string, string> = {
    Low:    "text-emerald-700 bg-emerald-50 border-emerald-200",
    Medium: "text-amber-700 bg-amber-50 border-amber-200",
    High:   "text-red-700 bg-red-50 border-red-200",
  };

  const readinessColor: Record<string, string> = {
    Low:    "text-red-700 bg-red-50 border-red-200",
    Medium: "text-amber-700 bg-amber-50 border-amber-200",
    High:   "text-emerald-700 bg-emerald-50 border-emerald-200",
  };

  const riskGrad =
    summary.risk_score > 66 ? "linear-gradient(90deg,#ef4444,#dc2626)" :
    summary.risk_score > 33 ? "linear-gradient(90deg,#f59e0b,#d97706)" :
                              "linear-gradient(90deg,#10b981,#059669)";

  const healthGrad =
    summary.overall_health_score >= 75 ? "linear-gradient(90deg,#10b981,#059669)" :
    summary.overall_health_score >= 50 ? "linear-gradient(90deg,#f59e0b,#d97706)" :
                                         "linear-gradient(90deg,#ef4444,#dc2626)";

  return (
    <div className="space-y-8">

      {/* ── Section Header ───────────────────────────────────────── */}
      <div>
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
          AI Bottleneck Detection
        </h4>
        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Process Health Analysis
        </h3>
        <p className="mt-1 text-sm text-slate-500 max-w-2xl">
          Gemini analysed your workflow for inefficiencies, delays, and operational risks.
        </p>
      </div>

      {/* ── Summary panel ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">

          {/* Health ring */}
          <div className="flex flex-col items-center justify-center gap-2 relative">
            <HealthRing score={summary.overall_health_score} />
          </div>

          {/* Score bars */}
          <div className="space-y-4 lg:col-span-2">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-slate-600">Overall Health</span>
                <span className="text-sm font-bold text-slate-800">{summary.overall_health_score}%</span>
              </div>
              <ScoreBar value={summary.overall_health_score} color={healthGrad} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-slate-600">Risk Score</span>
                <span className="text-sm font-bold text-slate-800">{summary.risk_score}%</span>
              </div>
              <ScoreBar value={summary.risk_score} color={riskGrad} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-slate-600">AI Confidence</span>
                <span className="text-sm font-bold text-slate-800">{summary.ai_confidence}%</span>
              </div>
              <ScoreBar value={summary.ai_confidence}
                color={summary.ai_confidence > 80 ? "linear-gradient(90deg,#10b981,#059669)"
                  : summary.ai_confidence > 50 ? "linear-gradient(90deg,#f59e0b,#d97706)"
                  : "linear-gradient(90deg,#ef4444,#dc2626)"}
              />
            </div>
          </div>
        </div>

        {/* summary metric grid */}
        <div className="border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-slate-100">
          {[
            { label: "Total Issues",     value: summary.total_bottlenecks, color: "text-slate-800" },
            { label: "High Severity",    value: summary.high_severity,     color: "text-red-600" },
            { label: "Medium",           value: summary.medium_severity,   color: "text-orange-500" },
            { label: "Low",              value: summary.low_severity,      color: "text-blue-600" },
            { label: "Time Savings",     value: summary.estimated_time_savings, color: "text-emerald-600", isText: true },
            { label: "AI Confidence",    value: `${summary.ai_confidence}%`, color: "text-indigo-600", isText: true },
          ].map((m) => (
            <div key={m.label} className="p-4 flex flex-col items-center text-center">
              <span className={`${m.isText ? "text-lg" : "text-2xl"} font-extrabold ${m.color}`}>{m.value}</span>
              <span className="text-xs font-medium text-slate-400 mt-0.5">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Meta cards row ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Workflow Complexity</span>
            <span className="text-lg">📊</span>
          </div>
          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-bold border ${complexityColor[summary.workflow_complexity] ?? complexityColor.Medium}`}>
            {summary.workflow_complexity}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Automation Readiness</span>
            <span className="text-lg">🤖</span>
          </div>
          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-bold border ${readinessColor[summary.automation_readiness] ?? readinessColor.Medium}`}>
            {summary.automation_readiness}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Est. Time Savings</span>
            <span className="text-lg">⏳</span>
          </div>
          <span className="text-xl font-extrabold text-emerald-700">{summary.estimated_time_savings}</span>
        </div>
      </div>

      {/* ── Bottleneck cards ──────────────────────────────────────── */}
      <div>
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
          Detected Bottlenecks
          {bottlenecks.length > 0 && (
            <span className="ml-2 normal-case font-bold text-slate-600">({bottlenecks.length})</span>
          )}
        </h4>

        {bottlenecks.length === 0 ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">✅</div>
            <h5 className="text-lg font-bold text-emerald-800 mb-1">No Significant Bottlenecks Detected</h5>
            <p className="text-sm text-emerald-700">
              This workflow appears well-structured with no major inefficiencies identified.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {bottlenecks.map((b, i) => (
              <BottleneckCard key={i} b={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
