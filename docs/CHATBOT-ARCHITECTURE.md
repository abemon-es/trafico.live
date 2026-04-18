# Chatbot Architecture — trafico.live

Real-time transport AI assistant powered by Anthropic Claude with MCP-style tool calls against local `/api/*` endpoints.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key. Without this, the chatbot returns 503. |
| `ANTHROPIC_MODEL` | No | Override default model. Default: `claude-sonnet-4-6` |
| `REDIS_URL` | No | Redis for rate limiting + 1h response cache. Falls back to in-memory. |

## Request Flow

```
Browser (ChatWidget)
  → POST /api/chat { messages, conversationId? }
    → Rate limit check (Redis, per-tier daily quota)
    → Cache check (FREE anonymous tier, Redis, 1h TTL)
    → streamChat() → Anthropic Messages API (SSE)
      ↔ Tool loop (up to 8 iterations)
        → executeTool(name, input) → fetch /api/*
        → Append tool_result → continue stream
    → Stream SSE back to browser
Browser parses: { type: "text" | "tool_call" | "tool_result" | "done" | "error" }
```

## Architecture Decisions

### Streaming
All Claude responses stream via SSE. The browser's `useChat` hook reads the `ReadableStream` and incrementally renders text tokens. This avoids request timeouts on long responses.

### Prompt Caching
The system prompt is marked with `cache_control: { type: "ephemeral" }`. Anthropic caches this prefix across requests, reducing cost ~90% for repeated system prompt tokens (after the first request).

Prompt caching is a **prefix match** — the system prompt must be identical across requests. Time-dependent context (e.g., current hour) is injected via user messages, not the system prompt.

### Tool Execution
Tools are executed **server-side only** inside the `/api/chat` route handler. The browser never sees API paths or internal headers. Each tool:
1. Builds a URL for a local `/api/*` endpoint
2. Fetches with `{ "x-internal": "1" }` header (bypasses external auth)
3. Truncates result to ≤4K chars before returning to Claude

All tools are **read-only**. No tool mutates data.

### Rate Limiting

| Tier | Conversations/day | Enforcement |
|---|---|---|
| FREE | 10 | Redis (in-memory fallback) |
| PRO | 100 | Redis |
| ENTERPRISE | 1000 | Redis |

Tier is read from the `x-tier` request header. Default: FREE.
Identifier = first IP from `x-forwarded-for`.
Rate limit keys reset after 24h.

### Response Caching (FREE anonymous tier)
When tier=FREE + no `conversationId` + single user message → cache the assistant's full text response for 1h in Redis using `sha256(normalizedMessage)[0:16]` as key.

This primarily benefits common questions ("¿cómo está el tráfico?") where many users ask the same thing.

**Not cached:** multi-turn conversations, authenticated users (PRO/ENTERPRISE), and any conversation with a `conversationId`.

## Cost Estimation

Model: `claude-sonnet-4-6` ($3/M input, $15/M output)

Typical conversation:
- System prompt: ~300 tokens (cached after first use → ~$0.000090 write, ~$0.000009 read)
- User message: ~50 tokens input
- Tool results (2 tools avg): ~600 tokens input
- Assistant response: ~250 tokens output

**Cost per conversation (cache hit):** ~$0.003–0.006
**Cost per conversation (no cache):** ~$0.005–0.010

Monthly estimate at 1000 conversations/day: ~$90–180/month

### Haiku fallback (optional)
If cost becomes a concern, set `ANTHROPIC_MODEL=claude-haiku-4-5` for ~80% cost reduction at the expense of response quality.

## Tool Inventory

| Tool | Endpoint | Source |
|---|---|---|
| `get_active_incidents` | `/api/incidents` | DGT |
| `get_fuel_prices` | `/api/gas-stations` | MINETUR |
| `get_train_alerts` | `/api/trenes/alertas` | Renfe GTFS-RT |
| `get_train_positions` | `/api/trenes/posiciones` | Renfe LD fleet API |
| `get_aircraft` | `/api/aviacion` | OpenSky |
| `get_vessels` | `/api/maritimo` | aisstream.io AIS |
| `get_air_quality` | `/api/calidad-aire` | MITECO ICA |
| `search_entities` | `/api/search` | Typesense |
| `get_road_details` | `/api/roads/[slug]` | DGT |
| `get_weather_alerts` | `/api/weather-alerts` | AEMET |

## Security

- Tools call `http://localhost:3000/api/*` (server-to-server). No API keys exposed to browser.
- `x-internal: 1` header marks requests as trusted internal calls.
- All tools are read-only (GET requests only).
- Rate limiting prevents abuse from any single IP.
- System prompt instructs Claude never to invent data and to cite sources.

## File Structure

```
src/
  lib/
    claude.ts              — Anthropic client + streamChat() generator
    chat-tools.ts          — 10 tool definitions + executeTool dispatcher
    chat-rate-limit.ts     — Tier-based daily quota (Redis-backed)
  app/api/chat/
    route.ts               — POST handler: rate limit → cache → stream
  components/chat/
    ChatWidget.tsx          — Root: trigger + panel (mount in layout)
    ChatPanel.tsx           — Drawer: messages + input + animations
    ChatMessage.tsx         — User/assistant message bubbles
    ChatInput.tsx           — Textarea + submit + quick-start pills
    useChat.ts              — SSE parsing hook
    index.ts                — Barrel exports
```

## Mounting the Widget

In your root layout or a client component:

```tsx
import dynamic from "next/dynamic";

const ChatWidget = dynamic(
  () => import("@/components/chat/ChatWidget").then((m) => m.ChatWidget),
  { ssr: false }
);

// In your layout JSX:
<ChatWidget />
```

## Future Work (S5+)

- **Voice input:** Web Speech API for `onSpeechResult` → `send()`
- **Persistent conversations:** Store `conversationId` in localStorage; load history from DB
- **Smart suggestions:** After each response, suggest 2-3 follow-up questions based on topic
- **Push notifications:** Alert user when a previously queried incident clears
- **Multimodal:** Accept screenshot uploads for camera/map questions
