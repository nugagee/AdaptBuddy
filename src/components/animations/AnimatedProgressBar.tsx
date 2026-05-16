import React from 'react';

interface AnimatedProgressBarProps {
  percent: number;
  colorClass: string;
  delay?: number;
}

const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  percent,
  colorClass,
  delay = 0,
}) => (
  <span className="mt-3 block h-2 overflow-hidden rounded-full bg-slate-200">
    <span
      className={`block h-full rounded-full ${colorClass} animate-analytics-progress motion-reduce:!animate-none motion-reduce:!w-[var(--progress-pct)]`}
      style={
        {
          '--progress-pct': `${percent}%`,
          animationDelay: `${delay}s`,
        } as React.CSSProperties
      }
    />
  </span>
);

export default AnimatedProgressBar;
