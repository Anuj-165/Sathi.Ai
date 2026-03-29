import React, { useEffect, useState, useCallback, useRef } from 'react';
import { initSDK, ModelCategory } from '../runanywhere'; 
import { useModelLoader } from '../hooks/useModelLoader';
import { ModelProgressProvider, useModelProgress } from "./ModelProgressContext";
import { Shield, Zap, Terminal, Database, Cpu, Activity, Lock } from 'lucide-react';

const ALL_CATEGORIES = [
  ModelCategory.Language,
  ModelCategory.SpeechRecognition,
  ModelCategory.SpeechSynthesis,
  ModelCategory.Audio,
];

const GPU_SAFETY_CONFIG = {
  llamacpp: { n_batch: 512, n_ubatch: 128, n_ctx: 2048, flash_attn: true, offload_kqv: true },
  onnx: { executionProviders: ['webgpu'], preferredOutputLocation: 'gpu' },
  stt: { modelType: 'whisper', beamSize: 1 }
};

export const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userStarted, setUserStarted] = useState(false);
  const [sdkInitialized, setSdkInitialized] = useState(false);
  const initializing = useRef(false); 

  useEffect(() => {
    if (!userStarted || initializing.current || sdkInitialized) return;
    initializing.current = true;

    const bootSequence = async () => {
      try {
        const initTask = async () => {
          await initSDK(GPU_SAFETY_CONFIG as any);
          if (navigator.storage?.persist) await navigator.storage.persist();
        };
        if ('locks' in navigator) await navigator.locks.request("sathi-sdk-init", initTask);
        else await initTask();
        setSdkInitialized(true);
      } catch (err) { 
        console.error("[Sathi] Critical Boot Error:", err); 
      } finally { 
        initializing.current = false; 
      }
    };
    bootSequence();
  }, [userStarted, sdkInitialized]);


  if (!userStarted) return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center relative overflow-hidden">
      
      <div className="absolute inset-0 bg-[linear-gradient(rgba(245,158,11,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px]" />

      <div className="relative z-10 text-center space-y-2">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Shield className="text-amber-500 animate-pulse" size={32} />
          <span className="text-[10px] font-black tracking-[0.6em] text-zinc-500 uppercase">Resilient Intelligence</span>
        </div>
        
        <h1 className="text-8xl font-black italic tracking-tighter text-white">
          SATHI<span className="text-amber-500">.AI</span>
        </h1>
        
        <p className="text-zinc-500 font-mono text-[10px] tracking-widest uppercase">Node Version: 2026.4.1 // Tactical-OS</p>

        <div className="pt-12">
          <button 
            onClick={() => setUserStarted(true)} 
            className="group relative px-12 py-5 bg-amber-500 text-black font-black uppercase tracking-[0.2em] text-xs overflow-hidden transition-all hover:bg-white hover:pr-16"
          >
            <span className="relative z-10 flex items-center gap-3">
              <Zap size={16} fill="black" />
              Deploy AI Kernel
            </span>
            <div className="absolute top-0 -right-full group-hover:right-4 transition-all duration-300">
               →
            </div>
          </button>
        </div>
      </div>
    </div>
  );

 
  if (!sdkInitialized) return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white font-mono p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center gap-2 text-amber-500 text-[10px] font-black uppercase tracking-widest">
           <Terminal size={14} className="animate-bounce" /> Initializing Hardware Link
        </div>
        <div className="h-[1px] w-full bg-zinc-800 relative overflow-hidden">
          <div className="absolute top-0 h-full bg-amber-500 w-1/3 animate-[loading-shimmer_1.5s_infinite]" />
        </div>
        <div className="text-[10px] text-zinc-600 space-y-1 uppercase">
          <p className="animate-pulse flex justify-between"><span>Checking WebGPU...</span> <span className="text-green-500">[OK]</span></p>
          <p className="opacity-50">Allocating OPFS Storage...</p>
        </div>
      </div>
    </div>
  );

  return (
    <ModelProgressProvider>
      <SequentialPreloader categories={ALL_CATEGORIES}>{children}</SequentialPreloader>
    </ModelProgressProvider>
  );
};


const SequentialPreloader: React.FC<{ categories: ModelCategory[], children: React.ReactNode }> = ({ categories, children }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const handleNext = useCallback(() => setCurrentIndex((prev) => prev + 1), []);
  if (currentIndex >= categories.length) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white p-10 relative">
      <div className="absolute top-10 left-10 flex flex-col gap-1">
        <div className="h-1 w-10 bg-amber-500" />
        <div className="h-[1px] w-20 bg-zinc-800" />
      </div>

      <TacticalLoader category={categories[currentIndex]} index={currentIndex} total={categories.length} />
      <DownloadTask key={categories[currentIndex]} category={categories[currentIndex]} onComplete={handleNext} />
    </div>
  );
};

