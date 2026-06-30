"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Clock, Loader2, Database, AlertCircle, FileText, Share2, Target, Shield, MessageSquare } from "lucide-react";

export default function MonitorPage() {
  const [agents, setAgents] = useState([
    { id: "doc", name: "Document Intelligence", icon: <FileText className="w-5 h-5" />, provider: "Lemma", status: "Idle", time: "-", tokens: "-", successRate: "-" },
    { id: "workflow", name: "Workflow Discovery", icon: <Share2 className="w-5 h-5" />, provider: "Lemma", status: "Idle", time: "-", tokens: "-", successRate: "-" },
    { id: "kg", name: "Knowledge Graph", icon: <Database className="w-5 h-5" />, provider: "Lemma", status: "Idle", time: "-", tokens: "-", successRate: "-" },
    { id: "optimization", name: "Workflow Optimization", icon: <Target className="w-5 h-5" />, provider: "Lemma", status: "Idle", time: "-", tokens: "-", successRate: "-" },
    { id: "compliance", name: "Compliance", icon: <Shield className="w-5 h-5" />, provider: "Lemma", status: "Idle", time: "-", tokens: "-", successRate: "-" },
    { id: "copilot", name: "Workflow Copilot", icon: <MessageSquare className="w-5 h-5" />, provider: "Lemma", status: "Idle", time: "-", tokens: "-", successRate: "-" },
  ]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("http://localhost:8000/monitor/status");
        const data = await res.json();
        setAgents(prev => prev.map(agent => ({
          ...agent,
          ...data[agent.id]
        })));
      } catch (err) {}
    };

    const interval = setInterval(fetchStatus, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto text-white">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-2">Live Agent Monitor</h1>
        <p className="text-gray-400">Real-time status of Lemma Agent execution pipeline.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {agents.map((agent, i) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`p-5 rounded-2xl border ${
              agent.status === "Running" 
                ? "border-blue-500/50 bg-blue-900/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]" 
                : agent.status === "Completed"
                ? "border-green-500/30 bg-green-900/5"
                : "border-white/5 bg-[#111]"
            } backdrop-blur-sm relative overflow-hidden`}
          >
            {agent.status === "Running" && (
                <div className="absolute top-0 left-0 w-full h-1 bg-white/10">
                    <motion.div
                        className="h-full bg-blue-500"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                </div>
            )}
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2 rounded-lg ${agent.status === 'Completed' ? 'bg-green-500/20 text-green-400' : agent.status === 'Running' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-400'}`}>
                {agent.icon}
              </div>
              <div className="flex items-center gap-2">
                {agent.status === "Completed" && <CheckCircle className="w-5 h-5 text-green-500" />}
                {agent.status === "Running" && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                {agent.status === "Idle" && <Clock className="w-5 h-5 text-gray-600" />}
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  agent.status === "Running" ? "bg-blue-500/20 text-blue-300" :
                  agent.status === "Completed" ? "bg-green-500/20 text-green-300" :
                  "bg-white/10 text-gray-400"
                }`}>
                  {agent.status}
                </span>
              </div>
            </div>

            <h3 className="text-lg font-semibold mb-3">{agent.name}</h3>

            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex justify-between">
                <span>Provider</span>
                <span className="text-gray-200">{agent.provider}</span>
              </div>
              <div className="flex justify-between">
                <span>Execution Time</span>
                <span className="text-gray-200">{agent.time}</span>
              </div>
              <div className="flex justify-between">
                <span>Tokens Used</span>
                <span className="text-gray-200">{agent.tokens}</span>
              </div>
              <div className="flex justify-between">
                <span>Success Rate</span>
                <span className="text-gray-200">{agent.successRate}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
