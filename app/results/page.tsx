"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { loadModel } from "@/lib/data-loader";
import { useHydration } from "@/lib/useHydration";
import { useAssessmentStore } from "@/store/useAssessmentStore";
import { loadSessionResponses } from "@/lib/session";
import {
  calculateResults,
  getWeakestCompetencies,
  calculateGaps,
} from "@/lib/scoring";
import { getInterpretation, getDevelopmentFocus } from "@/lib/interpretation";
import RadarChart from "@/components/RadarChart";
import type { RadarDataset } from "@/components/RadarChart";
import CompetencyTable from "@/components/CompetencyTable";
import ProgressBar from "@/components/ProgressBar";
import { ASSESSOR_ROLES, getRoleInfo } from "@/types";
import type {
  ModelData,
  AssessmentResults,
  AssessorRole,
  CompetencyGap,
} from "@/types";

export default function ResultsPage() {
  const router = useRouter();
  const hydrated = useHydration();
  const [model, setModel] = useState<ModelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [remoteAnswers, setRemoteAnswers] = useState<
    Record<string, Record<string, number>>
  >({});
  const roles = useAssessmentStore((s) => s.roles);
  const sessionCode = useAssessmentStore((s) => s.sessionCode);
  const loadRoleAnswers = useAssessmentStore((s) => s.loadRoleAnswers);
  const resetAll = useAssessmentStore((s) => s.resetAll);

  useEffect(() => {
    loadModel()
      .then(setModel)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!sessionCode || !hydrated) return;
    loadSessionResponses(sessionCode).then((responses) => {
      const remote: Record<string, Record<string, number>> = {};
      for (const resp of responses) {
        remote[resp.role] = resp.answers;
        const localAnswerCount = Object.keys(
          roles[resp.role as AssessorRole]?.answers ?? {}
        ).length;
        const remoteAnswerCount = Object.keys(resp.answers).length;
        if (remoteAnswerCount > localAnswerCount) {
          loadRoleAnswers(
            resp.role as AssessorRole,
            resp.answers,
            resp.competency_index
          );
        }
      }
      setRemoteAnswers(remote);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCode, hydrated]);

  const mergedRoles = useMemo(() => {
    const merged: Record<AssessorRole, Record<string, number>> = {
      self: { ...roles.self.answers },
      team_lead: { ...roles.team_lead.answers },
      product_lead: { ...roles.product_lead.answers },
    };
    for (const [role, answers] of Object.entries(remoteAnswers)) {
      const r = role as AssessorRole;
      const localCount = Object.keys(merged[r]).length;
      const remoteCount = Object.keys(answers).length;
      if (remoteCount > localCount) {
        merged[r] = answers;
      }
    }
    return merged;
  }, [roles, remoteAnswers]);

  const roleResults = useMemo(() => {
    if (!model || !hydrated)
      return {} as Record<AssessorRole, AssessmentResults | null>;
    const out: Record<string, AssessmentResults | null> = {};
    for (const role of ASSESSOR_ROLES) {
      const answers = mergedRoles[role.id];
      const hasAnswers = Object.keys(answers).length > 0;
      out[role.id] = hasAnswers ? calculateResults(model, answers) : null;
    }
    return out as Record<AssessorRole, AssessmentResults | null>;
  }, [model, mergedRoles, hydrated]);

  const selfResults = roleResults.self ?? null;

  const filledRoles = useMemo(() => {
    return ASSESSOR_ROLES.filter((r) => roleResults[r.id] !== null);
  }, [roleResults]);

  const externalRoles = useMemo(() => {
    return filledRoles.filter((r) => r.id !== "self");
  }, [filledRoles]);

  const radarDatasets: RadarDataset[] = useMemo(() => {
    return filledRoles
      .map((r) => {
        const res = roleResults[r.id];
        if (!res) return null;
        return {
          role: r.id,
          label: r.name,
          axisScores: res.axisScores,
          color: r.color,
        };
      })
      .filter((d): d is RadarDataset => d !== null);
  }, [filledRoles, roleResults]);

  const allGaps: CompetencyGap[] = useMemo(() => {
    if (!selfResults) return [];
    const gaps: CompetencyGap[] = [];
    for (const extRole of externalRoles) {
      const extRes = roleResults[extRole.id];
      if (!extRes) continue;
      gaps.push(...calculateGaps(selfResults, extRes, extRole.id));
    }
    return gaps;
  }, [selfResults, externalRoles, roleResults]);

  const blindSpots = useMemo(() => {
    return allGaps.filter((g) => g.delta >= 2);
  }, [allGaps]);

  const interpretation = useMemo(() => {
    if (!selfResults) return [];
    return getInterpretation(selfResults);
  }, [selfResults]);

  const developmentPlan = useMemo(() => {
    if (!model || !selfResults) return [];
    return Object.keys(model.axisMapping).map((axis) => ({
      axis,
      weakest: getWeakestCompetencies(selfResults, axis, 2),
    }));
  }, [model, selfResults]);

  const handleExportJSON = () => {
    if (!model) return;
    const exportData = {
      exportedAt: new Date().toISOString(),
      sessionCode,
      modelVersion: model.meta.version,
      roles: Object.fromEntries(
        ASSESSOR_ROLES.map((r) => [
          r.id,
          {
            answers: mergedRoles[r.id],
            results: roleResults[r.id],
          },
        ])
      ),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uxcx-assessment-${sessionCode ?? "local"}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestart = () => {
    if (confirm("Сбросить все ответы по всем ролям и начать заново?")) {
      resetAll();
      router.push("/");
    }
  };

  if (loading || !hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 text-lg animate-pulse">Загрузка...</div>
      </div>
    );
  }

  if (!model || filledRoles.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">
            Нет данных для отображения. Пройдите оценку хотя бы для одной роли.
          </p>
          <button
            onClick={() => router.push("/")}
            className="text-brand-600 hover:underline font-medium"
          >
            На главную
          </button>
        </div>
      </div>
    );
  }

  const primaryRole =
    selfResults !== null ? ("self" as AssessorRole) : filledRoles[0].id;
  const primaryResults = roleResults[primaryRole]!;
  const primaryInfo = getRoleInfo(primaryRole);

  const axisLabelsRu: Record<string, string> = {
    Craft: "Методология",
    Impact: "Влияние",
    Leadership: "Лидерство",
  };

  const axisBarColor: Record<string, string> = {
    Craft: "bg-blue-500",
    Impact: "bg-emerald-500",
    Leadership: "bg-purple-500",
  };

  const additionalTableCols = externalRoles
    .filter((r) => roleResults[r.id] !== null)
    .map((r) => ({
      role: r.id,
      results: roleResults[r.id]!.competencyResults,
    }));

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            &larr; Главная
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">Результаты</h1>
            {sessionCode && (
              <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                {sessionCode}
              </span>
            )}
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Role progress badges */}
        <div className="flex flex-wrap gap-2">
          {ASSESSOR_ROLES.map((r) => {
            const res = roleResults[r.id];
            return (
              <span
                key={r.id}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                  res
                    ? `${r.bgClass} ${r.textClass}`
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: res ? r.color : "#d1d5db",
                  }}
                />
                {r.name}
                {res && (
                  <span className="font-normal">
                    ({res.completionPercent}%)
                  </span>
                )}
              </span>
            );
          })}
        </div>

        {/* Completion warning */}
        {primaryResults.completionPercent < 100 && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <ProgressBar
              current={primaryResults.totalAnswered}
              total={primaryResults.totalItems}
              label={`Прогресс — ${primaryInfo.name}`}
            />
            <p className="mt-2 text-sm text-amber-700">
              {primaryInfo.name}: {primaryResults.completionPercent}% вопросов.{" "}
              <button
                onClick={() => router.push("/assessment")}
                className="underline font-medium"
              >
                Продолжить
              </button>
            </p>
          </div>
        )}

        {/* Overall Level */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 sm:p-8 text-center">
          <p className="text-sm text-gray-500 uppercase tracking-wide font-medium mb-2">
            Общий уровень
            {primaryRole !== "self" && (
              <span className="normal-case ml-1">({primaryInfo.name})</span>
            )}
          </p>
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-brand-100 mb-3">
            <span className="text-4xl font-extrabold text-brand-700">
              {primaryResults.overallLevel}
            </span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {primaryResults.overallLevelName}
          </p>
          {filledRoles.length > 1 && (
            <div className="mt-4 flex justify-center gap-4">
              {filledRoles
                .filter((r) => r.id !== primaryRole)
                .map((r) => {
                  const res = roleResults[r.id]!;
                  return (
                    <div key={r.id} className="text-center">
                      <span className="text-xs text-gray-500">{r.name}</span>
                      <p
                        className="text-lg font-bold"
                        style={{ color: r.color }}
                      >
                        {res.overallLevel}{" "}
                        <span className="text-xs font-normal text-gray-400">
                          {res.overallLevelName}
                        </span>
                      </p>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Radar + Axis Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Профиль по осям
            </h2>
            <RadarChart datasets={radarDatasets} />
          </div>

          <div className="space-y-4">
            {Object.values(primaryResults.axisScores).map((axis) => (
              <div
                key={axis.axis}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {axis.axis}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {axisLabelsRu[axis.axis] ?? axis.axis}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-brand-700">
                      {axis.level}
                    </span>
                    <p className="text-xs text-gray-400 tabular-nums">
                      {axis.scoreFloat.toFixed(2)} avg
                    </p>
                  </div>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      axisBarColor[axis.axis] ?? "bg-brand-500"
                    }`}
                    style={{ width: `${(axis.scoreFloat / 5) * 100}%` }}
                  />
                </div>
                {externalRoles.length > 0 && (
                  <div className="mt-2 flex gap-3">
                    {externalRoles.map((er) => {
                      const extRes = roleResults[er.id];
                      const extAxis = extRes?.axisScores[axis.axis];
                      if (!extAxis) return null;
                      return (
                        <span
                          key={er.id}
                          className="text-xs tabular-nums"
                          style={{ color: er.color }}
                        >
                          {er.shortName}: {extAxis.scoreFloat.toFixed(1)}
                        </span>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {axis.competencyCount} компетенций
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Blind Spots */}
        {blindSpots.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-red-200 p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-red-700 mb-1">
              Слепые зоны
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Компетенции, где самооценка расходится с внешней оценкой на 2+
              уровня
            </p>
            <div className="space-y-3">
              {blindSpots.map((gap) => {
                const extInfo = getRoleInfo(gap.externalRole);
                return (
                  <div
                    key={`${gap.competencyId}-${gap.externalRole}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-100"
                  >
                    <div>
                      <span className="font-medium text-gray-800 text-sm">
                        {gap.competencyName}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {gap.axis}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm tabular-nums">
                      <span className="text-blue-600 font-semibold">
                        Само: {gap.selfLevel}
                      </span>
                      <span
                        style={{ color: extInfo.color }}
                        className="font-semibold"
                      >
                        {extInfo.shortName}: {gap.externalLevel}
                      </span>
                      <span
                        className={`font-bold ${
                          gap.direction === "over"
                            ? "text-red-500"
                            : "text-emerald-600"
                        }`}
                      >
                        {gap.direction === "over" ? "+" : ""}
                        {gap.direction === "over" ? gap.delta : -gap.delta}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Interpretation */}
        {interpretation.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Интерпретация
            </h2>
            <div className="space-y-4">
              {interpretation.map((block, idx) => (
                <div key={idx}>
                  <h3 className="font-semibold text-gray-700 mb-1">
                    {block.title}
                  </h3>
                  <p className="text-[15px] leading-relaxed text-gray-600">
                    {block.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Competency Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Компетенции
          </h2>
          <CompetencyTable
            primaryResults={primaryResults.competencyResults}
            primaryRole={primaryRole}
            additionalRoles={additionalTableCols}
          />
        </div>

        {/* Development Plan */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">
            План развития
          </h2>
          <div className="space-y-6">
            {developmentPlan.map(({ axis, weakest }) => (
              <div key={axis}>
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      axis === "Craft"
                        ? "bg-blue-100 text-blue-700"
                        : axis === "Impact"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {axis}
                  </span>
                  <span className="text-sm text-gray-500 font-normal">
                    {axisLabelsRu[axis]}
                  </span>
                </h3>
                {weakest.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    Нет данных для рекомендаций
                  </p>
                ) : (
                  <div className="space-y-3">
                    {weakest.map((comp) => (
                      <div
                        key={comp.competencyId}
                        className="p-4 rounded-xl bg-gray-50 border border-gray-100"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-800 text-sm">
                            {comp.competencyName}
                          </span>
                          <span className="text-xs text-gray-500 tabular-nums">
                            Уровень {comp.achievedLevel}
                            {comp.nextLevel !== null && (
                              <> &rarr; {comp.nextLevel}</>
                            )}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {getDevelopmentFocus(comp.competencyId)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleExportJSON}
            className="flex-1 inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-brand-600 text-white font-semibold text-[15px] hover:bg-brand-700 transition-colors shadow-sm"
          >
            Экспорт JSON
          </button>
          <button
            onClick={() => router.push("/")}
            className="flex-1 inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-white text-brand-700 font-semibold text-[15px] border border-brand-200 hover:bg-brand-50 transition-colors"
          >
            К оценке
          </button>
          <button
            onClick={handleRestart}
            className="inline-flex items-center justify-center px-4 py-3.5 rounded-xl text-gray-500 font-medium text-[15px] hover:bg-gray-100 transition-colors"
          >
            Начать заново
          </button>
        </div>
      </main>
    </div>
  );
}
