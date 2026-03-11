import React from "react";
import { Activity, Battery, Signal, Zap } from "lucide-react";
import { Device } from "../api";

interface Props {
    device: Device;
    isOnline: boolean;
    battery: number | null;
}

const DeviceHealthWidget: React.FC<Props> = ({ device, isOnline, battery }) => {
    const bat = battery ?? 0;
    const batColor = bat > 50 ? "text-emerald-400" : bat > 20 ? "text-amber-400" : "text-red-400";
    const batBg = bat > 50 ? "bg-emerald-500/10" : bat > 20 ? "bg-amber-500/10" : "bg-red-500/10";

    return (
        <div className="group relative overflow-hidden p-4 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-indigo-500/30 transition-all duration-300 shadow-xl">
            {/* Background glow if online */}
            {isOnline && (
                <div className="absolute -top-12 -right-12 w-24 h-24 bg-indigo-500/10 blur-2xl rounded-full" />
            )}

            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isOnline ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                        <Activity className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white leading-none">{device.name}</h3>
                        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Device ID {device.id}</span>
                    </div>
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                    {isOnline ? 'Online' : 'Offline'}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
                <div className={`flex items-center gap-2 p-2 rounded-xl ${batBg}`}>
                    <Battery className={`w-3.5 h-3.5 ${batColor}`} />
                    <div>
                        <div className="text-[9px] text-slate-500 uppercase font-bold tracking-tight">Battery</div>
                        <div className={`text-xs font-black ${batColor}`}>{battery !== null ? `${bat.toFixed(0)}%` : '—'}</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-cyan-500/5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <div>
                        <div className="text-[9px] text-slate-500 uppercase font-bold tracking-tight">Motion</div>
                        <div className="text-xs font-black text-cyan-400">{device.motion_magnitude?.toFixed(1) || '0.0'}</div>
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                <span className="text-slate-500">Signal Strength</span>
                <div className="flex gap-0.5">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`w-1 h-3 rounded-full ${isOnline && i <= 3 ? 'bg-indigo-500' : 'bg-slate-800'}`} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DeviceHealthWidget;
