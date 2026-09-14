import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  accentColor?: 'green' | 'amber' | 'brown' | 'orange' | 'blue';
  className?: string;
  onClick?: () => void;
}

/**
 * A single figure with its label. Flat tints rather than gradients, and the
 * label wraps instead of truncating so a heading like "Active Exhibitions" can
 * still be read at narrow widths.
 */
const ACCENTS = {
  green: { icon: 'bg-[#287A4B]/10 text-[#287A4B] border-[#287A4B]/20', strip: 'stat-accent-green' },
  amber: { icon: 'bg-[#F47B20]/12 text-[#C2600F] border-[#F47B20]/25', strip: 'stat-accent-amber' },
  brown: { icon: 'bg-[#2D1F1E]/08 text-[#2D1F1E] border-[#2D1F1E]/18', strip: 'stat-accent-brown' },
  orange: { icon: 'bg-[#FFB81C]/16 text-[#A8690C] border-[#FFB81C]/35', strip: 'stat-accent-orange' },
  blue: { icon: 'bg-[#3F6B8C]/10 text-[#3F6B8C] border-[#3F6B8C]/22', strip: 'stat-accent-blue' },
} as const;

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = 'green',
  className = '',
  onClick,
}) => {
  const accent = ACCENTS[accentColor];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      className={`rounded-[14px] border border-[#E8DED2] bg-white p-4 ${accent.strip} ${
        onClick ? 'cursor-pointer transition-shadow hover:shadow-[0_4px_10px_rgba(45,31,30,0.07)] focus-ring' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase leading-tight tracking-[0.05em] text-[#756B66]">
            {title}
          </p>
          <h3 className="mt-1.5 font-['Outfit',sans-serif] text-[22px] font-bold leading-tight tracking-tight text-[#2D2523]">
            {value}
          </h3>
          {subtitle && <p className="mt-1 text-xs leading-snug text-[#756B66]">{subtitle}</p>}
          {trend && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                  trend.isPositive
                    ? 'bg-[#287A4B]/10 text-[#1F5E39]'
                    : 'bg-[#C94B3C]/10 text-[#A93B2E]'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            </div>
          )}
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${accent.icon}`}
          aria-hidden="true"
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
    </div>
  );
};
