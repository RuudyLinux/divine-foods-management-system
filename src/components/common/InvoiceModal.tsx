import React, { useRef } from 'react';
import { Printer, Download, CheckCircle2 } from 'lucide-react';
import { Sale } from '../../types';
import { DivineLogo, BRAND_INFO, formatINR, formatDateTime } from '../../lib/brand';
import { db } from '../../lib/db';
import { Modal } from './Modal';
import { StatusBadge } from './StatusBadge';
import { useToast } from './Toast';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, sale }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { success } = useToast();

  if (!sale) return null;

  // Printed on the customer's copy, so these come from Settings rather than
  // being baked into the app.
  const company = db.getSettings();
  const contactLine = [company.phone && `Helpline: ${company.phone}`, company.email]
    .filter(Boolean)
    .join(' | ');
  const addressLine = [company.address, company.gstin && `GSTIN: ${company.gstin}`]
    .filter(Boolean)
    .join(' | ');

  const handlePrint = () => {
    window.print();
  };

  const handleCopyInvoice = () => {
    const text = `DIVINE FOODS INVOICE\nInvoice: ${sale.invoice_no}\nDate: ${formatDateTime(
      sale.sale_date
    )}\nExhibition: ${sale.exhibition_name || 'Vadodara Exhibition'}\nCustomer: ${
      sale.customer_name || 'Walk-in'
    }\nTotal Amount: ${formatINR(sale.total_amount)}\nPayment Mode: ${sale.payment_mode}`;
    navigator.clipboard.writeText(text);
    success('Invoice details copied to clipboard!', 'Receipt Copied');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Tax Invoice – ${sale.invoice_no}`}
      subtitle="Official Divine Foods Sales Receipt"
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Authorized Digital Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyInvoice}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Copy Text
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#2D1F1E] hover:bg-[#1F1514] shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Receipt
            </button>
          </div>
        </div>
      }
    >
      {/* Printable Invoice Container */}
      <div
        ref={printRef}
        id="printable-invoice"
        className="p-4 sm:p-6 bg-white rounded-xl border border-stone-200 text-[#2D2523]"
      >
        {/* Header with Divine Foods Logo and Company details */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-stone-200 pb-5 gap-4">
          <div>
            <DivineLogo size="md" variant="full" />
            {addressLine && <p className="text-xs text-stone-500 mt-2">{addressLine}</p>}
            {contactLine && <p className="text-xs text-stone-500">{contactLine}</p>}
          </div>
          <div className="text-left sm:text-right">
            <span className="inline-block bg-[#2D1F1E]/10 text-[#2D1F1E] font-mono font-bold text-sm px-2.5 py-1 rounded">
              {sale.invoice_no}
            </span>
            <p className="text-xs text-stone-500 mt-1.5">
              Date: {formatDateTime(sale.sale_date)}
            </p>
            <div className="mt-1 flex items-center justify-start sm:justify-end gap-1.5">
              <StatusBadge status={sale.payment_mode} />
              <StatusBadge status={sale.payment_status} />
            </div>
          </div>
        </div>

        {/* Bill To and Exhibition Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-b border-stone-100 text-xs">
          <div>
            <span className="font-semibold text-stone-400 uppercase tracking-wider block mb-1">
              Billed To
            </span>
            <p className="font-bold text-sm text-[#2D2523]">
              {sale.customer_name || 'Walk-in Customer'}
            </p>
            {sale.customer_mobile && (
              <p className="text-stone-600">Mobile: {sale.customer_mobile}</p>
            )}
            <p className="text-stone-500">Billed by: {sale.user_name || 'Staff'}</p>
          </div>
          <div>
            <span className="font-semibold text-stone-400 uppercase tracking-wider block mb-1">
              Exhibition Location
            </span>
            <p className="font-bold text-sm text-[#2D1F1E]">
              {sale.exhibition_name || 'Vadodara Exhibition'}
            </p>
            <p className="text-stone-600">Brahman Sabha Hall, Vadodara</p>
            <p className="text-stone-500">Food & Premix Pavilion Stall</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5">Item Description</th>
                <th className="py-2.5 text-center">Qty</th>
                <th className="py-2.5 text-right">Rate</th>
                <th className="py-2.5 text-right">Disc</th>
                <th className="py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {sale.items && sale.items.length > 0 ? (
                sale.items.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="py-2.5">
                      <p className="font-semibold text-stone-800">{item.product_name}</p>
                      {item.sku && (
                        <span className="text-[10px] text-stone-400 font-mono">
                          SKU: {item.sku}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-center font-medium text-stone-700">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 text-right text-stone-700">
                      {formatINR(item.selling_price)}
                    </td>
                    <td className="py-2.5 text-right text-stone-500">
                      {item.discount ? formatINR(item.discount) : '-'}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-stone-800">
                      {formatINR(item.total_amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-stone-400">
                    No individual line items recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Calculations */}
        <div className="border-t border-stone-200 pt-4 mt-2">
          <div className="flex flex-col items-end space-y-1.5 text-xs">
            <div className="flex justify-between w-48 text-stone-600">
              <span>Subtotal:</span>
              <span className="font-medium">{formatINR(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between w-48 text-emerald-700">
                <span>Total Discount:</span>
                <span className="font-medium">- {formatINR(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between w-48 text-sm font-bold text-[#2D2523] border-t border-stone-200 pt-2 mt-1">
              <span>Total Paid:</span>
              <span className="text-[#2D1F1E] font-['Outfit',sans-serif] text-base">
                {formatINR(sale.total_amount)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 pt-4 border-t border-dashed border-stone-200 text-center text-[11px] text-stone-500">
          <p className="font-['Noto_Sans_Gujarati',sans-serif] text-xs font-semibold text-[#2D1F1E]">
            {BRAND_INFO.taglineGujarati}
          </p>
          <p className="mt-0.5">{company.invoice_footer_note}</p>
        </div>
      </div>
    </Modal>
  );
};
