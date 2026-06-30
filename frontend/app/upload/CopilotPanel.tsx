"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles, AlertCircle, Copy, ThumbsUp, ThumbsDown, RefreshCcw, FileDown, Mic, Trash2, ChevronRight, Activity, Users, Building, CheckCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Message {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

interface CopilotPanelProps {
  workflow?: any;
  optimization?: any;
  documentText?: string;
  onApplyRecommendation?: (action: string, args: string[]) => void;
}

export default function CopilotPanel({ workflow, optimization, documentText, onApplyRecommendation }: CopilotPanelProps) {
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: "Hello! I am your AI Workflow Copilot. I can help you understand your process, identify bottlenecks, and automate steps. What would you like to know?"
  }]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return;
    
    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          workflow: workflow || {},
          optimization: optimization || {},
          document_text: documentText || ""
        })
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to connect to Copilot.");
      }

      setMessages(prev => [...prev, { role: "assistant", content: "", isStreaming: true }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.substring(6);
            if (dataStr === "[DONE]") break;
            try {
              const data = JSON.parse(dataStr);
              if (data.content) {
                assistantContent += data.content;
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  return [...prev.slice(0, -1), { ...last, content: assistantContent }];
                });
              } else if (data.error) {
                // Use console.warn instead of console.error to prevent Next.js from throwing a full-screen overlay in dev mode
                console.warn("Copilot Error:", data.error);
                let errorMsg = "Sorry, I encountered an error.";
                
                // data.error is often a string containing the error message from the backend
                if (typeof data.error === "string" && (data.error.includes("RESOURCE_EXHAUSTED") || data.error.includes("quota"))) {
                  errorMsg = "API Rate limit exceeded. Please wait a moment and try again.";
                } else if (data.error && typeof data.error === "object" && (data.error.status === "RESOURCE_EXHAUSTED" || (data.error.message && data.error.message.includes("quota")))) {
                  errorMsg = "API Rate limit exceeded. Please wait a moment and try again.";
                }
                
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  return [...prev.slice(0, -1), { ...last, content: errorMsg }];
                });
              }
            } catch (e) {
              // ignore parse errors for partial chunks
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
      setMessages(prev => {
        const last = prev[prev.length - 1];
        return [...prev.slice(0, -1), { ...last, isStreaming: false }];
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([{
      role: "assistant",
      content: "Chat cleared. What would you like to discuss next?"
    }]);
  };

  const suggestedPrompts = [
    "Explain this workflow",
    "Where is the bottleneck?",
    "How can I automate this process?",
    "Estimate yearly savings",
  ];

  // Parse Action Tags from Assistant Messages
  const renderMessageContent = (content: string) => {
    const actionRegex = /\[APPLY_(MERGE|REMOVE|AUTOMATE):([^\]]+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = actionRegex.exec(content)) !== null) {
      // Push text before the match
      if (match.index > lastIndex) {
        parts.push(
          <div key={lastIndex} className="prose prose-sm max-w-none text-slate-700">
            <ReactMarkdown components={markdownComponents}>
              {content.substring(lastIndex, match.index)}
            </ReactMarkdown>
          </div>
        );
      }
      
      const actionType = match[1];
      const args = match[2].split(",");
      
      parts.push(
        <div key={match.index} className="my-4 border border-blue-200 bg-blue-50/50 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <Sparkles className="text-blue-500" size={20} />
            <div>
              <div className="text-sm font-semibold text-slate-800">
                Recommended Action: {actionType}
              </div>
              <div className="text-xs text-slate-500">
                Target nodes: {args.join(", ")}
              </div>
            </div>
          </div>
          <button 
            onClick={() => onApplyRecommendation && onApplyRecommendation(actionType, args)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow transition-colors"
          >
            Apply
          </button>
        </div>
      );
      lastIndex = actionRegex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(
        <div key={lastIndex} className="prose prose-sm max-w-none text-slate-700">
          <ReactMarkdown components={markdownComponents}>
            {content.substring(lastIndex)}
          </ReactMarkdown>
        </div>
      );
    }
    
    return parts.length > 0 ? parts : (
      <div className="prose prose-sm max-w-none text-slate-700">
        <ReactMarkdown components={markdownComponents}>
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  const markdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || "");
      return !inline && match ? (
        <SyntaxHighlighter
          style={vscDarkPlus as any}
          language={match[1]}
          PreTag="div"
          className="rounded-lg !my-4 text-sm"
          {...props}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      ) : (
        <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      );
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-8 py-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bot className="text-blue-400" size={28} />
          <div>
            <h3 className="text-2xl font-bold">AI Workflow Copilot</h3>
            <p className="text-slate-400 text-sm mt-1">Ask questions about your workflow, bottlenecks, and automation opportunities.</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={clearChat} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-slate-300 hover:text-white" title="Clear Chat">
            <Trash2 size={18} />
          </button>
          <button onClick={() => window.print()} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-slate-300 hover:text-white" title="Export PDF">
            <FileDown size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row h-[700px] bg-slate-50">
        
        {/* Left: Chat Area */}
        <div className="flex-1 flex flex-col border-r border-slate-200 bg-white min-w-0">
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`flex space-x-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse space-x-reverse" : "flex-row"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"}`}>
                    {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`group rounded-2xl p-4 shadow-sm overflow-hidden ${msg.role === "user" ? "bg-blue-600 text-white rounded-tr-none" : "bg-white border border-slate-100 rounded-tl-none"}`}>
                    {msg.role === "user" ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="w-full">
                        {renderMessageContent(msg.content)}
                        {msg.isStreaming && <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1 align-middle" />}
                      </div>
                    )}
                    
                    {msg.role === "assistant" && !msg.isStreaming && (
                      <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="text-slate-400 hover:text-blue-500 transition-colors" title="Copy text" onClick={() => navigator.clipboard.writeText(msg.content)}>
                          <Copy size={14} />
                        </button>
                        <button className="text-slate-400 hover:text-green-500 transition-colors">
                          <ThumbsUp size={14} />
                        </button>
                        <button className="text-slate-400 hover:text-red-500 transition-colors">
                          <ThumbsDown size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-white border-t border-slate-100">
            <div className="flex flex-wrap gap-2 mb-3">
              {suggestedPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs rounded-full transition-colors flex items-center space-x-1"
                >
                  <Sparkles size={12} className="text-blue-500" />
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
            <div className="relative flex items-end bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all shadow-inner">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your workflow..."
                className="flex-1 max-h-48 min-h-[60px] p-4 bg-transparent outline-none resize-none text-slate-700"
                rows={1}
              />
              <div className="flex items-center p-3 space-x-2">
                <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-200" title="Voice Input">
                  <Mic size={18} />
                </button>
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors shadow-md flex items-center justify-center"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Workflow Snapshot */}
        <div className="w-full lg:w-80 bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200 p-6 overflow-y-auto">
          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center space-x-2">
            <Activity size={16} />
            <span>Workflow Snapshot</span>
          </h4>

          <div className="space-y-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <div className="text-xs text-slate-500 font-medium mb-1">Workflow Name</div>
              <div className="font-semibold text-slate-800">{workflow?.workflow_name || "Unknown Workflow"}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <div className="text-xs text-slate-500 font-medium mb-1">Current Steps</div>
                <div className="text-xl font-bold text-slate-800">{optimization?.current_steps || workflow?.steps?.length || 0}</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <div className="text-xs text-slate-500 font-medium mb-1">Optimized Steps</div>
                <div className="text-xl font-bold text-green-600">{optimization?.optimized_steps || '-'}</div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <div className="text-xs text-slate-500 font-medium mb-2 flex items-center space-x-1">
                <Building size={14} />
                <span>Departments</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {Array.from(new Set(workflow?.steps?.map((s:any) => s.department).filter(Boolean) || [])).map((dept: any, i) => (
                  <span key={i} className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-md border border-purple-100">
                    {dept}
                  </span>
                ))}
                {(!workflow?.steps || workflow.steps.length === 0) && <span className="text-slate-400 text-sm">N/A</span>}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white shadow-md">
              <div className="text-blue-100 text-xs font-medium mb-2 flex items-center justify-between">
                <span>Automation Score</span>
                <CheckCircle size={14} />
              </div>
              <div className="text-3xl font-bold">
                {optimization?.automation_score || 0}%
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-blue-200">Est. Time Saved</span>
                  <span className="font-semibold">{optimization?.estimated_time_saved || '-'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-blue-200">Est. Savings</span>
                  <span className="font-semibold">{optimization?.estimated_cost_saved || '-'}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
