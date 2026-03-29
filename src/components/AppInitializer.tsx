import React, { useEffect, useState, useCallback, useRef } from 'react';
import { initSDK, ModelCategory } from '../runanywhere'; 
import { useModelLoader } from '../hooks/useModelLoader';
import { ModelProgressProvider, useModelProgress } from "./ModelProgressContext";
import { Shield, Terminal, Cpu, CheckCircle, AlertTriangle, Bell, Loader2 } from 'lucide-react';

const ALL_CATEGORIES = [
  ModelCategory.Language,
  ModelCategory.SpeechRecognition,
  ModelCategory.SpeechSynthesis,
  ModelCategory.Audio,
];

declare global {
  interface Window {
    sathiSDK: any;
    racSDK: any;
  }
}

const requestPersistence = async () => {
  if (navigator.storage && navigator.storage.persist) {
    return await navigator.storage.persist();
  }
  return false;
};

const GPU_SAFETY_CONFIG = {
  llamacpp: { n_batch: 512, n_ubatch: 128, n_ctx: 2048, flash_attn: false, offload_kqv: true },
  onnx: { executionProviders: ['webgpu'], preferredOutputLocation: 'gpu' },
  stt: { modelType: 'whisper', beamSize: 1 }
};

export const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userStarted, setUserStarted] = useState(false);
  const [sdkInitialized, setSdkInitialized] = useState(false);
  const [appLaunched, setAppLaunched] = useState(false);
  const initializing = useRef(false);

  useEffect(() => {
    if (!userStarted || initializing.current || sdkInitialized) return;
    initializing.current = true;
    
    const boot = async () => {
      try {
        const instance = await (initSDK(GPU_SAFETY_CONFIG as any) as any);
        window.sathiSDK = instance || window.racSDK || (window as any).sathiSDK;
        
        setSdkInitialized(true);
      } catch (err) {
        console.error("[Sathi] SDK Boot Failure:", err);
        setSdkInitialized(true); 
      } finally { 
        initializing.current = false; 
      }
    };
    boot();
  }, [userStarted, sdkInitialized]);

  if (!userStarted) return <LandingPage onStart={() => setUserStarted(true)} />;
  if (!sdkInitialized) return <TerminalLoading />;

  return (
    <ModelProgressProvider>
      <UnifiedPreloader onLaunch={() => setAppLaunched(true)} isLaunched={appLaunched}>
        {appLaunched ? children : null}
      </UnifiedPreloader>
    </ModelProgressProvider>
  );
};

const UnifiedPreloader: React.FC<{ onLaunch: () => void, isLaunched: boolean, children: React.ReactNode }> = ({ onLaunch, isLaunched, children }) => {
  const { state } = useModelProgress();
  const [activeCategory, setActiveCategory] = useState<ModelCategory | null>(ModelCategory.Language);
  const [kernelReady, setKernelReady] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const queue = useRef([...ALL_CATEGORIES]);

  const handleTaskComplete = useCallback(() => {
    queue.current.shift();
    if (queue.current.length > 0) {
      setActiveCategory(queue.current[0]);
    } else {
      setActiveCategory(null);
      setAllDone(true);
    }
  }, []);

  useEffect(() => {
    if (state.current === ModelCategory.Language && state.progress >= 100) {
      setKernelReady(true);
    }
  }, [state.current, state.progress]);

  return (
    <>
      {!allDone && activeCategory && (
        <DownloadTask 
          key={activeCategory} 
          category={activeCategory} 
          onComplete={handleTaskComplete} 
        />
      )}

      {!allDone && isLaunched && (
        <div className="fixed bottom-6 right-6 z-[100] bg-zinc-900/95 backdrop-blur-md border border-amber-500/30 p-4 rounded-lg shadow-2xl animate-in slide-in-from-right-10">
          <div className="flex items-center gap-3">
            <Loader2 className="text-amber-500 animate-spin" size={18} />
            <div>
              <p className="text-white text-[10px] font-bold uppercase tracking-widest">Background Syncing</p>
              <p className="text-zinc-500 text-[9px] uppercase">
                Optimizing {activeCategory}...
              </p>
            </div>
          </div>
        </div>
      )}

      {!isLaunched ? (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-10">
          <TacticalLoader category={activeCategory || ModelCategory.Language} />
          {(kernelReady || state.progress >= 99) && (
            <div className="mt-12 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <button 
                onClick={onLaunch}
                className="px-12 py-5 bg-amber-500 text-black font-black uppercase tracking-[0.3em] text-xs transition-all hover:bg-white hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(245,158,11,0.2)]"
              >
                Launch Tactical Interface
              </button>
            </div>
          )}
        </div>
      ) : (
        <>{children}</>
      )}
    </>
  );
};

