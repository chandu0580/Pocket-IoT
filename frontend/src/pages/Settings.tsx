import React, { useEffect, useState } from "react";
import { fetchOrgSettings, Organization } from "../api";
import {
    Settings as SettingsIcon,
    Globe,
    CreditCard,
    LayoutGrid,
    Smartphone,
    Bell,
    Key,
    Save,
    CheckCircle2,
    Shield,
    Zap
} from "lucide-react";
import { API_BASE_URL } from "../config";

const Settings: React.FC = () => {
    const [org, setOrg] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("general");

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await fetchOrgSettings();
            setOrg(data);
        } catch (err) {
            console.error("Failed to load org settings:", err);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: "general", icon: <SettingsIcon className="w-5 h-5" />, label: "General" },
        { id: "branding", icon: <LayoutGrid className="w-5 h-5" />, label: "Branding" },
        { id: "devices", icon: <Smartphone className="w-5 h-5" />, label: "Fleet Policy" },
        { id: "notifications", icon: <Bell className="w-5 h-5" />, label: "Alerting" },
        { id: "billing", icon: <CreditCard className="w-5 h-5" />, label: "Subscription" },
        { id: "security", icon: <Key className="w-5 h-5" />, label: "API & Security" },
    ];

    if (loading) return (
        <div className="p-12 animate-pulse space-y-8">
            <div className="h-20 bg-slate-800/40 rounded-[40px] w-1/3" />
            <div className="grid grid-cols-4 gap-8">
                <div className="col-span-1 h-96 bg-slate-800/40 rounded-[40px]" />
                <div className="col-span-3 h-96 bg-slate-800/40 rounded-[40px]" />
            </div>
        </div>
    );

    return (
        <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-slate-900/40 backdrop-blur p-10 rounded-[40px] border border-slate-800/60 shadow-2xl">
                <div className="space-y-4">
                    <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.3em] text-indigo-400">
                        <span className="p-2 bg-indigo-500/10 rounded-lg">TENANT: {org?.id}</span>
                        <span className="text-slate-600">/</span>
                        <span>Organization Management</span>
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter">
                        Workspace Settings
                    </h1>
                </div>
                <div className="flex items-center gap-3 bg-slate-800/40 px-6 py-4 rounded-3xl border border-slate-700/50">
                    <div className="flex flex-col items-end">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500">Current Plan</span>
                        <span className="text-lg font-black text-indigo-400 uppercase tracking-tighter">{org?.plan} PRO</span>
                    </div>
                    <div className="w-px h-10 bg-slate-700/50 mx-2" />
                    <button className="bg-gradient-to-tr from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
                        Upgrade
                    </button>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                {/* Sidebar Navigation */}
                <nav className="lg:col-span-1 flex flex-col gap-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-4 px-6 py-5 rounded-3xl border-2 transition-all group font-bold text-sm ${activeTab === tab.id
                                ? "border-indigo-600 bg-indigo-600/10 text-white shadow-xl shadow-indigo-600/10"
                                : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/40"
                                }`}
                        >
                            <span className={`${activeTab === tab.id ? "text-indigo-400" : "text-slate-600 group-hover:text-slate-400"}`}>
                                {tab.icon}
                            </span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </nav>

                {/* Content Area */}
                <div className="lg:col-span-3 bg-slate-900/40 backdrop-blur rounded-[40px] border border-slate-800/60 p-10 lg:p-14 space-y-12">
                    {activeTab === "general" && (
                        <>
                            <div className="space-y-6">
                                <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                                    <Globe className="w-6 h-6 text-indigo-400" />
                                    General Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-500 px-1">Workspace Name</label>
                                        <input
                                            type="text"
                                            defaultValue={org?.name}
                                            className="w-full bg-slate-800/40 border-2 border-slate-800 rounded-3xl px-6 py-5 text-white font-bold focus:outline-none focus:border-indigo-600/50 transition-all text-lg"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-500 px-1">Organization Alias</label>
                                        <input
                                            type="text"
                                            placeholder="pocket-iot-main"
                                            className="w-full bg-slate-800/40 border-2 border-slate-800 rounded-3xl px-6 py-5 text-white font-bold focus:outline-none focus:border-indigo-600/50 transition-all text-lg"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                                    <ShieldCheck className="w-6 h-6 text-indigo-400" />
                                    Account Metrics
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <MetricCard label="Workspace ID" value={org?.id || "ORG-X"} unit="unique id" />
                                    <MetricCard label="Billing Tier" value={org?.plan?.toUpperCase() || "FREE"} unit="subscription" />
                                    <MetricCard label="Storage" value="84%" unit="capacity" />
                                </div>
                            </div>

                            <div className="pt-8 flex justify-end">
                                <button className="flex items-center gap-3 bg-white text-slate-950 hover:bg-indigo-50 px-10 py-5 rounded-3xl font-black uppercase tracking-widest transition-all shadow-xl shadow-white/5 active:scale-95 text-sm">
                                    <Save className="w-5 h-5" />
                                    <span>Persist Changes</span>
                                </button>
                            </div>
                        </>
                    )}

                    {activeTab === "security" && (
                        <div className="space-y-12">
                            <div className="space-y-6">
                                <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                                    <Key className="w-6 h-6 text-indigo-400" />
                                    API Infrastructure
                                </h3>
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-xs font-black uppercase tracking-widest text-slate-500 px-1">Backend Primary URL</label>
                                            <div className="w-full bg-slate-800/20 border-2 border-slate-800/60 rounded-3xl px-6 py-5 text-indigo-400 font-mono text-sm flex items-center justify-between">
                                                <span>{API_BASE_URL}</span>
                                                <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase rounded-full">Active</div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-xs font-black uppercase tracking-widest text-slate-500 px-1">Organization Key</label>
                                            <div className="w-full bg-slate-800/20 border-2 border-slate-800/60 rounded-3xl px-6 py-5 text-slate-400 font-mono text-sm select-all">
                                                ORG_NODE_0{org?.id || "X"}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8 bg-indigo-500/5 rounded-[40px] border border-indigo-500/10 space-y-4">
                                        <div className="flex items-center gap-3 text-indigo-400">
                                            <Shield className="w-5 h-5" />
                                            <span className="text-xs font-black uppercase tracking-widest">Enhanced Data Isolation</span>
                                        </div>
                                        <p className="text-slate-500 text-sm font-medium leading-relaxed">
                                            Your workspace uses high-entropy JWT secrets for agent authentication. All device telemetry is sandboxed within your unique organization ID.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "notifications" && (
                        <div className="space-y-12">
                            <div className="space-y-6">
                                <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                                    <Bell className="w-6 h-6 text-indigo-400" />
                                    Global Alerting Policies
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="p-8 bg-slate-800/20 border-2 border-slate-800/60 rounded-[40px] space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Zap className="w-5 h-5 text-indigo-400" />
                                                <span className="font-black uppercase tracking-widest text-xs text-white">Motion Spike</span>
                                            </div>
                                            <div className="bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-[8px] font-black uppercase">Active</div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                                                <span>Threshold</span>
                                                <span className="text-white">15.0 m/s²</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-500 w-3/4 rounded-full" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8 bg-slate-800/20 border-2 border-slate-800/60 rounded-[40px] space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Bell className="w-5 h-5 text-rose-400" />
                                                <span className="font-black uppercase tracking-widest text-xs text-white">Critical Battery</span>
                                            </div>
                                            <div className="bg-rose-500/20 text-rose-500 px-3 py-1 rounded-full text-[8px] font-black uppercase">Priority</div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                                                <span>Threshold</span>
                                                <span className="text-white">20%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-rose-500 w-1/5 rounded-full" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab !== "general" && activeTab !== "security" && activeTab !== "notifications" && (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                            <div className="w-20 h-20 bg-slate-800/40 rounded-[30px] flex items-center justify-center text-slate-600">
                                <SettingsIcon className="w-10 h-10" />
                            </div>
                            <div>
                                <h4 className="text-xl font-black text-slate-300 mb-2 uppercase tracking-tighter">Advanced Control Pending</h4>
                                <p className="text-slate-500 max-w-sm font-medium">This modular settings panel is part of the v2 Enterprise expansion. Please contact support for early access.</p>
                            </div>
                            <button className="px-8 py-4 bg-slate-800/60 text-indigo-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all border border-slate-700/50">
                                Open Docs
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

const MetricCard = ({ label, value, unit }: { label: string, value: string | number, unit: string }) => (
    <div className="p-8 bg-slate-800/30 rounded-[35px] border border-slate-800/40 group hover:border-indigo-500/30 transition-all relative overflow-hidden">
        <div className="relative z-10">
            <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2 truncate">{label}</div>
            <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white tracking-tighter">{value}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 opacity-60 group-hover:opacity-100 transition-all">{unit}</span>
            </div>
        </div>
        <div className="absolute right-0 bottom-0 p-4 opacity-5 group-hover:opacity-10 transition-all">
            <CheckCircle2 className="w-16 h-16 text-indigo-400 -rotate-12" />
        </div>
    </div>
);

const ShieldCheck = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        <path d="m9 12 2 2 4-4" />
    </svg>
);

export default Settings;
