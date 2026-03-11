import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { SensorReading } from "../api";

interface Props {
    readings: SensorReading[];
    type: "noise" | "light";
    title: string;
}

const EnvironmentalChart: React.FC<Props> = ({ readings, type, title }) => {
    const data = (readings || []).map((r) => ({
        time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        val: type === "noise" ? r.noise_level : r.ambient_light,
    }));

    const color = type === "noise" ? "#f43f5e" : "#f59e0b";

    return (
        <div className="card h-full flex flex-col p-4 bg-slate-900/40 border-slate-800/60 transition-all hover:bg-slate-900/60 group">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-lg">{type === "noise" ? "🔊" : "☀️"}</span>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-200 transition-colors">{title}</h3>
                </div>
                <div className="text-xs font-mono text-slate-500 bg-slate-800/40 px-2 py-0.5 rounded">
                    LIVE
                </div>
            </div>
            <div className="flex-1 min-h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id={`grad-${type}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} vertical={false} />
                        <XAxis dataKey="time" hide />
                        <YAxis
                            domain={[0, type === "noise" ? 120 : 1000]}
                            stroke="#64748b"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `${v}${type === "noise" ? "dB" : "lx"}`}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "8px", fontSize: "10px", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.5)" }}
                            labelStyle={{ color: "#94a3b8", marginBottom: "4px" }}
                            itemStyle={{ color: color, padding: 0 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="val"
                            stroke={color}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill={`url(#grad-${type})`}
                            animationDuration={500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default EnvironmentalChart;
