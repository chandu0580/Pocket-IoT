import React, { useState, useEffect } from "react";
import { fetchNotifications, NotificationItem } from "../api";
import { Bell, AlertCircle, Terminal, Clock, Box, ShieldAlert } from "lucide-react";

const NotificationsPage: React.FC = () => {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const limit = 20;

    const loadNotifications = async (p: number) => {
        setLoading(true);
        try {
            const data = await fetchNotifications(limit, p * limit);
            if (p === 0) setNotifications(data);
            else setNotifications(prev => [...prev, ...data]);
            setPage(p);
        } catch (_) { }
        setLoading(false);
    };

    useEffect(() => {
        loadNotifications(0);
    }, []);

    const getSeverityColor = (type: string) => {
        if (type.includes("emergency") || type.includes("anomaly")) return "text-rose-400 bg-rose-400/10 border-rose-400/20";
        if (type.includes("critical")) return "text-orange-400 bg-orange-400/10 border-orange-400/20";
        if (type.includes("warning")) return "text-amber-400 bg-amber-400/10 border-amber-400/20";
        return "text-indigo-400 bg-indigo-400/10 border-indigo-400/20";
    };

    return (
        <div className="page-enter p-6 max-w-7xl mx-auto space-y-8">
            {/* Header Section */}
            <div className="relative group overflow-hidden bg-slate-900/60 p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl transition-all duration-500 hover:shadow-indigo-500/5">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full -mr-48 -mt-48 transition-all group-hover:bg-indigo-500/20" />
                <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 z-10">
                    <div className="flex items-center gap-10">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500/30 blur-2xl rounded-full scale-125 group-hover:bg-indigo-500/50 transition-all duration-500" />
                            <div className="relative w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center border-2 border-indigo-500/30 shadow-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                                <Bell className="w-10 h-10 text-indigo-400" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-4xl font-black tracking-tight text-white uppercase group-hover:translate-x-1 transition-transform duration-500">
                                Notification <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">Hub</span>
                            </h1>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400/80">Fleet Alert History</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Organization Scoped</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="px-6 py-4 bg-slate-800/40 rounded-2xl border border-slate-700/50 backdrop-blur-md">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Logs</div>
                            <div className="text-2xl font-black text-white">{notifications.length}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 gap-4">
                {notifications.length > 0 ? (
                    <>
                        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm shadow-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-800/50 border-b border-slate-700/50">
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Severity</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Device Node</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">System Message</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Channel Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {notifications.map((n, i) => (
                                            <tr key={n.id || i} className="group hover:bg-slate-800/30 transition-all duration-300">
                                                <td className="px-8 py-6 whitespace-nowrap">
                                                    <div className="flex items-center gap-4 text-slate-300">
                                                        <Clock className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                                                        <span className="text-sm font-medium">
                                                            {new Date(n.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 whitespace-nowrap">
                                                    <span className={`px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${getSeverityColor(n.type)}`}>
                                                        {n.type}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700 shadow-inner group-hover:border-slate-600 group-hover:-translate-y-1 transition-all">
                                                            <Box className="w-4 h-4 text-cyan-400" />
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-200 uppercase tracking-tight">{n.device_name || 'System'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <p className="text-sm text-slate-400 group-hover:text-slate-100 transition-colors line-clamp-2 max-w-lg font-medium leading-relaxed">
                                                        {n.message}
                                                    </p>
                                                </td>
                                                <td className="px-8 py-6 whitespace-nowrap text-right">
                                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800/40 rounded-lg text-[10px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-500/20">
                                                        <ShieldAlert className="w-3 h-3" /> {n.status}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex justify-center pt-8">
                            <button
                                onClick={() => loadNotifications(page + 1)}
                                disabled={loading}
                                className="group relative px-10 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl transition-all duration-300 disabled:opacity-50 overflow-hidden shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-1"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-white/10 to-indigo-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                <span className="relative text-[10px] font-black uppercase tracking-[0.3em]">
                                    {loading ? "FETCHING..." : "LOAD MORE AUDIT LOGS"}
                                </span>
                            </button>
                        </div>
                    </>
                ) : loading ? (
                    <div className="flex flex-col items-center justify-center p-40 bg-slate-900/30 rounded-[3rem] border border-dashed border-slate-800/50">
                        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6" />
                        <p className="text-xs font-black uppercase tracking-widest text-slate-600">Syncing Intelligence History...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-40 bg-slate-900/30 rounded-[3rem] border border-dashed border-slate-800/50 text-center group">
                        <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center border-2 border-slate-700 shadow-2xl mb-8 group-hover:rotate-12 transition-all duration-500">
                            <Terminal className="w-10 h-10 text-slate-600" />
                        </div>
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">No System Logs Found</h3>
                        <p className="text-xs text-slate-600 uppercase tracking-widest font-bold">The fleet is operating within normal parameters.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
