export type UserRole = 'ADMIN' | 'EXHIBITION_USER';

export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface User {
  id: string;
  name: string;
  mobile?: string;
  email: string;
  /**
   * Credentials. The password itself is never stored - only a PBKDF2 hash and
   * its salt. `password` remains readable for accounts created before hashing
   * existed; it is upgraded to a hash on the next successful sign-in.
   */
  password?: string;
  password_hash?: string;
  password_salt?: string;
  /** Forces a password change before the account can be used. */
  must_change_password?: boolean;
  role: UserRole;
  is_active: boolean;
  assigned_exhibition_id?: string; // If exhibition user is assigned to a specific exhibition
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubCategory {
  id: string;
  category_id: string;
  name: string;
  description: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type WeightUnit = 'gm' | 'kg' | 'ml' | 'ltr' | 'piece' | 'pack';

export interface Product {
  id: string;
  category_id: string;
  sub_category_id: string;
  sku: string;
  name: string;
  description: string;
  unit: string; // e.g. "Pack", "Box", "Pouch"
  weight: number;
  weight_unit: WeightUnit;
  default_selling_price: number;
  min_stock_level: number;
  image_url?: string;
  is_active: boolean;
  current_stock: number; // dynamically computed or synced
  created_at: string;
  updated_at: string;
}

export interface ProductionBatch {
  id: string;
  batch_no: string;
  production_date: string;
  created_by: string;
  created_by_name?: string;
  notes: string;
  created_at: string;
  total_quantity: number;
  total_cost: number;
}

export interface ProductionItem {
  id: string;
  production_batch_id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  cost_per_unit: number;
  total_cost: number;
  selling_price: number;
}

export type ExhibitionStatus = 'PLANNED' | 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Exhibition {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  venue?: string;
  address?: string;
  city?: string;
  location?: string;
  assigned_user_id?: string;
  assigned_user_name?: string;
  exhibition_fee?: number;
  status: ExhibitionStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ExhibitionAllocation {
  id: string;
  exhibition_id: string;
  product_id: string;
  product_name?: string;
  quantity_allocated: number;
  quantity_sold?: number;
  quantity_returned?: number;
  selling_price?: number;
  cost_per_unit: number;
  allocated_cost: number;
  allocated_at: string;
  allocated_by: string;
  allocated_by_name?: string;
}

export type PaymentMode = 'CASH' | 'UPI' | 'CARD';
export type PaymentMethod = PaymentMode | 'BANK_TRANSFER' | 'MIXED';
export type PaymentStatus = 'PAID' | 'PENDING' | 'CANCELLED';

export interface Sale {
  id: string;
  exhibition_id: string;
  exhibition_name?: string;
  user_id: string;
  user_name?: string;
  created_by?: string;
  created_by_name?: string;
  invoice_no: string;
  sale_date: string;
  customer_name?: string;
  customer_mobile?: string;
  customer_phone?: string;
  payment_mode: PaymentMethod;
  payment_method?: PaymentMethod | string;
  payment_status: PaymentStatus;
  subtotal: number;
  discount: number;
  discount_amount?: number;
  total_amount: number;
  // Tender split. Always populated so reconciliation never has to guess how a
  // sale was paid; for single-mode sales the whole total sits in one bucket.
  cash_amount?: number;
  upi_amount?: number;
  card_amount?: number;
  total_cogs?: number;
  gross_profit?: number;
  notes?: string;
  created_at: string;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name?: string;
  sku?: string;
  quantity: number;
  cost_per_unit: number; // Historical cost! Crucial for COGS calculation
  selling_price: number;
  discount: number;
  total_amount: number;
}

export type ExpenseType =
  | 'Exhibition Fee'
  | 'Transport'
  | 'Food'
  | 'Accommodation'
  | 'Labour'
  | 'Decoration'
  | 'Packaging'
  | 'Marketing'
  | 'Other'
  | 'STALL_RENT'
  | 'TRAVEL'
  | 'FOOD'
  | 'MARKETING'
  | 'PACKAGING_MATERIAL'
  | 'UTILITIES'
  | 'MISCELLANEOUS';

export type ExpenseCategory = ExpenseType;

export interface Expense {
  id: string;
  exhibition_id?: string;
  exhibition_name?: string;
  expense_type?: ExpenseType;
  category?: ExpenseType | string;
  payment_method?: PaymentMethod | string;
  description: string;
  amount: number;
  expense_date: string;
  receipt_url?: string;
  created_by: string;
  created_by_name?: string;
  created_at: string;
}

export type StockMovementType =
  | 'PRODUCTION'
  | 'EXHIBITION_ALLOCATION'
  | 'SALE'
  | 'EXHIBITION_RETURN'
  | 'STOCK_ADJUSTMENT';

export interface StockMovement {
  id: string;
  product_id: string;
  product_name?: string;
  sku?: string;
  exhibition_id?: string;
  exhibition_name?: string;
  movement_type: StockMovementType;
  quantity_in: number;
  quantity_out: number;
  balance: number; // Stock balance after movement
  reference_type: string; // e.g. "PRODUCTION_BATCH", "SALE", "ALLOCATION"
  reference_id: string;
  movement_date: string;
  created_by: string;
  created_by_name?: string;
  notes?: string;
}

export interface DayClosing {
  id: string;
  exhibition_id: string;
  exhibition_name?: string;
  closing_date: string;
  date?: string;
  opening_stock_value: number;
  sales_amount: number;
  total_sales?: number;
  cash_amount: number;
  cash_sales?: number;
  upi_amount: number;
  upi_sales?: number;
  card_amount: number;
  card_sales?: number;
  // Tender that is neither cash, UPI nor card (e.g. bank transfer), kept so
  // total_sales always equals the day's real sales.
  other_amount?: number;
  other_sales?: number;
  total_expenses?: number;
  cash_expenses?: number;
  upi_expenses?: number;
  expected_amount: number;
  expected_cash_in_hand?: number;
  actual_amount: number;
  actual_cash_in_hand?: number;
  difference_amount: number;
  cash_difference?: number;
  closing_stock_value: number;
  notes?: string;
  status?: 'DRAFT' | 'CONFIRMED' | string;
  confirmed_by?: string;
  confirmed_by_name?: string;
  closed_by: string;
  closed_by_name?: string;
  closed_at: string;
}

// Navigation Tabs
export type AdminTab =
  | 'dashboard'
  | 'categories'
  | 'sub-categories'
  | 'products'
  | 'production'
  | 'stock'
  | 'exhibitions'
  | 'exhibition-allocation'
  | 'sales'
  | 'expenses'
  | 'reports'
  | 'users'
  | 'settings';

export type ExhibitionTab =
  | 'dashboard'
  | 'my-exhibition'
  | 'exhibition-stock'
  | 'new-sale'
  | 'sales-history'
  | 'day-closing';
