import React from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface Props {
    data: { t: string; v: number }[];
    title: string;
}

const MotionChart: React.FC<Props> = ({ data, title }) => (
    <div className="card h-full p-4 bg-slate-900 border-slate-800">
        <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-4">{title}</h3>
        <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorMotion" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
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
                    <Area type="monotone" dataKey="v" stroke="#818cf8" fillOpacity={1} fill="url(#colorMotion)" strokeWidth={2} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    </div>
);

export default MotionChart;
