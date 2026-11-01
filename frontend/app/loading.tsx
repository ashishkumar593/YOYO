import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#07080C] text-zinc-100 flex flex-col items-center justify-center p-6 selection:bg-cyan-500/30">
      <div className="flex flex-col items-center space-y-4">
        {/* Sleek dual spinning ring */}
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 border-r-blue-500 animate-spin" />
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span>INITIALIZING CLUSTER RUNTIME...</span>
        </div>
      </div>
    </div>
  );
}

