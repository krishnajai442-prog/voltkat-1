"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#2563ff", "#7c3aed", "#10b981", "#f59e0b", "#ef4444", "#64748b"];

export function RevenueChart({
  data,
}: {
  data: { date: string; revenue: number; orders: number }[];
}) {
  return (
    <div className="card p-4">
      <h2 className="mb-4 font-display text-[15px] font-bold text-ink-900">
        Revenue trend
      </h2>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563ff" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#2563ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6eaf3" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7385" }} />
            <YAxis tick={{ fontSize: 11, fill: "#6b7385" }} />
            <Tooltip
              formatter={(value: number, name: string) =>
                name === "revenue"
                  ? [`₹${value.toLocaleString("en-IN")}`, "Revenue"]
                  : [value, "Orders"]
              }
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#2563ff"
              fill="url(#rev)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function OrderStatusChart({
  data,
}: {
  data: { status: string; count: number }[];
}) {
  return (
    <div className="card p-4">
      <h2 className="mb-4 font-display text-[15px] font-bold text-ink-900">
        Orders by status
      </h2>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6eaf3" />
            <XAxis dataKey="status" tick={{ fontSize: 10, fill: "#6b7385" }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6b7385" }} />
            <Tooltip />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={entry.status} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}