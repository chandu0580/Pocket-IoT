import React from "react";
import { SensorReading } from "../api";
import { MoveUp, RotateCw, Compass } from "lucide-react";

interface Props {
    reading: SensorReading | null | undefined;
}

const OrientationWidget: React.FC<Props> = ({ reading }) => {
    const pitch = reading?.pitch || 0;
    const roll = reading?.roll || 0;
    const yaw = reading?.yaw || 0;

    // Constrain pitch/roll for visual indicator
    const constrainedPitch = Math.max(-45, Math.min(45, pitch));
    const constrainedRoll = Math.max(-45, Math.min(45, roll));

    return (
        <div className="card h-full p-4 bg-slate-900 border-slate-800 shadow-2xl flex flex-col group transition-all hover:bg-slate-900/60 overflow-hidden relative">
            {/* Background decoration */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />

            <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3 relative z-10">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400 group-hover:text-emerald-200 transition-colors flex items-center gap-2">
                    <Compass className="w-4 h-4" /> ORIENTATION & TILT
                </h3>
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <div className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">Live HUD</div>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
                {/* ── Flight Instrument Radar ── */}
                <div className="md:col-span-6 flex justify-center">
                    <div className="relative w-36 h-36 rounded-full border-[3px] border-slate-800 bg-slate-950 flex items-center justify-center p-1 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                        {/* Outer Yaw Ring */}
                        <div
                            className="absolute inset-2 border-2 border-dashed border-emerald-500/20 rounded-full transition-transform duration-700 ease-out"
                            style={{ transform: `rotate(${yaw}deg)` }}
                        >
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 text-[8px] font-bold text-emerald-500">N</div>
                        </div>

                        {/* Middle Pitch/Roll Area */}
                        <div className="relative w-full h-full rounded-full overflow-hidden bg-slate-900 shadow-inner">
                            {/* Horizon Line */}
                            <div
                                className="absolute top-1/2 left-0 right-0 h-0.5 bg-emerald-500/30 transition-all duration-500"
                                style={{ transform: `translateY(${constrainedPitch}px) rotate(${roll}deg)` }}
                            />
                            {/* Attitude indicator center */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                                <div className="w-12 h-[2px] bg-emerald-400 rounded-full shadow-[0_0_10px_#34d399]" />
                                <div className="absolute w-[2px] h-3 bg-emerald-400 rounded-full shadow-[0_0_10px_#34d399] -top-1.5" />
                            </div>
                        </div>

                        {/* Glowing Overlay */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-transparent to-white/5 pointer-events-none" />
                    </div>
                </div>

                {/* ── Precision Metrics ── */}
                <div className="md:col-span-6 space-y-2.5">
                    {[
                        { label: 'Pitch / X', val: pitch, icon: <MoveUp className="w-3 h-3" />, color: 'text-emerald-400', range: [-180, 180] },
                        { label: 'Roll / Y', val: roll, icon: <RotateCw className="w-3 h-3" />, color: 'text-cyan-400', range: [-90, 90] },
                        { label: 'Yaw / Z', val: yaw, icon: <Compass className="w-3 h-3" />, color: 'text-white', range: [0, 360] },
                    ].map((m) => (
                        <div key={m.label} className="bg-slate-950/40 p-3 rounded-xl border border-white/5 flex items-center justify-between group/metric">
                            <div className="flex items-center gap-2.5">
                                <div className={`p-1.5 rounded-lg bg-slate-900 border border-white/5 ${m.color} opacity-40 group-hover/metric:opacity-100 transition-opacity`}>
                                    {m.icon}
                                </div>
                                <div className="text-[9px] text-slate-500 uppercase tracking-widest font-black">{m.label}</div>
                            </div>
                            <div className="text-right">
                                <div className={`text-sm font-black italic ${m.color}`}>{m.val.toFixed(1)}°</div>
                                <div className="w-16 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                                    <div
                                        className={`h-full bg-current ${m.color} opacity-40`}
                                        style={{ width: `${Math.abs((m.val / (m.range[1] || 1)) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800/40 text-[9px] text-slate-500 font-black tracking-widest flex items-center justify-between opacity-60">
                <span className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-emerald-500" /> AHRS ENGINE V4</span>
                <span className="uppercase">SILICON PRECISION</span>
            </div>
        </div>
    );
};

export default OrientationWidget;
