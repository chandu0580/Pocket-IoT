import React, { useEffect, useState } from "react";
import { fetchAIInsights } from "../api";
import { AlertTriangle, Activity, Zap, BarChart3 } from "lucide-react";

interface Insights {
    anomalies_today: number;
    most_active_device: string;
    highest_motion_spike: number;
    average_magnitude: number;
}

const AIInsightsWidget: React.FC = () => {
    const [insights, setInsights] = useState<Insights | null>(null);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            const data = await fetchAIInsights();
            setInsights(data);
        } catch (err) {
            console.error("Failed to load AI insights", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        const interval = setInterval(load, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, []);

    if (loading && !insights) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-24 bg-slate-900/50 border border-slate-800 rounded-2xl"></div>
                ))}
            </div>
        );
    }

    const cards = [
        {
            label: "Anomalies Today",
            value: insights?.anomalies_today ?? 0,
            icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            suffix: ""
        },
        {
            label: "Most Active",
            value: insights?.most_active_device ?? "N/A",
            icon: <Activity className="w-5 h-5 text-indigo-500" />,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
            suffix: ""
        },
        {
            label: "Max Motion Spike",
            value: insights?.highest_motion_spike ?? 0,
            icon: <Zap className="w-5 h-5 text-cyan-500" />,
            color: "text-cyan-500",
            bg: "bg-cyan-500/10",
            suffix: " m/s²"
        },
        {
            label: "Avg Magnitude",
            value: insights?.average_magnitude ?? 0,
            icon: <BarChart3 className="w-5 h-5 text-emerald-500" />,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            suffix: " m/s²"
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4 transition-all hover:border-slate-700">
                    <div className={`p-3 rounded-xl ${card.bg}`}>
                        {card.icon}
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">
                            {card.label}
                        </div>
                        <div className={`text-xl font-black ${card.color}`}>
                            {card.value}{card.suffix}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AIInsightsWidget;
