'use client';

import React, { useState, useEffect } from 'react';
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

function calculateZScore(p1: number, n1: number, p2: number, n2: number) {
  const p1_hat = p1 / n1;
  const p2_hat = p2 / n2;
  const pooled = (p1 + p2) / (n1 + n2);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
  const z = (p1_hat - p2_hat) / se;
  return z;
}

function isSignificant(z: number, threshold = 1.96) {
  return Math.abs(z) > threshold;
}


export default function SignificanceCalculator() {
  const { theme } = useTheme();
  const [group1Success, setGroup1Success] = useState('');
  const [group1Total, setGroup1Total] = useState('');
  const [group2Success, setGroup2Success] = useState('');
  const [group2Total, setGroup2Total] = useState('');
  const [zScore, setZScore] = useState<number | null>(null);
  const [significant, setSignificant] = useState<boolean | null>(null);
  const [chartData, setChartData] = useState<ChartData<'bar'>>({
    labels: [],
    datasets: [],
  });
  const [chartOptions, setChartOptions] = useState<ChartOptions<'bar'>>({});
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);

  const rate1 = parseInt(group1Success) / parseInt(group1Total);
  const rate2 = parseInt(group2Success) / parseInt(group2Total);

  useEffect(() => {
    const p1 = parseInt(group1Success);
    const n1 = parseInt(group1Total);
    const p2 = parseInt(group2Success);
    const n2 = parseInt(group2Total);

    if (n1 > 0 && n2 > 0 && p1 <= n1 && p2 <= n2) {
      const z = calculateZScore(p1, n1, p2, n2);
      setZScore(z);
      setSignificant(isSignificant(z));


      const neonCyan = 'rgba(0, 255, 255, 0.3)';
      const neonPurple = 'rgba(255, 0, 255, 0.3)';
      const cyanBorder = '#00FFFF';
      const purpleBorder = '#FF00FF';

      const data: ChartData<'bar'> = {
        labels: ['Group 1', 'Group 2'],
        datasets: [
          {
            label: 'Success Rate',
            data: [rate1 * 100, rate2 * 100],
            backgroundColor: [neonCyan, neonPurple],
            borderColor: [cyanBorder, purpleBorder],
            borderWidth: 2,
          },
        ],
      };

      const options: ChartOptions<'bar'> = {
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
            text: 'Success Rate Comparison',
            color: theme === 'dark' ? '#FFFFFF' : '#1F2937',
          },
        },
        scales: {
          x: {
            ticks: { color: theme === 'dark' ? '#FFFFFF' : '#1F2937' },
            grid: { color: theme === 'dark' ? '#334155' : '#E5E7EB' },
          },
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Success Rate (%)',
              color: theme === 'dark' ? '#FFFFFF' : '#1F2937',
            },
            ticks: { color: theme === 'dark' ? '#FFFFFF' : '#1F29337' },
            grid: { color: theme === 'dark' ? '#334155' : '#E5E7EB' },
          },
        },
      };

      setChartData(data);
      setChartOptions(options);
    } else {
      setZScore(null);
      setSignificant(null);
      setChartData({ labels: [], datasets: [] });
    }
  }, [group1Success, group1Total, group2Success, group2Total, theme, confidenceLevel, rate1, rate2]);

  const handleClear = () => {
    setGroup1Success('');
    setGroup1Total('');
    setGroup2Success('');
    setGroup2Total('');
    setZScore(null);
    setSignificant(null);
    setChartData({ labels: [], datasets: [] });
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

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-6 text-black dark:text-white">
      <h1 className="text-2xl font-bold">Significance Calculator</h1>
      <p className="text-sm text-gray-700 dark:text-gray-300">
        Compare success rates between two groups to see if the difference is statistically significant. This is useful when testing two versions of a design, feature, or experience to determine which performs better. Enter the number of successes and total participants for each group. The tool will calculate whether the observed difference is likely due to chance or if it reflects a meaningful effect.
      </p>

      <form className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1" title="Number of successful outcomes (e.g., clicks, completions) for group 1">Total number of successful outcomes in Group 1 (e.g., completed tasks, clicks)</label>
            <Input value={group1Success} onChange={(e) => setGroup1Success(e.target.value)} type="number" min="0" />
            <label className="block text-sm font-semibold mt-2 mb-1" title="Total number of participants or observations in group 1">Total number of participants in Group 1</label>
            <Input value={group1Total} onChange={(e) => setGroup1Total(e.target.value)} type="number" min="1" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1" title="Number of successful outcomes (e.g., clicks, completions) for group 2">Total number of successful outcomes in Group 2 (e.g., completed tasks, clicks)</label>
            <Input value={group2Success} onChange={(e) => setGroup2Success(e.target.value)} type="number" min="0" />
            <label className="block text-sm font-semibold mt-2 mb-1" title="Total number of participants or observations in group 2">Total number of participants in Group 2</label>
            <Input value={group2Total} onChange={(e) => setGroup2Total(e.target.value)} type="number" min="1" />
          </div>
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
        <div className="flex gap-4">
          <Button type="button" onClick={handleClear} variant="outline">Clear</Button>
          <Button type="button" onClick={handleDownloadChart}>Download Chart</Button>
        </div>
      </form>

      {zScore !== null && (
        <Card className="bg-white dark:bg-[#1c1c2e] text-black dark:text-white mt-6">
          <CardContent className="py-6 space-y-2">
            <h2 className="text-lg font-semibold">Results</h2>
            <p>Group 1 success rate: {(rate1 * 100).toFixed(1)}%</p>
            <p>Group 2 success rate: {(rate2 * 100).toFixed(1)}%</p>
            <p>
              {rate1 > rate2
                ? `Group 1 had a higher success rate than Group 2 by ${((rate1 - rate2) * 100).toFixed(1)}%.`
                : rate2 > rate1
                ? `Group 2 had a higher success rate than Group 1 by ${((rate2 - rate1) * 100).toFixed(1)}%.`
                : 'Both groups had the same success rate.'}
            </p>
            <p>
              {Math.abs(zScore) > 3
                ? 'This is a highly significant difference.'
                : Math.abs(zScore) > 2.58
                ? 'This is a very significant difference.'
                : Math.abs(zScore) > 2.33
                ? 'This is a significant difference at the 98% confidence level.'
                : Math.abs(zScore) > 1.96
                ? 'This is a significant difference at the 95% confidence level.'
                : 'This result is not statistically significant at standard confidence levels.'}
            </p>
            <p className={significant ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}>
              {significant ? 'The difference is statistically significant.' : 'The difference is not statistically significant.'}
            </p>
          </CardContent>
        </Card>
      )}

      {zScore !== null && chartData && (
        <div className="mt-6">
          <Bar data={chartData} options={chartOptions} />
        </div>
      )}
    </div>
  );
}
