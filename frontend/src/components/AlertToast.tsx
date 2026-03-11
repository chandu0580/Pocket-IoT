import React, { useEffect } from "react";
import { X, AlertCircle } from "lucide-react";

export interface ToastAlert {
    id: string;
    device: string;
    magnitude: number;
    timestamp: number;
}

interface Props {
    alerts: ToastAlert[];
    onDismiss: (id: string) => void;
}

const AlertToast: React.FC<Props> = ({ alerts, onDismiss }) => {
    // Auto-dismiss after 5 seconds handled in parent or here? 
    // We'll manage auto-dismiss timer per alert here.
    useEffect(() => {
        const timers = alerts.map(alert => {
            return setTimeout(() => {
                onDismiss(alert.id);
            }, 5000);
        });

        return () => {
            timers.forEach(clearTimeout);
        };
    }, [alerts, onDismiss]);

    if (alerts.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
            {alerts.map((alert) => (
                <div
                    key={alert.id}
                    className="pointer-events-auto flex items-start gap-3 bg-slate-900 border border-red-500/50 rounded-xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.5),0_0_20px_rgba(239,68,68,0.2)] animate-fade-in translate-y-0"
                >
                    <div className="mt-0.5 p-1.5 bg-red-500/10 rounded-lg shrink-0">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                                ⚠ Motion Anomaly Detected
                            </h4>
                            <button
                                onClick={() => onDismiss(alert.id)}
                                className="text-slate-500 hover:text-white transition-colors p-0.5"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="mt-1 space-y-0.5 text-xs text-slate-400">
                            <div><span className="text-slate-500">Device:</span> <span className="font-semibold text-slate-300">{alert.device}</span></div>
                            <div><span className="text-slate-500">Magnitude:</span> <span className="font-semibold text-red-400">{alert.magnitude.toFixed(1)} m/s²</span></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AlertToast;
