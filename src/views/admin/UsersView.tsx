import React, { useState } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Shield,
  KeyRound,
  CheckCircle2,
  XCircle,
  Search,
  Calendar,
  Lock,
} from 'lucide-react';
import { db } from '../../lib/db';
import { describePasswordProblem, MIN_PASSWORD_LENGTH } from '../../lib/auth';
import { User, UserRole } from '../../types';
import { formatDate } from '../../lib/brand';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { PasswordInput } from '../../components/common/PasswordInput';
import { useToast } from '../../components/common/Toast';

export const UsersView: React.FC = () => {
  const { success, error } = useToast();
  const [users, setUsers] = useState<User[]>(() => db.getUsers());
  const exhibitions = db.getExhibitions();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Password reset for another account
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleOpenReset = (u: User) => {
    setResetTarget(u);
    setResetPassword('');
    setResetConfirm('');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;

    const problem = describePasswordProblem(resetPassword);
    if (problem) {
      error(problem);
      return;
    }
    if (resetPassword !== resetConfirm) {
      error('Both passwords must match.');
      return;
    }

    setIsResetting(true);
    try {
      // Temporary by design: the account must choose its own at next sign-in.
      await db.resetUserPassword(resetTarget.id, resetPassword);
      success(
        `Password reset for ${resetTarget.name}. They must set their own password at next sign-in.`
      );
      setResetTarget(null);
      refreshList();
    } catch (err: any) {
      error(err.message || 'Could not reset the password.');
    } finally {
      setIsResetting(false);
    }
  };
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('EXHIBITION_USER');
  const [assignedExhibitionId, setAssignedExhibitionId] = useState('');
  const [isActive, setIsActive] = useState(true);

  const refreshList = () => {
    setUsers(db.getUsers());
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('EXHIBITION_USER');
    setAssignedExhibitionId(exhibitions[0]?.id || '');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setPassword('');
    setRole(u.role);
    setAssignedExhibitionId(u.assigned_exhibition_id || '');
    setIsActive(u.is_active);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      error('Name and Email are required.');
      return;
    }

    // A new account needs a password; on an existing one it is optional and
    // only set when the administrator typed a replacement.
    const typedPassword = password.trim();
    if (!editingUser && !typedPassword) {
      error('Set a password for the new account.');
      return;
    }
    if (typedPassword) {
      const problem = describePasswordProblem(typedPassword);
      if (problem) {
        error(problem);
        return;
      }
    }

    try {
      if (editingUser) {
        db.updateUser(editingUser.id, {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          assigned_exhibition_id: role === 'EXHIBITION_USER' ? assignedExhibitionId : undefined,
          is_active: isActive,
        });
        if (typedPassword) {
          // Hashed, and the account must choose its own at next sign-in.
          await db.resetUserPassword(editingUser.id, typedPassword);
        }
        success(`User ${name} updated successfully.`);
      } else {
        const created = db.addUser({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          assigned_exhibition_id: role === 'EXHIBITION_USER' ? assignedExhibitionId : undefined,
          is_active: isActive,
        });
        await db.resetUserPassword(created.id, typedPassword);
        success(`User ${name} created. They must change this password at first sign-in.`);
      }

      setIsModalOpen(false);
      refreshList();
    } catch (err: any) {
      error(err.message || 'Error saving user');
    }
  };

  const handleToggleStatus = (u: User) => {
    db.updateUser(u.id, { is_active: !u.is_active });
    success(`User marked as ${!u.is_active ? 'Active' : 'Inactive'}.`);
    refreshList();
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Security & Team Access"
        title="Users"
        description="Configure access for administrators and exhibition stall operators."
        actions={
          <Button onClick={handleOpenAdd} leadingIcon={<Plus className="w-4 h-4" />}>
            Add User
          </Button>
        }
      />

      {/* Role Matrix Card */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-[#2D1F1E]/5 border border-[#2D1F1E]/20 space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#2D1F1E]" />
            <h4 className="font-bold text-xs text-[#2D1F1E] uppercase tracking-wider">
              Role: Master Administrator
            </h4>
          </div>
          <p className="text-xs text-stone-600">
            Unrestricted operational authority: Product Catalog, Production Batches, Warehouse Stock,
            Exhibition Planning, P&L Reports, Financial Auditing, and User Administration.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#F47B20]" />
            <h4 className="font-bold text-xs text-amber-900 uppercase tracking-wider">
              Role: Exhibition Stall User
            </h4>
          </div>
          <p className="text-xs text-stone-600">
            Field-focused terminal access: High-speed POS Billing, View Allocated Stall Inventory,
            Log Daily Operating Expenses, and End-of-Day Cash Reconciliation & Closing.
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search user name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2D1F1E]/30"
            />
          </div>

          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="text-xs py-1.5 px-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 font-medium focus:outline-hidden"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Master Admin</option>
            <option value="EXHIBITION_USER">Exhibition User</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-[#FFF9F0]/70 text-stone-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">User Details</th>
                <th className="py-3 px-4">System Role</th>
                <th className="py-3 px-4">Assigned Exhibition</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredUsers.map(u => {
                const assignedExh = exhibitions.find(e => e.id === u.assigned_exhibition_id);
                return (
                  <tr key={u.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#2D1F1E]/10 text-[#2D1F1E] font-bold text-xs flex items-center justify-center">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-stone-900 text-sm block">{u.name}</span>
                          <span className="text-[11px] text-stone-400 font-mono">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                          u.role === 'ADMIN'
                            ? 'bg-[#2D1F1E]/10 text-[#2D1F1E]'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-stone-700">
                      {assignedExh ? assignedExh.name : '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={u.is_active ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                    <td className="py-3.5 px-4 text-stone-500 font-medium">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u)}
                          title={u.is_active ? 'Deactivate' : 'Activate'}
                          className="p-1.5 rounded-lg border border-stone-200 text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                        >
                          {u.is_active ? (
                            <XCircle className="w-4 h-4 text-amber-600" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenReset(u)}
                          className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:text-[#2D1F1E] hover:bg-stone-100 transition-colors"
                          title="Reset Password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                          title="Edit User"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title="Reset Password"
        maxWidth="md"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="rounded-xl bg-[#FFF9F0] border border-stone-200 p-3.5">
            <p className="text-xs text-stone-700">
              Setting a new password for{' '}
              <span className="font-bold">{resetTarget?.name}</span> ({resetTarget?.email}).
            </p>
            <p className="text-[11px] text-stone-500 mt-1.5">
              Give it to them privately. They will be asked to choose their own password the next
              time they sign in.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Temporary Password
            </label>
            <PasswordInput
              value={resetPassword}
              onChange={setResetPassword}
              required
              autoFocus
              defaultVisible
              autoComplete="new-password"
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              className="w-full px-3.5 pr-10 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
            />
            {resetPassword && describePasswordProblem(resetPassword) && (
              <p className="text-[11px] text-red-600 mt-1.5">
                {describePasswordProblem(resetPassword)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Confirm Temporary Password
            </label>
            <PasswordInput
              value={resetConfirm}
              onChange={setResetConfirm}
              required
              defaultVisible
              autoComplete="new-password"
              placeholder="Re-enter the password"
              className="w-full px-3.5 pr-10 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
            />
            {resetConfirm && resetConfirm !== resetPassword && (
              <p className="text-[11px] text-red-600 mt-1.5">Both passwords must match.</p>
            )}
          </div>

          <div className="flex justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setResetTarget(null)}
              className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold hover:bg-stone-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isResetting}
              className="px-4 py-2.5 rounded-xl bg-[#2D1F1E] text-white text-xs font-semibold hover:bg-[#1F1514] transition-colors disabled:opacity-60"
            >
              {isResetting ? 'Resetting…' : 'Reset Password'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add / Edit User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Edit User Profile' : 'Add New User'}
        subtitle="Manage credentials and assign exhibition permissions"
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Ramesh Patel"
              className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. ramesh@divinefoods.com"
              className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Password {editingUser && '(leave blank to keep current)'}
            </label>
            <PasswordInput
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              placeholder={editingUser ? 'Leave blank to keep current password' : 'Set a starting password'}
              className="w-full px-3.5 pr-10 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as UserRole)}
              className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
            >
              <option value="ADMIN">Master Administrator</option>
              <option value="EXHIBITION_USER">Exhibition User</option>
            </select>
          </div>

          {role === 'EXHIBITION_USER' && (
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Assigned Exhibition
              </label>
              <select
                value={assignedExhibitionId}
                onChange={e => setAssignedExhibitionId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
              >
                <option value="">No specific exhibition (Flexible)</option>
                {exhibitions.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.city})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="userActive"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="rounded text-[#2D1F1E] focus:ring-[#2D1F1E] w-4 h-4 cursor-pointer"
            />
            <label htmlFor="userActive" className="text-xs font-medium text-stone-700 cursor-pointer">
              Active User Account
            </label>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#2D1F1E] hover:bg-[#1F1514] shadow-xs"
            >
              Save User
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
