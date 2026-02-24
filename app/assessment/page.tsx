"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { loadModel } from "@/lib/data-loader";
import { useHydration } from "@/lib/useHydration";
import { useSyncSession } from "@/lib/useSyncSession";
import { useAssessmentStore } from "@/store/useAssessmentStore";
import { getRoleInfo } from "@/types";
import QuestionCard from "@/components/QuestionCard";
import ProgressBar from "@/components/ProgressBar";
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

  const { syncNow } = useSyncSession();

  const roleInfo = getRoleInfo(activeRole);
  const answers = roleState.answers;
  const currentCompetencyIndex = roleState.currentCompetencyIndex;

  useEffect(() => {
    loadModel()
      .then(setModel)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const competency = model?.competencies[currentCompetencyIndex] ?? null;

  const competencyItems = useMemo(() => {
    if (!model || !competency) return [];
    return model.items
      .filter((i) => i.competency_id === competency.id)
      .sort((a, b) => a.level_target - b.level_target);
  }, [model, competency]);

  const totalAnswered = useMemo(() => {
    if (!model) return 0;
    return model.items.filter((i) => answers[i.item_id] !== undefined).length;
  }, [model, answers]);

  const competencyAnswered = useMemo(() => {
    return competencyItems.filter((i) => answers[i.item_id] !== undefined)
      .length;
  }, [competencyItems, answers]);

  const handleAnswer = useCallback(
    (itemId: string, value: number) => {
      setAnswer(itemId, value);
    },
    [setAnswer]
  );

  const isLastCompetency =
    model !== null && currentCompetencyIndex >= model.competencies.length - 1;

  const handleNext = async () => {
    if (!model) return;
    await syncNow();
    if (isLastCompetency) {
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

  const someUnanswered = competencyAnswered < competencyItems.length;

  return (
    <div className="min-h-screen bg-gray-50">
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
                {currentCompetencyIndex + 1}/{model.competencies.length}
              </span>
            </div>
          </div>
          <ProgressBar
            current={totalAnswered}
            total={model.items.length}
            label="Общий прогресс"
          />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 mt-4 mb-2">
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
          {model.competencies.map((c, idx) => {
            const itemsForC = model.items.filter(
              (i) => i.competency_id === c.id
            );
            const answeredForC = itemsForC.filter(
              (i) => answers[i.item_id] !== undefined
            ).length;
            const allAnsweredForC = answeredForC === itemsForC.length;
            const isCurrent = idx === currentCompetencyIndex;

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
                      : allAnsweredForC
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : answeredForC > 0
                          ? "bg-brand-100 text-brand-700 hover:bg-brand-200"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }
                `}
                style={isCurrent ? { backgroundColor: roleInfo.color } : undefined}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 pb-32">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
            {competency.name}
          </h1>
          <div className="flex items-center gap-2">
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
            <span className="text-sm text-gray-400 tabular-nums">
              {competencyAnswered}/{competencyItems.length} отвечено
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {competencyItems.map((item, idx) => (
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

        {someUnanswered && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
            Есть неотвеченные вопросы. Вы можете продолжить, но они повлияют на
            точность результатов.
          </div>
        )}
      </main>

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

          <button
            onClick={handleNext}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors shadow-sm"
            style={{ backgroundColor: roleInfo.color }}
          >
            {isLastCompetency ? "Завершить" : "Далее"}
          </button>
        </div>
      </div>
    </div>
  );
}
