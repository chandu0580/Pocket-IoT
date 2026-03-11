import React, { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchDeviceLocations, subscribeToStream } from "../api";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import FleetGlobe3D from "../components/FleetGlobe3D";
import { useAppContext } from "../App";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
// @ts-ignore
import "leaflet.markercluster";

// ── Fix Leaflet default icon paths (Vite bundler issue) ──────────────────────
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// ── Custom pulsing device marker ──────────────────────────────────────────────
function makeDeviceIcon(color = "#6366f1") {
    return L.divIcon({
        className: "",
        html: `
            <div style="
                width:28px; height:28px;
                background:${color};
                border:3px solid #fff;
                border-radius:50%;
                box-shadow: 0 0 0 4px ${color}55, 0 2px 8px rgba(0,0,0,0.4);
                animation: devicePulse 2s ease-in-out infinite;
            "></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
    });
}

// Assign consistent colors to devices
const DEVICE_COLORS = [
    "#6366f1", "#22d3ee", "#f59e0b", "#10b981",
    "#f43f5e", "#a855f7", "#14b8a6", "#fb923c",
];
const colorCache: Record<number, string> = {};
let colorIdx = 0;
function getDeviceColor(id: number): string {
    if (!colorCache[id]) {
        colorCache[id] = DEVICE_COLORS[colorIdx % DEVICE_COLORS.length];
        colorIdx++;
    }
    return colorCache[id];
}

interface DeviceLocation {
    device_id: number;
    name: string;
    status: string;
    latitude: number;
    longitude: number;
    battery: number;
    magnitude: number;
    speed: number;
    noise_level: number;
    last_seen: string;
    alert_count: number;
    group_id: number | null;
    group_name: string | null;
}

const DEFAULT_CENTER: [number, number] = [12.9716, 77.5946];
const MAX_TRAIL_POINTS = 80; // keep last N GPS points per device

// ── CSS for pulsing animation ─────────────────────────────────────────────────
const PULSE_STYLE = `
@keyframes devicePulse {
  0%   { box-shadow: 0 0 0 0px rgba(99,102,241,0.6), 0 2px 8px rgba(0,0,0,0.4); }
  70%  { box-shadow: 0 0 0 10px rgba(99,102,241,0), 0 2px 8px rgba(0,0,0,0.4); }
  100% { box-shadow: 0 0 0 0px rgba(99,102,241,0), 0 2px 8px rgba(0,0,0,0.4); }
}
.map-open-button {
    display: block;
    width: 100%;
    margin-top: 12px;
    padding: 8px;
    background: #6366f1;
    color: white !important;
    text-align: center;
    text-decoration: none;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    border-radius: 8px;
    transition: all 0.2s;
}
.map-open-button:hover {
    background: #4f46e5;
    transform: translateY(-1px);
}
`;

const MapView: React.FC = () => {
    const { groups } = useAppContext();
    const mapDivRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const clusterRef = useRef<any>(null);
    const markersRef = useRef<Record<number, L.Marker>>({});
    const polylinesRef = useRef<Record<number, L.Polyline>>({});
    const pathsRef = useRef<Record<number, [number, number][]>>({});
    const gpsBufferRef = useRef<Record<number, DeviceLocation>>({});
    const locationsRef = useRef<Record<number, DeviceLocation>>({});
    const [loading, setLoading] = useState(true);
    const [locationList, setLocationList] = useState<DeviceLocation[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<number | "all">("all");

    // ── Inject pulse CSS once ─────────────────────────────────────────────────
    useEffect(() => {
        const style = document.createElement("style");
        style.textContent = PULSE_STYLE;
        document.head.appendChild(style);
        return () => { document.head.removeChild(style); };
    }, []);

    // ── Initialize Leaflet map once ───────────────────────────────────────────
    useEffect(() => {
        if (!mapDivRef.current || mapRef.current) return;

        const map = L.map(mapDivRef.current, {
            center: DEFAULT_CENTER,
            zoom: 13,
            zoomControl: true,
        });

        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            maxZoom: 19,
        }).addTo(map);

        const cluster = (L as any).markerClusterGroup({
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            spiderfyOnMaxZoom: true,
            maxClusterRadius: 50,
        });
        cluster.addTo(map);
        clusterRef.current = cluster;

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
            clusterRef.current = null;
            markersRef.current = {};
            polylinesRef.current = {};
            pathsRef.current = {};
        };
    }, []);

    const getStatusColor = (loc: DeviceLocation) => {
        if (loc.alert_count > 0) return "#facc15"; // Yellow (Alerts)
        if (loc.status === "online") return "#10b981"; // Green (Online)
        return "#ef4444"; // Red (Offline)
    };

    const batteryColor = (pct: number | null) => {
        if (pct == null) return "#64748b";
        if (pct > 50) return "#22c55e";
        if (pct > 20) return "#f59e0b";
        return "#ef4444";
    };

    // ── Helper: build popup HTML ──────────────────────────────────────────────
    const buildPopupHtml = (loc: DeviceLocation, color: string) => `
        <div style="padding:12px; font-family:'Inter',sans-serif; min-width:180px; background:#0f172a; border-radius:12px; color:#f1f5f9;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px;">
                <div style="width:12px; height:12px; border-radius:50%; background:${color}; box-shadow:0 0 8px ${color};"></div>
                <strong style="font-size:15px; color:#fff; letter-spacing:-0.02em;">${loc.name} ${loc.group_name ? `(${loc.group_name})` : ''}</strong>
            </div>
            <div style="grid-template-columns:1fr 1fr; display:grid; gap:8px; margin-bottom:10px;">
                <div>
                    <div style="font-size:8px; color:#94a3b8; text-transform:uppercase; font-weight:900;">ID</div>
                    <div style="font-size:11px; font-weight:700;">${loc.device_id}</div>
                </div>
                <div>
                    <div style="font-size:8px; color:#94a3b8; text-transform:uppercase; font-weight:900;">Status</div>
                    <div style="font-size:11px; font-weight:700; color:${color}">${loc.status?.toUpperCase() || 'UNKNOWN'}</div>
                </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                <div>
                    <div style="font-size:8px; color:#94a3b8; text-transform:uppercase; font-weight:900;">Battery</div>
                    <div style="font-size:12px; color:${batteryColor(loc.battery)}; font-weight:800;">${loc.battery != null ? loc.battery.toFixed(0) + "%" : "N/A"}</div>
                </div>
                <div>
                    <div style="font-size:8px; color:#94a3b8; text-transform:uppercase; font-weight:900;">Speed</div>
                    <div style="font-size:12px; color:#c084fc; font-weight:800;">${loc.speed != null ? loc.speed.toFixed(1) : "0"} <span style="font-size:9px;">km/h</span></div>
                </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
                <div>
                    <div style="font-size:8px; color:#94a3b8; text-transform:uppercase; font-weight:900;">Noise</div>
                    <div style="font-size:12px; color:#fb923c; font-weight:800;">${loc.noise_level != null ? loc.noise_level.toFixed(0) : "0"} <span style="font-size:9px;">dB</span></div>
                </div>
                <div>
                    <div style="font-size:8px; color:#94a3b8; text-transform:uppercase; font-weight:900;">Motion</div>
                    <div style="font-size:12px; color:#22d3ee; font-weight:800;">${loc.magnitude != null ? loc.magnitude.toFixed(1) : "0.0"}</div>
                </div>
            </div>
            <div style="background:rgba(255,255,255,0.05); padding:6px 8px; border-radius:6px; font-size:10px; color:#94a3b8; font-family:monospace; margin-bottom:8px;">
                📍 ${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}
            </div>
            <a href="/devices/${loc.device_id}" class="map-open-button">Open Device Page</a>
            <div style="font-size:9px; color:#475569; margin-top:8px; border-top:1px solid rgba(255,255,255,0.05); padding-top:4px; text-align:center;">
                Last seen: ${new Date(loc.last_seen).toLocaleTimeString()}
            </div>
        </div>`;

    // ── Append a new GPS point to the device's trail ──────────────────────────
    const appendTrailPoint = (id: number, lat: number, lng: number) => {
        const path = pathsRef.current[id] ?? [];
        const last = path[path.length - 1];
        // Skip if same coords (no movement)
        if (last && last[0] === lat && last[1] === lng) return;

        const next = [...path, [lat, lng] as [number, number]];
        if (next.length > MAX_TRAIL_POINTS) next.shift();
        pathsRef.current[id] = next;
        return next;
    };

    // ── Upsert marker + trail polyline ────────────────────────────────────────
    const upsertMarker = (loc: DeviceLocation) => {
        const map = mapRef.current;
        const lat = loc.latitude != null ? Number(loc.latitude) : null;
        const lng = loc.longitude != null ? Number(loc.longitude) : null;

        if (!map || lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
            return;
        }

        const color = getStatusColor(loc);
        const pos: [number, number] = [lat, lng];

        // ── Marker ────────────────────────────────────────────────────────────
        if (markersRef.current[loc.device_id]) {
            markersRef.current[loc.device_id].setLatLng(pos);
            markersRef.current[loc.device_id].setIcon(makeDeviceIcon(color));
            markersRef.current[loc.device_id].getPopup()?.setContent(buildPopupHtml(loc, color));
        } else {
            const marker = L.marker(pos, { icon: makeDeviceIcon(color) })
                .bindPopup(buildPopupHtml(loc, color));

            clusterRef.current?.addLayer(marker);
            markersRef.current[loc.device_id] = marker;
        }

        // ── Trail polyline ────────────────────────────────────────────────────
        const trail = appendTrailPoint(loc.device_id, lat, lng);
        if (!trail || trail.length < 2) return;

        if (polylinesRef.current[loc.device_id]) {
            polylinesRef.current[loc.device_id].setLatLngs(trail);
        } else {
            polylinesRef.current[loc.device_id] = L.polyline(trail, {
                color,
                weight: 3,
                opacity: 0.7,
                smoothFactor: 1.5,
                dashArray: "6, 4",
            }).addTo(map);
        }
    };

    // ── Load initial device locations ─────────────────────────────────────────
    useEffect(() => {
        const initMap = async () => {
            try {
                const initial = await fetchDeviceLocations();
                if (initial && initial.length > 0) {
                    const validLocs: DeviceLocation[] = [];
                    initial.forEach(loc => {
                        const dl: DeviceLocation = {
                            device_id: loc.device_id,
                            name: loc.name,
                            status: loc.status || "online",
                            latitude: loc.latitude,
                            longitude: loc.longitude,
                            battery: loc.battery,
                            magnitude: loc.magnitude,
                            speed: loc.speed || 0,
                            noise_level: loc.noise_level || 0,
                            last_seen: loc.last_seen,
                            alert_count: loc.alert_count || 0,
                            group_id: loc.group_id,
                            group_name: loc.group_name
                        };
                        locationsRef.current[loc.device_id] = dl;
                        if (loc.latitude != null && loc.longitude != null) {
                            pathsRef.current[loc.device_id] = [[loc.latitude, loc.longitude]];
                            upsertMarker(dl);
                            validLocs.push(dl);
                        }
                    });

                    setLocationList(Object.values(locationsRef.current));

                    // Fly map to first device with GPS
                    const first = validLocs[0];
                    if (first && mapRef.current) {
                        mapRef.current.flyTo([first.latitude, first.longitude], 15, { duration: 1.2 });
                    }
                }
            } catch (err) {
                console.error("[MapView] Failed to load initial locations", err);
            } finally {
                setLoading(false);
            }
        };

        const t = setTimeout(initMap, 120);
        return () => clearTimeout(t);
    }, []); // eslint-disable-line

    const filteredLocations = useMemo(() => {
        if (selectedGroupId === "all") return locationList;
        return locationList.filter(l => l.group_id === Number(selectedGroupId));
    }, [locationList, selectedGroupId]);

    // Handle visibility of markers based on filter
    useEffect(() => {
        Object.entries(markersRef.current).forEach(([id, marker]) => {
            const loc = locationsRef.current[Number(id)];
            if (!loc) return;

            const isVisible = selectedGroupId === "all" || loc.group_id === Number(selectedGroupId);
            const poly = polylinesRef.current[Number(id)];

            if (isVisible) {
                if (!clusterRef.current.hasLayer(marker)) clusterRef.current.addLayer(marker);
                if (poly && !mapRef.current?.hasLayer(poly)) poly.addTo(mapRef.current!);
            } else {
                if (clusterRef.current.hasLayer(marker)) clusterRef.current.removeLayer(marker);
                if (poly && mapRef.current?.hasLayer(poly)) poly.remove();
            }
        });
    }, [selectedGroupId, locationList]);

    // ── SSE real-time GPS subscription ───────────────────────────────────────
    useEffect(() => {
        const flushInterval = window.setInterval(() => {
            const buf = gpsBufferRef.current;
            if (Object.keys(buf).length === 0) return;
            gpsBufferRef.current = {};

            Object.values(buf).forEach(loc => {
                locationsRef.current[loc.device_id] = loc;
                upsertMarker(loc);
            });
            setLocationList(Object.values(locationsRef.current));
        }, 1500);

        const unsub = subscribeToStream((event) => {
            const current = locationsRef.current[event.device_id];
            gpsBufferRef.current[event.device_id] = {
                device_id: event.device_id,
                name: event.device_name,
                status: current?.status || "online",
                latitude: event.latitude as number,
                longitude: event.longitude as number,
                battery: event.battery,
                magnitude: event.motion_magnitude,
                speed: event.speed || 0,
                noise_level: event.noise_level || 0,
                last_seen: event.timestamp,
                alert_count: current?.alert_count || 0,
                group_id: current?.group_id ?? null,
                group_name: current?.group_name ?? null
            };
        });

        return () => {
            unsub();
            window.clearInterval(flushInterval);
        };
    }, []); // eslint-disable-line

    return (
        <div className="flex flex-col h-full w-full gap-6 p-6">
            <FleetGlobe3D locations={locationList} />

            <div className="flex-1 min-h-[500px] relative rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
                {loading && (
                    <div className="absolute inset-0 z-10 p-4">
                        <LoadingSkeleton width="100%" height="100%" className="rounded-2xl" />
                    </div>
                )}

                <div ref={mapDivRef} className="h-full w-full z-0" />

                <div className="absolute top-6 right-6 z-[1000] bg-slate-950/80 backdrop-blur-xl border border-white/5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden" style={{ width: 260 }}>
                    <div className="px-5 py-4 border-b border-white/5 bg-white/[0.02]">
                        <div className="flex items-center justify-between mb-1">
                            <div className="text-[10px] text-indigo-400 uppercase font-black tracking-[0.2em]">Live Fleet</div>
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                        </div>
                        <div className="text-xs text-slate-400 font-medium mb-3">
                            {filteredLocations.filter(l => l.latitude != null).length} of {filteredLocations.length} showing
                        </div>

                        <select
                            value={selectedGroupId}
                            onChange={(e) => setSelectedGroupId(e.target.value === "all" ? "all" : Number(e.target.value))}
                            className="w-full bg-slate-900 border border-white/10 text-[10px] rounded-lg px-2 py-1.5 text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500/50"
                        >
                            <option value="all">Everywhere</option>
                            {groups.map((g) => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {filteredLocations.length === 0 && (
                            <div className="text-xs text-slate-500 italic text-center py-8 opacity-50">No assets in this group…</div>
                        )}
                        {filteredLocations.map(loc => {
                            const color = getDeviceColor(loc.device_id);
                            const hasGps = loc.latitude != null && loc.longitude != null;
                            const trailLen = pathsRef.current[loc.device_id]?.length ?? 0;
                            return (
                                <div key={loc.device_id} className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.03] hover:border-white/10 transition-all group">
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div
                                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                style={{
                                                    background: hasGps ? color : "#334155",
                                                    boxShadow: hasGps ? `0 0 12px ${color}88` : "none",
                                                }}
                                            />
                                            <span className="text-xs text-slate-100 font-bold truncate group-hover:text-white transition-colors">{loc.name}</span>
                                        </div>
                                        {!hasGps && (
                                            <span className="px-1.5 py-0.5 rounded-md bg-slate-800/50 text-[8px] text-slate-500 font-black uppercase tracking-wider border border-slate-700/50">No Fix</span>
                                        )}
                                    </div>

                                    {hasGps ? (
                                        <div className="flex items-center gap-3 text-[10px] font-bold">
                                            <div className="flex items-center gap-1" style={{ color: batteryColor(loc.battery) }}>
                                                <span className="opacity-50 text-[8px]">BAT</span>
                                                {loc.battery != null ? loc.battery.toFixed(0) + "%" : "—"}
                                            </div>
                                            <div className="flex items-center gap-1 text-cyan-400">
                                                <span className="opacity-50 text-[8px]">MOT</span>
                                                {loc.magnitude != null ? loc.magnitude.toFixed(1) : "—"}
                                            </div>
                                            {trailLen > 1 && (
                                                <div className="ml-auto text-slate-600 font-black uppercase text-[8px] tracking-widest">{trailLen} Pts</div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-[10px] text-slate-600 font-semibold italic">Waiting for telemetry…</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="px-5 py-3 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
                        <div className="flex items-center gap-4 text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-0.5 bg-indigo-500 rounded-full" /> Trail
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full border border-indigo-500" /> Asset
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapView;
