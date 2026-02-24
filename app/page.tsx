"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAssessmentStore } from "@/store/useAssessmentStore";

export default function WelcomePage() {
  const [hasProgress, setHasProgress] = useState(false);
  const [mounted, setMounted] = useState(false);
  const answers = useAssessmentStore((s) => s.answers);
  const reset = useAssessmentStore((s) => s.reset);

  useEffect(() => {
    setMounted(true);
    setHasProgress(Object.keys(answers).length > 0);
  }, [answers]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-100 mb-6">
            <svg
              className="w-8 h-8 text-brand-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 mb-4">
            Карта компетенций
          </h1>
          <p className="text-lg text-gray-500 mb-2">
            UX/CX Research Self-Assessment
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Как это работает
          </h2>
          <ul className="space-y-3 text-[15px] text-gray-600 leading-relaxed">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                1
              </span>
              <span>
                Вы оцениваете свои навыки по 12 компетенциям, отвечая на
                утверждения по шкале от 1 до 5.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                2
              </span>
              <span>
                Система рассчитывает ваш уровень по трём осям: Craft (методология),
                Impact (влияние), Leadership (лидерство).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                3
              </span>
              <span>
                Вы получаете визуализацию профиля, таблицу компетенций и
                персональный план развития.
              </span>
            </li>
          </ul>

          <div className="mt-6 pt-5 border-t border-gray-100">
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <span className="px-2.5 py-1 bg-gray-100 rounded-lg">96 утверждений</span>
              <span className="px-2.5 py-1 bg-gray-100 rounded-lg">12 компетенций</span>
              <span className="px-2.5 py-1 bg-gray-100 rounded-lg">3 оси</span>
              <span className="px-2.5 py-1 bg-gray-100 rounded-lg">~15 мин</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/assessment"
            className="flex-1 inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-brand-600 text-white font-semibold text-[15px] hover:bg-brand-700 transition-colors shadow-sm"
          >
            {mounted && hasProgress ? "Продолжить оценку" : "Начать оценку"}
          </Link>
          {mounted && hasProgress && (
            <>
              <Link
                href="/results"
                className="flex-1 inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-white text-brand-700 font-semibold text-[15px] border border-brand-200 hover:bg-brand-50 transition-colors"
              >
                Посмотреть результаты
              </Link>
              <button
                onClick={() => {
                  if (confirm("Сбросить весь прогресс?")) {
                    reset();
                    setHasProgress(false);
                  }
                }}
                className="inline-flex items-center justify-center px-4 py-3.5 rounded-xl text-gray-500 font-medium text-[15px] hover:bg-gray-100 transition-colors"
              >
                Сбросить
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
