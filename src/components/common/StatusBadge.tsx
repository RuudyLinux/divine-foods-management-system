import React from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'solid' | 'subtle';
  className?: string;
}

type Tone = 'success' | 'warning' | 'info' | 'danger' | 'brand' | 'accent' | 'neutral';

/** One status vocabulary for the whole app, so a colour always means the same thing. */
const TONE_BY_STATUS: Record<string, Tone> = {
  ACTIVE: 'success',
  IN_STOCK: 'success',
  'IN STOCK': 'success',
  PAID: 'success',
  CONFIRMED: 'success',
  CASH: 'success',

  UPCOMING: 'warning',
  PLANNED: 'warning',
  LOW_STOCK: 'warning',
  'LOW STOCK': 'warning',
  PENDING: 'warning',
  DRAFT: 'warning',
  MIXED: 'warning',

  COMPLETED: 'info',
  CARD: 'info',
  UPI: 'info',
  BANK_TRANSFER: 'info',

  CANCELLED: 'danger',
  OUT_OF_STOCK: 'danger',
  'OUT OF STOCK': 'danger',
  INACTIVE: 'danger',

  ADMIN: 'brand',
  EXHIBITION_USER: 'accent',
};

/** Tinted rather than saturated, so a table of badges stays readable. */
const SUBTLE: Record<Tone, string> = {
  success: 'bg-[#287A4B]/10 text-[#1F5E39] border-[#287A4B]/25',
  warning: 'bg-[#D98A16]/12 text-[#A8690C] border-[#D98A16]/28',
  info: 'bg-[#3F6B8C]/10 text-[#345876] border-[#3F6B8C]/25',
  danger: 'bg-[#C94B3C]/10 text-[#A93B2E] border-[#C94B3C]/25',
  brand: 'bg-[#2D1F1E]/08 text-[#2D1F1E] border-[#2D1F1E]/20 font-semibold',
  accent: 'bg-[#F47B20]/12 text-[#C2600F] border-[#F47B20]/28 font-semibold',
  neutral: 'bg-[#F7F0E5] text-[#756B66] border-[#E8DED2]',
};

const SOLID: Record<Tone, string> = {
  success: 'bg-[#287A4B] text-white border-transparent',
  warning: 'bg-[#D98A16] text-white border-transparent',
  info: 'bg-[#3F6B8C] text-white border-transparent',
  danger: 'bg-[#C94B3C] text-white border-transparent',
  brand: 'bg-[#2D1F1E] text-white border-transparent',
  accent: 'bg-[#F47B20] text-white border-transparent',
  neutral: 'bg-[#756B66] text-white border-transparent',
};

const DOT: Record<Tone, string> = {
  success: 'bg-[#287A4B]',
  warning: 'bg-[#D98A16]',
  info: 'bg-[#3F6B8C]',
  danger: 'bg-[#C94B3C]',
  brand: 'bg-[#2D1F1E]',
  accent: 'bg-[#F47B20]',
  neutral: 'bg-[#9A8F88]',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant = 'subtle',
  className = '',
}) => {
  const norm = (status || '').toUpperCase();
  const tone = TONE_BY_STATUS[norm] ?? 'neutral';
  const styles = variant === 'solid' ? SOLID[tone] : SUBTLE[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${styles} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${variant === 'solid' ? 'bg-white/70' : DOT[tone]}`}
        aria-hidden="true"
      />
      {status}
    </span>
  );
};
