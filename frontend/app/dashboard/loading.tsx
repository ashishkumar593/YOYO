import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-muted/60 rounded-xl" />
          <div className="h-4 w-72 bg-muted/40 rounded-lg" />
        </div>
        <div className="flex items-center space-x-3">
          <div className="h-9 w-28 bg-muted/50 rounded-xl" />
          <div className="h-9 w-36 bg-muted/50 rounded-xl" />
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 rounded-2xl bg-card border border-border space-y-3">
            <div className="h-3 w-20 bg-muted/60 rounded" />
            <div className="h-8 w-28 bg-muted/80 rounded-lg" />
            <div className="h-3 w-32 bg-muted/40 rounded" />
          </div>
        ))}
      </div>

      {/* Main card skeleton */}
      <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
        <div className="h-5 w-40 bg-muted/60 rounded" />
        <div className="space-y-2.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 w-full bg-muted/30 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

