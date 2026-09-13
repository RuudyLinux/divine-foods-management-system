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
  const accentMap = {
    green: {
      icon: 'bg-gradient-to-br from-emerald-50 to-emerald-100/80 text-emerald-700 border-emerald-200/60',
      strip: 'stat-accent-green',
      glow: 'hover:shadow-[0_4px_20px_rgba(16,185,129,0.1)]',
    },
    amber: {
      icon: 'bg-gradient-to-br from-amber-50 to-amber-100/80 text-amber-700 border-amber-200/60',
      strip: 'stat-accent-amber',
      glow: 'hover:shadow-[0_4px_20px_rgba(217,119,6,0.1)]',
    },
    brown: {
      icon: 'bg-gradient-to-br from-stone-50 to-stone-100/80 text-[#1B4332] border-[#1B4332]/15',
      strip: 'stat-accent-brown',
      glow: 'hover:shadow-[0_4px_20px_rgba(44,24,16,0.08)]',
    },
    orange: {
      icon: 'bg-gradient-to-br from-orange-50 to-orange-100/80 text-orange-700 border-orange-200/60',
      strip: 'stat-accent-orange',
      glow: 'hover:shadow-[0_4px_20px_rgba(234,88,12,0.1)]',
    },
    blue: {
      icon: 'bg-gradient-to-br from-sky-50 to-sky-100/80 text-sky-700 border-sky-200/60',
      strip: 'stat-accent-blue',
      glow: 'hover:shadow-[0_4px_20px_rgba(59,130,246,0.1)]',
    },
  };

  const accent = accentMap[accentColor];

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
      className={`glass-card p-5 ${accent.strip} ${accent.glow} ${
        onClick
          ? 'cursor-pointer hover-lift focus:outline-hidden focus-ring active:scale-[0.98]'
          : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 truncate">
            {title}
          </p>
          <h3 className="text-2xl font-bold text-[#2C1810] mt-1.5 tracking-tight font-['Outfit',sans-serif] truncate">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-stone-500 mt-1 truncate">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                  trend.isPositive
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-rose-700 bg-rose-50'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
              <span className="text-[11px] text-stone-400">vs target</span>
            </div>
          )}
        </div>
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${accent.icon}`}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
