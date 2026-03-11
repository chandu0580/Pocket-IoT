import React, { useMemo } from 'react';
import { useAppContext } from '../App';
import { ShieldCheck, ShieldAlert, ShieldX, Activity } from 'lucide-react';
import PremiumHealthOrb from './PremiumHealthOrb';

const SystemHealthOrb: React.FC = () => {
    const { devices, recentAlerts, sseConnected } = useAppContext();

    const healthStatus = useMemo(() => {
        const hasAnomalies = recentAlerts.some(a => a.status === 'active');
        const offlineCount = devices.filter(d => d.status === 'offline').length;

        if (hasAnomalies) return 'anomaly';
        if (offlineCount > 0) return 'warning';
        return 'healthy';
    }, [recentAlerts, devices]);

    const theme = {
        healthy: {
            color: '#10b981', // emerald-500
            label: 'System Nominal',
            icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
            desc: 'ALL INTELLIGENCE NODES SYNCED',
            shadow: 'shadow-emerald-500/20'
        },
        warning: {
            color: '#f59e0b', // amber-500
            label: 'Network Degradation',
            icon: <ShieldAlert className="w-5 h-5 text-amber-400" />,
            desc: 'SOME ASSETS OFFLINE',
            shadow: 'shadow-amber-500/20'
        },
        anomaly: {
            color: '#ef4444', // red-500
            label: 'Critical Anomaly',
            icon: <ShieldX className="w-5 h-5 text-rose-400" />,
            desc: 'AI DETECTED IRREGULARITY',
            shadow: 'shadow-rose-500/20'
        }
    }[healthStatus];

    return (
        <div className="glass-card overflow-hidden border-white/5 bg-slate-900/40 relative group">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">

                {/* 3D Visual Area */}
                <div className="md:col-span-5 h-[340px] relative">
                    <div className={`absolute inset-0 bg-gradient-to-b from-transparent to-${healthStatus === 'healthy' ? 'emerald' : healthStatus === 'warning' ? 'amber' : 'rose'}-500/5 pointer-events-none transition-colors duration-1000`} />

                    <PremiumHealthOrb status={healthStatus} height="340px" showText={false} />

                    {/* Overlay glow */}
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 blur-[80px] opacity-20 rounded-full transition-colors duration-1000`} style={{ backgroundColor: theme.color }} />
                </div>

                {/* Status Information */}
                <div className="md:col-span-7 p-8 space-y-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl bg-slate-800 border border-white/5 shadow-2xl ${theme.shadow}`}>
                                {theme.icon}
                            </div>
                            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                        </div>
                        <h2 className="text-3xl font-black text-white italic tracking-tight">{theme.label}</h2>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">{theme.desc}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                            <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Link Integrity</div>
                            <div className="flex items-center gap-2">
                                <Activity className={`w-3 h-3 ${sseConnected ? 'text-emerald-400' : 'text-slate-600'}`} />
                                <span className={`text-xs font-black italic ${sseConnected ? 'text-white' : 'text-slate-600'}`}>
                                    {sseConnected ? 'ENCRYPTED' : 'OFFLINE'}
                                </span>
                            </div>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                            <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Neural Load</div>
                            <div className="text-xs font-black text-white italic">14.2ms / CORE</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                        <div className="flex -space-x-2">
                            {devices.slice(0, 4).map((d, i) => (
                                <div key={d.id} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] font-black text-slate-500 overflow-hidden shadow-xl">
                                    {d.name.charAt(0)}
                                </div>
                            ))}
                            {devices.length > 4 && (
                                <div className="w-8 h-8 rounded-full bg-indigo-600 border-2 border-slate-900 flex items-center justify-center text-[9px] font-black text-white shadow-xl">
                                    +{devices.length - 4}
                                </div>
                            )}
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            MONITORING {devices.length} REMOTE ASSETS
                        </span>
                    </div>
                </div>
            </div>

            {/* Subtle light bar */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
    );
};

export default SystemHealthOrb;
