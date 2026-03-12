import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

interface Props {
    data: { t: string; v: number }[];
}

const NoiseChart: React.FC<Props> = ({ data }) => (
    <div className="card h-full p-4 bg-slate-900 border-slate-800">
        <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-4">Environmental Noise (dB)</h3>
        <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
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
                        itemStyle={{ color: '#34d399' }}
                        labelFormatter={(l) => new Date(l).toLocaleString()}
                    />
                    <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: 'Spike', fill: '#ef4444', fontSize: 10 }} />
                    <Line type="step" dataKey="v" stroke="#34d399" dot={false} strokeWidth={2} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    </div>
);

export default NoiseChart;
