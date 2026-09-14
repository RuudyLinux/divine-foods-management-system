import React, { useState } from 'react';
import {
  Search,
  Receipt,
  Download,
  Eye,
  Printer,
  Calendar,
  IndianRupee,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { db } from '../../lib/db';
import { Sale, Exhibition, PaymentMethod } from '../../types';
import { formatINR, formatDateTime, formatDate } from '../../lib/brand';
import { InvoiceModal } from '../../components/common/InvoiceModal';
import { useToast } from '../../components/common/Toast';

export const SalesHistoryView: React.FC = () => {
  const { success } = useToast();
  const [sales, setSales] = useState<Sale[]>(() => db.getSales());
  const exhibitions = db.getExhibitions();

  const [search, setSearch] = useState('');
  const [exhibitionFilter, setExhibitionFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL'); // ALL, TODAY, THIS_WEEK, THIS_MONTH

  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<Sale | null>(null);

  const handleExportCSV = () => {
    const headers = [
      'Invoice No',
      'Date',
      'Customer',
      'Phone',
      'Exhibition',
      'Payment Method',
      'Total Amount',
      'Total COGS',
      'Gross Profit',
      'Cashier',
    ];

    const rows = sales.map(s => {
      const exh = exhibitions.find(e => e.id === s.exhibition_id);
      return [
        s.invoice_no,
        formatDateTime(s.sale_date),
        `"${s.customer_name || 'Walk-in'}"`,
        s.customer_phone || '-',
        `"${exh?.name || 'Main Warehouse'}"`,
        s.payment_method,
        s.total_amount,
        s.total_cogs,
        s.gross_profit,
        `"${s.created_by_name || 'Staff'}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Divine_Foods_Sales_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Sales report exported to CSV successfully.');
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch =
      sale.invoice_no.toLowerCase().includes(search.toLowerCase()) ||
      (sale.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (sale.customer_phone || '').includes(search);

    const matchesExh = exhibitionFilter === 'ALL' || sale.exhibition_id === exhibitionFilter;
    const matchesPayment = paymentFilter === 'ALL' || sale.payment_method === paymentFilter;

    // Date filtering
    let matchesDate = true;
    const saleDateStr = sale.sale_date.split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    if (dateFilter === 'TODAY') {
      matchesDate = saleDateStr === todayStr;
    } else if (dateFilter === 'THIS_MONTH') {
      const currentMonth = todayStr.substring(0, 7);
      matchesDate = saleDateStr.startsWith(currentMonth);
    }

    return matchesSearch && matchesExh && matchesPayment && matchesDate;
  });

  const totalSalesRevenue = filteredSales.reduce((s, item) => s + item.total_amount, 0);
  const totalGrossProfit = filteredSales.reduce((s, item) => s + item.gross_profit, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#2D1F1E]">
            Billing & Invoices
          </span>
          <h1 className="text-2xl font-bold text-[#2D2523] font-['Outfit',sans-serif] mt-0.5">
            Sales & Orders History
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Complete transaction ledger with customer invoices, historical COGS margins, and receipt printing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI mini cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-stone-400 block">Total Invoices</span>
          <span className="text-xl font-bold text-stone-900 font-['Outfit',sans-serif]">
            {filteredSales.length} Orders
          </span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-stone-400 block">Filtered Revenue</span>
          <span className="text-xl font-bold text-[#2D1F1E] font-['Outfit',sans-serif]">
            {formatINR(totalSalesRevenue)}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-emerald-800 block">Total Gross Profit</span>
          <span className="text-xl font-bold text-emerald-900 font-['Outfit',sans-serif]">
            {formatINR(totalGrossProfit)}
          </span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        {/* Filters Toolbar */}
        <div className="p-4 border-b border-stone-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Invoice #, Customer Name, or Phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2D1F1E]/30"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="text-xs py-1.5 px-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 font-medium focus:outline-hidden"
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today</option>
              <option value="THIS_MONTH">This Month</option>
            </select>

            <select
              value={exhibitionFilter}
              onChange={e => setExhibitionFilter(e.target.value)}
              className="text-xs py-1.5 px-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 font-medium focus:outline-hidden"
            >
              <option value="ALL">All Venues</option>
              {exhibitions.map(e => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>

            <select
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value)}
              className="text-xs py-1.5 px-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 font-medium focus:outline-hidden"
            >
              <option value="ALL">All Payment Methods</option>
              <option value="UPI">UPI</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="MIXED">Mixed</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-[#FFF9F0]/70 text-stone-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Venue / Stall</th>
                <th className="py-3 px-4 text-center">Payment</th>
                <th className="py-3 px-4 text-right">Order Value</th>
                <th className="py-3 px-4 text-right">Gross Profit</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredSales.length > 0 ? (
                filteredSales.map(sale => {
                  const exh = exhibitions.find(e => e.id === sale.exhibition_id);
                  return (
                    <tr key={sale.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-stone-900">
                        {sale.invoice_no}
                      </td>
                      <td className="py-3.5 px-4 text-stone-500 font-medium">
                        {formatDateTime(sale.sale_date)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-stone-800 block">
                          {sale.customer_name || 'Walk-in Customer'}
                        </span>
                        {sale.customer_phone && (
                          <span className="text-[10px] text-stone-400 font-mono">
                            {sale.customer_phone}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-stone-700">
                        {exh?.name || 'Central Store'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                          {sale.payment_method}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-stone-900 font-mono">
                        {formatINR(sale.total_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-700 font-mono">
                        {formatINR(sale.gross_profit)}
                      </td>
                      <td className="py-3.5 px-4 text-stone-500 font-medium">
                        {sale.created_by_name || 'Staff'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedSaleForInvoice(sale)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-100 transition-colors font-semibold text-xs cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5 text-[#2D1F1E]" />
                          <span>Invoice</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-stone-400">
                    No sales matching current criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Modal */}
      {selectedSaleForInvoice && (
        <InvoiceModal
          isOpen={!!selectedSaleForInvoice}
          onClose={() => setSelectedSaleForInvoice(null)}
          sale={selectedSaleForInvoice}
        />
      )}
    </div>
  );
};
