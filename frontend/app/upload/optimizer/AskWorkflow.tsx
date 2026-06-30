"use client";

import React, { useState } from "react";
import { Send, Bot, User, Sparkles } from "lucide-react";

export function AskWorkflow({ workflow, optimization }: { workflow?: any, optimization?: any }) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "ai"; content: string }[]>([
    { role: "ai", content: "Hi! I'm your OpsTwin AI assistant. You can ask me anything about this workflow optimization, like 'Why is HR a bottleneck?' or 'What if I remove the approval step?'" }
  ]);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent, text?: string) => {
    e?.preventDefault();
    const promptText = text || query;
    if (!promptText.trim() || isLoading) return;
    
    setMessages(prev => [...prev, { role: "user", content: promptText.trim() }]);
    setQuery("");
    setIsLoading(true);
    
    try {
      const response = await fetch("http://localhost:8000/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: promptText.trim() }],
          workflow: workflow || {},
          optimization: optimization || {},
          document_text: ""
        })
      });

      if (!response.ok) throw new Error("Failed to connect");
      
      setMessages(prev => [...prev, { role: "ai", content: "" }]);
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponse = "";

      while (reader) {
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
                aiResponse += data.content;
                setMessages(prev => [
                  ...prev.slice(0, -1),
                  { role: "ai", content: aiResponse }
                ]);
              }
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "ai", content: "Sorry, I couldn't process your request right now." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[550px]">
      
      {/* HEADER */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-lg">Ask Your Workflow</h3>
          <p className="text-xs text-slate-500 font-medium">Powered by OpsTwin AI</p>
        </div>
      </div>

      {/* CHAT AREA */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50/50 dark:bg-[#0b1120]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === "user" ? "bg-slate-800 dark:bg-slate-700 text-white" : "bg-blue-600 text-white"}`}>
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 text-[15px] leading-relaxed shadow-sm ${
              msg.role === "user" 
                ? "bg-slate-800 dark:bg-slate-700 text-white rounded-tr-none" 
                : "bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 rounded-tl-none whitespace-pre-wrap"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* INPUT AREA */}
      <div className="p-4 bg-white dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ask anything about this workflow..."
            className="w-full bg-slate-100 dark:bg-[#1e293b] border border-transparent dark:border-slate-700 rounded-full py-3.5 pl-6 pr-14 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
          />
          <button 
            type="submit" 
            disabled={!query.trim() || isLoading}
            className="absolute right-1.5 p-2 bg-blue-600 text-white rounded-full disabled:opacity-50 hover:bg-blue-700 transition-colors shadow-md"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="flex flex-wrap gap-2 mt-3 pt-1 overflow-x-auto pb-1 scrollbar-hide">
          {["Why is HR a bottleneck?", "How can I reduce approvals?", "Can AI automate this?"].map((suggestion, i) => (
            <button 
              key={i} 
              type="button"
              onClick={() => handleSend(undefined, suggestion)}
              className="whitespace-nowrap px-3.5 py-1.5 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-full text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-white hover:border-blue-200 dark:hover:border-slate-600 transition-all"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
