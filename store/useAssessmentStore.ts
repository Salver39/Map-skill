import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface AssessmentState {
  answers: Record<string, number>;
  currentCompetencyIndex: number;
  startedAt: string | null;
  lastUpdatedAt: string | null;

  setAnswer: (itemId: string, value: number) => void;
  setCompetencyIndex: (index: number) => void;
  nextCompetency: (totalCompetencies: number) => void;
  prevCompetency: () => void;
  reset: () => void;
  hasProgress: () => boolean;
}

export const useAssessmentStore = create<AssessmentState>()(
  persist(
    (set, get) => ({
      answers: {},
      currentCompetencyIndex: 0,
      startedAt: null,
      lastUpdatedAt: null,

      setAnswer: (itemId, value) =>
        set((state) => ({
          answers: { ...state.answers, [itemId]: value },
          startedAt: state.startedAt || new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString(),
        })),

      setCompetencyIndex: (index) =>
        set({ currentCompetencyIndex: index }),

      nextCompetency: (totalCompetencies) =>
        set((state) => ({
          currentCompetencyIndex: Math.min(
            state.currentCompetencyIndex + 1,
            totalCompetencies - 1
          ),
        })),

      prevCompetency: () =>
        set((state) => ({
          currentCompetencyIndex: Math.max(0, state.currentCompetencyIndex - 1),
        })),

      reset: () =>
        set({
          answers: {},
          currentCompetencyIndex: 0,
          startedAt: null,
          lastUpdatedAt: null,
        }),

      hasProgress: () => Object.keys(get().answers).length > 0,
    }),
    {
      name: "uxcx-assessment:v1",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
