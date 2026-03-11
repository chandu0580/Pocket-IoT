import React, { useState } from "react";
import { postCommand } from "../api";

interface Props {
    deviceId: number;
    deviceName: string;
}

const DeviceControlPanel: React.FC<Props> = ({ deviceId, deviceName }) => {
    const [loading, setLoading] = useState(false);
    const [lastAction, setLastAction] = useState<string | null>(null);

    const handleCommand = async (cmd: string) => {
        setLoading(true);
        try {
            await postCommand(deviceId, cmd);
            setLastAction(`✅ ${cmd} sent`);
            setTimeout(() => setLastAction(null), 3000);
        } catch (e) {
            setLastAction(`❌ ${cmd} failed`);
        } finally {
            setLoading(false);
        }
    };

    const controls = [
        { cmd: "ping", label: "Ping", icon: "🔔", color: "hover:bg-slate-700/60" },
        { cmd: "vibrate", label: "Vibrate", icon: "📳", color: "hover:bg-slate-700/60" },
        { cmd: "flashlight", label: "Flashlight", icon: "🔦", color: "hover:bg-slate-700/60" },
        { cmd: "alarm", label: "Alarm", icon: "🚨", color: "hover:bg-red-900/40 border-red-900/20" },
        { cmd: "photo", label: "Photo", icon: "📸", color: "hover:bg-slate-700/60" },
        { cmd: "refresh", label: "Reload App", icon: "🔄", color: "hover:bg-slate-700/60" },
    ];

    return (
        <div className="card h-full p-4 bg-slate-900 border-slate-800 shadow-xl border-shadow">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
                <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">Remote Control</h3>
                    <p className="text-[10px] text-slate-500 mt-1 font-mono uppercase">Control {deviceName}</p>
                </div>
                {lastAction && (
                    <div className="text-[10px] font-bold text-emerald-400 bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/20 animate-pulse">
                        {lastAction}
                    </div>
                )}
            </div>
            <div className="grid grid-cols-2 gap-2">
                {controls.map((c) => (
                    <button
                        key={c.cmd}
                        disabled={loading}
                        onClick={() => handleCommand(c.cmd)}
                        className={`flex items-center gap-3 p-3 rounded-lg border border-slate-800 bg-slate-800/40 text-left transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 group font-bold ${c.color}`}
                    >
                        <span className="text-xl group-hover:scale-110 transition-transform">{c.icon}</span>
                        <div className="text-sm text-slate-200">{c.label}</div>
                    </button>
                ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800/40 text-[9px] text-slate-600 font-medium tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                COMMANDS ARE SENT VIA SSE QUEUE
            </div>
        </div>
    );
};

export default DeviceControlPanel;
