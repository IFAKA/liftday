'use client';

interface WatchTimerRingProps {
  progress: number;
  radius?: number;
  strokeWidth?: number;
  trackStroke?: string;
  progressStroke?: string;
}

export function WatchTimerRing({
  progress,
  radius = 43,
  strokeWidth = 6,
  trackStroke = 'rgba(255,255,255,0.1)',
  progressStroke = 'white',
}: WatchTimerRingProps) {
  const clampedProgress = Math.max(0, Math.min(progress, 100));
  const circumference = 2 * Math.PI * radius;

  return (
    <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r={radius} fill="none" stroke={trackStroke} strokeWidth={strokeWidth} />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={progressStroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clampedProgress / 100)}
        style={{ transition: 'stroke-dashoffset 1s linear' }}
      />
    </svg>
  );
}
