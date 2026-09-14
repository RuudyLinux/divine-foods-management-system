import React, { useState } from 'react';
import {
  DollarSign,
  Plus,
  Search,
  Calendar,
  Layers,
  Download,
  IndianRupee,
  PieChart as PieIcon,
  Filter,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { db } from '../../lib/db';
import { Expense, ExpenseCategory, PaymentMethod, Exhibition } from '../../types';
import { formatINR, formatDate } from '../../lib/brand';
import { StatCard } from '../../components/common/StatCard';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';

export const ExpensesView: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>(() => db.getExpenses());
  const exhibitions = db.getExhibitions();

  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'EXHIBITION' | 'COMPANY'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [scope, setScope] = useState<'EXHIBITION' | 'COMPANY'>('EXHIBITION');
  const [exhibitionId, setExhibitionId] = useState(exhibitions[0]?.id || '');
  const [category, setCategory] = useState<ExpenseCategory>('STALL_RENT');
  const [amount, setAmount] = useState(2500);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [description, setDescription] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');

  const refreshList = () => {
    setExpenses(db.getExpenses());
  };

  const handleOpenAdd = () => {
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setScope('EXHIBITION');
    setExhibitionId(exhibitions[0]?.id || '');
    setCategory('STALL_RENT');
    setAmount(2000);
    setPaymentMethod('UPI');
    setDescription('');
    setReceiptUrl('');
    setIsAddModalOpen(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      error('Amount must be greater than zero.');
      return;
    }
    if (!description.trim()) {
      error('Description is required.');
      return;
    }

    db.addExpense({
      exhibition_id: scope === 'EXHIBITION' ? exhibitionId : undefined,
      category,
      amount,
      description: description.trim(),
      expense_date: expenseDate,
      payment_method: paymentMethod,
      receipt_url: receiptUrl.trim() || undefined,
      created_by: user?.id || 'usr_admin',
      created_by_name: user?.name || 'Administrator',
    });

    success('Expense logged successfully.');
    setIsAddModalOpen(false);
    refreshList();
  };

  // KPIs
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const exhibitionTotal = expenses
    .filter(e => e.exhibition_id)
    .reduce((sum, e) => sum + e.amount, 0);
  const companyTotal = expenses
    .filter(e => !e.exhibition_id)
    .reduce((sum, e) => sum + e.amount, 0);

  // Category breakdown data for chart
  const categoriesList: ExpenseCategory[] = [
    'STALL_RENT',
    'TRAVEL',
    'FOOD',
    'MARKETING',
    'PACKAGING_MATERIAL',
    'UTILITIES',
    'MISCELLANEOUS',
  ];

  const categoryChartData = categoriesList.map(cat => {
    const catTotal = expenses
      .filter(e => e.category === cat)
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      name: cat.replace('_', ' ').toLowerCase(),
      amount: catTotal,
    };
  });

  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch =
      exp.description.toLowerCase().includes(search.toLowerCase()) ||
      exp.category.toLowerCase().includes(search.toLowerCase());

    const isExh = !!exp.exhibition_id;
    const matchesScope =
      scopeFilter === 'ALL' ||
      (scopeFilter === 'EXHIBITION' && isExh) ||
      (scopeFilter === 'COMPANY' && !isExh);

    const matchesCat = categoryFilter === 'ALL' || exp.category === categoryFilter;

    return matchesSearch && matchesScope && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        eyebrow="Cost & Overhead Ledger"
        title="Expenses Management"
        description="Track stall bookings, logistics, food & beverages, packaging materials, and general operating costs."
        actions={
          <>
          <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[10px] border border-transparent bg-[#2D1F1E] text-white text-[13px] font-semibold leading-none transition-colors hover:bg-[#1F1514] focus-ring disabled:cursor-not-allowed disabled:opacity-55"
          >
          <Plus className="w-4 h-4" />
          <span>+ Add Expense</span>
          </button>
          </>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Operating Expenses"
          value={formatINR(totalExpenses)}
          subtitle={`${expenses.length} expense entries recorded`}
          icon={IndianRupee}
          accentColor="orange"
        />
        <StatCard
          title="Exhibition Stall Costs"
          value={formatINR(exhibitionTotal)}
          subtitle="Stall rents, flex banners & daily food"
          icon={Calendar}
          accentColor="amber"
        />
        <StatCard
          title="Company & Factory Overhead"
          value={formatINR(companyTotal)}
          subtitle="Packaging materials & kitchen utilities"
          icon={Layers}
          accentColor="blue"
        />
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search expenses by notes or category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2D1F1E]/30"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={scopeFilter}
              onChange={e => setScopeFilter(e.target.value as any)}
              className="text-xs py-1.5 px-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 font-medium focus:outline-hidden"
            >
              <option value="ALL">All Scopes</option>
              <option value="EXHIBITION">Exhibitions Only</option>
              <option value="COMPANY">Company / Factory Only</option>
            </select>

            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="text-xs py-1.5 px-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 font-medium focus:outline-hidden"
            >
              <option value="ALL">All Categories</option>
              {categoriesList.map(c => (
                <option key={c} value={c}>
                  {c.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-[#FFF9F0]/70 text-stone-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Scope / Venue</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-center">Payment Method</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Authorized By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map(exp => {
                  const exh = exhibitions.find(e => e.id === exp.exhibition_id);
                  return (
                    <tr key={exp.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-stone-500 font-medium">
                        {formatDate(exp.expense_date)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-stone-800">
                        {exp.category.replace('_', ' ')}
                      </td>
                      <td className="py-3.5 px-4">
                        {exh ? (
                          <span className="font-semibold text-[#2D1F1E]">{exh.name}</span>
                        ) : (
                          <span className="text-stone-500 italic">Central Factory</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-stone-600 max-w-sm truncate">
                        {exp.description}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                          {exp.payment_method}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-rose-700 font-mono text-sm">
                        {formatINR(exp.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-stone-500 font-medium">
                        {exp.created_by_name || 'Staff'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400">
                    No expense records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record New Expense"
        subtitle="Log operational overheads or exhibition specific expenses"
      >
        <form onSubmit={handleSaveExpense} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Expense Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={e => setExpenseDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Expense Scope
              </label>
              <select
                value={scope}
                onChange={e => setScope(e.target.value as any)}
                className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
              >
                <option value="EXHIBITION">Exhibition Specific</option>
                <option value="COMPANY">General Factory / Company</option>
              </select>
            </div>
          </div>

          {scope === 'EXHIBITION' && (
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Select Exhibition Venue <span className="text-rose-500">*</span>
              </label>
              <select
                value={exhibitionId}
                onChange={e => setExhibitionId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
              >
                {exhibitions.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.city})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
              >
                {categoriesList.map(c => (
                  <option key={c} value={c}>
                    {c.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
              >
                <option value="UPI">UPI (GPay / PhonePe)</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              required
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl font-bold text-rose-700 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Description <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Printing 1000 brand flyers and stall flex banner"
              className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Receipt / Bill Image URL (Optional)
            </label>
            <input
              type="url"
              value={receiptUrl}
              onChange={e => setReceiptUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[10px] border border-[#E8DED2] bg-[#F7F0E5] text-[#2D1F1E] text-[13px] font-semibold leading-none transition-colors hover:bg-[#EFE4D5] focus-ring disabled:cursor-not-allowed disabled:opacity-55"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[10px] border border-transparent bg-[#2D1F1E] text-white text-[13px] font-semibold leading-none transition-colors hover:bg-[#1F1514] focus-ring disabled:cursor-not-allowed disabled:opacity-55"
            >
              Save Expense Entry
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
