import React, { useState } from 'react';
import {
  Package,
  Boxes,
  Calendar,
  IndianRupee,
  TrendingUp,
  Award,
  AlertTriangle,
  ArrowRight,
  Factory,
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
import { formatINR, BRAND_COLORS } from '../../lib/brand';
import { StatCard } from '../../components/common/StatCard';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';

interface AdminDashboardProps {
  onNavigate: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [salesTimeframe, setSalesTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const kpis = db.getOverallBusinessKPIs();
  const products = db.getProducts();
  const categories = db.getCategories();
  const exhibitions = db.getExhibitions();
  const sales = db.getSales();
  const batches = db.getProductionBatches();

  const lowStockItems = products.filter(p => p.current_stock <= p.min_stock_level);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrderCount = sales.filter(s => s.sale_date.startsWith(todayStr)).length;
  const monthlyMargin =
    kpis.monthlySales > 0 ? (kpis.monthlyProfit / kpis.monthlySales) * 100 : 0;
  const currentMonthLabel = new Date().toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
  });

  // ---------------------------------------------------------------------
  // Chart data, derived from the recorded sales. Profit is revenue less the
  // cost of the goods sold, using the cost captured on each sale line.
  // ---------------------------------------------------------------------
  const saleProfit = (sale: (typeof sales)[number]) => {
    const cogs = (sale.items || []).reduce((sum, i) => sum + i.quantity * i.cost_per_unit, 0);
    return sale.total_amount - cogs;
  };

  /** Buckets sales into consecutive periods ending today. */
  const buildSeries = (
    periods: number,
    label: (start: Date) => string,
    startOf: (offsetFromNewest: number) => Date,
    lengthDays: number
  ) => {
    const series: Array<{ label: string; sales: number; profit: number }> = [];
    for (let i = periods - 1; i >= 0; i--) {
      const start = startOf(i);
      const end = new Date(start);
      end.setDate(end.getDate() + lengthDays);

      let periodSales = 0;
      let periodProfit = 0;
      for (const sale of sales) {
        const when = new Date(sale.sale_date);
        if (when >= start && when < end) {
          periodSales += sale.total_amount;
          periodProfit += saleProfit(sale);
        }
      }
      series.push({ label: label(start), sales: periodSales, profit: periodProfit });
    }
    return series;
  };

  const startOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const dailySalesData = buildSeries(
    6,
    start =>
      start.toDateString() === startOfToday().toDateString()
        ? 'Today'
        : start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    offset => {
      const d = startOfToday();
      d.setDate(d.getDate() - offset);
      return d;
    },
    1
  );

  const weeklySalesData = buildSeries(
    4,
    start => `Week of ${start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`,
    offset => {
      const d = startOfToday();
      d.setDate(d.getDate() - offset * 7 - 6);
      return d;
    },
    7
  );

  const monthlySalesData = (() => {
    const series: Array<{ label: string; sales: number; profit: number }> = [];
    for (let i = 3; i >= 0; i--) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(1);
      start.setMonth(start.getMonth() - i);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);

      let periodSales = 0;
      let periodProfit = 0;
      for (const sale of sales) {
        const when = new Date(sale.sale_date);
        if (when >= start && when < end) {
          periodSales += sale.total_amount;
          periodProfit += saleProfit(sale);
        }
      }
      series.push({
        label: start.toLocaleDateString('en-GB', { month: 'short' }) + (i === 0 ? ' (Current)' : ''),
        sales: periodSales,
        profit: periodProfit,
      });
    }
    return series;
  })();

  const chartData =
    salesTimeframe === 'daily'
      ? dailySalesData
      : salesTimeframe === 'weekly'
      ? weeklySalesData
      : monthlySalesData;

  // Revenue share per category, from what actually sold.
  const CATEGORY_COLORS = ['#2D1F1E', '#F47B20', '#F6A623', '#4A3634', '#6B524D', '#C2600F'];
  const categoryRevenue = new Map<string, number>();
  for (const sale of sales) {
    for (const item of sale.items || []) {
      const product = products.find(pr => pr.id === item.product_id);
      const category = categories.find(c => c.id === product?.category_id);
      const name = category?.name || 'Uncategorised';
      categoryRevenue.set(name, (categoryRevenue.get(name) || 0) + item.total_amount);
    }
  }
  const categoryRevenueTotal = [...categoryRevenue.values()].reduce((sum, v) => sum + v, 0);
  const categoryData = [...categoryRevenue.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], index) => ({
      name,
      value,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));

  // Best sellers by units sold.
  const productSales = new Map<string, { name: string; units: number; revenue: number }>();
  for (const sale of sales) {
    for (const item of sale.items || []) {
      const current = productSales.get(item.product_id) || {
        name: item.product_name || 'Product',
        units: 0,
        revenue: 0,
      };
      current.units += item.quantity;
      current.revenue += item.total_amount;
      productSales.set(item.product_id, current);
    }
  }
  const topProductsData = [...productSales.values()]
    .sort((a, b) => b.units - a.units)
    .slice(0, 5);

  // Profit vs Expenses per Exhibition
  const exhibitionFinancials = exhibitions.map(e => {
    const analytics = db.getExhibitionAnalytics(e.id);
    return {
      name: e.name.split(' ')[0],
      Revenue: analytics?.salesRevenue || 0,
      GrossProfit: analytics?.grossProfit || 0,
      Expenses: analytics?.exhibitionExpenses || 0,
      NetProfit: analytics?.netProfit || 0,
    };
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        eyebrow="Executive Cockpit"
        title="Dashboard"
        description="Business overview, active exhibitions and production health."
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate('new-sale')}
            >
              POS New Sale
            </Button>
            <Button
              size="sm"
              onClick={() => onNavigate('production')}
              leadingIcon={<Factory className="w-3.5 h-3.5" />}
            >
              New Production
            </Button>
          </>
        }
      />

      {/* 6 High-Impact KPI Cards specified in Prompt */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          title="Total Products"
          value={kpis.totalProducts}
          subtitle="Active SKUs"
          icon={Package}
          accentColor="green"
          onClick={() => onNavigate('products')}
        />
        <StatCard
          title="Current Stock"
          value={`${kpis.currentStock.toLocaleString()} Units`}
          subtitle="Warehouse inventory"
          icon={Boxes}
          accentColor="brown"
          onClick={() => onNavigate('stock')}
        />
        <StatCard
          title="Active Exhibitions"
          value={kpis.activeExhibitions}
          subtitle={exhibitions.find(e => e.status === 'ACTIVE')?.name || 'No active exhibition'}
          icon={Calendar}
          accentColor="amber"
          onClick={() => onNavigate('exhibitions')}
        />
        <StatCard
          title="Today's Sales"
          value={formatINR(kpis.todaySales)}
          subtitle={`${todayOrderCount} ${todayOrderCount === 1 ? 'order' : 'orders'} today`}
          icon={IndianRupee}
          accentColor="orange"
          onClick={() => onNavigate('sales-history')}
        />
        <StatCard
          title="Monthly Sales"
          value={formatINR(kpis.monthlySales)}
          subtitle={currentMonthLabel}
          icon={TrendingUp}
          accentColor="blue"
          onClick={() => onNavigate('reports')}
        />
        <StatCard
          title="Monthly Profit"
          value={formatINR(kpis.monthlyProfit)}
          subtitle="Net after all costs"
          icon={Award}
          accentColor="green"
          trend={{ value: `${monthlyMargin.toFixed(1)}% margin`, isPositive: monthlyMargin >= 0 }}
          onClick={() => onNavigate('reports')}
        />
      </div>

      {/* Main Charts Grid: Sales Overview & Exhibition Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales Overview with Timeframe Toggle */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-base font-bold text-[#2D2523] font-['Outfit',sans-serif]">
                Sales & Profit Growth
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Revenue compared with net contribution margin
              </p>
            </div>
            {/* Daily / Weekly / Monthly Toggle */}
            <div className="flex items-center p-1 bg-stone-100 rounded-xl">
              {(['daily', 'weekly', 'monthly'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setSalesTimeframe(tab)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all ${
                    salesTimeframe === tab
                      ? 'bg-white text-[#2D1F1E] shadow-xs'
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F7F0E5" />
                <XAxis dataKey="label" stroke="#9A8F88" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#9A8F88"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={val => `₹${val / 1000}k`}
                />
                <Tooltip
                  formatter={(val: number) => [formatINR(val), '']}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    borderColor: '#E8DED2',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar
                  dataKey="sales"
                  name="Sales Revenue"
                  fill="#2D1F1E"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="profit"
                  name="Net Profit"
                  fill="#F47B20"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Contribution Donut */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-[#2D2523] font-['Outfit',sans-serif]">
              Category Share
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">Sales distribution across segments</p>

            <div className="h-52 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => [formatINR(val), 'Revenue']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2 border-t border-[#E8DED2] pt-3">
            {categoryData.map(item => {
              const share = categoryRevenueTotal > 0 ? (item.value / categoryRevenueTotal) * 100 : 0;
              return (
                <div key={item.name} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                      aria-hidden="true"
                    />
                    <span className="truncate font-medium text-[#2D2523]">{item.name}</span>
                  </div>
                  <span className="shrink-0 font-semibold text-[#2D2523]">
                    {formatINR(item.value)}
                    <span className="ml-1.5 font-normal text-[#756B66]">
                      {share.toFixed(0)}%
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 2: Top Selling Products & Exhibition Profit vs Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Selling Products */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#2D2523] font-['Outfit',sans-serif]">
                Top Selling Products
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">Top volume performers this week</p>
            </div>
            <button
              onClick={() => onNavigate('products')}
              className="text-xs font-semibold text-[#2D1F1E] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3.5">
            {topProductsData.map((prod, idx) => (
              <div
                key={prod.name}
                className="flex items-center justify-between p-3 rounded-xl bg-stone-50/70 border border-stone-100 hover:border-stone-200 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#2D1F1E]/10 text-[#2D1F1E] font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-stone-800">{prod.name}</h5>
                    <p className="text-[11px] text-stone-500">{prod.units} units sold</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[#2D1F1E]">
                    {formatINR(prod.revenue)}
                  </span>
                  <div className="w-24 bg-stone-200 h-1.5 rounded-full overflow-hidden mt-1">
                    <div
                      className="bg-[#2D1F1E] h-full rounded-full"
                      style={{ width: `${(prod.units / 100) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Profit vs Expenses per Exhibition */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#2D2523] font-['Outfit',sans-serif]">
                Exhibition Financials (P&L)
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Gross Profit vs Operating Expenses by Venue
              </p>
            </div>
            <button
              onClick={() => onNavigate('exhibitions')}
              className="text-xs font-semibold text-[#2D1F1E] hover:underline flex items-center gap-1"
            >
              <span>Exhibitions Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={exhibitionFinancials}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F7F0E5" />
                <XAxis dataKey="name" stroke="#9A8F88" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#9A8F88"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={val => `₹${val / 1000}k`}
                />
                <Tooltip
                  formatter={(val: number) => [formatINR(val), '']}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    borderColor: '#E8DED2',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Revenue" name="Revenue" fill="#2D1F1E" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Expenses" name="Expenses" fill="#F6A623" radius={[3, 3, 0, 0]} />
                <Bar dataKey="NetProfit" name="Net Profit" fill="#4A3634" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Low Stock Warning Section */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#2D2523] font-['Outfit',sans-serif]">
                Inventory Restock Watch
              </h3>
              <p className="text-xs text-stone-500">
                Products nearing or below the minimum threshold buffer
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('production')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors"
          >
            Create Production Batch
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">Product Name</th>
                <th className="py-2.5 px-3">SKU</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Current Stock</th>
                <th className="py-2.5 px-3">Min Level</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {products.map(prod => {
                const isLow = prod.current_stock <= prod.min_stock_level;
                const isOut = prod.current_stock === 0;
                const status = isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK';

                return (
                  <tr key={prod.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3 px-3 font-semibold text-stone-800">{prod.name}</td>
                    <td className="py-3 px-3 font-mono text-stone-500">{prod.sku}</td>
                    <td className="py-3 px-3 text-stone-600">
                      {prod.category_id.replace('cat_', '').replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-3 font-bold text-stone-800">
                      {prod.current_stock} {prod.unit}s
                    </td>
                    <td className="py-3 px-3 text-stone-500">{prod.min_stock_level} {prod.unit}s</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={status} />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onNavigate('production')}
                        className="text-xs font-semibold text-[#2D1F1E] hover:underline"
                      >
                        Produce Batch
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
