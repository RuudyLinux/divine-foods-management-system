import React from 'react';
import {
  Calendar,
  MapPin,
  Receipt,
  Boxes,
  Plus,
  IndianRupee,
  Lock,
  ArrowRight,
  Eye,
  CheckCircle2,
  DollarSign,
  QrCode,
  Banknote,
  Package,
} from 'lucide-react';
import { db } from '../../lib/db';
import { Exhibition, Product, Sale } from '../../types';
import { formatINR, formatDate, formatDateTime } from '../../lib/brand';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';

interface ExhibitionUserDashboardProps {
  onNavigate: (tab: string) => void;
  onViewInvoice?: (sale: Sale) => void;
}

export const ExhibitionUserDashboard: React.FC<ExhibitionUserDashboardProps> = ({
  onNavigate,
  onViewInvoice,
}) => {
  const { user } = useAuth();
  const exhibitions = db.getExhibitions();

  // Find user's active exhibition stall
  const activeExhibition =
    exhibitions.find(e => e.assigned_user_id === user?.id && e.status === 'ACTIVE') ||
    exhibitions.find(e => e.status === 'ACTIVE') ||
    exhibitions[0];

  const allocations = activeExhibition ? db.getExhibitionAllocations(activeExhibition.id) : [];
  const sales = activeExhibition ? db.getSales(activeExhibition.id) : [];
  const expenses = activeExhibition ? db.getExpenses(activeExhibition.id) : [];

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => s.sale_date.startsWith(todayStr));
  const todayExpenses = expenses.filter(e => e.expense_date.startsWith(todayStr));

  const todaySalesTotal = todaySales.reduce((sum, s) => sum + s.total_amount, 0);
  const todayCashSales = todaySales
    .filter(s => s.payment_method === 'CASH')
    .reduce((sum, s) => sum + s.total_amount, 0);
  const todayUpiSales = todaySales
    .filter(s => s.payment_method === 'UPI')
    .reduce((sum, s) => sum + s.total_amount, 0);

  const totalUnitsSoldToday = todaySales.reduce(
    (sum, s) => sum + db.getSaleItems(s.id).reduce((isum, item) => isum + item.quantity, 0),
    0
  );

  const todayExpensesTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Stall Banner Header */}
      <div className="bg-[#1B4332] text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-900 font-bold text-[10px] tracking-wider uppercase">
              Assigned Stall
            </span>
            <span className="text-emerald-200 text-xs font-medium">
              Operator: {user?.name}
            </span>
          </div>

          <h1 className="text-2xl font-bold font-['Outfit',sans-serif] mt-1.5">
            {activeExhibition ? activeExhibition.name : 'Exhibition Stall'}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-emerald-100/80 mt-2">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-300" />
              <span>
                {activeExhibition?.location}, {activeExhibition?.city}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              <span>
                {activeExhibition ? formatDate(activeExhibition.start_date) : '-'} to{' '}
                {activeExhibition ? formatDate(activeExhibition.end_date) : '-'}
              </span>
            </span>
          </div>
        </div>

        {/* Quick Action Buttons for Fast POS Operations */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('new-sale')}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Receipt className="w-4 h-4" />
            <span>+ New Sale (POS)</span>
          </button>
          <button
            onClick={() => onNavigate('expenses')}
            className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <DollarSign className="w-4 h-4 text-amber-300" />
            <span>Record Expense</span>
          </button>
          <button
            onClick={() => onNavigate('day-closing')}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs border border-emerald-700 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-4 h-4 text-amber-300" />
            <span>Day Closing</span>
          </button>
        </div>
      </div>

      {/* Today's Stall Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <StatCard
          title="Today's Sales"
          value={formatINR(todaySalesTotal)}
          subtitle={`${todaySales.length} bills cleared`}
          icon={IndianRupee}
          accentColor="green"
        />
        <StatCard
          title="Cash Sales"
          value={formatINR(todayCashSales)}
          subtitle="Physical cash in drawer"
          icon={Banknote}
          accentColor="amber"
        />
        <StatCard
          title="UPI / QR Sales"
          value={formatINR(todayUpiSales)}
          subtitle="Direct bank settlement"
          icon={QrCode}
          accentColor="blue"
        />
        <StatCard
          title="Units Sold Today"
          value={`${totalUnitsSoldToday} Items`}
          subtitle="Across all products"
          icon={Package}
          accentColor="brown"
        />
        <StatCard
          title="Today's Expenses"
          value={formatINR(todayExpensesTotal)}
          subtitle="Stall expenses logged today"
          icon={DollarSign}
          accentColor="orange"
        />
      </div>

      {/* Allocated Products at this Stall */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#2C1810] font-['Outfit',sans-serif]">
              Stall Stock & Inventory Status
            </h3>
            <p className="text-xs text-stone-500">
              Allocated batches available for instant checkout
            </p>
          </div>
          <button
            onClick={() => onNavigate('new-sale')}
            className="text-xs font-semibold text-[#1B4332] hover:underline flex items-center gap-1"
          >
            <span>Open POS Terminal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto border border-stone-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-[#FBF9F5] text-stone-500 font-semibold uppercase">
                <th className="py-2.5 px-3">Product Name</th>
                <th className="py-2.5 px-3 text-center">Allocated</th>
                <th className="py-2.5 px-3 text-center">Sold</th>
                <th className="py-2.5 px-3 text-center">Remaining Balance</th>
                <th className="py-2.5 px-3 text-right">Selling Price</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {allocations.map(alloc => {
                const remaining = alloc.quantity_allocated - alloc.quantity_sold - alloc.quantity_returned;
                const isLow = remaining <= 5;
                const isOut = remaining <= 0;

                return (
                  <tr key={alloc.id} className="hover:bg-stone-50">
                    <td className="py-3 px-3 font-semibold text-stone-900">{alloc.product_name}</td>
                    <td className="py-3 px-3 text-center font-medium text-stone-600">
                      {alloc.quantity_allocated}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-[#1B4332]">
                      {alloc.quantity_sold}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`font-extrabold text-sm ${
                          isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-stone-900'
                        }`}
                      >
                        {remaining}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-stone-800 font-mono">
                      {formatINR(alloc.selling_price)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onNavigate('new-sale')}
                        disabled={isOut}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#1B4332]/10 text-[#1B4332] hover:bg-[#1B4332]/20 disabled:opacity-40 transition-colors"
                      >
                        Sell Unit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Stall Sales */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#2C1810] font-['Outfit',sans-serif]">
            Recent Stall Receipts
          </h3>
          <button
            onClick={() => onNavigate('sales-history')}
            className="text-xs font-semibold text-[#1B4332] hover:underline"
          >
            View All Sales
          </button>
        </div>

        <div className="space-y-2.5">
          {sales.slice(0, 5).map(sale => (
            <div
              key={sale.id}
              className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between gap-3 text-xs"
            >
              <div>
                <span className="font-mono font-bold text-stone-900">{sale.invoice_no}</span>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  {sale.customer_name || 'Walk-in'} • {formatDateTime(sale.sale_date)} • Paid via{' '}
                  {sale.payment_method}
                </p>
              </div>
              <div className="text-right flex items-center gap-3">
                <span className="font-bold text-[#1B4332] font-mono text-sm">
                  {formatINR(sale.total_amount)}
                </span>
                <button
                  onClick={() => onViewInvoice && onViewInvoice(sale)}
                  className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-white transition-colors"
                  title="View Invoice"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
