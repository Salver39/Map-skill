import { getSupabase } from "./supabase";
import type { AssessorRole } from "@/types";

export interface SessionResponse {
  id: string;
  session_code: string;
  role: AssessorRole;
  answers: Record<string, number>;
  competency_index: number;
  started_at: string;
  updated_at: string;
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export async function createSession(): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase не настроен");

  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode();

    const { data } = await sb
      .from("assessment_responses")
      .select("session_code")
      .eq("session_code", code)
      .limit(1);

    if (data && data.length === 0) {
      return code;
    }
  }

  throw new Error("Не удалось сгенерировать уникальный код");
}

export async function checkSessionExists(
  code: string
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const { data } = await sb
    .from("assessment_responses")
    .select("session_code")
    .eq("session_code", code.toUpperCase())
    .limit(1);

  return (data?.length ?? 0) > 0;
}

export async function saveResponse(
  sessionCode: string,
  role: AssessorRole,
  answers: Record<string, number>,
  competencyIndex: number
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const { error } = await sb.from("assessment_responses").upsert(
    {
      session_code: sessionCode,
      role,
      answers,
      competency_index: competencyIndex,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_code,role" }
  );

  if (error) {
    console.error("[session] Save error:", error);
    throw error;
  }
}

export async function loadSessionResponses(
  sessionCode: string
): Promise<SessionResponse[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("assessment_responses")
    .select("*")
    .eq("session_code", sessionCode);

  if (error) {
    console.error("[session] Load error:", error);
    return [];
  }

  return (data ?? []) as SessionResponse[];
}

export async function loadRoleResponse(
  sessionCode: string,
  role: AssessorRole
): Promise<SessionResponse | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("assessment_responses")
    .select("*")
    .eq("session_code", sessionCode)
    .eq("role", role)
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as SessionResponse;
}
