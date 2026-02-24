"use client";

import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { AxisScore } from "@/types";

interface RadarChartProps {
  axisScores: Record<string, AxisScore>;
  maxLevel?: number;
}

const axisLabels: Record<string, string> = {
  Craft: "Craft",
  Impact: "Impact",
  Leadership: "Leadership",
};

export default function RadarChartComponent({
  axisScores,
  maxLevel = 5,
}: RadarChartProps) {
  const data = Object.values(axisScores).map((score) => ({
    axis: axisLabels[score.axis] ?? score.axis,
    value: score.scoreFloat,
    level: score.level,
    fullMark: maxLevel,
  }));

  if (data.length === 0) return null;

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
          <Radar
            name="Уровень"
            dataKey="value"
            stroke="#4c6ef5"
            fill="#4c6ef5"
            fillOpacity={0.2}
            strokeWidth={2}
          />
          <Tooltip
            formatter={(value: number) => [value.toFixed(2), "Балл"]}
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
