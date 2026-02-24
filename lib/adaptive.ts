import type { AssessmentItem } from "@/types";

export const ADAPTIVE_START_LEVEL = 3;
export const ADAPTIVE_REQUIRED_COUNT = 2;

export interface CompetencyProgress {
  currentLevel: number;
  direction: "initial" | "up" | "down";
  shownItemIds: Record<number, string[]>;
  passedLevels: number[];
  finalized: boolean;
  achievedLevel: number;
}

export function createInitialProgress(): CompetencyProgress {
  return {
    currentLevel: ADAPTIVE_START_LEVEL,
    direction: "initial",
    shownItemIds: {},
    passedLevels: [],
    finalized: false,
    achievedLevel: 1,
  };
}

export function selectItemsForLevel(
  allItems: AssessmentItem[],
  competencyId: string,
  level: number,
  count: number = ADAPTIVE_REQUIRED_COUNT
): AssessmentItem[] {
  return allItems
    .filter((i) => i.competency_id === competencyId && i.level_target === level)
    .sort((a, b) => a.item_id.localeCompare(b.item_id))
    .slice(0, count);
}

export function evaluateLevel(
  answers: Record<string, number>,
  itemIds: string[]
): boolean {
  const scores = itemIds
    .map((id) => answers[id])
    .filter((v): v is number => v !== undefined);

  if (scores.length < Math.min(ADAPTIVE_REQUIRED_COUNT, itemIds.length))
    return false;

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const highCount = scores.filter((v) => v >= 4).length;
  const share = highCount / scores.length;

  return avg >= 4 && share >= 0.6;
}

export function advanceProgress(
  progress: CompetencyProgress,
  pass: boolean
): CompetencyProgress {
  const next: CompetencyProgress = {
    ...progress,
    passedLevels: [...progress.passedLevels],
    shownItemIds: { ...progress.shownItemIds },
  };

  if (pass) {
    next.passedLevels.push(next.currentLevel);

    if (next.direction === "down") {
      next.finalized = true;
      next.achievedLevel = next.currentLevel;
    } else if (next.currentLevel >= 7) {
      next.finalized = true;
      next.achievedLevel = 7;
    } else {
      next.direction = "up";
      next.currentLevel = next.currentLevel + 1;
    }
  } else {
    if (next.direction === "up") {
      next.finalized = true;
      next.achievedLevel =
        next.passedLevels.length > 0 ? Math.max(...next.passedLevels) : 1;
    } else if (next.direction === "initial") {
      if (next.currentLevel <= 2) {
        next.finalized = true;
        next.achievedLevel = 1;
      } else {
        next.direction = "down";
        next.currentLevel = next.currentLevel - 1;
      }
    } else {
      next.finalized = true;
      next.achievedLevel = 1;
    }
  }

  return next;
}

export function hasAvailableItems(
  allItems: AssessmentItem[],
  competencyId: string,
  level: number
): boolean {
  return allItems.some(
    (i) => i.competency_id === competencyId && i.level_target === level
  );
}
