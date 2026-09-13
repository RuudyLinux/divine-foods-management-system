import React, { useState } from 'react';
import {
  Home,
  LayoutGrid,
  Network,
  Package,
  Factory,
  Boxes,
  Calendar,
  Truck,
  ShoppingCart,
  Receipt,
  BarChart3,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  X,
  Layers,
  Clock,
  AlertTriangle,
  ArrowLeftRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DivineLogo } from '../../lib/brand';

interface SidebarProps {
  currentTab?: string;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  onTabChange?: (tab: string) => void;
  isOpenMobile?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab: propCurrentTab,
  activeTab,
  onSelectTab,
  onTabChange,
  isOpenMobile,
  isMobileOpen,
  onCloseMobile,
  onMobileClose,
}) => {
  const { role, user, isAdmin: authIsAdmin, logout } = useAuth();
  const isAdmin = authIsAdmin ?? ((role || user?.role || '').toUpperCase() === 'ADMIN');
  const currentTab = activeTab || propCurrentTab || 'dashboard';
  const isMobileDrawerOpen = isMobileOpen ?? isOpenMobile ?? false;

  // Collapsible state for Admin groups
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    products: false,
    inventory: false,
    exhibitions: false,
    sales: false,
    finance: false,
    system: false,
  });

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleClose = () => {
    if (onCloseMobile) onCloseMobile();
    if (onMobileClose) onMobileClose();
  };

  const handleNav = (tabId: string) => {
    if (onSelectTab) onSelectTab(tabId);
    if (onTabChange) onTabChange(tabId);
    if (isMobileDrawerOpen) {
      handleClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 sidebar-dark flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Decorative floating orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div
            className="absolute top-20 right-8 w-32 h-32 rounded-full bg-emerald-400/10"
            style={{ animation: 'floatOrb 8s ease-in-out infinite' }}
          />
          <div
            className="absolute bottom-32 left-4 w-24 h-24 rounded-full bg-amber-400/8"
            style={{ animation: 'floatOrb2 10s ease-in-out infinite' }}
          />
        </div>

        {/* Brand Header */}
        <div className="relative z-10 px-5 py-5 flex items-center justify-between border-b border-white/10">
          <DivineLogo size="sm" variant="white" />
          <button
            type="button"
            aria-label="Close mobile sidebar navigation"
            onClick={handleClose}
            className="lg:hidden p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 focus:outline-hidden focus-ring transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation List */}
        <div className="relative z-10 flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {/* Dashboard (Common) */}
          <button
            onClick={() => handleNav('dashboard')}
            className={`w-full ${
              currentTab === 'dashboard' ? 'sidebar-nav-item-active' : ''
            } sidebar-nav-item`}
          >
            <Home className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          {isAdmin ? (
            /* =================== ADMIN NAVIGATION =================== */
            <>
              {/* PRODUCT MANAGEMENT */}
              <div className="pt-3">
                <button
                  onClick={() => toggleSection('products')}
                  className="w-full sidebar-section-label"
                >
                  <span>Product Management</span>
                  {collapsedSections.products ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
                {!collapsedSections.products && (
                  <div className="space-y-0.5 mt-1">
                    <button
                      onClick={() => handleNav('categories')}
                      className={`w-full ${
                        currentTab === 'categories' ? 'sidebar-sub-item-active' : ''
                      } sidebar-sub-item`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Categories</span>
                    </button>
                    <button
                      onClick={() => handleNav('sub-categories')}
                      className={`w-full ${
                        currentTab === 'sub-categories' ? 'sidebar-sub-item-active' : ''
                      } sidebar-sub-item`}
                    >
                      <Network className="w-3.5 h-3.5" />
                      <span>Sub Categories</span>
                    </button>
                    <button
                      onClick={() => handleNav('products')}
                      className={`w-full ${
                        currentTab === 'products' ? 'sidebar-sub-item-active' : ''
                      } sidebar-sub-item`}
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>Products</span>
                    </button>
                  </div>
                )}
              </div>

              {/* INVENTORY */}
              <div className="pt-1">
                <button
                  onClick={() => toggleSection('inventory')}
                  className="w-full sidebar-section-label"
                >
                  <span>Inventory</span>
                  {collapsedSections.inventory ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
                {!collapsedSections.inventory && (
                  <div className="space-y-0.5 mt-1">
                    <button
                      onClick={() => handleNav('production')}
                      className={`w-full ${
                        currentTab === 'production' ? 'sidebar-sub-item-active' : ''
                      } sidebar-sub-item`}
                    >
                      <Factory className="w-3.5 h-3.5" />
                      <span>Production / Making</span>
                    </button>
                    <button
                      onClick={() => handleNav('stock')}
                      className={`w-full ${
                        currentTab === 'stock' ? 'sidebar-sub-item-active' : ''
                      } sidebar-sub-item`}
                    >
                      <Boxes className="w-3.5 h-3.5" />
                      <span>Current Stock</span>
                    </button>
                    <button
                      onClick={() => handleNav('stock-movements')}
                      className={`w-full ${
                        currentTab === 'stock-movements' ? 'sidebar-sub-item-active' : ''
                      } sidebar-sub-item`}
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>Stock Movements</span>
                    </button>
                    <button
                      onClick={() => handleNav('low-stock')}
                      className={`w-full ${
                        currentTab === 'low-stock' ? 'sidebar-sub-item-active' : ''
                      } sidebar-sub-item`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Low Stock Alert</span>
                    </button>
                  </div>
                )}
              </div>

              {/* EXHIBITIONS */}
              <div className="pt-1">
                <button
                  onClick={() => toggleSection('exhibitions')}
                  className="w-full sidebar-section-label"
                >
                  <span>Exhibitions</span>
                  {collapsedSections.exhibitions ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
                {!collapsedSections.exhibitions && (
                  <div className="space-y-0.5 mt-1">
                    <button
                      onClick={() => handleNav('exhibitions')}
                      className={`w-full ${
                        currentTab === 'exhibitions' ? 'sidebar-sub-item-active' : ''
                      } sidebar-sub-item`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Exhibitions</span>
                    </button>
                    <button
                      onClick={() => handleNav('exhibition-allocation')}
                      className={`w-full ${
                        currentTab === 'exhibition-allocation' ? 'sidebar-sub-item-active' : ''
                      } sidebar-sub-item`}
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Exhibition Allocation</span>
                    </button>
                    <button
                      onClick={() => handleNav('exhibition-stock')}
                      className={`w-full ${
                        currentTab === 'exhibition-stock' ? 'sidebar-sub-item-active' : ''
                      } sidebar-sub-item`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Exhibition Stock</span>
                    </button>
                  </div>
                )}
              </div>

              {/* SALES */}
              <div className="pt-1">
                <button
                  onClick={() => toggleSection('sales')}
                  className="w-full sidebar-section-label"
                >
                  <span>Sales</span>
                  {collapsedSections.sales ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
                {!collapsedSections.sales && (
                  <div className="space-y-0.5 mt-1">
                    <button
                      onClick={() => handleNav('new-sale')}
                      className={`w-full ${
                        currentTab === 'new-sale' ? 'sidebar-sub-item-active' : ''
                      } sidebar-sub-item`}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>New Sale (POS)</span>
                    </button>
                    <button
                      onClick={() => handleNav('sales-history')}
                      className={`w-full ${
                        currentTab === 'sales-history' ? 'sidebar-sub-item-active' : ''
                      } sidebar-sub-item`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Sales History</span>
                    </button>
                  </div>
                )}
              </div>

              {/* FINANCE */}
              <div className="pt-1">
                <button
                  onClick={() => toggleSection('finance')}
                  className="w-full sidebar-section-label"
                >
                  <span>Finance</span>
                  {collapsedSections.finance ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
                {!collapsedSections.finance && (
                  <div className="space-y-0.5 mt-1">
                    <button
                      onClick={() => handleNav('expenses')}
                      className={`w-full ${
                        currentTab === 'expenses' ? 'sidebar-sub-item-active' : ''
                      } sidebar-sub-item`}
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Expenses</span>
                    </button>
                    <button
                      onClick={() => handleNav('reports')}
                      className={`w-full ${
                        currentTab === 'reports' ? 'sidebar-sub-item-active' : ''
                      } sidebar-sub-item`}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Reports Center</span>
                    </button>
                  </div>
                )}
              </div>

              {/* SYSTEM */}
              <div className="pt-1">
                <button
                  onClick={() => toggleSection('system')}
                  className="w-full sidebar-section-label"
                >
                  <span>System</span>
                  {collapsedSections.system ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
                {!collapsedSections.system && (
                  <div className="space-y-0.5 mt-1">
                    <button
                      onClick={() => handleNav('users')}
                      className={`w-full ${
                        currentTab === 'users' ? 'sidebar-sub-item-active' : ''
                      } sidebar-sub-item`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Users</span>
                    </button>
                    <button
                      onClick={() => handleNav('settings')}
                      className={`w-full ${
                        currentTab === 'settings' ? 'sidebar-sub-item-active' : ''
                      } sidebar-sub-item`}
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Settings & Database</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* =================== EXHIBITION USER NAVIGATION =================== */
            <div className="pt-3 space-y-0.5">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-400/70">
                Exhibition Counter
              </div>
              <button
                onClick={() => handleNav('new-sale')}
                className={`w-full ${
                  currentTab === 'new-sale' ? 'sidebar-nav-item-active' : ''
                } sidebar-nav-item`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="font-bold">New Sale (POS)</span>
              </button>
              <button
                onClick={() => handleNav('exhibition-stock')}
                className={`w-full ${
                  currentTab === 'exhibition-stock' ? 'sidebar-nav-item-active' : ''
                } sidebar-nav-item`}
              >
                <Boxes className="w-4 h-4" />
                <span>Exhibition Stock</span>
              </button>
              <button
                onClick={() => handleNav('sales-history')}
                className={`w-full ${
                  currentTab === 'sales-history' ? 'sidebar-nav-item-active' : ''
                } sidebar-nav-item`}
              >
                <Clock className="w-4 h-4" />
                <span>Sales History</span>
              </button>
              <button
                onClick={() => handleNav('day-closing')}
                className={`w-full ${
                  currentTab === 'day-closing' ? 'sidebar-nav-item-active' : ''
                } sidebar-nav-item`}
              >
                <Receipt className="w-4 h-4" />
                <span>Day Closing</span>
              </button>
            </div>
          )}
        </div>

        {/* User Card & Logout Footer */}
        <div className="relative z-10 p-3.5 border-t border-white/10 bg-black/15">
          <div className="flex items-center gap-3 px-1 py-1.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-md ring-2 ring-emerald-400/20">
              {user?.name ? user.name.substring(0, 2) : 'DF'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.name}</p>
              <p className="text-[10px] font-medium text-white/50 truncate">
                {isAdmin ? 'System Administrator' : 'Exhibition Operator'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-500/15 hover:text-rose-200 border border-transparent hover:border-rose-500/25 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
