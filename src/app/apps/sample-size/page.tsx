'use client';

import React, { useState, useEffect } from 'react';
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
import type { ChartData, ChartOptions } from 'chart.js';
import { useTheme } from 'next-themes';


ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function calculateConfidenceLevel(sampleSize: number, populationSize: number, marginTarget: number, p = 0.5) {
  if (sampleSize === 0 || populationSize === 0 || sampleSize > populationSize) return 0;
  const zValues = { 0.80: 1.28, 0.85: 1.44, 0.90: 1.645, 0.95: 1.96, 0.99: 2.576 };
  const marginOfError = (z: number) => z * Math.sqrt((p * (1 - p)) / sampleSize) * Math.sqrt((populationSize - sampleSize) / (populationSize - 1));
  const testZs = Object.entries(zValues).map(([conf, z]) => ({ confidence: parseFloat(conf), moe: marginOfError(z) }));
  const closest = testZs.reduce((prev, curr) => curr.moe <= marginTarget && curr.confidence > prev.confidence ? curr : prev, { confidence: 0 });
  return closest.confidence;
}

function getExplanation(sampleSize: number, populationSize: number) {
  if (sampleSize === 0) return 'You need at least one response to calculate a confidence interval.';
  if (sampleSize > populationSize) return 'Sample size cannot exceed the population size.';
  return `With a sample size of ${sampleSize}, the app estimates how confident you can be that your survey results reflect the views of the full population of ${populationSize} people.`;
}

function requiredSampleSize(margin: number, z: number, populationSize: number, p = 0.5, finiteCorrection = true) {
  const n0 = (z ** 2 * p * (1 - p)) / (margin ** 2);
  return Math.ceil(finiteCorrection ? n0 / (1 + (n0 - 1) / populationSize) : n0);
}

