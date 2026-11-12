const names: Record<string, string> = {
  persona: "LIVEKIT_WARMUP_PERSONA_URL", "parli-tutor": "LIVEKIT_WARMUP_PARLI_URL",
  "parli-tutor-nova": "LIVEKIT_WARMUP_NOVA_URL", socrates: "LIVEKIT_WARMUP_SOCRATES_URL",
  "lao-tzu": "LIVEKIT_WARMUP_LAO_TZU_URL", "audre-lorde": "LIVEKIT_WARMUP_AUDRE_URL",
  moderator: "LIVEKIT_WARMUP_MODERATOR_URL",
};
export async function warmupAgent(agentName: string) {
  const key = names[agentName];
  const endpoint = key ? process.env[key] : undefined;
  if (!endpoint) return;
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("Agent warmup failed.");
}
