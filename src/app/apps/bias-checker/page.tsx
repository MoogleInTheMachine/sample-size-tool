'use client';

import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface BiasCheckResult {
  biasDetected: boolean;
  biasTypes: string[];
  suggestion?: string;
}

export default function BiasCheckerPage() {
  const [input, setInput] = useState('');
  const [context, setContext] = useState('');
  const [result, setResult] = useState<BiasCheckResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null); // reset previous result 
    setLoading(true);
   

    try {
      const res = await fetch('/api/analyze-bias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, context }),
      });

      if (!res.ok) throw new Error('API request failed');

      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Error:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-6 text-black dark:text-white">
      <h1 className="text-2xl font-bold">Research Question Bias Checker</h1>
      <p className="text-sm text-gray-700 dark:text-gray-300">
        Paste a survey or interview question below and we’ll flag any potential bias in the wording.
      </p>

      <div className="border-l-4 border-yellow-400 bg-yellow-100 dark:bg-yellow-800/30 text-yellow-900 dark:text-yellow-200 p-4 rounded text-sm">
        <strong>⚠️ Work-in-Progress:</strong> This tool is still under construction. The logic used to detect bias is incomplete and may produce incorrect or missing results. Once the core logic is finalized, this disclaimer will be removed. For now, treat all feedback as experimental.
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          placeholder="Enter your research question here..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="min-h-[100px]"
        />
        <Textarea
          placeholder="Optional: Add any context (e.g., purpose, audience)..."
          value={context}
          onChange={(e) => setContext(e.target.value)}
          className="min-h-[60px]"
        />
        <Button type="submit" disabled={loading}>
          {loading ? 'Checking...' : 'Check for Bias'}
        </Button>
      </form>

      {result && (
        <Card className="bg-white text-black dark:bg-[#1c1c2e] dark:text-white transition-colors">
          <CardContent className="py-6 space-y-2">
            <h2 className="text-lg font-semibold">Results:</h2>
            {result.biasDetected ? (
              <>
                <p className="text-red-600 dark:text-red-400">Potential bias detected:</p>
                <ul className="list-disc list-inside">
                  {result.biasTypes.map((bias, idx) => (
                    <li key={idx}>{bias}</li>
                  ))}
                </ul>
                {result.suggestion && (
                  <p className="mt-2 text-sm text-purple-500">Suggestion: {result.suggestion}</p>
                )}
              </>
            ) : (
              <p className="text-green-600 dark:text-green-400">No bias detected. This question appears neutral.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}