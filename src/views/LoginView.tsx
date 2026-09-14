import React, { useState } from 'react';
import { ShieldCheck, UserCheck, ArrowRight, Lock, Mail, Phone, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DivineLogo, BRAND_INFO } from '../lib/brand';
import { db } from '../lib/db';
import { useToast } from '../components/common/Toast';
import { PasswordInput } from '../components/common/PasswordInput';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const { error, success, info } = useToast();

  // Shown only once the business has entered its tax id in Settings.
  const companyGstin = db.getSettings().gstin;

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      error('Please enter your registered Mobile or Email address.');
      return;
    }
    setIsLoading(true);
    const res = await login(identifier, password);
    setIsLoading(false);

    if (res.success) {
      success('Logged in successfully! Welcome to Divine Foods.');
    } else {
      error(res.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9F0] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl border border-stone-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* Left Side: Brand Visuals, Tagline, Statement */}
        <div className="lg:col-span-6 bg-gradient-to-br from-[#2D1F1E] via-[#1F1514] to-[#2D2523] text-white p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle background food artwork overlay */}
          <div
            className="absolute inset-0 opacity-15 bg-cover bg-center mix-blend-overlay pointer-events-none"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1601050690597-df0568f70950?w=1200&auto=format&fit=crop&q=80')`,
            }}
          />

          <div className="relative z-10">
            <DivineLogo variant="white" size="xl" />
            <div className="mt-8 space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-200 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Enterprise Suite v2.6</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-['Outfit',sans-serif] tracking-tight text-white leading-tight">
                Production, Inventory & Exhibition Management
              </h1>
              <p className="font-['Noto_Sans_Gujarati',sans-serif] text-base text-amber-200/90 font-medium pt-1">
                "{BRAND_INFO.taglineGujarati}"
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-12 space-y-4">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Purity & Craftsmanship
              </h4>
              <p className="text-xs text-stone-200 mt-1 leading-relaxed">
                Streamlining high-speed exhibition sales, recipe-accurate batch production, live
                central warehouse stock reconciliation, and verifiable profit auditing for Divine Foods.
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-stone-300 pt-2 border-t border-white/10">
              <span>{BRAND_INFO.slogan}</span>
              {companyGstin && <span>GSTIN: {companyGstin}</span>}
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#2D1F1E]">
                Portal Authentication
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#2D2523] font-['Outfit',sans-serif] mt-1">
                Welcome back to Divine Foods
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Sign in to access your role-specific dashboard and live operations.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Mobile Number or Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder="Email or mobile number"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FFF9F0] border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#2D1F1E]/30 focus:border-[#2D1F1E] transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-stone-700">Password</label>
                  <button
                    type="button"
                    onClick={() => info('Password reset instructions have been dispatched to the registered contact.')}
                    className="text-xs font-medium text-amber-700 hover:text-amber-800 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  leadingIcon={
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                      <Lock className="w-4 h-4" />
                    </div>
                  }
                  className="w-full pl-10 pr-10 py-2.5 bg-[#FFF9F0] border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#2D1F1E]/30 focus:border-[#2D1F1E] transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#2D1F1E] hover:bg-[#1F1514] shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                <span>{isLoading ? 'Authenticating...' : 'Sign In to Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
};
