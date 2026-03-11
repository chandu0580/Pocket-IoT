import React from "react";
import { useAppContext } from "../App";
import { isOnline, updateDevice, deleteDevice, Device } from "../api";
import DeviceCard from "../components/DeviceCard";
import { EmptyState } from "../components/LoadingSkeleton";
import QRPairModal from "../components/QRPairModal";


const Devices: React.FC = () => {
    const { devices, streamReadings, refreshDevices, groups } = useAppContext();
    const [editingId, setEditingId] = React.useState<number | null>(null);
    const [newName, setNewName] = React.useState("");
    const [selectedGroupId, setSelectedGroupId] = React.useState<number | "all">("all");
    const [showQR, setShowQR] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");

    const filteredDevices = React.useMemo(() => {
        let result = devices;
        if (selectedGroupId !== "all") {
            result = result.filter(d => d.group_id === Number(selectedGroupId));
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(d =>
                d.name.toLowerCase().includes(q) ||
                `NODE_${d.id}`.toLowerCase().includes(q)
            );
        }
        return result;
    }, [devices, selectedGroupId, searchQuery]);

    const latestByDevice = React.useMemo(() => {
        const map = new Map<number, { battery: number; magnitude: number; isAnomaly: boolean; score: number }>();
        for (const r of streamReadings) {
            map.set(r.device_id, {
                battery: r.battery,
                magnitude: r.motion_magnitude,
                isAnomaly: r.is_anomaly,
                score: r.anomaly_score
            });
        }
        return map;
    }, [streamReadings]);

    const online = filteredDevices.filter(isOnline);
    const offline = filteredDevices.filter((d) => !isOnline(d));

    const handleRename = async (id: number) => {
        if (!newName.trim()) return;
        await updateDevice(id, { name: newName });
        setEditingId(null);
        refreshDevices();
    };

    const handleToggleStatus = async (id: number, current: string) => {
        await updateDevice(id, { status: current === 'active' ? 'disabled' : 'active' });
        refreshDevices();
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this device and all its history?")) return;
        await deleteDevice(id);
        refreshDevices();
    };

    const renderDeviceItem = (d: Device) => {
        const latest = latestByDevice.get(d.id);
        const isEditing = editingId === d.id;

        return (
            <div key={d.id} className="relative group">
                <DeviceCard
                    device={d}
                    battery={latest?.battery ?? null}
                    lastMagnitude={latest?.magnitude ?? null}
                    isAnomaly={latest?.isAnomaly ?? false}
                    anomalyScore={latest?.score ?? 0}
                    onDelete={handleDelete}
                />

                {/* Management Overlay (visible on hover) */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.stopPropagation(); setEditingId(d.id); setNewName(d.name); }}
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs text-white backdrop-blur border border-slate-700"
                        title="Rename"
                    >
                        ✏️
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleToggleStatus(d.id, d.status); }}
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs text-white backdrop-blur border border-slate-700"
                        title={d.status === 'active' ? 'Disable' : 'Enable'}
                    >
                        {d.status === 'active' ? '⏸' : '▶️'}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }}
                        className="p-1.5 rounded-lg bg-red-900/80 hover:bg-red-800 text-xs text-white backdrop-blur border border-red-700"
                        title="Delete"
                    >
                        🗑️
                    </button>
                </div>

                {/* Edit Modal / Inline */}
                {isEditing && (
                    <div
                        className="absolute inset-0 z-10 bg-slate-900/90 backdrop-blur rounded-2xl flex items-center justify-center p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-full space-y-3">
                            <input
                                autoFocus
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
                                placeholder="Device name"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleRename(d.id)}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 rounded-lg"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={() => setEditingId(null)}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold py-2 rounded-lg"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Disabled Overlay */}
                {d.status === 'disabled' && (
                    <div className="absolute inset-0 bg-slate-950/40 backdrop-grayscale-[0.5] rounded-2xl pointer-events-none flex items-center justify-center">
                        <div className="bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800 text-[10px] font-black uppercase text-slate-500 tracking-tighter">
                            Disabled
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="page-enter p-6 space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                        Fleet Management
                        {selectedGroupId !== 'all' && (
                            <span className="text-xs bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/30">
                                {groups.find(g => g.id === selectedGroupId)?.name}
                            </span>
                        )}
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {filteredDevices.length} assets · {online.length} online · {offline.length} offline
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Find node or asset..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-xs rounded-lg pl-9 pr-4 py-2 text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-bold w-48 lg:w-64"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                    </div>
                    <select
                        value={selectedGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value === "all" ? "all" : Number(e.target.value))}
                        className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-4 py-2 text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-bold"
                    >
                        <option value="all">Everywhere</option>
                        {groups.map((g) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setShowQR(true)}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg border transition-all shadow-lg active:scale-95"
                        style={{
                            background: "linear-gradient(135deg, #6366f1, #818cf8)",
                            border: "1px solid rgba(99,102,241,0.5)",
                            color: "white",
                            boxShadow: "0 4px 20px rgba(99,102,241,0.3)"
                        }}
                    >
                        <span style={{ fontSize: 14 }}>📱</span> Add Device
                    </button>
                    <button
                        onClick={refreshDevices}
                        className="bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg border border-white/5 transition-all shadow-lg active:scale-95"
                    >
                        ⚡ SYNC
                    </button>
                </div>
            </div>

            {filteredDevices.length === 0 ? (
                <EmptyState message="No devices found in this group." icon="📱" />
            ) : (
                <>
                    {online.length > 0 && (
                        <div>
                            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3">🟢 Online ({online.length})</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {online.map(renderDeviceItem)}
                            </div>
                        </div>
                    )}
                    {offline.length > 0 && (
                        <div>
                            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">⚫ Offline ({offline.length})</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {offline.map(renderDeviceItem)}
                            </div>
                        </div>
                    )}
                </>
            )}

            {showQR && (
                <QRPairModal
                    onClose={() => setShowQR(false)}
                    onDevicePaired={() => { refreshDevices(); }}
                />
            )}
        </div>
    );
};

export default Devices;
