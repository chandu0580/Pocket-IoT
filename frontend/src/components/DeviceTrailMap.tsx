import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { SensorReading, Device } from "../api";

// Use CDN links to ensure they work regardless of bundler resolution
const iconRetinaUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png';
const iconUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png';
const shadowUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconRetinaUrl,
    iconUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Custom pulsing device marker HTML
const makePulseIcon = (color = "#6366f1") => L.divIcon({
    className: "",
    html: `
        <div style="
            width:24px; height:24px;
            background:${color};
            border:3px solid #fff;
            border-radius:50%;
            box-shadow: 0 0 0 4px ${color}55, 0 2px 8px rgba(0,0,0,0.4);
            animation: nodePulse 2s ease-in-out infinite;
        "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

interface Props {
    readings: SensorReading[];
    device?: Device;
}

const DeviceTrailMap: React.FC<Props> = ({ readings, device }) => {
    const mapDivRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const polylineRef = useRef<L.Polyline | null>(null);

    // Filter and validate coordinates strictly
    const path = React.useMemo(() => {
        return readings
            .filter(r =>
                r.latitude != null &&
                r.longitude != null &&
                !isNaN(Number(r.latitude)) &&
                !isNaN(Number(r.longitude)) &&
                Math.abs(Number(r.latitude)) <= 90 &&
                Math.abs(Number(r.longitude)) <= 180
            )
            .map(r => [Number(r.latitude), Number(r.longitude)] as [number, number]);
    }, [readings]);

    const lastPos = path.length > 0 ? path[path.length - 1] : null;

    // Initialize Map directly without react-leaflet wrapper to avoid library bugs
    useEffect(() => {
        if (!mapDivRef.current || mapRef.current || !lastPos) return;

        const map = L.map(mapDivRef.current, {
            center: lastPos,
            zoom: 15,
            zoomControl: false,
            attributionControl: false
        });

        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png").addTo(map);

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
            markerRef.current = null;
            polylineRef.current = null;
        };
    }, []); // Only init once when first pos is available

    // Update markers and polyline when path changes
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !lastPos) return;

        // ── Marker ────────────────────────────────────────────────────────────
        if (markerRef.current) {
            markerRef.current.setLatLng(lastPos);
        } else {
            markerRef.current = L.marker(lastPos, { icon: makePulseIcon() }).addTo(map);
            markerRef.current.bindPopup(`
                <div style="padding:4px; font-family:sans-serif;">
                    <strong style="color:#6366f1;">${device?.name || "Active Node"}</strong><br/>
                    <div style="font-size:10px; color:#94a3b8; font-family:monospace; margin-top:4px;">
                        LAT: ${lastPos[0].toFixed(5)}<br/>LON: ${lastPos[1].toFixed(5)}
                    </div>
                </div>
            `);
        }

        // ── Polyline ──────────────────────────────────────────────────────────
        if (path.length > 1) {
            if (polylineRef.current) {
                polylineRef.current.setLatLngs(path);
            } else {
                polylineRef.current = L.polyline(path, {
                    color: "#6366f1",
                    weight: 4,
                    opacity: 0.8,
                    lineJoin: "round",
                    lineCap: "round"
                }).addTo(map);
            }
        }

        // Auto-pan to center
        map.setView(lastPos, map.getZoom());

    }, [path, device, lastPos]);

    if (!lastPos) {
        return (
            <div className="card h-[400px] flex flex-col items-center justify-center text-slate-500 text-sm uppercase font-black tracking-widest opacity-60 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-indigo-500 animate-spin" />
                Waiting for GPS Fix…
            </div>
        );
    }

    return (
        <div className="card h-[400px] overflow-hidden p-0 relative group border-indigo-500/20 shadow-2xl shadow-indigo-500/10">
            {/* Custom Pulse CSS only for this component */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes nodePulse {
                  0%   { box-shadow: 0 0 0 0px rgba(99,102,241,0.6), 0 2px 8px rgba(0,0,0,0.4); }
                  70%  { box-shadow: 0 0 0 10px rgba(99,102,241,0), 0 2px 8px rgba(0,0,0,0.4); }
                  100% { box-shadow: 0 0 0 0px rgba(99,102,241,0), 0 2px 8px rgba(0,0,0,0.4); }
                }
            ` }} />

            <div className="absolute top-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-md border border-white/10 px-3 py-2 rounded-xl shadow-2xl pointer-events-none">
                <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    Spatial Trail
                </div>
                <div className="text-[9px] text-slate-400 uppercase font-bold mt-0.5 tracking-tighter">
                    {path.length} VECTOR NODES CALIBRATED
                </div>
            </div>

            <div ref={mapDivRef} style={{ height: "100%", width: "100%", background: "#020617" }} />
        </div>
    );
};

export default DeviceTrailMap;
