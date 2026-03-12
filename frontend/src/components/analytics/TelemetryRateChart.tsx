import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface Props {
    data: { t: string; v: number }[];
}

const TelemetryRateChart: React.FC<Props> = ({ data }) => (
    <div className="card h-full p-4 bg-slate-900 border-slate-800">
        <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-4">Telemetry Ingestion Rate (Packets/Min)</h3>
        <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis 
                        dataKey="t" 
                        stroke="#475569" 
                        fontSize={10} 
                        tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    />
                    <YAxis stroke="#475569" fontSize={10} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                        itemStyle={{ color: '#818cf8' }}
                        labelFormatter={(l) => new Date(l).toLocaleString()}
                    />
                    <Bar dataKey="v" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    </div>
);

export default TelemetryRateChart;
