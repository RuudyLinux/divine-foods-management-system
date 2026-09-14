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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        style={{ animation: 'fadeInUp 0.2s ease forwards' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={`relative w-full ${maxWidthClasses[maxWidth]} bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-stone-200/80 overflow-hidden z-10 my-8 animate-fade-in-up`}
      >
        {/* Header with gradient accent */}
        <div className="relative flex items-start justify-between px-6 py-5 border-b border-stone-200/60">
          {/* Subtle gradient accent bar */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#1B4332] via-[#2D6A4F] to-[#D97706]" aria-hidden="true" />
          <div>
            <h3 id="modal-title" className="text-lg font-bold text-[#2C1810] font-['Outfit',sans-serif]">
              {title}
            </h3>
            {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal dialog"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 focus:outline-hidden focus-ring transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(85vh-140px)] overflow-y-auto">
          {children}
        </div>

        {/* Footer if provided */}
        {footer && (
          <div className="px-6 py-4 bg-stone-50/80 backdrop-blur-sm border-t border-stone-200/60 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
