import { API_BASE_URL } from "./config";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Device {
  id: number;
  name: string;
  device_token: string;
  status: 'online' | 'offline' | 'active' | 'disabled';
  last_seen: string | null;
  created_at: string;
  group_id: number | null;
  group_name: string | null;
  latitude: number | null;
  longitude: number | null;
  battery: number | null;
  last_lat: number | null;
  last_lng: number | null;
  motion_magnitude: number | null;
  battery_health?: string;
  storage_usage?: number;
  network_strength?: string;
  os_info?: string;
}

export interface DeviceGroup {
  id: number;
  name: string;
  created_at: string;
}

export interface SensorReading {
  id: number;
  device_id: number;
  x: number;
  y: number;
  z: number;
  gyro_x?: number;
  gyro_y?: number;
  gyro_z?: number;
  pitch?: number;
  roll?: number;
  yaw?: number;
  battery: number;
  latitude: number | null;
  longitude: number | null;
  speed?: number;
  ambient_light?: number;
  noise_level?: number;
  pressure?: number;
  motion_magnitude: number;
  anomaly_score: number;
  is_anomaly: boolean;
  timestamp: string;
}

export interface AlertRule {
  id: number;
  device_id: number | null;
  sensor_type: string;
  operator: string;
  threshold: number;
  is_enabled: boolean;
  required_samples: number;
  current_samples: number;
}

export interface AlertItem {
  id: number;
  device_id: number;
  device?: string;
  device_name?: string;
  type: string;
  message: string;
  severity?: string;
  magnitude?: number;
  status?: string;
  timestamp?: string; // from backend API alias
  created_at?: string; // fallback if needed
}

export interface Stats {
  total_devices: number;
  online_devices: number;
  data_points_today: number;
  active_alerts: number;
}

export interface Organization {
  id: number;
  name: string;
  plan: string;
  created_at: string;
  user_count?: number;
  device_count?: number;
}

export interface User {
  id: number;
  email: string;
  role: 'admin' | 'manager' | 'viewer';
  organization_id: number;
  created_at: string;
  organization?: Organization;
}

export interface Team {
  id: number;
  name: string;
  organization_id: number;
  created_at: string;
  member_count?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: getAuthHeader()
  });
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem("token");
    if (!window.location.pathname.includes("/login")) {
      window.dispatchEvent(new Event('storage'));
    }
  }
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export const login = (email: string, password: string) =>
  fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");
    localStorage.setItem("token", data.token);
    return data;
  });

export const logout = () => {
  localStorage.removeItem("token");
  window.dispatchEvent(new Event('storage'));
};

export const fetchMe = () => get<User>("/api/auth/me");

export interface NotificationItem {
  id: number;
  device_id: number;
  device_name: string;
  type: string;
  message: string;
  status: string;
  created_at: string;
}

export const fetchNotifications = (limit = 50, offset = 0) =>
  get<NotificationItem[]>(`/api/notifications?limit=${limit}&offset=${offset}`);

export const fetchAIInsights = () =>
  get<{
    anomalies_today: number;
    most_active_device: string;
    highest_motion_spike: number;
    average_magnitude: number;
  }>("/api/ai/insights");

export const fetchDeviceLocations = () =>
  get<{
    device_id: number;
    name: string;
    status: string;
    latitude: number;
    longitude: number;
    battery: number;
    magnitude: number;
    speed: number;
    noise_level: number;
    last_seen: string;
    alert_count: number;
    group_id: number | null;
    group_name: string | null;
  }[]>("/api/devices/locations");

// ─── REST Calls ──────────────────────────────────────────────────────────────

export const fetchDevices = () =>
  get<{ devices: Device[] }>("/api/devices").then((d) => d.devices);

export const fetchSensorData = (limit = 200, deviceId?: number) =>
  get<{ sensor_data: SensorReading[] }>(
    `/api/sensor-data?limit=${limit}${deviceId !== undefined ? `&device_id=${deviceId}` : ""}`
  ).then((d) => d.sensor_data);

export const fetchAlerts = (limit = 100, deviceId?: number) =>
  get<{ alerts: AlertItem[] }>(
    `/api/alerts?limit=${limit}${deviceId !== undefined ? `&device_id=${deviceId}` : ""}`
  ).then((d) => d.alerts);

export const fetchAnalytics = (metric: string, range: string, deviceId?: number | null) =>
  get<{ timestamp: string; value: number }[]>(
    `/api/analytics/${metric}?range=${range}${deviceId ? `&device_id=${deviceId}` : ""}`
  );

export const fetchStats = () => get<Stats>("/api/stats");

export const clearAlerts = (deviceId?: number) =>
  fetch(`${API_BASE_URL}/api/alerts${deviceId !== undefined ? `?device_id=${deviceId}` : ""}`, {
    method: "DELETE",
    headers: getAuthHeader(),
  }).then((res) => res.json());

