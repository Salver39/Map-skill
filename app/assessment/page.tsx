"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { loadModel } from "@/lib/data-loader";
import { useHydration } from "@/lib/useHydration";
import { useSyncSession } from "@/lib/useSyncSession";
import { useAssessmentStore } from "@/store/useAssessmentStore";
import {
  createInitialProgress,
  selectItemsForLevel,
  evaluateLevel,
  advanceProgress,
  hasAvailableItems,
} from "@/lib/adaptive";
import type { CompetencyProgress } from "@/lib/adaptive";
import { getRoleInfo } from "@/types";
import QuestionCard from "@/components/QuestionCard";
import type { ModelData } from "@/types";

export default function AssessmentPage() {
  const router = useRouter();
  const hydrated = useHydration();
  const [model, setModel] = useState<ModelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeRole = useAssessmentStore((s) => s.activeRole);
  const roleState = useAssessmentStore((s) => s.roles[s.activeRole]);
  const sessionCode = useAssessmentStore((s) => s.sessionCode);
  const setAnswer = useAssessmentStore((s) => s.setAnswer);
  const setCompetencyIndex = useAssessmentStore((s) => s.setCompetencyIndex);
  const nextCompetency = useAssessmentStore((s) => s.nextCompetency);
  const prevCompetency = useAssessmentStore((s) => s.prevCompetency);
  const setAdaptiveProgress = useAssessmentStore(
    (s) => s.setAdaptiveProgress
  );

  const { syncNow } = useSyncSession();
  const roleInfo = getRoleInfo(activeRole);
  const answers = roleState.answers;
  const adaptiveProgress = useMemo(
    () => roleState.adaptiveProgress ?? {},
    [roleState.adaptiveProgress]
  );
  const currentCompetencyIndex = roleState.currentCompetencyIndex;

  useEffect(() => {
    loadModel()
      .then(setModel)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const competency = model?.competencies[currentCompetencyIndex] ?? null;

  const progress: CompetencyProgress | null = useMemo(() => {
    if (!competency) return null;
    return adaptiveProgress[competency.id] ?? null;
  }, [competency, adaptiveProgress]);

  const ensureProgress = useCallback(
    (compId: string): CompetencyProgress => {
      const existing = adaptiveProgress[compId];
      if (existing) return existing;
      const fresh = createInitialProgress();
      setAdaptiveProgress(compId, fresh);
      return fresh;
    },
    [adaptiveProgress, setAdaptiveProgress]
  );

  useEffect(() => {
    if (!competency || !model) return;
    ensureProgress(competency.id);
  }, [competency, model, ensureProgress]);

  const currentItems = useMemo(() => {
    if (!model || !competency || !progress) return [];

    if (progress.finalized) return [];

    const level = progress.currentLevel;
    const items = selectItemsForLevel(
      model.items,
      competency.id,
      level
    );

    if (items.length > 0) {
      const ids = items.map((i) => i.item_id);
      const existingIds = progress.shownItemIds[level];
      if (!existingIds || existingIds.join(",") !== ids.join(",")) {
        setAdaptiveProgress(competency.id, {
          ...progress,
          shownItemIds: { ...progress.shownItemIds, [level]: ids },
        });
      }
    }

    return items;
  }, [model, competency, progress, setAdaptiveProgress]);

  const allCurrentAnswered = useMemo(() => {
    if (currentItems.length === 0) return false;
    return currentItems.every((item) => answers[item.item_id] !== undefined);
  }, [currentItems, answers]);

  const finalizedCount = useMemo(() => {
    return Object.values(adaptiveProgress).filter((p) => p.finalized).length;
  }, [adaptiveProgress]);

  const totalCompetencies = model?.competencies.length ?? 12;

  const handleAnswer = useCallback(
    (itemId: string, value: number) => {
      setAnswer(itemId, value);
    },
    [setAnswer]
  );

  const handleEvaluate = useCallback(() => {
    if (!competency || !progress || !model) return;

    const itemIds = progress.shownItemIds[progress.currentLevel] ?? [];
    const pass = evaluateLevel(answers, itemIds);
    let next = advanceProgress(progress, pass);

    if (
      !next.finalized &&
      !hasAvailableItems(model.items, competency.id, next.currentLevel)
    ) {
      if (next.direction === "up") {
        next = {
          ...next,
          finalized: true,
          achievedLevel:
            next.passedLevels.length > 0
              ? Math.max(...next.passedLevels)
              : 1,
        };
      } else {
        next = { ...next, finalized: true, achievedLevel: 1 };
      }
    }

    setAdaptiveProgress(competency.id, next);
  }, [competency, progress, model, answers, setAdaptiveProgress]);

  const handleNextCompetency = async () => {
    if (!model) return;
    await syncNow();
    const isLast =
      currentCompetencyIndex >= model.competencies.length - 1;
    if (isLast) {
      router.push("/results");
    } else {
      nextCompetency(model.competencies.length);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrev = async () => {
    await syncNow();
    prevCompetency();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isLastCompetency =
    model !== null &&
    currentCompetencyIndex >= model.competencies.length - 1;

  const levelName = useMemo(() => {
    if (!model || !progress) return "";
    const def = model.meta.levels.find(
      (l) => l.id === progress.currentLevel
    );
    return def?.name ?? `Level ${progress.currentLevel}`;
  }, [model, progress]);

  const achievedLevelName = useMemo(() => {
    if (!model || !progress || !progress.finalized) return "";
    const def = model.meta.levels.find(
      (l) => l.id === progress.achievedLevel
    );
    return def?.name ?? `Level ${progress.achievedLevel}`;
  }, [model, progress]);

  if (loading || !hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 text-lg animate-pulse">
          Загрузка модели...
        </div>
      </div>
    );
  }

  if (error || !model) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-md text-center">
          <p className="text-red-700 font-semibold mb-2">Ошибка загрузки</p>
          <p className="text-red-600 text-sm">
            {error ?? "Не удалось загрузить данные"}
          </p>
        </div>
      </div>
    );
  }

  if (!competency) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Компетенция не найдена</p>
      </div>
    );
  }

  const isFinalized = progress?.finalized ?? false;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => router.push("/")}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              &larr; Главная
            </button>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleInfo.bgClass} ${roleInfo.textClass}`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: roleInfo.color }}
                />
                {roleInfo.name}
              </span>
              {sessionCode && (
                <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                  {sessionCode}
                </span>
              )}
              <span className="text-sm text-gray-500 tabular-nums">
                {currentCompetencyIndex + 1}/{totalCompetencies}
              </span>
            </div>
          </div>
          {/* Competency step bar */}
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all bg-brand-500"
              style={{
                width: `${(finalizedCount / totalCompetencies) * 100}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-400">
              {finalizedCount} из {totalCompetencies} завершено
            </span>
            <span className="text-xs text-gray-400">
              ~{Math.max(1, totalCompetencies - finalizedCount)} мин
            </span>
          </div>
        </div>
      </header>

      {/* Competency nav pills */}
      <div className="max-w-3xl mx-auto px-4 mt-4 mb-2">
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
          {model.competencies.map((c, idx) => {
            const ap = adaptiveProgress[c.id];
            const isCurrent = idx === currentCompetencyIndex;
            const done = ap?.finalized;

            return (
              <button
                key={c.id}
                onClick={() => setCompetencyIndex(idx)}
                title={c.name}
                className={`
                  flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${
                    isCurrent
                      ? "text-white shadow-sm"
                      : done
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }
                `}
                style={
                  isCurrent
                    ? { backgroundColor: roleInfo.color }
                    : undefined
                }
              >
                {done ? `${idx + 1}✓` : idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 pb-32">
        {/* Competency heading */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
            {competency.name}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                competency.axis === "Craft"
                  ? "bg-blue-100 text-blue-700"
                  : competency.axis === "Impact"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-purple-100 text-purple-700"
              }`}
            >
              {competency.axis}
            </span>
            {!isFinalized && progress && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700">
                Уровень {progress.currentLevel} — {levelName}
              </span>
            )}
          </div>
        </div>

        {/* Adaptive content */}
        {isFinalized && progress ? (
          <div className="bg-white rounded-2xl shadow-sm border border-green-200 p-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-100 mb-4">
              <span className="text-3xl font-extrabold text-green-700">
                {progress.achievedLevel}
              </span>
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-1">
              {achievedLevelName}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Уровень по компетенции «{competency.name}» определён
            </p>
            {progress.passedLevels.length > 0 && (
              <div className="flex justify-center gap-1.5 mb-4">
                {[2, 3, 4, 5, 6, 7].map((lvl) => (
                  <span
                    key={lvl}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold ${
                      progress.passedLevels.includes(lvl)
                        ? "bg-green-100 text-green-700"
                        : lvl <= progress.achievedLevel
                          ? "bg-gray-100 text-gray-500"
                          : "bg-gray-50 text-gray-300"
                    }`}
                  >
                    {lvl}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4 p-3 rounded-xl bg-brand-50 border border-brand-100 text-brand-700 text-sm">
              Оцените {currentItems.length} утверждения. Уровень будет
              уточняться автоматически.
            </div>
            <div className="space-y-3">
              {currentItems.map((item, idx) => (
                <QuestionCard
                  key={item.item_id}
                  itemId={item.item_id}
                  statement={item.statement}
                  levelTarget={item.level_target}
                  value={answers[item.item_id]}
                  index={idx + 1}
                  onChange={handleAnswer}
                />
              ))}
            </div>
            {currentItems.length === 0 && progress && (
              <div className="text-center py-8 text-gray-400">
                Нет вопросов для уровня {progress.currentLevel}
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button
            onClick={handlePrev}
            disabled={currentCompetencyIndex === 0}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Назад
          </button>

          <button
            onClick={() => router.push("/results")}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            К результатам
          </button>

          {isFinalized ? (
            <button
              onClick={handleNextCompetency}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors shadow-sm"
              style={{ backgroundColor: roleInfo.color }}
            >
              {isLastCompetency ? "Завершить" : "Следующая"}
            </button>
          ) : (
            <button
              onClick={handleEvaluate}
              disabled={!allCurrentAnswered}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: roleInfo.color }}
            >
              Оценить уровень
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
