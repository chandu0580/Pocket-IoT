import React, { useMemo } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  CartesianGrid
} from "recharts";
import type { SensorReading } from "../api";

interface Props {
  sensorData: SensorReading[];
}

const AccelerometerChart: React.FC<Props> = ({ sensorData }) => {
  const chartData = useMemo(
    () =>
      sensorData.map((item) => ({
        ...item,
        timeLabel: new Date(item.timestamp).toLocaleTimeString()
      })),
    [sensorData]
  );

  return (
    <div className="card h-full">
      <h2 className="card-title">Live Accelerometer (x, y, z)</h2>
      {chartData.length === 0 ? (
        <p className="text-sm text-slate-500">
          No sensor data yet. Start the simulator to see live data.
        </p>
      ) : (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis dataKey="timeLabel" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#020617",
                  borderColor: "#1e293b",
                  fontSize: 12
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="x"
                stroke="#38bdf8"
                dot={false}
                name="X"
              />
              <Line
                type="monotone"
                dataKey="y"
                stroke="#22c55e"
                dot={false}
                name="Y"
              />
              <Line
                type="monotone"
                dataKey="z"
                stroke="#facc15"
                dot={false}
                name="Z"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default AccelerometerChart;

