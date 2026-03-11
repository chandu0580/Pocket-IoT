import React from "react";
import { LogOut, LayoutDashboard, Smartphone, Map, Bell, History, BarChart3, Users, User, Settings, Shield } from "lucide-react";
import { logout } from "../api";
import { NavLink } from "react-router-dom";

interface Props { sseConnected: boolean; }

const links = [
    { to: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" />, label: "Dashboard" },
    { to: "/devices", icon: <Smartphone className="w-4 h-4" />, label: "Inventory" },
    { to: "/map", icon: <Map className="w-4 h-4" />, label: "Asset Map" },
    { to: "/alerts", icon: <Bell className="w-4 h-4" />, label: "Alert Hub" },
    { to: "/notifications", icon: <History className="w-4 h-4" />, label: "Audit Logs" },
    { to: "/analytics", icon: <BarChart3 className="w-4 h-4" />, label: "Intelligence" },
    { to: "/teams", icon: <Users className="w-4 h-4" />, label: "Teams" },
    { to: "/users", icon: <User className="w-4 h-4" />, label: "Access Control" },
    { to: "/settings", icon: <Settings className="w-4 h-4" />, label: "System Config" },
];

const Sidebar: React.FC<Props> = ({ sseConnected }) => (
    <aside className="flex h-screen w-64 flex-col border-r border-white/5 bg-slate-950/50 backdrop-blur-xl relative z-50">
        {/* Decorative Gradients */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />

        {/* Logo Section */}
        <div className="px-6 py-8 relative">
            <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                    <Shield className="w-4 h-4 text-white" />
                </div>
                <div>
                    <div className="text-xl font-black tracking-tighter text-white leading-none">
                        Pocket<span className="text-indigo-400">IoT</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-[0.2em] opacity-60">
                        Enterprise Node
                    </div>
                </div>
            </div>
        </div>

        {/* Search / Status Divider */}
        <div className="px-6 pb-4">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto py-2 custom-scrollbar">
            <div className="px-3 pb-2 text-[10px] font-black text-slate-600 uppercase tracking-widest">Navigation</div>
            {links.map((l) => (
                <NavLink
                    key={l.to}
                    to={l.to}
                    end={l.to === "/"}
                    className={({ isActive }) => `
                        flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group relative
                        ${isActive
                            ? "bg-indigo-500/10 text-indigo-400 font-bold"
                            : "text-slate-400 hover:text-white hover:bg-white/5"}
                    `}
                >
                    {({ isActive }) => (
                        <>
                            <div className={`${isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"} transition-colors`}>
                                {l.icon}
                            </div>
                            <span className="text-sm tracking-tight">{l.label}</span>
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                            )}
                        </>
                    )}
                </NavLink>
            ))}
        </nav>

        {/* Logout & Footer */}
        <div className="px-4 py-6 border-t border-white/5 bg-slate-900/20">
            <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all text-sm font-bold group"
            >
                <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span>Terminate Session</span>
            </button>

            <div className="mt-4 px-3 py-2 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${sseConnected ? 'text-emerald-500' : 'text-slate-500'}`}>
                        {sseConnected ? 'Connected' : 'Interrupted'}
                    </span>
                </div>
                <div className="text-[10px] font-mono text-slate-600">v2.4.0</div>
            </div>
        </div>
    </aside>
);

export default Sidebar;
