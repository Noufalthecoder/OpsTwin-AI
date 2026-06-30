"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, Play, Activity, CheckCircle, Target, Users, Zap, Briefcase, ChevronRight, TrendingUp } from "lucide-react";
import DeploymentOverlay from "../../components/DeploymentOverlay";

export default function SimulatorPage() {
  const [activeScenarios, setActiveScenarios] = useState<string[]>([]);
  const [simulationData, setSimulationData] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isDeployOverlayOpen, setIsDeployOverlayOpen] = useState(false);

  const scenarios = [
    { id: "s1", name: "Remove Manual Approval", impact: "High", timeSaved: 12, costSaved: 45000, desc: "Bypass manual checks for level 1 items." },
    { id: "s2", name: "Automate Invoice Verification", impact: "High", timeSaved: 18, costSaved: 85000, desc: "Use OCR and AI to cross-match invoices." },
    { id: "s3", name: "Merge HR & Finance Onboarding", impact: "Medium", timeSaved: 8, costSaved: 24000, desc: "Combine overlapping data entry steps." },
    { id: "s4", name: "AI Policy Review", impact: "Medium", timeSaved: 5, costSaved: 15000, desc: "Pre-screen documents against compliance rules." },
  ];

  const baseMetrics = { time: 48, cost: 250000, roi: 0, steps: 12 };

  React.useEffect(() => {
    const runSimulation = async () => {
      setIsSimulating(true);
      try {
        const removed = activeScenarios.includes("s1") ? ["s1"] : [];
        const merged = activeScenarios.includes("s3") ? ["s3"] : [];
        // Map scenarios to backend payload logic
        const response = await fetch("http://localhost:8000/simulator/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflow_id: "wf_current",
            removed_steps: activeScenarios,
            merged_steps: []
          })
        });
        const data = await response.json();
        if (data.status === "success") {
          setSimulationData(data.simulation);
        }
      } catch (err) {
        console.error("Simulation error", err);
      } finally {
        setIsSimulating(false);
      }
    };
    runSimulation();
  }, [activeScenarios]);

  const currentMetrics = useMemo(() => {
    if (simulationData) {
      return {
        time: simulationData.processing_time_hours,
        cost: simulationData.cost_dollars,
        roi: baseMetrics.cost > 0 ? (((baseMetrics.cost - simulationData.cost_dollars) / baseMetrics.cost) * 100).toFixed(1) : "0.0",
        steps: baseMetrics.steps - activeScenarios.length
      };
    }

    let t = baseMetrics.time;
    let c = baseMetrics.cost;
    let s = baseMetrics.steps;

    activeScenarios.forEach(id => {
      const scenario = scenarios.find(x => x.id === id);
      if (scenario) {
        t -= scenario.timeSaved;
        c -= scenario.costSaved;
        s -= 1;
      }
    });

    const roi = baseMetrics.cost > 0 ? ((baseMetrics.cost - c) / baseMetrics.cost) * 100 : 0;

    return { time: t, cost: c, roi: roi.toFixed(1), steps: s };
  }, [activeScenarios, simulationData]);

  const deployOptimization = async () => {
    if (activeScenarios.length === 0) return;
    setIsDeployOverlayOpen(true);
  };

  const toggleScenario = (id: string) => {
    setActiveScenarios(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-4 md:p-8 pb-20 max-w-7xl mx-auto text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-2 flex items-center gap-3">
          <Calculator className="w-8 h-8 text-blue-500" />
          AI What-If Simulator
        </h1>
        <p className="text-gray-400">Simulate organizational changes and instantly predict the impact on time, cost, and efficiency.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Toggles */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xl font-semibold mb-4 text-slate-200 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Simulation Scenarios
          </h3>

          {scenarios.map(s => {
            const isActive = activeScenarios.includes(s.id);
            return (
              <motion.div
                key={s.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => toggleScenario(s.id)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 relative overflow-hidden ${isActive
                    ? "border-blue-500 bg-blue-900/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                    : "border-white/10 bg-[#111] hover:bg-[#1a1a1a]"
                  }`}
              >
                {isActive && (
                  <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
                )}
                <div className="flex items-start justify-between relative z-10">
                  <div className="pr-4">
                    <h4 className="text-lg font-bold mb-1">{s.name}</h4>
                    <p className="text-sm text-gray-400 leading-relaxed mb-3">{s.desc}</p>
                    <div className="flex gap-3 text-xs font-medium">
                      <span className="px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/20">
                        {s.impact} Impact
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-green-500/20 text-green-300 border border-green-500/20">
                        Save {s.timeSaved}h
                      </span>
                    </div>
                  </div>

                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isActive ? "border-blue-500 bg-blue-500" : "border-slate-600"
                    }`}>
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <CheckCircle className="w-4 h-4 text-white" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Right Column: Live Metrics */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl border border-white/10 bg-gradient-to-b from-[#111] to-[#050505] sticky top-6 shadow-2xl">
            <h3 className="text-lg font-semibold mb-6 text-slate-200 border-b border-white/10 pb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              Live Impact
            </h3>

            <div className="space-y-6">
              <div>
                <div className="text-sm text-gray-400 mb-1 font-medium">Total Cost</div>
                <div className="flex items-end gap-3">
                  <span className="text-4xl font-bold text-white">${currentMetrics.cost.toLocaleString('en-US')}</span>
                  {activeScenarios.length > 0 && (
                    <motion.span
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="text-green-400 text-sm font-semibold mb-1"
                    >
                      -${(baseMetrics.cost - currentMetrics.cost).toLocaleString('en-US')}
                    </motion.span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-400 mb-1 font-medium">Processing Time</div>
                <div className="flex items-end gap-3">
                  <span className="text-4xl font-bold text-white">{currentMetrics.time}h</span>
                  {activeScenarios.length > 0 && (
                    <motion.span
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="text-green-400 text-sm font-semibold mb-1"
                    >
                      -{baseMetrics.time - currentMetrics.time}h
                    </motion.span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Total Steps</div>
                  <div className="text-xl font-semibold text-slate-200">{currentMetrics.steps}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Est. ROI</div>
                  <div className="text-xl font-semibold text-blue-400 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    {currentMetrics.roi}%
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={deployOptimization}
              className={`w-full mt-8 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg ${activeScenarios.length > 0
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25"
                  : "bg-slate-800 text-slate-400 cursor-not-allowed"
                }`}
            >
              <Play className="w-4 h-4" fill="currentColor" />
              Deploy Optimization
            </button>
          </div>
        </div>
      </div>

      <DeploymentOverlay 
        isOpen={isDeployOverlayOpen}
        onClose={() => setIsDeployOverlayOpen(false)}
        scenarioName={activeScenarios.map(id => scenarios.find(s => s.id === id)?.name).join(" + ") || "Optimization Update"}
        scenarios={activeScenarios}
        metrics={{
          timeSaved: baseMetrics.time - currentMetrics.time,
          costSaved: baseMetrics.cost - currentMetrics.cost
        }}
      />
    </div>
  );
}
