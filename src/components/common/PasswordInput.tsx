import React, { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
  disabled?: boolean;
  /** Classes for the input itself, so each screen keeps its own look. */
  className?: string;
  /** Icon rendered inside the left edge of the field. */
  leadingIcon?: React.ReactNode;
  /** Starts revealed. Used where an administrator must read a password aloud. */
  defaultVisible?: boolean;
  id?: string;
  name?: string;
}

/**
 * A password field with a show/hide control.
 *
 * Revealing is per-field and resets whenever the screen is left, so a password
 * is never left on display by accident.
 */
export const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onChange,
  placeholder,
  required,
  autoFocus,
  autoComplete,
  disabled,
  className = '',
  leadingIcon,
  defaultVisible = false,
  id,
  name,
}) => {
  const [isVisible, setIsVisible] = useState(defaultVisible);
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className="relative">
      {leadingIcon}
      <input
        id={inputId}
        name={name}
        type={isVisible ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        disabled={disabled}
        className={className}
      />
      <button
        // Never submits the surrounding form.
        type="button"
        onClick={() => setIsVisible(v => !v)}
        // Kept out of the tab order so it does not interrupt typing then submitting.
        tabIndex={-1}
        aria-label={isVisible ? 'Hide password' : 'Show password'}
        aria-pressed={isVisible}
        title={isVisible ? 'Hide password' : 'Show password'}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
      >
        {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};
