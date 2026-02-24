"use client";

import type { CompetencyResult } from "@/types";

interface CompetencyTableProps {
  results: CompetencyResult[];
}

const axisColors: Record<string, string> = {
  Craft: "bg-blue-100 text-blue-700",
  Impact: "bg-emerald-100 text-emerald-700",
  Leadership: "bg-purple-100 text-purple-700",
};

export default function CompetencyTable({ results }: CompetencyTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 font-semibold text-gray-700">
              Компетенция
            </th>
            <th className="text-center px-3 py-3 font-semibold text-gray-700">
              Ось
            </th>
            <th className="text-center px-3 py-3 font-semibold text-gray-700">
              Уровень
            </th>
            <th className="text-center px-3 py-3 font-semibold text-gray-700">
              Gap
            </th>
            <th className="text-center px-3 py-3 font-semibold text-gray-700">
              Без ответа
            </th>
          </tr>
        </thead>
        <tbody>
          {results.map((cr) => (
            <tr
              key={cr.competencyId}
              className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors"
            >
              <td className="px-4 py-3 text-gray-800 font-medium">
                {cr.competencyName}
              </td>
              <td className="px-3 py-3 text-center">
                <span
                  className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    axisColors[cr.axis] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {cr.axis}
                </span>
              </td>
              <td className="px-3 py-3 text-center font-semibold text-gray-700">
                {cr.achievedLevel}
                <span className="text-gray-400 font-normal text-xs ml-1">
                  ({cr.achievedLevelName})
                </span>
              </td>
              <td className="px-3 py-3 text-center">
                {cr.gapToNext > 0 ? (
                  <span className="text-amber-600 font-medium">
                    +{cr.gapToNext}
                  </span>
                ) : (
                  <span className="text-green-600">max</span>
                )}
              </td>
              <td className="px-3 py-3 text-center">
                {cr.unansweredCount > 0 ? (
                  <span className="text-red-500 font-medium">
                    {cr.unansweredCount}
                  </span>
                ) : (
                  <span className="text-gray-400">0</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
