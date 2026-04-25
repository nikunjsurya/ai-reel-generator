import type { BrandKey, AccentKey } from "./types";

export const ACCENT_HEX: Record<AccentKey, string> = {
  coral: "#E2725B",
  cyan: "#5EEAD4",
  red: "#EF4444",
  green: "#22C55E",
  yellow: "#F5B302",
  orange: "#FBA434",
  purple: "#A78BFA",
  pink: "#F472B6",
  blue: "#60A5FA",
  white: "#F5EDD6",
  muted: "#94A3B8",
};

export type BrandTheme = {
  name: string;
  display: string;
  bg: string;
  bgAccent: string;
  textHeader: string;
  accent: AccentKey;
  accent2: AccentKey;
  watermarkOpacity: number;
};

export const BRAND: Record<BrandKey, BrandTheme> = {
  anthropic: {
    name: "anthropic",
    display: "Claude Code",
    bg: "#0a1020",
    bgAccent: "#0f1729",
    textHeader: "#F5EDD6",
    accent: "coral",
    accent2: "cyan",
    watermarkOpacity: 0.08,
  },
  openai: {
    name: "openai",
    display: "OpenAI",
    bg: "#0a0f12",
    bgAccent: "#0b1618",
    textHeader: "#F5EDD6",
    accent: "cyan",
    accent2: "green",
    watermarkOpacity: 0.08,
  },
  gemini: {
    name: "gemini",
    display: "Gemini",
    bg: "#0b0f1a",
    bgAccent: "#101526",
    textHeader: "#F5EDD6",
    accent: "blue",
    accent2: "purple",
    watermarkOpacity: 0.1,
  },
  google: {
    name: "google",
    display: "Google AI",
    bg: "#0b0f1a",
    bgAccent: "#101526",
    textHeader: "#F5EDD6",
    accent: "blue",
    accent2: "yellow",
    watermarkOpacity: 0.1,
  },
  meta: {
    name: "meta",
    display: "Meta AI",
    bg: "#0a101c",
    bgAccent: "#0f1627",
    textHeader: "#F5EDD6",
    accent: "blue",
    accent2: "purple",
    watermarkOpacity: 0.08,
  },
  xai: {
    name: "xai",
    display: "xAI",
    bg: "#07080a",
    bgAccent: "#0d0e10",
    textHeader: "#F5EDD6",
    accent: "white",
    accent2: "muted",
    watermarkOpacity: 0.08,
  },
  deepseek: {
    name: "deepseek",
    display: "DeepSeek",
    bg: "#0a0e1c",
    bgAccent: "#0f1427",
    textHeader: "#F5EDD6",
    accent: "purple",
    accent2: "blue",
    watermarkOpacity: 0.08,
  },
  mistral: {
    name: "mistral",
    display: "Mistral",
    bg: "#120b07",
    bgAccent: "#1b110b",
    textHeader: "#F5EDD6",
    accent: "orange",
    accent2: "yellow",
    watermarkOpacity: 0.08,
  },
  huggingface: {
    name: "huggingface",
    display: "HuggingFace",
    bg: "#100a05",
    bgAccent: "#1a1208",
    textHeader: "#F5EDD6",
    accent: "yellow",
    accent2: "orange",
    watermarkOpacity: 0.08,
  },
  github: {
    name: "github",
    display: "GitHub",
    bg: "#07090f",
    bgAccent: "#0d1117",
    textHeader: "#F5EDD6",
    accent: "green",
    accent2: "cyan",
    watermarkOpacity: 0.08,
  },
  generic: {
    name: "generic",
    display: "AI News",
    bg: "#0a0a14",
    bgAccent: "#0f0f1a",
    textHeader: "#F5EDD6",
    accent: "cyan",
    accent2: "coral",
    watermarkOpacity: 0.08,
  },
};

export function resolveAccent(a?: AccentKey, fallback: AccentKey = "coral"): string {
  return ACCENT_HEX[a ?? fallback];
}
