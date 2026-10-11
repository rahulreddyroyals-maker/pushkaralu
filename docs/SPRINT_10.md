# Sprint 10 — AI Pilgrimage Assistant

Page: `/assistant` (English / తెలుగు). API: `POST /api/assistant`.

## How it keeps to the Critical Rule
1. **Facts come from tools, not from the model.** The model can only call read-only tools (`src/features/assistant/tools.ts`): event info + official announcements, ghats (crowd/status), temples, hotels, purohits, transport, parking, emergency directory, itineraries, packages, editorial guides. They read the same published, private-field-stripped data the public site uses, and return records whose figures are formatted by our code.
2. **Two clearly separate outputs.** Every reply is shown as *AI guidance* (model text, labelled, with "General guidance:" prefixes) plus a *Verified platform data* panel (cards from the tool results, each with link, timestamp and caveat). Citation chips in the text only resolve to records the tools actually returned.
3. **Grounding guard** (`guard.ts`) re-checks the model's text and **removes any sentence** that states a price, crowd level, room availability, calendar date, phone number or official announcement that isn't backed by this turn's verified data. If nothing reliable remains, a safe fallback is shown. A notice tells the reader something was removed.
4. **Never invented, by design:** crowd = manual staff entry with timestamp, stale flag, or "Crowd not reported"; hotels = listed price range only, "availability not shown"; purohit pricing quoted as the purohit's own statement; distances are labelled straight-line (never travel times); emergency numbers only from the verified directory (stale verification flagged).
5. **Emergencies bypass the model.** Messages that look like emergencies (EN/TE keywords) get a fixed response plus the verified directory — no model-written advice, no remembered numbers.
6. **Prompt-injection hygiene:** tool results are treated as data; only `user`/`assistant` roles are accepted; user text and history can't add tools or facts; the guard applies regardless of what the model says.

## Provider-agnostic AI layer (`src/lib/ai`)
`LlmProvider` interface + neutral message/tool types. Adapters: `anthropic` (Messages API) and `openai` (any OpenAI-compatible chat-completions endpoint, via `AI_BASE_URL`). Select with env only; add a vendor in `providers/index.ts`. Uses `fetch` — no vendor SDK dependency. Keys are read only in server code (`config.ts`), never sent to the client or logged; provider errors are reduced to a generic 503 for the browser.

## Telugu
Language is detected from the message (falls back to the UI toggle). The system prompt requires Telugu replies; fact labels, notices, emergency text and the whole UI are Telugu strings written in code (`labels.ts`, `emergency.ts`, `AssistantChat.tsx`); record names use the Telugu field when present (English fallback). Please have a native speaker review them.

## Privacy, cost, abuse
- Conversation text is **not stored**. `aiInteractions` logs metadata only (uid or hashed visitor id, provider/model, tools used, counts, tokens, latency).
- Rate limit (fixed window, Firestore `aiRateLimits`): 12 requests/hour anonymous, 40 signed-in (`AI_LIMITS` in `config/app.ts`). Per request: ≤ 12 turns, 1,500 chars/message, 4 model rounds, 8 tool calls.
- Only published/verified records are readable; provider phone numbers are never passed to the model.

## Environment
| Variable | Purpose |
|---|---|
| `AI_PROVIDER` | `anthropic` (default) or `openai` |
| `AI_MODEL` | **required** model id from your provider console |
| `AI_API_KEY` | key (or `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`) — server only, never `NEXT_PUBLIC_` |
| `AI_BASE_URL` | optional gateway / compatible endpoint |
| `AI_ENABLED` | `false` = kill switch |
| `AI_TIMEOUT_MS` | default 30000 |
| `AI_RATE_SALT` | random string used to hash visitor ids |

## Firestore
Collections created at runtime by the server: `aiRateLimits`, `aiInteractions`. No client access needed (Admin SDK only); keep them closed in `firestore.rules`. Optional: add a TTL policy on `aiRateLimits.expiresAt`.

## Known limits
- Lookups read up to 50 records per collection per request (fine for one event; add search indexes if catalogs grow much larger).
- The guard checks English month names and digits (Telugu digits are normalised); Telugu month names are not parsed.
- Replies are not streamed; the answer appears when complete.
- No saved chat history and no admin analytics page for AI usage yet.
