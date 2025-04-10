import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sample Size Tool',
  description: 'Estimate confidence levels based on your survey sample size and population.',
};

export default function SampleCalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}