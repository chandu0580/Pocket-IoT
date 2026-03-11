import React, { useEffect, useState } from "react";
import { fetchAnalytics, Device } from "../api";
import { useAppContext } from "../App";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, BarChart, Bar
} from "recharts";
import { ChartSkeleton, EmptyState } from "../components/LoadingSkeleton";

const Analytics: React.FC = () => {
    const { devices } = useAppContext();
    const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
    const [range, setRange] = useState("1h");
    const [loading, setLoading] = useState(false);

    const [motionData, setMotionData] = useState<any[]>([]);
    const [batteryData, setBatteryData] = useState<any[]>([]);
    const [noiseData, setNoiseData] = useState<any[]>([]);
    const [lightData, setLightData] = useState<any[]>([]);
    const [anomalyData, setAnomalyData] = useState<any[]>([]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [m, b, n, l, a] = await Promise.all([
                    fetchAnalytics("motion", range, selectedDevice),
                    fetchAnalytics("battery", range, selectedDevice),
                    fetchAnalytics("noise", range, selectedDevice),
                    fetchAnalytics("light", range, selectedDevice),
                    fetchAnalytics("anomalies", range, selectedDevice),
                ]);
                setMotionData(m);
                setBatteryData(b);
                setNoiseData(n);
                setLightData(l);
                setAnomalyData(a);
            } catch (err) {
                console.error("Failed to fetch analytics", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [selectedDevice, range]);

    const formatTime = (ts: string) => {
        const d = new Date(ts);
        if (range === "5m" || range === "30m" || range === "1h") {
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
        return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' });
    };

    const renderChart = (title: string, data: any[], color: string, unit: string, isBar = false) => (
        <div className="card p-6 flex flex-col h-[350px]">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                {title}
            </h3>
            {loading ? (
                <ChartSkeleton />
            ) : data.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-600 text-[10px] uppercase font-black tracking-widest">No data available</div>
            ) : (
                <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        {isBar ? (
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.3} />
                                <XAxis dataKey="timestamp" tickFormatter={formatTime} hide />
                                <YAxis stroke="#475569" fontSize={9} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '10px' }}
                                    labelFormatter={formatTime}
                                />
                                <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        ) : (
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.3} />
                                <XAxis dataKey="timestamp" tickFormatter={formatTime} hide />
                                <YAxis stroke="#475569" fontSize={9} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '10px' }}
                                    labelFormatter={formatTime}
                                    formatter={(val: number) => [`${val} ${unit}`, title]}
                                />
                                <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#grad-${title})`} dot={false} />
                            </AreaChart>
                        )}
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );

    return (
        <div className="page-enter p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Time-Series Analytics</h1>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase font-black tracking-widest opacity-60">Deep historical inspection across secure nodes</p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3">
                    <select
                        value={selectedDevice ?? ""}
                        onChange={(e) => setSelectedDevice(e.target.value ? Number(e.target.value) : null)}
                        className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 outline-none focus:border-indigo-500/50 transition-all"
                    >
                        <option value="">All Devices</option>
                        {devices.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>

                    <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
                        {["5m", "30m", "1h", "24h"].map(r => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${range === r ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-500 hover:text-slate-300"
                                    }`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {renderChart("Motion Magnitude", motionData, "#22d3ee", "m/s²")}
                {renderChart("Battery Level", batteryData, "#10b981", "%")}
                {renderChart("Acoustic Noise", noiseData, "#f43f5e", "dB")}
                {renderChart("Ambient Light", lightData, "#f59e0b", "lx")}
                <div className="md:col-span-2">
                    {renderChart("Anomaly Frequency", anomalyData, "#8b5cf6", "Alerts", true)}
                </div>
            </div>
        </div>
    );
};

export default Analytics;
