import { describe, it, expect } from "vitest";
import { runAssistant } from "./engine";
import { chat, type AssistantDeps } from "./service";
import { detectLang } from "./lang";
import { straightLineKm, nearestNeighbourOrder } from "./geo";
import { memoizeData } from "./memo";
import { checkRate, createMemoryRateStore } from "./rateLimit";
import { isEmergencyMessage } from "./emergency";
import { chatRequestSchema } from "./schemas";
import { fakeData, scriptedProvider, NOW } from "./testkit";
import { AiProviderError } from "@/lib/ai/types";
import { AI_LIMITS } from "@/config/app";

const turn = (content: string) => [{ role: "user" as const, content }];

describe("engine", () => {
  it("runs the tool loop, returns verified items, and keeps model text separate", async () => {
    const provider = scriptedProvider([
      { toolCalls: [{ id: "c1", name: "search_ghats", arguments: {} }, { id: "c2", name: "search_hotels", arguments: { nearGhatId: "g1" } }] },
      { text: "General guidance: start early. Good options are [[hotel:h2]] near [[ghat:g1]]." },
    ]);
    const r = await runAssistant({ provider, data: fakeData(), turns: turn("Find a hotel near Kotilingala ghat"), now: NOW });
    expect(r.verified.map((v) => v.ref)).toContain("hotel:h2");
    expect(r.verified.map((v) => v.ref)).toContain("ghat:g1");
    expect(r.guidance).toContain("[[hotel:h2]]");
    expect(r.meta.toolNames).toEqual(["search_ghats", "search_hotels"]);
    // the second request carries tool results back to the model
    expect(provider.requests[1].messages.filter((m) => m.role === "tool")).toHaveLength(2);
    expect(provider.requests[0].system).toContain("NEVER state these from memory");
    expect(provider.requests[0].tools?.length).toBeGreaterThan(5);
  });

  it("removes invented facts from the model's answer and says so", async () => {
    const provider = scriptedProvider([{ text: "The hotel costs ₹999 and rooms are available. Carry water and rest often during the long walk to the ghat." }]);
    const r = await runAssistant({ provider, data: fakeData(), turns: turn("hotel?"), now: NOW });
    expect(r.guidance).not.toContain("999");
    expect(r.guidance).not.toMatch(/rooms are available/);
    expect(r.guidance).toContain("Carry water");
    expect(r.notices).toHaveLength(1);
    expect(r.meta.removed).toBe(1);
  });

  it("falls back safely when nothing reliable is left", async () => {
    const provider = scriptedProvider([{ text: "Rooms are available. Cost is ₹500." }]);
    const r = await runAssistant({ provider, data: fakeData(), turns: turn("hotel?"), now: NOW });
    expect(r.guidance).toContain("couldn't put together a reliable answer");
  });

  it("drops invented citations", async () => {
    const provider = scriptedProvider([{ text: "General guidance: visit early, see [[temple:ghost]] for ideas on how to plan the day well." }]);
    const r = await runAssistant({ provider, data: fakeData(), turns: turn("temples?"), now: NOW });
    expect(r.guidance).not.toContain("ghost");
  });

  it("answers emergencies without calling the model, using only verified contacts", async () => {
    const provider = scriptedProvider([{ text: "should never be used" }]);
    const r = await runAssistant({ provider, data: fakeData(), turns: turn("my father has chest pain, need an ambulance"), now: NOW });
    expect(provider.requests).toHaveLength(0);
    expect(r.safetyResponse).toBe(true);
    expect(r.verified.map((v) => v.kind)).toEqual(["emergency", "emergency"]);
    expect(r.guidance).not.toMatch(/\b(108|112|100)\b/);
  });
  it("says it has no verified numbers rather than guessing", async () => {
    const r = await runAssistant({ provider: scriptedProvider([{}]), data: fakeData({ emergency: async () => [] }), turns: turn("ambulance please"), now: NOW });
    expect(r.guidance).toContain("won't guess");
  });
  it("emergency detection (English and Telugu)", () => {
    expect(isEmergencyMessage("my child is missing")).toBe(true);
    expect(isEmergencyMessage("Which ghat is best for a quiet bath?")).toBe(false);
    expect(isEmergencyMessage("someone is drowning")).toBe(true);
    expect(isEmergencyMessage("అంబులెన్స్ కావాలి")).toBe(true);
    expect(isEmergencyMessage("Which temples can I visit in one day?")).toBe(false);
  });

  it("uses Telugu when the user writes Telugu", async () => {
    const provider = scriptedProvider([{ toolCalls: [{ id: "c", name: "search_ghats", arguments: {} }] }, { text: "సాధారణ సూచన: ఉదయాన్నే వెళ్ళండి. [[ghat:g1]] చూడండి." }]);
    const r = await runAssistant({ provider, data: fakeData(), turns: turn("నాతో వృద్ధులు ఉన్నారు, ఘాట్ చూపించండి"), now: NOW });
    expect(r.lang).toBe("te");
    expect(provider.requests[0].system).toContain("Telugu");
    expect(r.verified[0].facts[0].label).toBe("రద్దీ");
  });

  it("stops looping at the round budget and forces a final answer without tools", async () => {
    const loop = { toolCalls: [{ id: "x", name: "search_ghats", arguments: {} }] };
    const provider = scriptedProvider([loop, loop, { text: "General guidance: plan a slow, restful day and keep the schedule light for everyone." }]);
    const r = await runAssistant({ provider, data: fakeData(), turns: turn("plan"), now: NOW, maxRounds: 3 });
    expect(provider.requests).toHaveLength(3);
    expect(provider.requests[2].tools).toBeUndefined();
    expect(r.guidance).toContain("slow, restful");
  });

  it("caps tool calls per turn but still answers every call id", async () => {
    const many = { toolCalls: Array.from({ length: 5 }, (_, i) => ({ id: `c${i}`, name: "search_temples", arguments: {} })) };
    const provider = scriptedProvider([many, { text: "General guidance: take it slowly and keep the plan simple for the whole group." }]);
    await runAssistant({ provider, data: fakeData(), turns: turn("x"), now: NOW, maxToolCalls: 2 });
    const toolMsgs = provider.requests[1].messages.filter((m) => m.role === "tool");
    expect(toolMsgs).toHaveLength(5);
    expect(toolMsgs.filter((m) => m.role === "tool" && m.content.includes("limit reached"))).toHaveLength(3);
  });
});

