import type {
  ModelData,
  AssessmentResults,
  CompetencyResult,
  AxisScore,
  CompetencyGap,
  AssessorRole,
} from "@/types";

export function calculateResults(
  model: ModelData,
  answers: Record<string, number>
): AssessmentResults {
  const totalItems = model.items.length;
  const totalAnswered = model.items.filter(
    (i) => answers[i.item_id] !== undefined
  ).length;
  const completionPercent =
    totalItems > 0 ? Math.round((totalAnswered / totalItems) * 100) : 0;

  const compAxisMap = new Map<string, string>();
  for (const [axis, ids] of Object.entries(model.axisMapping)) {
    for (const id of ids) {
      compAxisMap.set(id, axis);
    }
  }

  const competencyResults: CompetencyResult[] = model.competencies.map(
    (comp) => {
      const compItems = model.items.filter(
        (i) => i.competency_id === comp.id
      );
      const levelsPresent = Array.from(
        new Set(compItems.map((i) => i.level_target))
      ).sort((a, b) => a - b);

      const axis = compAxisMap.get(comp.id) ?? comp.axis;
      const isLeadership = axis === "Leadership";

      let achievedLevel = 1;
      const avgPerLevel: Record<number, number> = {};
      const sharePerLevel: Record<number, number> = {};

      for (const level of levelsPresent) {
        const itemsAtLevel = compItems.filter(
          (i) => i.level_target === level
        );
        const answeredAtLevel = itemsAtLevel
          .map((i) => answers[i.item_id])
          .filter((a): a is number => a !== undefined);

        if (answeredAtLevel.length === 0) {
          avgPerLevel[level] = 0;
          sharePerLevel[level] = 0;
          continue;
        }

        const avg =
          answeredAtLevel.reduce((a, b) => a + b, 0) / answeredAtLevel.length;
        const highCount = answeredAtLevel.filter((a) => a >= 4).length;
        const share = highCount / answeredAtLevel.length;

        avgPerLevel[level] = Math.round(avg * 100) / 100;
        sharePerLevel[level] = Math.round(share * 100) / 100;

        // Pass rules (skips ignored — only answered items count):
        // Leadership: strict — every answered item must be >=4
        // Craft/Impact: >=70% of answered items must be >=4
        const passed = isLeadership
          ? answeredAtLevel.every((a) => a >= 4)
          : share >= 0.7;

        if (passed) {
          achievedLevel = level;
        }
      }

      const nextLevel = achievedLevel < 5 ? achievedLevel + 1 : null;
      const gapToNext = nextLevel !== null ? nextLevel - achievedLevel : 0;

      const unansweredCount = compItems.filter(
        (i) => answers[i.item_id] === undefined
      ).length;

      const levelDef = model.meta.levels.find((l) => l.id === achievedLevel);

      return {
        competencyId: comp.id,
        competencyName: comp.name,
        axis,
        achievedLevel,
        achievedLevelName: levelDef?.name ?? `Level ${achievedLevel}`,
        nextLevel,
        avgPerLevel,
        sharePerLevel,
        unansweredCount,
        totalItems: compItems.length,
        gapToNext,
      };
    }
  );

  const axisScores: Record<string, AxisScore> = {};
  for (const axis of Object.keys(model.axisMapping)) {
    const axisCompIds = new Set(model.axisMapping[axis]);
    const axisCompetencies = competencyResults.filter((cr) =>
      axisCompIds.has(cr.competencyId)
    );
    if (axisCompetencies.length === 0) continue;

    const levels = axisCompetencies.map((cr) => cr.achievedLevel);
    const avg = levels.reduce((a, b) => a + b, 0) / levels.length;

    axisScores[axis] = {
      axis,
      scoreFloat: Math.round(avg * 100) / 100,
      level: Math.max(1, Math.min(5, Math.floor(avg))),
      competencyCount: axisCompetencies.length,
    };
  }

  let overallLevel = 1;
  const axisLevels = Object.values(axisScores).map((a) => a.level);

  if (axisLevels.length >= 3) {
    for (let n = 5; n >= 1; n--) {
      const countAtLeastN = axisLevels.filter((l) => l >= n).length;
      const noneBelowNMinus1 = axisLevels.every((l) => l >= n - 1);

      if (countAtLeastN >= 2 && noneBelowNMinus1) {
        overallLevel = n;
        break;
      }
    }
  }

  const overallLevelDef = model.meta.levels.find(
    (l) => l.id === overallLevel
  );

  return {
    competencyResults,
    axisScores,
    overallLevel,
    overallLevelName: overallLevelDef?.name ?? `Level ${overallLevel}`,
    completionPercent,
    totalAnswered,
    totalItems,
  };
}

export function getWeakestCompetencies(
  results: AssessmentResults,
  axis: string,
  count: number = 2
): CompetencyResult[] {
  return results.competencyResults
    .filter((cr) => cr.axis === axis)
    .sort((a, b) => {
      if (a.achievedLevel !== b.achievedLevel)
        return a.achievedLevel - b.achievedLevel;
      return b.unansweredCount - a.unansweredCount;
    })
    .slice(0, count);
}

export function calculateGaps(
  selfResults: AssessmentResults,
  externalResults: AssessmentResults,
  externalRole: AssessorRole
): CompetencyGap[] {
  return selfResults.competencyResults.map((selfCr) => {
    const extCr = externalResults.competencyResults.find(
      (cr) => cr.competencyId === selfCr.competencyId
    );
    const externalLevel = extCr?.achievedLevel ?? selfCr.achievedLevel;
    const delta = selfCr.achievedLevel - externalLevel;

    return {
      competencyId: selfCr.competencyId,
      competencyName: selfCr.competencyName,
      axis: selfCr.axis,
      selfLevel: selfCr.achievedLevel,
      externalLevel,
      externalRole,
      delta: Math.abs(delta),
      direction: delta > 0 ? "over" : delta < 0 ? "under" : "match",
    };
  });
}
