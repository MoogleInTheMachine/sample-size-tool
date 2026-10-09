'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatAlpha, formatP, formatPEq, formatPts, normInv, twoProportion } from '@/lib/stats';

export type CurveSeed = { nA: number; nX: number; rateA: number; rateX: number };

// What the curve is currently showing (inputs or what-if slider values), for live walkthroughs
export type CurveSnapshot = ReturnType<typeof twoProportion> & {
  sA: number; nA: number; sX: number; nX: number; alpha: number; zCrit: number;
};

type TipKey = 'curve' | 'tails' | 'dot' | 'zero' | 'range' | 'wobble' | 'pvalue' | 'people';

const AXIS_STEPS = [0.5, 1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100];
const niceCeil = (v: number) => AXIS_STEPS.find((s) => s >= v) ?? 100;

const Formula = ({ children }: { children: React.ReactNode }) => (
  <div className="font-mono text-[11px] leading-snug mt-1 text-cyan-700 dark:text-cyan-300">{children}</div>
);

// Interactive null-distribution curve. Remount it (via key) whenever the seed changes, so the
// what-if sliders always start from the real numbers.
export type SliderValues = { n: number; rA: number; rX: number };

// Two modes: by default the sliders are a private what-if sandbox seeded from `seed`. Pass `onSlide`
// to make them controlled instead: they report changes upward and always display `seed`. `anchor`
// (defaults to seed) fixes the axis and slider ranges so they don't rescale mid-drag.
export default function PValueCurve({ seed, anchor, labelA, labelX, alpha, bonferroni = false, onSnapshot, onSlide }: {
  seed: CurveSeed;
  anchor?: CurveSeed;
  labelA: string;
  labelX: string;
  alpha: number;
  bonferroni?: boolean;
  onSnapshot?: (s: CurveSnapshot) => void;
  onSlide?: (v: SliderValues) => void;
}) {
  const seedN = Math.round((seed.nA + seed.nX) / 2);
  const seedStats = twoProportion(seed.rateA * seed.nA, seed.nA, seed.rateX * seed.nX, seed.nX);
  const [ownWhatIf, setWhatIf] = useState<SliderValues | null>(null);
  const [tip, setTip] = useState<{ key: TipKey; x: number; y: number; w: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const whatIf = onSlide ? null : ownWhatIf;

  const n = whatIf?.n ?? seedN;
  const rA = whatIf?.rA ?? seed.rateA * 100;
  const rX = whatIf?.rX ?? seed.rateX * 100;
  const usingSeed = whatIf === null;
  const stats = usingSeed ? seedStats : twoProportion((rA / 100) * n, n, (rX / 100) * n, n);
  const nA = usingSeed ? seed.nA : n;
  const nX = usingSeed ? seed.nX : n;

  const gapPts = stats.diff * 100;
  const sePts = stats.se * 100;
  const zCrit = normInv(1 - alpha / 2);
  const cutoff = zCrit * sePts;
  const significant = stats.p < alpha;

  useEffect(() => {
    onSnapshot?.({ ...stats, sA: stats.rateA * nA, nA, sX: stats.rateX * nX, nX, alpha, zCrit });
    // stats is derived from the primitives below; listing them avoids a loop on a fresh object each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.rateA, stats.rateX, nA, nX, alpha]);

  // Axis is fixed from the anchor so dragging visibly squeezes/widens the curve
  const a = anchor ?? seed;
  const anchorN = Math.round((a.nA + a.nX) / 2);
  const anchorStats = twoProportion(a.rateA * a.nA, a.nA, a.rateX * a.nX, a.nX);
  const range = niceCeil(Math.max(4 * anchorStats.se * 100, 1.4 * Math.abs(anchorStats.diff * 100), 0.5));
  const nMin = 10;
  const nMax = Math.max(10000, anchorN * 10);
  const rateMax = Math.min(100, Math.max(20, Math.ceil((Math.max(a.rateA, a.rateX) * 200) / 10) * 10));

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
  const update = (patch: Partial<SliderValues>) => (onSlide ?? setWhatIf)({ n, rA, rX, ...patch });

  // Tooltips: hover on desktop, tap on touch, focus via keyboard
  const place = (key: TipKey, clientX: number, clientY: number) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (r) setTip({ key, x: clientX - r.left, y: clientY - r.top, w: r.width });
  };
  const tipProps = (key: TipKey) => ({
    tabIndex: 0,
    onMouseEnter: (e: React.MouseEvent<Element>) => place(key, e.clientX, e.clientY),
    onMouseMove: (e: React.MouseEvent<Element>) => place(key, e.clientX, e.clientY),
    onMouseLeave: () => setTip(null),
    onClick: (e: React.MouseEvent<Element>) => place(key, e.clientX, e.clientY),
    onFocus: (e: React.FocusEvent<Element>) => {
      const b = e.currentTarget.getBoundingClientRect();
      place(key, b.left + b.width / 2, b.top + b.height / 2);
    },
    onBlur: () => setTip(null),
    className: 'cursor-help focus:outline-none',
  });

  const pct = (r: number) => `${(r * 100).toFixed(1)}%`;
  const seLine = (
    <>
      <Formula>pooled = (successes {labelA} + successes {labelX}) ÷ (people {labelA} + people {labelX}) = {pct(stats.pooled)}</Formula>
      <Formula>
        SE = √( pooled × (1 − pooled) × (1/{nA.toLocaleString()} + 1/{nX.toLocaleString()}) ) = {sePts.toFixed(2)} pts
      </Formula>
    </>
  );
  const gapLines = (
    <>
      <Formula>gap = rate {labelX} − rate {labelA} = {pct(stats.rateX)} − {pct(stats.rateA)} = {formatPts(gapPts)}</Formula>
      <Formula>z = gap ÷ SE = {gapPts.toFixed(2)} ÷ {sePts.toFixed(2)} = {stats.z.toFixed(2)}</Formula>
    </>
  );

  const TIPS: Record<TipKey, { title: string; body: React.ReactNode }> = {
    curve: {
      title: 'The luck-only curve',
      body: (
        <>
          If {labelX} and {labelA} truly converted at the same rate, rerunning this test over and over would give gaps
          scattered like this curve: centered on 0, with a width (the standard error) of {sePts.toFixed(2)} pts.
          {seLine}
        </>
      ),
    },
    tails: {
      title: `Significance zone (α = ${formatAlpha(alpha)}${bonferroni ? ', Bonferroni adjusted' : ''})`,
      body: (
        <>
          Gaps beyond ±{cutoff.toFixed(2)} pts are too unlikely to be luck. The two tails together hold{' '}
          {formatAlpha(alpha * 100)}% of the curve, {formatAlpha((alpha / 2) * 100)}% on each side.
          <Formula>cutoff = z* × SE = {zCrit.toFixed(2)} × {sePts.toFixed(2)} = ±{cutoff.toFixed(2)} pts</Formula>
          <Formula>z* = the z-value that leaves α ÷ 2 in each tail</Formula>
        </>
      ),
    },
    dot: {
      title: 'Your observed gap',
      body: (
        <>
          Where your result lands on the luck-only curve. z counts how many standard errors the dot sits from 0.
          {gapLines}
        </>
      ),
    },
    zero: {
      title: 'No difference (0 pts)',
      body: (
        <>
          The null hypothesis: both groups convert at the same rate. The curve is centered here because, with no real
          difference, luck pushes the gap up as often as down.
        </>
      ),
    },
    range: {
      title: 'Chart range',
      body: (
        <>
          The axis runs from −{range} to +{range} percentage points. It is fixed from your starting numbers so you can
          watch the curve squeeze or spread as you drag the sliders.
        </>
      ),
    },
    wobble: {
      title: 'Luck wobble (standard error)',
      body: (
        <>
          How much the gap bounces around from luck alone. It sets the width of the curve. More people means less
          wobble.
          {seLine}
        </>
      ),
    },
    pvalue: {
      title: 'p-value',
      body: (
        <>
          The share of the luck-only curve at least as far from 0 as your dot, counting both sides.
          <Formula>p = 2 × (1 − Φ(|z|)) = 2 × (1 − Φ({Math.abs(stats.z).toFixed(2)})) {formatPEq(stats.p)}</Formula>
          <div className="mt-1">Φ is the area under the bell curve to the left of a point.</div>
          <Formula>
            {formatP(stats.p)} {significant ? '<' : '≥'} α = {formatAlpha(alpha)} → {significant ? 'significant' : 'not significant'}
          </Formula>
        </>
      ),
    },
    people: {
      title: 'People per group',
      body: (
        <>
          A what-if sample size, applied to both groups. The wobble shrinks with the square root of this number:
          four times the people halves the width of the curve.
        </>
      ),
    },
  };

  const tipWidth = 300;
  const labelClass = 'border-b border-dotted border-gray-500';

  return (
    <div ref={wrapRef} className="relative space-y-4">
      <p className="text-xs text-gray-600 dark:text-gray-400">
        Hover (or tap) any part of the chart or the numbers below it to see where it comes from.
      </p>
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

        {/* Invisible hover targets, layered so the most specific part wins */}
        <g fill="transparent" stroke="transparent">
          {cutoff < range && (
            <>
              <rect x={toX(-range)} y={base - 32} width={toX(-cutoff) - toX(-range)} height={36} {...tipProps('tails')} aria-label="Significance zone" />
              <rect x={toX(cutoff)} y={base - 32} width={toX(range) - toX(cutoff)} height={36} {...tipProps('tails')} aria-label="Significance zone" />
            </>
          )}
          <line x1={toX(0)} x2={toX(0)} y1={base - peak - 6} y2={base} strokeWidth={12} pointerEvents="stroke" {...tipProps('zero')} aria-label="No difference line" />
          <path d={curvePath} fill="none" strokeWidth={16} pointerEvents="stroke" {...tipProps('curve')} aria-label="Luck-only curve" />
          <rect x={left - 4} y={base + 6} width={50} height={18} {...tipProps('range')} aria-label="Chart range" />
          <rect x={right - 46} y={base + 6} width={50} height={18} {...tipProps('range')} aria-label="Chart range" />
          <circle cx={toX(dotPts)} cy={curveY(dotPts)} r={14} pointerEvents="all" {...tipProps('dot')} aria-label="Observed gap" />
        </g>
      </svg>

      <div className="space-y-3">
        <div className="grid grid-cols-[9rem_1fr_5rem] items-center gap-3 text-sm">
          <label htmlFor="wi-n"><span {...tipProps('people')}><span className={labelClass}>People per group</span></span></label>
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
        <div {...tipProps('dot')}>
          <div className="text-xs text-gray-600 dark:text-gray-400"><span className={labelClass}>Gap (dot position)</span></div>
          <div className="text-xl font-semibold tabular-nums">{formatPts(gapPts)}</div>
        </div>
        <div {...tipProps('wobble')}>
          <div className="text-xs text-gray-600 dark:text-gray-400"><span className={labelClass}>Luck wobble (curve width)</span></div>
          <div className="text-xl font-semibold tabular-nums">{sePts.toFixed(2)} pts</div>
        </div>
        <div {...tipProps('pvalue')}>
          <div className="text-xs text-gray-600 dark:text-gray-400"><span className={labelClass}>p-value</span></div>
          <div className={`text-xl font-semibold tabular-nums ${significant ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
            {formatP(stats.p)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400">
        <span>
          Significant when p &lt; {formatAlpha(alpha)}{bonferroni ? ' (Bonferroni adjusted)' : ''}.
          {!onSlide && usingSeed && seed.nA !== seed.nX ? ' Sliders treat both groups as the same size.' : ''}
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

      {tip && (
        <div role="tooltip"
          className="pointer-events-none absolute z-20 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#11111d] p-3 text-xs text-gray-800 dark:text-gray-200 shadow-lg"
          style={{
            width: Math.min(tipWidth, tip.w - 16),
            left: Math.max(8, Math.min(tip.x - tipWidth / 2, tip.w - Math.min(tipWidth, tip.w - 16) - 8)),
            top: tip.y + 16,
          }}>
          <div className="font-semibold mb-1 text-sm">{TIPS[tip.key].title}</div>
          <div>{TIPS[tip.key].body}</div>
        </div>
      )}
    </div>
  );
}
