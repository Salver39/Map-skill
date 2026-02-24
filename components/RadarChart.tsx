"use client";

import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import type { AxisScore, AssessorRole } from "@/types";
import { getRoleInfo } from "@/types";

export interface RadarDataset {
  role: AssessorRole;
  label: string;
  axisScores: Record<string, AxisScore>;
  color: string;
}

interface RadarChartProps {
  datasets: RadarDataset[];
  maxLevel?: number;
}

export default function RadarChartComponent({
  datasets,
  maxLevel = 5,
}: RadarChartProps) {
  if (datasets.length === 0) return null;

  const allAxes = new Set<string>();
  for (const ds of datasets) {
    for (const key of Object.keys(ds.axisScores)) {
      allAxes.add(key);
    }
  }

  const axes = Array.from(allAxes);

  const data = axes.map((axis) => {
    const point: Record<string, string | number> = { axis };
    for (const ds of datasets) {
      point[ds.role] = ds.axisScores[axis]?.scoreFloat ?? 0;
    }
    point.fullMark = maxLevel;
    return point;
  });

  return (
    <div className="w-full h-[320px] sm:h-[380px]">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: "#374151", fontSize: 14, fontWeight: 600 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, maxLevel]}
            tickCount={maxLevel + 1}
            tick={{ fill: "#9ca3af", fontSize: 11 }}
          />
          {datasets.map((ds) => (
            <Radar
              key={ds.role}
              name={ds.label}
              dataKey={ds.role}
              stroke={ds.color}
              fill={ds.color}
              fillOpacity={datasets.length > 1 ? 0.1 : 0.2}
              strokeWidth={2}
            />
          ))}
          <Tooltip
            formatter={(value: number, name: string) => {
              const role = name as AssessorRole;
              const info = getRoleInfo(role);
              return [value.toFixed(2), info.name];
            }}
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
          />
          {datasets.length > 1 && (
            <Legend
              formatter={(value: string) => {
                const ds = datasets.find((d) => d.role === value);
                return ds?.label ?? value;
              }}
            />
          )}
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
