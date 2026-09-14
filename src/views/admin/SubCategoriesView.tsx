import React, { useState } from 'react';
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, Search, Network } from 'lucide-react';
import { db } from '../../lib/db';
import { SubCategory, Category } from '../../types';
import { formatDate } from '../../lib/brand';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { useToast } from '../../components/common/Toast';

export const SubCategoriesView: React.FC = () => {
  const { success, error } = useToast();
  const [subCategories, setSubCategories] = useState<SubCategory[]>(() => db.getSubCategories());
  const [categories] = useState<Category[]>(() => db.getCategories());
  const [search, setSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<SubCategory | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  const products = db.getProducts();

  const refreshList = () => {
    setSubCategories(db.getSubCategories());
  };

  const handleOpenAdd = () => {
    setEditingSub(null);
    setCategoryId(categories[0]?.id || '');
    setName('');
    setDescription('');
    setImageUrl('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sub: SubCategory) => {
    setEditingSub(sub);
    setCategoryId(sub.category_id);
    setName(sub.name);
    setDescription(sub.description);
    setImageUrl(sub.image_url || '');
    setIsActive(sub.is_active);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('Sub Category name is required.');
      return;
    }
    if (!categoryId) {
      error('Please select a parent category.');
      return;
    }

    if (editingSub) {
      db.updateSubCategory(editingSub.id, {
        category_id: categoryId,
        name: name.trim(),
        description: description.trim(),
        image_url: imageUrl.trim() || undefined,
        is_active: isActive,
      });
      success(`Sub Category "${name}" updated.`);
    } else {
      db.addSubCategory({
        category_id: categoryId,
        name: name.trim(),
        description: description.trim(),
        image_url: imageUrl.trim() || undefined,
        is_active: isActive,
      });
      success(`Sub Category "${name}" created.`);
    }

    setIsModalOpen(false);
    refreshList();
  };

  const handleToggleStatus = (sub: SubCategory) => {
    db.updateSubCategory(sub.id, { is_active: !sub.is_active });
    success(`Sub Category marked as ${!sub.is_active ? 'Active' : 'Inactive'}.`);
    refreshList();
  };

  const handleConfirmDelete = () => {
    if (!deletingId) return;
    // Remove subcategory
    db.updateSubCategory(deletingId, { is_active: false });
    success('Sub category deactivated.');
    setDeletingId(null);
    refreshList();
  };

  const filteredSubs = subCategories.filter(s => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    const matchCat =
      selectedCategoryFilter === 'ALL' || s.category_id === selectedCategoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Product Taxonomy"
        title="Sub Categories"
        description="Group products by style, regional preparation or product type."
        actions={
          <Button onClick={handleOpenAdd} leadingIcon={<Plus className="w-4 h-4" />}>
            Add Sub Category
          </Button>
        }
      />

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        {/* Filters bar */}
        <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search sub categories..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2D1F1E]/30"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-medium text-stone-500">Filter Category:</span>
            <select
              value={selectedCategoryFilter}
              onChange={e => setSelectedCategoryFilter(e.target.value)}
              className="text-xs py-1.5 px-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 font-medium focus:outline-hidden"
            >
              <option value="ALL">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-[#FFF9F0]/70 text-stone-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Parent Category</th>
                <th className="py-3 px-4">Sub Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-center">Products</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredSubs.length > 0 ? (
                filteredSubs.map(sub => {
                  const parentCat = categories.find(c => c.id === sub.category_id);
                  const prodCount = products.filter(p => p.sub_category_id === sub.id).length;

                  return (
                    <tr key={sub.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-stone-700">
                        {parentCat?.name || '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Network className="w-4 h-4 text-[#2D1F1E]" />
                          <span className="font-bold text-stone-900 text-sm">{sub.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-stone-600 max-w-xs truncate">
                        {sub.description || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 bg-amber-50 text-amber-900 rounded-full font-bold">
                          {prodCount} products
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={sub.is_active ? 'ACTIVE' : 'INACTIVE'} />
                      </td>
                      <td className="py-3.5 px-4 text-stone-500 font-medium">
                        {formatDate(sub.created_at)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(sub)}
                            title={sub.is_active ? 'Deactivate' : 'Activate'}
                            className="p-1.5 rounded-lg border border-stone-200 text-stone-500 hover:text-amber-700 hover:bg-stone-50 transition-colors"
                          >
                            {sub.is_active ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(sub)}
                            className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(sub.id)}
                            className="p-1.5 rounded-lg border border-stone-200 text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Deactivate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400">
                    No sub categories found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSub ? 'Edit Sub Category' : 'Add Sub Category'}
        subtitle="Associate with parent category and configure details"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Parent Category <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2D1F1E]/30"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Sub Category Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Punjabi, Chinese, Cake, Brownie, Masala"
              className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2D1F1E]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Flavor profile or product types included..."
              className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2D1F1E]/30"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="subActive"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="rounded text-[#2D1F1E] focus:ring-[#2D1F1E] w-4 h-4 cursor-pointer"
            />
            <label htmlFor="subActive" className="text-xs font-medium text-stone-700 cursor-pointer">
              Active Sub Category
            </label>
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
              {editingSub ? 'Update Sub Category' : 'Save Sub Category'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        title="Deactivate Sub Category"
        message="Are you sure you want to deactivate this sub-category?"
        confirmLabel="Deactivate"
        variant="warning"
      />
    </div>
  );
};
