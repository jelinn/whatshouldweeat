import { ClaudeProvider } from "./claude";
import { OpenAIProvider } from "./openai";
import { OllamaProvider } from "./ollama";
import type { LLMProvider, LLMConfig } from "./types";

export type { LLMProvider, LLMConfig, RecommendationContext, Recommendation, RecipeGenerationPrompt } from "./types";

// Singleton instance
let providerInstance: LLMProvider | null = null;

// Get the configured LLM provider
export function getLLMProvider(config?: Partial<LLMConfig>): LLMProvider {
  if (providerInstance && !config) {
    return providerInstance;
  }

  const providerType = config?.provider || process.env.LLM_PROVIDER || "claude";

  switch (providerType) {
    case "claude":
      providerInstance = new ClaudeProvider(
        config?.apiKey || process.env.ANTHROPIC_API_KEY,
        config?.model || process.env.LLM_MODEL
      );
      break;
    case "openai":
      providerInstance = new OpenAIProvider(
        config?.apiKey || process.env.OPENAI_API_KEY,
        config?.model || process.env.LLM_MODEL,
        config?.baseUrl
      );
      break;
    case "ollama":
      providerInstance = new OllamaProvider(
        config?.model || process.env.LLM_MODEL,
        config?.baseUrl || process.env.OLLAMA_BASE_URL
      );
      break;
    default:
      throw new Error(`Unknown LLM provider: ${providerType}`);
  }

  return providerInstance;
}

// Check if LLM is configured
export function isLLMConfigured(): boolean {
  const provider = process.env.LLM_PROVIDER || "claude";

  switch (provider) {
    case "claude":
      return !!process.env.ANTHROPIC_API_KEY;
    case "openai":
      return !!process.env.OPENAI_API_KEY;
    case "ollama":
      return true; // Ollama doesn't need API key
    default:
      return false;
  }
}
