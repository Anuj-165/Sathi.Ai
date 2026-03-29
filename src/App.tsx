import { useState, useEffect } from "react";
import { getAccelerationMode } from "./runanywhere";
import { Download, ShieldCheck, Activity, WifiOff, Globe } from "lucide-react";


import Navbar from "./components/Navbar"; 
import { ChatTab } from "./components/ChatTab";
import { VoiceTab } from "./components/VoiceTab";
import Home from "./components/HomePage";
import MeshRadar from "./components/Connect";
import { AppInitializer } from "./components/AppInitializer";
import MapIt from "./components/MapIt";
import About from "./components/AboutUs";

import { ONNX,STT,STTModelType } from '@runanywhere/web-onnx';
import { RunAnywhere,SDKEnvironment,ModelCategory,inferModelFromFilename} from '@runanywhere/web';

export type Tab = "home" | "chat"  | "voice" | "map" | "connect" | "about";


async function setupSathiTactical() {
  try {
    // 1. Core Boot
    await RunAnywhere.initialize({
      environment: SDKEnvironment.Production,
    });

    // 2. Register ONNX (FIXED SYNTAX: Added {} and correct property names)
    await ONNX.register({
      wasmUrl: '/sherpa-onnx.wasm',
      helperBaseUrl: '/'
    });

    // 3. Load STT (FIXED: Removed unknown providerConfig)
    await STT.loadModel({
      modelId: 'whisper-tiny',
      type: STTModelType.Whisper,
      modelFiles: {
        encoder: '/models/whisper-tiny-encoder.onnx',
        decoder: '/models/whisper-tiny-decoder.onnx',
        tokens: '/models/whisper-tiny-tokens.txt',
      },
      sampleRate: 16000,
      language: 'en'
    });

    console.log("Sathi: STT Pipeline Ready");
  } catch (err) {
    console.error("Sathi Boot Failure:", err);
  }
}

function MainLayout() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [voiceAutoStart, setVoiceAutoStart] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isPersisted, setIsPersisted] = useState(false);
  
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    
    const requestPersistence = async () => {
      if (navigator.storage && navigator.storage.persist) {
        const persisted = await navigator.storage.persist();
        setIsPersisted(persisted);
      }
    };

    
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    
    
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    requestPersistence();
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const handleActivateVoice = (autoStart: boolean = false) => {
    setVoiceAutoStart(autoStart);
    setActiveTab("voice");
  };

  const accel = getAccelerationMode();

  return (
    <div className="min-h-screen bg-[#050505] text-[#f8f5f0] flex flex-col transition-all duration-1000">
      
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      
      <div className="max-w-7xl mx-auto w-full px-6 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex flex-wrap gap-3">
            
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 bg-zinc-900/50 px-4 py-2 rounded-full border border-white/5 backdrop-blur-md">
              <div className={`w-2 h-2 rounded-full ${isPersisted ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-amber-500 animate-pulse'}`} />
              <span>{isPersisted ? 'Core Secured' : 'Local Storage: Temp'}</span>
              {accel && (
                <span className="ml-2 bg-amber-500/10 px-2 py-0.5 rounded text-amber-500 border border-amber-500/20 font-mono">
                  {accel}
                </span>
              )}
            </div>

            
            <div className={`flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border transition-all duration-500 backdrop-blur-md ${
              isOnline 
              ? 'text-zinc-500 border-white/5 bg-zinc-900/50' 
              : 'text-green-400 border-green-500/30 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.1)]'
            }`}>
              {isOnline ? <Globe size={12} /> : <WifiOff size={12} className="animate-pulse" />}
              <span>{isOnline ? 'Network Linked' : 'Tactical Offline'}</span>
            </div>
          </div>

          
          {deferredPrompt && (
            <button 
              onClick={handleInstallClick}
              className="group flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2 rounded-full transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] active:scale-95"
            >
              <Download size={14} className="group-hover:animate-bounce" />
              Deploy to Device
            </button>
          )}
        </div>
      </div>

      
      <main className="flex-grow">
        {activeTab === "home" && (
          <Home onActivateVoice={handleActivateVoice} />
        )}
        
        {activeTab === "chat" && <ChatTab />}
        
        {activeTab === "voice" && (
          <VoiceTab autoStart={voiceAutoStart} />
        )}
        
        {activeTab === "connect" && <MeshRadar />}
        {activeTab === "map" && <MapIt />}
        {activeTab === "about" && <About />}
      </main>

      <footer className="py-10 text-center flex flex-col items-center gap-2">
        <div className="h-[1px] w-20 bg-gradient-to-r from-transparent via-zinc-800 to-transparent mb-4" />
        <p className="text-zinc-700 text-[9px] font-black uppercase tracking-[0.5em]">
          Sathi.AI &copy; 2026 | Resilient Autonomous Intelligence
        </p>
        <p className="text-zinc-800 text-[8px] uppercase tracking-widest">
          {isPersisted ? 'Persistence Verified' : 'Standard Buffer Mode'} // Node_ID: {Math.random().toString(16).slice(2, 8).toUpperCase()}
        </p>
      </footer>
    </div>
  );
}


export default function App() {
  return (
    <AppInitializer>
      <MainLayout />
    </AppInitializer>
  );
}