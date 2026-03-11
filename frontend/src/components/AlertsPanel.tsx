import React from "react";
import { AlertItem } from "../api";
import { Trash2 } from "lucide-react";

interface Props {
  alerts: AlertItem[];
  maxItems?: number;
  onClear?: () => void;
}

const TYPE_STYLES: Record<string, string> = {
  motion: "alert-motion",
  battery: "alert-battery",
  offline: "alert-offline",
  general: "alert-general",
};

const TYPE_ICONS: Record<string, string> = {
  motion: "⚡", battery: "🔋", offline: "📴", general: "⚠️",
};

const AlertsPanel: React.FC<Props> = ({ alerts, maxItems = 20, onClear }) => {
  const shown = [...alerts].reverse().slice(0, maxItems);

  return (
    <div className="card h-full flex flex-col group/panel">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
          <span>🔔</span> Recent Alerts
        </h2>
        {onClear && shown.length > 0 && (
          <button
            onClick={onClear}
            className="p-1.5 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover/panel:opacity-100 transition-all hover:bg-red-500 hover:text-white"
            title="Clear all alerts"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {shown.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center relative min-h-[220px] bg-slate-900/20 rounded-2xl border border-dashed border-white/5">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
            <div className="relative p-6 rounded-full bg-slate-800 border border-emerald-500/20 shadow-2xl">
              <span className="text-3xl">🛡️</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 group/status">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all group-hover/status:scale-105">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">System Healthy</span>
            </div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest opacity-40">All nodes nominal</span>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-2 overflow-y-auto pr-1 flex-1">
          {shown.map((a) => (
            <li
              key={a.id}
              className={`rounded-xl border px-3 py-2.5 text-sm ${TYPE_STYLES[a.type] ?? "alert-general"}`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-300">
                  <span>{TYPE_ICONS[a.type] ?? "⚠️"}</span>
                  {a.type}
                </span>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span>Dev {a.device_id}</span>
                  <span>{new Date(a.timestamp || a.created_at || Date.now()).toLocaleTimeString()}</span>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{a.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AlertsPanel;
