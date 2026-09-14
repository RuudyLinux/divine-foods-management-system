import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
  footer,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  /**
   * Move focus into the dialog when it opens.
   *
   * This deliberately depends on `isOpen` alone. Callers pass `onClose` as an
   * inline arrow, so it is a new function on every render of the parent;
   * including it here re-ran this effect on each keystroke (a controlled input
   * updates parent state, which re-renders the parent) and pulled focus out of
   * the field the user was typing in.
   *
   * Focus is also left alone when it is already inside the dialog, so an
   * `autoFocus` field keeps it.
   */
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      const dialog = dialogRef.current;
      if (!dialog || dialog.contains(document.activeElement)) return;
      dialog.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1F1514]/45"
        onClick={onClose}
        aria-hidden="true"
      />

      {/*
        The dialog is a column capped to the viewport: header and footer stay
        put and only the body scrolls, so the primary action is always reachable
        however long the form is.
      */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={`relative z-10 flex w-full ${maxWidthClasses[maxWidth]} max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-2xl border border-[#E8DED2] bg-white shadow-[0_10px_24px_rgba(45,31,30,0.14)] animate-fade-in-up`}
      >
        {/* Header */}
        <div className="relative flex shrink-0 items-start justify-between gap-4 border-b border-[#E8DED2] px-6 py-4">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-[#F47B20]" aria-hidden="true" />
          <div className="min-w-0">
            <h3
              id="modal-title"
              className="font-['Outfit',sans-serif] text-base font-bold text-[#2D2523]"
            >
              {title}
            </h3>
            {subtitle && <p className="mt-0.5 text-xs text-[#756B66]">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal dialog"
            className="-mr-1 shrink-0 cursor-pointer rounded-lg p-1.5 text-[#9A8F88] transition-colors hover:bg-[#F7F0E5] hover:text-[#2D2523] focus-ring"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body — the only scrolling region */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {/* Footer — stays visible while the body scrolls */}
        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-[#E8DED2] bg-[#FFF9F0] px-6 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
