import React, { useState } from 'react';
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, Search, Layers } from 'lucide-react';
import { db } from '../../lib/db';
import { Category } from '../../types';
import { formatDate } from '../../lib/brand';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { IconButton } from '../../components/common/IconButton';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { useToast } from '../../components/common/Toast';

export const CategoriesView: React.FC = () => {
  const { success, error } = useToast();
  const [categories, setCategories] = useState<Category[]>(() => db.getCategories());
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  const products = db.getProducts();

  const refreshList = () => {
    setCategories(db.getCategories());
  };

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setImageUrl('');
    setIsActive(true);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description);
    setImageUrl(cat.image_url || '');
    setIsActive(cat.is_active);
    setIsAddModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('Category name is required.');
      return;
    }

    try {
      if (editingCategory) {
        db.updateCategory(editingCategory.id, {
          name: name.trim(),
          description: description.trim(),
          image_url: imageUrl.trim() || undefined,
          is_active: isActive,
        });
        success(`Category "${name}" updated successfully.`);
      } else {
        db.addCategory({
          name: name.trim(),
          description: description.trim(),
          image_url:
            imageUrl.trim() ||
            'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80',
          is_active: isActive,
        });
        success(`Category "${name}" created successfully.`);
      }
      setIsAddModalOpen(false);
      refreshList();
    } catch (err: any) {
      error(err.message || 'Error saving category');
    }
  };

  const handleToggleStatus = (cat: Category) => {
    db.updateCategory(cat.id, { is_active: !cat.is_active });
    success(`Category marked as ${!cat.is_active ? 'Active' : 'Inactive'}.`);
    refreshList();
  };

  const handleConfirmDelete = () => {
    if (!deletingId) return;
    const res = db.deleteCategory(deletingId);
    if (res.success) {
      success('Category deleted successfully.');
      refreshList();
    } else {
      error(res.message || 'Cannot delete category with associated products.');
    }
    setDeletingId(null);
  };

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalog Hierarchy"
        title="Categories"
        description="Organize product lines into high-level culinary and retail categories."
        actions={
          <Button onClick={handleOpenAdd} leadingIcon={<Plus className="w-4 h-4" />}>
            Add Category
          </Button>
        }
      />

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        {/* Search Toolbar */}
        <div className="p-4 border-b border-stone-100 flex items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search category name or description..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2D1F1E]/30"
            />
          </div>
          <span className="text-xs text-stone-500 font-medium">
            {filteredCategories.length} Categories total
          </span>
        </div>

        {/* Categories Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-[#FFF9F0]/70 text-stone-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-center">Products</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredCategories.length > 0 ? (
                filteredCategories.map(cat => {
                  const productCount = products.filter(p => p.category_id === cat.id).length;
                  return (
                    <tr key={cat.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {cat.image_url ? (
                            <img
                              src={cat.image_url}
                              alt={cat.name}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-lg object-cover border border-stone-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400">
                              <Layers className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-stone-900 text-sm">{cat.name}</span>
                            <span className="text-[10px] text-stone-400 font-mono block">
                              ID: {cat.id}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-stone-600 max-w-xs truncate">
                        {cat.description || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 bg-[#2D1F1E]/10 text-[#2D1F1E] rounded-full font-bold">
                          {productCount} items
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={cat.is_active ? 'ACTIVE' : 'INACTIVE'} />
                      </td>
                      <td className="py-3.5 px-4 text-stone-500 font-medium">
                        {formatDate(cat.created_at)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <IconButton
                            label={
                              cat.is_active
                                ? `Deactivate ${cat.name}`
                                : `Activate ${cat.name}`
                            }
                            tone={cat.is_active ? 'warning' : 'success'}
                            onClick={() => handleToggleStatus(cat)}
                          >
                            {cat.is_active ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                          </IconButton>
                          <IconButton
                            label={`Edit ${cat.name}`}
                            onClick={() => handleOpenEdit(cat)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </IconButton>
                          <IconButton
                            label={`Delete ${cat.name}`}
                            tone="danger"
                            onClick={() => setDeletingId(cat.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-400">
                    No categories found. Click "Add Category" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        subtitle="Specify category details and branding display image"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Category Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Ready To Cook, Premix, Roasted Products"
              className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2D1F1E]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Briefly describe products under this category..."
              className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2D1F1E]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Image URL (Optional)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2D1F1E]/30"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="catActive"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="rounded text-[#2D1F1E] focus:ring-[#2D1F1E] w-4 h-4 cursor-pointer"
            />
            <label htmlFor="catActive" className="text-xs font-medium text-stone-700 cursor-pointer">
              Active Category (visible in sales and allocation menus)
            </label>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#E8DED2] pt-4">
            <Button variant="secondary" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              {editingCategory ? 'Update Category' : 'Save Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Category"
        message="Are you sure you want to delete this category? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};
