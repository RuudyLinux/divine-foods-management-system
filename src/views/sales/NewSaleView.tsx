import React, { useState, useMemo } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Receipt,
  User,
  Phone,
  CreditCard,
  Banknote,
  QrCode,
  Layers,
  Sparkles,
  AlertCircle,
  Clock,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { db } from '../../lib/db';
import { Product, PaymentMethod, Exhibition, ExhibitionAllocation } from '../../types';
import { formatINR, BRAND_COLORS } from '../../lib/brand';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { InvoiceModal } from '../../components/common/InvoiceModal';

interface NewSaleViewProps {
  onSaleComplete?: (saleId: string) => void;
}

export const NewSaleView: React.FC<NewSaleViewProps> = ({ onSaleComplete }) => {
  const { user, isExhibitionUser } = useAuth();
  const { success, error } = useToast();

  const products = db.getProducts();
  const categories = db.getCategories();
  const exhibitions = db.getExhibitions();

  // Selected Exhibition context
  // If Exhibition User: locked to active exhibition assigned to them
  // If Admin: can choose Central Warehouse or any active Exhibition
  const defaultExhibitionId = useMemo(() => {
    if (isExhibitionUser) {
      const assigned = exhibitions.find(e => e.assigned_user_id === user?.id && e.status === 'ACTIVE');
      return assigned?.id || exhibitions.find(e => e.status === 'ACTIVE')?.id || '';
    }
    return exhibitions.find(e => e.status === 'ACTIVE')?.id || '';
  }, [isExhibitionUser, user, exhibitions]);

  const [selectedExhibitionId, setSelectedExhibitionId] = useState<string>(defaultExhibitionId);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Cart State: Array of items { product, quantity, selling_price }
  const [cart, setCart] = useState<
    Array<{
      product: Product;
      quantity: number;
      selling_price: number;
    }>
  >([]);

  // Customer & Payment Details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountType, setDiscountType] = useState<'FLAT' | 'PERCENT'>('FLAT');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');

  // Split Payment (Cash + UPI)
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [upiAmount, setUpiAmount] = useState<number>(0);

  // Invoice Modal
  const [completedSale, setCompletedSale] = useState<any | null>(null);

  // Helper to determine available stock for a product in current selling context.
  // Exhibition availability is read from the database so every allocation batch
  // and every return is counted; reading a single allocation record hid restocks
  // and ignored units already sold.
  const getAvailableStock = (prod: Product): number => {
    if (selectedExhibitionId) {
      return db.getExhibitionStock(selectedExhibitionId, prod.id);
    }
    return prod.current_stock;
  };

  // Add to Cart with inventory limit validation
  const handleAddToCart = (product: Product) => {
    const available = getAvailableStock(product);
    const existing = cart.find(c => c.product.id === product.id);
    const currentQtyInCart = existing ? existing.quantity : 0;

    if (currentQtyInCart + 1 > available) {
      error(`Cannot add more! Only ${available} units available in this stall inventory.`);
      return;
    }

    if (existing) {
      setCart(prev =>
        prev.map(c => (c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c))
      );
    } else {
      setCart(prev => [
        ...prev,
        {
          product,
          quantity: 1,
          selling_price: product.default_selling_price,
        },
      ]);
    }
  };

  const handleUpdateQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }
    const item = cart.find(c => c.product.id === productId);
    if (!item) return;

    const available = getAvailableStock(item.product);
    if (newQty > available) {
      error(`Stock limit reached. Maximum available is ${available}.`);
      return;
    }

    setCart(prev =>
      prev.map(c => (c.product.id === productId ? { ...c, quantity: newQty } : c))
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart(prev => prev.filter(c => c.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
    setDiscountValue(0);
    setCustomerName('');
    setCustomerPhone('');
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.selling_price, 0);

  const discountAmount = useMemo(() => {
    if (!discountValue || discountValue <= 0) return 0;
    if (discountType === 'PERCENT') {
      return Math.round((subtotal * Math.min(100, discountValue)) / 100);
    }
    return Math.min(subtotal, discountValue);
  }, [subtotal, discountType, discountValue]);

  const grandTotal = Math.max(0, subtotal - discountAmount);

  // Complete Sale
  const handleCheckout = () => {
    if (cart.length === 0) {
      error('Your cart is empty! Please add products before checking out.');
      return;
    }

    if (!selectedExhibitionId) {
      error('Select a stall before billing. Sales are always recorded against an exhibition.');
      return;
    }

    if (paymentMethod === 'MIXED' && cashAmount + upiAmount !== grandTotal) {
      error(
        `Split payment must add up to ${formatINR(grandTotal)}. Currently entered: ${formatINR(cashAmount + upiAmount)}.`
      );
      return;
    }

    // Final verification of available stocks
    for (const item of cart) {
      const avail = getAvailableStock(item.product);
      if (item.quantity > avail) {
        error(`Insufficient stock for ${item.product.name}. Available: ${avail}, in cart: ${item.quantity}.`);
        return;
      }
    }

    try {
      const salePayload = {
        exhibition_id: selectedExhibitionId,
        customer_name: customerName.trim() || 'Walk-in Customer',
        customer_phone: customerPhone.trim() || undefined,
        payment_method: paymentMethod,
        // Recorded per tender so day closing reconciles the cash drawer even
        // when the customer split the payment.
        cash_amount: paymentMethod === 'MIXED' ? cashAmount : undefined,
        upi_amount: paymentMethod === 'MIXED' ? upiAmount : undefined,
        discount_amount: discountAmount,
        notes: paymentMethod === 'MIXED' ? `Cash: ₹${cashAmount}, UPI: ₹${upiAmount}` : undefined,
        created_by: user?.id || 'usr_staff',
        created_by_name: user?.name || 'Cashier',
      };

      const saleItems = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        selling_price: item.selling_price,
      }));

      const createdSale = db.createSale(salePayload, saleItems);
      success(`Sale completed! Invoice #${createdSale.invoice_no} generated.`);

      setCompletedSale(createdSale);
      handleClearCart();

      if (onSaleComplete) {
        onSaleComplete(createdSale.id);
      }
    } catch (err: any) {
      error(err.message || 'Checkout failed');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchCat = activeCategoryTab === 'ALL' || p.category_id === activeCategoryTab;
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch && p.is_active;
  });

  const selectedExhibition = exhibitions.find(e => e.id === selectedExhibitionId);

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col lg:flex-row gap-5 animate-in fade-in duration-150">
      {/* Left: Product Catalog & Fast Grid */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        {/* Top POS Context Bar */}
        <div className="p-4 border-b border-stone-200/80 bg-[#FFF9F0]/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2D1F1E] text-white flex items-center justify-center font-bold text-xs">
              POS
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block">
                Active Terminal
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                <span>{user?.name}</span>
                <span className="text-stone-300">•</span>
                <span className="text-[#2D1F1E]">
                  {selectedExhibition ? selectedExhibition.name : 'Central Warehouse'}
                </span>
              </div>
            </div>
          </div>

          {/* Exhibition Selector (Admin can toggle, Exhibition user locked) */}
          {!isExhibitionUser && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-stone-500">Stall:</span>
              <select
                value={selectedExhibitionId}
                onChange={e => {
                  setSelectedExhibitionId(e.target.value);
                  setCart([]); // Clear cart when switching stalls
                }}
                className="text-xs py-1.5 px-3 bg-white border border-stone-200 rounded-xl font-medium text-stone-800 focus:outline-hidden"
              >
                <option value="">Central Warehouse Main Stock</option>
                {exhibitions
                  .filter(e => e.status === 'ACTIVE' || e.status === 'UPCOMING')
                  .map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.city})
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>

        {/* Search & Category Tabs */}
        <div className="p-4 border-b border-stone-100 space-y-3">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search product by name or scan barcode / SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2D1F1E]/30"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveCategoryTab('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeCategoryTab === 'ALL'
                  ? 'bg-[#2D1F1E] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              All Items
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryTab(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeCategoryTab === cat.id
                    ? 'bg-[#2D1F1E] text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredProducts.map(product => {
            const availableStock = getAvailableStock(product);
            const inCart = cart.find(c => c.product.id === product.id);
            const isOutOfStock = availableStock <= 0;

            return (
              <button
                key={product.id}
                type="button"
                disabled={isOutOfStock}
                onClick={() => handleAddToCart(product)}
                className={`relative flex flex-col justify-between p-3 rounded-xl border text-left transition-all ${
                  isOutOfStock
                    ? 'bg-stone-100/70 border-stone-200 opacity-60 cursor-not-allowed'
                    : inCart
                    ? 'bg-emerald-50/50 border-[#2D1F1E] ring-1 ring-[#2D1F1E] shadow-xs cursor-pointer'
                    : 'bg-white border-stone-200 hover:border-[#2D1F1E]/40 hover:shadow-sm cursor-pointer'
                }`}
              >
                <div>
                  <div className="h-24 rounded-lg bg-stone-100 overflow-hidden mb-2 relative">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-300">
                        <Package className="w-8 h-8" />
                      </div>
                    )}
                    {inCart && (
                      <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#2D1F1E] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                        {inCart.quantity}
                      </div>
                    )}
                  </div>

                  <h5 className="font-bold text-xs text-[#2D2523] line-clamp-1">{product.name}</h5>
                  <p className="text-[10px] text-stone-500">
                    {product.weight} {product.weight_unit} • {product.sku}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between">
                  <span className="font-bold text-xs text-[#2D1F1E]">
                    {formatINR(product.default_selling_price)}
                  </span>
                  <span
                    className={`text-[10px] font-semibold ${
                      isOutOfStock ? 'text-rose-600' : 'text-stone-500'
                    }`}
                  >
                    {isOutOfStock ? 'Out of stock' : `${availableStock} left`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Cart, Customer & Checkout Sidebar */}
      <div className="w-full lg:w-[420px] flex flex-col bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        {/* Cart Header */}
        <div className="p-4 border-b border-stone-200/80 bg-[#FFF9F0]/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-[#2D1F1E]" />
            <h3 className="font-bold text-sm text-[#2D2523]">Current Cart</h3>
            <span className="px-2 py-0.5 rounded-full bg-[#2D1F1E]/10 text-[#2D1F1E] font-bold text-xs">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={handleClearCart}
              className="text-[11px] font-semibold text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
            >
              Clear Cart
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {cart.length > 0 ? (
            cart.map(item => {
              const lineTotal = item.quantity * item.selling_price;
              const maxStock = getAvailableStock(item.product);

              return (
                <div
                  key={item.product.id}
                  className="p-3 rounded-xl bg-stone-50/80 border border-stone-200 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <h6 className="font-bold text-stone-900 truncate">{item.product.name}</h6>
                    <div className="text-[11px] text-stone-500 flex items-center gap-1">
                      <span>{formatINR(item.selling_price)}</span>
                      <span>×</span>
                      <span>{item.quantity}</span>
                    </div>
                  </div>

                  {/* Qty +/- Controls */}
                  <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-lg p-0.5">
                    <button
                      onClick={() => handleUpdateQty(item.product.id, item.quantity - 1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-stone-500 hover:bg-stone-100 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-stone-900">{item.quantity}</span>
                    <button
                      onClick={() => handleUpdateQty(item.product.id, item.quantity + 1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-[#2D1F1E] hover:bg-emerald-50 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-right w-16">
                    <span className="font-bold text-stone-900 font-mono">
                      {formatINR(lineTotal)}
                    </span>
                    <button
                      onClick={() => handleRemoveItem(item.product.id)}
                      className="text-stone-400 hover:text-rose-600 block text-[10px] ml-auto cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 p-6 text-center">
              <ShoppingCart className="w-10 h-10 text-stone-200 mb-2" />
              <p className="font-medium text-xs">No items in cart</p>
              <p className="text-[11px] text-stone-400 mt-1">
                Tap on products in the catalog to begin billing
              </p>
            </div>
          )}
        </div>

        {/* Customer & Discount Controls */}
        <div className="p-4 border-t border-stone-200 space-y-3 bg-[#FFF9F0]/40 text-xs">
          {/* Customer info (Optional) */}
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <User className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Customer Name"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 text-xs bg-white border border-stone-200 rounded-lg focus:outline-hidden"
              />
            </div>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2" />
              <input
                type="tel"
                placeholder="Mobile Number"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 text-xs bg-white border border-stone-200 rounded-lg focus:outline-hidden"
              />
            </div>
          </div>

          {/* Discount Field */}
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-stone-600">Discount:</span>
            <div className="flex items-center gap-1">
              <div className="flex bg-stone-100 rounded-lg p-0.5 border border-stone-200">
                <button
                  type="button"
                  onClick={() => setDiscountType('FLAT')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                    discountType === 'FLAT' ? 'bg-white shadow-xs text-[#2D1F1E]' : 'text-stone-400'
                  }`}
                >
                  ₹
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('PERCENT')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                    discountType === 'PERCENT' ? 'bg-white shadow-xs text-[#2D1F1E]' : 'text-stone-400'
                  }`}
                >
                  %
                </button>
              </div>
              <input
                type="number"
                min={0}
                value={discountValue || ''}
                onChange={e => setDiscountValue(Number(e.target.value))}
                placeholder="0"
                className="w-16 px-2 py-1 text-right text-xs bg-white border border-stone-200 rounded-lg focus:outline-hidden font-bold"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <span className="font-semibold text-stone-600 block mb-1.5">Payment Method:</span>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'UPI', label: 'UPI / QR', icon: QrCode },
                { id: 'CASH', label: 'Cash', icon: Banknote },
                { id: 'CARD', label: 'Card', icon: CreditCard },
                { id: 'MIXED', label: 'Mixed', icon: Layers },
              ].map(m => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                    className={`py-2 px-1 flex flex-col items-center justify-center gap-1 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#2D1F1E] text-white border-[#2D1F1E] shadow-xs'
                        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* If Mixed Payment: show Cash and UPI inputs */}
          {paymentMethod === 'MIXED' && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[10px] text-stone-500 font-bold block">Cash Part (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={cashAmount}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setCashAmount(val);
                    setUpiAmount(Math.max(0, grandTotal - val));
                  }}
                  className="w-full px-2 py-1 text-xs bg-white border border-stone-200 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-stone-500 font-bold block">UPI Part (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={upiAmount}
                  onChange={e => setUpiAmount(Number(e.target.value))}
                  className="w-full px-2 py-1 text-xs bg-white border border-stone-200 rounded-lg font-bold"
                />
              </div>
            </div>
          )}

          {/* Subtotal, Discount & Grand Total */}
          <div className="pt-2 border-t border-stone-200 space-y-1">
            <div className="flex items-center justify-between text-stone-500">
              <span>Subtotal</span>
              <span className="font-mono">{formatINR(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex items-center justify-between text-rose-600 font-medium">
                <span>Discount</span>
                <span className="font-mono">-{formatINR(discountAmount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1 text-base font-extrabold text-[#2D2523]">
              <span>Grand Total</span>
              <span className="text-[#2D1F1E] font-['Outfit',sans-serif] text-lg font-mono">
                {formatINR(grandTotal)}
              </span>
            </div>
          </div>

          {/* Complete Sale Button */}
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={handleCheckout}
            className="w-full mt-2 py-3 rounded-xl bg-[#2D1F1E] hover:bg-[#1F1514] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Receipt className="w-4 h-4" />
            <span>Complete Sale • {formatINR(grandTotal)}</span>
          </button>
        </div>
      </div>

      {/* Invoice Modal for Completed Sale */}
      {completedSale && (
        <InvoiceModal
          isOpen={!!completedSale}
          onClose={() => setCompletedSale(null)}
          sale={completedSale}
        />
      )}
    </div>
  );
};
