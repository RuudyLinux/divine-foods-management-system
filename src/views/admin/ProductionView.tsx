import React, { useState } from 'react';
import {
  Factory,
  Plus,
  Trash2,
  Calendar,
  Layers,
  CheckCircle2,
  Boxes,
  Search,
  Eye,
  Sparkles,
} from 'lucide-react';
import { db } from '../../lib/db';
import { ProductionBatch, ProductionItem, Product } from '../../types';
import { formatINR, formatDate } from '../../lib/brand';
import { Modal } from '../../components/common/Modal';
import { PageHeader } from '../../components/common/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';

export const ProductionView: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [batches, setBatches] = useState<ProductionBatch[]>(() => db.getProductionBatches());
  const [products] = useState<Product[]>(() => db.getProducts());
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBatchForView, setSelectedBatchForView] = useState<ProductionBatch | null>(null);

  // New Production Form State
  const [productionDate, setProductionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [batchNo, setBatchNo] = useState('');
  const [notes, setNotes] = useState('');

  // Dynamic Product Rows: Product, Quantity, Cost Per Unit, Selling Price
  const [batchItems, setBatchItems] = useState<
    Array<{ product_id: string; quantity: number; cost_per_unit: number; selling_price: number }>
  >([]);

  const refreshList = () => {
    setBatches(db.getProductionBatches());
  };

  const handleOpenNewProduction = () => {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const count = batches.length + 1;
    const generatedBatchNo = `DF-${today}-${count.toString().padStart(3, '0')}`;

    setBatchNo(generatedBatchNo);
    setProductionDate(new Date().toISOString().split('T')[0]);
    setNotes('');

    // Default with first product
    const firstProd = products[0];
    setBatchItems([
      {
        product_id: firstProd?.id || '',
        quantity: 50,
        cost_per_unit: 100,
        selling_price: firstProd?.default_selling_price || 250,
      },
    ]);
    setIsModalOpen(true);
  };

  const handleAddRow = () => {
    const unused = products.find(p => !batchItems.some(item => item.product_id === p.id)) || products[0];
    setBatchItems(prev => [
      ...prev,
      {
        product_id: unused?.id || '',
        quantity: 30,
        cost_per_unit: 80,
        selling_price: unused?.default_selling_price || 200,
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (batchItems.length === 1) {
      error('At least one product row is required in the production batch.');
      return;
    }
    setBatchItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setBatchItems(prev => {
      const updated = [...prev];
      const cur = { ...updated[index], [field]: value };

      if (field === 'product_id') {
        const prod = products.find(p => p.id === value);
        if (prod) {
          cur.selling_price = prod.default_selling_price;
        }
      }
      updated[index] = cur;
      return updated;
    });
  };

  const calculateBatchTotalCost = () => {
    return batchItems.reduce((sum, item) => sum + item.quantity * item.cost_per_unit, 0);
  };

  const calculateBatchTotalQty = () => {
    return batchItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  };

  const handleSaveProduction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchNo.trim()) {
      error('Batch number is required.');
      return;
    }
    if (batchItems.length === 0) {
      error('Please add at least one product to the batch.');
      return;
    }

    try {
      const created = db.createProductionBatch(
        {
          batch_no: batchNo.trim(),
          production_date: productionDate,
          notes: notes.trim(),
          created_by: user?.id || 'usr_admin',
          created_by_name: user?.name || 'Administrator',
        },
        batchItems
      );

      success(`Production batch ${created.batch_no} created successfully! Inventory updated.`);
      setIsModalOpen(false);
      refreshList();
    } catch (err: any) {
      error(err.message || 'Failed to create production batch');
    }
  };

  const filteredBatches = batches.filter(
    b =>
      b.batch_no.toLowerCase().includes(search.toLowerCase()) ||
      b.notes.toLowerCase().includes(search.toLowerCase()) ||
      (b.created_by_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        eyebrow="Kitchen & Factory Operations"
        title="Production / Making"
        description="Log culinary batches, ingredient costing, yields, and auto-increment central warehouse stock."
        actions={
          <>
          <button
          onClick={handleOpenNewProduction}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[10px] border border-transparent bg-[#2D1F1E] text-white text-[13px] font-semibold leading-none transition-colors hover:bg-[#1F1514] focus-ring disabled:cursor-not-allowed disabled:opacity-55"
          >
          <Factory className="w-4 h-4" />
          <span>+ New Production Batch</span>
          </button>
          </>
        }
      />

      {/* Production History Table Card */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Batch No, Recipe Notes, or Operator..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2D1F1E]/30"
            />
          </div>
          <span className="text-xs text-stone-500 font-medium">
            {filteredBatches.length} production batches logged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-[#FFF9F0]/70 text-stone-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Batch No</th>
                <th className="py-3 px-4">Production Date</th>
                <th className="py-3 px-4">Items / Recipes Included</th>
                <th className="py-3 px-4 text-center">Total Quantity</th>
                <th className="py-3 px-4 text-right">Total Production Cost</th>
                <th className="py-3 px-4">Created By</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredBatches.length > 0 ? (
                filteredBatches.map(batch => {
                  const items = db.getProductionItems(batch.id);
                  return (
                    <tr key={batch.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-sm text-[#2D1F1E]">
                        {batch.batch_no}
                      </td>
                      <td className="py-3.5 px-4 text-stone-600 font-medium">
                        {formatDate(batch.production_date)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {items.map(it => (
                            <span
                              key={it.id}
                              className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-[11px] text-stone-800"
                            >
                              {it.product_name} ({it.quantity})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-stone-800">
                        {batch.total_quantity} units
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-stone-900 font-mono">
                        {formatINR(batch.total_cost)}
                      </td>
                      <td className="py-3.5 px-4 text-stone-500 font-medium">
                        {batch.created_by_name || 'Admin'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedBatchForView(batch)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-100 transition-colors font-medium text-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Batch</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400">
                    No production batches logged. Click "+ New Production Batch" to register today's making.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Production Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log New Production Batch"
        subtitle="Specify recipe outputs, unit costs, and automatically replenish stock"
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveProduction} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Batch Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={batchNo}
                onChange={e => setBatchNo(e.target.value)}
                placeholder="e.g. DF-20260910-001"
                className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl font-mono focus:outline-hidden focus:ring-2 focus:ring-[#2D1F1E]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Production Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={productionDate}
                onChange={e => setProductionDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Batch Notes</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Festival weekend bulk prep, roasted fresh batch with Gujarati cumin..."
              className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
            />
          </div>

          {/* Multiple Product Rows in One Batch */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2D1F1E]">
                Batch Product Items ({batchItems.length})
              </span>
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2D1F1E] hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product Row</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {batchItems.map((item, index) => {
                const lineTotalCost = (item.quantity || 0) * (item.cost_per_unit || 0);

                return (
                  <div
                    key={index}
                    className="p-3.5 rounded-xl border border-stone-200 bg-[#FFF9F0] grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                  >
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                        Product
                      </label>
                      <select
                        value={item.product_id}
                        onChange={e => handleItemChange(index, 'product_id', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-200 rounded-lg font-medium text-stone-800 focus:outline-hidden"
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={item.quantity}
                        onChange={e =>
                          handleItemChange(index, 'quantity', Math.max(1, Number(e.target.value)))
                        }
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-center font-bold text-stone-900 focus:outline-hidden"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                        Cost / Unit (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={item.cost_per_unit}
                        onChange={e =>
                          handleItemChange(index, 'cost_per_unit', Math.max(0, Number(e.target.value)))
                        }
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-right font-medium text-stone-900 focus:outline-hidden"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                        Line Total Cost
                      </label>
                      <div className="px-2.5 py-1.5 text-xs font-bold text-[#2D1F1E] bg-white border border-stone-200 rounded-lg text-right font-mono">
                        {formatINR(lineTotalCost)}
                      </div>
                    </div>

                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(index)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Remove row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Batch Footprint */}
            <div className="mt-4 p-4 rounded-xl bg-white border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-stone-700">Total Batch Summary</span>
                <p className="text-[11px] text-stone-500">
                  {calculateBatchTotalQty()} total units will be added to Central Stock
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">
                  Total Production Cost
                </span>
                <span className="text-lg font-extrabold text-[#2D1F1E] font-['Outfit',sans-serif]">
                  {formatINR(calculateBatchTotalCost())}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[10px] border border-[#E8DED2] bg-[#F7F0E5] text-[#2D1F1E] text-[13px] font-semibold leading-none transition-colors hover:bg-[#EFE4D5] focus-ring disabled:cursor-not-allowed disabled:opacity-55"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[10px] border border-transparent bg-[#2D1F1E] text-white text-[13px] font-semibold leading-none transition-colors hover:bg-[#1F1514] focus-ring disabled:cursor-not-allowed disabled:opacity-55"
            >
              Save Production & Increase Stock
            </button>
          </div>
        </form>
      </Modal>

      {/* Batch Details Modal */}
      {selectedBatchForView && (
        <Modal
          isOpen={!!selectedBatchForView}
          onClose={() => setSelectedBatchForView(null)}
          title={`Batch Details – ${selectedBatchForView.batch_no}`}
          subtitle={`Manufactured on ${formatDate(selectedBatchForView.production_date)}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Operator</span>
                <span className="font-semibold text-stone-800">
                  {selectedBatchForView.created_by_name || 'Admin'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Total Units</span>
                <span className="font-bold text-stone-900">
                  {selectedBatchForView.total_quantity} units
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Notes</span>
                <span className="text-stone-600">
                  {selectedBatchForView.notes || 'Standard manufacturing run'}
                </span>
              </div>
            </div>

            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                Manufactured Items
              </h5>
              <div className="space-y-2">
                {db.getProductionItems(selectedBatchForView.id).map(item => (
                  <div
                    key={item.id}
                    className="p-3 bg-white rounded-xl border border-stone-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-stone-900">{item.product_name}</p>
                      <p className="text-[11px] text-stone-500">
                        {item.quantity} units @ {formatINR(item.cost_per_unit)} / unit
                      </p>
                    </div>
                    <span className="font-bold text-[#2D1F1E] font-mono">
                      {formatINR(item.total_cost)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-stone-200 flex justify-between text-sm font-bold text-stone-800">
              <span>Total Batch Cost:</span>
              <span className="text-[#2D1F1E] font-mono">
                {formatINR(selectedBatchForView.total_cost)}
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