export const postCommand = (deviceId: number, command: string, payload: any = {}) =>
  fetch(`${API_BASE_URL}/api/devices/${deviceId}/command`, {
    method: "POST",
    headers: getAuthHeader(),
    body: JSON.stringify({ command, payload }),
  }).then((res) => {
    if (!res.ok) throw new Error(`Command failed: ${res.status}`);
    return res.json();
  });

export const sendCommand = postCommand;

export const fetchLatestSnapshot = (deviceId: number) =>
  get<{ id: number; device_id: number; image_base64: string; timestamp: string }>(
    `/api/devices/${deviceId}/snapshot`
  );

export const fetchSnapshots = (deviceId: number) =>
  get<{ id: number; image_base64: string; image_base64_full?: string; timestamp: string }[]>(
    `/api/devices/${deviceId}/snapshots`
  );

export const fetchAlertRules = (deviceId: number) =>
  get<{ rules: AlertRule[] }>(`/api/devices/${deviceId}/rules`).then((d) => d.rules);

export const createAlertRule = (deviceId: number, rule: Omit<AlertRule, 'id' | 'device_id' | 'is_enabled' | 'current_samples'>) =>
  fetch(`${API_BASE_URL}/api/devices/${deviceId}/rules`, {
    method: "POST",
    headers: getAuthHeader(),
    body: JSON.stringify(rule),
  }).then((res) => res.json());

export const fetchHistory = (deviceId: number | null, range = "24h") =>
  get<{ sensor_data: SensorReading[] }>(
    `/api/sensor-data/history?range=${range}${deviceId ? `&device_id=${deviceId}` : ""}`
  ).then((d) => d.sensor_data);

export const updateDevice = (deviceId: number, fields: Partial<Device>) =>
  fetch(`${API_BASE_URL}/api/devices/${deviceId}`, {
    method: "PATCH",
    headers: getAuthHeader(),
    body: JSON.stringify(fields),
  }).then((res) => res.json());

export const deleteDevice = (deviceId: number) =>
  fetch(`${API_BASE_URL}/api/devices/${deviceId}`, {
    method: "DELETE",
    headers: getAuthHeader()
  }).then((res) => res.json());

// ─── Group Endpoints ────────────────────────────────────────────────────────

export const fetchGroups = () => get<DeviceGroup[]>("/api/groups");

export const createGroup = (name: string) =>
  fetch(`${API_BASE_URL}/api/groups`, {
    method: "POST",
    headers: getAuthHeader(),
    body: JSON.stringify({ name }),
  }).then((res) => res.json());

export const assignDeviceGroup = (deviceId: number, groupId: number | null) =>
  fetch(`${API_BASE_URL}/api/devices/${deviceId}/group`, {
    method: "POST",
    headers: getAuthHeader(),
    body: JSON.stringify({ group_id: groupId }),
  }).then((res) => res.json());

export const fetchGroupDevices = (groupId: number) =>
  get<{ devices: Device[] }>(`/api/groups/${groupId}/devices`).then((d) => d.devices);

// ─── SaaS Endpoints ─────────────────────────────────────────────────────────

export const fetchOrganizations = () => get<Organization[]>("/api/organizations");
export const fetchOrgSettings = () => get<Organization>("/api/organization/settings");
export const createOrganization = (name: string, plan = "Free") =>
  fetch(`${API_BASE_URL}/api/organizations`, {
    method: "POST",
    headers: getAuthHeader(),
    body: JSON.stringify({ name, plan }),
  }).then((res) => res.json());

export const fetchUsers = () => get<User[]>("/api/users");

// ─── QR Pairing ──────────────────────────────────────────────────────────────

export interface PairTokenResponse {
  pair_token: string;
  pair_url: string;
  expires_in: number;
}

export interface PairDeviceResponse {
  device_id: number;
  api_key: string;
  device_name: string;
  status: string;
}

export const createPairToken = () =>
  fetch(`${API_BASE_URL}/api/device/pair-token`, {
    method: "POST",
    headers: getAuthHeader(),
  }).then(async (res) => {
    if (!res.ok) throw new Error(`pair-token → HTTP ${res.status}`);
    return res.json() as Promise<PairTokenResponse>;
  });

export const pairDevice = (pair_token: string) =>
  fetch(`${API_BASE_URL}/api/device/pair`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pair_token }),
  }).then(async (res) => {
    if (!res.ok) throw new Error(`pair → HTTP ${res.status}`);
    return res.json() as Promise<PairDeviceResponse>;
  });


export const inviteUser = (email: string, role: string) =>
  fetch(`${API_BASE_URL}/api/users/invite`, {
    method: "POST",
    headers: getAuthHeader(),
    body: JSON.stringify({ email, role }),
  }).then((res) => res.json());

