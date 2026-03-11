import React, { useEffect, useState } from "react";
import { useAppContext } from "../App";
import { isOnline } from "../api";
import { Server, Activity, Wifi } from "lucide-react";

const SystemHealth: React.FC = () => {
    const { devices, streamReadings, sseConnected } = useAppContext();
    const [timeSinceLastUpdate, setTimeSinceLastUpdate] = useState<number>(0);
    const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());

    useEffect(() => {
        if (streamReadings.length > 0) {
            setLastUpdateTime(Date.now());
            setTimeSinceLastUpdate(0);
        }
    }, [streamReadings]);

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeSinceLastUpdate(Math.floor((Date.now() - lastUpdateTime) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [lastUpdateTime]);

    const onlineDevicesCount = devices.filter(isOnline).length;
    const isHealthy = sseConnected && timeSinceLastUpdate < 20;

    return (
        <div className={`glass-card flex items-center gap-8 px-8 py-5 transition-all duration-700 relative overflow-hidden group ${isHealthy ? 'hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 'hover:shadow-[0_0_30px_rgba(244,63,94,0.1)]'}`}>

            {/* Health Gradient Decoration */}
            <div className={`absolute top-0 left-0 w-32 h-32 bg-gradient-to-br transition-all duration-500 blur-[60px] opacity-10 ${isHealthy ? 'from-emerald-500' : 'from-rose-500'}`} />

            <div className="flex items-center gap-4 relative z-10">
                <div className={`flex items-center justify-center p-3 rounded-2xl border transition-colors ${isHealthy ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                    <Server className={`w-5 h-5 ${isHealthy ? 'animate-pulse' : ''}`} />
                </div>
                <div>
                    <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${isHealthy ? 'text-emerald-500/80' : 'text-rose-500'}`}>System Hub</div>
                    <div className="text-sm font-black text-white tracking-tight">{isHealthy ? 'Healthy & Syncing' : 'Stream Interrupted'}</div>
                </div>
            </div>

            <div className="h-8 w-px bg-white/5 hidden sm:block" />

            <div className="items-center gap-4 hidden sm:flex relative z-10">
                <div className="p-2 rounded-lg bg-white/5">
                    <Wifi className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Active Fleet</span>
                    <span className="text-sm font-black text-white tabular-nums">{onlineDevicesCount} <span className="text-slate-600 font-bold">/ {devices.length}</span></span>
                </div>
            </div>

            <div className="h-8 w-px bg-white/5 hidden md:block" />

            <div className="items-center gap-4 hidden md:flex relative z-10 flex-1">
                <div className="p-2 rounded-lg bg-white/5">
                    <Activity className={`w-4 h-4 ${isHealthy ? 'text-indigo-400' : 'text-slate-600'}`} />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Live Telemetry</span>
                    {isHealthy ? (
                        <span className="text-sm font-bold text-slate-300">Pulsing {timeSinceLastUpdate}s ago</span>
                    ) : (
                        <span className="text-sm font-bold text-rose-400/60">Awaiting Signal...</span>
                    )}
                </div>
            </div>

            {/* SSE Speed Indicator */}
            {isHealthy && (
                <div className="hidden lg:flex flex-col items-end opacity-40 group-hover:opacity-100 transition-opacity">
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Stream Frequency</div>
                    <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className={`h-3 w-1.5 rounded-sm ${i <= 4 ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-slate-800'}`} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SystemHealth;
