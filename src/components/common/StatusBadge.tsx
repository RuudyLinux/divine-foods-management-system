import React from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'solid' | 'subtle';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant = 'subtle',
  className = '',
}) => {
  const norm = (status || '').toUpperCase();

  let styles = 'bg-stone-100 text-stone-700 border-stone-200';

  if (norm === 'ACTIVE' || norm === 'IN_STOCK' || norm === 'IN STOCK' || norm === 'PAID') {
    styles =
      variant === 'solid'
        ? 'bg-emerald-600 text-white border-transparent'
        : 'bg-emerald-50 text-emerald-800 border-emerald-200';
  } else if (norm === 'PLANNED' || norm === 'LOW_STOCK' || norm === 'LOW STOCK' || norm === 'PENDING') {
    styles =
      variant === 'solid'
        ? 'bg-amber-500 text-white border-transparent'
        : 'bg-amber-50 text-amber-800 border-amber-200';
  } else if (norm === 'COMPLETED') {
    styles =
      variant === 'solid'
        ? 'bg-blue-600 text-white border-transparent'
        : 'bg-blue-50 text-blue-800 border-blue-200';
  } else if (norm === 'CANCELLED' || norm === 'OUT_OF_STOCK' || norm === 'OUT OF STOCK' || norm === 'INACTIVE') {
    styles =
      variant === 'solid'
        ? 'bg-rose-600 text-white border-transparent'
        : 'bg-rose-50 text-rose-800 border-rose-200';
  } else if (norm === 'ADMIN') {
    styles = 'bg-[#1B4332]/10 text-[#1B4332] border-[#1B4332]/25 font-semibold';
  } else if (norm === 'EXHIBITION_USER') {
    styles = 'bg-amber-50 text-amber-900 border-amber-200 font-semibold';
  } else if (norm === 'UPI') {
    styles = 'bg-purple-50 text-purple-700 border-purple-200';
  } else if (norm === 'CASH') {
    styles = 'bg-green-50 text-green-700 border-green-200';
  } else if (norm === 'CARD') {
    styles = 'bg-blue-50 text-blue-700 border-blue-200';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles} ${className} whitespace-nowrap`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          norm === 'ACTIVE' || norm === 'IN_STOCK' || norm === 'IN STOCK' || norm === 'PAID'
            ? 'bg-emerald-500'
            : norm === 'LOW_STOCK' || norm === 'LOW STOCK' || norm === 'PLANNED'
            ? 'bg-amber-500'
            : norm === 'COMPLETED'
            ? 'bg-blue-500'
            : norm === 'OUT_OF_STOCK' || norm === 'OUT OF STOCK' || norm === 'CANCELLED'
            ? 'bg-rose-500'
            : 'bg-stone-400'
        }`}
      />
      {status}
    </span>
  );
};
