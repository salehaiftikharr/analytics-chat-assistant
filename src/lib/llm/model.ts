import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export type ProviderName = "anthropic" | "openai";

const DEFAULT_ANTHROPIC_MODEL = "claude-opus-4-7";
const DEFAULT_OPENAI_MODEL = "gpt-4.1";

/**
 * Resolve the provider to use: an explicit per-request choice (from the UI's
 * model switch) takes precedence, then the LLM_PROVIDER env var, then anthropic.
 */
export function resolveProvider(value?: string): ProviderName {
  const choice = (value || process.env.LLM_PROVIDER || "anthropic").toLowerCase();
  if (choice === "anthropic" || choice === "openai") return choice;
  throw new Error(
    `Unknown provider "${choice}". Expected "anthropic" or "openai".`,
  );
}

/**
 * The provider seam. Returns a Vercel AI SDK `LanguageModel` for the chosen
 * provider. `override` comes from the request (the UI switch); when absent we
 * fall back to the env default. This is the ONLY place that names a vendor.
 *
 * Each provider package reads its own API key from the environment
 * (ANTHROPIC_API_KEY / OPENAI_API_KEY).
 */
export function getModel(override?: string): LanguageModel {
  const provider = resolveProvider(override);
  return provider === "openai"
    ? openai(process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL)
    : anthropic(process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL);
}
