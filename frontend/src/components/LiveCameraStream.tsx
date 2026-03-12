import React, { useEffect, useRef, useState } from 'react';
import { Camera, Signal, SignalHigh, AlertCircle, Play, Square, Video } from 'lucide-react';
import { API_BASE } from '../config';

interface Props {
    deviceId: number;
    deviceName?: string;
}

const LiveCameraStream: React.FC<Props> = ({ deviceId, deviceName }) => {
    const [status, setStatus] = useState<'idle' | 'linking' | 'streaming' | 'failed'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [latency, setLatency] = useState<number>(0);

    const videoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const startTimeRef = useRef<number>(0);
    const eventSourceRef = useRef<EventSource | null>(null);

    const cleanup = () => {
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setStatus('idle');
    };

    const startStreamRequest = async () => {
        cleanup();
        setStatus('linking');
        setError(null);
        startTimeRef.current = Date.now();

        try {
            const token = localStorage.getItem('token');
            // 1. Send command to mobile device to start WebRTC
            await fetch(`${API_BASE}/api/devices/${deviceId}/command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ command: 'start_webrtc' })
            });

            // 2. Setup EventSource for signaling
            const eventSource = new EventSource(`${API_BASE}/api/stream?token=${token}`);
            eventSourceRef.current = eventSource;

            eventSource.addEventListener('webrtc_offer', async (e: any) => {
                const data = JSON.parse(e.data);
                // Cast to Number for robust matching across protocols
                if (Number(data.device_id) !== Number(deviceId)) return;

                console.log('Received WebRTC Offer:', data.offer);

                const pc = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });
                pcRef.current = pc;

                pc.ontrack = (event) => {
                    console.log('Received track:', event.track.id);
                    if (videoRef.current) {
                        const stream = event.streams[0] || new MediaStream([event.track]);
                        videoRef.current.srcObject = stream;

                        // Explicitly call play to handle browsers with strict autoplay policies
                        videoRef.current.play().catch(err => {
                            console.error("Autoplay blocked or failed:", err);
                        });

                        setStatus('streaming');
                        setLatency(Date.now() - startTimeRef.current);
                    }
                };

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        fetch(`${API_BASE}/api/webrtc/ice`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                device_id: deviceId,
                                candidate: event.candidate,
                                side: 'dashboard'
                            })
                        });
                    }
                };

                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                await fetch(`${API_BASE}/api/webrtc/answer`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ device_id: deviceId, answer })
                });
            });

            eventSource.addEventListener('webrtc_ice', async (e: any) => {
                const data = JSON.parse(e.data);
                if (Number(data.device_id) !== Number(deviceId) || data.side === 'dashboard') return;

                if (pcRef.current && pcRef.current.remoteDescription) {
                    try {
                        await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
                    } catch (err) {
                        console.error('Error adding ICE candidate:', err);
                    }
                }
            });

            // Auto-cleanup EventSource after connection or timeout
            // Increased to 30s as mobile device might poll for commands every 5-10s
            setTimeout(() => {
                setStatus(prev => {
                    if (prev === 'linking') {
                        eventSource.close();
                        setError('Connection Timeout: Handshake took too long. Check if mobile app is open and connected.');
                        return 'failed';
                    }
                    return prev;
                });
            }, 30000);

        } catch (err: any) {
            setError(err.message);
            setStatus('failed');
        }
    };

    useEffect(() => {
        return () => cleanup();
    }, []);

    return (
        <div className="card h-full p-0 overflow-hidden relative border-white/5 bg-slate-900 shadow-2xl group transition-all duration-500 hover:shadow-indigo-500/10 min-h-[300px]">
            {/* Dark background overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent z-10 pointer-events-none" />

            {/* Video Feed */}
            <div className="aspect-video w-full h-full bg-slate-950 flex items-center justify-center relative overflow-hidden">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover transition-opacity duration-700 ${status === 'streaming' ? 'opacity-100' : 'opacity-0'}`}
                />

                {/* Status Overlays */}
                {status === 'idle' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 z-20">
                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 border border-white/5 shadow-inner">
                            <Video className="w-8 h-8 opacity-40" />
                        </div>
                        <button
                            onClick={startStreamRequest}
                            className="px-8 py-3 bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                        >
                            <Play className="w-4 h-4 fill-current" />
                            Initialize Live Link
                        </button>
                    </div>
                )}

                {status === 'linking' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6 z-20">
                        <div className="relative">
                            <div className="w-20 h-20 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Signal className="w-8 h-8 text-indigo-400 animate-pulse" />
                            </div>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-white font-black tracking-widest text-[10px] uppercase">Awaiting Handshake...</span>
                            <span className="text-slate-400 text-[9px] font-bold mt-1">NEGOTIATING P2P TUNNEL</span>
                        </div>
                    </div>
                )}

                {status === 'failed' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 z-20 p-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-rose-400 font-black text-xs uppercase tracking-widest">Signal Lost</p>
                            <p className="text-slate-500 text-[10px] max-w-[200px] leading-relaxed">{error}</p>
                        </div>
                        <button
                            onClick={startStreamRequest}
                            className="px-6 py-2 bg-slate-800 text-white rounded-xl font-bold text-[10px] uppercase hover:bg-slate-700 transition-all border border-white/5"
                        >
                            Retry Uplink
                        </button>
                    </div>
                )}

                {/* Top Badge Overlay */}
                <div className="absolute top-4 left-4 z-30 pointer-events-none">
                    <div className="flex items-center gap-2">
                        <div className={`px-2 py-1 rounded-lg backdrop-blur-md border flex items-center gap-2 transition-all ${status === 'streaming'
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-lg shadow-rose-500/20'
                            : 'bg-slate-900/10 border-white/5 text-slate-400'
                            }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${status === 'streaming' ? 'bg-rose-500 animate-pulse' : 'bg-slate-500'}`} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                                {status === 'streaming' ? 'Live Stream' : 'Camera Staged'}
                            </span>
                        </div>
                        {status === 'streaming' && (
                            <div className="bg-slate-900/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/5 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                <div className="flex items-center gap-1.5">
                                    <SignalHigh className="w-3 h-3" />
                                    {latency}ms
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Controls */}
                {status === 'streaming' && (
                    <div className="absolute bottom-4 right-4 z-30 opacity-100 transition-opacity">
                        <button
                            onClick={cleanup}
                            className="bg-slate-900/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-white hover:bg-rose-500 hover:scale-105 active:scale-95 transition-all shadow-2xl"
                        >
                            <Square className="w-5 h-5 fill-current" />
                        </button>
                    </div>
                )}

                {/* Watermark/Identity */}
                <div className="absolute bottom-4 left-4 z-30 pointer-events-none">
                    <div className="flex flex-col">
                        <span className="text-white font-black text-sm uppercase opacity-80">{deviceName || "Active Node"}</span>
                        <span className="text-slate-500 text-[9px] font-bold uppercase tracking-tighter opacity-60">
                            PocketIoT Vision System v2.4
                        </span>
                    </div>
                </div>
            </div>

            {/* Interactivity layer shadow */}
            <div className={`absolute inset-0 bg-indigo-500/5 transition-opacity duration-1000 ${status === 'streaming' ? 'opacity-0' : 'opacity-100'}`} />
        </div>
    );
};

export default LiveCameraStream;
