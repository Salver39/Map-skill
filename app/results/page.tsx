"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { loadModel } from "@/lib/data-loader";
import { useAssessmentStore } from "@/store/useAssessmentStore";
import { calculateResults, getWeakestCompetencies } from "@/lib/scoring";
import { getInterpretation, getDevelopmentFocus } from "@/lib/interpretation";
import RadarChart from "@/components/RadarChart";
import CompetencyTable from "@/components/CompetencyTable";
import ProgressBar from "@/components/ProgressBar";
import type { ModelData, AssessmentResults } from "@/types";

export default function ResultsPage() {
  const router = useRouter();
  const [model, setModel] = useState<ModelData | null>(null);
  const [loading, setLoading] = useState(true);
  const answers = useAssessmentStore((s) => s.answers);
  const startedAt = useAssessmentStore((s) => s.startedAt);
  const reset = useAssessmentStore((s) => s.reset);

  useEffect(() => {
    loadModel()
      .then(setModel)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const results: AssessmentResults | null = useMemo(() => {
    if (!model) return null;
    return calculateResults(model, answers);
  }, [model, answers]);

  const interpretation = useMemo(() => {
    if (!results) return [];
    return getInterpretation(results);
  }, [results]);

  const developmentPlan = useMemo(() => {
    if (!model || !results) return [];
    return model.meta.axes.map((axis) => ({
      axis,
      weakest: getWeakestCompetencies(results, axis, 2),
    }));
  }, [model, results]);

  const handleExportJSON = () => {
    if (!model || !results) return;
    const exportData = {
      exportedAt: new Date().toISOString(),
      startedAt,
      modelVersion: model.meta.version,
      answers,
      results: {
        overallLevel: results.overallLevel,
        overallLevelName: results.overallLevelName,
        axisScores: results.axisScores,
        competencyResults: results.competencyResults,
        completionPercent: results.completionPercent,
      },
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uxcx-assessment-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestart = () => {
    if (confirm("Сбросить все ответы и начать заново?")) {
      reset();
      router.push("/");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500 text-lg">Загрузка...</div>
      </div>
    );
  }

  if (!model || !results) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Не удалось рассчитать результаты</p>
          <button
            onClick={() => router.push("/")}
            className="text-brand-600 hover:underline"
          >
            На главную
          </button>
        </div>
      </div>
    );
  }

  const axisLabelsRu: Record<string, string> = {
    Craft: "Методология",
    Impact: "Влияние",
    Leadership: "Лидерство",
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            &larr; Главная
          </button>
          <h1 className="text-lg font-bold text-gray-900">Результаты</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Completion */}
        {results.completionPercent < 100 && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <ProgressBar
              current={results.totalAnswered}
              total={results.totalItems}
              label="Прогресс прохождения"
            />
            <p className="mt-2 text-sm text-amber-700">
              Вы ответили на {results.completionPercent}% вопросов. Результаты
              могут быть неточными.{" "}
              <button
                onClick={() => router.push("/assessment")}
                className="underline font-medium"
              >
                Продолжить оценку
              </button>
            </p>
          </div>
        )}

        {/* Overall Level Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 sm:p-8 text-center">
          <p className="text-sm text-gray-500 uppercase tracking-wide font-medium mb-2">
            Общий уровень
          </p>
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-brand-100 mb-3">
            <span className="text-4xl font-extrabold text-brand-700">
              {results.overallLevel}
            </span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {results.overallLevelName}
          </p>
        </div>

        {/* Radar + Axis Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Профиль по осям
            </h2>
            <RadarChart axisScores={results.axisScores} />
          </div>

          <div className="space-y-4">
            {Object.values(results.axisScores).map((axis) => (
              <div
                key={axis.axis}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-800">{axis.axis}</h3>
                    <p className="text-sm text-gray-500">
                      {axisLabelsRu[axis.axis] ?? axis.axis}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-brand-700">
                      {axis.level}
                    </span>
                    <p className="text-xs text-gray-400">
                      {axis.scoreFloat.toFixed(2)} avg
                    </p>
                  </div>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all"
                    style={{ width: `${(axis.scoreFloat / 5) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {axis.competencyCount} компетенций
                </p>
              </div>
            ))}
          </div>
        </div>

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
          <CompetencyTable results={results.competencyResults} />
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
                          <span className="text-xs text-gray-500">
                            Уровень {comp.achievedLevel} &rarr;{" "}
                            {comp.achievedLevel + 1}
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
            onClick={() => router.push("/assessment")}
            className="flex-1 inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-white text-brand-700 font-semibold text-[15px] border border-brand-200 hover:bg-brand-50 transition-colors"
          >
            Вернуться к оценке
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
