export interface LevelDefinition {
  id: number;
  name: string;
}

export interface Competency {
  id: string;
  name: string;
  axis: "Craft" | "Impact" | "Leadership";
  levels: Record<string, string[]>;
}

export interface AssessmentItem {
  item_id: string;
  competency_id: string;
  level_target: number;
  statement: string;
}

export interface ModelMeta {
  version: string;
  levels: LevelDefinition[];
  axes: string[];
}

export interface ModelData {
  meta: ModelMeta;
  competencies: Competency[];
  items: AssessmentItem[];
}

export interface CompetencyResult {
  competencyId: string;
  competencyName: string;
  axis: string;
  achievedLevel: number;
  achievedLevelName: string;
  avgPerLevel: Record<number, number>;
  sharePerLevel: Record<number, number>;
  unansweredCount: number;
  totalItems: number;
  gapToNext: number;
}

export interface AxisScore {
  axis: string;
  scoreFloat: number;
  level: number;
  competencyCount: number;
}

export interface AssessmentResults {
  competencyResults: CompetencyResult[];
  axisScores: Record<string, AxisScore>;
  overallLevel: number;
  overallLevelName: string;
  completionPercent: number;
  totalAnswered: number;
  totalItems: number;
}
