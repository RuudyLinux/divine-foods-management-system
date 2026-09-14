import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  /** What the rows are, for the count line: "sales", "movements". */
  itemLabel?: string;
}

/**
 * Page controls for lists that keep growing. Hidden when everything already
 * fits on one page, so short lists stay uncluttered.
 */
export const Pagination: React.FC<PaginationProps> = ({
  page,
  pageSize,
  totalItems,
  onPageChange,
  itemLabel = 'records',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems <= pageSize) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalItems);

  const step = (delta: number) => onPageChange(Math.min(totalPages, Math.max(1, page + delta)));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-[#756B66]">
        Showing <span className="font-semibold text-[#2D2523]">{first}</span>–
        <span className="font-semibold text-[#2D2523]">{last}</span> of{' '}
        <span className="font-semibold text-[#2D2523]">{totalItems}</span> {itemLabel}
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E8DED2] text-[#756B66] transition-colors hover:bg-[#F7F0E5] hover:text-[#2D2523] focus-ring disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <span className="px-2 text-xs font-semibold text-[#2D2523]" aria-live="polite">
          Page {page} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => step(1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E8DED2] text-[#756B66] transition-colors hover:bg-[#F7F0E5] hover:text-[#2D2523] focus-ring disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
