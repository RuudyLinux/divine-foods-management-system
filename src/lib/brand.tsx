import React, { useSyncExternalStore } from 'react';
import { db } from './db';

export const BRAND_COLORS = {
  deepBrown: '#2C1810',
  darkGreen: '#1B4332',
  leafGreen: '#2D6A4F',
  accentGreen: '#40916C',
  warmOrange: '#D97706',
  accentOrange: '#E85D04',
  cream: '#FBF9F5',
  cardBg: '#FFFFFF',
  border: '#E8E2D6',
  mutedText: '#6C635B',
};

/**
 * Fixed brand strings only.
 *
 * Address, phone, email and GSTIN are company details that print on invoices,
 * so they live in Settings where the business enters its real ones - a
 * hardcoded tax id here would print on every customer invoice.
 */
export const BRAND_INFO = {
  name: 'Divine Foods',
  taglineGujarati: 'પારંપરિક સ્વાદ, આધુનિકતાને સાથ',
  taglineEnglish: 'Traditional Taste with Modern Touch',
  slogan: 'Good Food Brighter Lives',
};

export function formatINR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

/** Bundled brand mark, used until someone uploads their own in Settings. */
export const DEFAULT_LOGO_SRC = '/logo.png';

/**
 * The logo to display right now: the one uploaded in Settings, else the
 * bundled mark. Subscribes to the database so a logo change appears
 * immediately everywhere the logo is shown.
 */
export function useBrandLogo(): string {
  return useSyncExternalStore(
    db.subscribe,
    () => db.getSettings().logo_url || DEFAULT_LOGO_SRC,
    () => DEFAULT_LOGO_SRC
  );
}

interface LogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'white' | 'icon-only';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Overrides the stored logo. Used to preview an image before saving it. */
  src?: string;
}

export const DivineLogo: React.FC<LogoProps> = ({
  className = '',
  variant = 'full',
  size = 'md',
  src,
}) => {
  const storedLogo = useBrandLogo();
  const logoSrc = src || storedLogo;
  const isWhite = variant === 'white';

  const iconSizes = {
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  const tagSizes = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-sm',
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/*
        The logo artwork is dark on a transparent background, so it always sits
        on a light chip - on the dark sidebar and login panel it would otherwise
        disappear.
      */}
      <div
        className={`relative flex items-center justify-center shrink-0 overflow-hidden rounded-xl bg-white ${
          iconSizes[size]
        } shadow-sm border ${isWhite ? 'border-white/25' : 'border-[#E8E2D6]'}`}
      >
        <img
          src={logoSrc}
          alt={`${BRAND_INFO.name} logo`}
          className="w-[86%] h-[86%] object-contain"
          loading="lazy"
          decoding="async"
        />
      </div>

      {variant !== 'icon-only' && (
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1.5">
            <span
              className={`font-['Outfit',sans-serif] font-extrabold tracking-tight uppercase ${textSizes[size]} ${
                isWhite ? 'text-white' : 'text-[#2C1810]'
              }`}
            >
              DIVINE <span className={isWhite ? 'text-amber-300' : 'text-[#1B4332]'}>FOODS</span>
            </span>
          </div>
          {variant === 'full' && (
            <span
              className={`font-['Noto_Sans_Gujarati',sans-serif] font-medium tracking-wide ${tagSizes[size]} ${
                isWhite ? 'text-amber-200/90' : 'text-[#D97706]'
              }`}
            >
              {BRAND_INFO.taglineGujarati}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
