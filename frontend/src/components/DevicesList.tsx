import React from "react";
import type { Device } from "../api";

interface Props {
  devices: Device[];
}

const DevicesList: React.FC<Props> = ({ devices }) => {
  return (
    <div className="card h-full">
      <h2 className="card-title">Devices</h2>
      {devices.length === 0 ? (
        <p className="text-sm text-slate-500">No devices registered.</p>
      ) : (
        <ul className="space-y-2">
          {devices.map((device) => (
            <li
              key={device.id}
              className="flex items-center justify-between rounded-lg bg-slate-900/80 px-3 py-2 text-sm"
            >
              <div>
                <div className="font-medium text-slate-100">
                  {device.name} (ID {device.id})
                </div>
                <div className="font-mono text-xs text-slate-500">
                  token: {device.device_token}
                </div>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_12px_#22c55e]" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DevicesList;