const DownloadTask: React.FC<{ category: ModelCategory, onComplete: () => void }> = ({ category, onComplete }) => {
  const { preCache, isCached } = useModelLoader(category);
  const { dispatch } = useModelProgress(); 
  const executionRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (executionRef.current === category) return;
      executionRef.current = category;

      try {
        await requestPersistence();
        
        dispatch({ type: 'SET_PROGRESS', payload: { current: category, progress: 10, status: "downloading" } });

        await preCache();

        if (category === ModelCategory.SpeechRecognition || category === ModelCategory.Audio) {
           if (window.sathiSDK?.stt?.ensureLoaded) {
             console.log(`[Sathi] Explicitly loading WASM for ${category}`);
             await window.sathiSDK.stt.ensureLoaded();
           }
        }

        if (active) {
          dispatch({ type: 'SET_PROGRESS', payload: { current: category, progress: 100, status: "complete" } });
          setTimeout(() => { if (active) onComplete(); }, 200);
        }
      } catch (err) {
        console.error(`[Sathi] Task failed for ${category}:`, err);
        if (active) onComplete();
      }
    };
    run();
    return () => { active = false; };
  }, [category, preCache, onComplete, dispatch]);

  return null;
};

const TacticalLoader: React.FC<{ category: ModelCategory }> = ({ category }) => {
  const { state } = useModelProgress();
  const isFinished = state.progress >= 99;
  return (
    <div className="w-full max-w-xl text-center space-y-10">
      <div className={`p-5 rounded-3xl border-2 transition-all duration-700 ${isFinished ? 'border-green-500 bg-green-500/10' : 'border-amber-500 bg-amber-500/10'} inline-block`}>
         <Cpu size={40} className={isFinished ? 'text-green-500' : 'text-amber-500 animate-pulse'} />
      </div>
      <div className="space-y-4">
        <div className="flex justify-between font-mono text-[10px] uppercase">
          <span className="text-zinc-500">{category} Status</span>
          <span className="text-amber-500 font-black">{Math.min(Math.round(state.progress), 100)}%</span>
        </div>
        <div className="h-4 bg-zinc-900 border border-white/5 p-1 rounded-sm">
          <div className={`h-full transition-all duration-500 ${isFinished ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(state.progress, 100)}%` }} />
        </div>
      </div>
    </div>
  );
};

const LandingPage: React.FC<{onStart: ()=>void}> = ({onStart}) => (
  <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
    <h1 className="text-8xl font-black italic tracking-tighter text-white">SATHI<span className="text-amber-500">.AI</span></h1>
    <button onClick={onStart} className="mt-12 px-12 py-5 bg-amber-500 text-black font-black uppercase text-xs tracking-widest hover:bg-white">Deploy AI Kernel</button>
  </div>
);

const TerminalLoading = () => (
  <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white font-mono p-6">
    <div className="flex items-center gap-2 text-amber-500 text-[10px] font-black uppercase tracking-widest"><Terminal size={14} className="animate-bounce" /> Syncing Hardware</div>
  </div>
);