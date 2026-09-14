import React, { useRef, useState } from 'react';
import {
  Settings,
  Building,
  Save,
  Download,
  Upload,
  RotateCcw,
  Database,
  CheckCircle2,
  AlertTriangle,
  ImageIcon,
  Trash2,
  KeyRound,
} from 'lucide-react';
import { db } from '../../lib/db';
import { DivineLogo, DEFAULT_LOGO_SRC, useBrandLogo } from '../../lib/brand';
import { prepareImageForStorage, formatBytes, ACCEPTED_IMAGE_TYPES } from '../../lib/images';
import { describePasswordProblem, MIN_PASSWORD_LENGTH } from '../../lib/auth';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { PasswordInput } from '../../components/common/PasswordInput';

export const SettingsView: React.FC = () => {
  const { success, error } = useToast();
  const { user, changePassword } = useAuth();

  // Own password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const problem = describePasswordProblem(newPassword);
    if (problem) {
      error(problem);
      return;
    }
    if (newPassword !== confirmPassword) {
      error('The new passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      error('The new password must be different from the current one.');
      return;
    }

    setIsChangingPassword(true);
    try {
      // The current password is checked before anything changes.
      const res = await changePassword(newPassword, currentPassword);
      if (res.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        success('Your password has been changed.');
      } else {
        error(res.message || 'Could not change the password.');
      }
    } finally {
      // Always re-enable the button, even if the change threw.
      setIsChangingPassword(false);
    }
  };
  const [settings, setSettings] = useState(() => db.getSettings());

  // Form State
  const [companyName, setCompanyName] = useState(settings.company_name);
  const [tagline, setTagline] = useState(settings.tagline);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [gstin, setGstin] = useState(settings.gstin || '');
  const [invoiceFooterNote, setInvoiceFooterNote] = useState(settings.invoice_footer_note);
  const [lowStockThreshold, setLowStockThreshold] = useState(settings.low_stock_threshold_default);

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Company logo
  const currentLogo = useBrandLogo();
  const hasCustomLogo = !!db.getSettings().logo_url;
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const handleLogoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const image = await prepareImageForStorage(file, {
        maxEdge: 512,
        preserveTransparency: true,
      });
      db.updateSettings({ logo_url: image.dataUrl });
      setSettings(db.getSettings());
      success(`Logo updated (${formatBytes(image.bytes)}).`);
    } catch (err: any) {
      error(err.message || 'Could not use that image.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRestoreDefaultLogo = () => {
    try {
      db.updateSettings({ logo_url: '' });
      setSettings(db.getSettings());
      success('Reverted to the default Divine Foods logo.');
    } catch (err: any) {
      error(err.message || 'Could not restore the default logo.');
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      db.updateSettings({
        company_name: companyName.trim(),
        tagline: tagline.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        gstin: gstin.trim() || undefined,
        invoice_footer_note: invoiceFooterNote.trim(),
        low_stock_threshold_default: lowStockThreshold,
      });
      setSettings(db.getSettings());
      success('System settings & invoice branding updated successfully.');
    } catch (err: any) {
      error(err.message || 'Failed to update settings');
    }
  };

  const handleBackupDatabase = () => {
    const backupJson = db.exportDatabaseBackup();
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `divine_foods_db_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Database backup exported successfully.');
  };

  const handleRestoreDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      const res = db.importDatabaseBackup(content);
      if (res.success) {
        success('Database backup restored successfully! Reloading...');
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        error(res.message || 'Invalid backup file format');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmReset = () => {
    db.resetDemoData();
    success('All business data cleared. Staff accounts and settings kept.');
    setIsResetConfirmOpen(false);
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const stats = {
    products: db.getProducts().length,
    categories: db.getCategories().length,
    exhibitions: db.getExhibitions().length,
    sales: db.getSales().length,
    batches: db.getProductionBatches().length,
    movements: db.getStockMovements().length,
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#2D1F1E]">
            Configuration & Backups
          </span>
          <h1 className="text-2xl font-bold text-[#2D2523] font-['Outfit',sans-serif] mt-0.5">
            System Settings
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Company branding, invoice tax details, data export, and disaster recovery.
          </p>
        </div>
      </div>

      {/* Your Password */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-6">
        <h3 className="text-base font-bold text-[#2D2523] font-['Outfit',sans-serif] mb-1 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[#2D1F1E]" />
          <span>Your Password</span>
        </h3>
        <p className="text-xs text-stone-500 mb-6">
          Changes the password for {user?.name} ({user?.email}).
        </p>

        <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Current Password
            </label>
            <PasswordInput
              value={currentPassword}
              onChange={setCurrentPassword}
              required
              autoComplete="current-password"
              placeholder="Your password now"
              className="w-full px-3.5 pr-10 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">New Password</label>
            <PasswordInput
              value={newPassword}
              onChange={setNewPassword}
              required
              autoComplete="new-password"
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              className="w-full px-3.5 pr-10 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Confirm New Password
            </label>
            <PasswordInput
              value={confirmPassword}
              onChange={setConfirmPassword}
              required
              autoComplete="new-password"
              placeholder="Re-enter new password"
              className="w-full px-3.5 pr-10 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
            />
          </div>

          <div className="sm:col-span-3 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isChangingPassword}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2D1F1E] text-white text-xs font-semibold hover:bg-[#1F1514] transition-colors disabled:opacity-60"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{isChangingPassword ? 'Changing…' : 'Change Password'}</span>
            </button>
            {newPassword && describePasswordProblem(newPassword) && (
              <span className="text-[11px] text-red-600">{describePasswordProblem(newPassword)}</span>
            )}
            {confirmPassword && confirmPassword !== newPassword && (
              <span className="text-[11px] text-red-600">The new passwords do not match.</span>
            )}
          </div>
        </form>
      </div>

      {/* Company Logo */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-6">
        <h3 className="text-base font-bold text-[#2D2523] font-['Outfit',sans-serif] mb-1 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-[#2D1F1E]" />
          <span>Company Logo</span>
        </h3>
        <p className="text-xs text-stone-500 mb-6">
          Shown in the sidebar, on the sign-in screen and on every printed invoice.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex items-center justify-center w-32 h-32 shrink-0 rounded-2xl border border-stone-200 bg-white p-3">
            <img
              src={currentLogo}
              alt="Current company logo"
              className="max-w-full max-h-full object-contain"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="rounded-xl border border-stone-200 bg-[#FFF9F0] p-3 mb-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">
                Preview in sidebar
              </p>
              <div className="rounded-lg bg-[#2D1F1E] px-3 py-2.5">
                <DivineLogo size="sm" variant="white" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <input
                ref={logoInputRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                onChange={handleLogoSelected}
                className="hidden"
              />
              <button
                type="button"
                disabled={isUploadingLogo}
                onClick={() => logoInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2D1F1E] text-white text-xs font-semibold hover:bg-[#1F1514] transition-colors disabled:opacity-60"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploadingLogo ? 'Processing…' : 'Upload New Logo'}</span>
              </button>

              {hasCustomLogo && (
                <button
                  type="button"
                  onClick={handleRestoreDefaultLogo}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold hover:bg-stone-200 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Restore Default</span>
                </button>
              )}
            </div>

            <p className="text-[11px] text-stone-500 mt-3">
              PNG, JPG, WEBP or SVG. Large images are resized automatically; transparent PNGs keep
              their transparency.
              {!hasCustomLogo && ' Currently using the default Divine Foods logo.'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Company & Invoice Settings */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-stone-200/80 shadow-xs p-6">
          <h3 className="text-base font-bold text-[#2D2523] font-['Outfit',sans-serif] mb-1 flex items-center gap-2">
            <Building className="w-4 h-4 text-[#2D1F1E]" />
            <span>Company Profile & Receipt Branding</span>
          </h3>
          <p className="text-xs text-stone-500 mb-6">
            Printed at the top and footer of all POS customer invoices
          </p>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Tagline</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Full Address
              </label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  value={gstin}
                  onChange={e => setGstin(e.target.value)}
                  placeholder="24AAAAA0000A1Z5"
                  className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Invoice Footer Note
              </label>
              <textarea
                rows={2}
                value={invoiceFooterNote}
                onChange={e => setInvoiceFooterNote(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Default Low Stock Threshold (Units)
              </label>
              <input
                type="number"
                min={1}
                value={lowStockThreshold}
                onChange={e => setLowStockThreshold(Number(e.target.value))}
                className="w-32 px-3.5 py-2 text-xs bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden font-bold"
              />
            </div>

            <div className="pt-4 border-t border-stone-100 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#2D1F1E] hover:bg-[#1F1514] shadow-xs cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Company Profile</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Database Maintenance & JSON Backup */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-6 space-y-4">
            <h3 className="text-base font-bold text-[#2D2523] font-['Outfit',sans-serif] flex items-center gap-2">
              <Database className="w-4 h-4 text-[#2D1F1E]" />
              <span>Data & Backup Engine</span>
            </h3>
            <p className="text-xs text-stone-500">
              Complete local persistence export in JSON format for offline safety
            </p>

            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-100 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-stone-500">Products in Catalog:</span>
                <span className="font-bold text-stone-800">{stats.products}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Production Batches:</span>
                <span className="font-bold text-stone-800">{stats.batches}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Stock Movements:</span>
                <span className="font-bold text-stone-800">{stats.movements}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Sales Invoices:</span>
                <span className="font-bold text-stone-800">{stats.sales}</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleBackupDatabase}
                className="w-full py-2.5 px-3 rounded-xl border border-stone-200 hover:bg-stone-50 font-semibold text-xs text-stone-800 flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4 text-[#2D1F1E]" />
                <span>Download Database JSON</span>
              </button>

              <label className="w-full py-2.5 px-3 rounded-xl border border-stone-200 hover:bg-stone-50 font-semibold text-xs text-stone-800 flex items-center justify-center gap-2 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-[#F47B20]" />
                <span>Restore from JSON File</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreDatabase}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                className="w-full py-2.5 px-3 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/70 font-semibold text-xs text-rose-700 flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Clear All Business Data</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleConfirmReset}
        title="Clear All Business Data"
        message="This permanently deletes every product, category, exhibition, sale, expense and stock record. Staff accounts and company settings are kept. Export a backup first if you need this data. Are you sure?"
        confirmLabel="Delete Everything"
        variant="danger"
      />
    </div>
  );
};
