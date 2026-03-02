import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AssessorRole } from "@/types";
import type { ResearcherProfile } from "@/lib/scoring";

interface RoleState {
  answers: Record<string, number>;
  currentCompetencyIndex: number;
  startedAt: string | null;
  lastUpdatedAt: string | null;
}

const emptyRoleState = (): RoleState => ({
  answers: {},
  currentCompetencyIndex: 0,
  startedAt: null,
  lastUpdatedAt: null,
});

interface AssessmentState {
  activeRole: AssessorRole;
  profile: ResearcherProfile;
  roles: Record<AssessorRole, RoleState>;
  sessionCode: string | null;

  setActiveRole: (role: AssessorRole) => void;
  setProfile: (profile: ResearcherProfile) => void;
  setSessionCode: (code: string | null) => void;
  setAnswer: (itemId: string, value: number) => void;
  setCompetencyIndex: (index: number) => void;
  nextCompetency: (totalCompetencies: number) => void;
  prevCompetency: () => void;
  resetRole: (role: AssessorRole) => void;
  resetAll: () => void;
  loadRoleAnswers: (
    role: AssessorRole,
    answers: Record<string, number>,
    competencyIndex: number
  ) => void;
}

export const useAssessmentStore = create<AssessmentState>()(
  persist(
    (set) => ({
      activeRole: "self",
      profile: "ux",
      sessionCode: null,
      roles: {
        self: emptyRoleState(),
        team_lead: emptyRoleState(),
        product_lead: emptyRoleState(),
      },

      setActiveRole: (role) => set({ activeRole: role }),

      setProfile: (profile) => set({ profile }),

      setSessionCode: (code) => set({ sessionCode: code }),

      setAnswer: (itemId, value) =>
        set((state) => {
          const role = state.activeRole;
          const roleState = state.roles[role];
          return {
            roles: {
              ...state.roles,
              [role]: {
                ...roleState,
                answers: { ...roleState.answers, [itemId]: value },
                startedAt: roleState.startedAt || new Date().toISOString(),
                lastUpdatedAt: new Date().toISOString(),
              },
            },
          };
        }),

      setCompetencyIndex: (index) =>
        set((state) => ({
          roles: {
            ...state.roles,
            [state.activeRole]: {
              ...state.roles[state.activeRole],
              currentCompetencyIndex: index,
            },
          },
        })),

      nextCompetency: (totalCompetencies) =>
        set((state) => {
          const role = state.activeRole;
          return {
            roles: {
              ...state.roles,
              [role]: {
                ...state.roles[role],
                currentCompetencyIndex: Math.min(
                  state.roles[role].currentCompetencyIndex + 1,
                  totalCompetencies - 1
                ),
              },
            },
          };
        }),

      prevCompetency: () =>
        set((state) => {
          const role = state.activeRole;
          return {
            roles: {
              ...state.roles,
              [role]: {
                ...state.roles[role],
                currentCompetencyIndex: Math.max(
                  0,
                  state.roles[role].currentCompetencyIndex - 1
                ),
              },
            },
          };
        }),

      resetRole: (role) =>
        set((state) => ({
          roles: {
            ...state.roles,
            [role]: emptyRoleState(),
          },
        })),

      resetAll: () =>
        set({
          activeRole: "self",
          profile: "ux",
          sessionCode: null,
          roles: {
            self: emptyRoleState(),
            team_lead: emptyRoleState(),
            product_lead: emptyRoleState(),
          },
        }),

      loadRoleAnswers: (role, answers, competencyIndex) =>
        set((state) => ({
          roles: {
            ...state.roles,
            [role]: {
              ...state.roles[role],
              answers,
              currentCompetencyIndex: competencyIndex,
              startedAt: state.roles[role].startedAt || new Date().toISOString(),
              lastUpdatedAt: new Date().toISOString(),
            },
          },
        })),
    }),
    {
      name: "uxcx-assessment:v3",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeRole: state.activeRole,
        profile: state.profile,
        sessionCode: state.sessionCode,
        roles: state.roles,
      }),
    }
  )
);
