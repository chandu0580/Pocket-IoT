import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "../App";
import { fetchSensorData, fetchAlerts, SensorReading, AlertItem, isOnline, updateDevice, assignDeviceGroup } from "../api";
import MotionChart from "../components/MotionChart";
import AlertsPanel from "../components/AlertsPanel";
import BatteryWidget from "../components/BatteryWidget";
import EnvironmentalChart from "../components/EnvironmentalChart";
import SnapshotGallery from "../components/SnapshotGallery";
import OrientationWidget from "../components/OrientationWidget";
import AlertRuleManager from "../components/AlertRuleManager";
import TelemetryReplay from "../components/TelemetryReplay";
import LiveCameraStream from "../components/LiveCameraStream";
import DeviceMotion3D from "../components/DeviceMotion3D";
import { Settings as SettingsIcon, Save, X } from "lucide-react";

const DeviceDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { devices, groups, refreshDevices, streamReadings } = useAppContext();

    const deviceId = id ? parseInt(id, 10) : NaN;
    const device = devices.find((d) => d.id === deviceId);

    const [history, setHistory] = useState<SensorReading[]>([]);
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [editGroupId, setEditGroupId] = useState<number | null>(null);

    useEffect(() => {
        if (isNaN(deviceId)) return;
        setLoading(true);
        Promise.all([fetchSensorData(200, deviceId), fetchAlerts(50, deviceId)])
            .then(([s, a]) => { setHistory(s); setAlerts(a); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [deviceId]);

    useEffect(() => {
        if (device) {
            setEditName(device.name);
            setEditGroupId(device.group_id);
        }
    }, [device]);

    const handleSaveSettings = async () => {
        if (!device) return;
        setLoading(true);
        try {
            await updateDevice(device.id, { name: editName });
            await assignDeviceGroup(device.id, editGroupId);
            await refreshDevices();
            setIsEditing(false);
        } catch (err) {
            console.error("Failed to save settings", err);
        } finally {
            setLoading(false);
        }
    };

    // Merge historical + live stream for this device
    const allReadings = useMemo(() => {
        const live = streamReadings.filter((r) => r.device_id === deviceId);
        const merged = [
            ...history,
            ...live.map((r, i) => ({ ...r, id: 1000000 + i } as SensorReading)),
        ];
        // Deduplicate by id
        const seen = new Set<number>();
        return merged.filter((r) => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
    }, [history, streamReadings, deviceId]);

    const latestReading = allReadings[allReadings.length - 1];

    if (!device && !loading) {
        return (
            <div className="p-6 text-center text-slate-400">
                <p className="text-4xl mb-3">❓</p>
                <p>Device not found.</p>
                <button className="mt-4 px-4 py-2 bg-slate-800 rounded-lg text-sm" onClick={() => navigate("/devices")}>
                    ← Back to Devices
                </button>
            </div>
        );
    }

    const online = device ? isOnline(device) : false;

    return (
        <div className="page-enter p-6 space-y-8 max-w-7xl mx-auto pb-24 relative overflow-x-hidden">
            {/* Ambient Background Aura */}
            <div className="absolute top-0 right-0 w-[50%] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/4" />

            {/* Back + header - Higher Z and Backdrop */}
            <div className="sticky top-6 z-50 flex items-center gap-4 mb-8 glass-card border-white/10 px-6 py-4 shadow-2xl backdrop-blur-3xl">
                <button
                    onClick={() => navigate("/devices")}
                    className="text-slate-400 hover:text-white text-sm font-semibold transition-colors uppercase tracking-widest text-[9px] bg-white/5 px-3 py-1.5 rounded-lg border border-white/5"
                >
                    ← FLEET
                </button>
                <div className="flex-1">
                    {isEditing ? (
                        <div className="flex items-center gap-3">
                            <input
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                className="bg-slate-900 border border-indigo-500/50 rounded-lg px-3 py-1 text-white text-xl font-black outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                            <select
                                value={editGroupId ?? "none"}
                                onChange={e => setEditGroupId(e.target.value === "none" ? null : Number(e.target.value))}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-bold"
                            >
                                <option value="none">UNASSIGNED</option>
                                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                            <button onClick={handleSaveSettings} className="p-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-400 transition-colors">
                                <Save className="w-4 h-4" />
                            </button>
                            <button onClick={() => setIsEditing(false)} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black text-white flex items-center gap-3">
                                {device?.name ?? `Device ${deviceId}`}
                                <span className="text-[10px] font-mono text-slate-500 bg-slate-800/40 px-3 py-1 rounded-full uppercase tracking-tighter border border-slate-700/40">NODE_{deviceId}</span>
                            </h1>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-slate-500 hover:text-indigo-400 hover:border-indigo-400/30 transition-all"
                            >
                                <SettingsIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                    <p className="text-[10px] text-slate-500 mt-1 uppercase font-black tracking-widest opacity-60">
                        {device?.os_info || "GENERIC DEVICE"} · {device?.group_name ? `GROUP: ${device.group_name}` : 'UNASSIGNED'} · {device?.created_at ? new Date(device.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'INITIALIZING...'}
                    </p>
                </div>
                <div className={online ? "pill-online scale-110" : "pill-offline scale-110"}>
                    <span className={online ? "live-dot shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "offline-dot"} />
                    {online ? "Online" : "Offline"}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-16 text-slate-500 flex flex-col items-center gap-4">
                    <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-cyan-500 animate-spin" />
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-60">SYNCHRONIZING SECURE TUNNEL…</div>
                </div>
            ) : (
                <div className="space-y-12">
                    {/* Top: Analytics & Interactive Visuals */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                        {/* Left column (Detailed Sensors) */}
                        <div className="xl:col-span-8 space-y-6">
                            {/* Diagnostics row */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: "Battery Health", value: device?.battery_health || "Good", icon: "🩺", color: "text-emerald-400", sub: "EXCELLENT" },
                                    { label: "Storage", value: device?.storage_usage ? `${device.storage_usage}%` : "65.5%", icon: "💾", color: "text-blue-400", sub: "CAPACITY" },
                                    { label: "Network", value: device?.network_strength || "Strong", icon: "📶", color: "text-indigo-400", sub: "842 Mbps" },
                                    { label: "System", value: device?.os_info || "Android", icon: "⚙️", color: "text-slate-400", sub: "OS KERNEL" },
                                ].map((s) => (
                                    <div key={s.label} className="card p-4 transition-all hover:bg-slate-900/60 group">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="text-xl group-hover:scale-110 transition-transform">{s.icon}</div>
                                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-tighter opacity-40">{s.sub}</div>
                                        </div>
                                        <div className={`text-sm font-black ${s.color} uppercase`}>{s.value}</div>
                                        <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-1 font-black opacity-80">{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Telemetry Replay */}
                            <TelemetryReplay deviceId={deviceId} deviceName={device?.name} />

                            {/* Motion charts */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <MotionChart readings={allReadings} deviceId={deviceId} title="Accelerometer Pipeline" mode="accelerometer" />
                                <MotionChart readings={allReadings} deviceId={deviceId} title="Gyroscope Pipeline" mode="gyroscope" />
                            </div>

                            {/* Environmental charts */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <EnvironmentalChart readings={allReadings} type="noise" title="Acoustic Magnitude (Decibel)" />
                                <EnvironmentalChart readings={allReadings} type="light" title="Luminescence (Illuminance)" />
                            </div>

                            {/* Orientation Widget */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                                <OrientationWidget reading={latestReading} />
                                <div className="card p-4">
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Battery Energy Management</div>
                                    <BatteryWidget battery={latestReading?.battery || 0} deviceName={device?.name || "Device"} />
                                </div>
                            </div>
                        </div>

                        {/* Right column (Visual Centers: Camera & 3D) */}
                        <div className="xl:col-span-4 space-y-6 flex flex-col min-h-0">
                            <LiveCameraStream deviceId={deviceId} deviceName={device?.name} />
                            <div className="flex-1 min-h-[420px]">
                                <DeviceMotion3D deviceId={deviceId} />
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: History, Rules, Alerts - Side-by-Side */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10 pt-4 border-t border-white/5">
                        <SnapshotGallery deviceId={deviceId} />
                        <AlertRuleManager deviceId={deviceId} />
                        <div className="lg:min-h-[400px] flex flex-col">
                            <AlertsPanel alerts={alerts} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeviceDetail;
