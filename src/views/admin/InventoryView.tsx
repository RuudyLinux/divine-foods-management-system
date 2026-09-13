import React, { useState } from 'react';
import {
  Boxes,
  ArrowLeftRight,
  AlertTriangle,
  Package,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
  Plus,
  IndianRupee,
} from 'lucide-react';
import { db } from '../../lib/db';
import { Product, StockMovement, StockMovementType } from '../../types';
import { formatINR, formatDateTime } from '../../lib/brand';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';

interface InventoryViewProps {
  initialTab?: 'stock' | 'movements' | 'low-stock';
}

export const InventoryView: React.FC<InventoryViewProps> = ({ initialTab = 'stock' }) => {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'stock' | 'movements'>(
    initialTab === 'movements' ? 'movements' : 'stock'
  );
  const [search, setSearch] = useState('');
  const [movementFilter, setMovementFilter] = useState<string>('ALL');

  // Stock Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustProductId, setAdjustProductId] = useState('');
  const [adjustType, setAdjustType] = useState<'ADD' | 'REMOVE'>('ADD');
  const [adjustQty, setAdjustQty] = useState(10);
  const [adjustReason, setAdjustReason] = useState('Damaged packaging / shelf correction');

  const products = db.getProducts();
  const categories = db.getCategories();
  const movements = db.getStockMovements();

  // Metrics
  const totalUnits = products.reduce((sum, p) => sum + p.current_stock, 0);
  const sellingStockValue = products.reduce(
    (sum, p) => sum + p.current_stock * p.default_selling_price,
    0
  );
  const costStockValue = Math.round(sellingStockValue * 0.55); // Estimated wholesale batch cost
  const lowStockItems = products.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock_level);
  const outOfStockItems = products.filter(p => p.current_stock === 0);

  const handleOpenAdjust = (prod?: Product) => {
    setAdjustProductId(prod?.id || products[0]?.id || '');
    setAdjustQty(10);
    setAdjustType('ADD');
    setAdjustReason('Warehouse inventory verification adjustment');
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find(p => p.id === adjustProductId);
    if (!prod) return;

    const currentBal = prod.current_stock;
    const qtyIn = adjustType === 'ADD' ? adjustQty : 0;
    const qtyOut = adjustType === 'REMOVE' ? adjustQty : 0;
    const newBal = currentBal + qtyIn - qtyOut;

    if (newBal < 0) {
      error('Cannot adjust stock below zero units.');
      return;
    }

    // Add manual adjustment movement record
    db['state'].stockMovements.unshift({
      id: `mv_adj_${Date.now()}`,
      product_id: prod.id,
      product_name: prod.name,
      sku: prod.sku,
      movement_type: 'STOCK_ADJUSTMENT',
      quantity_in: qtyIn,
      quantity_out: qtyOut,
      balance: newBal,
      reference_type: 'STOCK_ADJUSTMENT',
      reference_id: `ADJ-${Date.now().toString().slice(-4)}`,
      movement_date: new Date().toISOString(),
      created_by: user?.id || 'usr_admin',
      created_by_name: user?.name || 'Administrator',
      notes: adjustReason,
    });

    db['saveToStorage']();
    success(`Stock adjusted for ${prod.name}. New balance: ${newBal} units.`);
    setIsAdjustModalOpen(false);
  };

  const filteredProducts = products.filter(p => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    if (initialTab === 'low-stock') {
      return matchSearch && p.current_stock <= p.min_stock_level;
    }
    return matchSearch;
  });

  const filteredMovements = movements.filter(m => {
    const matchType = movementFilter === 'ALL' || m.movement_type === movementFilter;
    const matchSearch =
      (m.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.sku || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.notes || '').toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#1B4332]">
            Central Warehouse
          </span>
          <h1 className="text-2xl font-bold text-[#2C1810] font-['Outfit',sans-serif] mt-0.5">
            Inventory & Stock Control
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Real-time stock valuation, buffer thresholds, and immutable FIFO audit movement logs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAdjust()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Stock Adjustment</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Main Stock"
          value={`${totalUnits.toLocaleString()} Units`}
          subtitle="Across all catalog SKUs"
          icon={Boxes}
          accentColor="green"
        />
        <StatCard
          title="Selling Valuation"
          value={formatINR(sellingStockValue)}
          subtitle={`Cost basis: ~${formatINR(costStockValue)}`}
          icon={IndianRupee}
          accentColor="blue"
        />
        <StatCard
          title="Low Stock Warning"
          value={lowStockItems.length}
          subtitle="Buffer replenishment due"
          icon={AlertTriangle}
          accentColor="amber"
        />
        <StatCard
          title="Out of Stock"
          value={outOfStockItems.length}
          subtitle="Zero available units"
          icon={Package}
          accentColor="orange"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('stock')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'stock'
                  ? 'bg-[#1B4332] text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              Current Stock Levels
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'movements'
                  ? 'bg-[#1B4332] text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              Stock Movement Log ({movements.length})
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search products or movements..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#1B4332]/30"
              />
            </div>

            {activeTab === 'movements' && (
              <select
                value={movementFilter}
                onChange={e => setMovementFilter(e.target.value)}
                className="text-xs py-1.5 px-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 font-medium focus:outline-hidden"
              >
                <option value="ALL">All Movements</option>
                <option value="PRODUCTION">Production</option>
                <option value="EXHIBITION_ALLOCATION">Exhibition Allocation</option>
                <option value="SALE">Sale</option>
                <option value="EXHIBITION_RETURN">Exhibition Return</option>
                <option value="STOCK_ADJUSTMENT">Stock Adjustment</option>
              </select>
            )}
          </div>
        </div>

        {/* Tab 1: Current Stock Table */}
        {activeTab === 'stock' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-[#FBF9F5]/70 text-stone-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Current Quantity</th>
                  <th className="py-3 px-4 text-right">Cost Value</th>
                  <th className="py-3 px-4 text-right">Selling Value</th>
                  <th className="py-3 px-4">Stock Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredProducts.map(prod => {
                  const cat = categories.find(c => c.id === prod.category_id);
                  const isOut = prod.current_stock === 0;
                  const isLow = prod.current_stock <= prod.min_stock_level;
                  const status = isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK';

                  const sellingVal = prod.current_stock * prod.default_selling_price;
                  const costVal = Math.round(sellingVal * 0.55);

                  return (
                    <tr key={prod.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-stone-900">{prod.name}</td>
                      <td className="py-3.5 px-4 font-mono font-medium text-stone-500">
                        {prod.sku}
                      </td>
                      <td className="py-3.5 px-4 text-stone-600">{cat?.name}</td>
                      <td className="py-3.5 px-4 text-center font-extrabold text-sm text-stone-900">
                        {prod.current_stock}{' '}
                        <span className="text-xs font-normal text-stone-500">{prod.unit}s</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-stone-600">
                        {formatINR(costVal)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#1B4332]">
                        {formatINR(sellingVal)}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenAdjust(prod)}
                          className="text-xs font-semibold text-[#1B4332] hover:underline"
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Tab 2: Stock Movements Audit Log */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-[#FBF9F5]/70 text-stone-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Product / SKU</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4 text-center">Qty In</th>
                  <th className="py-3 px-4 text-center">Qty Out</th>
                  <th className="py-3 px-4 text-center">Balance</th>
                  <th className="py-3 px-4">Reference / Destination</th>
                  <th className="py-3 px-4">Authorized User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredMovements.length > 0 ? (
                  filteredMovements.map(m => (
                    <tr key={m.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3 px-4 text-stone-500">{formatDateTime(m.movement_date)}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-stone-900">{m.product_name}</div>
                        <div className="text-[10px] font-mono text-stone-400">{m.sku}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-stone-800 text-[11px] px-2 py-0.5 rounded bg-stone-100">
                          {m.movement_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-700">
                        {m.quantity_in > 0 ? `+${m.quantity_in}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-rose-700">
                        {m.quantity_out > 0 ? `-${m.quantity_out}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-stone-900">{m.balance}</td>
                      <td className="py-3 px-4 text-stone-600 max-w-xs truncate">
                        {m.notes || m.reference_id}
                      </td>
                      <td className="py-3 px-4 text-stone-500 font-medium">
                        {m.created_by_name || 'Admin'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-stone-400">
                      No stock movements found matching filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Manual Stock Adjustment"
        subtitle="Record inventory write-offs, physical count adjustments, or sample removals"
      >
        <form onSubmit={handleSaveAdjustment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Product</label>
            <select
              value={adjustProductId}
              onChange={e => setAdjustProductId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-[#FBF9F5] border border-stone-200 rounded-xl focus:outline-hidden"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} (Current: {p.current_stock} {p.unit}s)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Adjustment Action</label>
              <select
                value={adjustType}
                onChange={e => setAdjustType(e.target.value as any)}
                className="w-full px-3.5 py-2 text-xs bg-[#FBF9F5] border border-stone-200 rounded-xl focus:outline-hidden"
              >
                <option value="ADD">Add to Stock (+)</option>
                <option value="REMOVE">Deduct from Stock (-)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Quantity</label>
              <input
                type="number"
                min={1}
                required
                value={adjustQty}
                onChange={e => setAdjustQty(Math.max(1, Number(e.target.value)))}
                className="w-full px-3.5 py-2 text-xs bg-[#FBF9F5] border border-stone-200 rounded-xl focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Reason / Reference</label>
            <textarea
              rows={2}
              required
              value={adjustReason}
              onChange={e => setAdjustReason(e.target.value)}
              placeholder="e.g. Broken packaging write-off, physical count reconciliation..."
              className="w-full px-3.5 py-2 text-xs bg-[#FBF9F5] border border-stone-200 rounded-xl focus:outline-hidden"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsAdjustModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143823] shadow-xs"
            >
              Apply Stock Adjustment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
