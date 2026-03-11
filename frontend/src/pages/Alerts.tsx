import React, { useEffect, useState } from "react";
import { fetchAlerts, AlertItem, clearAlerts } from "../api";
import { useAppContext } from "../App";
import { Trash2, RefreshCcw } from "lucide-react";

const Alerts: React.FC = () => {
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { streamReadings, recentAlerts, refreshDevices } = useAppContext();

    const load = async () => {
        setLoading(true);
        try { setAlerts(await fetchAlerts(200)); } catch (_) { }
        finally { setLoading(false); }
    };

    const handleClear = async () => {
        if (!confirm("Are you sure you want to clear all alert history? This cannot be undone.")) return;
        try {
            await clearAlerts();
            setAlerts([]);
            refreshDevices();
        } catch (_) { }
    };

    useEffect(() => { void load(); }, []);

    // Re-sync if context recentAlerts updates (max once per 8 seconds or SSE push)
    useEffect(() => {
        setAlerts(prev => {
            if (recentAlerts.length === 0) return prev;
            // merge recent alerts with fetched
            const merged = [...recentAlerts];
            const ids = new Set(merged.map(x => x.id));

            for (const p of prev) {
                if (!ids.has(p.id)) {
                    merged.push(p);
                }
            }
            return merged.sort((a, b) => (b.id - a.id));
        });
    }, [recentAlerts]);

    const severityColor = (severity?: string) => {
        switch (severity?.toUpperCase()) {
            case 'NORMAL': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
            case 'WARNING': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
            case 'CRITICAL': return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
            case 'EMERGENCY': return 'bg-red-500/20 text-red-500 border-red-500/30';
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        }
    };

    return (
        <div className="page-enter p-6 space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white">Alert History</h1>
                    <p className="text-sm text-slate-500">{alerts.length} total alerts recorded</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={load}
                        className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-100 hover:text-slate-900 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button
                        onClick={handleClear}
                        className="px-4 py-2 rounded-xl bg-red-500/10 text-red-500 text-sm font-semibold hover:bg-red-500 hover:text-white transition-all border border-red-500/20 flex items-center gap-2 shadow-sm"
                    >
                        <Trash2 className="w-4 h-4" />
                        Clear History
                    </button>
                </div>
            </div>

            {loading && alerts.length === 0 ? (
                <div className="text-center py-16 text-slate-500">Loading alerts…</div>
            ) : alerts.length === 0 ? (
                <div className="card text-center py-16 text-slate-500">
                    <div className="text-4xl mb-3">✅</div>
                    <p>No alerts recorded.</p>
                </div>
            ) : (
                <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl overflow-x-auto shadow-sm backdrop-blur">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="border-b border-slate-700/50 text-slate-400 text-xs uppercase tracking-wider bg-slate-800/30">
                                <th className="p-4 pl-6 font-semibold">Time</th>
                                <th className="p-4 font-semibold">Device</th>
                                <th className="p-4 font-semibold">Severity</th>
                                <th className="p-4 font-semibold">Magnitude</th>
                                <th className="p-4 font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50 text-slate-300">
                            {alerts.map((a) => (
                                <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                                    <td className="p-4 pl-6 text-xs font-mono text-slate-400 whitespace-nowrap">
                                        {new Date(a.timestamp || a.created_at || '').toLocaleString()}
                                    </td>
                                    <td className="p-4 font-semibold text-slate-100">
                                        {a.device || `Device ${a.device_id}`}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 inline-flex items-center justify-center rounded-md text-[11px] font-bold border ${severityColor(a.severity)} uppercase tracking-wider`}>
                                            {a.severity || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="p-4 font-mono text-sm text-slate-300">
                                        {a.magnitude?.toFixed(1) || '—'}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${a.status === 'active' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                                            {a.status || 'unknown'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Alerts;
