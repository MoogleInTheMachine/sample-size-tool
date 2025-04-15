// src/lib/aiBiasChecker.ts
import { pipeline } from '@xenova/transformers';

// Ensure this only runs client-side
let classifier: any = null;

export async function aiBiasChecker(input: string, context?: string) {
  if (typeof window === 'undefined') return null; // SSR guard

  if (!classifier) {
    classifier = await pipeline('zero-shot-classification', 'Xenova/bart-large-mnli');
  }

  const labels = [
    "Leading bias",
    "Loaded language",
    "Double-barreled question",
    "Negative framing",
    "Absolute language",
    "No bias detected"
  ];

  const fullInput = context ? `${input}\n\nContext:\n${context}` : input;

  const result = await classifier(fullInput, labels);

  const topLabel = result.labels[0];
  const topScore = result.scores[0];

  let severity = "low";
  if (topLabel !== "No bias detected") {
    if (topScore > 0.75) severity = "high";
    else if (topScore > 0.4) severity = "medium";
  }

  const suggestionMap: Record<string, string> = {
    "Leading bias": "Try rephrasing as an open-ended question.",
    "Loaded language": "Consider using more neutral terms.",
    "Double-barreled question": "Split this into two separate questions.",
    "Negative framing": "Try framing the question in a more neutral or positive way.",
    "Absolute language": "Avoid words like 'always' or 'never' unless truly accurate.",
  };

  const suggestion = suggestionMap[topLabel] || "";

  return {
    biasDetected: topLabel !== "No bias detected",
    biasTypes: topLabel !== "No bias detected" ? [topLabel] : [],
    suggestion,
  };
}