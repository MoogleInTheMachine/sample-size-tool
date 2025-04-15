// src/app/api/analyze-bias/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pipeline } from '@xenova/transformers';
import type { ZeroShotClassificationPipeline } from '@xenova/transformers';
let classifier: ZeroShotClassificationPipeline | null = null;

export async function POST(req: NextRequest) {
  const { input, context } = await req.json();

  if (!classifier) {
    classifier = await pipeline('zero-shot-classification', 'Xenova/bart-large-mnli');
  }

  const labels = [
    'Leading bias',
    'Loaded language',
    'Double-barreled question',
    'Negative framing',
    'Absolute language',
    'No bias detected',
  ];

  const fullInput = context ? `${input}\n\nContext:\n${context}` : input;

  const result = await classifier(fullInput, labels);
  const topLabel = result.labels[0];

  const suggestionMap: Record<string, string> = {
    'Leading bias': 'Try rephrasing as an open-ended question.',
    'Loaded language': 'Consider using more neutral terms.',
    'Double-barreled question': 'Split this into two separate questions.',
    'Negative framing': 'Try framing the question in a more neutral or positive way.',
    'Absolute language': "Avoid words like 'always' or 'never' unless truly accurate.",
  };

  return NextResponse.json({
    biasDetected: topLabel !== 'No bias detected',
    biasTypes: topLabel !== 'No bias detected' ? [topLabel] : [],
    suggestion: suggestionMap[topLabel] || '',
  });
}