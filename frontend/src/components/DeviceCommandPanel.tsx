import React, { useState } from "react";
import { postCommand } from "../api";
import { Terminal, Zap, Camera, Play, Pause, Activity, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface Props {
    deviceId: number;
}

interface CommandResult {
    id: string;
    command: string;
    status: 'pending' | 'success' | 'error';
    message?: string;
}

const DeviceCommandPanel: React.FC<Props> = ({ deviceId }) => {
    const [results, setResults] = useState<CommandResult[]>([]);
    const [executing, setExecuting] = useState<string | null>(null);

    const runCommand = async (command: string, label: string) => {
        if (executing) return;
        
        const newRes: CommandResult = { id: Math.random().toString(36).substr(2, 9), command: label, status: 'pending' };
        setResults(prev => [newRes, ...prev.slice(0, 4)]);
        setExecuting(command);

        try {
            await postCommand(deviceId, command);
            // We set to success when "queued" on backend. 
            // In a real production app we'd wait for SSE 'command_executed'
            setResults(prev => prev.map(r => r.id === newRes.id ? { ...r, status: 'success' } : r));
        } catch (err: any) {
            setResults(prev => prev.map(r => r.id === newRes.id ? { ...r, status: 'error', message: err.message } : r));
        } finally {
            setExecuting(null);
        }
    };

    const commands = [
        { id: 'toggle_camera', label: 'Toggle Camera', icon: <Camera className="w-4 h-4" />, color: 'text-cyan-400', bg: 'hover:bg-cyan-500/10' },
        { id: 'enable_sensors', label: 'Enable Sensors', icon: <Play className="w-4 h-4" />, color: 'text-emerald-400', bg: 'hover:bg-emerald-500/10' },
        { id: 'disable_sensors', label: 'Disable Sensors', icon: <Pause className="w-4 h-4" />, color: 'text-rose-400', bg: 'hover:bg-rose-500/10' },
        { id: 'ping', label: 'Ping Device', icon: <Zap className="w-4 h-4" />, color: 'text-amber-400', bg: 'hover:bg-amber-500/10' },
    ];

    return (
        <div className="card h-full p-6 bg-slate-900 border-slate-800 flex flex-col group overflow-hidden relative">
            <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 flex items-center gap-2">
                    <Terminal className="w-4 h-4" /> Remote Command Control
                </h3>
                <div className="flex items-center gap-2">
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Secure Uplink</div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
                {commands.map((cmd) => (
                    <button
                        key={cmd.id}
                        disabled={!!executing}
                        onClick={() => runCommand(cmd.id, cmd.label)}
                        className={`p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${cmd.bg} hover:border-white/10`}
                    >
                        <div className={cmd.color}>{cmd.icon}</div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{cmd.label}</span>
                    </button>
                ))}
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto max-h-[160px] custom-scrollbar">
                <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Activity className="w-3 h-3" /> Console Output
                </div>
                {results.length === 0 ? (
                    <div className="text-[10px] text-slate-700 italic py-4 text-center">No commands issued in this session.</div>
                ) : (
                    results.map((res) => (
                        <div key={res.id} className="flex items-center justify-between p-2 rounded-lg bg-black/20 border border-white/5">
                            <div className="flex items-center gap-3">
                                {res.status === 'pending' ? <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" /> :
                                 res.status === 'success' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> :
                                 <XCircle className="w-3 h-3 text-rose-400" />}
                                <span className="text-[10px] font-bold text-slate-300 uppercase">{res.command}</span>
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-widest ${
                                res.status === 'pending' ? 'text-indigo-500' :
                                res.status === 'success' ? 'text-emerald-500' : 'text-rose-500'
                            }`}>
                                {res.status === 'pending' ? 'Queuing' : 
                                 res.status === 'success' ? 'Queued' : 'Failed'}
                            </span>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[8px] font-bold text-slate-600 uppercase tracking-widest">
                <span>POCKET-IOT-CORE V4.2</span>
                <span className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-emerald-500" />
                    Encrypted Pipeline
                </span>
            </div>
        </div>
    );
};

export default DeviceCommandPanel;
