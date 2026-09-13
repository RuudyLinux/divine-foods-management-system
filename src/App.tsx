import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';
import { Sidebar } from './components/navigation/Sidebar';
import { Header } from './components/navigation/Header';
import { LoginView } from './views/LoginView';
import { ChangePasswordView } from './views/ChangePasswordView';

// Admin Views
import { AdminDashboard } from './views/admin/AdminDashboard';
import { CategoriesView } from './views/admin/CategoriesView';
import { SubCategoriesView } from './views/admin/SubCategoriesView';
import { ProductsView } from './views/admin/ProductsView';
import { ProductionView } from './views/admin/ProductionView';
import { InventoryView } from './views/admin/InventoryView';
import { ExhibitionsView } from './views/admin/ExhibitionsView';
import { UsersView } from './views/admin/UsersView';
import { SettingsView } from './views/admin/SettingsView';

// POS & Operational Views
import { NewSaleView } from './views/sales/NewSaleView';
import { SalesHistoryView } from './views/sales/SalesHistoryView';
import { ExpensesView } from './views/expenses/ExpensesView';
import { DayClosingView } from './views/closing/DayClosingView';
import { ReportsView } from './views/reports/ReportsView';

// Exhibition User Views
import { ExhibitionUserDashboard } from './views/exhibition_user/ExhibitionUserDashboard';
import { InvoiceModal } from './components/common/InvoiceModal';
import { Sale } from './types';

const AppContent: React.FC = () => {
  const { user, role, isAdmin, isExhibitionUser, mustChangePassword, logout } = useAuth();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Sale | null>(null);

  if (!user) {
    return <LoginView />;
  }

  // An account still carrying the setup password cannot reach the app until a
  // new one is chosen.
  if (mustChangePassword) {
    return <ChangePasswordView />;
  }

  const roleStr = (user?.role || role || '').toUpperCase();
  const effectiveIsAdmin = isAdmin || roleStr === 'ADMIN';
  const effectiveIsExh = isExhibitionUser || roleStr === 'EXHIBITION_USER';

  const renderActiveView = () => {
    if (effectiveIsAdmin) {
      switch (activeTab) {
        case 'dashboard':
          return <AdminDashboard onNavigate={setActiveTab} />;
        case 'categories':
          return <CategoriesView />;
        case 'sub-categories':
          return <SubCategoriesView />;
        case 'products':
          return <ProductsView />;
        case 'production':
          return <ProductionView />;
        case 'stock':
          return <InventoryView initialTab="stock" />;
        case 'stock-movements':
          return <InventoryView initialTab="movements" />;
        case 'low-stock':
          return <InventoryView initialTab="low-stock" />;
        case 'exhibitions':
        // Allocation and stall stock both live on the exhibitions view, which
        // owns the allocation form and the per-stall inventory table.
        case 'exhibition-allocation':
        case 'exhibition-stock':
          return <ExhibitionsView />;
        case 'new-sale':
          return <NewSaleView onSaleComplete={() => {}} />;
        case 'sales-history':
          return <SalesHistoryView />;
        case 'expenses':
          return <ExpensesView />;
        case 'day-closing':
          return <DayClosingView />;
        case 'reports':
          return <ReportsView />;
        case 'users':
          return <UsersView />;
        case 'settings':
          return <SettingsView />;
        default:
          return <AdminDashboard onNavigate={setActiveTab} />;
      }
    }

    if (effectiveIsExh) {
      switch (activeTab) {
        case 'dashboard':
          return (
            <ExhibitionUserDashboard
              onNavigate={setActiveTab}
              onViewInvoice={sale => setSelectedInvoice(sale)}
            />
          );
        case 'new-sale':
          return <NewSaleView onSaleComplete={() => {}} />;
        case 'sales-history':
          return <SalesHistoryView />;
        case 'exhibition-stock':
          return <InventoryView initialTab="stock" />;
        case 'expenses':
          return <ExpensesView />;
        case 'day-closing':
          return <DayClosingView />;
        default:
          return (
            <ExhibitionUserDashboard
              onNavigate={setActiveTab}
              onViewInvoice={sale => setSelectedInvoice(sale)}
            />
          );
      }
    }

    // Role Recovery State
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center max-w-lg mx-auto mt-12 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-4 font-bold text-lg">
          !
        </div>
        <h3 className="text-lg font-bold text-stone-900 font-['Outfit',sans-serif]">
          Role Permissions Setup Required
        </h3>
        <p className="text-sm text-stone-600 mt-2 mb-6">
          Your account ({user.email || user.name}) does not have an active permission profile.
          Ask an administrator to set your role in the Users screen, then sign in again.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={logout}
            className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 text-sm font-semibold hover:bg-stone-200 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-[#FBF9F5] overflow-hidden text-stone-900 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={tab => {
          setActiveTab(tab);
          setIsMobileSidebarOpen(false);
        }}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area — offset for sidebar on desktop */}
      <div className="flex flex-col h-full lg:pl-72 transition-all">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          onMenuToggle={() => setIsMobileSidebarOpen(prev => !prev)}
        />

        {/* Scrollable View Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto animate-fade-in-up" key={activeTab}>
            {renderActiveView()}
          </div>
        </main>
      </div>

      {/* Global Invoice Preview Modal */}
      {selectedInvoice && (
        <InvoiceModal
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          sale={selectedInvoice}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
