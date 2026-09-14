import React from 'react';

export interface DataTableColumn {
  /** Header text. */
  header: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  /** Extra classes for this column's header cell. */
  className?: string;
}

interface DataTableProps {
  columns: DataTableColumn[];
  /** One <tr> per row. Rendered inside the table body. */
  children: React.ReactNode;
  /** True when there are no rows; `empty` is shown instead of the body. */
  isEmpty?: boolean;
  empty?: React.ReactNode;
  /** Shown above the table: search, filters, counts. */
  toolbar?: React.ReactNode;
  /** Shown below the table, typically pagination. */
  footer?: React.ReactNode;
  caption?: string;
  className?: string;
}

const ALIGN = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
} as const;

/**
 * The frame every list in the app sits in: one card, one header style, one
 * empty state and horizontal scrolling on narrow screens.
 *
 * Rows stay with the page that owns them, so sorting, filtering and row
 * actions keep working exactly as they did.
 */
export const DataTable: React.FC<DataTableProps> = ({
  columns,
  children,
  isEmpty = false,
  empty,
  toolbar,
  footer,
  caption,
  className = '',
}) => (
  <div className={`overflow-hidden rounded-[14px] border border-[#E8DED2] bg-white ${className}`}>
    {toolbar && <div className="border-b border-[#E8DED2] p-4">{toolbar}</div>}

    {isEmpty && empty ? (
      empty
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-[#E8DED2] bg-[#F7F0E5] text-[11px] font-semibold uppercase tracking-[0.05em] text-[#756B66]">
              {columns.map((col, i) => (
                <th
                  key={i}
                  scope="col"
                  className={`px-4 py-3 ${ALIGN[col.align || 'left']} ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8DED2]">{children}</tbody>
        </table>
      </div>
    )}

    {footer && <div className="border-t border-[#E8DED2] px-4 py-3">{footer}</div>}
  </div>
);

/** A table row with the standard hover treatment. */
export const DataTableRow: React.FC<
  React.HTMLAttributes<HTMLTableRowElement> & { children: React.ReactNode }
> = ({ children, className = '', ...rest }) => (
  <tr className={`transition-colors hover:bg-[#FFF9F0] ${className}`} {...rest}>
    {children}
  </tr>
);
