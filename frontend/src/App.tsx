import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { subscribeToStream, StreamSensorEvent, fetchDevices, fetchStats, Device, Stats, fetchAlerts, AlertItem, DeviceGroup, fetchGroups, fetchMe, Organization, User } from "./api";

import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Devices from "./pages/Devices";
import DeviceDetail from "./pages/DeviceDetail";
import AlertsPage from "./pages/Alerts";
import MapView from "./pages/MapView";
import Analytics from "./pages/Analytics";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import AlertToast, { ToastAlert } from "./components/AlertToast";
import TeamsPage from "./pages/Teams";
import UsersPage from "./pages/Users";
import SettingsPage from "./pages/Settings";
import NotificationsPage from "./pages/Notifications";
import NotificationBell from "./components/NotificationBell";

// ─── Global Stream Context ────────────────────────────────────────────────────
export interface AppContextType {
  devices: Device[];
  groups: DeviceGroup[];
  stats: Stats | null;
  streamReadings: StreamSensorEvent[];
  recentAlerts: AlertItem[];
  sseConnected: boolean;
  refreshDevices: () => void;
  refreshGroups: () => void;
  activeUser: User | null;
  activeOrg: Organization | null;
}

export const AppContext = createContext<AppContextType>({
  devices: [], groups: [], stats: null, streamReadings: [],
  recentAlerts: [], sseConnected: false, refreshDevices: () => { }, refreshGroups: () => { },
  activeUser: null, activeOrg: null
});

export const useAppContext = () => useContext(AppContext);

// ─── Shell (defined OUTSIDE App to prevent remounting on every App re-render) ─
interface ShellProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
  sseConnected: boolean;
  isNotifOpen: boolean;
  setIsNotifOpen: (v: boolean) => void;
  hasNewNotif: boolean;
  setHasNewNotif: (v: boolean) => void;
  toastAlerts: ToastAlert[];
  dismissToast: (id: string) => void;
  lastSseNotif: any;
  activeOrg: Organization | null;
}

