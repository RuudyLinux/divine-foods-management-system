import React from 'react';

interface PageHeaderProps {
  /** Small uppercase label above the title, for context. */
  eyebrow?: string;
  title: string;
  description?: string;
  /** Primary action and any secondary controls, right aligned. */
  actions?: React.ReactNode;
  /** Filters or a search field, shown on the row below. */
  toolbar?: React.ReactNode;
}

/**
 * The header every page opens with, so the answers to "where am I", "what is
 * this" and "what is the main action" always sit in the same place.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  description,
  actions,
  toolbar,
}) => (
  <div className="mb-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && (
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#C2600F]">
            {eyebrow}
          </span>
        )}
        <h1 className="font-['Outfit',sans-serif] text-2xl font-bold tracking-tight text-[#2D2523]">
          {title}
        </h1>
        {description && <p className="mt-0.5 text-[13px] text-[#756B66]">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>

    {toolbar && <div className="mt-4 flex flex-wrap items-center gap-2.5">{toolbar}</div>}
  </div>
);
