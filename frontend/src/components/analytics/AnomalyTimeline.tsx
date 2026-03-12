import React from 'react';
import {
    ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface Props {
    data: { timestamp: string; anomaly_score: number; severity: string }[];
}

const AnomalyTimeline: React.FC<Props> = ({ data }) => {
    const chartData = data.map(d => ({
        t: new Date(d.timestamp).getTime(),
        score: d.anomaly_score,
        severity: d.severity
    }));

    return (
        <div className="card h-full p-4 bg-slate-900 border-slate-800">
            <h3 className="text-xs font-black uppercase tracking-widest text-rose-400 mb-4">AI Anomaly History</h3>
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid stroke="#1e293b" />
                        <XAxis 
                            type="number" 
                            dataKey="t" 
                            name="Time" 
                            domain={['auto', 'auto']}
                            tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            stroke="#475569"
                            fontSize={10}
                        />
                        <YAxis type="number" dataKey="score" name="Score" stroke="#475569" fontSize={10} domain={[0, 1.2]} />
                        <ZAxis type="category" dataKey="severity" name="Severity" />
                        <Tooltip 
                            cursor={{ strokeDasharray: '3 3' }} 
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                            labelFormatter={(l) => new Date(l).toLocaleString()}
                        />
                        <Scatter name="Anomalies" data={chartData}>
                            {chartData.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.severity === 'critical' ? '#ef4444' : '#f97316'} 
                                />
                            ))}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default AnomalyTimeline;
