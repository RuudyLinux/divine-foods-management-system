import React from 'react';

type Tone = 'neutral' | 'danger' | 'success' | 'warning';

interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  /** Required: an icon alone gives a screen reader nothing to announce. */
  label: string;
  tone?: Tone;
  children: React.ReactNode;
}

const TONES: Record<Tone, string> = {
  neutral: 'text-[#756B66] hover:text-[#2D2523] hover:bg-[#F7F0E5] border-[#E8DED2]',
  danger: 'text-[#9A8F88] hover:text-[#C94B3C] hover:bg-[#C94B3C]/08 border-[#E8DED2]',
  success: 'text-[#287A4B] bg-[#287A4B]/08 hover:bg-[#287A4B]/14 border-[#287A4B]/20',
  warning: 'text-[#9A8F88] hover:text-[#A8690C] hover:bg-[#D98A16]/10 border-[#E8DED2]',
};

/** The compact square action used in table rows. */
export const IconButton: React.FC<IconButtonProps> = ({
  label,
  tone = 'neutral',
  className = '',
  children,
  type = 'button',
  ...rest
}) => (
  <button
    type={type}
    title={label}
    aria-label={label}
    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors focus-ring disabled:cursor-not-allowed disabled:opacity-50 ${TONES[tone]} ${className}`}
    {...rest}
  >
    {children}
  </button>
);
