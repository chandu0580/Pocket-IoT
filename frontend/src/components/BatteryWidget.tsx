import React from "react";

interface Props {
    battery: number | null;
    deviceName: string;
}

const BatteryWidget: React.FC<Props> = ({ battery, deviceName }) => {
    const bat = battery ?? 0;
    const batClass = battery === null ? "" : bat > 50 ? "battery-high" : bat > 20 ? "battery-mid" : "battery-low";
    const textColor = bat > 50 ? "text-emerald-400" : bat > 20 ? "text-amber-400" : "text-red-400";

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs">
                <span className="text-slate-300 truncate max-w-[120px]">{deviceName}</span>
                <span className={`font-bold ${textColor}`}>
                    {battery !== null ? `${bat.toFixed(0)}%` : "—"}
                </span>
            </div>
            <div className="battery-track">
                <div
                    className={`battery-fill ${batClass}`}
                    style={{ width: `${Math.max(0, Math.min(100, bat))}%` }}
                />
            </div>
        </div>
    );
};

export default BatteryWidget;
