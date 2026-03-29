import React, { useState, useCallback } from "react";
import { Radio, Activity, ShieldAlert, Info } from "lucide-react";

export default function MeshRadar() {
  const [nearbyPeers, setNearbyPeers] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const SATHI_SERVICE_UUID = 0xfeaa;

  const handleAdvertisement = useCallback((event: any) => {
    setNearbyPeers((prev) => new Set(prev).add(event.device.id));
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  }, []);

  const startMeshScan = async () => {
    if (!navigator.bluetooth) {
      setError("Web Bluetooth not supported on this device.");
      return;
    }

    try {
      setError(null);
      setIsScanning(true);

      
      await (navigator as any).bluetooth.requestLEScan({
        filters: [{ services: [SATHI_SERVICE_UUID] }],
        keepRepeatedDevices: false,
      });

      navigator.bluetooth.addEventListener(
        "advertisementreceived" as any,
        handleAdvertisement
      );
    } catch (err) {
      setIsScanning(false);
      setError("Bluetooth blocked. Enable permissions.");
      console.error(err);
    }
  };

  const stopMeshScan = () => {
    setIsScanning(false);
    navigator.bluetooth.removeEventListener(
      "advertisementreceived" as any,
      handleAdvertisement
    );
  };

  return (
    <div
      className={`w-full max-w-xl mx-auto 
      p-4 sm:p-6 md:p-8 
      rounded-2xl sm:rounded-3xl 
      border transition-all duration-500 backdrop-blur-xl
      ${
        isScanning
          ? "border-amber-500/40 bg-amber-500/5 shadow-[0_0_40px_rgba(251,191,36,0.1)]"
          : "border-white/5 bg-white/[0.02]"
      }`}
    >
      <div className="flex flex-col gap-5 sm:gap-6">
        
        <div className="flex justify-between items-center">
          <div
            className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all ${
              isScanning
                ? "bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.6)]"
                : "bg-white/5 text-gray-400"
            }`}
          >
            {isScanning ? (
              <Activity className="animate-pulse" size={20} />
            ) : (
              <Radio size={20} />
            )}
          </div>

          <div className="text-right">
            <span className="block text-[9px] sm:text-[10px] font-mono text-gray-500 uppercase tracking-widest">
              Signal
            </span>
            <span className="text-[10px] sm:text-xs font-black text-amber-500">
              {isScanning ? "MAX_GAIN" : "0_DB"}
            </span>
          </div>
        </div>

        
        <div>
          <h3 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight mb-1 sm:mb-2">
            Tactical Mesh
          </h3>
          <p className="text-[11px] sm:text-xs md:text-sm text-gray-400 leading-relaxed">
            Detect nearby Sathi users via{" "}
            <span className="text-amber-400">Bluetooth Low Energy</span>. Works
            within ~50 meters without internet.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-2 sm:p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] sm:text-xs font-mono">
            <ShieldAlert size={14} className="mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-black/40 border border-white/5 backdrop-blur-md">
            <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold">
              Peers
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl font-black text-white">
              {nearbyPeers.size}
            </p>
          </div>

          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-black/40 border border-white/5 backdrop-blur-md">
            <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold">
              Latency
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl font-black text-white">
              ~20ms
            </p>
          </div>
        </div>

        
        <div className="relative overflow-hidden p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-blue-500/5 border border-blue-500/20">
          <div className="absolute top-0 right-0 p-2 opacity-5">
            <Info size={48} className="text-blue-400" />
          </div>

          <div className="flex gap-3 relative z-10">
            <div className="mt-1 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] sm:text-xs font-black text-blue-400 uppercase tracking-tighter">
                Protocol Status: Detection Only
              </p>
              <p className="text-[11px] sm:text-xs text-gray-400 leading-tight">
                Currently limited to <span className="text-blue-200">Passive Scanning</span>. 
                Secure P2P communication and mesh-data relaying are scheduled for the next deployment.
              </p>
            </div>
          </div>
        </div>

        
        <button
          onClick={isScanning ? stopMeshScan : startMeshScan}
          className={`w-full py-3 sm:py-4 md:py-5 
          rounded-xl sm:rounded-2xl 
          font-black uppercase tracking-widest 
          text-[10px] sm:text-xs md:text-sm
          transition-all active:scale-95
          ${
            isScanning
              ? "bg-red-600/20 border border-red-500/50 text-red-400 hover:bg-red-600/30"
              : "bg-gradient-to-r from-amber-400 to-orange-600 text-black shadow-xl shadow-orange-900/20 hover:brightness-110"
          }`}
        >
          {isScanning ? "Stop Scan" : "Start Scan"}
        </button>
      </div>
    </div>
  );
}