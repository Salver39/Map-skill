import Papa from "papaparse";
import type { ModelData, AssessmentItem, Competency, ModelMeta } from "@/types";

interface RawModelJSON {
  meta: ModelMeta;
  competencies: Competency[];
}

export async function loadModel(): Promise<ModelData> {
  const [modelRes, itemsRes] = await Promise.all([
    fetch("/data/competency_model.json"),
    fetch("/data/assessment_items.csv"),
  ]);

  if (!modelRes.ok) throw new Error("Failed to load competency_model.json");
  if (!itemsRes.ok) throw new Error("Failed to load assessment_items.csv");

  const modelJson: RawModelJSON = await modelRes.json();
  const itemsCsv = await itemsRes.text();

  const parsed = Papa.parse<Record<string, string>>(itemsCsv, {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
  });

  const competencyIds = new Set(modelJson.competencies.map((c) => c.id));

  const items: AssessmentItem[] = parsed.data
    .filter((row) => {
      if (!row.item_id || row.item_id.startsWith("#")) return false;
      if (!row.competency_id || !row.level_target || !row.statement) return false;
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
          `[data-loader] Unknown competency_id "${item.competency_id}" for item "${item.item_id}"`
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

  return {
    meta: modelJson.meta,
    competencies: modelJson.competencies,
    items,
  };
}
