'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import PValueCurve, { CurveSnapshot } from '@/components/PValueCurve';
import { formatAlpha, formatP, formatPEq } from '@/lib/stats';

const count = (v: number) => Math.round(v).toLocaleString();
const pct = (r: number) => `${(r * 100).toFixed(1)}%`;

const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <li className="grid grid-cols-[2rem_1fr] gap-3">
    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-cyan-500 text-sm font-semibold text-cyan-700 dark:text-cyan-300">
      {n}
    </span>
    <div className="space-y-1">
      <h3 className="font-semibold">{title}</h3>
      <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">{children}</div>
    </div>
  </li>
);

const Math_ = ({ children }: { children: React.ReactNode }) => (
  <div className="font-mono text-xs text-cyan-700 dark:text-cyan-300">{children}</div>
);

// Five-step walkthrough of the z-test, filled with whatever the chart is currently showing
function HowItsCalculated({ s }: { s: CurveSnapshot }) {
  const gapPts = s.diff * 100;
  const sePts = s.se * 100;
  const absZ = Math.abs(s.z);
  const significant = s.p < s.alpha;
  return (
    <ol className="space-y-5">
      <Step n={1} title="Rate">
        <p>Successes divided by people, for each group separately. That gap is the thing you&apos;re testing.</p>
        <Math_>A = {count(s.sA)} ÷ {count(s.nA)} = {pct(s.rateA)}</Math_>
        <Math_>B = {count(s.sX)} ÷ {count(s.nX)} = {pct(s.rateX)}</Math_>
        <Math_>gap = {pct(s.rateX)} − {pct(s.rateA)} = {gapPts.toFixed(1)} points</Math_>
      </Step>
      <Step n={2} title="Pooled rate">
        <p>Both groups lumped together as if they were one.</p>
        <Math_>({count(s.sA)} + {count(s.sX)}) ÷ ({count(s.nA)} + {count(s.nX)}) = {pct(s.pooled)}</Math_>
        <p>
          Why bother? The test starts by assuming there&apos;s no real difference. If that&apos;s true, A and B share one
          true rate, and your best guess at it is everyone combined. The pooled rate is the &quot;nothing&apos;s going
          on&quot; baseline the noise is measured from.
        </p>
      </Step>
      <Step n={3} title="Noise (standard error)">
        <p>
          How much two groups of these sizes would naturally drift apart by luck if they really shared that{' '}
          {pct(s.pooled)} rate. It comes out to about {sePts.toFixed(2)} points. This is the width of the luck curve.
          It&apos;s built from the pooled rate and the sample sizes, which is why more people makes it smaller.
        </p>
        <Math_>
          √( {s.pooled.toFixed(3)} × {(1 - s.pooled).toFixed(3)} × (1/{count(s.nA)} + 1/{count(s.nX)}) ) = {sePts.toFixed(2)} points
        </Math_>
      </Step>
      <Step n={4} title="Z-score">
        <p>
          Your gap divided by the noise. In plain terms, how many noise-widths your result sits away from zero. A z of 0
          means no gap at all. Around 2 is the usual line: a z of 1.96 is exactly p = 0.05, and 2.58 is p = 0.01. So once
          you see the z, you can roughly guess the verdict before the p-value shows up.
        </p>
        <Math_>{gapPts.toFixed(2)} ÷ {sePts.toFixed(2)} ≈ {s.z.toFixed(2)}</Math_>
      </Step>
      <Step n={5} title="p-value">
        <p>
          The tail area beyond ±{absZ.toFixed(2)} on the luck curve, counting both sides. (The pink shading on the chart
          marks the significance cutoff at ±{s.zCrit.toFixed(2)}; the p-value is the area beyond your dot instead.)
        </p>
        <Math_>p = 2 × (1 − Φ({absZ.toFixed(2)})) {formatPEq(s.p)}</Math_>
        <p className={significant ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}>
          {formatP(s.p)} is {significant ? 'below' : 'not below'} the cutoff of α = {formatAlpha(s.alpha)}, so the gap is{' '}
          {significant ? 'statistically significant' : 'not statistically significant'}.
        </p>
      </Step>
    </ol>
  );
}

export default function PValueExplainer() {
  const [aSuccess, setASuccess] = useState('200');
  const [aTotal, setATotal] = useState('2000');
  const [bSuccess, setBSuccess] = useState('240');
  const [bTotal, setBTotal] = useState('2000');
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  const [snap, setSnap] = useState<CurveSnapshot | null>(null);

  const sA = parseInt(aSuccess);
  const nA = parseInt(aTotal);
  const sB = parseInt(bSuccess);
  const nB = parseInt(bTotal);
  const valid = nA > 0 && nB > 0 && sA >= 0 && sB >= 0 && sA <= nA && sB <= nB;
  const alpha = Number((1 - confidenceLevel).toFixed(4));

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-6 text-black dark:text-white">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">P-Value Explainer</h1>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          What does &quot;p = 0.04&quot; actually mean? Drag the sliders to see how sample size and the size of a gap move
          the p-value, then plug in your own test results below.
        </p>
      </div>

      <Card className="bg-white dark:bg-[#1c1c2e] text-black dark:text-white">
        <CardContent className="py-6">
          {valid ? (
            <PValueCurve
              key={`${sA}/${nA}:${sB}/${nB}`}
              seed={{ nA, nX: nB, rateA: sA / nA, rateX: sB / nB }}
              labelA="Group A"
              labelX="Group B"
              alpha={alpha}
              onSnapshot={setSnap}
            />
          ) : (
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              Enter valid numbers below: participants must be at least 1, and successes can&apos;t exceed participants.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-[#1c1c2e] text-black dark:text-white">
        <CardContent className="py-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Try your own numbers</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              These start with example data. Change them and the chart above resets to match. For three or more groups,
              use the <Link href="/apps/significance-calculator" className="underline">Significance Calculator</Link>.
            </p>
          </div>
          {([
            ['Group A', aSuccess, setASuccess, aTotal, setATotal],
            ['Group B', bSuccess, setBSuccess, bTotal, setBTotal],
          ] as const).map(([label, s, setS, t, setT]) => (
            <div key={label} className="grid grid-cols-2 sm:grid-cols-[6rem_1fr_1fr] gap-x-3 gap-y-2 items-center">
              <div className="col-span-2 sm:col-span-1 font-semibold text-sm">{label}</div>
              <label className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <span>Successes</span>
                <Input aria-label={`${label} successes`} value={s} onChange={(e) => setS(e.target.value)} type="number" min="0" />
              </label>
              <label className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <span>Participants</span>
                <Input aria-label={`${label} participants`} value={t} onChange={(e) => setT(e.target.value)} type="number" min="1" />
              </label>
            </div>
          ))}
          <div>
            <label className="block text-sm font-semibold mb-1">Confidence Level</label>
            <select
              value={confidenceLevel}
              onChange={(e) => setConfidenceLevel(parseFloat(e.target.value))}
              className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-[#1c1c2e] text-black dark:text-white"
            >
              <option value={0.90}>90%</option>
              <option value={0.95}>95%</option>
              <option value={0.98}>98%</option>
              <option value={0.99}>99%</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {valid && snap && (
        <Card className="bg-white dark:bg-[#1c1c2e] text-black dark:text-white">
          <CardContent className="py-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">How the numbers are calculated</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Five steps from raw counts to a p-value, using the numbers the chart is showing right now.
              </p>
            </div>
            <HowItsCalculated s={snap} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
