import React from "react";
import { useNavigate } from "react-router-dom";
import type { Device } from "../api";
import { isOnline, postCommand, assignDeviceGroup } from "../api";
import { useAppContext } from "../App";
import { Folder, Smartphone, Activity, Volume2, Shield, Info, Battery as BatteryIcon, Ghost, Zap, Box } from "lucide-react";

interface Props {
    device: Device;
    battery?: number | null;
    lastMagnitude?: number | null;
    noise?: number | null;
    light?: number | null;
    orientation?: { pitch: number; roll: number; yaw: number } | null;
    isAnomaly?: boolean;
    anomalyScore?: number;
    onDelete?: (id: number) => void;
}

const DeviceCard: React.FC<Props> = ({ device, battery, lastMagnitude, noise, light, orientation, isAnomaly, anomalyScore, onDelete }) => {
    const { groups, refreshDevices } = useAppContext();
    const navigate = useNavigate();
    const online = isOnline(device);
    const bat = battery ?? device.battery ?? null;
    const batClass = bat === null ? "" : bat > 50 ? "battery-high" : bat > 20 ? "battery-mid" : "battery-low";

    const lastSeen = device.last_seen ? (() => {
        const seconds = Math.floor((Date.now() - new Date(device.last_seen).getTime()) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        return new Date(device.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    })() : "Never";

    const handleAssignGroup = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const gid = e.target.value === "none" ? null : Number(e.target.value);
        try {
            await assignDeviceGroup(device.id, gid);
            refreshDevices();
        } catch (err) {
            console.error("Failed to assign group", err);
        }
    };

    return (
        <div
            className="glass-card glass-card-hover p-6 cursor-pointer relative overflow-hidden group"
            onClick={() => navigate(`/devices/${device.id}`)}
        >
            {/* Background Accent */}
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br transition-all duration-500 blur-[40px] opacity-10 group-hover:opacity-20 ${online ? 'from-emerald-500' : 'from-slate-500'}`} />

            {/* Header row */}
            <div className="flex items-start justify-between relative z-10 mb-4">
                <div className="flex gap-3">
                    <div className={`p-2 rounded-xl border transition-colors ${online ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                        {device.os_info?.includes('Android') ? <Smartphone className="w-4 h-4" /> : device.os_info?.includes('iPhone') ? <Smartphone className="w-4 h-4" /> : <Box className="w-4 h-4" />}
                    </div>
                    <div>
                        <div className="font-black text-white text-sm tracking-tight leading-none mb-1 group-hover:text-indigo-300 transition-colors">
                            {device.name}
                        </div>
                        <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest opacity-60">ID {device.id} · {device.os_info || "PROBE NODE"}</div>
                    </div>
                </div>
                <div className={online ? "pill-online scale-90 origin-right" : "pill-offline scale-90 origin-right"}>
                    <span className={online ? "live-dot" : "offline-dot"} />
                    {online ? "Online" : "Ghost"}
                </div>
            </div>

            {/* Group Badge */}
            <div className="flex items-center gap-2 mb-6">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    <Folder className="w-2.5 h-2.5" />
                    {device.group_name || "Unassigned"}
                </div>
                <select
                    value={device.group_id ?? "none"}
                    onChange={handleAssignGroup}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-transparent border-none text-[8px] font-black uppercase tracking-[0.2em] text-indigo-400/60 outline-none cursor-pointer hover:text-indigo-400"
                >
                    <option value="none">Set...</option>
                    {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </select>
            </div>

            {/* Battery */}
            {bat !== null && (
                <div className="mb-6 space-y-2">
                    <div className="flex justify-between text-[9px] text-slate-500 font-black uppercase tracking-widest">
                        <span className="flex items-center gap-1"><BatteryIcon className={`w-2.5 h-2.5 ${bat < 20 ? 'animate-pulse text-rose-500' : ''}`} /> Power</span>
                        <span className="text-white font-mono">{bat.toFixed(0)}%</span>
                    </div>
                    <div className="battery-track">
                        <div
                            className={`battery-fill ${batClass}`}
                            style={{ width: `${Math.max(0, Math.min(100, bat))}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Sensor Analytics Summary */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                        <Activity className="w-3 h-3 text-cyan-400" />
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Motion</span>
                    </div>
                    <span className="text-sm font-black text-white font-mono leading-none">{(lastMagnitude ?? device.motion_magnitude ?? 0).toFixed(2)}</span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                        <Volume2 className="w-3 h-3 text-rose-400" />
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Noise</span>
                    </div>
                    <span className="text-sm font-black text-white font-mono leading-none">{noise || 0} <span className="text-[9px] opacity-40">dB</span></span>
                </div>
            </div>

            {/* AI Diagnostics */}
            <div className={`p-3 rounded-xl border transition-all duration-300 flex items-center justify-between group-hover:scale-[1.02] ${isAnomaly ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'}`}>
                <div className="flex items-center gap-2">
                    {isAnomaly ? <Shield className="w-3 h-3 animate-pulse" /> : <Zap className="w-3 h-3" />}
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">{isAnomaly ? 'Anomaly Alert' : 'System Secure'}</span>
                </div>
                {anomalyScore !== undefined && (
                    <span className="text-[8px] font-black font-mono opacity-60">{(anomalyScore * 100).toFixed(0)}% MATCH</span>
                )}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-600">
                <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                    Last seen {lastSeen}
                </div>
                <div className="text-indigo-400/80 group-hover:text-indigo-400 flex items-center gap-1 transition-all">
                    Detail View <Info className="w-2.5 h-2.5" />
                </div>
            </div>
        </div>
    );
};

export default DeviceCard;
