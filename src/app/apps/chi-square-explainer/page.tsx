'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Formula, TooltipBox, useTooltip } from '@/components/useTooltip';
import { chiSquareInv, chiSquarePdf, chiSquareTest, formatAlpha, formatP, formatPEq } from '@/lib/stats';

const COLORS = ['#22d3ee', '#ec4899', '#a3e635', '#fb923c', '#a78bfa', '#f87171'];
const MAX_DIM = 6;

type Table = { rows: string[]; cols: string[]; counts: string[][] };
type Result = ReturnType<typeof chiSquareTest>;

const EXAMPLE: Table = {
  rows: ['Page A', 'Page B', 'Page C'],
  cols: ['Free', 'Pro', 'Team'],
  counts: [
    ['120', '45', '15'],
    ['100', '60', '20'],
    ['90', '50', '40'],
  ],
};

function parseTable(t: Table) {
  const nums = t.counts.map((row) => row.map((v) => Number(v)));
  const filled = t.counts.every((row) => row.every((v) => v.trim() !== ''));
  const whole = nums.every((row) => row.every((v) => Number.isInteger(v) && v >= 0));
  const rowsOk = nums.every((row) => row.reduce((s, v) => s + v, 0) > 0);
  const colsOk = nums[0].every((_, j) => nums.reduce((s, row) => s + row[j], 0) > 0);
  const valid = filled && whole && rowsOk && colsOk;
  const problem = !filled || !whole
    ? 'Fill every cell with a whole number (0 or more).'
    : 'Every row and every column needs at least one count above 0.';
  return { nums, valid, problem };
}

const f1 = (v: number) => v.toFixed(1);
const f2 = (v: number) => v.toFixed(2);
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const niceMax = (v: number) => {
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * mag >= v) ?? 10;
  return step * mag;
};

// ---------- The chi-square curve ----------

