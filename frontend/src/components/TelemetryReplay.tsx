import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Play, Pause, RotateCcw, FastForward, Clock } from 'lucide-react';
import { API_BASE } from '../config';

interface HistoryPoint {
    latitude: number;
    longitude: number;
    timestamp: string;
}

interface Props {
    deviceId: number;
    deviceName?: string;
}

const TelemetryReplay: React.FC<Props> = ({ deviceId, deviceName }) => {
    const [history, setHistory] = useState<HistoryPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const polylineRef = useRef<L.Polyline | null>(null);
    const timerRef = useRef<any>(null);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/devices/${deviceId}/history?minutes=30`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setHistory(data);
            if (data.length > 0) {
                setCurrentIndex(0);
            }
        } catch (err) {
            console.error('Failed to fetch history:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [deviceId]);

    // Map Initialization
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const map = L.map(mapContainerRef.current, {
            center: [0, 0],
            zoom: 13,
            zoomControl: false,
            attributionControl: false
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
        mapRef.current = map;

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Playback Logic
    useEffect(() => {
        if (isPlaying && currentIndex < history.length - 1) {
            timerRef.current = setInterval(() => {
                setCurrentIndex(prev => {
                    if (prev >= history.length - 1) {
                        setIsPlaying(false);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000 / playbackSpeed);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isPlaying, playbackSpeed, history.length, currentIndex]);

    // Update Map
    useEffect(() => {
        const map = mapRef.current;
        if (!map || history.length === 0) return;

        const point = history[currentIndex];
        const latLng: [number, number] = [point.latitude, point.longitude];

        // Ensure path shows up to current point
        const currentPath = history.slice(0, currentIndex + 1).map(p => [p.latitude, p.longitude] as [number, number]);

        if (!markerRef.current) {
            const pulseIcon = L.divIcon({
                className: '',
                html: `<div class="w-6 h-6 bg-indigo-500 border-4 border-white rounded-full shadow-lg shadow-indigo-500/50 animate-pulse"></div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
            markerRef.current = L.marker(latLng, { icon: pulseIcon }).addTo(map);
        } else {
            markerRef.current.setLatLng(latLng);
        }

        if (!polylineRef.current) {
            polylineRef.current = L.polyline(currentPath, {
                color: '#6366f1',
                weight: 4,
                opacity: 0.6,
                lineJoin: 'round'
            }).addTo(map);
        } else {
            polylineRef.current.setLatLngs(currentPath);
        }

        // Center map on point if it moves out of view
        if (!map.getBounds().contains(latLng)) {
            map.panTo(latLng);
        }

        // If it's the first render or we reset, fit bounds
        if (currentIndex === 0) {
            const allCoords = history.map(p => [p.latitude, p.longitude] as [number, number]);
            if (allCoords.length > 0) {
                map.fitBounds(L.polyline(allCoords).getBounds(), { padding: [50, 50] });
            }
        }
    }, [currentIndex, history]);

    const handleReset = () => {
        setIsPlaying(false);
        setCurrentIndex(0);
    };

    if (loading) {
        return (
            <div className="card h-[500px] flex items-center justify-center bg-slate-900/50 backdrop-blur-xl border-white/5">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                    <span className="text-slate-400 font-bold tracking-widest text-xs uppercase">Decryption History...</span>
                </div>
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="card h-[500px] flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-xl border-white/5 text-slate-500 space-y-4">
                <Clock className="w-12 h-12 opacity-20" />
                <p className="font-bold uppercase tracking-widest text-xs">No historical data found for last 30m</p>
                <button
                    onClick={fetchHistory}
                    className="px-6 py-2 bg-slate-800 rounded-full text-[10px] font-black hover:bg-slate-700 transition-all"
                >
                    REFRESH SCAN
                </button>
            </div>
        );
    }

    const currentPoint = history[currentIndex];
    const timeStr = new Date(currentPoint.timestamp).toLocaleTimeString();

    return (
        <div className="space-y-4">
            <div className="card h-[400px] p-0 overflow-hidden relative border-indigo-500/20 shadow-2xl">
                <div className="absolute top-4 left-4 z-[1000] space-y-2">
                    <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Historical Replay</span>
                        </div>
                        <div className="text-[18px] font-black text-indigo-400 mt-1">{timeStr}</div>
                        <div className="text-[9px] text-slate-500 font-bold uppercase mt-0.5 tracking-tight">
                            {currentIndex + 1} / {history.length} POSITIONAL DATA POINTS
                        </div>
                    </div>
                </div>

                <div ref={mapContainerRef} className="w-full h-full bg-slate-950" />
            </div>

            <div className="card bg-slate-900/40 backdrop-blur-xl border-white/5 p-6 space-y-6">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isPlaying ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40 hover:scale-105'
                            }`}
                    >
                        {isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current translate-x-0.5" />}
                    </button>

                    <div className="flex-1 space-y-4">
                        <div className="flex justify-between items-end">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Timeline Index</span>
                                <div className="text-xl font-black text-white italic">{Math.round((currentIndex / (history.length - 1)) * 100)}%</div>
                            </div>
                            <div className="flex items-center gap-2">
                                {[1, 2, 4].map(speed => (
                                    <button
                                        key={speed}
                                        onClick={() => setPlaybackSpeed(speed)}
                                        className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${playbackSpeed === speed
                                            ? 'bg-indigo-500 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                            }`}
                                    >
                                        {speed}X
                                    </button>
                                ))}
                            </div>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max={history.length - 1}
                            value={currentIndex}
                            onChange={(e) => {
                                setIsPlaying(false);
                                setCurrentIndex(parseInt(e.target.value));
                            }}
                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                    </div>

                    <button
                        onClick={handleReset}
                        className="w-14 h-14 rounded-2xl bg-slate-800 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all hover:bg-slate-700"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TelemetryReplay;
