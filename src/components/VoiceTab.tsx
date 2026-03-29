import { useState, useRef, useEffect, useCallback } from "react";
import { ModelCategory, AudioCapture, AudioPlayback, VoicePipeline } from "@runanywhere/web";
import { useModelLoader } from "../hooks/useModelLoader";
import { ModelBanner } from "./ModelBanner";
import { Mic, Loader2, Volume2, Square, X, AlertOctagon } from "lucide-react";

interface VoiceTabProps {
  autoStart: boolean;
}

export function VoiceTab({ autoStart }: VoiceTabProps) {
  const loader = useModelLoader(ModelCategory.Language);
  const sttLoader = useModelLoader(ModelCategory.SpeechRecognition, true);
  const ttsLoader = useModelLoader(ModelCategory.SpeechSynthesis, true);
  const vadLoader = useModelLoader(ModelCategory.Audio, true);

  const [voiceState, setVoiceState] = useState<"idle" | "initializing" | "listening" | "processing" | "speaking">("idle");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [isSOS, setIsSOS] = useState(false);
  const [needsContact, setNeedsContact] = useState(false);
  const [tempContact, setTempContact] = useState("");

  const micRef = useRef<AudioCapture | null>(null);
  const playerRef = useRef<AudioPlayback | null>(null);
  const audioBufferRef = useRef<Float32Array[]>([]);
  const pipelineRef = useRef<VoicePipeline | null>(null);
  const responseEndRef = useRef<HTMLDivElement>(null);

  
  useEffect(() => {
    responseEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [response]);

  const triggerSOS = useCallback(() => {
    const saved = localStorage.getItem("emergencyContacts");
    const contacts = saved ? JSON.parse(saved) : [];
    if (contacts.length === 0) {
      setNeedsContact(true);
      return;
    }
    setIsSOS(true);
    contacts.forEach((num: string) => {
      window.open(`sms:${num}?body=SATHI Tactical AI Alert: Emergency detected. Signal origin recorded.`, "_blank");
    });
  }, []);

  useEffect(() => {
    if (!playerRef.current) playerRef.current = new AudioPlayback({ sampleRate: 24000 });

    const init = async () => {
      try {
        await Promise.all([vadLoader.ensure(), sttLoader.ensure(), ttsLoader.ensure(), loader.ensure()]);
        if (!pipelineRef.current) {
          pipelineRef.current = new VoicePipeline();
          console.log("SATHI: Neural Link Established");
        }
      } catch (e) {
        console.error("Neural Boot Failed", e);
      }
    };
    init();
    return () => { micRef.current?.stop(); };
  }, []);

  const startListening = async () => {
  if (voiceState !== "idle") return;

  setTranscript(""); 
  setResponse(""); 
  setVoiceState("initializing"); 

  audioBufferRef.current = [];

  try {
    const sdk = (window as any).sathiSDK;

    if (sdk?.stt) {
      const loadPromise = sdk.stt.ensureLoaded();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("STT_TIMEOUT")), 15000)
      );
      
      await Promise.race([loadPromise, timeoutPromise]);
    }

    setVoiceState("listening");

    micRef.current = new AudioCapture({ sampleRate: 16000 });
    
    await micRef.current.start((chunk: Float32Array) => {
      audioBufferRef.current.push(chunk);
    });

  } catch (err: any) {
    setVoiceState("idle");
    
    const errorDiv = document.createElement("div");
    errorDiv.className = "fixed top-10 left-1/2 -translate-x-1/2 z-[200] bg-red-950 border border-red-500 text-red-200 px-6 py-3 rounded-none font-mono text-xs uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-in fade-in zoom-in duration-300";
    errorDiv.innerHTML = `
      <div class="flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
        <span>${err.message === "STT_TIMEOUT" ? "Neural Link Timeout: Engine Not Responding" : "Voice System Failure: Hardware Logic Error"}</span>
      </div>
    `;
    document.body.appendChild(errorDiv);
    setTimeout(() => {
      errorDiv.style.opacity = "0";
      errorDiv.style.transition = "opacity 0.5s ease";
      setTimeout(() => errorDiv.remove(), 500);
    }, 4000);
  }
};

  const stopListening = async () => {
  // 1. Initial State & Hardware Safety Checks
  if (!micRef.current || !pipelineRef.current || voiceState !== "listening") return;
  
  setVoiceState("processing");

  try {
    
    const sdk = window.sathiSDK;
    if (sdk?.stt) {
      console.log("[Sathi] Ensuring STT WASM is synchronized...");
      await sdk.stt.ensureLoaded();
    }

    
    await micRef.current.stop();

    const totalLength = audioBufferRef.current.reduce((acc, c) => acc + c.length, 0);
    if (totalLength === 0) {
      console.warn("[Sathi] No audio captured.");
      setVoiceState("idle");
      return;
    }

    const samples = new Float32Array(totalLength);
    let offset = 0;
    audioBufferRef.current.forEach(c => {
      samples.set(c, offset);
      offset += c.length;
    });

    
    const options = {
      sampleRate: 16000,
      enableLLM: true,
      enableTTS: true,
      maxTokens: 100,
      systemPrompt: "YOU ARE SATHI TACTICAL AI. PROVIDE 3 LONG, PRECISE,SIMPLE,EASY TO UNDERSTAND, AND HIGH-IMPACT SAFETY ACTIONS. DO NOT USE ASTERISKS (*) FOR ANY REASON. EVERY WORD IN YOUR RESPONSE MUST BE IN UPPERCASE. BE BRIEF.",
    };

    await pipelineRef.current.processTurn(
      samples,
      options as any,
      {
        onTranscription: (text: string) => {
          const cleanText = text.trim();
          if (cleanText) {
            setTranscript(cleanText);
            // Enhanced keyword detection for high-stakes triggers
            const keywords = ["emergency", "help", "sos", "bachao", "fall", "fell", "fire", "accident","following","stalking","trouble","danger","attack","assault","kidnap","abuse"];
            if (keywords.some(k => cleanText.toLowerCase().includes(k))) {
              triggerSOS();
            }
          }
        },
        onResponseToken: (token: string) => {
          setResponse((prev) => prev + token);
        },
        onSynthesisComplete: (audio: Float32Array, sr: number) => {
          setVoiceState("speaking");
          playerRef.current?.play(audio, sr).then(() => {
            setVoiceState("idle");
            
            audioBufferRef.current = [];
          });
        },
      } as any
    );
  } catch (e) {
    console.error("[Sathi] Tactical Pipeline Critical Failure:", e);
    setVoiceState("idle");
  }
};

  return (
    <div className={`flex flex-col h-screen p-6 transition-all duration-700 relative ${isSOS ? "bg-red-950" : "bg-black"} text-white font-mono overflow-hidden`}>
      <ModelBanner state={loader.state} progress={loader.progress} label="SATHI NEURAL INTERFACE" />

      
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <button
          onClick={voiceState === "listening" ? stopListening : startListening}
          className={`w-32 h-32 rounded-full border-2 flex items-center justify-center transition-all duration-500 z-10
            ${voiceState === "listening" ? "border-red-500 animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.3)]" : 
              voiceState === "processing" ? "border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]" :
              voiceState === "speaking" ? "border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)] animate-bounce" : "border-zinc-800"}`}
        >
          {voiceState === "listening" ? <Square size={32} className="text-red-500 fill-red-500" /> : 
           voiceState === "processing" ? <Loader2 className="animate-spin text-amber-500" size={32} /> : 
           voiceState === "speaking" ? <Volume2 className="text-green-500" size={32} /> : 
           <Mic size={32} className="text-zinc-600" />}
        </button>
        <p className={`text-[10px] uppercase tracking-[0.4em] font-bold ${voiceState !== "idle" ? "text-amber-500" : "text-zinc-600"}`}>
          {voiceState === "idle" ? "System Ready" : voiceState}
        </p>
      </div>

      
      <div className="max-w-xl mx-auto w-full space-y-4 mb-8 z-10">
        <div className="bg-zinc-900/40 border border-zinc-800/50 p-4 rounded-2xl backdrop-blur-md">
           <span className="text-[9px] text-zinc-500 block mb-1 uppercase tracking-widest font-black">Signal Input</span>
           <p className="text-sm text-zinc-300 italic min-h-[1.5rem]">
             {transcript || (voiceState === "listening" ? "Capturing audio..." : "...")}
           </p>
        </div>
        
        <div className={`p-5 rounded-2xl border transition-all duration-500 min-h-[140px] flex flex-col ${isSOS ? "bg-red-900/20 border-red-500/40" : "bg-zinc-900/80 border-white/5"}`}>
            <h4 className={`text-[10px] uppercase mb-3 tracking-[0.2em] font-black flex justify-between items-center ${isSOS ? "text-red-400" : "text-amber-500"}`}>
              <span>Tactical Analysis</span>
              {voiceState === "processing" && <Loader2 size={10} className="animate-spin" />}
            </h4>
            <div className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans overflow-y-auto max-h-[200px] pr-2 custom-scrollbar">
              {response || (voiceState === "processing" ? "Processing neural link..." : "Awaiting transmission...")}
              <div ref={responseEndRef} />
            </div>
        </div>
      </div>

      
      {needsContact && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 z-[100]">
          <div className="bg-zinc-900 p-8 rounded-[2.5rem] w-full max-w-xs border border-zinc-800 shadow-2xl">
            <button onClick={() => setNeedsContact(false)} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors"><X size={24}/></button>
            <div className="bg-red-500/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
              <AlertOctagon className="text-red-500" size={28} />
            </div>
            <h3 className="text-white font-black uppercase tracking-tighter text-2xl mb-2">Emergency Link</h3>
            <p className="text-zinc-500 text-xs mb-6 leading-relaxed">Enter a primary contact number to enable automated SOS protocols.</p>
            <input 
              type="tel" 
              placeholder="+91..." 
              className="w-full bg-black border border-zinc-800 p-4 mb-4 rounded-2xl text-amber-500 font-mono outline-none focus:border-amber-500/50 transition-all" 
              onChange={e => setTempContact(e.target.value)} 
            />
            <button 
              className="w-full bg-red-600 hover:bg-red-500 text-white p-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95" 
              onClick={() => { 
                if(tempContact) { 
                  localStorage.setItem("emergencyContacts", JSON.stringify([tempContact.trim()])); 
                  setNeedsContact(false); 
                } 
              }}
            >
              Authorize Protocol
            </button>
          </div>
        </div>
      )}
    </div>
  );
}