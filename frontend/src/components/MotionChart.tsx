import React, { useMemo, useState } from "react";
import {
    CartesianGrid, Legend, Line, LineChart,
    ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { SensorReading } from "../api";

interface Props {
    readings: SensorReading[];
    /** If provided, only show one device's data */
    deviceId?: number;
    title?: string;
    mode?: "accelerometer" | "gyroscope";
}

type View = "xyz" | "magnitude";

const COLORS = {
    x: "#38bdf8", y: "#a78bfa", z: "#34d399", m: "#f97316",
};

const MotionChart: React.FC<Props> = ({ readings, deviceId, title = "Motion Telemetry", mode = "accelerometer" }) => {
    const [view, setView] = useState<View>("xyz");

    const filtered = useMemo(
        () => (deviceId !== undefined ? readings.filter((r) => r.device_id === deviceId) : readings),
        [readings, deviceId],
    );

    const data = useMemo(() => {
        // STEP 4: LIMIT CHART DATA SIZE to 40 points for stable rendering
        const sliced = filtered.slice(-40);
        return sliced.map((r, i) => {
            const rx = mode === "accelerometer" ? (r.x || 0) : (r.gyro_x || 0);
            const ry = mode === "accelerometer" ? (r.y || 0) : (r.gyro_y || 0);
            const rz = mode === "accelerometer" ? (r.z || 0) : (r.gyro_z || 0);
            const rm = mode === "accelerometer" ? (r.motion_magnitude || 0) : Math.sqrt(rx ** 2 + ry ** 2 + rz ** 2);

            // Calculate SMA(5) for magnitude
            let smoothedM = rm;
            const windowSize = 5;
            if (i >= windowSize - 1) {
                let sum = 0;
                for (let j = 0; j < windowSize; j++) {
                    const prevReading = sliced[i - j];
                    const prx = mode === "accelerometer" ? (prevReading.x || 0) : (prevReading.gyro_x || 0);
                    const pry = mode === "accelerometer" ? (prevReading.y || 0) : (prevReading.gyro_y || 0);
                    const prz = mode === "accelerometer" ? (prevReading.z || 0) : (prevReading.gyro_z || 0);
                    const prm = mode === "accelerometer" ? (prevReading.motion_magnitude || 0) : Math.sqrt(prx ** 2 + pry ** 2 + prz ** 2);
                    sum += prm;
                }
                smoothedM = sum / windowSize;
            }

            return {
                t: new Date(r.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                }),
                x: Math.round(rx * 100) / 100,
                y: Math.round(ry * 100) / 100,
                z: Math.round(rz * 100) / 100,
                m: Math.round(smoothedM * 100) / 100,
                rawM: Math.round(rm * 100) / 100,
                dev: r.device_id,
            };
        });
    }, [filtered]);

    if (data.length === 0) {
        return (
            <div className="card h-full flex flex-col">
                <div className="card-title">📐 {title}</div>
                <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                    No sensor data yet — start the mobile app or simulator.
                </div>
            </div>
        );
    }

    return (
        <div className="card h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="card-title mb-0">📐 {title}</div>
                <div className="flex gap-1">
                    {(["xyz", "magnitude"] as View[]).map((v) => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${view === v
                                ? "bg-indigo-600/40 text-indigo-300 border border-indigo-500/40"
                                : "text-slate-500 hover:text-slate-300"
                                }`}
                        >
                            {v === "xyz" ? "X/Y/Z" : "Magnitude"}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 min-h-0" style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                        <CartesianGrid stroke="rgba(51,65,85,0.5)" strokeDasharray="3 3" />
                        <XAxis dataKey="t" tick={{ fontSize: 9, fill: "#64748b" }} />
                        <YAxis tick={{ fontSize: 9, fill: "#64748b" }} />
                        <Tooltip
                            contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid #334155", borderRadius: 10, fontSize: 12 }}
                            labelStyle={{ color: "#94a3b8" }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {view === "xyz" ? (
                            <>
                                <Line type="monotone" dataKey="x" stroke={COLORS.x} dot={false} name="X" strokeWidth={1.5} />
                                <Line type="monotone" dataKey="y" stroke={COLORS.y} dot={false} name="Y" strokeWidth={1.5} />
                                <Line type="monotone" dataKey="z" stroke={COLORS.z} dot={false} name="Z" strokeWidth={1.5} />
                            </>
                        ) : (
                            <Line type="monotone" dataKey="m" stroke={COLORS.m} dot={false} name="|a| m/s²" strokeWidth={2} />
                        )}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default MotionChart;
