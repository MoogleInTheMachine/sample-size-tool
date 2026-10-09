'use client';

import React, { useRef, useState } from 'react';

type Tip = { key: string; x: number; y: number; w: number };

// Hover (desktop), tap (touch) and focus (keyboard) tooltips positioned inside a wrapper element.
// Spread tipProps(key) onto any HTML or SVG element; render <TooltipBox> once inside the wrapper.
export function useTooltip() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  const place = (key: string, clientX: number, clientY: number) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (r) setTip({ key, x: clientX - r.left, y: clientY - r.top, w: r.width });
  };

  const tipProps = (key: string) => ({
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

  return { wrapRef, tip, tipProps };
}

export function TooltipBox({ tip, title, children, width = 300 }: {
  tip: Tip;
  title: React.ReactNode;
  children: React.ReactNode;
  width?: number;
}) {
  const w = Math.min(width, tip.w - 16);
  return (
    <div role="tooltip"
      className="pointer-events-none absolute z-20 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#11111d] p-3 text-xs text-gray-800 dark:text-gray-200 shadow-lg"
      style={{ width: w, left: Math.max(8, Math.min(tip.x - width / 2, tip.w - w - 8)), top: tip.y + 16 }}>
      <div className="font-semibold mb-1 text-sm">{title}</div>
      <div>{children}</div>
    </div>
  );
}

export const Formula = ({ children }: { children: React.ReactNode }) => (
  <div className="font-mono text-[11px] leading-snug mt-1 text-cyan-700 dark:text-cyan-300">{children}</div>
);
