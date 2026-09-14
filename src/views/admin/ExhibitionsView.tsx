import React, { useState } from 'react';
import {
  Calendar,
  MapPin,
  Plus,
  Boxes,
  IndianRupee,
  TrendingUp,
  Receipt,
  UserCheck,
  CheckCircle2,
  XCircle,
  Eye,
  ArrowRight,
  Package,
  RotateCcw,
  Sparkles,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { db } from '../../lib/db';
import {
  Exhibition,
  ExhibitionStatus,
  Product,
  ExhibitionAllocation,
  Expense,
  ExpenseCategory,
  PaymentMethod,
} from '../../types';
import { formatINR, formatDate, formatDateTime } from '../../lib/brand';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';

export const ExhibitionsView: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [exhibitions, setExhibitions] = useState<Exhibition[]>(() => db.getExhibitions());
  const [users] = useState(() => db.getUsers());
  const [products] = useState<Product[]>(() => db.getProducts());

  const [statusTab, setStatusTab] = useState<'ALL' | ExhibitionStatus>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedExhibition, setSelectedExhibition] = useState<Exhibition | null>(null);

  // Sub-modals for details view
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);

  // Form State: Add Exhibition
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('Vadodara');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [assignedUserId, setAssignedUserId] = useState('');
  const [notes, setNotes] = useState('');

  // Form State: Allocate Product
  const [allocateProductId, setAllocateProductId] = useState('');
  const [allocateQty, setAllocateQty] = useState(25);

  // Form State: Return Product
  const [returnAllocationId, setReturnAllocationId] = useState('');
  const [returnQty, setReturnQty] = useState(5);

  // Form State: Add Expense
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('STALL_RENT');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState(2500);
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<PaymentMethod>('UPI');

  const refreshList = () => {
    setExhibitions(db.getExhibitions());
    if (selectedExhibition) {
      const refreshed = db.getExhibitions().find(e => e.id === selectedExhibition.id) || null;
      setSelectedExhibition(refreshed);
    }
  };

  const handleOpenAdd = () => {
    setName('');
    setLocation('');
    setCity('Vadodara');
    setStartDate(new Date().toISOString().split('T')[0]);
    const d = new Date();
    d.setDate(d.getDate() + 3);
    setEndDate(d.toISOString().split('T')[0]);
    const exhUser = users.find(u => u.role === 'EXHIBITION_USER');
    setAssignedUserId(exhUser?.id || users[0]?.id || '');
    setNotes('');
    setIsAddModalOpen(true);
  };

  const handleSaveExhibition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim() || !city.trim()) {
      error('Please complete all required fields.');
      return;
    }

    const assignedUser = users.find(u => u.id === assignedUserId);
    const created = db.createExhibition({
      name: name.trim(),
      location: location.trim(),
      city: city.trim(),
      start_date: startDate,
      end_date: endDate,
      status: 'UPCOMING',
      assigned_user_id: assignedUserId,
      assigned_user_name: assignedUser?.name || 'Assigned Staff',
      notes: notes.trim(),
      created_by: user?.id || 'usr_admin',
    });

    success(`Exhibition "${created.name}" created successfully.`);
    setIsAddModalOpen(false);
    refreshList();
  };

  // Product Allocation Handler
  const handleSaveAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExhibition) return;

    const prod = products.find(p => p.id === allocateProductId);
    if (!prod) {
      error('Please select a valid product.');
      return;
    }

    if (allocateQty > prod.current_stock) {
      error(
        `Insufficient stock in main inventory! Available: ${prod.current_stock}, Requested: ${allocateQty}.`
      );
      return;
    }

    try {
      db.allocateProductToExhibition(
        selectedExhibition.id,
        prod.id,
        allocateQty,
        user?.id || 'usr_admin',
        user?.name || 'Administrator'
      );
      success(`${allocateQty} units of "${prod.name}" allocated to ${selectedExhibition.name}.`);
      setIsAllocateModalOpen(false);
      refreshList();
    } catch (err: any) {
      error(err.message || 'Allocation failed');
    }
  };

  // Product Return Handler
  const handleSaveReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExhibition || !returnAllocationId) return;

    try {
      db.returnProductFromExhibition(
        returnAllocationId,
        returnQty,
        user?.id || 'usr_admin',
        user?.name || 'Administrator'
      );
      success(`${returnQty} units returned to central warehouse inventory.`);
      setIsReturnModalOpen(false);
      refreshList();
    } catch (err: any) {
      error(err.message || 'Return failed');
    }
  };

  // Add Expense Handler
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExhibition) return;
    if (expenseAmount <= 0) {
      error('Expense amount must be greater than zero.');
      return;
    }

    db.addExpense({
      exhibition_id: selectedExhibition.id,
      category: expenseCategory,
      amount: expenseAmount,
      description: expenseDescription.trim(),
      expense_date: new Date().toISOString().split('T')[0],
      payment_method: expensePaymentMethod,
      created_by: user?.id || 'usr_admin',
      created_by_name: user?.name || 'Administrator',
    });

    success('Exhibition expense logged successfully.');
    setIsExpenseModalOpen(false);
    refreshList();
  };

  // Start Exhibition: marks the stall as trading today.
  const handleStartExhibition = () => {
    if (!selectedExhibition) return;
    db.updateExhibition(selectedExhibition.id, { status: 'ACTIVE' });
    success(`"${selectedExhibition.name}" is now active. Staff can bill against this stall.`);
    refreshList();
  };

  // Close Exhibition
  const handleConfirmCloseExhibition = () => {
    if (!selectedExhibition) return;
    db.updateExhibition(selectedExhibition.id, { status: 'COMPLETED' });
    success(`Exhibition "${selectedExhibition.name}" marked as Completed.`);
    setIsCloseConfirmOpen(false);
    refreshList();
  };

  const filteredExhibitions = exhibitions.filter(e => {
    if (statusTab === 'ALL') return true;
    return e.status === statusTab;
  });

  // Selected exhibition data
  const selectedAnalytics = selectedExhibition ? db.getExhibitionAnalytics(selectedExhibition.id) : null;
  const selectedAllocations = selectedExhibition
    ? db.getExhibitionAllocations(selectedExhibition.id)
    : [];
  const selectedSales = selectedExhibition ? db.getSales(selectedExhibition.id) : [];
  const selectedExpenses = selectedExhibition ? db.getExpenses(selectedExhibition.id) : [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        eyebrow="Pop-up Venues & Expos"
        title="Exhibitions"
        description="Dispatch stock to stalls, track sales and see net profit per venue."
        actions={
          <>
          <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[10px] border border-transparent bg-[#2D1F1E] text-white text-[13px] font-semibold leading-none transition-colors hover:bg-[#1F1514] focus-ring disabled:cursor-not-allowed disabled:opacity-55"
          >
          <Plus className="w-4 h-4" />
          <span>+ Create Exhibition</span>
          </button>
          </>
        }
      />

      {/* Tabs for Exhibition Status */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        {(['ALL', 'ACTIVE', 'UPCOMING', 'COMPLETED', 'CANCELLED'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setStatusTab(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
              statusTab === tab
                ? 'bg-[#2D1F1E] text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {tab.toLowerCase()}
          </button>
        ))}
      </div>

      {/* Exhibitions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredExhibitions.map(exh => {
          const analytics = db.getExhibitionAnalytics(exh.id);
          const allocCount = db.getExhibitionAllocations(exh.id).length;

          return (
            <div
              key={exh.id}
              className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-base text-[#2D2523] font-['Outfit',sans-serif]">
                      {exh.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-[#F47B20]" />
                      <span>
                        {exh.location}, {exh.city}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={exh.status} />
                </div>

                <div className="mt-4 p-3 rounded-xl bg-[#FFF9F0] border border-stone-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-stone-600">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      <span>Duration</span>
                    </span>
                    <span className="font-semibold text-stone-800">
                      {formatDate(exh.start_date)} - {formatDate(exh.end_date)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-stone-600">
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-stone-400" />
                      <span>Manager</span>
                    </span>
                    <span className="font-semibold text-[#2D1F1E]">
                      {exh.assigned_user_name || 'Staff'}
                    </span>
                  </div>
                </div>

                {/* Financial Overview */}
                <div className="mt-4 grid grid-cols-3 gap-2 text-center pt-2 border-t border-stone-100">
                  <div className="p-2 bg-stone-50 rounded-lg">
                    <span className="text-[10px] text-stone-400 uppercase font-bold block">
                      Sales
                    </span>
                    <span className="text-xs font-bold text-stone-900">
                      {formatINR(analytics?.salesRevenue || 0)}
                    </span>
                  </div>
                  <div className="p-2 bg-stone-50 rounded-lg">
                    <span className="text-[10px] text-stone-400 uppercase font-bold block">
                      Expenses
                    </span>
                    <span className="text-xs font-bold text-rose-700">
                      {formatINR(analytics?.exhibitionExpenses || 0)}
                    </span>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                    <span className="text-[10px] text-emerald-700 uppercase font-bold block">
                      Net Profit
                    </span>
                    <span className="text-xs font-bold text-emerald-800">
                      {formatINR(analytics?.netProfit || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-stone-500">
                  {allocCount} products allocated
                </span>
                <button
                  onClick={() => setSelectedExhibition(exh)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2D1F1E] hover:bg-[#1F1514] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <span>Manage Stall</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Exhibition Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New Exhibition Stall"
        subtitle="Schedule a food exhibition, book dates, and assign responsible team member"
      >
        <form onSubmit={handleSaveExhibition} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Exhibition Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Vadodara Navratri Food Expo 2026"
              className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2D1F1E]/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Venue / Location <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Navlakhi Ground, Stall #42"
                className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                City <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. Vadodara, Ahmedabad, Surat"
                className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                End Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Assigned Stall Operator
            </label>
            <select
              value={assignedUserId}
              onChange={e => setAssignedUserId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Notes / Target</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Expected footfall: 5000/day. Focus on Brownie Premix samplers."
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
              Create Exhibition
            </button>
          </div>
        </form>
      </Modal>

      {/* Comprehensive Exhibition Details Modal */}
      {selectedExhibition && (
        <Modal
          isOpen={!!selectedExhibition}
          onClose={() => setSelectedExhibition(null)}
          title={selectedExhibition.name}
          subtitle={`${selectedExhibition.location}, ${selectedExhibition.city} | ${formatDate(
            selectedExhibition.start_date
          )} - ${formatDate(selectedExhibition.end_date)}`}
          maxWidth="4xl"
        >
          <div className="space-y-6">
            {/* Quick Actions & Status Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#FFF9F0] border border-stone-200">
              <div className="flex items-center gap-3">
                <StatusBadge status={selectedExhibition.status} />
                <span className="text-xs text-stone-600 font-medium">
                  Assigned to: <strong className="text-stone-900">{selectedExhibition.assigned_user_name}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const firstP = products[0];
                    setAllocateProductId(firstP?.id || '');
                    setAllocateQty(20);
                    setIsAllocateModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#2D1F1E] hover:bg-[#1F1514] shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Allocate Stock</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExpenseDescription('Stall electrical connection / banner setup');
                    setExpenseAmount(1500);
                    setIsExpenseModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-700 bg-white border border-stone-200 hover:bg-stone-50"
                >
                  <DollarSign className="w-3.5 h-3.5 text-[#F47B20]" />
                  <span>Add Expense</span>
                </button>
                {(selectedExhibition.status === 'UPCOMING' ||
                  selectedExhibition.status === 'PLANNED') && (
                  <button
                    type="button"
                    onClick={handleStartExhibition}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100"
                  >
                    <span>Start Exhibition</span>
                  </button>
                )}
                {selectedExhibition.status !== 'COMPLETED' && (
                  <button
                    type="button"
                    onClick={() => setIsCloseConfirmOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100"
                  >
                    <span>Close Exhibition</span>
                  </button>
                )}
              </div>
            </div>

            {/* Financial Performance KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-xs text-center">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Total Sales</span>
                <span className="text-base font-bold text-[#2D1F1E] font-mono">
                  {formatINR(selectedAnalytics?.salesRevenue || 0)}
                </span>
                <span className="text-[10px] text-stone-500 block mt-0.5">
                  {selectedSales.length} POS transactions
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-xs text-center">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Historical COGS</span>
                <span className="text-base font-bold text-stone-700 font-mono">
                  {formatINR(selectedAnalytics?.costOfGoodsSold || 0)}
                </span>
                <span className="text-[10px] text-stone-500 block mt-0.5">Unit cost of sold items</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-xs text-center">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Stall Expenses</span>
                <span className="text-base font-bold text-rose-700 font-mono">
                  {formatINR(selectedAnalytics?.exhibitionExpenses || 0)}
                </span>
                <span className="text-[10px] text-stone-500 block mt-0.5">Rent, food & logistics</span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 shadow-xs text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">Net Venue Profit</span>
                <span className="text-lg font-extrabold text-emerald-900 font-mono">
                  {formatINR(selectedAnalytics?.netProfit || 0)}
                </span>
                <span className="text-[10px] text-emerald-700 block mt-0.5">
                  Net Margin: {selectedAnalytics?.netMargin.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Allocated Products Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Allocated Products & Inventory Status ({selectedAllocations.length})
                </h4>
              </div>
              <div className="overflow-x-auto border border-stone-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 bg-[#FFF9F0] text-stone-500 font-semibold uppercase">
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3 text-center">Allocated</th>
                      <th className="py-2.5 px-3 text-center">Sold</th>
                      <th className="py-2.5 px-3 text-center">Returned</th>
                      <th className="py-2.5 px-3 text-center">Stall Balance</th>
                      <th className="py-2.5 px-3 text-right">Cost/Unit</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {selectedAllocations.map(alloc => {
                      const stallBalance = alloc.quantity_allocated - alloc.quantity_sold - alloc.quantity_returned;
                      return (
                        <tr key={alloc.id} className="hover:bg-stone-50">
                          <td className="py-2.5 px-3 font-semibold text-stone-900">{alloc.product_name}</td>
                          <td className="py-2.5 px-3 text-center font-bold">{alloc.quantity_allocated}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-[#2D1F1E]">{alloc.quantity_sold}</td>
                          <td className="py-2.5 px-3 text-center text-stone-500">{alloc.quantity_returned}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-amber-700">{stallBalance}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatINR(alloc.cost_per_unit)}</td>
                          <td className="py-2.5 px-3 text-right">
                            {stallBalance > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReturnAllocationId(alloc.id);
                                  setReturnQty(stallBalance);
                                  setIsReturnModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2D1F1E] hover:underline"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Return to Main</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expenses List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Stall Expenses ({selectedExpenses.length})
                </h4>
              </div>
              <div className="space-y-2">
                {selectedExpenses.map(exp => (
                  <div
                    key={exp.id}
                    className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-stone-900">{exp.category.replace('_', ' ')}</span>
                      <p className="text-[11px] text-stone-500">
                        {exp.description} • Paid via {exp.payment_method}
                      </p>
                    </div>
                    <span className="font-bold text-rose-700 font-mono text-sm">
                      {formatINR(exp.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Allocate Product */}
      <Modal
        isOpen={isAllocateModalOpen}
        onClose={() => setIsAllocateModalOpen(false)}
        title="Allocate Product to Stall"
        subtitle="Deducts stock from central warehouse and dispatches to exhibition"
      >
        <form onSubmit={handleSaveAllocation} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Select Product</label>
            <select
              value={allocateProductId}
              onChange={e => setAllocateProductId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} (Warehouse stock: {p.current_stock} {p.unit}s)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Quantity to Dispatch
            </label>
            <input
              type="number"
              min={1}
              required
              value={allocateQty}
              onChange={e => setAllocateQty(Math.max(1, Number(e.target.value)))}
              className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsAllocateModalOpen(false)}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[10px] border border-[#E8DED2] bg-[#F7F0E5] text-[#2D1F1E] text-[13px] font-semibold leading-none transition-colors hover:bg-[#EFE4D5] focus-ring disabled:cursor-not-allowed disabled:opacity-55"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[10px] border border-transparent bg-[#2D1F1E] text-white text-[13px] font-semibold leading-none transition-colors hover:bg-[#1F1514] focus-ring disabled:cursor-not-allowed disabled:opacity-55"
            >
              Dispatch to Exhibition
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Return Product */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title="Return Stock to Central Warehouse"
        subtitle="Unsold inventory will be credited back to main warehouse stock"
      >
        <form onSubmit={handleSaveReturn} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Quantity to Return</label>
            <input
              type="number"
              min={1}
              required
              value={returnQty}
              onChange={e => setReturnQty(Math.max(1, Number(e.target.value)))}
              className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsReturnModalOpen(false)}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[10px] border border-[#E8DED2] bg-[#F7F0E5] text-[#2D1F1E] text-[13px] font-semibold leading-none transition-colors hover:bg-[#EFE4D5] focus-ring disabled:cursor-not-allowed disabled:opacity-55"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[10px] border border-transparent bg-[#2D1F1E] text-white text-[13px] font-semibold leading-none transition-colors hover:bg-[#1F1514] focus-ring disabled:cursor-not-allowed disabled:opacity-55"
            >
              Confirm Return to Main Stock
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Expense */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Record Stall Expense"
        subtitle="Log operational costs incurred at this exhibition"
      >
        <form onSubmit={handleSaveExpense} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Category</label>
              <select
                value={expenseCategory}
                onChange={e => setExpenseCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
              >
                <option value="STALL_RENT">Stall Rent</option>
                <option value="TRAVEL">Travel / Auto</option>
                <option value="FOOD">Food / Meals</option>
                <option value="MARKETING">Marketing / Flex</option>
                <option value="MISCELLANEOUS">Miscellaneous</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Payment Method</label>
              <select
                value={expensePaymentMethod}
                onChange={e => setExpensePaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
              >
                <option value="UPI">UPI (Google Pay/Paytm)</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Amount (₹)</label>
            <input
              type="number"
              min={1}
              required
              value={expenseAmount}
              onChange={e => setExpenseAmount(Number(e.target.value))}
              className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl font-bold text-rose-700 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Description</label>
            <input
              type="text"
              required
              value={expenseDescription}
              onChange={e => setExpenseDescription(e.target.value)}
              placeholder="e.g. Electrical wiring deposit, tea & snacks for volunteers..."
              className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[10px] border border-[#E8DED2] bg-[#F7F0E5] text-[#2D1F1E] text-[13px] font-semibold leading-none transition-colors hover:bg-[#EFE4D5] focus-ring disabled:cursor-not-allowed disabled:opacity-55"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[10px] border border-transparent bg-[#2D1F1E] text-white text-[13px] font-semibold leading-none transition-colors hover:bg-[#1F1514] focus-ring disabled:cursor-not-allowed disabled:opacity-55"
            >
              Save Stall Expense
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation to Close Exhibition */}
      <ConfirmationDialog
        isOpen={isCloseConfirmOpen}
        onClose={() => setIsCloseConfirmOpen(false)}
        onConfirm={handleConfirmCloseExhibition}
        title="Complete Exhibition"
        message="Mark this exhibition as Completed? Any remaining unsold units can be returned to main inventory."
        confirmLabel="Complete Exhibition"
        variant="warning"
      />
    </div>
  );
};
