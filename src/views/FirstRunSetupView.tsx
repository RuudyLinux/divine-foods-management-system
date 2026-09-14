import React, { useState } from 'react';
import { KeyRound, ShieldCheck, ArrowRight } from 'lucide-react';
import { db } from '../lib/db';
import { DivineLogo } from '../lib/brand';
import { useToast } from '../components/common/Toast';
import { describePasswordProblem, MIN_PASSWORD_LENGTH } from '../lib/auth';
import { PasswordInput } from '../components/common/PasswordInput';
import { Button } from '../components/common/Button';

interface FirstRunSetupViewProps {
  /** Called once the administrator password exists, so the app can show sign-in. */
  onComplete: () => void;
}

/**
 * Shown only on a brand new installation, where no account has a password yet.
 *
 * The application ships without any default credential: everything in the
 * bundle is readable by whoever opens the site, so a password baked into it
 * would be public. The person who opens the system first sets the
 * administrator password here instead.
 */
export const FirstRunSetupView: React.FC<FirstRunSetupViewProps> = ({ onComplete }) => {
  const { success, error } = useToast();
  const admin = db.getFirstRunAdmin();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const problem = password ? describePasswordProblem(password) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const issue = describePasswordProblem(password);
    if (issue) {
      error(issue);
      return;
    }
    if (password !== confirmPassword) {
      error('Both passwords must match.');
      return;
    }

    setIsSaving(true);
    try {
      await db.completeFirstRunSetup(password);
      success('Administrator password created. You can sign in now.');
      onComplete();
    } catch (err: any) {
      error(err?.message || 'Could not complete setup.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFF9F0] p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#E8DED2] bg-white p-7 shadow-sm">
        <DivineLogo size="lg" variant="full" />

        <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#F47B20]/25 bg-[#F47B20]/08 p-3.5">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#C2600F]" aria-hidden="true" />
          <p className="text-xs text-[#2D2523]">
            This is a new installation. Create the administrator password to secure it before
            anyone else opens this address.
          </p>
        </div>

        <h1 className="mt-6 font-['Outfit',sans-serif] text-xl font-bold text-[#2D2523]">
          Set up your system
        </h1>
        {admin && (
          <p className="mt-1 text-xs text-[#756B66]">
            Administrator account: {admin.name} ({admin.email})
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="setup-password" className="mb-1 block text-xs font-semibold text-[#2D2523]">
              Administrator Password
            </label>
            <PasswordInput
              id="setup-password"
              value={password}
              onChange={setPassword}
              required
              autoFocus
              autoComplete="new-password"
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              leadingIcon={
                <KeyRound className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#9A8F88]" />
              }
              className="w-full rounded-xl border border-[#E8DED2] bg-[#FFF9F0] py-2.5 pl-9 pr-10 text-sm focus:outline-hidden"
            />
            {problem && <p className="mt-1.5 text-[11px] text-[#C94B3C]">{problem}</p>}
          </div>

          <div>
            <label htmlFor="setup-confirm" className="mb-1 block text-xs font-semibold text-[#2D2523]">
              Confirm Password
            </label>
            <PasswordInput
              id="setup-confirm"
              value={confirmPassword}
              onChange={setConfirmPassword}
              required
              autoComplete="new-password"
              placeholder="Re-enter the password"
              leadingIcon={
                <KeyRound className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#9A8F88]" />
              }
              className="w-full rounded-xl border border-[#E8DED2] bg-[#FFF9F0] py-2.5 pl-9 pr-10 text-sm focus:outline-hidden"
            />
            {confirmPassword && confirmPassword !== password && (
              <p className="mt-1.5 text-[11px] text-[#C94B3C]">Both passwords must match.</p>
            )}
          </div>

          <Button
            type="submit"
            isLoading={isSaving}
            className="w-full"
            trailingIcon={<ArrowRight className="h-4 w-4" />}
          >
            {isSaving ? 'Creating…' : 'Create Password & Continue'}
          </Button>
        </form>

        <p className="mt-4 text-[11px] leading-relaxed text-[#756B66]">
          Keep this password safe. It is stored only as a hash, so it cannot be recovered — it can
          only be reset from inside the app by a signed-in administrator.
        </p>
      </div>
    </div>
  );
};
