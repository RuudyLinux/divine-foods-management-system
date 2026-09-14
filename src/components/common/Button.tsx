import React from 'react';

type Variant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner and blocks further clicks. */
  isLoading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

/**
 * The one button in the system.
 *
 * Chocolate carries the primary action; saffron is reserved for the small
 * number of places that need extra emphasis, so it keeps its meaning.
 */
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-[#2D1F1E] text-white hover:bg-[#1F1514] border-transparent',
  secondary: 'bg-[#F7F0E5] text-[#2D1F1E] hover:bg-[#EFE4D5] border-[#E8DED2]',
  accent: 'bg-[#F47B20] text-white hover:bg-[#C2600F] border-transparent',
  ghost: 'bg-transparent text-[#756B66] hover:bg-[#F7F0E5] hover:text-[#2D2523] border-transparent',
  danger: 'bg-[#C94B3C] text-white hover:bg-[#B03E30] border-transparent',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-[13px] gap-2',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leadingIcon,
  trailingIcon,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}) => (
  <button
    type={type}
    disabled={disabled || isLoading}
    aria-busy={isLoading || undefined}
    className={`inline-flex items-center justify-center whitespace-nowrap rounded-[10px] border font-semibold leading-none transition-colors focus-ring disabled:cursor-not-allowed disabled:opacity-55 ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
    {...rest}
  >
    {isLoading ? (
      <span
        className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-current border-r-transparent animate-spin"
        aria-hidden="true"
      />
    ) : (
      leadingIcon
    )}
    {children}
    {!isLoading && trailingIcon}
  </button>
);
