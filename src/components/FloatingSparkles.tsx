'use client';
import '@/styles/sparkles.css';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function FloatingSparkles() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || theme !== 'dark') return null;

  const sparkleCount = 50;
  const colors = ['#7f5af0', '#00ffff', '#ff00ff', '#ffffff'];

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 overflow-hidden pointer-events-none z-[-1]">
      {Array.from({ length: sparkleCount }).map((_, i) => {
        const delay = Math.random() * 5;
        const duration = 3 + Math.random() * 5;
        const size = 1 + Math.random() * 2;
        const left = Math.random() * 100;
        const color = colors[Math.floor(Math.random() * colors.length)];

        return (
          <div
            key={i}
            className="absolute rounded-full blur-sm animate-rise"
            style={{
              bottom: '-10px',
              left: `${left}%`,
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: color,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          />
        );
      })}
    </div>
  );
}