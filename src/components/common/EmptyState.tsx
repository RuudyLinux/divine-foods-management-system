import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  /** One line saying how to get started. */
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** What a list shows before it has anything in it. */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}>
    <div
      className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-[#E8DED2] bg-[#F7F0E5] text-[#9A8F88]"
      aria-hidden="true"
    >
      <Icon className="h-5 w-5" />
    </div>
    <p className="text-sm font-semibold text-[#2D2523]">{title}</p>
    {description && <p className="mt-1 max-w-sm text-xs text-[#756B66]">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
