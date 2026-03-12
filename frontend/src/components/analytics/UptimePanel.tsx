import React from 'react';
import { Clock, ShieldCheck } from 'lucide-react';

interface Props {
    uptime_percentage: number;
    offline_events: number;
    total_runtime_hours: number;
}

const UptimePanel: React.FC<Props> = ({ uptime_percentage, offline_events, total_runtime_hours }) => (
    <div className="card h-full p-6 bg-slate-900 border-slate-800 flex flex-col justify-between">
        <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400 mb-6 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Device Availability Metrics
        </h3>
        
        <div className="grid grid-cols-1 gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-[10px] font-black text-slate-500 uppercase mb-1">Total System Uptime</div>
                    <div className="text-4xl font-black text-white tracking-tighter">
                        {uptime_percentage.toFixed(1)}<span className="text-lg text-cyan-500">%</span>
                    </div>
                </div>
                <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center ${uptime_percentage > 95 ? 'border-emerald-500/20 text-emerald-500' : 'border-amber-500/20 text-amber-500'}`}>
                    <ShieldCheck className="w-8 h-8" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                    <div className="text-[9px] font-black text-slate-600 uppercase mb-1">Offline Events</div>
                    <div className="text-xl font-black text-rose-500">{offline_events}</div>
                </div>
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                    <div className="text-[9px] font-black text-slate-600 uppercase mb-1">Run Time (Hrs)</div>
                    <div className="text-xl font-black text-indigo-400">{total_runtime_hours.toFixed(1)}</div>
                </div>
            </div>
        </div>

        <div className="mt-6">
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                    className={`h-full transition-all duration-1000 ${uptime_percentage > 95 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${uptime_percentage}%` }}
                />
            </div>
        </div>
    </div>
);

export default UptimePanel;
