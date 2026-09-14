import React, { useState } from 'react';
import { KeyRound, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DivineLogo } from '../lib/brand';
import { useToast } from '../components/common/Toast';
import { describePasswordProblem, MIN_PASSWORD_LENGTH } from '../lib/auth';
import { PasswordInput } from '../components/common/PasswordInput';

/**
 * Shown when the signed-in account is still using the password it was created
 * with. Nothing else in the app is reachable until a new one is set.
 */
export const ChangePasswordView: React.FC = () => {
  const { user, changePassword, logout } = useAuth();
  const { success, error } = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const problem = newPassword ? describePasswordProblem(newPassword) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const issue = describePasswordProblem(newPassword);
    if (issue) {
      error(issue);
      return;
    }
    if (newPassword !== confirmPassword) {
      error('Both passwords must match.');
      return;
    }

    setIsSaving(true);
    const res = await changePassword(newPassword);
    setIsSaving(false);

    if (res.success) {
      success('Password updated. Keep it somewhere safe.');
    } else {
      error(res.message || 'Could not update the password.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9F0] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200/80 shadow-sm p-7">
        <DivineLogo size="lg" variant="full" />

        <div className="mt-6 flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-3.5">
          <ShieldCheck className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-900">
            This account is still using its setup password. Choose a new one to continue.
          </p>
        </div>

        <h1 className="text-xl font-bold text-[#2D2523] font-['Outfit',sans-serif] mt-6">
          Set your password
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Signed in as {user?.name} ({user?.email})
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">New Password</label>
            <PasswordInput
              value={newPassword}
              onChange={setNewPassword}
              required
              autoFocus
              autoComplete="new-password"
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              leadingIcon={
                <KeyRound className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
              }
              className="w-full pl-9 pr-10 py-2.5 text-sm bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
            />
            {problem && <p className="text-[11px] text-red-600 mt-1.5">{problem}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Confirm Password
            </label>
            <PasswordInput
              value={confirmPassword}
              onChange={setConfirmPassword}
              required
              autoComplete="new-password"
              placeholder="Re-enter the password"
              leadingIcon={
                <KeyRound className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
              }
              className="w-full pl-9 pr-10 py-2.5 text-sm bg-[#FFF9F0] border border-stone-200 rounded-xl focus:outline-hidden"
            />
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-[11px] text-red-600 mt-1.5">Both passwords must match.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#2D1F1E] text-white text-sm font-semibold hover:bg-[#1F1514] transition-colors disabled:opacity-60"
          >
            <span>{isSaving ? 'Saving…' : 'Save Password & Continue'}</span>
            {!isSaving && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <button
          type="button"
          onClick={logout}
          className="w-full mt-3 px-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold hover:bg-stone-200 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};
