import React, { useState, useEffect, useRef } from "react";
import { Bell, AlertTriangle, Battery, Ghost, Info } from "lucide-react";
import { fetchNotifications, NotificationItem } from "../api";
import { Link } from "react-router-dom";

const NotificationBell: React.FC<{ sseNotif: any }> = ({ sseNotif }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const loadNotifications = async () => {
        try {
            const data = await fetchNotifications(10, 0);
            setNotifications(data);
            // For demo purposes, we'll just count all as unread initially
            setUnreadCount(data.length > 5 ? 5 : data.length);
        } catch (_) { }
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    useEffect(() => {
        if (sseNotif) {
            setNotifications(prev => [sseNotif, ...prev].slice(0, 10));
            setUnreadCount(c => c + 1);
        }
    }, [sseNotif]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getIcon = (type: string) => {
        if (type.includes("battery")) return <Battery className="w-4 h-4 text-amber-400" />;
        if (type.includes("anomaly")) return <AlertTriangle className="w-4 h-4 text-rose-500" />;
        if (type.includes("offline")) return <Ghost className="w-4 h-4 text-slate-400" />;
        return <Info className="w-4 h-4 text-indigo-400" />;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => {
                    setIsOpen(!isOpen);
                    setUnreadCount(0);
                }}
                className="relative p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 transition-all group"
            >
                <Bell className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 border-2 border-slate-900 text-[10px] font-black text-white animate-bounce">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/40">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">Organization Alerts</h3>
                        <Link to="/notifications" className="text-[10px] text-indigo-400 font-bold hover:underline" onClick={() => setIsOpen(false)}>VIEW ALL</Link>
                    </div>
                    <div className="max-h-[360px] overflow-y-auto">
                        {notifications.length > 0 ? (
                            notifications.map((n, i) => (
                                <div key={n.id || i} className="p-4 hover:bg-slate-800/60 border-b border-slate-800/50 transition-colors flex gap-3 group">
                                    <div className="mt-1">{getIcon(n.type)}</div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{n.device_name}</span>
                                            <span className="text-[9px] text-slate-600 font-medium">
                                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{n.message}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-10 text-center space-y-3">
                                <div className="inline-block p-4 bg-slate-800/50 rounded-full text-slate-600">
                                    <Bell className="w-8 h-8 opacity-20" />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">All Quiet in the Fleet</p>
                            </div>
                        )}
                    </div>
                    <div className="p-3 bg-slate-800/30 text-center">
                        <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Real-time monitoring active</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
