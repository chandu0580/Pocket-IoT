import React, { useMemo } from "react";
import type { Device, SensorReading } from "../api";

interface Props {
  devices: Device[];
  sensorData: SensorReading[];
}

const BatteryStatus: React.FC<Props> = ({ devices, sensorData }) => {
  const latestByDevice = useMemo(() => {
    const map = new Map<number, SensorReading>();
    for (const item of sensorData) {
      const existing = map.get(item.device_id);
      if (!existing) {
        map.set(item.device_id, item);
      } else if (existing.timestamp < item.timestamp) {
        map.set(item.device_id, item);
      }
    }
    return map;
  }, [sensorData]);

  return (
    <div className="card">
      <h2 className="card-title">Battery Status</h2>
      {devices.length === 0 ? (
        <p className="text-sm text-slate-500">No devices to show.</p>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => {
            const latest = latestByDevice.get(device.id);
            const battery = latest ? latest.battery : null;
            const level = battery ?? 0;
            const colorClass =
              level > 50
                ? "bg-emerald-500"
                : level > 20
                  ? "bg-amber-400"
                  : "bg-red-500";

            return (
              <div key={device.id} className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-200">{device.name}</span>
                  <span className="text-xs text-slate-400">
                    {battery !== null
                      ? `${battery.toFixed(1)}%`
                      : "no data yet"}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800">
                  <div
                    className={`h-2 rounded-full ${colorClass}`}
                    style={{ width: `${Math.max(0, Math.min(100, level))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BatteryStatus;

