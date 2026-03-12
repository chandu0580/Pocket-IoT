import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
    fetchMotionHistory, 
    fetchNoiseHistory, 
    fetchDeviceAnomalies, 
    fetchDeviceUptime, 
    fetchTelemetryRate 
} from "../api";
import { useAppContext } from "../App";
import MotionChart from "../components/analytics/MotionChart";
import NoiseChart from "../components/analytics/NoiseChart";
import AnomalyTimeline from "../components/analytics/AnomalyTimeline";
import UptimePanel from "../components/analytics/UptimePanel";
import TelemetryRateChart from "../components/analytics/TelemetryRateChart";
import { ChartSkeleton, EmptyState, ErrorState } from "../components/LoadingSkeleton";
import { BarChart2, Activity, ShieldAlert, Cpu, Layers } from "lucide-react";

const Analytics: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { devices, streamReadings } = useAppContext();
    
    const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(id ? parseInt(id) : null);
    const [range, setRange] = useState("24h");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [motionData, setMotionData] = useState<{t: string, v: number}[]>([]);
    const [noiseData, setNoiseData] = useState<{t: string, v: number}[]>([]);
    const [anomalies, setAnomalies] = useState<any[]>([]);
    const [uptime, setUptime] = useState<any>(null);
    const [telemetryRate, setTelemetryRate] = useState<{t: string, v: number}[]>([]);

    const activeDevice = useMemo(() => 
        devices.find(d => d.id === selectedDeviceId), 
        [devices, selectedDeviceId]
    );

    const loadData = useCallback(async () => {
        if (!selectedDeviceId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const [m, n, a, u, t] = await Promise.all([
                fetchMotionHistory(selectedDeviceId, range),
                fetchNoiseHistory(selectedDeviceId, range),
                fetchDeviceAnomalies(selectedDeviceId),
                fetchDeviceUptime(selectedDeviceId),
                fetchTelemetryRate(selectedDeviceId, range)
            ]);

            setMotionData(m.timestamps.map((t, i) => ({ t, v: m.motion_values[i] })));
            setNoiseData(n.timestamps.map((t, i) => ({ t, v: n.noise_values[i] })));
            setAnomalies(a);
            setUptime(u);
            setTelemetryRate(t.timestamps.map((t, i) => ({ t, v: t.packet_counts ? (t as any).packet_counts[i] : (t as any).v || (t.packet_counts as any)[i] })));
            
            // Backend mismatch safety: telemetry rate response might be {timestamps, packet_counts}
            if (t.timestamps && t.packet_counts) {
                setTelemetryRate(t.timestamps.map((ts, i) => ({ t: ts, v: t.packet_counts[i] })));
            }

        } catch (err: any) {
            console.error("Analytics Load Error:", err);
            setError("Failed to fetch device analytics. Please check connection.");
        } finally {
            setLoading(false);
        }
    }, [selectedDeviceId, range]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Live update logic: if a new reading arrived for the selected device, refresh telemetry rate/motion
    useEffect(() => {
        if (!selectedDeviceId) return;
        const lastReading = streamReadings[streamReadings.length - 1];
        if (lastReading?.device_id === selectedDeviceId) {
            // We could update local state for smoothness, but for full analytics we re-fetch briefly
            // Or just rely on a slow timer. Let's do a debounced re-fetch if needed.
        }
    }, [streamReadings, selectedDeviceId]);

    const handleDeviceChange = (deviceId: number | null) => {
        setSelectedDeviceId(deviceId);
        if (deviceId) {
            navigate(`/devices/${deviceId}/analytics`);
        } else {
            navigate(`/analytics`);
        }
    };

    if (!selectedDeviceId && devices.length > 0) {
        // Automatically select the first device if none selected
        handleDeviceChange(devices[0].id);
    }

    return (
        <div className="page-enter p-6 space-y-8 max-w-[1600px] mx-auto pb-24">
            {/* Professional Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-white/5 pb-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                            <BarChart2 className="w-5 h-5 text-indigo-400" />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Device Deep-Analytics</h1>
                    </div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Activity className="w-3 h-3 text-emerald-500" /> 
                        Production Grade Monitoring & Intelligence Suite
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Device Selector */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Select Asset</label>
                        <select
                            value={selectedDeviceId ?? ""}
                            onChange={(e) => handleDeviceChange(e.target.value ? parseInt(e.target.value) : null)}
                            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-300 outline-none focus:border-indigo-500/50 transition-all min-w-[200px]"
                        >
                            {devices.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Range Selector */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Time Range</label>
                        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
                            {["1h", "24h", "7d"].map(r => (
                                <button
                                    key={r}
                                    onClick={() => setRange(r)}
                                    className={`px-5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                                        range === r ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-500 hover:text-slate-300"
                                    }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {error && <ErrorState message={error} />}

            {!selectedDeviceId && !loading && !error && (
                <EmptyState message="No devices found in this organization. Pair a device to see analytics." />
            )}

            {selectedDeviceId && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* TOP ROW: Uptime & Telemetry Rate */}
                    <div className="lg:col-span-4 h-full">
                        {loading ? <ChartSkeleton /> : uptime && (
                            <UptimePanel 
                                uptime_percentage={uptime.uptime_percentage}
                                offline_events={uptime.offline_events}
                                total_runtime_hours={uptime.total_runtime_hours}
                            />
                        )}
                    </div>
                    <div className="lg:col-span-8">
                        {loading ? <ChartSkeleton /> : <TelemetryRateChart data={telemetryRate} />}
                    </div>

                    {/* MIDDLE ROW: Motion & Noise */}
                    <div className="lg:col-span-6">
                        {loading ? <ChartSkeleton /> : <MotionChart data={motionData} title={`${activeDevice?.name || 'Device'} Motion Analysis`} />}
                    </div>
                    <div className="lg:col-span-6">
                        {loading ? <ChartSkeleton /> : <NoiseChart data={noiseData} />}
                    </div>

                    {/* BOTTOM ROW: AI Anomalies */}
                    <div className="lg:col-span-12">
                        {loading ? <ChartSkeleton /> : <AnomalyTimeline data={anomalies} />}
                    </div>
                </div>
            )}

            {/* Footer Stats/Meta */}
            <div className="flex items-center justify-between text-[9px] font-black text-slate-700 uppercase tracking-widest pt-8 border-t border-white/5">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5"><ShieldAlert className="w-3 h-3" /> Encrypted Logs</span>
                    <span className="flex items-center gap-1.5"><Cpu className="w-3 h-3" /> IA Acceleration</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5"><Layers className="w-3 h-3" /> System V4.5.1</span>
                    <span>© 2026 POCKET-IOT CORE</span>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
