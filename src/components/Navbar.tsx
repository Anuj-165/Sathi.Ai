import { useState } from "react";
import {
  Shield,
  MessageSquare,
  Mic,
  Globe,
  Home,
  Menu,
  X,
  MapIcon,
} from "lucide-react";
import type { Tab } from "../App";

interface NavbarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

export default function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "voice", label: "Voice", icon: Mic },
    { id: "connect", label: "Connect", icon: Globe },
    { id: "map", label: "Map", icon: MapIcon},
    { id: "about", label: "About", icon: Shield },
  ] as { id: Tab; label: string; icon: any }[];

  return (
    <>
      
      <header className="w-full bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">

          
          <div
            className="flex items-center gap-2 sm:gap-3 cursor-pointer"
            onClick={() => setActiveTab("home")}
          >
            <div className="bg-amber-500 p-2 rounded-lg">
              <Shield className="text-black w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight">
              Sathi.AI
            </h1>
          </div>

          
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-4 py-2 rounded-md text-sm transition-all ${
                  activeTab === item.id
                    ? "bg-amber-500/10 text-amber-400"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg bg-white/5 border border-white/10"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        
        {menuOpen && (
          <div className="md:hidden px-4 pb-4 flex flex-col gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMenuOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition ${
                  activeTab === item.id
                    ? "bg-amber-500/10 text-amber-400"
                    : "text-gray-400 hover:bg-white/5"
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* 📱 MOBILE BOTTOM NAV (BEST UX) */}
      <div className="fixed bottom-0 left-0 w-full md:hidden z-50 bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-white/5">
        <div className="flex justify-around py-2">
          {navItems.slice(0, 5).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center text-[10px] gap-1"
            >
              <item.icon
                size={18}
                className={
                  activeTab === item.id
                    ? "text-amber-400"
                    : "text-gray-500"
                }
              />
              <span
                className={
                  activeTab === item.id
                    ? "text-amber-400"
                    : "text-gray-500"
                }
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}