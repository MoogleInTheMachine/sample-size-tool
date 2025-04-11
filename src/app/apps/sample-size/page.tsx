'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/**
 * Calculate the estimated confidence level based on the sample and population sizes,
 * comparing the margin of error at various confidence levels against the target margin.
 */
function calculateConfidenceLevel(
  sampleSize: number,
  populationSize: number,
  marginTarget: number,
  p = 0.5
) {
  if (sampleSize === 0 || populationSize === 0 || sampleSize > populationSize) return 0;

  const zValues = {
    0.80: 1.28,
    0.85: 1.44,
    0.90: 1.645,
    0.95: 1.96,
    0.99: 2.576,
  };

  const marginOfError = (z: number) =>
    z * Math.sqrt((p * (1 - p)) / sampleSize) * Math.sqrt((populationSize - sampleSize) / (populationSize - 1));

  const testZs = Object.entries(zValues).map(([conf, z]) => {
    return { confidence: parseFloat(conf), moe: marginOfError(z) };
  });

  const closest = testZs.reduce(
    (prev, curr) =>
      curr.moe <= marginTarget && curr.confidence > prev.confidence ? curr : prev,
    { confidence: 0 }
  );

  return closest.confidence;
}

/**
 * Returns an explanation message based on the provided sample and population sizes.
 */
function getExplanation(sampleSize: number, populationSize: number) {
  if (sampleSize === 0) return 'You need at least one response to calculate a confidence interval.';
  if (sampleSize > populationSize) return 'Sample size cannot exceed the population size.';

  return `With a sample size of ${sampleSize}, the app estimates how confident you can be that your survey results reflect the views of the full population of ${populationSize} people. Larger sample sizes reduce uncertainty and give you a tighter margin of error.`;
}

/**
 * Calculates the required sample size given a desired margin of error,
 * z-score, population size, and a flag for finite population correction.
 */
function requiredSampleSize(
  margin: number,
  z: number,
  populationSize: number,
  p = 0.5,
  finiteCorrection = true
) {
  const n0 = (z ** 2 * p * (1 - p)) / (margin ** 2);
  return Math.ceil(finiteCorrection ? n0 / (1 + (n0 - 1) / populationSize) : n0);
}

