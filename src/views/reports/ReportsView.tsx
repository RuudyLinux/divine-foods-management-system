import React, { useState } from 'react';
import {
  TrendingUp,
  Download,
  Calendar,
  Layers,
  Award,
  DollarSign,
  Package,
  IndianRupee,
  PieChart as PieIcon,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { db } from '../../lib/db';
import { formatINR, formatDate, BRAND_COLORS } from '../../lib/brand';
import { StatCard } from '../../components/common/StatCard';
import { useToast } from '../../components/common/Toast';

export const ReportsView: React.FC = () => {
  const { success } = useToast();
  const [activeTab, setActiveTab] = useState<'sales' | 'exhibitions' | 'production' | 'inventory' | 'pnl'>(
    'pnl'
  );

  const kpis = db.getOverallBusinessKPIs();
  const exhibitions = db.getExhibitions();
  const products = db.getProducts();
  const categories = db.getCategories();
  const batches = db.getProductionBatches();
  const sales = db.getSales();
  const expenses = db.getExpenses();

  // P&L Metrics
  const totalRevenue = sales.reduce((s, item) => s + item.total_amount, 0);
  const totalCOGS = sales.reduce((s, item) => s + item.total_cogs, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const totalOperatingExpenses = expenses.reduce((s, item) => s + item.amount, 0);
  const netProfit = grossProfit - totalOperatingExpenses;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Exhibition rankings
  const exhibitionRankings = exhibitions
    .map(e => {
      const analytics = db.getExhibitionAnalytics(e.id);
      return {
        id: e.id,
        name: e.name,
        city: e.city,
        sales: analytics?.salesRevenue || 0,
        cogs: analytics?.costOfGoodsSold || 0,
        grossProfit: analytics?.grossProfit || 0,
        expenses: analytics?.exhibitionExpenses || 0,
        netProfit: analytics?.netProfit || 0,
        netMargin: analytics?.netMargin || 0,
      };
    })
    .sort((a, b) => b.netProfit - a.netProfit);

  // Payment Method Breakdown
  const paymentMethodData = [
    {
      name: 'UPI / QR',
      value: sales.filter(s => s.payment_method === 'UPI').reduce((sum, s) => sum + s.total_amount, 0),
      color: '#1B4332',
    },
    {
      name: 'Cash',
      value: sales.filter(s => s.payment_method === 'CASH').reduce((sum, s) => sum + s.total_amount, 0),
      color: '#D97706',
    },
    {
      name: 'Card',
      value: sales.filter(s => s.payment_method === 'CARD').reduce((sum, s) => sum + s.total_amount, 0),
      color: '#2D6A4F',
    },
  ];

  const handleExportPnL = () => {
    const csvContent = [
      'Divine Foods - Profit & Loss Statement',
      `Generated on,${new Date().toLocaleDateString('en-IN')}`,
      '',
      'Line Item,Amount (INR)',
      `Total Sales Revenue,${totalRevenue}`,
      `Cost of Goods Sold (COGS),${totalCOGS}`,
      `Gross Profit,${grossProfit}`,
      `Gross Margin %,${grossMargin.toFixed(2)}%`,
      `Total Operating Expenses,${totalOperatingExpenses}`,
      `Net Profit,${netProfit}`,
      `Net Profit Margin %,${netMargin.toFixed(2)}%`,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Divine_Foods_PnL_Statement_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('P&L Statement exported to CSV successfully.');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#1B4332]">
            Business Intelligence & Financials
          </span>
          <h1 className="text-2xl font-bold text-[#2C1810] font-['Outfit',sans-serif] mt-0.5">
            Reports & Analytics
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Audited Profit & Loss (P&L), venue performance matrices, COGS recovery, and sales metrics.
          </p>
        </div>
        <button
          onClick={handleExportPnL}
          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143823] shadow-xs transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export P&L Report</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto text-xs font-bold">
        {[
          { id: 'pnl', label: 'Profit & Loss Statement (P&L)' },
          { id: 'exhibitions', label: 'Exhibitions ROI' },
          { id: 'sales', label: 'Sales & Channels' },
          { id: 'production', label: 'Production Costing' },
          { id: 'inventory', label: 'Inventory Valuation' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#1B4332] text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: P&L Statement */}
      {activeTab === 'pnl' && (
        <div className="space-y-6">
          {/* P&L Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              title="Total Revenue"
              value={formatINR(totalRevenue)}
              subtitle="Gross sales turnover"
              icon={IndianRupee}
              accentColor="green"
            />
            <StatCard
              title="Cost of Goods (COGS)"
              value={formatINR(totalCOGS)}
              subtitle="Manufacturing batch costs"
              icon={Package}
              accentColor="brown"
            />
            <StatCard
              title="Operating Expenses"
              value={formatINR(totalOperatingExpenses)}
              subtitle="Stall rent, travel, meals"
              icon={DollarSign}
              accentColor="orange"
            />
            <StatCard
              title="Net Net Profit"
              value={formatINR(netProfit)}
              subtitle={`Net Margin: ${netMargin.toFixed(1)}%`}
              icon={Award}
              accentColor="green"
              trend={{ value: `${netMargin.toFixed(1)}%`, isPositive: netProfit > 0 }}
            />
          </div>

          {/* Detailed Audited P&L Table */}
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#2C1810] font-['Outfit',sans-serif]">
                  Divine Foods Financial Statement (YTD)
                </h3>
                <p className="text-xs text-stone-500">
                  Calculated with exact FIFO historical costs of production items
                </p>
              </div>
            </div>

            <div className="divide-y divide-stone-100 text-xs">
              <div className="py-3 flex justify-between font-bold text-stone-900">
                <span>Total Gross Sales (A)</span>
                <span className="font-mono text-sm">{formatINR(totalRevenue)}</span>
              </div>
              <div className="py-3 flex justify-between text-stone-600 pl-4">
                <span>(-) Cost of Goods Sold (Raw Ingredients & Packaging) (B)</span>
                <span className="font-mono text-stone-700">({formatINR(totalCOGS)})</span>
              </div>
              <div className="py-3 flex justify-between font-bold text-emerald-800 bg-emerald-50/50 px-2 rounded-lg">
                <span>Gross Profit (A - B)</span>
                <span className="font-mono text-sm">{formatINR(grossProfit)}</span>
              </div>
              <div className="py-2.5 flex justify-between text-stone-500 pl-4 text-[11px]">
                <span>Gross Profit Margin</span>
                <span>{grossMargin.toFixed(1)}%</span>
              </div>
              <div className="py-3 flex justify-between text-stone-600 pl-4">
                <span>(-) Total Stall Rents & Marketing Expenses (C)</span>
                <span className="font-mono text-stone-700">
                  ({formatINR(totalOperatingExpenses)})
                </span>
              </div>
              <div className="py-4 flex justify-between font-extrabold text-base text-[#1B4332] bg-[#1B4332]/5 px-3 rounded-xl border border-[#1B4332]/20">
                <span>Net Business Profit (Gross Profit - C)</span>
                <span className="font-mono">{formatINR(netProfit)}</span>
              </div>
              <div className="py-2.5 flex justify-between text-stone-600 font-bold px-3">
                <span>Net Profit Margin</span>
                <span className="text-[#1B4332]">{netMargin.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Exhibitions ROI */}
      {activeTab === 'exhibitions' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#2C1810]">
                Exhibition Stalls Performance Ranking
              </h3>
              <span className="text-xs text-stone-500 font-medium">Ranked by Net Contribution</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 bg-[#FBF9F5]/70 text-stone-500 font-semibold uppercase">
                    <th className="py-3 px-4">Rank & Venue</th>
                    <th className="py-3 px-4 text-right">Sales Turnover</th>
                    <th className="py-3 px-4 text-right">COGS</th>
                    <th className="py-3 px-4 text-right">Gross Profit</th>
                    <th className="py-3 px-4 text-right">Stall Expenses</th>
                    <th className="py-3 px-4 text-right">Net Profit</th>
                    <th className="py-3 px-4 text-right">ROI Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {exhibitionRankings.map((exh, idx) => (
                    <tr key={exh.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-stone-900">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-[#1B4332]/10 text-[#1B4332] text-[10px] font-bold flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <div>
                            <span>{exh.name}</span>
                            <span className="text-[10px] text-stone-400 block font-normal">
                              {exh.city}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-stone-800 font-mono">
                        {formatINR(exh.sales)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-stone-500 font-mono">
                        {formatINR(exh.cogs)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-stone-900 font-mono">
                        {formatINR(exh.grossProfit)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-rose-700 font-mono">
                        {formatINR(exh.expenses)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-emerald-800 font-mono text-sm">
                        {formatINR(exh.netProfit)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#1B4332]">
                        {exh.netMargin.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Sales & Channels */}
      {activeTab === 'sales' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs">
            <h3 className="text-base font-bold text-[#2C1810] mb-1">Payment Method Share</h3>
            <p className="text-xs text-stone-500 mb-4">Split between UPI, Cash, and Card POS</p>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => [formatINR(val), 'Volume']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 pt-3 border-t border-stone-100">
              {paymentMethodData.map(item => (
                <div key={item.name} className="flex justify-between text-xs">
                  <span className="font-medium text-stone-600">{item.name}</span>
                  <span className="font-bold text-stone-900">{formatINR(item.value)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-[#2C1810] mb-1">
                Transaction Volume by Channel
              </h3>
              <p className="text-xs text-stone-500 mb-4">POS counters and direct sales</p>
              <div className="space-y-3">
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 flex justify-between items-center text-xs">
                  <span className="font-semibold text-stone-800">Total Invoices Issued</span>
                  <span className="font-bold text-stone-900">{sales.length} Bills</span>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 flex justify-between items-center text-xs">
                  <span className="font-semibold text-stone-800">Average Order Value (AOV)</span>
                  <span className="font-bold text-[#1B4332] font-mono">
                    {formatINR(sales.length > 0 ? Math.round(totalRevenue / sales.length) : 0)}
                  </span>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 flex justify-between items-center text-xs">
                  <span className="font-semibold text-stone-800">Discounts Conceded</span>
                  <span className="font-bold text-rose-700 font-mono">
                    {formatINR(sales.reduce((s, i) => s + i.discount_amount, 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Production Costing */}
      {activeTab === 'production' && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-[#2C1810]">Production Batch Cost Summary</h3>
          <p className="text-xs text-stone-500">
            Total production output across factory batches
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-[#FBF9F5] text-stone-500 font-semibold uppercase">
                  <th className="py-2.5 px-3">Batch No</th>
                  <th className="py-2.5 px-3">Production Date</th>
                  <th className="py-2.5 px-3 text-center">Batch Quantity</th>
                  <th className="py-2.5 px-3 text-right">Total Batch Cost</th>
                  <th className="py-2.5 px-3 text-right">Avg Unit Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {batches.map(b => (
                  <tr key={b.id} className="hover:bg-stone-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-[#1B4332]">{b.batch_no}</td>
                    <td className="py-2.5 px-3 text-stone-600">{formatDate(b.production_date)}</td>
                    <td className="py-2.5 px-3 text-center font-bold">{b.total_quantity} units</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">{formatINR(b.total_cost)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-stone-600">
                      {formatINR(b.total_quantity > 0 ? Math.round(b.total_cost / b.total_quantity) : 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Inventory Valuation */}
      {activeTab === 'inventory' && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-[#2C1810]">Stock Valuation & Inventory Health</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-[#FBF9F5] text-stone-500 font-semibold uppercase">
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3 text-center">Current Stock</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Stock Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-stone-50">
                    <td className="py-2.5 px-3 font-semibold text-stone-900">{p.name}</td>
                    <td className="py-2.5 px-3 font-mono text-stone-500">{p.sku}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-stone-800">
                      {p.current_stock} {p.unit}s
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-stone-600">
                      {formatINR(p.default_selling_price)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1B4332]">
                      {formatINR(p.current_stock * p.default_selling_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
