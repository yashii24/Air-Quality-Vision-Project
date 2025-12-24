// src/components/Forecast.jsx
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import api from "../services/api";

export default function Forecast({ station }) {
  const [forecast, setForecast] = useState([]);

  useEffect(() => {
    if (!station) return;

    const fetchForecast = async () => {
      try {
        const res = await api.post("/api/forecast", {
          station,
          hours: 72,
        });

        setForecast(res.data.forecast || []);
      } catch (err) {
        console.error("Forecast fetch error:", err);
      }
    };

    fetchForecast();
  }, [station]);

  return (
    <div className="p-4 bg-white rounded-lg shadow-lg border border-gray-200 mt-6">
      <h2 className="text-xl font-semibold mb-4">
        PM2.5 Forecast for {station}
      </h2>

      {forecast.length > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={forecast.map((f) => ({
              Timestamp: f.Timestamp,
              PM25: f.PM25,
            }))}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="Timestamp"
              tickFormatter={(ts) =>
                new Date(ts).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              }
            />
            <YAxis />
            <Tooltip
              labelFormatter={(ts) => new Date(ts).toLocaleString()}
              formatter={(value) =>
                value !== null
                  ? [`${value.toFixed(2)} µg/m³`, "PM2.5"]
                  : ["N/A", "PM2.5"]
              }
            />
            <Line
              type="monotone"
              dataKey="PM25"
              stroke="#ff4d4f"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      <div className="mt-4 flex overflow-x-auto space-x-3 pb-2">
        {forecast.map((f, i) => {
          if (f.PM25 == null) return null;
          const dateObj = new Date(f.Timestamp);

          let category = "Good";

          if (f.PM25 > 250) category = "Severe";
          else if (f.PM25 > 120) category = "Very Poor";
          else if (f.PM25 > 90) category = "Poor";
          else if (f.PM25 > 60) category = "Moderate";
          else if (f.PM25 > 30) category = "Satisfactory";
          else category = "Good";

          const colors = {
            Good: "#76C779",          // light green
            Satisfactory: "#FFDE59",  // yellow
            Moderate: "#FF8C42",      // orange
            Poor: "#E53935",          // red
            "Very Poor": "#8E24AA",   // purple
            Severe: "#7E0023",        // maroon
          };

          return (
            <div
              key={i}
              className="min-w-[100px] p-3 rounded-xl shadow-lg text-white flex flex-col items-center justify-between"
              style={{ backgroundColor: colors[category] }}
            >
              <div className="text-xs">
                {dateObj.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div className="text-sm font-semibold">
                {dateObj.getHours()}:00
              </div>
              <div className="text-lg font-bold">
                {f.PM25.toFixed(1)}
              </div>
              <div className="text-xs mt-1">{category}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
