/**
 * Anthropic Claude client + streaming helper for the trafico.live chatbot.
 *
 * Usage:
 *   import { streamChat } from "@/lib/claude";
 *   for await (const chunk of streamChat({ messages, tools, systemPrompt })) { ... }
 */

import Anthropic from "@anthropic-ai/sdk";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SSEChunk {
  type: "text" | "tool_call" | "tool_result" | "done" | "error";
  delta?: string;
  name?: string;
  input?: Record<string, unknown>;
  preview?: string;
  message?: string;
}

export interface StreamChatOptions {
  messages: ChatMessage[];
  tools?: Anthropic.Tool[];
  systemPrompt?: string;
  executeTool?: (name: string, input: Record<string, unknown>) => Promise<string>;
}

// ─── Client (lazy singleton) ────────────────────────────────────────────────

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (_client) return _client;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  _client = new Anthropic({ apiKey });
  return _client;
}

export function isAnthropicAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const MAX_TOKENS = 2048;
const MAX_TOOL_ITERATIONS = 8;

/**
 * The system prompt for the trafico.live assistant.
 * Kept stable so prompt caching activates on repeated requests.
 * Dynamic context (current time, user info) should be injected via messages, not here.
 */
export const CHAT_SYSTEM_PROMPT = `Eres el asistente de trafico.live, la plataforma de inteligencia de transporte multimodal en tiempo real de España.

Ayudas a usuarios a consultar:
- Tráfico y incidencias en carreteras (DGT)
- Trenes Renfe en tiempo real: alertas, posiciones, retrasos
- Vuelos y aeropuertos AENA
- Barcos y tráfico marítimo (AIS)
- Precios de combustible y gasolineras baratas
- Calidad del aire (ICA, MITECO)
- Condiciones meteorológicas y alertas AEMET
- Estaciones de aforo e IMD histórico

Reglas:
- Responde siempre en español
- Usa las herramientas disponibles para consultar datos actuales antes de responder
- Si los datos no están disponibles, dilo claramente sin inventar
- Sé conciso y directo; usa listas cuando sea útil
- Cita la fuente de los datos (DGT, Renfe, AEMET, etc.)
- No compartas información personal de usuarios
- Si la pregunta no está relacionada con transporte en España, redirige amablemente`;

// ─── Streaming helper ────────────────────────────────────────────────────────

/**
 * Stream a chat completion with optional tool use.
 * Handles multi-turn tool loops internally; yields SSEChunk events.
 */
export async function* streamChat(
  options: StreamChatOptions
): AsyncGenerator<SSEChunk> {
  const { messages, tools = [], systemPrompt = CHAT_SYSTEM_PROMPT, executeTool } = options;

  const client = getClient();

  // Build the messages array for the API
  const apiMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Tool loop: we may need multiple round-trips for tool_use → tool_result
  let iteration = 0;
  let pendingMessages = [...apiMessages];

  while (iteration < MAX_TOOL_ITERATIONS) {
    iteration++;

    // Build request params — prompt caching on system prompt (stable prefix)
    const params: Anthropic.MessageCreateParamsStreaming = {
      model: DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: "text",
          text: systemPrompt,
          // cache_control enables prompt caching for the stable system prompt
          // Minimum 1024 tokens for Sonnet 4.6 caching to activate
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: pendingMessages,
      tools: tools.length > 0 ? tools : undefined,
      stream: true,
    };

    const stream = client.messages.stream(params as Parameters<typeof client.messages.stream>[0]);

    let toolUseBlocks: Anthropic.ToolUseBlock[] = [];
    let hasToolUse = false;

    // Stream text deltas to the client
    for await (const event of stream) {
      if (event.type === "content_block_delta") {
        if (event.delta.type === "text_delta" && event.delta.text) {
          yield { type: "text", delta: event.delta.text };
        }
        if (event.delta.type === "input_json_delta") {
          // Tool input streaming — we'll collect and emit on completion
        }
      }
      if (event.type === "content_block_start") {
        if (event.content_block.type === "tool_use") {
          hasToolUse = true;
          yield {
            type: "tool_call",
            name: event.content_block.name,
            input: {},
          };
        }
      }
    }

    // Get the final message to extract tool use blocks
    const finalMessage = await stream.finalMessage();

    if (finalMessage.stop_reason === "end_turn" || !hasToolUse) {
      yield { type: "done" };
      return;
    }

    if (finalMessage.stop_reason === "tool_use") {
      // Extract all tool_use blocks from the final message content
      toolUseBlocks = finalMessage.content.filter(
        (b: Anthropic.ContentBlock): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      if (toolUseBlocks.length === 0) {
        yield { type: "done" };
        return;
      }

      // Append assistant message with tool_use blocks
      pendingMessages = [
        ...pendingMessages,
        { role: "assistant" as const, content: finalMessage.content },
      ];

      // Execute each tool and collect results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolBlock of toolUseBlocks) {
        const toolInput = toolBlock.input as Record<string, unknown>;

        // Emit tool_call event with actual input
        yield {
          type: "tool_call",
          name: toolBlock.name,
          input: toolInput,
        };

        let resultText: string;
        try {
          if (!executeTool) {
            resultText = `Error: no se puede ejecutar la herramienta "${toolBlock.name}"`;
          } else {
            resultText = await executeTool(toolBlock.name, toolInput);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Error desconocido";
          console.error(`[Claude] Tool execution error (${toolBlock.name}):`, err);
          resultText = `Error al ejecutar ${toolBlock.name}: ${msg}`;
        }

        // Emit preview of tool result
        yield {
          type: "tool_result",
          name: toolBlock.name,
          preview: resultText.slice(0, 120) + (resultText.length > 120 ? "…" : ""),
        };

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolBlock.id,
          content: resultText,
        });
      }

      // Append tool results and continue the loop
      pendingMessages = [
        ...pendingMessages,
        { role: "user" as const, content: toolResults },
      ];

      continue;
    }

    // Any other stop reason — done
    yield { type: "done" };
    return;
  }

  // Exceeded tool iteration limit
  console.warn(`[Claude] Exceeded max tool iterations (${MAX_TOOL_ITERATIONS})`);
  yield {
    type: "error",
    message: "Se excedió el límite de consultas de herramientas. Intenta reformular tu pregunta.",
  };
}
