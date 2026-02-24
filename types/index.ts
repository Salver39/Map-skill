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

export type AxisMapping = Record<string, string[]>;

export interface ModelData {
  meta: ModelMeta;
  competencies: Competency[];
  items: AssessmentItem[];
  axisMapping: AxisMapping;
}

// --- Multi-role ---

export type AssessorRole = "self" | "team_lead" | "product_lead";

export interface RoleInfo {
  id: AssessorRole;
  name: string;
  shortName: string;
  description: string;
  color: string;
  bgClass: string;
  textClass: string;
}

export const ASSESSOR_ROLES: RoleInfo[] = [
  {
    id: "self",
    name: "Самооценка",
    shortName: "Само",
    description: "Исследователь оценивает себя",
    color: "#4c6ef5",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
  },
  {
    id: "team_lead",
    name: "Лид команды",
    shortName: "Лид",
    description: "Оценка от лида исследователей",
    color: "#37b24d",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
  },
  {
    id: "product_lead",
    name: "Лид продукта",
    shortName: "Продакт",
    description: "Оценка от продуктового лида",
    color: "#f59f00",
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
  },
];

export function getRoleInfo(role: AssessorRole): RoleInfo {
  return ASSESSOR_ROLES.find((r) => r.id === role) ?? ASSESSOR_ROLES[0];
}

// --- Results ---

export interface CompetencyResult {
  competencyId: string;
  competencyName: string;
  axis: string;
  achievedLevel: number;
  achievedLevelName: string;
  nextLevel: number | null;
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

export interface CompetencyGap {
  competencyId: string;
  competencyName: string;
  axis: string;
  selfLevel: number;
  externalLevel: number;
  externalRole: AssessorRole;
  delta: number;
  direction: "over" | "under" | "match";
}
