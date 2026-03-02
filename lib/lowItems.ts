import type { ModelData } from "@/types";

export type LowItem = {
  item_id: string;
  competency_id: string;
  level_target: number;
  statement: string;
  axis: string;
  score: number;
};

export function getLowItems(
  model: ModelData,
  answers: Record<string, number>,
  threshold: number = 4
): LowItem[] {
  const compAxisMap = new Map<string, string>();

  for (const [axis, ids] of Object.entries(model.axisMapping)) {
    for (const id of ids) {
      compAxisMap.set(id, axis);
    }
  }

  return model.items
    .map((item) => {
      const score = answers[item.item_id];
      if (score === undefined) return null;
      if (score >= threshold) return null;

      return {
        item_id: item.item_id,
        competency_id: item.competency_id,
        level_target: item.level_target,
        statement: item.statement,
        axis: compAxisMap.get(item.competency_id) ?? "Unknown",
        score,
      };
    })
    .filter((x): x is LowItem => x !== null)
    .sort((a, b) => a.score - b.score);
}