const TacticalLoader: React.FC<{ category: ModelCategory, index: number, total: number }> = ({ category, index, total }) => {
  const { state } = useModelProgress();
  const { isCached, activeDevice, state: loaderState, pause, resume } = useModelLoader(category);

  const getIcon = (cat: ModelCategory) => {
    if (cat === ModelCategory.Language) return <Cpu size={40} />;
    if (cat === ModelCategory.SpeechRecognition) return <Activity size={40} />;
    if (cat === ModelCategory.SpeechSynthesis) return <Database size={40} />;
    return <Activity size={40} />;
  };

  return (
    <div className="w-full max-w-xl text-center space-y-10 relative">
      
      <div className="relative inline-block">
        <div className="absolute inset-0 bg-amber-500/20 blur-[60px] animate-pulse" />
        <div className={`p-8 rounded-3xl border-2 transition-all duration-700 ${state.progress > 0 ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-800 bg-transparent'}`}>
           <div className={`${state.progress > 0 ? 'text-amber-500' : 'text-zinc-700'} transition-colors`}>
             {getIcon(category)}
           </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-end mb-2 font-mono text-[10px] uppercase tracking-tighter">
          <span className="text-zinc-500">Kernel Module [{index + 1}/{total}]</span>
          <span className="text-amber-500 font-black">{Math.round(state.progress)}% Sync</span>
        </div>
        
        
        <div className="relative h-4 bg-zinc-900 border border-white/5 rounded-sm p-1">
          <div 
            className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500 ease-out relative"
            style={{ width: `${state.progress}%` }}
          >
             <div className="absolute top-0 right-0 w-[2px] h-full bg-white shadow-[0_0_10px_white]" />
          </div>
        </div>

        <h2 className="text-4xl font-black uppercase italic tracking-widest text-white">
          {category}
        </h2>
      </div>

      <div className="flex gap-6 justify-center items-center">
         <div className="text-left font-mono text-[9px] uppercase space-y-1">
            <div className="flex items-center gap-2">
              <Lock size={10} className={isCached ? 'text-green-500' : 'text-zinc-700'} />
              <span className="text-zinc-500">Persisted:</span>
              <span className={isCached ? 'text-green-500' : 'text-zinc-700'}>{isCached ? 'VERIFIED' : 'NULL'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={10} className="text-amber-500" />
              <span className="text-zinc-500">Hardware:</span>
              <span className="text-white">{activeDevice || 'SEARCHING...'}</span>
            </div>
         </div>

         <div className="h-10 w-[1px] bg-zinc-800" />

         <button 
           onClick={loaderState === 'paused' ? resume : pause} 
           className="px-6 py-2 border border-zinc-800 hover:border-amber-500 text-zinc-500 hover:text-amber-500 rounded font-black text-[9px] uppercase tracking-widest transition-all"
         >
           {loaderState === 'paused' ? 'RESUME_SYNC' : 'PAUSE_SYNC'}
         </button>
      </div>
    </div>
  );
};


const DownloadTask: React.FC<{ category: ModelCategory, onComplete: () => void }> = ({ category, onComplete }) => {
  const { preCache, isCached } = useModelLoader(category);
  const { dispatch } = useModelProgress(); 
  const executionRef = useRef(false);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (executionRef.current) return;
      executionRef.current = true;
      try {
        if (isCached) {
          dispatch({ type: 'SET_PROGRESS', payload: { current: category, progress: 100, status: "complete" } });
          if (active) onComplete();
          return;
        }
        dispatch({ type: 'SET_PROGRESS', payload: { current: category, progress: 1, status: "downloading" } });
        const success = ('locks' in navigator) 
          ? await navigator.locks.request("sathi-opfs-lock", () => preCache()) 
          : await preCache();
        
        if (success && active) {
          dispatch({ type: 'SET_PROGRESS', payload: { current: category, progress: 100, status: "complete" } });
          setTimeout(() => { if (active) onComplete(); }, 400);
        } else { onComplete(); }
      } catch { if (active) onComplete(); }
    };
    run();
    return () => { active = false; };
  }, [category, preCache, isCached, onComplete, dispatch]); 
  return null;
};