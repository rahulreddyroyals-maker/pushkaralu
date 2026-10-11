/**
 * Provider-neutral LLM layer. The assistant engine only ever talks to the
 * `LlmProvider` interface below; Anthropic / OpenAI-compatible adapters (and
 * test fakes) implement it. Swapping the model or vendor is a config change
 * (AI_PROVIDER / AI_MODEL) — no assistant code changes.
 */
export interface ToolSpec {
  name: string;
  description: string;
  /** JSON Schema for the arguments object. */
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export type ChatMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: ToolCall[] }
  | { role: "tool"; toolCallId: string; name: string; content: string };

export interface GenerateRequest {
  system: string;
  messages: ChatMessage[];
  tools?: ToolSpec[];
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export interface GenerateResult {
  text: string;
  toolCalls: ToolCall[];
  stopReason: "end" | "tool_use" | "length" | "other";
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  generate(request: GenerateRequest): Promise<GenerateResult>;
}

export class AiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiConfigError";
  }
}

export class AiProviderError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "AiProviderError";
  }
}
