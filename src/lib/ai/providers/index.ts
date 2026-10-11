import type { LlmProvider } from "../types";
import { readAiConfig, type AiConfig } from "../config";
import { createAnthropicProvider } from "./anthropic";
import { createOpenAiProvider } from "./openai";

/** The one place that maps a provider name to an adapter. Add a new vendor here and nowhere else. */
export function createProvider(config: AiConfig = readAiConfig()): LlmProvider {
  switch (config.provider) {
    case "anthropic":
      return createAnthropicProvider(config);
    case "openai":
      return createOpenAiProvider(config);
  }
}
