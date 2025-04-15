export const runtime = 'nodejs';
process.env.HF_CACHE = '/tmp/transformers';
import { NextRequest, NextResponse } from 'next/server';
import { pipeline } from '@xenova/transformers';
import type { ZeroShotClassificationPipeline } from '@xenova/transformers';

let classifier: ZeroShotClassificationPipeline | null = null;

export async function POST(req: NextRequest) {
  try {
    const { input, context } = await req.json();
    console.log('[API] Received input:', input);
    if (!classifier) {
      console.log('[API] Initializing classifier...');
      classifier = await pipeline('zero-shot-classification', 'Xenova/bart-large-mnli') as ZeroShotClassificationPipeline;
      console.log('[API] Classifier loaded.');
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
    console.log('[API] Running classification...');
    const result = await classifier(fullInput, labels);
    console.log('[API] Classification result:', result);

    if (Array.isArray(result)) {
      throw new Error("Expected a single classification result, but got an array.");
    }

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

  } catch (error) {
    const err = error as Error;
    console.error('[API ERROR] analyze-bias route:', err);
    return new NextResponse(
      JSON.stringify({ error: 'Something went wrong on the server.', detail: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}