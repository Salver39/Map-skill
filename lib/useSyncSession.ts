"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAssessmentStore } from "@/store/useAssessmentStore";
import { saveResponse } from "./session";

export function useSyncSession() {
  const sessionCode = useAssessmentStore((s) => s.sessionCode);
  const activeRole = useAssessmentStore((s) => s.activeRole);
  const answers = useAssessmentStore((s) => s.roles[s.activeRole].answers);
  const competencyIndex = useAssessmentStore(
    (s) => s.roles[s.activeRole].currentCompetencyIndex
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedRef = useRef<string>("");

  const sync = useCallback(async () => {
    if (!sessionCode) return;

    const fingerprint = JSON.stringify(answers);
    if (fingerprint === lastSyncedRef.current) return;

    try {
      await saveResponse(sessionCode, activeRole, answers, competencyIndex);
      lastSyncedRef.current = fingerprint;
    } catch (err) {
      console.error("[sync] Failed:", err);
    }
  }, [sessionCode, activeRole, answers, competencyIndex]);

  useEffect(() => {
    if (!sessionCode) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(sync, 1500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [answers, sync, sessionCode]);

  useEffect(() => {
    if (!sessionCode) return;

    const handleVisChange = () => {
      if (document.visibilityState === "hidden") {
        sync();
      }
    };

    document.addEventListener("visibilitychange", handleVisChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisChange);
  }, [sync, sessionCode]);

  return { syncNow: sync };
}
