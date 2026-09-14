import React, { useState } from 'react';
import {
  Package,
  Boxes,
  TrendingUp,
  History,
  Calendar,
  IndianRupee,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { Product, Sale, ProductionItem, StockMovement, ExhibitionAllocation } from '../../types';
import { db } from '../../lib/db';
import { formatINR, formatDate, formatDateTime } from '../../lib/brand';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'production' | 'sales' | 'movements' | 'exhibitions'>('info');

  if (!product) return null;

  const categories = db.getCategories();
  const subCategories = db.getSubCategories();
  const category = categories.find(c => c.id === product.category_id);
  const subCategory = subCategories.find(s => s.id === product.sub_category_id);

  // Production History
  const allProdItems = db.getProductionItems();
  const prodHistory = allProdItems.filter(i => i.product_id === product.id);
  const batches = db.getProductionBatches();

  // Sales History
  const allSaleItems = db.getSaleItems();
  const saleItemsForProd = allSaleItems.filter(i => i.product_id === product.id);
  const allSales = db.getSales();

  // Stock Movement History
  const stockMovements = db.getStockMovements(product.id);

  // Exhibition Allocations
  const allocations = db.getExhibitionAllocations().filter(a => a.product_id === product.id);
  const exhibitions = db.getExhibitions();

  const isLowStock = product.current_stock <= product.min_stock_level;
  const isOut = product.current_stock === 0;
  const stockStatus = isOut ? 'OUT OF STOCK' : isLowStock ? 'LOW STOCK' : 'IN STOCK';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product.name}
      subtitle={`SKU: ${product.sku} | ${category?.name || ''} › ${subCategory?.name || ''}`}
      maxWidth="3xl"
    >
      <div className="space-y-5">
        {/* Top Summary Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-[#FFF9F0] border border-stone-200 gap-4">
          <div className="flex items-center gap-3">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-xl object-cover border border-stone-200"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400">
                <Package className="w-6 h-6" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-base text-[#2D2523]">{product.name}</h4>
                <StatusBadge status={stockStatus} />
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                {product.weight} {product.weight_unit} per {product.unit} | Min Stock: {product.min_stock_level}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 self-end sm:self-center">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">
                Selling Price
              </span>
              <span className="text-lg font-bold text-[#2D1F1E] font-['Outfit',sans-serif]">
                {formatINR(product.default_selling_price)}
              </span>
            </div>
            <div className="text-right border-l border-stone-200 pl-6">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">
                Warehouse Stock
              </span>
              <span className="text-lg font-bold text-stone-900 font-['Outfit',sans-serif]">
                {product.current_stock} <span className="text-xs font-normal text-stone-500">{product.unit}s</span>
              </span>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-stone-200 gap-2 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'info', label: 'Details' },
            { id: 'production', label: `Production (${prodHistory.length})` },
            { id: 'sales', label: `Sales History (${saleItemsForProd.length})` },
            { id: 'movements', label: `Stock Movements (${stockMovements.length})` },
            { id: 'exhibitions', label: `Exhibitions (${allocations.length})` },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`pb-2.5 px-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === t.id
                  ? 'border-[#2D1F1E] text-[#2D1F1E] font-bold'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'info' && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                <span className="text-[10px] text-stone-400 font-bold uppercase block">SKU</span>
                <span className="font-mono font-bold text-stone-800">{product.sku}</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                <span className="text-[10px] text-stone-400 font-bold uppercase block">Category</span>
                <span className="font-semibold text-stone-800">{category?.name || '-'}</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                <span className="text-[10px] text-stone-400 font-bold uppercase block">Sub Category</span>
                <span className="font-semibold text-stone-800">{subCategory?.name || '-'}</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                <span className="text-[10px] text-stone-400 font-bold uppercase block">Pack Size</span>
                <span className="font-semibold text-stone-800">{product.weight} {product.weight_unit}</span>
              </div>
            </div>

            <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
              <span className="text-[10px] text-stone-400 font-bold uppercase block mb-1">Product Description</span>
              <p className="text-stone-600 leading-relaxed">{product.description || 'No detailed description added.'}</p>
            </div>
          </div>
        )}

        {activeTab === 'production' && (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider font-semibold">
                    <th className="py-2">Batch No</th>
                    <th className="py-2">Date</th>
                    <th className="py-2 text-center">Qty Produced</th>
                    <th className="py-2 text-right">Cost / Unit</th>
                    <th className="py-2 text-right">Batch Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {prodHistory.length > 0 ? (
                    prodHistory.map(item => {
                      const batch = batches.find(b => b.id === item.production_batch_id);
                      return (
                        <tr key={item.id} className="hover:bg-stone-50">
                          <td className="py-2.5 font-mono font-bold text-stone-800">
                            {batch?.batch_no || 'Batch'}
                          </td>
                          <td className="py-2.5 text-stone-500">
                            {batch ? formatDate(batch.production_date) : '-'}
                          </td>
                          <td className="py-2.5 text-center font-bold text-[#2D1F1E]">
                            {item.quantity} units
                          </td>
                          <td className="py-2.5 text-right text-stone-700">
                            {formatINR(item.cost_per_unit)}
                          </td>
                          <td className="py-2.5 text-right font-semibold text-stone-900">
                            {formatINR(item.total_cost)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-stone-400">
                        No production batches recorded yet for this product.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'sales' && (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider font-semibold">
                    <th className="py-2">Invoice No</th>
                    <th className="py-2">Date</th>
                    <th className="py-2 text-center">Quantity</th>
                    <th className="py-2 text-right">Price</th>
                    <th className="py-2 text-right">Historical Cost</th>
                    <th className="py-2 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {saleItemsForProd.length > 0 ? (
                    saleItemsForProd.map(item => {
                      const sale = allSales.find(s => s.id === item.sale_id);
                      return (
                        <tr key={item.id} className="hover:bg-stone-50">
                          <td className="py-2.5 font-mono font-semibold text-[#2D1F1E]">
                            {sale?.invoice_no || 'Invoice'}
                          </td>
                          <td className="py-2.5 text-stone-500">
                            {sale ? formatDate(sale.sale_date) : '-'}
                          </td>
                          <td className="py-2.5 text-center font-bold text-stone-800">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 text-right text-stone-600">
                            {formatINR(item.selling_price)}
                          </td>
                          <td className="py-2.5 text-right text-stone-500 font-mono">
                            {formatINR(item.cost_per_unit)}
                          </td>
                          <td className="py-2.5 text-right font-bold text-stone-900">
                            {formatINR(item.total_amount)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-stone-400">
                        No customer sales recorded for this product yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'movements' && (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider font-semibold">
                    <th className="py-2">Date</th>
                    <th className="py-2">Type</th>
                    <th className="py-2 text-center">In</th>
                    <th className="py-2 text-center">Out</th>
                    <th className="py-2 text-center">Balance</th>
                    <th className="py-2">Reference / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {stockMovements.length > 0 ? (
                    stockMovements.map(m => (
                      <tr key={m.id} className="hover:bg-stone-50">
                        <td className="py-2.5 text-stone-500">{formatDateTime(m.movement_date)}</td>
                        <td className="py-2.5">
                          <span className="font-semibold text-stone-800">{m.movement_type}</span>
                        </td>
                        <td className="py-2.5 text-center text-emerald-700 font-bold">
                          {m.quantity_in > 0 ? `+${m.quantity_in}` : '-'}
                        </td>
                        <td className="py-2.5 text-center text-rose-700 font-bold">
                          {m.quantity_out > 0 ? `-${m.quantity_out}` : '-'}
                        </td>
                        <td className="py-2.5 text-center font-bold text-stone-900">{m.balance}</td>
                        <td className="py-2.5 text-stone-500 max-w-xs truncate">{m.notes || m.reference_id}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-stone-400">
                        No movement audit records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'exhibitions' && (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider font-semibold">
                    <th className="py-2">Exhibition Name</th>
                    <th className="py-2">Allocated Date</th>
                    <th className="py-2 text-center">Quantity</th>
                    <th className="py-2 text-right">Cost Per Unit</th>
                    <th className="py-2 text-right">Allocated Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {allocations.length > 0 ? (
                    allocations.map(a => {
                      const exh = exhibitions.find(e => e.id === a.exhibition_id);
                      return (
                        <tr key={a.id} className="hover:bg-stone-50">
                          <td className="py-2.5 font-bold text-[#2D1F1E]">{exh?.name || 'Exhibition'}</td>
                          <td className="py-2.5 text-stone-500">{formatDate(a.allocated_at)}</td>
                          <td className="py-2.5 text-center font-bold text-stone-800">{a.quantity_allocated}</td>
                          <td className="py-2.5 text-right text-stone-600">{formatINR(a.cost_per_unit)}</td>
                          <td className="py-2.5 text-right font-bold text-stone-900">{formatINR(a.allocated_cost)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-stone-400">
                        This product has not been allocated to any exhibition yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