export const fetchTeams = () => get<Team[]>("/api/teams");
export const createTeam = (name: string) =>
  fetch(`${API_BASE_URL}/api/teams`, {
    method: "POST",
    headers: getAuthHeader(),
    body: JSON.stringify({ name }),
  }).then((res) => res.json());

export const addTeamMember = (teamId: number, userId: number) =>
  fetch(`${API_BASE_URL}/api/teams/${teamId}/members`, {
    method: "POST",
    headers: getAuthHeader(),
    body: JSON.stringify({ user_id: userId }),
  }).then((res) => res.json());

// ─── SSE Subscription ────────────────────────────────────────────────────────

export interface StreamSensorEvent extends Omit<SensorReading, 'id'> {
  device_name: string;
  organization_id: number;
  sensor_data_id: number;
  alerts?: AlertItem[];
}

export interface AnomalyEvent {
  device_id: number;
  organization_id: number;
  device_name: string;
  magnitude: number;
  score: number;
}

export function subscribeToStream(
  onSensorData: (e: StreamSensorEvent) => void,
  onAnomalyDetected?: (e: AnomalyEvent) => void,
  onNotification?: (e: any) => void,
  onConnected?: () => void,
  onDeviceDeleted?: (e: { device_id: number }) => void,
  onStatusChange?: (e: { device_id: number, status: string, last_seen: string }) => void,
  onGroupChange?: (e: { device_id: number, group_id: number | null, group_name: string | null }) => void,
  onDeviceRegistered?: (e: { device_id: number, organization_id?: number }) => void
): () => void {
  const token = localStorage.getItem("token");
  const url = token ? `${API_BASE_URL}/api/stream?token=${token}` : `${API_BASE_URL}/api/stream`;
  const es = new EventSource(url);

  es.addEventListener("sensor_data_received", (ev: MessageEvent) => {
    try {
      onSensorData(JSON.parse(ev.data) as StreamSensorEvent);
    } catch (_) { }
  });

  es.addEventListener("ai_anomaly_detected", (ev: MessageEvent) => {
    try {
      onAnomalyDetected?.(JSON.parse(ev.data) as AnomalyEvent);
    } catch (_) { }
  });

  es.addEventListener("notification", (ev: MessageEvent) => {
    try {
      onNotification?.(JSON.parse(ev.data));
    } catch (_) { }
  });

  es.addEventListener("notification_created", (ev: MessageEvent) => {
    try {
      onNotification?.(JSON.parse(ev.data));
    } catch (_) { }
  });

  es.addEventListener("command_executed", (ev: MessageEvent) => {
    try {
      const data = JSON.parse(ev.data);
      // console.log("⚡ Command result from mobile:", data);
    } catch (_) { }
  });

  es.addEventListener("device_registered", (ev: MessageEvent) => {
    // Dispatch a DOM event so QRPairModal can react instantly
    try {
      const data = ev.data ? JSON.parse(ev.data) : {};
      onDeviceRegistered?.(data);
      window.dispatchEvent(new CustomEvent("pocketiot:device_registered", { detail: data }));
    } catch (_) {
      onDeviceRegistered?.({ device_id: 0 });
      window.dispatchEvent(new CustomEvent("pocketiot:device_registered", { detail: {} }));
    }
  });


  es.addEventListener("device_status_changed", (ev: MessageEvent) => {
    try {
      const data = JSON.parse(ev.data);
      onStatusChange?.(data);
    } catch (_) { }
  });

  es.addEventListener("device_update", (ev: MessageEvent) => {
    try {
      const data = JSON.parse(ev.data);
      onStatusChange?.({
        device_id: data.id || data.device_id,
        status: data.status,
        last_seen: data.last_seen
      });
    } catch (_) { }
  });

  es.addEventListener("device_deleted", (ev: MessageEvent) => {
    try {
      const data = JSON.parse(ev.data);
      if (onDeviceDeleted) onDeviceDeleted(data);
    } catch (_) { }
  });

  es.addEventListener("device_group_update", (ev: MessageEvent) => {
    try {
      const data = JSON.parse(ev.data);
      if (onGroupChange) onGroupChange(data);
    } catch (_) { }
  });

  es.onopen = () => onConnected?.();
  es.onerror = () => {
    // EventSource auto-reconnects
  };

  return () => es.close();
}

// ─── Utilities ───────────────────────────────────────────────────────────────

export function isOnline(device: Device): boolean {
  if (device.status === 'online') return true;
  if (device.status === 'offline') return false;
  if (!device.last_seen) return false;
  try {
    const ls = new Date(device.last_seen);
    return (Date.now() - ls.getTime()) < 120_000;
  } catch {
    return false;
  }
}
