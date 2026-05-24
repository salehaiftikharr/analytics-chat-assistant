import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

const DEFAULT_ANTHROPIC_MODEL = "claude-opus-4-7";
const DEFAULT_OPENAI_MODEL = "gpt-4.1";

/** The active provider name from LLM_PROVIDER (defaults to "anthropic"). */
export function getProviderName(): string {
  return (process.env.LLM_PROVIDER ?? "anthropic").toLowerCase();
}

/**
 * The provider seam. Returns a Vercel AI SDK `LanguageModel` for the provider
 * selected by LLM_PROVIDER. This is the ONLY place that names a concrete vendor;
 * everything else (prompt, tools, streamText, useChat) is provider-agnostic.
 *
 * Each provider package reads its own API key from the environment
 * (ANTHROPIC_API_KEY / OPENAI_API_KEY).
 */
export function getModel(): LanguageModel {
  const provider = getProviderName();
  switch (provider) {
    case "anthropic":
      return anthropic(process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL);
    case "openai":
      return openai(process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL);
    default:
      throw new Error(
        `Unknown LLM_PROVIDER "${provider}". Expected "anthropic" or "openai".`,
      );
  }
}
