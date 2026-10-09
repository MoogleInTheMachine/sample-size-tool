'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { useTheme } from 'next-themes';
import { ChartData, ChartOptions } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
ChartJS.register(annotationPlugin);

const LETTERS = 'ABCDEFGH';
const MAX_GROUPS = LETTERS.length;

// Bar fills/borders, cycled per group (Group A keeps the original neon cyan, B the magenta)
const BAR_COLORS = [
  ['rgba(0, 255, 255, 0.3)', '#00FFFF'],
  ['rgba(255, 0, 255, 0.3)', '#FF00FF'],
  ['rgba(163, 255, 18, 0.3)', '#A3FF12'],
  ['rgba(255, 159, 28, 0.3)', '#FF9F1C'],
  ['rgba(123, 97, 255, 0.3)', '#7B61FF'],
  ['rgba(255, 82, 82, 0.3)', '#FF5252'],
  ['rgba(60, 233, 255, 0.3)', '#3CE9FF'],
  ['rgba(255, 214, 10, 0.3)', '#FFD60A'],
];

type Group = { id: number; success: string; total: string };

// Standard normal CDF (Abramowitz & Stegun 7.1.26, error < 1.5e-7)
function normCdf(x: number) {
  const t = 1 / (1 + (0.3275911 * Math.abs(x)) / Math.SQRT2);
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  const erf = 1 - poly * Math.exp((-x * x) / 2);
  return x >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

// Inverse standard normal CDF (Acklam's rational approximation)
function normInv(p: number) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const tail = (q: number) =>
    (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  if (p < 0.02425) return tail(Math.sqrt(-2 * Math.log(p)));
  if (p > 1 - 0.02425) return -tail(Math.sqrt(-2 * Math.log(1 - p)));
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

// Two-proportion z-test of group X against control A (pooled standard error, two-sided p)
function twoProportion(sA: number, nA: number, sX: number, nX: number) {
  const rateA = sA / nA;
  const rateX = sX / nX;
  const diff = rateX - rateA;
  const pooled = (sA + sX) / (nA + nX);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / nA + 1 / nX));
  const z = se > 0 ? diff / se : 0;
  const p = se > 0 ? 2 * (1 - normCdf(Math.abs(z))) : 1;
  return { rateA, rateX, diff, pooled, se, z, p };
}

const formatP = (p: number) => (p < 0.001 ? '< 0.001' : p.toFixed(3));
const formatPts = (pts: number) => `${pts > 0 ? '+' : ''}${pts.toFixed(1)} pts`;
const formatAlpha = (a: number) => String(Number(a.toFixed(4)));

const AXIS_STEPS = [0.5, 1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100];
const niceCeil = (v: number) => AXIS_STEPS.find((s) => s >= v) ?? 100;

type CurveSeed = { nA: number; nX: number; rateA: number; rateX: number };

