'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          'w-9 h-9 rounded-xl border border-border/70 bg-card/50 flex items-center justify-center text-muted-foreground',
          className
        )}
      >
        <span className="w-4 h-4 rounded-full bg-muted animate-pulse" />
      </div>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={cn(
        'relative inline-flex items-center justify-center rounded-xl p-2 text-xs font-medium transition-all duration-200',
        'border border-border/80 bg-card/80 hover:bg-muted/80 text-foreground shadow-sm hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20',
        className
      )}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        <Sun
          className={cn(
            'w-4 h-4 text-amber-500 transition-all duration-300 absolute transform',
            isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
          )}
        />
        <Moon
          className={cn(
            'w-4 h-4 text-sky-400 transition-all duration-300 absolute transform',
            isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
          )}
        />
      </div>
      {showLabel && (
        <span className="ml-2 font-mono text-[11px] capitalize">
          {isDark ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
}
