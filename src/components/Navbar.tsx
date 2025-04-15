'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch for SSR
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="w-full px-6 py-4 flex items-center justify-between bg-white dark:bg-[#0f0f23] shadow-md dark:shadow-none">
      {/* Left: Logo and Site Title */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/assets/branding/moogle-logo.png"
            alt="Moogle in the Machine"
            width={32}
            height={32}
          />
          <span className="text-lg font-semibold text-gray-800 dark:text-white">
            Moogle in the Machine
          </span>
        </Link>
      </div>

      {/* Right: Navigation Links + Theme Toggle */}
      <div className="flex items-center gap-6">
        <Link
          href="/about"
          className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:underline"
        >
          About
        </Link>

        {mounted && (
  <select
    value={theme}
    onChange={(e) => setTheme(e.target.value)}
    className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm font-medium text-gray-700 dark:text-gray-300"
  >
    <option value="light">☀️ Light</option>
    <option value="dark">🌙 Dark</option>
    <option value="system">🖥 System</option>
  </select>
)}
      </div>
    </nav>
  );
}