export default function SampleSizeCalculator() {
  const { theme } = useTheme();
  const [populationSize, setPopulationSize] = useState(1000);
  const [sampleSize, setSampleSize] = useState(100);
  const [costPerResponse, setCostPerResponse] = useState(0);
  const [marginOfErrorTarget, setMarginOfErrorTarget] = useState(0.05);
  const [useFiniteCorrection, setUseFiniteCorrection] = useState(true);
  const [showPercent, setShowPercent] = useState(false);
  const [error, setError] = useState('');
  const [chartOptions, setChartOptions] = useState<ChartOptions<'bar'>>({});
const [chartData, setChartData] = useState<ChartData<'bar'>>({
  labels: [],
  datasets: [],
});

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<number>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') { setter(NaN); return; }
    const value = Number(raw);
    if (isNaN(value)) setError('Please enter a valid number.');
    else { setError(''); setter(value); }
  };

  const confidenceLevel = calculateConfidenceLevel(sampleSize, populationSize, marginOfErrorTarget);
  const explanation = getExplanation(sampleSize, populationSize);
  const totalCost = costPerResponse * sampleSize;

  const levels = [
    { level: '85%', z: 1.44 },
    { level: '90%', z: 1.645 },
    { level: '95%', z: 1.96 },
  ];

  const tableRows = levels.map(({ level, z }) => {
    const size = requiredSampleSize(marginOfErrorTarget, z, populationSize, 0.5, useFiniteCorrection);
    const isMet = sampleSize >= size;
    const value = showPercent ? ((sampleSize / size) * 100).toFixed(1) + '%' : size.toLocaleString();
    return (
      <tr key={level} className={isMet ? 'bg-green-100 dark:bg-green-800 font-semibold' : ''}>
        <td className="border px-2 py-1 border-slate-300 dark:border-slate-700">{level}</td>
        <td className="border px-2 py-1 border-slate-300 dark:border-slate-700">{value}</td>
      </tr>
    );
  });

  useEffect(() => {
    const levels = [
      { level: '85%', z: 1.44 },
      { level: '90%', z: 1.645 },
      { level: '95%', z: 1.96 },
    ];
  
    const neonBlue = 'rgba(0, 255, 255, 0.3)';
    const neonPink = 'rgba(255, 0, 255, 0.3)';
    const blueBorder = '#00FFFF';
    const pinkBorder = '#FF00FF';
  
    const data = {
      labels: levels.map((l) => l.level),
      datasets: [
        {
          label: 'Your Sample Size',
          data: levels.map(() => sampleSize),
          backgroundColor: neonBlue,
          borderColor: blueBorder,
          borderWidth: 2,
        },
        {
          label: 'Required Sample Size',
          data: levels.map(({ z }) => requiredSampleSize(marginOfErrorTarget, z, populationSize, 0.5, useFiniteCorrection)),
          backgroundColor: neonPink,
          borderColor: pinkBorder,
          borderWidth: 2,
        },
      ],
    };
  
    const options = {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: theme === 'dark' ? '#FFFFFF' : '#1F2937',
          },
          position: 'top',
        },
        title: {
          display: true,
          text: 'Sample Size Comparison by Confidence Level',
          color: theme === 'dark' ? '#FFFFFF' : '#1F2937',
        },
      },
      scales: {
        x: {
          ticks: { color: theme === 'dark' ? '#FFFFFF' : '#1F2937' },
          grid: { color: theme === 'dark' ? '#334155' : '#E5E7EB' },
        },
        y: {
          ticks: { color: theme === 'dark' ? '#FFFFFF' : '#1F2937' },
          grid: { color: theme === 'dark' ? '#334155' : '#E5E7EB' },
        },
      },
    };
  
    setChartData(data);
    setChartOptions(options);
  }, [theme, sampleSize, populationSize, marginOfErrorTarget, useFiniteCorrection]);

  return (
    <div className="relative min-h-screen px-4 py-8 max-w-3xl mx-auto bg-white text-black dark:bg-[#0f0f23] dark:text-white transition-colors overflow-hidden">
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="sparkle sparkle-1 teal" />
        <div className="sparkle sparkle-2 blue" />
        <div className="sparkle sparkle-3 white" />
        <div className="sparkle sparkle-4 purple" />
        <div className="sparkle sparkle-5 teal" />
        <div className="sparkle sparkle-6 blue" />
      </div>

      <div className="relative z-10 space-y-6">
        <h1 className="text-2xl font-bold">Sample Size Confidence Estimator</h1>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
          Quickly estimate how confident you can be in your survey results based on your sample size, population, and margin of error preferences.
        </p>

        <Card>
          <CardContent className="space-y-6 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Population Size</label>
                <Input type="number" value={populationSize} onChange={handleInputChange(setPopulationSize)} step={100} min={1} max={1000000} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Sample Size</label>
                <Input type="number" value={sampleSize} onChange={handleInputChange(setSampleSize)} min={0} max={5000} step={10} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Cost Per Response ($)</label>
                <Input type="number" value={costPerResponse} onChange={handleInputChange(setCostPerResponse)} min={0} step={1} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 flex items-center gap-1">
                  Target Margin of Error (%)
                  <span title="This controls the width of the confidence interval." className="text-gray-500 dark:text-gray-400">
                    <Info size={16} />
                  </span>
                </label>
                <Input type="number" value={marginOfErrorTarget * 100} onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!isNaN(val)) setMarginOfErrorTarget(val / 100);
                }} step={0.1} min={1} max={10} />
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <label className="inline-flex items-center space-x-2">
                <input type="checkbox" checked={useFiniteCorrection} onChange={() => setUseFiniteCorrection(!useFiniteCorrection)} />
                <span className="text-sm">Apply finite population correction</span>
              </label>
              <label className="inline-flex items-center space-x-2">
                <input type="checkbox" checked={showPercent} onChange={() => setShowPercent(!showPercent)} />
                <span className="text-sm">Show values as percentages</span>
              </label>
            </div>

            {error && <p className="text-red-600 text-sm pt-2">{error}</p>}
          </CardContent>
        </Card>

        <div className="text-lg mt-6">
          Estimated Confidence Level:{' '}
          <strong>{confidenceLevel > 0 ? `${(confidenceLevel * 100).toFixed(0)}%` : 'Insufficient data for high confidence'}</strong>
        </div>

        <div className="text-sm text-gray-700 dark:text-gray-400">{explanation}</div>
        <div className="text-md mb-4">Estimated Study Cost: <strong>${totalCost.toLocaleString()}</strong></div>

        <div className="mt-6">
          <Bar data={chartData} options={chartOptions} />
        </div>

        <div className="mt-6 text-sm text-gray-700 dark:text-gray-400">
          <h2 className="font-semibold text-md mb-2">Sample Size Recommendations</h2>
          <p className="mb-2">
            To reach common confidence levels with your selected margin of error ({(marginOfErrorTarget * 100).toFixed(1)}%) and population size of {populationSize.toLocaleString()}, you would need approximately:
          </p>
          <table className="border text-sm w-full border-slate-300 dark:border-slate-600">
            <thead>
              <tr>
                <th className="border px-2 py-1 border-slate-300 dark:border-slate-600">Confidence Level</th>
                <th className="border px-2 py-1 border-slate-300 dark:border-slate-600">
                  {showPercent ? 'Your Sample vs Target (%)' : 'Required Sample Size'}
                </th>
              </tr>
            </thead>
            <tbody>{tableRows}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
