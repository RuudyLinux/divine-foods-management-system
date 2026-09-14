import React, { useRef, useState } from 'react';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Eye,
  Edit2,
  Package,
  Download,
  Upload,
  AlertTriangle,
  Layers,
  Sparkles,
  CheckCircle2,
  ImageIcon,
  X,
} from 'lucide-react';
import { db } from '../../lib/db';
import { Product, Category, SubCategory, WeightUnit } from '../../types';
import { formatINR } from '../../lib/brand';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { prepareImageForStorage, formatBytes, ACCEPTED_IMAGE_TYPES } from '../../lib/images';
import { ProductDetailModal } from './ProductDetailModal';
import { useToast } from '../../components/common/Toast';

export const ProductsView: React.FC = () => {
  const { success, error } = useToast();
  const [products, setProducts] = useState<Product[]>(() => db.getProducts());
  const [categories] = useState<Category[]>(() => db.getCategories());
  const [subCategories] = useState<SubCategory[]>(() => db.getSubCategories());

  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('Pack');
  const [weight, setWeight] = useState<number>(250);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('gm');
  const [defaultSellingPrice, setDefaultSellingPrice] = useState<number>(200);
  const [minStockLevel, setMinStockLevel] = useState<number>(20);
  const [initialStock, setInitialStock] = useState<number>(50);
  const [imageUrl, setImageUrl] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsProcessingImage(true);
    try {
      const image = await prepareImageForStorage(file, { maxEdge: 800 });
      setImageUrl(image.dataUrl);
      success(`Photo attached (${formatBytes(image.bytes)}).`);
    } catch (err: any) {
      error(err.message || 'Could not use that image.');
    } finally {
      setIsProcessingImage(false);
    }
  };
  const [isActive, setIsActive] = useState(true);

  const refreshList = () => {
    setProducts(db.getProducts());
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName('');
    // Auto-generate next SKU
    const prefix = 'DF-PRD';
    const nextNum = (products.length + 1).toString().padStart(3, '0');
    setSku(`${prefix}-${nextNum}`);
    setCategoryId(categories[0]?.id || '');
    setSubCategoryId(subCategories[0]?.id || '');
    setDescription('');
    setUnit('Pack');
    setWeight(250);
    setWeightUnit('gm');
    setDefaultSellingPrice(200);
    setMinStockLevel(20);
    setInitialStock(50);
    setImageUrl('');
    setIsActive(true);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setSku(prod.sku);
    setCategoryId(prod.category_id);
    setSubCategoryId(prod.sub_category_id);
    setDescription(prod.description);
    setUnit(prod.unit);
    setWeight(prod.weight);
    setWeightUnit(prod.weight_unit);
    setDefaultSellingPrice(prod.default_selling_price);
    setMinStockLevel(prod.min_stock_level);
    setImageUrl(prod.image_url || '');
    setIsActive(prod.is_active);
    setIsAddModalOpen(true);
  };

  const handleAutoGenerateSKU = () => {
    const code = name
      ? name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'DF')
      : 'DF';
    const random = Math.floor(100 + Math.random() * 900);
    setSku(`DF-${code}-${random}`);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('Product name is required.');
      return;
    }
    if (!sku.trim()) {
      error('Product SKU is required.');
      return;
    }

    try {
      if (editingProduct) {
        db.updateProduct(editingProduct.id, {
          name: name.trim(),
          sku: sku.trim(),
          category_id: categoryId,
          sub_category_id: subCategoryId,
          description: description.trim(),
          unit,
          weight,
          weight_unit: weightUnit,
          default_selling_price: defaultSellingPrice,
          min_stock_level: minStockLevel,
          image_url: imageUrl.trim() || undefined,
          is_active: isActive,
        });
        success(`Product "${name}" updated successfully.`);
      } else {
        db.addProduct(
          {
            name: name.trim(),
            sku: sku.trim(),
            category_id: categoryId,
            sub_category_id: subCategoryId,
            description: description.trim(),
            unit,
            weight,
            weight_unit: weightUnit,
            default_selling_price: defaultSellingPrice,
            min_stock_level: minStockLevel,
            image_url: imageUrl.trim() || undefined,
            is_active: isActive,
          },
          initialStock
        );
        success(`Product "${name}" created with ${initialStock} units in opening stock.`);
      }

      setIsAddModalOpen(false);
      refreshList();
    } catch (err: any) {
      error(err.message || 'Error saving product');
    }
  };

  const handleExportCSV = () => {
    const headers = ['SKU', 'Name', 'Category', 'Unit', 'Weight', 'Price', 'Stock', 'MinStock', 'Status'];
    const rows = products.map(p => [
      p.sku,
      `"${p.name.replace(/"/g, '""')}"`,
      categories.find(c => c.id === p.category_id)?.name || '',
      p.unit,
      `${p.weight} ${p.weight_unit}`,
      p.default_selling_price,
      p.current_stock,
      p.min_stock_level,
      p.is_active ? 'Active' : 'Inactive',
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Divine_Foods_Products_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Products exported to CSV successfully.');
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || p.category_id === categoryFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && p.is_active) ||
      (statusFilter === 'INACTIVE' && !p.is_active) ||
      (statusFilter === 'LOW_STOCK' && p.current_stock <= p.min_stock_level);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventory Master"
        title="Products"
        description="SKU directory, packaging specs, price master and stock buffers."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={handleExportCSV}
              leadingIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export CSV
            </Button>
            <Button onClick={handleOpenAdd} leadingIcon={<Plus className="w-4 h-4" />}>
              Add Product
            </Button>
          </>
        }
      />

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-stone-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by Product Name or SKU..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2D1F1E]/30"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="text-xs py-2 px-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 font-medium focus:outline-hidden"
            >
              <option value="ALL">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs py-2 px-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 font-medium focus:outline-hidden"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="LOW_STOCK">Low Stock Alert</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {/* View Mode Toggle: Table vs Grid */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="text-xs text-stone-400 font-medium">
              {filteredProducts.length} items
            </span>
            <div className="flex items-center p-1 bg-stone-100 rounded-xl border border-stone-200">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-white shadow-xs text-[#2D1F1E]' : 'text-stone-400'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white shadow-xs text-[#2D1F1E]' : 'text-stone-400'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* View Mode: Table */}
        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-[#FFF9F0]/70 text-stone-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Category / Sub</th>
                  <th className="py-3 px-4">Weight / Unit</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4 text-center">Warehouse Stock</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(prod => {
                    const cat = categories.find(c => c.id === prod.category_id);
                    const sub = subCategories.find(s => s.id === prod.sub_category_id);
                    const isLow = prod.current_stock <= prod.min_stock_level;
                    const isOut = prod.current_stock === 0;
                    const stockBadge = isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK';

                    return (
                      <tr key={prod.id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {prod.image_url ? (
                              <img
                                src={prod.image_url}
                                alt={prod.name}
                                referrerPolicy="no-referrer"
                                className="w-10 h-10 rounded-lg object-cover border border-stone-200"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400">
                                <Package className="w-5 h-5" />
                              </div>
                            )}
                            <div>
                              <button
                                onClick={() => setSelectedProductForDetail(prod)}
                                className="font-bold text-stone-900 text-sm hover:text-[#2D1F1E] text-left"
                              >
                                {prod.name}
                              </button>
                              <span className="text-[10px] text-stone-400 block truncate max-w-[200px]">
                                {prod.description || 'Artisan Divine Foods product'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-stone-600">
                          {prod.sku}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-stone-800">{cat?.name}</span>
                          <span className="text-[10px] text-stone-400 block">{sub?.name}</span>
                        </td>
                        <td className="py-3.5 px-4 text-stone-600 font-medium">
                          {prod.weight} {prod.weight_unit} / {prod.unit}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-[#2D1F1E]">
                          {formatINR(prod.default_selling_price)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`font-bold text-sm ${
                              isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-stone-900'
                            }`}
                          >
                            {prod.current_stock}
                          </span>
                          <span className="text-[10px] text-stone-400 block">
                            Min: {prod.min_stock_level}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={stockBadge} />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedProductForDetail(prod)}
                              className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                              title="View History & Stock Audit"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(prod)}
                              className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:text-[#2D1F1E] hover:bg-[#2D1F1E]/5 transition-colors"
                              title="Edit Master Data"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-stone-400">
                      No products matching your search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* View Mode: Grid Cards */
          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(prod => {
              const isLow = prod.current_stock <= prod.min_stock_level;
              const isOut = prod.current_stock === 0;
              const stockBadge = isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK';

              return (
                <div
                  key={prod.id}
                  className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-40 bg-stone-100">
                      {prod.image_url ? (
                        <img
                          src={prod.image_url}
                          alt={prod.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-300">
                          <Package className="w-10 h-10" />
                        </div>
                      )}
                      <div className="absolute top-2.5 right-2.5">
                        <StatusBadge status={stockBadge} />
                      </div>
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white font-mono text-[10px] backdrop-blur-xs">
                        {prod.sku}
                      </div>
                    </div>

                    <div className="p-4">
                      <h4 className="font-bold text-sm text-[#2D2523] line-clamp-1">{prod.name}</h4>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        {prod.weight} {prod.weight_unit} per {prod.unit}
                      </p>

                      <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-stone-400 block">
                            Selling Price
                          </span>
                          <span className="text-base font-bold text-[#2D1F1E]">
                            {formatINR(prod.default_selling_price)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-stone-400 block">
                            Current Stock
                          </span>
                          <span className="text-sm font-bold text-stone-800">
                            {prod.current_stock} {prod.unit}s
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedProductForDetail(prod)}
                      className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>
                    <button
                      onClick={() => handleOpenEdit(prod)}
                      className="py-1.5 px-3 rounded-lg text-xs font-semibold text-[#2D1F1E] bg-[#2D1F1E]/10 hover:bg-[#2D1F1E]/20 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        subtitle="Configure master catalog data, SKU, packaging unit, and stock buffer"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Product Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Brownie Premix"
                className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2D1F1E]/30"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-stone-700">
                  SKU <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoGenerateSKU}
                  className="text-[11px] font-semibold text-[#2D1F1E] hover:underline cursor-pointer"
                >
                  Auto-generate
                </button>
              </div>
              <input
                type="text"
                required
                value={sku}
                onChange={e => setSku(e.target.value.toUpperCase())}
                placeholder="e.g. DF-PRX-001"
                className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl font-mono focus:outline-hidden focus:ring-2 focus:ring-[#2D1F1E]/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={e => {
                  setCategoryId(e.target.value);
                  const firstSub = subCategories.find(s => s.category_id === e.target.value);
                  if (firstSub) setSubCategoryId(firstSub.id);
                }}
                className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Sub Category</label>
              <select
                value={subCategoryId}
                onChange={e => setSubCategoryId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
              >
                {subCategories
                  .filter(s => !categoryId || s.category_id === categoryId)
                  .map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Packaging Unit</label>
              <input
                type="text"
                value={unit}
                onChange={e => setUnit(e.target.value)}
                placeholder="Pack, Box, Pouch"
                className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Net Weight</label>
              <input
                type="number"
                min={1}
                value={weight}
                onChange={e => setWeight(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Weight Unit</label>
              <select
                value={weightUnit}
                onChange={e => setWeightUnit(e.target.value as WeightUnit)}
                className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
              >
                <option value="gm">gm</option>
                <option value="kg">kg</option>
                <option value="ml">ml</option>
                <option value="ltr">ltr</option>
                <option value="piece">piece</option>
                <option value="pack">pack</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Selling Price (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                required
                value={defaultSellingPrice}
                onChange={e => setDefaultSellingPrice(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl font-bold text-[#2D1F1E] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Min Stock Buffer
              </label>
              <input
                type="number"
                min={0}
                value={minStockLevel}
                onChange={e => setMinStockLevel(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
              />
            </div>
            {!editingProduct && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Initial Stock
                </label>
                <input
                  type="number"
                  min={0}
                  value={initialStock}
                  onChange={e => setInitialStock(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Product Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ingredients, culinary taste notes, preservation details..."
              className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Product Photo</label>

            <div className="flex items-start gap-3">
              <div className="relative w-20 h-20 shrink-0 rounded-xl border border-stone-200 bg-[#FFF9F0] overflow-hidden flex items-center justify-center">
                {imageUrl ? (
                  <>
                    <img src={imageUrl} alt="Product preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      title="Remove photo"
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-white/90 border border-stone-200 text-stone-600 flex items-center justify-center hover:bg-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <ImageIcon className="w-6 h-6 text-stone-300" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES.join(',')}
                  onChange={handleImageSelected}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isProcessingImage}
                  onClick={() => imageInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#2D1F1E] text-white text-xs font-semibold hover:bg-[#1F1514] transition-colors disabled:opacity-60"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isProcessingImage ? 'Processing…' : 'Upload Photo'}</span>
                </button>

                <input
                  type="url"
                  value={imageUrl.startsWith('data:') ? '' : imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  placeholder="…or paste an image link"
                  disabled={imageUrl.startsWith('data:')}
                  className="mt-2 w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden disabled:opacity-50"
                />
                <p className="text-[11px] text-stone-500 mt-1.5">
                  {imageUrl.startsWith('data:')
                    ? 'Uploaded photo attached. Remove it to paste a link instead.'
                    : 'PNG, JPG or WEBP. Photos are resized automatically before saving.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="prodActive"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="rounded text-[#2D1F1E] focus:ring-[#2D1F1E] w-4 h-4 cursor-pointer"
            />
            <label htmlFor="prodActive" className="text-xs font-medium text-stone-700 cursor-pointer">
              Active in Product Catalog
            </label>
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
              {editingProduct ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Product Detail Modal */}
      <ProductDetailModal
        isOpen={!!selectedProductForDetail}
        onClose={() => setSelectedProductForDetail(null)}
        product={selectedProductForDetail}
      />
    </div>
  );
};