export default function SampleSizeCalculator() {
  const [populationSize, setPopulationSize] = useState(1000);
  const [sampleSize, setSampleSize] = useState(100);
  const [costPerResponse, setCostPerResponse] = useState(0);
  const [marginOfErrorTarget, setMarginOfErrorTarget] = useState(0.05); // Target margin error (5% default)
  const [useFiniteCorrection, setUseFiniteCorrection] = useState(true);
  const [showPercent, setShowPercent] = useState(false);
  const [error, setError] = useState('');

  // Generic input handler for numeric values.
  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<number>>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      if (isNaN(value)) {
        setError('Please enter a valid number.');
      } else {
        setError('');
        setter(value);
      }
    };

  const confidenceLevel = calculateConfidenceLevel(sampleSize, populationSize, marginOfErrorTarget);
  const explanation = getExplanation(sampleSize, populationSize);
  const totalCost = costPerResponse * sampleSize;

  // Confidence levels and their associated z values.
  const levels = [
    { level: '85%', z: 1.44 },
    { level: '90%', z: 1.645 },
    { level: '95%', z: 1.96 },
  ];

  // Build table rows using the correct z value for each level.
  const tableRows = levels.map(({ level, z }) => {
    const size = requiredSampleSize(marginOfErrorTarget, z, populationSize, 0.5, useFiniteCorrection);
    const isMet = sampleSize >= size;
    const value = showPercent ? ((sampleSize / size) * 100).toFixed(1) + '%' : size.toLocaleString();
    return (
      <tr key={level} className={isMet ? 'bg-green-100 font-semibold' : ''}>
        <td className="border px-2 py-1">{level}</td>
        <td className="border px-2 py-1">{value}</td>
      </tr>
    );
  });

  // Update chart data to compare "Your Sample Size" vs "Required Sample Size" per confidence level.
  const chartData = {
    labels: levels.map((l) => l.level),
    datasets: [
      {
        label: 'Your Sample Size',
        data: levels.map(() => sampleSize),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
      },
      {
        label: 'Required Sample Size',
        data: levels.map(({ z }) =>
          requiredSampleSize(marginOfErrorTarget, z, populationSize, 0.5, useFiniteCorrection)
        ),
        backgroundColor: 'rgba(234, 88, 12, 0.6)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Sample Size Comparison by Confidence Level',
      },
    },
  };

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold mb-1">Sample Size Confidence Estimator</h1>
      <p className="text-sm text-gray-600">
        Quickly estimate how confident you can be in your survey results based on your sample size, population, and margin of error preferences.
      </p>

      <Card>
        <CardContent className="space-y-6 py-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Population Size</label>
              <Input
                type="number"
                value={populationSize}
                onChange={handleInputChange(setPopulationSize)}
                step={100}
                min={1}
                max={1000000}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Sample Size</label>
              <Input
                type="number"
                value={sampleSize}
                onChange={handleInputChange(setSampleSize)}
                min={0}
                max={5000}
                step={10}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Cost Per Response ($)</label>
              <Input
                type="number"
                value={costPerResponse}
                onChange={handleInputChange(setCostPerResponse)}
                min={0}
                step={1}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 flex items-center gap-1">
                Target Margin of Error (%)
                <span
                  title="This controls the width of the confidence interval. Smaller values require larger sample sizes."
                  className="text-gray-500"
                >
                  <Info size={16} />
                </span>
              </label>
              <Input
                type="number"
                value={marginOfErrorTarget * 100}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!isNaN(val)) setMarginOfErrorTarget(val / 100);
                }}
                step={0.1}
                min={1}
                max={10}
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <label className="inline-flex items-center space-x-2">
              <input
                type="checkbox"
                checked={useFiniteCorrection}
                onChange={() => setUseFiniteCorrection(!useFiniteCorrection)}
              />
              <span className="text-sm flex items-center gap-1">
                Apply finite population correction
                <span
                  title="This adjusts the required sample size when your population is small. If you're surveying a limited group (like employees or beta testers), this makes results more accurate."
                  className="text-gray-500"
                >
                  <Info size={16} />
                </span>
              </span>
            </label>

            <label className="inline-flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showPercent}
                onChange={() => setShowPercent(!showPercent)}
              />
              <span className="text-sm">Show values as percentages</span>
            </label>
          </div>

          {error && <p className="text-red-600 text-sm pt-2">{error}</p>}
        </CardContent>
      </Card>

      <div className="text-lg">
        Estimated Confidence Level:{' '}
        <strong>
          {confidenceLevel > 0
            ? `${(confidenceLevel * 100).toFixed(0)}%`
            : 'Insufficient data for high confidence'}
        </strong>
      </div>

      <div className="text-md text-gray-700">{explanation}</div>

      <div className="text-md">
        Estimated Study Cost: <strong>${totalCost.toLocaleString()}</strong>
      </div>

      <div className="mt-6">
        <Bar data={chartData} options={chartOptions} />
      </div>

      <div className="text-md text-gray-700">
        <h2 className="font-semibold text-md mt-6 mb-2">Sample Size Recommendations (Always Visible)</h2>
        <p className="mb-2">
          To reach common confidence levels with your selected margin of error ({(marginOfErrorTarget * 100).toFixed(1)}%) and population
          size of {populationSize.toLocaleString()}, you would need approximately:
        </p>
        <table className="border text-sm w-full">
          <thead>
            <tr>
              <th className="border px-2 py-1">Confidence Level</th>
              <th className="border px-2 py-1">
                {showPercent ? 'Your Sample vs Target (%)' : 'Required Sample Size'}
              </th>
            </tr>
          </thead>
          <tbody>{tableRows}</tbody>
        </table>
      </div>
    </div>
  );
}