import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export function YoyoLogo({ className = '', size = 32, showText = true }: LogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Geometric YOYO Glyph */}
      <div 
        className="relative flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_0_12px_rgba(59,130,246,0.5)]"
        >
          <defs>
            <linearGradient id="yoyo-gradient-a" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="50%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
            <linearGradient id="yoyo-gradient-b" x1="44" y1="4" x2="4" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>

          {/* Outer Calibration Ring */}
          <circle cx="24" cy="24" r="22" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" strokeDasharray="3 3" />

          {/* Outer Yo-Yo Torque Path */}
          <path
            d="M24 6C14.0589 6 6 14.0589 6 24C6 33.9411 14.0589 42 24 42C33.9411 42 42 33.9411 42 24"
            stroke="url(#yoyo-gradient-a)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Inner Counter-Orbit */}
          <path
            d="M24 13C17.9249 13 13 17.9249 13 24C13 30.0751 17.9249 35 24 35C30.0751 35 35 30.0751 35 24C35 20.5 33 17 30 15"
            stroke="url(#yoyo-gradient-b)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Neural Hub Core */}
          <circle cx="24" cy="24" r="4.5" fill="url(#yoyo-gradient-a)" />
          <circle cx="24" cy="24" r="2" fill="#FFFFFF" />

          {/* Vector Tangent Spur */}
          <line x1="24" y1="24" x2="38" y2="10" stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
          <circle cx="38" cy="10" r="1.5" fill="#38BDF8" />
        </svg>
      </div>

      {showText && (
        <span className="font-mono text-xl font-black tracking-tight text-white">
          YO<span className="text-cyan-400">YO</span>
        </span>
      )}
    </div>
  );
}

export const Logo = YoyoLogo;

