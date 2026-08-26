const LAB_FILES: Record<string, string> = {
  Anthropic: "anthropic.svg",
  OpenAI: "openai.svg",
  Google: "google.svg",
  xAI: "xai.svg",
  Meta: "meta.svg",
  Cursor: "cursor.svg",
  "Moonshot AI": "moonshot.svg",
  DeepSeek: "deepseek.svg",
  "Z.ai": "zai.svg",
  Alibaba: "qwen.svg",
  MiniMax: "minimax.svg",
  "Mistral AI": "mistral.svg",
  NVIDIA: "nvidia.svg",
};

export function labLogoSrc(lab: string): string {
  const file = LAB_FILES[lab] ?? "unknown.svg";
  return `${import.meta.env.BASE_URL}logos/${file}`;
}

export function labInitials(lab: string): string {
  const parts = lab.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
