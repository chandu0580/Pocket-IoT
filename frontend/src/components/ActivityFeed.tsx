import React, { useEffect, useMemo, useRef } from "react";
import type { StreamSensorEvent } from "../api";
import { EmptyState } from "./LoadingSkeleton";

interface Props {
    events: StreamSensorEvent[];
    maxItems?: number;
}

interface FeedEvent {
    id: string;
    type: "connected" | "gps" | "battery_low" | "anomaly" | "packet";
    device: string;
    timestamp: string;
    message: string;
}

const ActivityFeed: React.FC<Props> = ({ events, maxItems = 20 }) => {
    const listRef = useRef<HTMLUListElement>(null);

    // Derive a rich event feed from the raw stream events
    const feed = useMemo(() => {
        const generated: FeedEvent[] = [];

        // Ensure chronological order
        const sortedEvents = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // Track states to avoid spamming "connected" or "gps updated"
        const seenDevices = new Set<number>();

        for (const e of sortedEvents) {
            const devName = e.device_name ?? `Dev ${e.device_id}`;
            const timeStr = new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const ts = e.timestamp;

            if (!seenDevices.has(e.device_id)) {
                seenDevices.add(e.device_id);
                generated.push({ id: `conn-${e.device_id}`, type: "connected", device: devName, timestamp: ts, message: "Device connected" });
            }

            if (e.is_anomaly) {
                generated.push({ id: `anom-${e.sensor_data_id}`, type: "anomaly", device: devName, timestamp: ts, message: `Motion anomaly detected (${e.motion_magnitude?.toFixed(1)} m/s²)` });
            }

            if (e.battery !== undefined && e.battery !== null && e.battery < 20) {
                // To avoid spam, we just rely on slicing at the end, but normally we'd throttle this.
                generated.push({ id: `bat-${e.sensor_data_id}`, type: "battery_low", device: devName, timestamp: ts, message: `Battery dropped to ${Math.round(e.battery)}%` });
            }

            if (e.latitude !== null && e.longitude !== null) {
                // If it has GPS we log it as a GPS update
                generated.push({ id: `gps-${e.sensor_data_id}`, type: "gps", device: devName, timestamp: ts, message: "GPS updated" });
            }
        }

        return generated.slice(-maxItems);
    }, [events, maxItems]);

    useEffect(() => {
        // Auto-scroll to bottom
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [feed]);

    return (
        <div className="card flex flex-col h-[380px]">
            <div className="card-title mb-4 bg-slate-800/50 p-3 rounded-lg flex items-center gap-2 border border-slate-700/50">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                Activity Feed
            </div>

            <div className="flex-1 overflow-hidden relative">
                {feed.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <EmptyState message="Waiting for device activity..." icon="📡" />
                    </div>
                ) : (
                    <ul ref={listRef} className="absolute inset-0 overflow-y-auto pr-2 space-y-2 scroll-smooth">
                        {feed.map((item) => {
                            let icon = "•";
                            let color = "text-slate-400";
                            if (item.type === "connected") { icon = "🟢"; color = "text-emerald-400"; }
                            if (item.type === "battery_low") { icon = "🔋"; color = "text-amber-400"; }
                            if (item.type === "anomaly") { icon = "⚠️"; color = "text-red-400"; }
                            if (item.type === "gps") { icon = "📍"; color = "text-cyan-400"; }

                            const timeStr = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                            return (
                                <li
                                    key={item.id}
                                    className="flex items-start gap-3 rounded-xl bg-slate-800/30 p-3 text-sm animate-fade-in border border-slate-700/30 hover:bg-slate-800/50 transition-colors"
                                >
                                    <span className="text-slate-500 font-mono text-xs mt-0.5 shrink-0 w-12">{timeStr}</span>
                                    <span className="shrink-0 text-base">{icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-slate-200 truncate">{item.device}</div>
                                        <div className={`${color} text-xs mt-0.5 font-medium`}>{item.message}</div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default ActivityFeed;
