"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadModel } from "@/lib/data-loader";
import { isSupabaseConfigured } from "@/lib/supabase";
import { createSession, checkSessionExists, loadRoleResponse } from "@/lib/session";
import { useAssessmentStore } from "@/store/useAssessmentStore";
import { useHydration } from "@/lib/useHydration";
import { ASSESSOR_ROLES } from "@/types";
import type { AssessorRole, ModelData } from "@/types";

export default function WelcomePage() {
  const router = useRouter();
  const hydrated = useHydration();
  const [model, setModel] = useState<ModelData | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const roles = useAssessmentStore((s) => s.roles);
  const sessionCode = useAssessmentStore((s) => s.sessionCode);
  const setActiveRole = useAssessmentStore((s) => s.setActiveRole);
  const setSessionCode = useAssessmentStore((s) => s.setSessionCode);
  const loadRoleAnswers = useAssessmentStore((s) => s.loadRoleAnswers);
  const resetAll = useAssessmentStore((s) => s.resetAll);
  const resetRole = useAssessmentStore((s) => s.resetRole);

  const supabaseReady = isSupabaseConfigured();

  useEffect(() => {
    loadModel().then(setModel).catch(console.error);
  }, []);

  const totalItems = model?.items.length ?? 80;

  const anyProgress =
    hydrated &&
    Object.values(roles).some((r) => Object.keys(r.answers).length > 0);

  const handleCreateSession = async () => {
    setBusy(true);
    try {
      const code = await createSession();
      setSessionCode(code);
    } catch (err) {
      console.error(err);
      alert("Не удалось создать сессию. Проверьте настройки Supabase.");
    } finally {
      setBusy(false);
    }
  };

  const handleJoinSession = async () => {
    const code = joinCode.toUpperCase().trim();
    if (code.length < 4) {
      setJoinError("Введите код сессии");
      return;
    }
    setBusy(true);
    setJoinError("");
    try {
      const exists = await checkSessionExists(code);
      if (!exists) {
        setJoinError("Сессия не найдена");
        setBusy(false);
        return;
      }
      setSessionCode(code);
      setShowJoin(false);
      setJoinCode("");
    } catch {
      setJoinError("Ошибка подключения");
    } finally {
      setBusy(false);
    }
  };

  const handleLeaveSession = () => {
    if (confirm("Выйти из сессии? Локальные данные сохранятся.")) {
      setSessionCode(null);
    }
  };

  const handleStartRole = async (role: AssessorRole) => {
    if (sessionCode) {
      try {
        const remote = await loadRoleResponse(sessionCode, role);
        if (remote && Object.keys(remote.answers).length > 0) {
          loadRoleAnswers(role, remote.answers, remote.competency_index);
        }
      } catch {
        /* continue with local state */
      }
    }
    setActiveRole(role);
    router.push("/assessment");
  };

  const handleResetRole = (role: AssessorRole, e: React.MouseEvent) => {
    e.stopPropagation();
    const name = ASSESSOR_ROLES.find((r) => r.id === role)?.name;
    if (confirm(`Сбросить прогресс для "${name}"?`)) {
      resetRole(role);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
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
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 mb-3">
            Карта компетенций
          </h1>
          <p className="text-lg text-gray-500">
            UX/CX Research Assessment Tool
          </p>
        </div>

        {/* Session banner */}
        {hydrated && sessionCode && (
          <div className="mb-6 p-4 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-between">
            <div>
              <p className="text-sm text-brand-700 font-medium">
                Совместная сессия
              </p>
              <p className="text-2xl font-mono font-bold text-brand-800 tracking-widest">
                {sessionCode}
              </p>
              <p className="text-xs text-brand-600 mt-0.5">
                Поделитесь кодом с лидом команды и лидом продукта
              </p>
            </div>
            <button
              onClick={handleLeaveSession}
              className="text-xs text-brand-500 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-white transition-colors"
            >
              Выйти
            </button>
          </div>
        )}

        {/* Session actions */}
        {hydrated && supabaseReady && !sessionCode && (
          <div className="mb-6 bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-2">
              Совместная оценка
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Создайте сессию, чтобы несколько человек могли оценить
              исследователя со своих устройств
            </p>
            {showJoin ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Введите код"
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.toUpperCase());
                    setJoinError("");
                  }}
                  maxLength={6}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono tracking-widest text-center uppercase focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                />
                <button
                  onClick={handleJoinSession}
                  disabled={busy}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  Войти
                </button>
                <button
                  onClick={() => {
                    setShowJoin(false);
                    setJoinError("");
                  }}
                  className="px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Отмена
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCreateSession}
                  disabled={busy}
                  className="flex-1 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {busy ? "Создание..." : "Создать сессию"}
                </button>
                <button
                  onClick={() => setShowJoin(true)}
                  className="flex-1 px-5 py-2.5 rounded-xl text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors"
                >
                  У меня есть код
                </button>
              </div>
            )}
            {joinError && (
              <p className="mt-2 text-sm text-red-600">{joinError}</p>
            )}
          </div>
        )}

        {/* Info card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-6">
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span className="px-2.5 py-1 bg-gray-100 rounded-lg">
              80 утверждений
            </span>
            <span className="px-2.5 py-1 bg-gray-100 rounded-lg">
              11 компетенций
            </span>
            <span className="px-2.5 py-1 bg-gray-100 rounded-lg">
              3 оси
            </span>
            <span className="px-2.5 py-1 bg-gray-100 rounded-lg">
              ~10 мин на роль
            </span>
          </div>
        </div>

        {/* Role cards */}
        <div className="space-y-3 mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-1">
            Выберите роль
          </h3>
          {ASSESSOR_ROLES.map((roleInfo) => {
            const roleState = hydrated ? roles[roleInfo.id] : null;
            const answered = roleState
              ? Object.keys(roleState.answers).length
              : 0;
            const percent =
              totalItems > 0 ? Math.round((answered / totalItems) * 100) : 0;
            const isComplete = percent === 100;
            const hasData = answered > 0;

            return (
              <button
                key={roleInfo.id}
                onClick={() => handleStartRole(roleInfo.id)}
                className="w-full text-left bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:border-gray-300 hover:shadow transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: roleInfo.color }}
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">
                        {roleInfo.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {roleInfo.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasData && (
                      <button
                        onClick={(e) => handleResetRole(roleInfo.id, e)}
                        className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Сбросить
                      </button>
                    )}
                    <span
                      className={`text-sm font-semibold px-3 py-1 rounded-lg ${
                        isComplete
                          ? "bg-green-100 text-green-700"
                          : hasData
                            ? "bg-brand-100 text-brand-700"
                            : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {hasData
                        ? isComplete
                          ? "Готово"
                          : `${percent}%`
                        : "Начать"}
                    </span>
                  </div>
                </div>
                {hasData && (
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2 ml-6 max-w-[calc(100%-1.5rem)]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isComplete ? "bg-green-500" : "bg-brand-500"
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {anyProgress && (
            <>
              <button
                onClick={() => router.push("/results")}
                className="flex-1 inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-brand-600 text-white font-semibold text-[15px] hover:bg-brand-700 transition-colors shadow-sm"
              >
                Посмотреть результаты
              </button>
              <button
                onClick={() => {
                  if (confirm("Сбросить весь прогресс по всем ролям?")) {
                    resetAll();
                  }
                }}
                className="inline-flex items-center justify-center px-4 py-3.5 rounded-xl text-gray-500 font-medium text-[15px] hover:bg-gray-100 transition-colors"
              >
                Сбросить всё
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
