import React, { useEffect, useState } from "react";
import { fetchLatestSnapshot } from "../api";

interface Props {
    deviceId: number;
}

const CameraSnapshot: React.FC<Props> = ({ deviceId }) => {
    const [snapshot, setSnapshot] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [timestamp, setTimestamp] = useState<string | null>(null);

    const load = async () => {
        try {
            const data = await fetchLatestSnapshot(deviceId);
            if (data && data.image_base64) {
                setSnapshot(data.image_base64);
                setTimestamp(new Date(data.timestamp).toLocaleString());
            }
        } catch (e) {
            console.error("Failed to load snapshot", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        const interval = setInterval(load, 5000); // Polling snapshots
        return () => clearInterval(interval);
    }, [deviceId]);

    return (
        <div className="card h-full p-4 bg-slate-900 border-slate-800 shadow-xl border-shadow flex flex-col group">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 group-hover:text-indigo-200 transition-colors flex items-center gap-2">
                    <span>📷</span> LIVE CAMERA FEED
                </h3>
                <button onClick={load} className="p-1 px-2 rounded-md bg-slate-800/40 text-[10px] text-slate-500 hover:text-white transition-colors border border-slate-700/60 uppercase font-black tracking-widest active:scale-95">
                    REFRESH
                </button>
            </div>

            <div className="flex-1 relative min-h-[220px] rounded-xl overflow-hidden bg-black/60 border border-indigo-900/10 group-hover:border-indigo-500/20 transition-all flex items-center justify-center">
                {loading && !snapshot ? (
                    <div className="text-slate-500 text-xs font-medium animate-pulse">Initializing Feed...</div>
                ) : snapshot ? (
                    <img src={snapshot} alt="Camera feed" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                ) : (
                    <div className="text-slate-600 text-[10px] uppercase font-black p-8 text-center leading-relaxed">No camera stream available. Ensure the device is sending frames.</div>
                )}

                {snapshot && (
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded backdrop-blur-md bg-white/5 border border-white/10 shadow-2xl">
                        <span className="w-1 h-1 rounded-full bg-red-600 animate-ping" />
                        <span className="text-[9px] font-black text-white uppercase tracking-widest opacity-80">REC</span>
                    </div>
                )}
            </div>

            <div className="mt-3 flex items-center justify-between">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                    {timestamp ? `LAST: ${timestamp}` : `WAITING FOR STREAM…`}
                </div>
                <div className="text-[9px] font-mono text-cyan-400 opacity-60">AUTO-POLLING</div>
            </div>
        </div>
    );
};

export default CameraSnapshot;
