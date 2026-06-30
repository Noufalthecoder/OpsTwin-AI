"use client";

import React, { useState } from "react";
import { Download, FileText, Image as ImageIcon, Code2, Presentation, Share2, Loader2, Check } from "lucide-react";
import { OptimizerProps } from "./types";
import { toast } from "react-hot-toast";
import axios from "axios";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import pptxgen from "pptxgenjs";
import { create } from "xmlbuilder2";
import * as htmlToImage from "html-to-image";

export function ExportCenter({ optimization, originalWorkflow }: OptimizerProps) {
  const [sharing, setSharing] = useState(false);
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  const [exportingStates, setExportingStates] = useState<Record<number, boolean>>({});

  const handleShare = async () => {
    try {
      setSharing(true);
      const res = await axios.post("http://localhost:8000/api/share/", {
        workflow: originalWorkflow,
        optimization: optimization
      });
      setSharedUrl(res.data.url);
      navigator.clipboard.writeText(res.data.url);
      toast.success("Share link copied to clipboard!");
    } catch (err) {
      toast.error("Failed to generate share link.");
    } finally {
      setSharing(false);
    }
  };

  const handleExportPDF = async () => {
    const doc = new jsPDF();
    
    // Header
    doc.setTextColor(30, 58, 138); // blue-900
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("OpsTwin AI", 20, 30);
    
    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("Powered by Lemma", 20, 38);
    
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Executive Summary", 20, 55);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const splitText = doc.splitTextToSize(optimization.executive_summary || "Workflow optimization completed.", 170);
    doc.text(splitText, 20, 65);
    
    let yPos = 65 + (splitText.length * 6) + 15;
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Optimization Metrics", 20, yPos);
    yPos += 10;
    
    doc.setFontSize(11);
    const metrics = [
      { label: "Steps Reduced:", value: String(optimization.step_reduction || '-') },
      { label: "Automation Score:", value: `${optimization.automation_score || 0}%` },
      { label: "Estimated Time Saved:", value: String(optimization.estimated_time_saved || '-') },
      { label: "Estimated Cost Saved:", value: String(optimization.estimated_cost_saved || '-') }
    ];
    
    metrics.forEach(m => {
      doc.setFont("helvetica", "bold");
      doc.text(m.label, 20, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(m.value, 65, yPos);
      yPos += 8;
    });

    doc.save("OpsTwin-Executive-Summary.pdf");
  };

  const handleExportBPMN = async () => {
    const root = create({ version: "1.0", encoding: "UTF-8" })
      .ele("bpmn:definitions", {
        "xmlns:bpmn": "http://www.omg.org/spec/BPMN/20100524/MODEL",
        "id": "Definitions_1",
        "targetNamespace": "http://bpmn.io/schema/bpmn"
      })
      .ele("bpmn:process", { id: "Process_1", isExecutable: "true" });

    optimization.optimized_graph.forEach(step => {
      root.ele("bpmn:task", { id: `Task_${step.id}`, name: step.title }).up();
    });

    const xml = root.end({ prettyPrint: true });
    const blob = new Blob([xml], { type: "application/xml" });
    saveAs(blob, "workflow.bpmn");
  };

  const handleExportMermaid = async () => {
    let mermaid = "graph TD;\n";
    optimization.optimized_graph.forEach(step => {
      mermaid += `  ${step.id}["${step.title}"];\n`;
      if (step.dependencies) {
        step.dependencies.forEach(dep => {
          mermaid += `  ${dep} --> ${step.id};\n`;
        });
      }
    });
    const blob = new Blob([mermaid], { type: "text/markdown" });
    saveAs(blob, "workflow.mermaid.md");
  };

  const handleExportJSON = async () => {
    const blob = new Blob([JSON.stringify(optimization, null, 2)], { type: "application/json" });
    saveAs(blob, "optimization-data.json");
  };

  const handleExportPPTX = async () => {
    const pptx = new pptxgen();
    
    // Slide 1: Title & Metrics
    const slide = pptx.addSlide();
    slide.addText("OpsTwin AI", { x: 0.5, y: 0.5, w: 8, fontSize: 36, bold: true, color: "1E3A8A" });
    slide.addText("Powered by Lemma", { x: 0.5, y: 1.1, w: 8, fontSize: 14, italic: true, color: "64748B" });
    
    slide.addText("Optimization Report", { x: 0.5, y: 2.0, w: 8, fontSize: 24, bold: true, color: "0F172A" });
    
    slide.addText([
      { text: "Current Steps: ", options: { bold: true, color: "334155" } },
      { text: String(optimization.current_steps || '-'), options: { color: "0F172A" } }
    ], { x: 0.5, y: 2.8, fontSize: 16 });
    
    slide.addText([
      { text: "Optimized Steps: ", options: { bold: true, color: "334155" } },
      { text: String(optimization.optimized_steps || '-'), options: { color: "0F172A" } }
    ], { x: 0.5, y: 3.3, fontSize: 16 });
    
    slide.addText([
      { text: "Time Saved: ", options: { bold: true, color: "334155" } },
      { text: String(optimization.estimated_time_saved || '-'), options: { color: "0F172A" } }
    ], { x: 0.5, y: 3.8, fontSize: 16 });
    
    slide.addText([
      { text: "Cost Saved: ", options: { bold: true, color: "334155" } },
      { text: String(optimization.estimated_cost_saved || '-'), options: { color: "0F172A" } }
    ], { x: 0.5, y: 4.3, fontSize: 16 });
    
    // Slide 2: Executive Summary
    const slide2 = pptx.addSlide();
    slide2.addText("OpsTwin AI", { x: 0.5, y: 0.4, w: 8, fontSize: 20, bold: true, color: "1E3A8A" });
    slide2.addText("Powered by Lemma", { x: 0.5, y: 0.8, w: 8, fontSize: 12, italic: true, color: "64748B" });
    
    slide2.addText("Executive Summary", { x: 0.5, y: 1.5, fontSize: 24, bold: true, color: "0F172A" });
    slide2.addText(optimization.executive_summary || "Workflow optimization completed.", { x: 0.5, y: 2.2, w: 9, h: 3, fontSize: 14, color: "334155", valign: "top" });

    await pptx.writeFile({ fileName: "OpsTwin-Report.pptx" });
  };

  const handleExportPNG = async () => {
    const el = document.querySelector(".react-flow") as HTMLElement;
    if (!el) {
      toast.error("Graph not found on page.");
      return;
    }
    const dataUrl = await htmlToImage.toPng(el, { backgroundColor: "#ffffff" });
    saveAs(dataUrl, "workflow-graph.png");
  };

  const exportOptions = [
    { label: "Executive PDF", icon: <FileText className="w-5 h-5 text-rose-500" />, desc: "Full detailed report for stakeholders", action: handleExportPDF },
    { label: "Export BPMN", icon: <Code2 className="w-5 h-5 text-blue-500" />, desc: "Standard business process model", action: handleExportBPMN },
    { label: "Mermaid Graph", icon: <Code2 className="w-5 h-5 text-emerald-500" />, desc: "Markdown compatible graph", action: handleExportMermaid },
    { label: "Export JSON", icon: <Code2 className="w-5 h-5 text-amber-500" />, desc: "Raw optimization data", action: handleExportJSON },
    { label: "PowerPoint", icon: <Presentation className="w-5 h-5 text-orange-500" />, desc: "Auto-generated slide deck", action: handleExportPPTX },
    { label: "Export PNG", icon: <ImageIcon className="w-5 h-5 text-purple-500" />, desc: "High-res graph screenshot", action: handleExportPNG },
  ];

  const triggerExport = async (index: number, action: () => Promise<void>) => {
    try {
      setExportingStates(prev => ({ ...prev, [index]: true }));
      await action();
      toast.success(`${exportOptions[index].label} generated successfully!`);
    } catch (e) {
      toast.error(`Failed to generate ${exportOptions[index].label}`);
    } finally {
      setExportingStates(prev => ({ ...prev, [index]: false }));
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Export & Share</h3>
          <p className="text-sm text-slate-500">Download the optimized workflow in your preferred format.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button 
            onClick={handleShare}
            disabled={sharing}
            className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-md disabled:opacity-50"
          >
            {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : (sharedUrl ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />)}
            {sharedUrl ? "Copied!" : "Share Link"}
          </button>
          {sharedUrl && <a href={sharedUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">Open Link</a>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1">
        {exportOptions.map((opt, i) => (
          <button 
            key={i}
            onClick={() => triggerExport(i, opt.action)}
            disabled={exportingStates[i]}
            className="flex flex-col p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md transition-all group text-left w-full h-full disabled:opacity-60"
          >
            <div className="flex items-start justify-between w-full mb-4">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                {opt.icon}
              </div>
              {exportingStates[i] ? (
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
              ) : (
                <Download className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
              )}
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 leading-tight mb-1.5">{opt.label}</h4>
              <p className="text-xs text-slate-500 leading-snug">{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
