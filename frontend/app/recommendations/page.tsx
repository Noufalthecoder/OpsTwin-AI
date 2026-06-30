"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch("http://localhost:8000/optimization/recommendations")
      .then(res => res.json())
      .then(data => {
        if (data.status === "success") {
          setRecommendations(data.recommendations);
        }
      })
      .catch(err => console.error(err));
  }, []);
  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto text-white">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-2">AI Recommendations Center</h1>
        <p className="text-gray-400">Discover and apply AI-driven improvements for your workflows.</p>
      </div>
      <div className="grid gap-6">
        {recommendations.length > 0 ? recommendations.map((rec, i) => (
          <div key={i} className="p-6 rounded-2xl border border-white/10 bg-[#0A0A0B]/80 backdrop-blur-xl flex justify-between items-center hover:border-blue-500/50 transition-colors">
            <div>
              <h3 className="text-xl font-bold mb-2">{rec.title}</h3>
              <div className="flex gap-4 text-sm text-gray-400">
                <span>Impact: <strong className="text-blue-400">{rec.impact}</strong></span>
                <span>Savings: <strong className="text-green-400">{rec.savings}</strong></span>
                <span>Category: <strong className="text-purple-400">{rec.type}</strong></span>
              </div>
            </div>
            <button 
              onClick={() => router.push("/simulator")}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-blue-500/25"
            >
              Apply Simulation
            </button>
          </div>
        )) : (
          <div className="text-center text-gray-500 mt-10">Loading recommendations...</div>
        )}
      </div>
    </div>
  );
}