function ChiCurve({ r, alpha, xMax, scale, onScale, canScale }: {
  r: Result;
  alpha: number;
  xMax: number;
  scale: number;
  onScale: (k: number) => void;
  canScale: boolean;
}) {
  const { wrapRef, tip, tipProps } = useTooltip();
  const crit = chiSquareInv(alpha, r.df);
  const significant = r.p < alpha;

  const W = 600;
  const H = 200;
  const left = 20;
  const right = W - 20;
  const base = 160;
  const peak = 130;
  const toX = (x: number) => left + (x / xMax) * (right - left);
  const samples = 240;
  const xs = Array.from({ length: samples }, (_, i) => (xMax * (i + 1)) / samples);
  // Scale the height off the visible curve; for df 1-2 the density spikes at 0, so ignore the first few samples
  const yMax = Math.max(...xs.slice(3).map((x) => chiSquarePdf(x, r.df)));
  const y = (x: number) => base - peak * Math.min(1.08, chiSquarePdf(x, r.df) / yMax);
  const curvePath = xs.map((x, i) => `${i ? 'L' : 'M'}${toX(x).toFixed(1)},${y(x).toFixed(1)}`).join(' ');
  const tail = crit < xMax
    ? `M${toX(crit).toFixed(1)},${base} ` + [crit, ...xs.filter((x) => x > crit)].map((x) => `L${toX(x).toFixed(1)},${y(x).toFixed(1)}`).join(' ') + ` L${toX(xMax)},${base} Z`
    : '';
  const obs = Math.min(r.chi2, xMax);
  const offChart = r.chi2 > xMax;
  // Marker height: on the curve, but never shorter than 40px so it stays visible in the flat tail
  const markY = Math.min(y(Math.max(obs, xs[0])), base - 40);

  const kToPos = (k: number) => Math.round((1000 * Math.log(k / 0.25)) / Math.log(16));
  const posToK = (pos: number) => 0.25 * Math.pow(16, pos / 1000);

  const tips: Record<string, { title: string; body: React.ReactNode }> = {
    curve: {
      title: `Chi-square curve (df = ${r.df})`,
      body: (
        <>
          The χ² values you&apos;d get from luck alone if the rows and columns had nothing to do with each other. Most
          land near the degrees of freedom ({r.df}); big values are rare. More rows or columns shift the curve right.
        </>
      ),
    },
    tail: {
      title: `Significance zone (α = ${formatAlpha(alpha)})`,
      body: (
        <>
          Any χ² past {f2(crit)} is too unlikely to be luck: this tail holds {formatAlpha(alpha * 100)}% of the curve.
          Only the right tail counts, because a χ² can only grow when the data drifts from &quot;no relationship&quot;.
          <Formula>cutoff = the χ² that leaves α = {formatAlpha(alpha)} to its right (df = {r.df}) = {f2(crit)}</Formula>
        </>
      ),
    },
    obs: {
      title: `Your χ² = ${f2(r.chi2)}`,
      body: (
        <>
          The total mismatch between what you observed and what &quot;no relationship&quot; predicts, summed over every cell.
          <Formula>χ² = Σ (observed − expected)² ÷ expected = {f2(r.chi2)}</Formula>
          <Formula>p = area of the curve to the right of {f2(r.chi2)} {formatPEq(r.p)}</Formula>
        </>
      ),
    },
    axis: {
      title: 'Chart range',
      body: <>The axis runs from 0 to {xMax}. It is set from the numbers you typed, so dragging the scale slider moves your χ² across a fixed chart.</>,
    },
    chi2: {
      title: 'χ² (chi-square statistic)',
      body: (
        <>
          Adds up how far each cell is from its expected count, scaled by that expected count.
          <Formula>χ² = Σ (O − E)² ÷ E = {f2(r.chi2)}</Formula>
          <div className="mt-1">See each cell&apos;s share in the observed vs expected table below.</div>
        </>
      ),
    },
    df: {
      title: 'Degrees of freedom',
      body: (
        <>
          How many cells are free to vary once the row and column totals are fixed. It sets the shape of the curve.
          <Formula>df = (rows − 1) × (columns − 1) = ({r.rowTotals.length} − 1) × ({r.colTotals.length} − 1) = {r.df}</Formula>
        </>
      ),
    },
    p: {
      title: 'p-value',
      body: (
        <>
          The share of the luck-only curve at or beyond your χ²: how often pure chance would produce a mismatch this big.
          <Formula>p = P(χ²<sub>{r.df}</sub> ≥ {f2(r.chi2)}) {formatPEq(r.p)}</Formula>
          <Formula>{formatP(r.p)} {significant ? '<' : '≥'} α = {formatAlpha(alpha)} → {significant ? 'significant' : 'not significant'}</Formula>
        </>
      ),
    },
    v: {
      title: "Cramér's V (effect size)",
      body: (
        <>
          How strong the relationship is, from 0 (none) to 1 (perfectly linked), independent of sample size. Rough guide:
          0.1 small, 0.3 medium, 0.5 large. p says <em>whether</em> there&apos;s a relationship; V says <em>how much</em>.
          <Formula>
            V = √( χ² ÷ (N × (min(rows, cols) − 1)) ) = √( {f2(r.chi2)} ÷ ({r.total.toLocaleString()} × {Math.min(r.rowTotals.length, r.colTotals.length) - 1}) ) = {f2(r.cramersV)}
          </Formula>
        </>
      ),
    },
    scale: {
      title: 'Scale every count',
      body: (
        <>
          Multiplies every cell in your table by the same amount, so the pattern (the percentages) stays identical and
          only the sample size changes. Watch χ² grow and p shrink while Cramér&apos;s V barely moves.
        </>
      ),
    },
  };

  const labelClass = 'border-b border-dotted border-gray-500';
  const tile = (key: string, label: string, value: React.ReactNode, cls = '') => (
    <div {...tipProps(key)}>
      <div className="text-xs text-gray-600 dark:text-gray-400"><span className={labelClass}>{label}</span></div>
      <div className={`text-xl font-semibold tabular-nums ${cls}`}>{value}</div>
    </div>
  );

  return (
    <div ref={wrapRef} className="relative space-y-4">
      <p className="text-xs text-gray-600 dark:text-gray-400">
        Hover (or tap) any part of the chart or the numbers below it to see where it comes from.
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
        aria-label={`Chi-square curve with ${r.df} degrees of freedom. Observed chi-square ${f2(r.chi2)}, p-value ${formatP(r.p)}.`}>
        <path d={tail} className="fill-pink-500/45" />
        <line x1={left} x2={right} y1={base} y2={base} className="stroke-gray-400 dark:stroke-gray-600" strokeWidth={1} />
        <path d={curvePath} fill="none" className="stroke-cyan-600 dark:stroke-cyan-300" strokeWidth={2} />
        {crit < xMax && (
          <>
            <line x1={toX(crit)} x2={toX(crit)} y1={base} y2={base + 5} className="stroke-pink-500" strokeWidth={1.5} />
            <text x={toX(crit)} y={base + 18} fontSize={11} textAnchor="middle" className="fill-pink-600 dark:fill-pink-400">
              cutoff {f2(crit)}
            </text>
          </>
        )}
        <line x1={toX(obs)} x2={toX(obs)} y1={base} y2={markY} className="stroke-pink-600 dark:stroke-pink-400" strokeWidth={2} strokeDasharray="4 3" />
        <circle cx={toX(obs)} cy={y(Math.max(obs, xs[0]))} r={5} className="fill-pink-600 dark:fill-pink-400" />
        <text x={toX(obs) + (obs > xMax * 0.7 ? -8 : 8)} y={markY - 8} fontSize={11}
          textAnchor={obs > xMax * 0.7 ? 'end' : 'start'} className="fill-pink-600 dark:fill-pink-400">
          {offChart ? `your χ² = ${f2(r.chi2)} (off the chart →)` : `your χ² = ${f2(r.chi2)}`}
        </text>
        <text x={left} y={base + 18} fontSize={11} className="fill-gray-600 dark:fill-gray-400">0</text>
        <text x={right} y={base + 18} fontSize={11} textAnchor="end" className="fill-gray-600 dark:fill-gray-400">{xMax}</text>

        {/* Invisible hover targets, layered so the most specific part wins */}
        <g fill="transparent" stroke="transparent">
          {crit < xMax && (
            <rect x={toX(crit)} y={base - 34} width={toX(xMax) - toX(crit)} height={56} {...tipProps('tail')} aria-label="Significance zone" />
          )}
          <path d={curvePath} fill="none" strokeWidth={16} pointerEvents="stroke" {...tipProps('curve')} aria-label="Chi-square curve" />
          <rect x={left - 4} y={base + 6} width={30} height={18} {...tipProps('axis')} aria-label="Chart range" />
          <rect x={right - 40} y={base + 6} width={44} height={18} {...tipProps('axis')} aria-label="Chart range" />
          <line x1={toX(obs)} x2={toX(obs)} y1={base} y2={markY - 8} strokeWidth={14} pointerEvents="stroke" {...tipProps('obs')} aria-label="Your chi-square" />
        </g>
      </svg>

      <div className="grid grid-cols-[9rem_1fr_7rem] items-center gap-3 text-sm">
        <label htmlFor="chi-scale"><span {...tipProps('scale')}><span className={labelClass}>Scale every count</span></span></label>
        <input id="chi-scale" type="range" min={0} max={1000} value={kToPos(scale)} disabled={!canScale}
          onChange={(e) => onScale(posToK(Number(e.target.value)))} className="w-full accent-cyan-500" />
        <span className="text-right font-semibold tabular-nums">×{scale.toFixed(2)} · N = {r.total.toLocaleString()}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        {tile('chi2', 'χ²', f2(r.chi2))}
        {tile('df', 'Degrees of freedom', r.df)}
        {tile('p', 'p-value', formatP(r.p), significant ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400')}
        {tile('v', "Cramér's V", f2(r.cramersV))}
      </div>

      <p className={`text-sm ${significant ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
        {significant
          ? `The rows and columns are related: a mismatch this big would happen by luck less than ${formatAlpha(alpha * 100)}% of the time.`
          : `No evidence of a relationship at α = ${formatAlpha(alpha)}: a mismatch this big could easily be luck.`}
      </p>

      <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
        <li>The curve shows the χ² values luck alone produces when rows and columns are unrelated.</li>
        <li>The shaded right tail is the &quot;too unlikely to be luck&quot; zone. Only big χ² values count as evidence, so the test is one-sided.</li>
        <li>The pink line is your χ². The p-value is the area of the curve to its right.</li>
        <li>Drag &quot;scale every count&quot;: same percentages, more people. χ² grows with sample size, which is why huge samples make tiny differences &quot;significant&quot;. Cramér&apos;s V stays put.</li>
      </ul>

      {tip && <TooltipBox tip={tip} title={tips[tip.key].title}>{tips[tip.key].body}</TooltipBox>}
    </div>
  );
}

// ---------- Stacked bars: how each row splits vs the "no relationship" split ----------

function SplitBars({ t, nums, r }: { t: Table; nums: number[][]; r: Result }) {
  const { wrapRef, tip, tipProps } = useTooltip();
  const W = 440;
  const labelW = 84;
  const barH = 26;
  const gap = 12;
  const bars = [
    ...nums.map((row, i) => ({ key: `r${i}`, label: t.rows[i], shares: row.map((v) => v / r.rowTotals[i]), all: false })),
    { key: 'all', label: 'All rows', shares: r.colTotals.map((v) => v / r.total), all: true },
  ];
  const H = bars.length * (barH + gap) + 6;
  const barX = (share: number) => share * (W - labelW - 10);

  const tipFor = (key: string) => {
    const [, bi, ji] = key.split('-');
    const j = Number(ji);
    const overall = r.colTotals[j] / r.total;
    if (bi === 'all') {
      return {
        title: `All rows · ${t.cols[j]}`,
        body: (
          <>
            {r.colTotals[j].toLocaleString()} of {r.total.toLocaleString()} people overall chose {t.cols[j]}. If rows and
            columns were unrelated, every row would split exactly like this bar.
            <Formula>{r.colTotals[j]} ÷ {r.total} = {pct(overall)}</Formula>
          </>
        ),
      };
    }
    const i = Number(bi);
    return {
      title: `${t.rows[i]} · ${t.cols[j]}`,
      body: (
        <>
          {nums[i][j].toLocaleString()} of {r.rowTotals[i].toLocaleString()} in {t.rows[i]} = {pct(nums[i][j] / r.rowTotals[i])}.
          With no relationship you&apos;d expect {pct(overall)}, the overall share.
          <Formula>expected = {r.rowTotals[i]} × {pct(overall)} = {f1(r.expected[i][j])} people</Formula>
        </>
      ),
    };
  };

  return (
    <div ref={wrapRef} className="relative space-y-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="How each row splits across the columns, compared with the overall split">
        {bars.map((b, bi) => {
          const yTop = bi * (barH + gap) + (b.all ? 6 : 0);
          let x = labelW;
          return (
            <g key={b.key}>
              <text x={labelW - 8} y={yTop + barH / 2 + 4} fontSize={12} textAnchor="end"
                className={b.all ? 'fill-gray-600 dark:fill-gray-400 italic' : 'fill-gray-800 dark:fill-gray-200'}>
                {b.label}
              </text>
              {b.shares.map((s, j) => {
                const w = barX(s);
                const seg = (
                  <g key={j} {...tipProps(`bar-${b.all ? 'all' : bi}-${j}`)}>
                    <rect x={x} y={yTop} width={Math.max(0, w - 1)} height={barH} fill={COLORS[j % COLORS.length]} opacity={b.all ? 0.45 : 0.85} />
                    {w > 42 && (
                      <text x={x + w / 2} y={yTop + barH / 2 + 4} fontSize={11} textAnchor="middle" className="fill-gray-900 font-semibold">
                        {Math.round(s * 100)}%
                      </text>
                    )}
                  </g>
                );
                x += w;
                return seg;
              })}
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {t.cols.map((c, j) => (
          <span key={j} className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: COLORS[j % COLORS.length] }} />
            {c}
          </span>
        ))}
      </div>
      {tip && (() => { const c = tipFor(tip.key); return <TooltipBox tip={tip} title={c.title}>{c.body}</TooltipBox>; })()}
    </div>
  );
}

// ---------- Observed vs expected, with each cell's χ² contribution ----------

function CellTable({ t, nums, r }: { t: Table; nums: number[][]; r: Result }) {
  const { wrapRef, tip, tipProps } = useTooltip();
  const maxC = Math.max(...r.contributions.flat(), 1e-9);

  const tipFor = (key: string) => {
    const [, i, j] = key.split('-').map(Number);
    const o = nums[i][j];
    const e = r.expected[i][j];
    return {
      title: `${t.rows[i]} · ${t.cols[j]}`,
      body: (
        <>
          {o > e ? 'More' : o < e ? 'Fewer' : 'Exactly as many'} people than &quot;no relationship&quot; predicts.
          <Formula>expected = row total × column total ÷ N = {r.rowTotals[i]} × {r.colTotals[j]} ÷ {r.total} = {f1(e)}</Formula>
          <Formula>contribution = (O − E)² ÷ E = ({o} − {f1(e)})² ÷ {f1(e)} = {f2(r.contributions[i][j])}</Formula>
          <div className="mt-1">That&apos;s {pct(r.contributions[i][j] / r.chi2)} of your total χ².</div>
        </>
      ),
    };
  };

  return (
    <div ref={wrapRef} className="relative space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums border-separate border-spacing-1">
          <thead>
            <tr>
              <th />
              {t.cols.map((c, j) => <th key={j} className="text-left font-semibold px-2">{c}</th>)}
              <th className="text-left font-semibold px-2 text-gray-600 dark:text-gray-400">Row total</th>
            </tr>
          </thead>
          <tbody>
            {nums.map((row, i) => (
              <tr key={i}>
                <th className="text-left font-semibold pr-2 whitespace-nowrap">{t.rows[i]}</th>
                {row.map((o, j) => {
                  const share = r.contributions[i][j] / maxC;
                  const over = o > r.expected[i][j];
                  return (
                    <td key={j} {...tipProps(`cell-${i}-${j}`)}
                      className="cursor-help rounded px-2 py-1 align-top focus:outline-none"
                      style={{ background: `rgba(${over ? '34,211,238' : '236,72,153'},${(0.06 + 0.5 * share).toFixed(3)})` }}>
                      <div className="font-semibold">{o.toLocaleString()} <span className="text-xs font-normal text-gray-600 dark:text-gray-400">/ {f1(r.expected[i][j])} exp</span></div>
                      <div className="text-xs">+{f2(r.contributions[i][j])} to χ²</div>
                    </td>
                  );
                })}
                <td className="px-2 text-gray-600 dark:text-gray-400">{r.rowTotals[i].toLocaleString()}</td>
              </tr>
            ))}
            <tr>
              <th className="text-left font-semibold pr-2 text-gray-600 dark:text-gray-400">Column total</th>
              {r.colTotals.map((c, j) => <td key={j} className="px-2 text-gray-600 dark:text-gray-400">{c.toLocaleString()}</td>)}
              <td className="px-2 font-semibold">{r.total.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400">
        Each cell shows observed / expected. <span className="text-cyan-700 dark:text-cyan-300">Cyan</span> = more than
        expected, <span className="text-pink-600 dark:text-pink-400">pink</span> = fewer. Darker cells add more to χ².
      </p>
      {tip && (() => { const c = tipFor(tip.key); return <TooltipBox tip={tip} title={c.title}>{c.body}</TooltipBox>; })()}
    </div>
  );
}

// ---------- Step-by-step walkthrough ----------

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

function Steps({ t, nums, r, alpha }: { t: Table; nums: number[][]; r: Result; alpha: number }) {
  const cells = r.contributions.flatMap((row, i) => row.map((c, j) => ({ c, i, j })));
  const top = cells.reduce((a, b) => (b.c > a.c ? b : a));
  const crit = chiSquareInv(alpha, r.df);
  const significant = r.p < alpha;
  const k = Math.min(r.rowTotals.length, r.colTotals.length) - 1;
  const sumLine = cells.length <= 9
    ? cells.map((x) => f2(x.c)).join(' + ')
    : `${cells.slice(0, 6).map((x) => f2(x.c)).join(' + ')} + … (${cells.length} cells)`;
  return (
    <ol className="space-y-5">
      <Step n={1} title="Totals">
        <p>Add up each row, each column, and everyone.</p>
        <Formula>rows: {t.rows.map((name, i) => `${name} ${r.rowTotals[i].toLocaleString()}`).join(' · ')}</Formula>
        <Formula>columns: {t.cols.map((name, j) => `${name} ${r.colTotals[j].toLocaleString()}`).join(' · ')}</Formula>
        <Formula>N = {r.total.toLocaleString()}</Formula>
      </Step>
      <Step n={2} title="Expected counts">
        <p>
          If rows and columns had nothing to do with each other, every row would split the same way as the overall
          column totals. That &quot;no relationship&quot; world gives each cell an expected count.
        </p>
        <Formula>
          {t.rows[0]} · {t.cols[0]}: {r.rowTotals[0]} × {r.colTotals[0]} ÷ {r.total} = {f1(r.expected[0][0])}
        </Formula>
        <p>Every expected count is in the observed vs expected table above.</p>
      </Step>
      <Step n={3} title="Each cell's mismatch">
        <p>
          For each cell, square the gap between observed and expected, then divide by expected. Dividing keeps a gap of
          10 in a big cell from counting as much as a gap of 10 in a small one.
        </p>
        <Formula>
          {t.rows[0]} · {t.cols[0]}: ({nums[0][0]} − {f1(r.expected[0][0])})² ÷ {f1(r.expected[0][0])} = {f2(r.contributions[0][0])}
        </Formula>
        <p>
          The biggest contributor is {t.rows[top.i]} · {t.cols[top.j]} at {f2(top.c)}: that&apos;s where your data departs most
          from &quot;no relationship&quot;.
        </p>
      </Step>
      <Step n={4} title="χ² and degrees of freedom">
        <p>Add up every cell&apos;s mismatch to get χ².</p>
        <Formula>χ² = {sumLine} = {f2(r.chi2)}</Formula>
        <p>
          Degrees of freedom count how many cells could change once the totals are locked in. They set which curve to
          compare against.
        </p>
        <Formula>df = ({r.rowTotals.length} − 1) × ({r.colTotals.length} − 1) = {r.df}</Formula>
      </Step>
      <Step n={5} title="p-value">
        <p>
          The area of the df = {r.df} chi-square curve to the right of your χ². The cutoff for α = {formatAlpha(alpha)} is{' '}
          {f2(crit)}, so any χ² above that is significant.
        </p>
        <Formula>p = P(χ² ≥ {f2(r.chi2)}) {formatPEq(r.p)}</Formula>
        <p className={significant ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}>
          {formatP(r.p)} is {significant ? 'below' : 'not below'} α = {formatAlpha(alpha)}, so the relationship is{' '}
          {significant ? 'statistically significant' : 'not statistically significant'}.
        </p>
      </Step>
      <Step n={6} title="Effect size (Cramér's V)">
        <p>
          χ² grows with sample size, so it can&apos;t tell you how strong the relationship is. Cramér&apos;s V can: 0 means
          none, 1 means perfectly linked. Roughly 0.1 is small, 0.3 medium, 0.5 large.
        </p>
        <Formula>V = √( {f2(r.chi2)} ÷ ({r.total.toLocaleString()} × {k}) ) = {f2(r.cramersV)}</Formula>
      </Step>
    </ol>
  );
}

// ---------- Page ----------

export default function ChiSquareExplainer() {
  const [table, setTable] = useState<Table>(EXAMPLE);
  // Axis range and the scale slider's base follow typed numbers only, so dragging doesn't rescale them
  const [anchor, setAnchor] = useState<number[][]>(() => parseTable(EXAMPLE).nums);
  const [scale, setScale] = useState(1);
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);

  const { nums, valid, problem } = parseTable(table);
  const alpha = Number((1 - confidenceLevel).toFixed(4));
  const r = valid ? chiSquareTest(nums) : null;
  const anchorFits = anchor.length === nums.length && anchor[0].length === nums[0].length;
  const a = valid && anchorFits ? chiSquareTest(anchor) : r;
  const xMax = a ? niceMax(Math.max(chiSquareInv(alpha, a.df) * 1.6, a.chi2 * 1.2, a.df + 4 * Math.sqrt(2 * a.df))) : 10;

  // Typing or reshaping the table re-anchors the chart and resets the scale slider
  const commit = (next: Table) => {
    setTable(next);
    const p = parseTable(next);
    if (p.valid) setAnchor(p.nums);
    setScale(1);
  };

  const onScale = (k: number) => {
    const counts = anchor.map((row) => row.map((v) => String(Math.round(v * k))));
    if (!parseTable({ ...table, counts }).valid) return; // don't let rounding empty a row or column mid-drag
    setTable({ ...table, counts });
    setScale(k);
  };

  const setCount = (i: number, j: number, v: string) =>
    commit({ ...table, counts: table.counts.map((row, ri) => (ri === i ? row.map((c, cj) => (cj === j ? v : c)) : row)) });
  const setRowName = (i: number, v: string) => setTable({ ...table, rows: table.rows.map((n, ri) => (ri === i ? v : n)) });
  const setColName = (j: number, v: string) => setTable({ ...table, cols: table.cols.map((n, cj) => (cj === j ? v : n)) });
  const addRow = () => commit({ ...table, rows: [...table.rows, `Row ${table.rows.length + 1}`], counts: [...table.counts, table.cols.map(() => '')] });
  const addCol = () => commit({ ...table, cols: [...table.cols, `Option ${table.cols.length + 1}`], counts: table.counts.map((row) => [...row, '']) });
  const removeRow = (i: number) => commit({ ...table, rows: table.rows.filter((_, ri) => ri !== i), counts: table.counts.filter((_, ri) => ri !== i) });
  const removeCol = (j: number) => commit({ ...table, cols: table.cols.filter((_, cj) => cj !== j), counts: table.counts.map((row) => row.filter((_, cj) => cj !== j)) });

  const xBtn = 'h-8 w-8 shrink-0 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-[#2a2a40]';
  const card = 'bg-white dark:bg-[#1c1c2e] text-black dark:text-white';

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-6 text-black dark:text-white">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Chi-Square Explainer</h1>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Is there a relationship between two categories, like which signup page people saw and which plan they picked?
          The chi-square test compares your counts to what you&apos;d expect if there were no relationship at all. Edit the
          example table below and watch every number update.
        </p>
      </div>

      <Card className={card}>
        <CardContent className="py-6">
          {r ? (
            <ChiCurve r={r} alpha={alpha} xMax={xMax} scale={scale} onScale={onScale} canScale={anchorFits} />
          ) : (
            <p className="text-sm text-yellow-600 dark:text-yellow-400">{problem}</p>
          )}
        </CardContent>
      </Card>

      <Card className={card}>
        <CardContent className="py-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Your data</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Counts of people in each combination. Rename the rows and columns, change any count, or add up to{' '}
              {MAX_DIM} rows and columns. The scale slider above rewrites these counts, and typing here resets it.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-1">
              <thead>
                <tr>
                  <th />
                  {table.cols.map((c, j) => (
                    <th key={j} className="min-w-[6.5rem]">
                      <div className="flex items-center gap-1">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: COLORS[j % COLORS.length] }} />
                        <Input aria-label={`Column ${j + 1} name`} value={c} onChange={(e) => setColName(j, e.target.value)} className="font-semibold" />
                        {table.cols.length > 2 && (
                          <button type="button" className={xBtn} onClick={() => removeCol(j)} aria-label={`Remove column ${c}`}>×</button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th>
                    {table.cols.length < MAX_DIM && (
                      <button type="button" onClick={addCol}
                        className="whitespace-nowrap text-sm font-semibold px-3 py-2 rounded-md border border-dashed border-gray-400 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-[#2a2a40]">
                        + Column
                      </button>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map((rowName, i) => (
                  <tr key={i}>
                    <th className="min-w-[7.5rem]">
                      <div className="flex items-center gap-1">
                        {table.rows.length > 2 && (
                          <button type="button" className={xBtn} onClick={() => removeRow(i)} aria-label={`Remove row ${rowName}`}>×</button>
                        )}
                        <Input aria-label={`Row ${i + 1} name`} value={rowName} onChange={(e) => setRowName(i, e.target.value)} className="font-semibold" />
                      </div>
                    </th>
                    {table.counts[i].map((v, j) => (
                      <td key={j}>
                        <Input aria-label={`${rowName} ${table.cols[j]} count`} value={v} type="number" min="0"
                          onChange={(e) => setCount(i, j, e.target.value)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-3">
            {table.rows.length < MAX_DIM && (
              <button type="button" onClick={addRow}
                className="text-sm font-semibold px-3 py-2 rounded-md border border-dashed border-gray-400 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-[#2a2a40]">
                + Row
              </button>
            )}
            <Button type="button" onClick={() => commit(EXAMPLE)} className="border border-gray-300 dark:border-gray-600">
              Reset to example
            </Button>
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
          {r && r.lowExpectedCells > 0 && (
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              Heads up: {r.lowExpectedCells} {r.lowExpectedCells === 1 ? 'cell has' : 'cells have'} an expected count below 5
              (smallest {f1(r.minExpected)}). The chi-square curve is a less reliable guide there; consider combining
              categories or, for a 2 × 2 table, using Fisher&apos;s exact test.
            </p>
          )}
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Comparing just two success rates? The <Link href="/apps/p-value-explainer" className="underline">P-Value Explainer</Link>{' '}
            walks through that case.
          </p>
        </CardContent>
      </Card>

      {r && (
        <>
          <Card className={card}>
            <CardContent className="py-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">How each row splits</h2>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  If there were no relationship, every row would look like the &quot;All rows&quot; bar. The more the rows
                  differ from it, the bigger χ² gets.
                </p>
              </div>
              <SplitBars t={table} nums={nums} r={r} />
            </CardContent>
          </Card>

          <Card className={card}>
            <CardContent className="py-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Observed vs expected</h2>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  What you counted next to what &quot;no relationship&quot; predicts, and how much each cell adds to χ².
                </p>
              </div>
              <CellTable t={table} nums={nums} r={r} />
            </CardContent>
          </Card>

          <Card className={card}>
            <CardContent className="py-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">How the numbers are calculated</h2>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Six steps from raw counts to a verdict, using the numbers in your table right now.
                </p>
              </div>
              <Steps t={table} nums={nums} r={r} alpha={alpha} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
