import { supabase } from "./supabaseClient";

export interface PlanTask {
  title: string;
  due_date: string;
}

export interface PlanCheckpoint {
  title: string;
  target_date: string;
  rationale?: string;
  tasks: PlanTask[];
}

export interface Plan {
  checkpoints: PlanCheckpoint[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: unknown;
}

export async function generatePlan(params: {
  projectId: string;
  goal: string;
  startDate: string;
  endDate: string;
  messages?: ChatMessage[];
}): Promise<{ plan: Plan; assistantMessage: ChatMessage }> {
  const { data, error } = await supabase.functions.invoke("generate-plan", { body: params });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { plan: Plan; assistantMessage: ChatMessage };
}
