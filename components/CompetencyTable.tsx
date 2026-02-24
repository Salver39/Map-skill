"use client";

import type { CompetencyResult, AssessorRole } from "@/types";
import { getRoleInfo } from "@/types";

interface RoleColumn {
  role: AssessorRole;
  results: CompetencyResult[];
}

interface CompetencyTableProps {
  primaryResults: CompetencyResult[];
  primaryRole: AssessorRole;
  additionalRoles?: RoleColumn[];
}

const axisColors: Record<string, string> = {
  Craft: "bg-blue-100 text-blue-700",
  Impact: "bg-emerald-100 text-emerald-700",
  Leadership: "bg-purple-100 text-purple-700",
};

export default function CompetencyTable({
  primaryResults,
  primaryRole,
  additionalRoles = [],
}: CompetencyTableProps) {
  const primaryInfo = getRoleInfo(primaryRole);
  const hasAdditional = additionalRoles.length > 0;

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
              <span className="inline-flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: primaryInfo.color }}
                />
                {primaryInfo.shortName}
              </span>
            </th>
            {additionalRoles.map((col) => {
              const info = getRoleInfo(col.role);
              return (
                <th
                  key={col.role}
                  className="text-center px-3 py-3 font-semibold text-gray-700"
                >
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: info.color }}
                    />
                    {info.shortName}
                  </span>
                </th>
              );
            })}
            {hasAdditional && (
              <th className="text-center px-3 py-3 font-semibold text-gray-700">
                Дельта
              </th>
            )}
            <th className="text-center px-3 py-3 font-semibold text-gray-700">
              Без ответа
            </th>
          </tr>
        </thead>
        <tbody>
          {primaryResults.map((cr) => {
            const externalLevels = additionalRoles.map((col) => {
              const ext = col.results.find(
                (r) => r.competencyId === cr.competencyId
              );
              return { role: col.role, level: ext?.achievedLevel ?? null };
            });

            const maxDelta = externalLevels.reduce((max, ext) => {
              if (ext.level === null) return max;
              const d = cr.achievedLevel - ext.level;
              return Math.abs(d) > Math.abs(max) ? d : max;
            }, 0);

            return (
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
                </td>
                {externalLevels.map((ext) => (
                  <td
                    key={ext.role}
                    className="px-3 py-3 text-center font-semibold text-gray-700"
                  >
                    {ext.level !== null ? ext.level : (
                      <span className="text-gray-300">&mdash;</span>
                    )}
                  </td>
                ))}
                {hasAdditional && (
                  <td className="px-3 py-3 text-center">
                    {maxDelta > 0 ? (
                      <span className="text-red-500 font-medium" title="Возможная переоценка">
                        +{maxDelta} &uarr;
                      </span>
                    ) : maxDelta < 0 ? (
                      <span className="text-emerald-600 font-medium" title="Возможная недооценка">
                        {maxDelta} &darr;
                      </span>
                    ) : (
                      <span className="text-gray-400">=</span>
                    )}
                  </td>
                )}
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
