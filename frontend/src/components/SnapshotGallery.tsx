import React, { useState, useEffect } from "react";
import { fetchSnapshots } from "../api";
import { Image, Camera, Clock } from "lucide-react";

interface Props {
    deviceId: number;
}

const SnapshotGallery: React.FC<Props> = ({ deviceId }) => {
    const [snapshots, setSnapshots] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImg, setSelectedImg] = useState<string | null>(null);

    const load = async () => {
        try {
            const data = await fetchSnapshots(deviceId);
            setSnapshots(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        const interval = setInterval(load, 10000);
        return () => clearInterval(interval);
    }, [deviceId]);

    return (
        <div className="card h-full p-4 bg-slate-900 border-slate-800 shadow-xl border-shadow flex flex-col group">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400 flex items-center gap-2">
                    <Camera className="w-3 h-3" /> Visual History
                </h3>
                <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Last 12 Frames</span>
            </div>

            {loading ? (
                <div className="text-[10px] text-slate-500 uppercase font-black text-center py-8">Accessing Encrypted Storage…</div>
            ) : snapshots.length === 0 ? (
                <div className="text-[10px] text-slate-600 uppercase font-black text-center py-8 border border-dashed border-slate-800 rounded-xl">No historical frames found.</div>
            ) : (
                <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[300px] pr-1 custom-scrollbar">
                    {snapshots.map((s) => (
                        <div
                            key={s.id}
                            onClick={() => setSelectedImg(s.image_base64)}
                            className="relative aspect-square rounded-lg overflow-hidden border border-slate-800 hover:border-cyan-500/50 cursor-pointer group/item transition-all"
                        >
                            <img src={s.image_base64} alt="Snapshot" className="w-full h-full object-cover grayscale group-hover/item:grayscale-0 transition-all duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity flex items-end p-1.5">
                                <span className="text-[7px] font-black text-white uppercase tracking-tighter truncate">
                                    {new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal for full size */}
            {selectedImg && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setSelectedImg(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                        <img src={selectedImg} alt="Large view" className="w-full h-full object-contain" />
                        <button
                            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white transition-all"
                            onClick={() => setSelectedImg(null)}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-800/40 flex items-center justify-between text-[8px] font-black text-slate-600 uppercase tracking-widest">
                <div className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    <span>Auto-Archiving Active</span>
                </div>
                <span>Secured</span>
            </div>
        </div>
    );
};

export default SnapshotGallery;
