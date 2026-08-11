// Calls the Anthropic API to draft a project plan (checkpoints + tasks) from a
// goal description, and returns it to the client for review. Nothing is
// written to the database here — the client bulk-inserts the reviewed draft
// under the owner's own RLS, same as CheckpointForm does today.
//
//   POST { projectId, goal, startDate, endDate, messages: {role, content}[] }
//   -> { plan: { checkpoints: [{ title, target_date, rationale, tasks: [{ title, due_date }] }] } }
//
// Env vars (set via `supabase secrets set`):
//   ANTHROPIC_API_KEY
//   SUPABASE_URL, SUPABASE_ANON_KEY (auto-provided by Supabase)
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_TOOL = {
  name: "propose_plan",
  description: "Propose a project plan broken into checkpoints (milestones) with tasks under each.",
  input_schema: {
    type: "object",
    properties: {
      checkpoints: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            target_date: { type: "string", description: "YYYY-MM-DD" },
            rationale: { type: "string", description: "One sentence on why this checkpoint matters." },
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  due_date: { type: "string", description: "YYYY-MM-DD, on or before the checkpoint's target_date" },
                },
                required: ["title", "due_date"],
              },
            },
          },
          required: ["title", "target_date", "tasks"],
        },
      },
    },
    required: ["checkpoints"],
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { projectId, goal, startDate, endDate, messages } = await req.json();
  if (!projectId || !goal || !startDate || !endDate) {
    return json({ error: "Missing projectId, goal, startDate, or endDate" }, 400);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return json({ error: "Not authenticated" }, 401);

  // RLS already scopes this select to projects the caller can see; only the
  // owner may act on it here.
  const { data: project } = await userClient.from("projects").select("id, owner_id").eq("id", projectId).single();
  if (!project || project.owner_id !== user.id) {
    return json({ error: "Only the project owner can generate a plan" }, 403);
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "AI planning isn't configured yet (missing ANTHROPIC_API_KEY)." }, 500);

  const systemPrompt =
    `You are a pragmatic project-planning assistant. A user is planning a project ` +
    `that runs from ${startDate} to ${endDate}. Break their goal into a small number ` +
    `of checkpoints (milestones), each with a target_date within that range, and a ` +
    `handful of concrete tasks under each checkpoint with due_date on or before the ` +
    `checkpoint's target_date. Keep titles short and actionable. Always call the ` +
    `propose_plan tool with your answer — never respond in plain prose.`;

  const chatMessages = [
    ...(Array.isArray(messages) ? messages : []),
    { role: "user", content: messages?.length ? goal : `Project goal: ${goal}` },
  ];

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 4096,
      system: systemPrompt,
      messages: chatMessages,
      tools: [PLAN_TOOL],
      tool_choice: { type: "tool", name: "propose_plan" },
    }),
  });

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text();
    return json({ error: `AI request failed: ${errText}` }, 502);
  }

  const anthropicJson = await anthropicRes.json();
  const toolUse = (anthropicJson.content ?? []).find((block: { type: string }) => block.type === "tool_use");
  if (!toolUse) return json({ error: "AI did not return a plan" }, 502);

  return json({ plan: toolUse.input, assistantMessage: { role: "assistant", content: anthropicJson.content } });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
