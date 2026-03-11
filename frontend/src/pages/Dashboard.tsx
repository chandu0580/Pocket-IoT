import React, { useMemo } from "react";
import { useAppContext } from "../App";
import { isOnline, fetchDeviceLocations, clearAlerts, SensorReading } from "../api";
import DeviceCard from "../components/DeviceCard";
import MotionChart from "../components/MotionChart";
import AlertsPanel from "../components/AlertsPanel";
import ActivityFeed from "../components/ActivityFeed";
import BatteryWidget from "../components/BatteryWidget";
import AIInsightsWidget from "../components/AIInsightsWidget";
import SystemHealth from "../components/SystemHealth";
import DeviceHealthWidget from "../components/DeviceHealthWidget";
import SystemHealthOrb from "../components/SystemHealthOrb";
import { LoadingSkeleton, CardSkeleton } from "../components/LoadingSkeleton";
import { Activity, Cpu, Wifi, AlertCircle, ArrowRight, Shield, Zap, TrendingUp, BarChart3, Bell, User } from "lucide-react";

const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color: string; trend?: string }> = ({
    icon, label, value, color, trend
}) => (
    <div className="metric-card group relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            {icon}
        </div>
        <div className="relative z-10">
            <div className={`p-2 w-10 h-10 rounded-xl bg-slate-800/50 border border-white/5 flex items-center justify-center mb-4 ${color}`}>
                {icon}
            </div>
            <div className="metric-value">{value}</div>
            <div className="flex items-center justify-between mt-1">
                <div className="metric-label">{label}</div>
                {trend && (
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <TrendingUp className="w-2.5 h-2.5" /> {trend}
                    </span>
                )}
            </div>
        </div>
        {/* Subtle bottom glow */}
        <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${color.includes('indigo') ? 'from-indigo-500' : color.includes('emerald') ? 'from-emerald-500' : 'from-rose-500'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
    </div>
);

const Dashboard: React.FC = () => {
    const { devices, groups, stats, streamReadings, recentAlerts, sseConnected, refreshDevices, refreshGroups, activeOrg, activeUser } = useAppContext();

    const [initialState, setInitialState] = React.useState<Record<number, Partial<SensorReading>>>({});
    const [selectedGroupId, setSelectedGroupId] = React.useState<number | "all">("all");
    const [isCreatingGroup, setIsCreatingGroup] = React.useState(false);
    const [newGroupName, setNewGroupName] = React.useState("");

    React.useEffect(() => {
        fetchDeviceLocations().then(locs => {
            const state: Record<number, any> = {};
            for (const l of locs) {
                state[l.device_id] = { battery: l.battery, motion_magnitude: l.magnitude, is_anomaly: false, anomaly_score: 0 };
            }
            setInitialState(state);
        }).catch(() => { });
    }, []);

    const latestByDevice = useMemo(() => {
        const map = new Map<number, Partial<SensorReading>>();
        Object.keys(initialState).forEach(k => {
            map.set(Number(k), initialState[Number(k)]);
        });
        for (const r of streamReadings) {
            map.set(r.device_id, r);
        }
        return map;
    }, [streamReadings, initialState]);

    const handleClearAlerts = async () => {
        if (!confirm("Clear all alerts?")) return;
        try {
            await clearAlerts();
            refreshDevices();
        } catch (_) { }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return;
        try {
            const { createGroup } = await import("../api");
            await createGroup(newGroupName);
            setNewGroupName("");
            setIsCreatingGroup(false);
            refreshGroups();
        } catch (_) { }
    };

    const filteredDevices = useMemo(() => {
        if (selectedGroupId === "all") return devices;
        return devices.filter(d => d.group_id === Number(selectedGroupId));
    }, [devices, selectedGroupId]);

    const onlineCount = filteredDevices.filter(isOnline).length;
    const anomaliesToday = recentAlerts.filter(a => {
        const today = new Date().toISOString().split('T')[0];
        const dateStr = a.created_at || a.timestamp || "";
        return dateStr.startsWith(today) && a.status === 'active';
    }).length;

    return (
        <div className="page-enter p-8 space-y-8 max-w-[1600px] mx-auto bg-grid pb-24">

            {/* ── Dashboard Header ──────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-white/5">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                            <Zap className="w-4 h-4 text-indigo-400" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-white to-slate-500 bg-clip-text text-transparent">
                            System Overview
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 py-0.5 px-2 rounded-md bg-white/5 border border-white/10 text-[9px] font-black text-slate-400 tracking-widest uppercase">
                            <Shield className="w-2.5 h-2.5 text-indigo-400" />
                            {activeOrg?.name || "PocketIoT"} · {activeUser?.role || "Admin"}
                        </div>
                        <span className="text-slate-700">/</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                            {onlineCount} Assets currently transmitting
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className={`group flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all duration-500 ${sseConnected
                        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                        : "border-slate-800 bg-slate-900/40 text-slate-500"
                        }`}>
                        <span className={sseConnected ? "live-dot" : "offline-dot"} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {sseConnected ? "Live Intelligence Stream" : "Establishing Link..."}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── System Health 3D Orb ─────────────────────────────────────────── */}
            <SystemHealthOrb />

            {/* ── Status & Metrics ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* System Health Main Panel */}
                <div className="lg:col-span-3">
                    <SystemHealth />
                </div>

                {/* Organization Stats Card */}
                <div className="glass-card p-6 flex flex-col justify-center border-indigo-500/20 bg-indigo-500/[0.02]">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Workspace Health</span>
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-4xl font-black text-white">99.8%</div>
                    <div className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                        Signal stability is within normal parameters for <span className="text-indigo-300">Default Org</span>.
                    </div>
                    <button className="mt-4 text-[10px] font-black text-indigo-400 flex items-center gap-1 hover:gap-2 transition-all uppercase tracking-widest">
                        Performance Audit <ArrowRight className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* ── Metric Row ────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    icon={<Wifi className="w-5 h-5" />}
                    label="Active Nodes"
                    value={devices.length}
                    color="text-indigo-400"
                    trend="+2.4%"
                />
                <MetricCard
                    icon={<Activity className="w-5 h-5" />}
                    label="Online Now"
                    value={onlineCount}
                    color="text-emerald-400"
                />
                <MetricCard
                    icon={<AlertCircle className="w-5 h-5" />}
                    label="Anomalies 24h"
                    value={anomaliesToday}
                    color="text-rose-400"
                />
                <MetricCard
                    icon={<BarChart3 className="w-5 h-5" />}
                    label="Events Today"
                    value={((stats?.data_points_today || 0) % 1000).toFixed(1) + "k"}
                    color="text-cyan-400"
                    trend="+18%"
                />
            </div>

            {/* ── Main Dashboard Sections ───────────────────────────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* Left Col: Device Management & Feed */}
                <div className="xl:col-span-2 space-y-8">

                    {/* Filter & Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-4 glass-card p-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fleet Filter</span>
                                <select
                                    value={selectedGroupId}
                                    onChange={(e) => setSelectedGroupId(e.target.value === "all" ? "all" : Number(e.target.value))}
                                    className="bg-slate-900 border border-white/5 text-[11px] font-bold rounded-lg px-3 py-1.5 text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500/50 min-w-[140px]"
                                >
                                    <option value="all">All Groups</option>
                                    {groups.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="h-6 w-px bg-white/5" />
                            <div className="text-[10px] font-bold text-slate-600">
                                SHOWING {filteredDevices.length} OF {devices.length} NODES
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {isCreatingGroup ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Group name..."
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                                        className="bg-slate-900 border border-indigo-500/30 text-[11px] rounded-lg px-3 py-1.5 text-slate-200 outline-none"
                                    />
                                    <button onClick={handleCreateGroup} className="p-1.5 bg-indigo-600 rounded-lg text-white">
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsCreatingGroup(true)}
                                    className="px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-black text-slate-300 uppercase tracking-widest transition-all"
                                >
                                    + Create Group
                                </button>
                            )}
                        </div>
                    </div>

                    {/* AI & Analytics Panel */}
                    <AIInsightsWidget />

                    {/* Device Grid */}
                    <div className="space-y-4">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-4 flex items-center gap-3">
                            <span className="w-6 h-px bg-indigo-500/30" /> Active Assets
                        </h2>
                        {filteredDevices.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredDevices.map((d) => {
                                    const latest = latestByDevice.get(d.id);
                                    return (
                                        <DeviceCard
                                            key={d.id}
                                            device={d}
                                            battery={latest?.battery ?? null}
                                            lastMagnitude={latest?.motion_magnitude ?? null}
                                            noise={latest?.noise_level ?? null}
                                            light={latest?.ambient_light ?? null}
                                            isAnomaly={latest?.is_anomaly ?? false}
                                            anomalyScore={latest?.anomaly_score ?? 0}
                                        />
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="glass-card p-16 flex flex-col items-center justify-center text-center opacity-60">
                                <Cpu className="w-12 h-12 text-slate-700 mb-4" />
                                <div className="text-sm font-black text-slate-400 uppercase tracking-widest">No Active Nodes</div>
                            </div>
                        )}
                    </div>

                    {/* Motion Analytics */}
                    <div className="glass-card p-6 h-[450px]">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="card-title mb-0">
                                <Activity className="w-4 h-4 text-indigo-400" />
                                Real-Time Telemetry Magnitude
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-emerald-400 font-black animate-pulse">● LIVE</span>
                            </div>
                        </div>
                        <MotionChart readings={streamReadings.map((r, i) => ({ ...r, id: i }))} />
                    </div>
                </div>

                {/* Right Col: Alerts, Health, Feed */}
                <div className="space-y-8">
                    {/* Alerts Panel */}
                    <AlertsPanel alerts={recentAlerts} maxItems={12} onClear={handleClearAlerts} />

                    {/* Minimal Health List */}
                    <div className="glass-card p-6">
                        <h3 className="card-title">
                            <Zap className="w-4 h-4 text-amber-400" />
                            Asset Power Health
                        </h3>
                        <div className="space-y-4 mt-4">
                            {filteredDevices.slice(0, 5).map(d => {
                                const latest = latestByDevice.get(d.id);
                                return (
                                    <DeviceHealthWidget
                                        key={d.id}
                                        device={d}
                                        isOnline={isOnline(d)}
                                        battery={latest?.battery ?? null}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {/* Activity Feed */}
                    <ActivityFeed events={streamReadings} maxItems={25} />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
