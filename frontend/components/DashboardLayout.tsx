"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Cpu,
  LineChart,
  List,
  Search,
  History,
  Lightbulb,
  Zap,
  Menu,
  X,
  Upload,
  Globe,
  Terminal
} from "lucide-react";
import EnterpriseSearch from "./EnterpriseSearch";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const navItems = [
    { name: "Command Center", path: "/command-center", icon: <Terminal size={20} /> },
    { name: "Document Intel", path: "/upload", icon: <Upload size={20} /> },
    { name: "Live Monitor", path: "/monitor", icon: <Activity size={20} /> },
    { name: "Digital Twin", path: "/twin", icon: <Globe size={20} /> },
    { name: "Simulator", path: "/simulator", icon: <Cpu size={20} /> },
    { name: "Recommendations", path: "/recommendations", icon: <Lightbulb size={20} /> },
    { name: "Executive", path: "/executive", icon: <LineChart size={20} /> },
    { name: "History", path: "/history", icon: <History size={20} /> },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#050505] text-gray-100 font-sans">
      {/* Sidebar */}
      <motion.aside
        initial={{ width: 260 }}
        animate={{ width: isSidebarOpen ? 260 : 70 }}
        className="h-full border-r border-white/10 bg-[#0A0A0B]/80 backdrop-blur-xl flex flex-col z-50 relative transition-all duration-300"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 h-16">
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-semibold text-lg flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">O</span>
                </div>
                OpsTwin AI
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 py-6 px-3 flex flex-col gap-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <div className={`${isActive ? "text-blue-400" : ""}`}>
                  {item.icon}
                </div>
                <AnimatePresence>
                  {isSidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* Bottom User Area */}
        <div className="p-4 border-t border-white/10 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-blue-500" />
                {isSidebarOpen && (
                    <div className="text-sm font-medium">Enterprise User</div>
                )}
            </div>
            {isSidebarOpen && (
                <button onClick={() => setIsSearchOpen(true)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Global Search (Ctrl+K)">
                    <Search size={16} />
                </button>
            )}
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto relative bg-[#050505]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-[#050505] to-[#050505] pointer-events-none" />
        <div className="relative z-10 min-h-full">
            {children}
        </div>
      </main>

      {/* Global Search Modal */}
      <EnterpriseSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}
