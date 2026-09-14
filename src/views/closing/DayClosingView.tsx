import React, { useState } from 'react';
import {
  Lock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  IndianRupee,
  Receipt,
  FileCheck,
  Printer,
  History,
  AlertTriangle,
} from 'lucide-react';
import { db } from '../../lib/db';
import { DayClosing, Exhibition } from '../../types';
import { formatINR, formatDate, formatDateTime } from '../../lib/brand';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { Modal } from '../../components/common/Modal';

export const DayClosingView: React.FC = () => {
  const { user, isExhibitionUser } = useAuth();
  const { success, error } = useToast();

  const [closings, setClosings] = useState<DayClosing[]>(() => db.getDayClosings());
  const exhibitions = db.getExhibitions();

  const activeExhibition = exhibitions.find(
    e => (isExhibitionUser ? e.assigned_user_id === user?.id : true) && e.status === 'ACTIVE'
  );

  const [selectedExhibitionId, setSelectedExhibitionId] = useState(
    activeExhibition?.id || exhibitions[0]?.id || ''
  );
  const [closingDate, setClosingDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Generate today's draft closing figures
  const draftClosing = db.generateDraftDayClosing(closingDate, selectedExhibitionId);

  // User input for actual physical cash counted in cash drawer
  const [actualCash, setActualCash] = useState<number>(draftClosing.actual_cash_in_hand);
  const [notes, setNotes] = useState('');
  const [selectedClosingForReport, setSelectedClosingForReport] = useState<DayClosing | null>(null);

  const cashDifference = actualCash - draftClosing.expected_cash_in_hand;

  const refreshList = () => {
    setClosings(db.getDayClosings());
  };

  const handleConfirmClosing = () => {
    try {
      const confirmed = db.confirmDayClosing(
        closingDate,
        selectedExhibitionId,
        actualCash,
        user?.id || 'usr_staff',
        user?.name || 'Cashier',
        notes.trim() || undefined
      );

      success(`Day closing for ${formatDate(closingDate)} confirmed successfully and locked.`);
      refreshList();
    } catch (err: any) {
      error(err.message || 'Error confirming day closing');
    }
  };

  const isAlreadyConfirmed = draftClosing.status === 'CONFIRMED';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#2D1F1E]">
            Reconciliation & Drawer Audit
          </span>
          <h1 className="text-2xl font-bold text-[#2D2523] font-['Outfit',sans-serif] mt-0.5">
            Day Closing & Cash Reconciliation
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Reconcile daily POS collection, verify physical cash against digital registers, and seal the daily ledger.
          </p>
        </div>
      </div>

      {/* Main Reconciliation Card */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-6 space-y-6">
        {/* Date & Stall Context Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#FFF9F0] border border-stone-200">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                Closing Date
              </label>
              <input
                type="date"
                value={closingDate}
                onChange={e => setClosingDate(e.target.value)}
                className="text-xs font-bold py-1.5 px-3 bg-white border border-stone-200 rounded-xl focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                Stall / Location
              </label>
              <select
                value={selectedExhibitionId}
                onChange={e => setSelectedExhibitionId(e.target.value)}
                className="text-xs font-bold py-1.5 px-3 bg-white border border-stone-200 rounded-xl focus:outline-hidden"
              >
                {exhibitions.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.city})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={draftClosing.status} />
            {isAlreadyConfirmed && (
              <span className="text-xs text-stone-500 font-medium">
                Confirmed by: <strong>{draftClosing.confirmed_by_name}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Breakdown Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sales Collections */}
          <div className="p-5 rounded-2xl bg-stone-50/60 border border-stone-200 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-[#2D1F1E]" />
              <span>Today's Total Sales</span>
            </h4>
            <div className="text-2xl font-extrabold text-[#2D1F1E] font-['Outfit',sans-serif]">
              {formatINR(draftClosing.total_sales)}
            </div>

            <div className="pt-2 border-t border-stone-200 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Cash Sales:</span>
                <span className="font-bold text-stone-900 font-mono">
                  {formatINR(draftClosing.cash_sales)}
                </span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>UPI / QR Sales:</span>
                <span className="font-bold text-stone-900 font-mono">
                  {formatINR(draftClosing.upi_sales)}
                </span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Card Sales:</span>
                <span className="font-bold text-stone-900 font-mono">
                  {formatINR(draftClosing.card_sales)}
                </span>
              </div>
            </div>
          </div>

          {/* Today's Expenses */}
          <div className="p-5 rounded-2xl bg-stone-50/60 border border-stone-200 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              <IndianRupee className="w-4 h-4 text-rose-600" />
              <span>Today's Stall Expenses</span>
            </h4>
            <div className="text-2xl font-extrabold text-rose-700 font-['Outfit',sans-serif]">
              {formatINR(draftClosing.total_expenses)}
            </div>

            <div className="pt-2 border-t border-stone-200 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Cash Paid Expenses:</span>
                <span className="font-bold text-rose-700 font-mono">
                  {formatINR(draftClosing.cash_expenses)}
                </span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>UPI / Bank Expenses:</span>
                <span className="font-bold text-stone-900 font-mono">
                  {formatINR(draftClosing.upi_expenses)}
                </span>
              </div>
            </div>
          </div>

          {/* Cash In Hand & Drawer Audit */}
          <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-emerald-700" />
              <span>Cash Drawer Audit</span>
            </h4>
            <div>
              <span className="text-[10px] text-stone-500 font-medium block">
                System Expected Cash
              </span>
              <span className="text-xl font-bold text-stone-900 font-mono">
                {formatINR(draftClosing.expected_cash_in_hand)}
              </span>
            </div>

            <div className="pt-2 border-t border-emerald-200 space-y-2 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Actual Physical Cash Counted (₹)
                </label>
                <input
                  type="number"
                  disabled={isAlreadyConfirmed}
                  value={actualCash}
                  onChange={e => setActualCash(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-xl font-bold text-sm text-stone-900 font-mono focus:outline-hidden disabled:bg-stone-100"
                />
              </div>

              <div className="flex justify-between items-center pt-1 font-bold">
                <span className="text-stone-700">Cash Difference:</span>
                <span
                  className={`font-mono text-sm ${
                    cashDifference === 0
                      ? 'text-emerald-700'
                      : cashDifference > 0
                      ? 'text-blue-700'
                      : 'text-rose-600'
                  }`}
                >
                  {cashDifference > 0 ? `+${formatINR(cashDifference)}` : formatINR(cashDifference)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Discrepancy explanation & Confirm Button */}
        <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="w-full sm:max-w-md">
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Closing Notes & Discrepancy Comments
            </label>
            <input
              type="text"
              disabled={isAlreadyConfirmed}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. ₹50 loose change adjustment, all registers balanced"
              className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden disabled:bg-stone-100"
            />
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            {isAlreadyConfirmed ? (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-100 text-stone-600 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Day Closing Finalized & Locked</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConfirmClosing}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#2D1F1E] hover:bg-[#1F1514] shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Day Closing</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Historical Day Closings Table */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#2D2523] font-['Outfit',sans-serif] flex items-center gap-2">
            <History className="w-4 h-4 text-[#2D1F1E]" />
            <span>Historical Day Closings</span>
          </h3>
          <span className="text-xs text-stone-500 font-medium">
            {closings.length} audits logged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-[#FFF9F0]/70 text-stone-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Exhibition / Venue</th>
                <th className="py-3 px-4 text-right">Total Sales</th>
                <th className="py-3 px-4 text-right">Expected Cash</th>
                <th className="py-3 px-4 text-right">Actual Cash</th>
                <th className="py-3 px-4 text-right">Difference</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Confirmed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {closings.map(c => {
                const exh = exhibitions.find(e => e.id === c.exhibition_id);
                return (
                  <tr key={c.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-stone-900">{formatDate(c.date)}</td>
                    <td className="py-3.5 px-4 text-stone-700">{exh?.name || 'Main Store'}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#2D1F1E] font-mono">
                      {formatINR(c.total_sales)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-stone-600 font-mono">
                      {formatINR(c.expected_cash_in_hand)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-stone-900 font-mono">
                      {formatINR(c.actual_cash_in_hand)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold font-mono">
                      <span
                        className={
                          c.cash_difference === 0
                            ? 'text-emerald-700'
                            : c.cash_difference > 0
                            ? 'text-blue-700'
                            : 'text-rose-600'
                        }
                      >
                        {formatINR(c.cash_difference)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-3.5 px-4 text-stone-500 font-medium">
                      {c.confirmed_by_name || 'Staff'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
