import { OpenAIProvider } from "./openai";
import type { LLMProvider } from "./types";

/**
 * Ollama provider — uses the OpenAI-compatible API that Ollama exposes.
 * This is just an OpenAIProvider pointed at the Ollama base URL with no API key required.
 */
export class OllamaProvider extends OpenAIProvider implements LLMProvider {
  override name = "ollama";

  constructor(model?: string, baseUrl?: string) {
    const ollamaUrl = baseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    // Ollama's OpenAI-compatible endpoint is at /v1
    const apiBase = ollamaUrl.endsWith("/v1") ? ollamaUrl : `${ollamaUrl}/v1`;
    // Ollama doesn't need a real API key but the OpenAI SDK requires one
    super("ollama", model || process.env.LLM_MODEL || "llama3.2-vision", apiBase);
  }
}
