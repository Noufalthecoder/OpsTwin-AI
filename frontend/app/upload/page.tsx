"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileText, CheckCircle, AlertCircle, Loader2, Clock, Building, Users, Tag, BarChart } from "lucide-react";
import axios from "axios";
import dynamic from "next/dynamic";
import type { WorkflowData } from "./WorkflowGraph";
import type { KnowledgeGraphData } from "./KnowledgeGraph";
import type { BottleneckReportData } from "./BottleneckReport";
import type { WorkflowOptimizationData } from "./optimizer/types";

const WorkflowGraph   = dynamic(() => import("./WorkflowGraph"),    { ssr: false });
const KnowledgeGraph  = dynamic(() => import("./KnowledgeGraph"),   { ssr: false });
const BottleneckReport = dynamic(() => import("./BottleneckReport"), { ssr: false });
const AIWorkflowPlayground = dynamic(() => import("./optimizer"), { ssr: false });
const CopilotPanel = dynamic(() => import("./CopilotPanel"), { ssr: false });

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  interface AnalysisResult {
    document_type: string;
    estimated_reading_time_mins: number;
    departments: string[];
    employees: string[];
    keywords: string[];
    summary: string;
    confidence: number;
  }

  const [result, setResult] = useState<{
    text: string;
    pages: number;
    filename: string;
    status: string;
    analysis?: AnalysisResult;
    workflow?: WorkflowData;
    knowledge_graph?: KnowledgeGraphData;
    bottleneck_report?: BottleneckReportData;
    optimization?: WorkflowOptimizationData;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Lemma AI is initializing...");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const saved = sessionStorage.getItem("opstwin_upload_result");
    if (saved) {
      try {
        setResult(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved result", e);
      }
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://localhost:8000/upload", formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percentCompleted);
          }
        },
      });

      if (response.data.status === "success") {
        setResult(response.data);
        sessionStorage.setItem("opstwin_upload_result", JSON.stringify(response.data));
      } else {
        setError(response.data.text || "Failed to process the document.");
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "An error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isUploading && progress === 100) {
      const messages = [
        "Lemma AI is reading your document...",
        "Lemma AI is extracting workflow entities...",
        "Lemma AI is building the knowledge graph...",
        "Lemma AI is identifying bottlenecks...",
        "Lemma AI is generating optimization strategies...",
        "Lemma AI is finalizing insights..."
      ];
      let msgIndex = 0;
      interval = setInterval(() => {
        msgIndex = (msgIndex + 1) % messages.length;
        setLoadingMessage(messages[msgIndex]);
      }, 2500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isUploading, progress]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Document Intelligence
          </h1>
          <p className="mt-4 text-lg text-slate-500">
            Upload your organizational documents (PDF, DOCX, TXT) and let OpsTwin AI extract insights.
          </p>
        </div>

        {/* Upload Zone */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 p-8 transition-all hover:shadow-2xl">
          <div
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer group ${
              isDragging
                ? "border-blue-500 bg-blue-50 scale-[1.02] shadow-md"
                : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-md hover:scale-[1.01]"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".pdf,.docx,.txt"
            />
            
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-blue-100 rounded-full text-blue-600 group-hover:scale-110 group-hover:bg-blue-200 transition-all duration-300">
                <UploadCloud size={40} className="group-hover:-translate-y-1 transition-transform duration-300" />
              </div>
              <div className="text-lg font-medium">
                {file ? (
                  <span className="text-slate-800 font-semibold">{file.name}</span>
                ) : (
                  <span>
                    Drag & drop your file here, or{" "}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-600 hover:text-blue-500 font-semibold focus:outline-none"
                    >
                      browse
                    </button>
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500">Supports PDF, DOCX, and TXT up to 50MB</p>
            </div>
          </div>

          {/* Actions & Progress */}
          {file && !result && (
            <div className="mt-8">
              {!isUploading ? (
                <button
                  onClick={handleUpload}
                  className="w-full flex items-center justify-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Upload and Process Document
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm font-medium text-slate-700">
                    <span>Uploading...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {progress === 100 && (
                    <div className="flex flex-col items-center justify-center mt-6 space-y-4">
                      <div className="relative flex items-center justify-center">
                        <div className="absolute inset-0 bg-blue-400 rounded-full blur-xl opacity-20 animate-pulse"></div>
                        <Loader2 className="animate-spin text-blue-600 relative z-10" size={32} />
                      </div>
                      <div className="flex items-center space-x-2 text-blue-700 font-medium">
                        <span className="animate-pulse">{loadingMessage}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center space-x-3">
              <AlertCircle className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Results Section */}
        {result && (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 text-white px-8 py-6 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="text-blue-400" />
                <h3 className="text-xl font-semibold">{result.filename}</h3>
              </div>
              <div className="flex items-center space-x-2 text-emerald-400 bg-slate-800 px-3 py-1 rounded-full text-sm font-medium">
                <CheckCircle size={16} />
                <span>Extracted {result.pages} Pages</span>
              </div>
            </div>
            
            <div className="p-8 bg-slate-50">
              {result.analysis && (
                <div className="mb-8">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                    Document Intelligence
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    
                    {/* Document Type & Confidence */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center space-x-2 text-slate-500 mb-2">
                          <FileText size={18} />
                          <span className="text-sm font-medium">Classification</span>
                        </div>
                        <div className="text-xl font-bold text-slate-900">{result.analysis.document_type}</div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-sm text-slate-500">Confidence</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {result.analysis.confidence}%
                        </span>
                      </div>
                    </div>

                    {/* Reading Time */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center space-x-2 text-slate-500 mb-2">
                          <Clock size={18} />
                          <span className="text-sm font-medium">Estimated Reading Time</span>
                        </div>
                        <div className="text-3xl font-extrabold text-blue-600">
                          {result.analysis.estimated_reading_time_mins} <span className="text-lg font-medium text-slate-500">mins</span>
                        </div>
                      </div>
                    </div>

                    {/* Departments */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center space-x-2 text-slate-500 mb-3">
                          <Building size={18} />
                          <span className="text-sm font-medium">Departments Mentioned</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {result.analysis.departments.map((dept, idx) => (
                            <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                              {dept}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Employees */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center space-x-2 text-slate-500 mb-3">
                          <Users size={18} />
                          <span className="text-sm font-medium">Employees Mentioned</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {result.analysis.employees.map((emp, idx) => (
                            <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                              {emp}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Keywords */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 md:col-span-2 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center space-x-2 text-slate-500 mb-3">
                          <Tag size={18} />
                          <span className="text-sm font-medium">Important Keywords</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {result.analysis.keywords.map((kw, idx) => (
                            <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Summary Block */}
                  <div className="mt-6 bg-blue-50/50 rounded-2xl p-6 border border-blue-100">
                    <h5 className="text-sm font-semibold text-blue-900 mb-2">AI Summary</h5>
                    <p className="text-blue-800 leading-relaxed">
                      {result.analysis.summary}
                    </p>
                  </div>
                </div>
              )}

              {/* ── Workflow Discovery Section ──────────────────────── */}
              {result.workflow && (
                <div className="mb-8">
                  <WorkflowGraph workflow={result.workflow} />
                </div>
              )}

              {/* ── Bottleneck Detection Section ─────────────────────── */}
              {result.bottleneck_report && (
                <div className="mb-8">
                  <BottleneckReport report={result.bottleneck_report} />
                </div>
              )}

              {/* ── AI Optimization Section ──────────────────────────── */}
              {result.optimization && result.workflow && (
                <div className="mb-8">
                  <AIWorkflowPlayground
                    optimization={result.optimization}
                    originalWorkflow={result.workflow}
                  />
                </div>
              )}

              {/* ── Knowledge Graph Section ─────────────────────────── */}
              {result.knowledge_graph && (
                <div className="mb-8">
                  <KnowledgeGraph kg={result.knowledge_graph} />
                </div>
              )}

              {/* ── AI Workflow Copilot ────────────────────────────── */}
              {result.workflow && (
                <div className="mb-8">
                  <CopilotPanel
                    workflow={result.workflow}
                    optimization={result.optimization}
                    documentText={result.text}
                    onApplyRecommendation={(action, args) => {
                      if (!result.optimization) return;
                      const updatedOptimization = { ...result.optimization };
                      
                      if (action === "AUTOMATE") {
                        updatedOptimization.automation_candidates = [
                          ...(updatedOptimization.automation_candidates || []),
                          { step_title: args.join(", "), suggestion: "Automated via AI Copilot", time_saved: "Variable" }
                        ];
                      } else if (action === "MERGE") {
                        updatedOptimization.merged_steps = [
                          ...(updatedOptimization.merged_steps || []),
                          { original_steps: args, new_step: "Consolidated Step", reason: "Merged via AI Copilot" }
                        ];
                      } else if (action === "REMOVE") {
                        updatedOptimization.removed_steps = [
                          ...(updatedOptimization.removed_steps || []),
                          { step_title: args.join(", "), reason: "Removed via AI Copilot", impact: "Efficiency improved" }
                        ];
                      }
                      
                      setResult({ ...result, optimization: updatedOptimization });
                    }}
                  />
                </div>
              )}

              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                Extracted Text
              </h4>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 overflow-y-auto max-h-[500px]">
                <pre className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed">
                  {result.text}
                </pre>
              </div>
              
              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => {
                    setResult(null);
                    setFile(null);
                    sessionStorage.removeItem("opstwin_upload_result");
                  }}
                  className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded-xl transition-colors"
                >
                  Upload Another File
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