const Shell: React.FC<ShellProps> = ({
  children,
  isAuthenticated,
  sseConnected,
  isNotifOpen,
  setIsNotifOpen,
  toastAlerts,
  dismissToast,
  lastSseNotif,
  activeOrg
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden relative">
      <Sidebar sseConnected={sseConnected} />
      <main className="flex-1 overflow-y-auto p-0 relative">
        {/* Top Header */}
        <div className="absolute top-4 right-8 z-40 flex items-center gap-4">
          {activeOrg && (
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{activeOrg.name}</span>
              <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest">{activeOrg.plan} WORKSPACE</span>
            </div>
          )}
          <NotificationBell sseNotif={lastSseNotif} />

          <div className="relative">
            <div
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 font-black text-xs hover:text-white cursor-pointer transition-colors shadow-xl"
            >
              👤
            </div>

            {isProfileOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsProfileOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl z-50 overflow-hidden py-1">
                  <div className="px-4 py-3 border-b border-slate-700/50">
                    <p className="text-sm text-white font-medium">Account</p>
                  </div>
                  <button
                    onClick={() => { setIsProfileOpen(false); window.location.href = '/settings'; }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => { setIsProfileOpen(false); window.location.href = '/settings'; }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
                  >
                    Settings
                  </button>
                  <div className="h-px bg-slate-700/50 my-1"></div>
                  <button
                    onClick={() => {
                      localStorage.removeItem("token");
                      window.location.href = "/login";
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-slate-700/50 hover:text-red-300 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {children}

        <AlertToast alerts={toastAlerts} onDismiss={dismissToast} />
      </main>
    </div>
  );
};

// ─── App ─────────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [streamReadings, setStream] = useState<StreamSensorEvent[]>([]);
  const [recentAlerts, setAlerts] = useState<AlertItem[]>([]);
  const [sseConnected, setSseConnected] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);
  const sseBufferRef = useRef<StreamSensorEvent[]>([]);

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [hasNewNotif, setHasNewNotif] = useState(false);
  const [toastAlerts, setToastAlerts] = useState<ToastAlert[]>([]);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [lastSseNotif, setLastSseNotif] = useState<any>(null);

  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("token"));

  useEffect(() => {
    const handleStorage = () => setIsAuthenticated(!!localStorage.getItem("token"));
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToastAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const refreshDevices = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [d, s, a] = await Promise.all([fetchDevices(), fetchStats(), fetchAlerts(50)]);
      setDevices(d);
      setStats(s);
      setAlerts(a);
    } catch (_) { }
  }, [isAuthenticated]);

  const refreshGroups = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const g = await fetchGroups();
      setGroups(g);
    } catch (_) { }
  }, [isAuthenticated]);

  // Initial load + polling for device list (SSE handles sensor updates)
  useEffect(() => {
    if (isAuthenticated) {
      void fetchMe().then(u => {
        setActiveUser(u);
        if (u.organization) setActiveOrg(u.organization);
      }).catch(() => { });

      void refreshDevices();
      void refreshGroups();
      // Poll every 15s as a safety net (SSE is the primary update mechanism)
      const h = window.setInterval(refreshDevices, 15_000);
      const gh = window.setInterval(refreshGroups, 30_000);
      return () => {
        window.clearInterval(h);
        window.clearInterval(gh);
      };
    }
  }, [refreshDevices, refreshGroups, isAuthenticated]);

  // SSE subscription
  useEffect(() => {
    if (!isAuthenticated) return;

    let statsCounter = 0;
    // Flush buffer to React state every 100ms for smooth UI/3D updates
    const flushHandle = window.setInterval(() => {
      const buf = sseBufferRef.current;
      if (buf.length === 0) return;
      const itemsToFlush = [...buf];
      sseBufferRef.current = [];
      setStream((prev) => {
        const next = [...prev, ...itemsToFlush];
        return next.length > 200 ? next.slice(-200) : next;
      });
      statsCounter += 100;
      if (statsCounter >= 5000) {
        statsCounter = 0;
        void fetchStats().then(setStats).catch(() => { });
      }
    }, 100);

    const unsub = subscribeToStream(
      (ev) => {
        // Multi-tenant check
        if (activeUser && ev.organization_id && ev.organization_id !== activeUser.organization_id) return;

        sseBufferRef.current.push(ev);

        // Check if this device already exists in the list
        setDevices(prev => {
          const exists = prev.find(d => d.id === ev.device_id);
          if (!exists) {
            // New device appeared via telemetry — refresh device list
            void refreshDevices();
            return prev;
          }
          // Patch existing device telemetry fields in real time
          return prev.map(d =>
            d.id === ev.device_id
              ? {
                ...d,
                status: 'online' as const,
                battery: ev.battery ?? d.battery,
                motion_magnitude: ev.motion_magnitude ?? d.motion_magnitude,
                latitude: ev.latitude ?? d.latitude,
                longitude: ev.longitude ?? d.longitude,
                last_seen: ev.timestamp ?? d.last_seen,
              }
              : d
          );
        });
      },
      (anomaly) => {
        if (activeUser && anomaly.organization_id && anomaly.organization_id !== activeUser.organization_id) return;
        console.warn("⚠️ AI Anomaly Detected!", anomaly);
        const newToast: ToastAlert = {
          id: Math.random().toString(36).substring(7),
          device: anomaly.device_name || `Device ${anomaly.device_id}`,
          magnitude: anomaly.magnitude || 0,
          timestamp: Date.now(),
        };
        setToastAlerts(prev => [...prev.slice(-4), newToast]);
        void refreshDevices();
      },
      (notif) => {
        if (activeUser && notif.organization_id && notif.organization_id !== activeUser.organization_id) return;
        setLastSseNotif(notif);
        setHasNewNotif(true);
      },
      () => setSseConnected(true),
      (delEv) => {
        setDevices(prev => prev.filter(d => d.id !== delEv.device_id));
        setStream(prev => prev.filter(r => r.device_id !== delEv.device_id));
      },
      (statusEv) => {
        setDevices(prev => prev.map(d =>
          d.id === statusEv.device_id
            ? { ...d, status: statusEv.status as any, last_seen: statusEv.last_seen }
            : d
        ));
      },
      (groupEv) => {
        setDevices(prev => prev.map(d =>
          d.id === groupEv.device_id
            ? { ...d, group_id: groupEv.group_id, group_name: groupEv.group_name }
            : d
        ));
      },
      (regEv) => {
        // A new device just paired! Immediately refresh the list.
        console.log("🆕 Device registered via QR:", regEv);
        void refreshDevices();
        // Show toast notification
        const newToast: ToastAlert = {
          id: `reg-${regEv.device_id}`,
          device: `New device #${regEv.device_id}`,
          magnitude: 0,
          timestamp: Date.now(),
        };
        setToastAlerts(prev => [...prev.slice(-4), newToast]);
      }
    );


    unsubRef.current = unsub;
    return () => {
      unsub();
      window.clearInterval(flushHandle);
    };
  }, [isAuthenticated]);

  return (
    <AppContext.Provider value={{ devices, groups, stats, streamReadings, recentAlerts, sseConnected, refreshDevices, refreshGroups, activeUser, activeOrg }}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={
            <Shell isAuthenticated={isAuthenticated} sseConnected={sseConnected} isNotifOpen={isNotifOpen} setIsNotifOpen={setIsNotifOpen} hasNewNotif={hasNewNotif} setHasNewNotif={setHasNewNotif} toastAlerts={toastAlerts} dismissToast={dismissToast} lastSseNotif={lastSseNotif} activeOrg={activeOrg}>
              <Dashboard />
            </Shell>
          } />
          <Route path="/devices" element={
            <Shell isAuthenticated={isAuthenticated} sseConnected={sseConnected} isNotifOpen={isNotifOpen} setIsNotifOpen={setIsNotifOpen} hasNewNotif={hasNewNotif} setHasNewNotif={setHasNewNotif} toastAlerts={toastAlerts} dismissToast={dismissToast} lastSseNotif={lastSseNotif} activeOrg={activeOrg}>
              <Devices />
            </Shell>
          } />
          <Route path="/devices/:id" element={
            <Shell isAuthenticated={isAuthenticated} sseConnected={sseConnected} isNotifOpen={isNotifOpen} setIsNotifOpen={setIsNotifOpen} hasNewNotif={hasNewNotif} setHasNewNotif={setHasNewNotif} toastAlerts={toastAlerts} dismissToast={dismissToast} lastSseNotif={lastSseNotif} activeOrg={activeOrg}>
              <DeviceDetail />
            </Shell>
          } />
          <Route path="/alerts" element={
            <Shell isAuthenticated={isAuthenticated} sseConnected={sseConnected} isNotifOpen={isNotifOpen} setIsNotifOpen={setIsNotifOpen} hasNewNotif={hasNewNotif} setHasNewNotif={setHasNewNotif} toastAlerts={toastAlerts} dismissToast={dismissToast} lastSseNotif={lastSseNotif} activeOrg={activeOrg}>
              <AlertsPage />
            </Shell>
          } />
          <Route path="/notifications" element={
            <Shell isAuthenticated={isAuthenticated} sseConnected={sseConnected} isNotifOpen={isNotifOpen} setIsNotifOpen={setIsNotifOpen} hasNewNotif={hasNewNotif} setHasNewNotif={setHasNewNotif} toastAlerts={toastAlerts} dismissToast={dismissToast} lastSseNotif={lastSseNotif} activeOrg={activeOrg}>
              <NotificationsPage />
            </Shell>
          } />
          <Route path="/map" element={
            <Shell isAuthenticated={isAuthenticated} sseConnected={sseConnected} isNotifOpen={isNotifOpen} setIsNotifOpen={setIsNotifOpen} hasNewNotif={hasNewNotif} setHasNewNotif={setHasNewNotif} toastAlerts={toastAlerts} dismissToast={dismissToast} lastSseNotif={lastSseNotif} activeOrg={activeOrg}>
              <MapView />
            </Shell>
          } />
          <Route path="/analytics" element={
            <Shell isAuthenticated={isAuthenticated} sseConnected={sseConnected} isNotifOpen={isNotifOpen} setIsNotifOpen={setIsNotifOpen} hasNewNotif={hasNewNotif} setHasNewNotif={setHasNewNotif} toastAlerts={toastAlerts} dismissToast={dismissToast} lastSseNotif={lastSseNotif} activeOrg={activeOrg}>
              <Analytics />
            </Shell>
          } />
          <Route path="/devices/:id/analytics" element={
            <Shell isAuthenticated={isAuthenticated} sseConnected={sseConnected} isNotifOpen={isNotifOpen} setIsNotifOpen={setIsNotifOpen} hasNewNotif={hasNewNotif} setHasNewNotif={setHasNewNotif} toastAlerts={toastAlerts} dismissToast={dismissToast} lastSseNotif={lastSseNotif} activeOrg={activeOrg}>
              <Analytics />
            </Shell>
          } />
          <Route path="/teams" element={
            <Shell isAuthenticated={isAuthenticated} sseConnected={sseConnected} isNotifOpen={isNotifOpen} setIsNotifOpen={setIsNotifOpen} hasNewNotif={hasNewNotif} setHasNewNotif={setHasNewNotif} toastAlerts={toastAlerts} dismissToast={dismissToast} lastSseNotif={lastSseNotif} activeOrg={activeOrg}>
              <TeamsPage />
            </Shell>
          } />
          <Route path="/users" element={
            <Shell isAuthenticated={isAuthenticated} sseConnected={sseConnected} isNotifOpen={isNotifOpen} setIsNotifOpen={setIsNotifOpen} hasNewNotif={hasNewNotif} setHasNewNotif={setHasNewNotif} toastAlerts={toastAlerts} dismissToast={dismissToast} lastSseNotif={lastSseNotif} activeOrg={activeOrg}>
              <UsersPage />
            </Shell>
          } />
          <Route path="/settings" element={
            <Shell isAuthenticated={isAuthenticated} sseConnected={sseConnected} isNotifOpen={isNotifOpen} setIsNotifOpen={setIsNotifOpen} hasNewNotif={hasNewNotif} setHasNewNotif={setHasNewNotif} toastAlerts={toastAlerts} dismissToast={dismissToast} lastSseNotif={lastSseNotif} activeOrg={activeOrg}>
              <SettingsPage />
            </Shell>
          } />
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
  );
};

export default App;
