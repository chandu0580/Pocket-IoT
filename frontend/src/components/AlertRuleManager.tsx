import React, { useState, useEffect } from "react";
import { AlertRule, fetchAlertRules, createAlertRule } from "../api";
import { Plus, BellRing, Settings2, Trash2 } from "lucide-react";

interface Props {
    deviceId: number;
}

const AlertRuleManager: React.FC<Props> = ({ deviceId }) => {
    const [rules, setRules] = useState<AlertRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);

    const [newRule, setNewRule] = useState({
        sensor_type: "battery",
        operator: "<",
        threshold: 20,
        required_samples: 1
    });

    const loadRules = async () => {
        try {
            const data = await fetchAlertRules(deviceId);
            setRules(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadRules(); }, [deviceId]);

    const handleAddRule = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createAlertRule(deviceId, newRule);
            setShowAdd(false);
            loadRules();
        } catch (e) {
            alert("Failed to create rule");
        }
    };

    return (
        <div className="card h-full p-4 bg-slate-900 border-slate-800 shadow-xl border-shadow group">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
                <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-orange-400 flex items-center gap-2">
                        <BellRing className="w-3 h-3" /> Custom Alert Rules
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase font-black tracking-widest opacity-60">Rule-based triggers</p>
                </div>
                <button
                    onClick={() => setShowAdd(!showAdd)}
                    className="p-1 px-3 rounded-md bg-orange-600/20 text-[10px] text-orange-400 hover:bg-orange-600 hover:text-white transition-all border border-orange-500/30 uppercase font-black flex items-center gap-1.5 active:scale-95"
                >
                    {showAdd ? "CANCEL" : <><Plus className="w-3 h-3" /> ADD RULE</>}
                </button>
            </div>

            {showAdd && (
                <form onSubmit={handleAddRule} className="mb-6 p-4 bg-slate-800/40 rounded-xl border border-slate-700/40 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Sensor</label>
                            <select
                                value={newRule.sensor_type}
                                onChange={e => setNewRule({ ...newRule, sensor_type: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-orange-500/50"
                            >
                                <option value="battery">Battery (%)</option>
                                <option value="motion_magnitude">Motion (m/s²)</option>
                                <option value="noise_level">Noise (dB)</option>
                                <option value="ambient_light">Light (lx)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Operator</label>
                            <select
                                value={newRule.operator}
                                onChange={e => setNewRule({ ...newRule, operator: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-orange-500/50"
                            >
                                <option value="<">Less Than</option>
                                <option value=">">Greater Than</option>
                                <option value="=">Equal To</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Threshold</label>
                            <input
                                type="number"
                                value={newRule.threshold}
                                onChange={e => setNewRule({ ...newRule, threshold: Number(e.target.value) })}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-orange-500/50"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Consecutive Samples</label>
                            <input
                                type="number"
                                min="1"
                                value={newRule.required_samples}
                                onChange={e => setNewRule({ ...newRule, required_samples: Number(e.target.value) })}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-orange-500/50"
                                placeholder="e.g. 3"
                            />
                        </div>
                    </div>
                    <button type="submit" className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white rounded text-xs font-black uppercase tracking-widest transition-all">
                        SAVE RULE
                    </button>
                </form>
            )}

            <div className="flex-1 space-y-2">
                {loading ? (
                    <div className="text-[10px] text-slate-500 uppercase font-black text-center py-8">Fetching rules…</div>
                ) : rules.length === 0 ? (
                    <div className="text-[10px] text-slate-600 uppercase font-black text-center py-8 border border-dashed border-slate-800 rounded-xl">No active rules for this device.</div>
                ) : (
                    rules.map(rule => (
                        <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/20 border border-slate-800 transition-all hover:bg-slate-800/40">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                                <div>
                                    <div className="text-[10px] font-black text-white uppercase tracking-wider">
                                        {rule.sensor_type.replace('_', ' ')} {rule.operator} {rule.threshold}
                                        {rule.required_samples > 1 && <span className="text-[8px] text-orange-400 ml-2 italic">({rule.required_samples} samples)</span>}
                                    </div>
                                    <div className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                        {rule.current_samples > 0 ? `Evaluating: ${rule.current_samples}/${rule.required_samples} samples` : "Automated Monitor Active"}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[8px] font-black text-emerald-500 bg-emerald-900/20 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-tighter">ACTIVE</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800/40 text-[9px] text-slate-600 font-medium tracking-wide flex items-center justify-between uppercase">
                <span>Cloud Evaluation Active</span>
                <span>PocketIoT V2.1</span>
            </div>
        </div>
    );
};

export default AlertRuleManager;
