import Papa from "papaparse";
import type {
  ModelData,
  AssessmentItem,
  Competency,
  ModelMeta,
  AxisMapping,
} from "@/types";

interface RawModelJSON {
  meta: ModelMeta;
  competencies: Competency[];
}

let cachedModel: ModelData | null = null;

export async function loadModel(): Promise<ModelData> {
  if (cachedModel) return cachedModel;

  const [modelRes, itemsRes, axisRes] = await Promise.all([
    fetch("/data/competency_model.json"),
    fetch("/data/assessment_items.csv"),
    fetch("/data/axis_mapping.json"),
  ]);

  if (!modelRes.ok) throw new Error("Failed to load competency_model.json");
  if (!itemsRes.ok) throw new Error("Failed to load assessment_items.csv");
  if (!axisRes.ok) throw new Error("Failed to load axis_mapping.json");

  const modelJson: RawModelJSON = await modelRes.json();
  const itemsCsv = await itemsRes.text();
  const axisMapping: AxisMapping = await axisRes.json();

  const parsed = Papa.parse<Record<string, string>>(itemsCsv, {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
  });

  const competencyIds = new Set(modelJson.competencies.map((c) => c.id));

  const items: AssessmentItem[] = parsed.data
    .filter((row) => {
      if (!row.item_id || row.item_id.startsWith("#")) return false;
      if (!row.competency_id || !row.level_target || !row.statement)
        return false;
      return true;
    })
    .map((row) => ({
      item_id: row.item_id.trim(),
      competency_id: row.competency_id.trim(),
      level_target: parseInt(row.level_target, 10),
      statement: row.statement.trim(),
    }))
    .filter((item) => {
      if (!competencyIds.has(item.competency_id)) {
        console.warn(
          `[data-loader] Unknown competency_id "${item.competency_id}" in CSV item "${item.item_id}"`
        );
        return false;
      }
      if (isNaN(item.level_target) || item.level_target < 1) {
        console.warn(
          `[data-loader] Invalid level_target for item "${item.item_id}"`
        );
        return false;
      }
      return true;
    });

  for (const [axis, ids] of Object.entries(axisMapping)) {
    for (const id of ids) {
      if (!competencyIds.has(id)) {
        console.warn(
          `[data-loader] axis_mapping "${axis}" references unknown competency "${id}"`
        );
      }
    }
  }

  cachedModel = {
    meta: modelJson.meta,
    competencies: modelJson.competencies,
    items,
    axisMapping,
  };

  return cachedModel;
}