// Interactive null-distribution curve. Remounted (via key) whenever the seed changes, so the
// what-if sliders always start from the user's real numbers.
function PValueCurve({ seed, labelA, labelX, alpha, bonferroni }: {
  seed: CurveSeed;
  labelA: string;
  labelX: string;
  alpha: number;
  bonferroni: boolean;
}) {
  const seedN = Math.round((seed.nA + seed.nX) / 2);
  const seedStats = twoProportion(seed.rateA * seed.nA, seed.nA, seed.rateX * seed.nX, seed.nX);
  const [whatIf, setWhatIf] = useState<{ n: number; rA: number; rX: number } | null>(null);

  const n = whatIf?.n ?? seedN;
  const rA = whatIf?.rA ?? seed.rateA * 100;
  const rX = whatIf?.rX ?? seed.rateX * 100;
  const usingSeed = whatIf === null;
  const stats = usingSeed ? seedStats : twoProportion((rA / 100) * n, n, (rX / 100) * n, n);

  const gapPts = stats.diff * 100;
  const sePts = stats.se * 100;
  const zCrit = normInv(1 - alpha / 2);
  const significant = stats.p < alpha;

  // Axis is fixed from the seed so dragging visibly squeezes/widens the curve
  const range = niceCeil(Math.max(4 * seedStats.se * 100, 1.4 * Math.abs(seedStats.diff * 100), 0.5));
  const nMin = 10;
  const nMax = Math.max(10000, seedN * 10);
  const rateMax = Math.min(100, Math.max(20, Math.ceil((Math.max(seed.rateA, seed.rateX) * 200) / 10) * 10));

  const W = 600;
  const H = 190;
  const left = 20;
  const right = W - 20;
  const base = 160;
  const peak = 130;
  const toX = (pts: number) => left + ((pts + range) / (2 * range)) * (right - left);
  const curveY = (pts: number) => (sePts > 0 ? base - peak * Math.exp(-(pts * pts) / (2 * sePts * sePts)) : base);

  const samples = 240;
  const xs = Array.from({ length: samples + 1 }, (_, i) => -range + (2 * range * i) / samples);
  const curvePath = xs.map((pts, i) => `${i ? 'L' : 'M'}${toX(pts).toFixed(1)},${curveY(pts).toFixed(1)}`).join(' ');
  const cutoff = zCrit * sePts;
  const tailPath = (from: number, to: number) => {
    if (to <= from) return '';
    const pts = xs.filter((v) => v > from && v < to);
    const line = [from, ...pts, to].map((v) => `L${toX(v).toFixed(1)},${curveY(v).toFixed(1)}`).join(' ');
    return `M${toX(from).toFixed(1)},${base} ${line} L${toX(to).toFixed(1)},${base} Z`;
  };

  const dotPts = Math.max(-range, Math.min(range, gapPts));
  const offChart = dotPts !== gapPts;

  const nToPos = (v: number) => Math.round((1000 * Math.log(v / nMin)) / Math.log(nMax / nMin));
  const posToN = (pos: number) => Math.round(nMin * Math.pow(nMax / nMin, pos / 1000));
  const update = (patch: Partial<{ n: number; rA: number; rX: number }>) => setWhatIf({ n, rA, rX, ...patch });

  return (
    <div className="space-y-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
        aria-label={`Null distribution curve. Observed gap ${formatPts(gapPts)}, p-value ${formatP(stats.p)}.`}>
        <path d={tailPath(-range, -cutoff)} className="fill-pink-500/45" />
        <path d={tailPath(cutoff, range)} className="fill-pink-500/45" />
        <line x1={left} x2={right} y1={base} y2={base} className="stroke-gray-400 dark:stroke-gray-600" strokeWidth={1} />
        <line x1={toX(0)} x2={toX(0)} y1={base - peak - 6} y2={base} className="stroke-gray-400 dark:stroke-gray-500" strokeDasharray="3 3" strokeWidth={1} />
        <path d={curvePath} fill="none" className="stroke-cyan-600 dark:stroke-cyan-300" strokeWidth={2} />
        <circle cx={toX(dotPts)} cy={curveY(dotPts)} r={5} className="fill-pink-600 dark:fill-pink-400" />
        {offChart && (
          <text x={toX(dotPts) + (dotPts > 0 ? -8 : 8)} y={curveY(dotPts) - 10} textAnchor={dotPts > 0 ? 'end' : 'start'}
            className="fill-pink-600 dark:fill-pink-400" fontSize={11}>
            dot is off the chart ({formatPts(gapPts)})
          </text>
        )}
        <text x={left} y={base + 18} fontSize={11} className="fill-gray-600 dark:fill-gray-400">-{range} pts</text>
        <text x={toX(0)} y={base + 18} fontSize={11} textAnchor="middle" className="fill-gray-600 dark:fill-gray-400">0 (no difference)</text>
        <text x={right} y={base + 18} fontSize={11} textAnchor="end" className="fill-gray-600 dark:fill-gray-400">+{range} pts</text>
      </svg>

      <div className="space-y-3">
        <div className="grid grid-cols-[9rem_1fr_5rem] items-center gap-3 text-sm">
          <label htmlFor="wi-n">People per group</label>
          <input id="wi-n" type="range" min={0} max={1000} value={nToPos(n)}
            onChange={(e) => update({ n: posToN(Number(e.target.value)) })} className="w-full accent-cyan-500" />
          <span className="text-right font-semibold tabular-nums">{n.toLocaleString()}</span>
        </div>
        <div className="grid grid-cols-[9rem_1fr_5rem] items-center gap-3 text-sm">
          <label htmlFor="wi-a">{labelA} rate</label>
          <input id="wi-a" type="range" min={0} max={rateMax} step={0.1} value={rA}
            onChange={(e) => update({ rA: Number(e.target.value) })} className="w-full accent-cyan-500" />
          <span className="text-right font-semibold tabular-nums">{rA.toFixed(1)}%</span>
        </div>
        <div className="grid grid-cols-[9rem_1fr_5rem] items-center gap-3 text-sm">
          <label htmlFor="wi-x">{labelX} rate</label>
          <input id="wi-x" type="range" min={0} max={rateMax} step={0.1} value={rX}
            onChange={(e) => update({ rX: Number(e.target.value) })} className="w-full accent-pink-500" />
          <span className="text-right font-semibold tabular-nums">{rX.toFixed(1)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Gap (dot position)</div>
          <div className="text-xl font-semibold tabular-nums">{formatPts(gapPts)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Luck wobble (curve width)</div>
          <div className="text-xl font-semibold tabular-nums">{sePts.toFixed(2)} pts</div>
        </div>
        <div>
          <div className="text-xs text-gray-600 dark:text-gray-400">p-value</div>
          <div className={`text-xl font-semibold tabular-nums ${significant ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
            {formatP(stats.p)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400">
        <span>
          Significant when p &lt; {formatAlpha(alpha)}{bonferroni ? ' (Bonferroni adjusted)' : ''}.
          {usingSeed && seed.nA !== seed.nX ? ' Sliders treat both groups as the same size.' : ''}
        </span>
        {!usingSeed && (
          <Button type="button" onClick={() => setWhatIf(null)} className="px-3 py-1 text-xs">
            Reset to my numbers
          </Button>
        )}
      </div>

      <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
        <li>
          The curve shows every gap you could get from <strong>luck alone</strong> if {labelX} and {labelA} truly performed
          the same. Its width is the luck wobble (the standard error).
        </li>
        <li>
          The shaded tails are the &quot;too unlikely to be luck&quot; zone. Together they hold {formatAlpha(alpha * 100)}% of the curve.
        </li>
        <li>
          The dot is your observed gap. The <strong>p-value</strong> is the share of the curve that sits at least as far from
          zero as the dot, on both sides. Dot inside a shaded tail means p is below the cutoff, so the result is significant.
        </li>
        <li>
          Drag people per group up and the curve squeezes. It shrinks with the square root of the sample: four times the
          people halves the wobble, which is why big samples can detect small gaps.
        </li>
      </ul>
    </div>
  );
}

const emptyGroups = (): Group[] => [
  { id: 0, success: '', total: '' },
  { id: 1, success: '', total: '' },
];

export default function SignificanceCalculator() {
  const { resolvedTheme } = useTheme();
  const [groups, setGroups] = useState<Group[]>(emptyGroups);
  const [nextId, setNextId] = useState(2);
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  const [bonferroniOn, setBonferroniOn] = useState(true);
  const [explainMode, setExplainMode] = useState<'rate' | 'pvalue'>('rate');
  const [curveTargetId, setCurveTargetId] = useState<number | null>(null);

  const parsed = groups.map((g, i) => {
    const s = parseInt(g.success);
    const n = parseInt(g.total);
    return { ...g, label: `Group ${LETTERS[i]}`, s, n, valid: n > 0 && s >= 0 && s <= n };
  });
  const control = parsed[0];
  const comparisons = control.valid
    ? parsed.slice(1).filter((g) => g.valid).map((g) => ({ group: g, ...twoProportion(control.s, control.n, g.s, g.n) }))
    : [];

  const alpha = Number((1 - confidenceLevel).toFixed(4));
  const bonferroni = groups.length >= 3 && bonferroniOn;
  // Bonferroni counts the planned comparisons (every group vs A), even ones not filled in yet
  const testCount = groups.length - 1;
  const alphaAdj = bonferroni ? alpha / testCount : alpha;
  const curveTarget = comparisons.find((c) => c.group.id === curveTargetId) ?? comparisons[0];

  const dark = resolvedTheme === 'dark';
  const textColor = dark ? '#FFFFFF' : '#1F2937';
  const gridColor = dark ? '#334155' : '#E5E7EB';
  const validGroups = parsed.filter((g) => g.valid);

  const chartData: ChartData<'bar'> = {
    labels: validGroups.map((g) => g.label),
    datasets: [{
      label: 'Success Rate',
      data: validGroups.map((g) => (g.s / g.n) * 100),
      backgroundColor: validGroups.map((g) => BAR_COLORS[parsed.indexOf(g) % BAR_COLORS.length][0]),
      borderColor: validGroups.map((g) => BAR_COLORS[parsed.indexOf(g) % BAR_COLORS.length][1]),
      borderWidth: 2,
    }],
  };

  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      legend: { labels: { color: textColor }, position: 'top' },
      title: { display: true, text: 'Success Rate Comparison', color: textColor },
    },
    scales: {
      x: { ticks: { color: textColor }, grid: { color: gridColor } },
      y: {
        beginAtZero: true,
        max: 100,
        title: { display: true, text: 'Success Rate (%)', color: textColor },
        ticks: { color: textColor },
        grid: { color: gridColor },
      },
    },
  };

  const updateGroup = (id: number, field: 'success' | 'total', value: string) =>
    setGroups((gs) => gs.map((g) => (g.id === id ? { ...g, [field]: value } : g)));

  const addGroup = () => {
    if (groups.length >= MAX_GROUPS) return;
    setGroups((gs) => [...gs, { id: nextId, success: '', total: '' }]);
    setNextId((id) => id + 1);
  };

  const removeGroup = (id: number) => setGroups((gs) => gs.filter((g) => g.id !== id));

  const handleClear = () => {
    setGroups(emptyGroups());
    setNextId(2);
    setCurveTargetId(null);
  };

  const handleDownloadChart = () => {
    const chartElement = document.querySelector('canvas');
    if (chartElement) {
      const url = chartElement.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = 'success-rate-chart.png';
      link.click();
    }
  };

  const confidencePct = `${Math.round(confidenceLevel * 100)}%`;
  const toggleClass = (active: boolean) =>
    `px-3 py-1 text-sm rounded-md border transition-colors ${active
      ? 'bg-blue-600 border-blue-600 text-white dark:bg-blue-500 dark:border-blue-500'
      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-[#2a2a40]'}`;

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-6 text-black dark:text-white">
      <h1 className="text-2xl font-bold">Significance Calculator</h1>
      <p className="text-sm text-gray-700 dark:text-gray-300">
        Compare success rates between two or more groups to see if the differences are statistically significant. This is useful when testing versions of a design, feature, or experience to determine which performs better. Enter the number of successes and total participants for each group. Group A is the control, and every other group is compared against it. The tool will calculate whether each observed difference is likely due to chance or if it reflects a meaningful effect.
      </p>

      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div className="space-y-3">
          <div className="hidden sm:grid grid-cols-[8.5rem_1fr_1fr_2.5rem] gap-3 text-sm font-semibold">
            <span>Group</span>
            <span title="Number of successful outcomes (e.g., clicks, completions)">Successful outcomes (e.g., completed tasks, clicks)</span>
            <span title="Total number of participants or observations">Total participants</span>
            <span />
          </div>
          {parsed.map((g, i) => (
            <div key={g.id} className="grid grid-cols-[1fr_1fr_2.5rem] sm:grid-cols-[8.5rem_1fr_1fr_2.5rem] gap-x-3 gap-y-2 items-center">
              <div className="col-span-3 sm:col-span-1 font-semibold text-sm flex items-center gap-2 whitespace-nowrap">
                <span className="inline-block w-3 h-3 rounded-sm border-2" style={{ borderColor: BAR_COLORS[i % BAR_COLORS.length][1] }} />
                {g.label}
                {i === 0 && <span className="text-xs font-normal text-gray-600 dark:text-gray-400">control</span>}
              </div>
              <Input aria-label={`${g.label} successful outcomes`} placeholder="Successes" value={g.success}
                onChange={(e) => updateGroup(g.id, 'success', e.target.value)} type="number" min="0" />
              <Input aria-label={`${g.label} total participants`} placeholder="Participants" value={g.total}
                onChange={(e) => updateGroup(g.id, 'total', e.target.value)} type="number" min="1" />
              {i >= 2 ? (
                <button type="button" onClick={() => removeGroup(g.id)} aria-label={`Remove ${g.label}`}
                  className="h-9 w-9 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-[#2a2a40]">
                  ×
                </button>
              ) : <span />}
            </div>
          ))}
          {groups.length < MAX_GROUPS && (
            <button type="button" onClick={addGroup}
              className="text-sm font-semibold px-3 py-2 rounded-md border border-dashed border-gray-400 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-[#2a2a40]">
              + Group {LETTERS[groups.length]}
            </button>
          )}
        </div>

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

        {groups.length >= 3 && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={bonferroniOn} onChange={(e) => setBonferroniOn(e.target.checked)} className="mt-1" />
            <span>
              <strong>Bonferroni adjustment</strong>: with {testCount} comparisons against Group A, each test must clear
              p &lt; {formatAlpha(alpha)} ÷ {testCount} = {formatAlpha(alpha / testCount)}. This keeps the overall chance of a
              false positive at {formatAlpha(alpha * 100)}% instead of letting it grow with every extra group.
            </span>
          </label>
        )}

        <div className="flex gap-4">
          <Button type="button" onClick={handleClear} className="border border-gray-300 dark:border-gray-600">Clear</Button>
          <Button type="button" onClick={handleDownloadChart}>Download Chart</Button>
        </div>
      </form>

      {comparisons.length > 0 && (
        <Card className="bg-white dark:bg-[#1c1c2e] text-black dark:text-white mt-6">
          <CardContent className="py-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Results</h2>
              <div className="flex gap-1" role="group" aria-label="Explain results as">
                <button type="button" className={toggleClass(explainMode === 'rate')} aria-pressed={explainMode === 'rate'}
                  onClick={() => setExplainMode('rate')}>Success rate</button>
                <button type="button" className={toggleClass(explainMode === 'pvalue')} aria-pressed={explainMode === 'pvalue'}
                  onClick={() => setExplainMode('pvalue')}>p-value</button>
              </div>
            </div>

            {explainMode === 'rate' ? (
              <div className="space-y-2">
                {validGroups.map((g) => (
                  <p key={g.id}>{g.label} success rate: {((g.s / g.n) * 100).toFixed(1)}%</p>
                ))}
                {comparisons.map((c) => {
                  const sig = c.p < alphaAdj;
                  const gap = Math.abs(c.diff * 100).toFixed(1);
                  return (
                    <div key={c.group.id} className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <p>
                        {c.diff > 0
                          ? `${c.group.label} had a higher success rate than Group A by ${gap} percentage points.`
                          : c.diff < 0
                          ? `${c.group.label} had a lower success rate than Group A by ${gap} percentage points.`
                          : `${c.group.label} and Group A had the same success rate.`}
                      </p>
                      <p className={sig ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}>
                        {sig
                          ? `The difference is statistically significant at the ${confidencePct} confidence level${bonferroni ? ' (Bonferroni adjusted)' : ''}.`
                          : `The difference is not statistically significant at the ${confidencePct} confidence level${bonferroni ? ' (Bonferroni adjusted)' : ''}, so it could plausibly be luck.`}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm tabular-nums">
                    <thead>
                      <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                        <th className="py-1 pr-3">Comparison</th>
                        <th className="py-1 pr-3">Gap</th>
                        <th className="py-1 pr-3">z</th>
                        <th className="py-1 pr-3">p-value</th>
                        <th className="py-1 pr-3">Cutoff (α)</th>
                        <th className="py-1">Verdict</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisons.map((c) => {
                        const sig = c.p < alphaAdj;
                        return (
                          <tr key={c.group.id} className="border-b border-gray-100 dark:border-gray-800">
                            <td className="py-1 pr-3">{c.group.label} vs A</td>
                            <td className="py-1 pr-3">{formatPts(c.diff * 100)}</td>
                            <td className="py-1 pr-3">{c.z.toFixed(2)}</td>
                            <td className="py-1 pr-3">{formatP(c.p)}</td>
                            <td className="py-1 pr-3">{formatAlpha(alphaAdj)}</td>
                            <td className={`py-1 ${sig ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                              {sig ? 'Significant' : 'Not significant'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <p><strong>The math</strong> (two-proportion z-test, two-sided):</p>
                  <p className="font-mono text-xs">pooled = (successes A + successes X) ÷ (people A + people X)</p>
                  <p className="font-mono text-xs">SE = √( pooled × (1 − pooled) × (1/people A + 1/people X) )</p>
                  <p className="font-mono text-xs">z = (rate X − rate A) ÷ SE &nbsp;&nbsp; p = 2 × (1 − Φ(|z|))</p>
                  <p>
                    A result is significant when p is below α = 1 − confidence = {formatAlpha(alpha)}
                    {bonferroni ? `, divided by ${testCount} comparisons (Bonferroni) = ${formatAlpha(alphaAdj)}` : ''}.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {validGroups.length > 0 && (
        <div className="mt-6">
          <Bar data={chartData} options={chartOptions} />
        </div>
      )}

      {curveTarget && (
        <Card className="bg-white dark:bg-[#1c1c2e] text-black dark:text-white">
          <CardContent className="py-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">What the p-value means</h2>
              {comparisons.length > 1 && (
                <div className="flex flex-wrap gap-1" role="group" aria-label="Comparison shown on the curve">
                  {comparisons.map((c) => (
                    <button key={c.group.id} type="button" className={toggleClass(c === curveTarget)}
                      aria-pressed={c === curveTarget} onClick={() => setCurveTargetId(c.group.id)}>
                      {LETTERS[parsed.indexOf(c.group)]} vs A
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Play with it. The sliders start at your numbers for {curveTarget.group.label} vs Group A; drag them to see how
              sample size and the gap move the p-value. Your inputs above don&apos;t change.
            </p>
            <PValueCurve
              key={`${curveTarget.group.id}:${control.s}/${control.n}:${curveTarget.group.s}/${curveTarget.group.n}`}
              seed={{ nA: control.n, nX: curveTarget.group.n, rateA: curveTarget.rateA, rateX: curveTarget.rateX }}
              labelA="Group A"
              labelX={curveTarget.group.label}
              alpha={alphaAdj}
              bonferroni={bonferroni}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
