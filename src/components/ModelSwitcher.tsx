"use client";

export type ProviderName = "anthropic" | "openai";

interface ModelSwitcherProps {
  provider: ProviderName;
  onChange: (provider: ProviderName) => void;
  disabled?: boolean;
}

const OPTIONS: { id: ProviderName; label: string }[] = [
  { id: "anthropic", label: "Claude" },
  { id: "openai", label: "GPT" },
];

/** Segmented control to switch the LLM provider for new messages. */
export default function ModelSwitcher({
  provider,
  onChange,
  disabled,
}: ModelSwitcherProps) {
  return (
    <div className="model-switch" role="group" aria-label="Model provider">
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`model-switch-option${
            provider === option.id ? " model-switch-option--active" : ""
          }`}
          aria-pressed={provider === option.id}
          disabled={disabled}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
