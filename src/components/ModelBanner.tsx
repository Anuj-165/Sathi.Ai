import React from 'react';
import { RefreshCcw, Zap, Loader2, AlertCircle } from 'lucide-react';
import { useModelProgress, ModelStatus } from "./ModelProgressContext";
import { LoaderState } from '../hooks/useModelLoader'; 

interface ModelBannerProps {
  label: string;
  state?: LoaderState;     
  progress?: number;      
  error?: string | null;  
  onLoad?: () => Promise<boolean>; 
}

export const ModelBanner: React.FC<ModelBannerProps> = ({ 
  label, 
  state: manualState, 
  progress: manualProgress, 
  error: manualError,
  onLoad 
}) => {
  const { state: globalState } = useModelProgress();

  
  const currentStatus = (manualState === 'ready' ? 'complete' : manualState) as ModelStatus || globalState.status;
  
  const progress = manualProgress ?? globalState.progress;
  const errorText = manualError ?? (currentStatus === 'error' ? 'BOOT_FAILURE' : null);

  const isDownloading = currentStatus === 'downloading';
  const isLoading = currentStatus === 'loading';
  const isError = currentStatus === 'error' || !!errorText;
  
  
  const isFinished = currentStatus === 'complete' || currentStatus === 'cached';

  if (isFinished && !isError) return null;

  return (
    <div className={`w-full border-b backdrop-blur-md transition-all duration-500 ${
      isError ? 'bg-red-950/40 border-red-500/50' : 'bg-zinc-900/50 border-white/5'
    }`}>
      <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
        
        
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            {isError ? (
              <AlertCircle size={14} className="text-red-500" />
            ) : isDownloading ? (
              <RefreshCcw size={14} className="text-amber-500 animate-spin" />
            ) : isLoading ? (
              <Loader2 size={14} className="text-blue-400 animate-spin" />
            ) : (
              <Zap size={14} className="text-zinc-500" />
            )}
          </div>
          
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
              {label}
            </span>
            <span className={`text-[11px] font-mono leading-tight ${isError ? 'text-red-400' : 'text-zinc-500'}`}>
              {isError ? `SYSTEM_FAILURE: ${errorText}` : 
               isDownloading ? `SYNCING_MODULES: ${Math.round(progress)}%` : 
               isLoading ? 'CORE_BOOT_SEQUENCE...' : 'SATHI_OS STANDBY'}
            </span>
          </div>
        </div>

        
        {(isDownloading || isLoading) && !isError && (
          <div className="flex-1 max-w-[120px] sm:max-w-[200px] flex items-center gap-3">
            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  isLoading 
                    ? 'bg-blue-500 animate-pulse' 
                    : 'bg-gradient-to-r from-amber-600 to-orange-500'
                }`}
                style={{ width: isDownloading ? `${progress}%` : '100%' }}
              />
            </div>
            {isDownloading && (
              <span className="text-[9px] font-mono text-amber-600 tabular-nums">
                {Math.round(progress)}%
              </span>
            )}
          </div>
        )}

        
        {(currentStatus === 'idle' || isError) && onLoad && (
          <button 
            onClick={() => onLoad()}
            className="px-3 py-1 text-[10px] font-mono border border-zinc-700 hover:bg-zinc-800 hover:border-zinc-500 text-zinc-300 transition-all active:scale-95 whitespace-nowrap"
          >
            [ RUN_INITIALIZE ]
          </button>
        )}
      </div>
    </div>
  );
};