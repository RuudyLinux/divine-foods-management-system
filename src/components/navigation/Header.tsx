import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Menu,
  Bell,
  Calendar,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/db';

interface HeaderProps {
  onOpenMobileSidebar?: () => void;
  onMenuToggle?: () => void;
  activeTab?: string;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileSidebar, onMenuToggle, activeTab }) => {
  const { user, role, activeExhibition, setActiveExhibition } = useAuth();
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const notifMenuRef = useRef<HTMLDivElement>(null);

  const toggleMobile = () => {
    if (onOpenMobileSidebar) onOpenMobileSidebar();
    if (onMenuToggle) onMenuToggle();
  };

  const exhibitions = db.getExhibitions();
  const products = db.getProducts();
  const lowStockProducts = products.filter(p => p.current_stock <= p.min_stock_level);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentDateFormatted = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Tab name mapping for breadcrumb
  const tabNames: Record<string, string> = {
    dashboard: 'Dashboard',
    categories: 'Categories',
    'sub-categories': 'Sub Categories',
    products: 'Products',
    production: 'Production',
    stock: 'Current Stock',
    'stock-movements': 'Stock Movements',
    'low-stock': 'Low Stock Alerts',
    exhibitions: 'Exhibitions',
    'exhibition-allocation': 'Exhibition Allocation',
    'exhibition-stock': 'Exhibition Stock',
    'new-sale': 'New Sale (POS)',
    'sales-history': 'Sales History',
    expenses: 'Expenses',
    'day-closing': 'Day Closing',
    reports: 'Reports Center',
    users: 'Users',
    settings: 'Settings',
  };

  return (
    <header className="sticky top-0 z-30 header-glass px-4 sm:px-8 py-3 flex items-center justify-between">
      {/* Left: Mobile Toggle & Page Info */}
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={toggleMobile}
          aria-label="Toggle navigation menu"
          className="lg:hidden p-2 rounded-xl text-stone-600 hover:bg-stone-100 focus:outline-hidden focus-ring transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <span className="font-semibold text-[#2D1F1E]">Divine Foods</span>
            <span className="text-stone-300">/</span>
            <span className="font-medium">{tabNames[activeTab || 'dashboard'] || 'Dashboard'}</span>
            <span className="hidden sm:inline text-stone-300">·</span>
            <span className="hidden sm:inline font-medium">{currentDateFormatted}</span>
          </div>
          <h2 className="text-sm sm:text-base font-bold text-[#2D2523] font-['Outfit',sans-serif] mt-0.5">
            {role === 'ADMIN' ? (
              <span>{tabNames[activeTab || 'dashboard'] || 'Business Management System'}</span>
            ) : (
              <span>Exhibition Sales – {activeExhibition?.name || 'Vadodara'}</span>
            )}
          </h2>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Exhibition Selector */}
        {exhibitions.length > 0 && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50/80 border border-amber-200/60 text-xs text-amber-900 font-medium backdrop-blur-sm">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <select
              aria-label="Select active exhibition"
              value={activeExhibition?.id || ''}
              onChange={e => {
                const found = exhibitions.find(ex => ex.id === e.target.value);
                if (found) setActiveExhibition(found);
              }}
              className="bg-transparent border-none text-xs font-semibold text-amber-900 focus:outline-hidden cursor-pointer"
            >
              {exhibitions.map(ex => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} ({ex.status})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Signed-in role. Changing role means signing in as that account. */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-[#2D1F1E]/20 bg-[#2D1F1E]/5 text-[#2D1F1E]"
          title="Your role comes from the account you signed in with"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Role:</span>
          <span>{role === 'ADMIN' ? 'Admin' : 'Exhibition'}</span>
        </div>

        {/* Notifications Bell */}
        <div className="relative" ref={notifMenuRef}>
          <button
            type="button"
            aria-label="View inventory alerts and notifications"
            aria-expanded={showNotifMenu}
            aria-haspopup="true"
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative p-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-100/80 focus:outline-hidden focus-ring transition-colors cursor-pointer"
          >
            <Bell className="w-4.5 h-4.5" />
            {lowStockProducts.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dot-pulse" />
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 dropdown-menu p-3 z-50">
              <div className="flex items-center justify-between pb-2.5 border-b border-stone-100">
                <span className="text-xs font-bold text-[#2D2523]">Alerts & Stock Warnings</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                  {lowStockProducts.length} low
                </span>
              </div>
              <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                {lowStockProducts.length > 0 ? (
                  lowStockProducts.map(p => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/50 text-xs flex items-start gap-2.5 transition-colors hover:bg-amber-50"
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="font-semibold text-stone-800">{p.name} is running low</p>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          Stock: {p.current_stock} (Min: {p.min_stock_level})
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-2">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <p className="text-xs text-stone-500">
                      All inventory levels are healthy.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