describe("service", () => {
  const baseDeps = (over: Partial<AssistantDeps> = {}): AssistantDeps & { logs: Record<string, unknown>[] } => {
    const logs: Record<string, unknown>[] = [];
    return {
      enabled: () => true,
      provider: () => scriptedProvider([{ text: "General guidance: keep a gentle pace and rest often along the way." }]),
      data: fakeData(),
      rateStore: createMemoryRateStore(),
      now: () => NOW,
      log: async (e) => { logs.push(e); },
      logs,
      ...over,
    };
  };
  const body = { messages: [{ role: "user", content: "hello" }] };

  it("validates input", async () => {
    const d = baseDeps();
    expect((await chat(d, null, "v", { messages: [] })).ok).toBe(false);
    expect((await chat(d, null, "v", { messages: [{ role: "assistant", content: "x" }] })).ok).toBe(false);
    expect((await chat(d, null, "v", { messages: [{ role: "user", content: "x".repeat(AI_LIMITS.maxCharsPerMessage + 1) }] })).ok).toBe(false);
    expect(chatRequestSchema.safeParse({ messages: [{ role: "user", content: "ok" }], lang: "fr" }).success).toBe(false);
  });
  it("is off when disabled", async () => {
    const r = await chat(baseDeps({ enabled: () => false }), null, "v", body);
    expect(r).toMatchObject({ ok: false, status: 503 });
  });
  it("rate-limits anonymous users sooner than signed-in users", async () => {
    const d = baseDeps();
    for (let i = 0; i < AI_LIMITS.anonymousPerHour; i++) expect((await chat(d, null, "same", body)).ok).toBe(true);
    const blocked = await chat(d, null, "same", body);
    expect(blocked).toMatchObject({ ok: false, status: 429 });
    expect((await chat(d, { uid: "u1" }, "same", body)).ok).toBe(true);
    expect((await chat(d, null, "other-visitor", body)).ok).toBe(true);
  });
  it("hides provider failures behind a generic 503", async () => {
    const d = baseDeps({ provider: () => ({ name: "x", model: "m", generate: async () => { throw new AiProviderError("key sk-secret rejected", 401); } }) });
    const r = await chat(d, null, "v", body);
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).not.toContain("sk-secret");
    expect(r).toMatchObject({ status: 503 });
  });
  it("logs usage metadata only — never the conversation text", async () => {
    const d = baseDeps();
    await chat(d, { uid: "u1" }, "v", { messages: [{ role: "user", content: "my secret plan with my mother" }] });
    await new Promise((r) => setTimeout(r, 5));
    expect(d.logs).toHaveLength(1);
    expect(JSON.stringify(d.logs[0])).not.toContain("secret plan");
    expect(d.logs[0]).toMatchObject({ actor: "u1", provider: "scripted" });
  });
  it("returns reply shape without internal meta", async () => {
    const r = await chat(baseDeps(), null, "v", body);
    expect(r.ok && Object.keys(r.data).sort()).toEqual(["guidance", "lang", "notices", "remaining", "verified"]);
  });
});

describe("helpers", () => {
  it("detects language", () => {
    expect(detectLang("హైదరాబాద్ నుండి వస్తున్నాను")).toBe("te");
    expect(detectLang("Which temples?", "te")).toBe("en");
    expect(detectLang("12345", "te")).toBe("te");
    expect(detectLang("Hotel near కోటిలింగాల ఘాట్ please", "en")).toBe("te");
  });
  it("measures straight-line distance", () => {
    expect(straightLineKm({ latitude: 17, longitude: 81 }, { latitude: 17, longitude: 81 })).toBe(0);
    expect(straightLineKm({ latitude: 17, longitude: 81 }, { latitude: 18, longitude: 81 })).toBeGreaterThan(110);
    const o = nearestNeighbourOrder([{ location: { latitude: 17.5, longitude: 81 } }, { location: { latitude: 17.1, longitude: 81 } }], { latitude: 17, longitude: 81 });
    expect(o[0].location.latitude).toBe(17.1);
  });
  it("memoises per request", async () => {
    let n = 0;
    const m = memoizeData(fakeData({ hotels: async () => { n++; return []; } }));
    await m.hotels();
    await m.hotels();
    expect(n).toBe(1);
  });
  it("fixed-window limiter resets after the window", async () => {
    const s = createMemoryRateStore();
    expect((await checkRate(s, "k", 2, 1000, 0)).allowed).toBe(true);
    expect((await checkRate(s, "k", 2, 1000, 10)).allowed).toBe(true);
    const third = await checkRate(s, "k", 2, 1000, 20);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
    expect((await checkRate(s, "k", 2, 1000, 1500)).allowed).toBe(true);
  });
});
