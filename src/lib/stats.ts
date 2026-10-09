// Shared statistics helpers for the significance calculator and the p-value explainer.

// Standard normal CDF (Abramowitz & Stegun 7.1.26, error < 1.5e-7)
export function normCdf(x: number) {
  const t = 1 / (1 + (0.3275911 * Math.abs(x)) / Math.SQRT2);
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  const erf = 1 - poly * Math.exp((-x * x) / 2);
  return x >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

// Inverse standard normal CDF (Acklam's rational approximation)
export function normInv(p: number) {
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
export function twoProportion(sA: number, nA: number, sX: number, nX: number) {
  const rateA = sA / nA;
  const rateX = sX / nX;
  const diff = rateX - rateA;
  const pooled = (sA + sX) / (nA + nX);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / nA + 1 / nX));
  const z = se > 0 ? diff / se : 0;
  const p = se > 0 ? 2 * (1 - normCdf(Math.abs(z))) : 1;
  return { rateA, rateX, diff, pooled, se, z, p };
}

export const formatP = (p: number) => (p < 0.001 ? '< 0.001' : p.toFixed(3));
export const formatPts = (pts: number) => `${pts > 0 ? '+' : ''}${pts.toFixed(1)} pts`;
export const formatAlpha = (a: number) => String(Number(a.toFixed(4)));
// "= 0.043" or "< 0.001", for the end of a formula line
export const formatPEq = (p: number) => (p < 0.001 ? '< 0.001' : `= ${p.toFixed(3)}`);

// ---- Chi-square ----

// ln Γ(x) (Lanczos approximation)
export function gammaLn(x: number) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  const t = x + 5.5;
  let ser = 1.000000000190015;
  for (const cj of c) ser += cj / ++y;
  return -(t - (x + 0.5) * Math.log(t)) + Math.log((2.5066282746310005 * ser) / x);
}

// Upper regularized incomplete gamma Q(a, x) (series below a+1, continued fraction above)
function gammaQ(a: number, x: number) {
  if (x <= 0) return 1;
  const front = Math.exp(-x + a * Math.log(x) - gammaLn(a));
  if (x < a + 1) {
    let ap = a;
    let del = 1 / a;
    let sum = del;
    for (let i = 0; i < 500; i++) {
      ap++;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-14) break;
    }
    return 1 - sum * front;
  }
  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }
  return front * h;
}

// P(χ² ≥ x) for df degrees of freedom: the chi-square p-value
export const chiSquareSf = (x: number, df: number) => gammaQ(df / 2, x / 2);

// Chi-square density, for drawing the curve
export function chiSquarePdf(x: number, df: number) {
  if (x <= 0) return 0;
  const k = df / 2;
  return Math.exp((k - 1) * Math.log(x) - x / 2 - k * Math.LN2 - gammaLn(k));
}

// Critical value: the χ² that leaves `alpha` in the right tail (bisection)
export function chiSquareInv(alpha: number, df: number) {
  let lo = 0;
  let hi = df + 10 * Math.sqrt(2 * df) + 10;
  while (chiSquareSf(hi, df) > alpha) hi *= 2;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (chiSquareSf(mid, df) > alpha) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// Chi-square test of independence on an r × c table of counts
export function chiSquareTest(observed: number[][]) {
  const rowTotals = observed.map((row) => row.reduce((s, v) => s + v, 0));
  const colTotals = observed[0].map((_, j) => observed.reduce((s, row) => s + row[j], 0));
  const total = rowTotals.reduce((s, v) => s + v, 0);
  const expected = observed.map((_, i) => colTotals.map((ct) => (rowTotals[i] * ct) / total));
  const contributions = observed.map((row, i) => row.map((o, j) => (o - expected[i][j]) ** 2 / expected[i][j]));
  const chi2 = contributions.flat().reduce((s, v) => s + v, 0);
  const df = (observed.length - 1) * (colTotals.length - 1);
  const p = chiSquareSf(chi2, df);
  const k = Math.min(observed.length, colTotals.length) - 1;
  const cramersV = Math.sqrt(chi2 / (total * k));
  const minExpected = Math.min(...expected.flat());
  const lowExpectedCells = expected.flat().filter((e) => e < 5).length;
  return { rowTotals, colTotals, total, expected, contributions, chi2, df, p, cramersV, minExpected, lowExpectedCells };
}
