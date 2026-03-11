import React, { useEffect, useState } from 'react';
import { fetchNotifications, NotificationItem, subscribeToStream } from '../api';
import { Bell, AlertTriangle, Battery, WifiOff, X, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface NotificationsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ isOpen, onClose }) => {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            loadNotifications();
        }
    }, [isOpen]);

    useEffect(() => {
        const cleanup = subscribeToStream(() => { }, undefined, (event) => {
            // event here is the notification payload
            const newNotif: NotificationItem = {
                id: Date.now(), // Fallback for live event
                device_id: (event as any).device_id,
                device_name: (event as any).device_name,
                type: (event as any).notification_type || (event as any).type,
                message: (event as any).message,
                status: 'new',
                created_at: (event as any).created_at
            };
            setNotifications(prev => [newNotif, ...prev].slice(0, 50));
        });
        return cleanup;
    }, []);

    const loadNotifications = async () => {
        try {
            const data = await fetchNotifications();
            setNotifications(data);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-80 bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-lg font-semibold text-white">Notifications</h2>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                        <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No notifications yet</p>
                    </div>
                ) : (
                    notifications.map((notif) => (
                        <div key={notif.id} className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors">
                            <div className="flex gap-3">
                                <div className={`p-2 rounded-lg shrink-0 ${notif.type === 'ai_anomaly' ? 'bg-red-500/20 text-red-500' :
                                    notif.type === 'device_offline' ? 'bg-orange-500/20 text-orange-400' :
                                        'bg-yellow-500/20 text-yellow-500'
                                    }`}>
                                    {notif.type === 'ai_anomaly' && <AlertTriangle className="w-4 h-4" />}
                                    {notif.type === 'device_offline' && <WifiOff className="w-4 h-4" />}
                                    {notif.type === 'low_battery' && <Battery className="w-4 h-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="text-xs font-bold text-white uppercase tracking-wider">{notif.device_name}</span>
                                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-300 leading-tight">{notif.message}</p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NotificationsPanel;
