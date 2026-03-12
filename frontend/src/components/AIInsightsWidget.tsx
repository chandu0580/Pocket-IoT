import React, { useEffect, useState } from "react";
import { fetchAIInsights, fetchAlerts, AlertItem } from "../api";
import { AlertTriangle, Activity, Zap, BarChart3, ShieldAlert, Clock } from "lucide-react";

interface Insights {
    anomalies_today: number;
    most_active_device: string;
    highest_motion_spike: number;
    average_magnitude: number;
}

const AIInsightsWidget: React.FC = () => {
    const [insights, setInsights] = useState<Insights | null>(null);
    const [recentAnomalies, setRecentAnomalies] = useState<AlertItem[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            const [data, alerts] = await Promise.all([
                fetchAIInsights(),
                fetchAlerts(10)
            ]);
            setInsights(data);
            setRecentAnomalies(alerts.filter(a => a.type.includes('anomaly') || a.severity === 'critical'));
        } catch (err) {
            console.error("Failed to load AI insights", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        const interval = setInterval(load, 15000);
        return () => clearInterval(interval);
    }, []);

    if (loading && !insights) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-24 bg-slate-900/50 border border-slate-800 rounded-2xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    const cards = [
        {
            label: "Anomalies Identified",
            value: insights?.anomalies_today ?? 0,
            icon: <ShieldAlert className="w-5 h-5 text-rose-500" />,
            color: "text-rose-500",
            bg: "bg-rose-500/10",
        },
        {
            label: "Avg System Load",
            value: (insights?.average_magnitude ?? 0).toFixed(2),
            icon: <Activity className="w-5 h-5 text-indigo-500" />,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
            suffix: " m/s²"
        },
        {
            label: "Peak Magnitude",
            value: (insights?.highest_motion_spike ?? 0).toFixed(1),
            icon: <Zap className="w-5 h-5 text-cyan-500" />,
            color: "text-cyan-500",
            bg: "bg-cyan-500/10",
            suffix: " m/s²"
        },
        {
            label: "Critical Asset",
            value: insights?.most_active_device?.split('-')[0] || "N/A",
            icon: <BarChart3 className="w-5 h-5 text-amber-500" />,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
        }
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((card, i) => (
                    <div key={i} className="glass-card p-4 flex items-center gap-4 transition-all hover:border-white/10">
                        <div className={`p-3 rounded-xl ${card.bg}`}>
                            {card.icon}
                        </div>
                        <div>
                            <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-0.5">
                                {card.label}
                            </div>
                            <div className={`text-xl font-black ${card.color}`}>
                                {card.value}{card.suffix || ''}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-500" /> RECENT ANOMALY LOG
                    </h3>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        IsolationForest V2.4
                    </div>
                </div>

                <div className="space-y-3">
                    {recentAnomalies.length === 0 ? (
                        <div className="py-8 text-center text-slate-600 text-[10px] font-bold uppercase tracking-widest italic opacity-40">
                             No critical irregularities detected in recent telemetry.
                        </div>
                    ) : (
                        recentAnomalies.map((a) => (
                            <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className={`w-1.5 h-1.5 rounded-full ${a.severity === 'critical' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-amber-500'}`} />
                                    <div>
                                        <div className="text-xs font-black text-white group-hover:text-indigo-300 transition-colors uppercase tracking-tight">
                                           {a.message}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] font-bold text-slate-500 uppercase">{a.device_name || 'System Node'}</span>
                                            <span className="text-slate-700">•</span>
                                            <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1">
                                                <Clock className="w-2.5 h-2.5" />
                                                {new Date(a.created_at || "").toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-[10px] font-black italic ${a.severity === 'critical' || a.severity === 'high' ? 'text-rose-400' : 'text-amber-400'}`}>
                                        RISK SCORE: {(a.magnitude ? a.magnitude.toFixed(2) : "0.45")}
                                    </div>
                                    <div className="w-24 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                                        <div 
                                            className={`h-full ${a.severity === 'critical' || a.severity === 'high' ? 'bg-rose-500' : 'bg-amber-500'}`} 
                                            style={{ width: `${Math.min(100, (a.magnitude || 0.45) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIInsightsWidget;
