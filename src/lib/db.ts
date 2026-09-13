import {
  Category,
  SubCategory,
  Product,
  ProductionBatch,
  ProductionItem,
  Exhibition,
  ExhibitionAllocation,
  Sale,
  SaleItem,
  Expense,
  StockMovement,
  DayClosing,
  User,
  PaymentMethod,
} from '../types';
import { hashPassword, verifyPassword, INITIAL_ADMIN_PASSWORD } from './auth';

const STORAGE_KEY = 'divine_foods_db_v1';

/**
 * Record ids.
 *
 * A timestamp alone is not unique: two records created in the same
 * millisecond (a scripted import, a fast double submit) would share an id and
 * silently overwrite or shadow each other. The counter makes ids unique within
 * a session and the random suffix keeps them distinct across sessions.
 */
let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  const random = Math.random().toString(36).substring(2, 6);
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}${random}`;
}

export interface CompanySettings {
  company_name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gstin?: string;
  invoice_footer_note: string;
  low_stock_threshold_default: number;
  /** Custom logo as a data URL. Empty or unset falls back to the bundled logo. */
  logo_url?: string;
}

export interface DatabaseState {
  users: User[];
  categories: Category[];
  subCategories: SubCategory[];
  products: Product[];
  productionBatches: ProductionBatch[];
  productionItems: ProductionItem[];
  exhibitions: Exhibition[];
  exhibitionAllocations: ExhibitionAllocation[];
  sales: Sale[];
  saleItems: SaleItem[];
  expenses: Expense[];
  stockMovements: StockMovement[];
  dayClosings: DayClosing[];
  settings?: CompanySettings;
}

const INITIAL_SETTINGS: CompanySettings = {
  company_name: 'Divine Foods',
  tagline: 'Pure & Wholesome Gujarati Sweets, Savouries & Premixes',
  // Left blank on purpose: these print on invoices, so they must be the real
  // company details entered in Settings rather than placeholders.
  address: '',
  phone: '',
  email: '',
  gstin: '',
  invoice_footer_note: 'Thank you for choosing Divine Foods! Handcrafted with utmost hygiene & authentic love.',
  low_stock_threshold_default: 20,
};

// Initial Seed Data matching prompt specifications
const INITIAL_USERS: User[] = [
  {
    id: 'usr_admin',
    name: 'Hardik Vyas (Admin)',
    mobile: '9876543210',
    email: 'admin@divinefoods.com',
    role: 'ADMIN',
    is_active: true,
    // Set at first run and required to change at first sign-in.
    must_change_password: true,
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-01T10:00:00Z',
  },
  {
    id: 'usr_exhibition_vadodara',
    name: 'Ramesh Patel (Exhibition Manager)',
    mobile: '9825012345',
    email: 'vadodara@divinefoods.com',
    role: 'EXHIBITION_USER',
    is_active: true,
    must_change_password: true,
    // No exhibition assigned yet: stalls are created in the Exhibitions screen
    // and the user is assigned there.
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
  },
];

class DatabaseService {
  private state: DatabaseState;
  private listeners = new Set<() => void>();

  constructor() {
    this.state = this.loadFromStorage();
  }

  /**
   * Notified after every write. Lets components that show stored values (the
   * company logo, for instance) update as soon as the value changes, instead
   * of waiting until something else re-renders them.
   *
   * Bound to the instance so it can be handed straight to useSyncExternalStore.
   */
  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private loadFromStorage(): DatabaseState {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return this.getInitialState();
    }
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.products && parsed.exhibitions) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading Divine Foods database from localStorage', e);
    }
    return this.getInitialState();
  }

  /**
   * A fresh copy of the demo data. Deep-copied because mutations would
   * otherwise be written straight into the seed constants, which left
   * "Reset Demo Data" restoring the already-modified data instead of the seed.
   */
  /**
   * A brand new, empty database.
   *
   * Only the staff accounts and company settings are seeded: the login screen
   * authenticates against the user list, so wiping it would lock everyone out.
   * All business data starts empty and is entered through the app.
   *
   * Deep-copied so nothing can write back into the constants above.
   */
  private getInitialState(): DatabaseState {
    return structuredClone({
      users: INITIAL_USERS,
      categories: [],
      subCategories: [],
      products: [],
      productionBatches: [],
      productionItems: [],
      exhibitions: [],
      exhibitionAllocations: [],
      sales: [],
      saleItems: [],
      expenses: [],
      stockMovements: [],
      dayClosings: [],
      settings: INITIAL_SETTINGS,
    });
  }

  /** Returns false when the browser refused to persist (usually storage full). */
  private saveToStorage(): boolean {
    let persisted = true;
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (e) {
        console.error('Failed to save to localStorage', e);
        persisted = false;
      }
    }
    for (const listener of this.listeners) listener();
    return persisted;
  }

  /** Wipes every business record, keeping staff accounts and settings. */
  public resetToDemoData() {
    this.state = this.getInitialState();
    this.saveToStorage();
    return this.state;
  }

  public resetDemoData() {
    return this.resetToDemoData();
  }

  public exportDatabase(): string {
    return JSON.stringify(this.state, null, 2);
  }

  public exportDatabaseBackup(): string {
    return this.exportDatabase();
  }

  public importDatabase(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.products && parsed.users) {
        this.state = parsed;
        this.saveToStorage();
        return true;
      }
    } catch (e) {
      console.error('Invalid database JSON format', e);
    }
    return false;
  }

  public importDatabaseBackup(jsonString: string): { success: boolean; message?: string } {
    const success = this.importDatabase(jsonString);
    return {
      success,
      message: success ? 'Backup imported successfully' : 'Invalid Divine Foods database JSON file.',
    };
  }

  // ===================== SETTINGS =====================

  public getSettings(): CompanySettings {
    return this.state.settings || INITIAL_SETTINGS;
  }

  public updateSettings(data: Partial<CompanySettings>): CompanySettings {
    const previous = this.state.settings || INITIAL_SETTINGS;
    this.state.settings = { ...previous, ...data };

    // Settings can carry a logo image, which is the one setting big enough to
    // exhaust browser storage. Roll back rather than leave the screen showing a
    // logo that was never saved.
    if (!this.saveToStorage()) {
      this.state.settings = previous;
      this.saveToStorage();
      throw new Error(
        'Not enough browser storage to save this. Try a smaller image, or export and clear old data.'
      );
    }
    return this.state.settings;
  }

  // ===================== GETTERS =====================

  /** Accounts without their credentials, which never need to leave the service. */
  public getUsers(): User[] {
    return this.state.users.map(u => {
      const { password, password_hash, password_salt, ...safe } = u;
      return safe as User;
    });
  }

  public getCategories(): Category[] {
    return [...this.state.categories];
  }

  public getSubCategories(): SubCategory[] {
    return [...this.state.subCategories];
  }

  public getProducts(): Product[] {
    // Return products with live main stock calculated
    return this.state.products.map(p => ({
      ...p,
      current_stock: this.getMainStock(p.id),
    }));
  }

  public getExhibitions(): Exhibition[] {
    return this.state.exhibitions.map(e => ({
      ...e,
      // Older records used PLANNED for what is now UPCOMING.
      status: e.status === 'PLANNED' ? 'UPCOMING' : e.status,
      city: e.city || e.venue?.split(',')[1]?.trim() || e.address?.split(',')[1]?.trim() || 'Gujarat',
      location: e.location || e.venue || e.address || 'Exhibition Venue',
      assigned_user_id: e.assigned_user_id || 'usr_exhibition_vadodara',
    }));
  }

  public getProductionBatches(): ProductionBatch[] {
    return [...this.state.productionBatches];
  }

  public getProductionItems(batchId?: string): ProductionItem[] {
    if (batchId) {
      return this.state.productionItems.filter(i => i.production_batch_id === batchId);
    }
    return [...this.state.productionItems];
  }

  public getExhibitionAllocations(exhibitionId?: string): ExhibitionAllocation[] {
    const list = exhibitionId
      ? this.state.exhibitionAllocations.filter(a => a.exhibition_id === exhibitionId)
      : this.state.exhibitionAllocations;

    // Sold and returned quantities are tracked per product, not per allocation
    // batch, so spread them over that product's batches oldest-first. Without
    // this, a product allocated twice reports the product's whole sold figure
    // against every one of its batches.
    const consumed = new Map<string, {sold: number; returned: number}>();
    const remainingFor = (exhId: string, productId: string) => {
      const key = `${exhId}|${productId}`;
      let cur = consumed.get(key);
      if (!cur) {
        const pos = this.getExhibitionPositions(exhId).get(productId);
        cur = {sold: pos?.sold || 0, returned: pos?.returned || 0};
        consumed.set(key, cur);
      }
      return cur;
    };

    const oldestFirst = [...list].sort(
      (a, b) => new Date(a.allocated_at).getTime() - new Date(b.allocated_at).getTime()
    );
    const perAllocation = new Map<string, {sold: number; returned: number}>();
    for (const a of oldestFirst) {
      const pool = remainingFor(a.exhibition_id, a.product_id);
      const sold = Math.min(pool.sold, a.quantity_allocated);
      pool.sold -= sold;
      const returned = Math.min(pool.returned, a.quantity_allocated - sold);
      pool.returned -= returned;
      perAllocation.set(a.id, {sold, returned});
    }

    return list.map(a => {
      const prod = this.state.products.find(p => p.id === a.product_id);
      const split = perAllocation.get(a.id) || {sold: 0, returned: 0};

      return {
        ...a,
        product_name: a.product_name || prod?.name || 'Product',
        selling_price: a.selling_price || prod?.default_selling_price || 0,
        quantity_sold: split.sold,
        quantity_returned: split.returned,
      };
    });
  }

  public getSales(exhibitionId?: string): Sale[] {
    const list = exhibitionId
      ? this.state.sales.filter(s => s.exhibition_id === exhibitionId)
      : this.state.sales;
    return list.map(s => {
      const items = this.state.saleItems.filter(item => item.sale_id === s.id);
      const total_cogs = items.reduce((sum, item) => sum + (item.quantity * item.cost_per_unit), 0);
      const gross_profit = s.total_amount - total_cogs;
      return {
        ...s,
        customer_phone: s.customer_phone || s.customer_mobile || '',
        created_by: s.created_by || s.user_id,
        created_by_name: s.created_by_name || s.user_name || 'Staff',
        payment_method: s.payment_method || s.payment_mode,
        total_cogs: s.total_cogs ?? total_cogs,
        gross_profit: s.gross_profit ?? gross_profit,
        discount_amount: s.discount_amount ?? s.discount ?? 0,
        items,
      };
    });
  }

  public getSaleItems(saleId?: string): SaleItem[] {
    if (saleId) {
      return this.state.saleItems.filter(i => i.sale_id === saleId);
    }
    return [...this.state.saleItems];
  }

  public getExpenses(exhibitionId?: string): Expense[] {
    const list = exhibitionId
      ? this.state.expenses.filter(e => e.exhibition_id === exhibitionId)
      : this.state.expenses;
    return list.map(e => ({
      ...e,
      category: e.category || e.expense_type,
      payment_method: e.payment_method || 'UPI',
    }));
  }

  public getStockMovements(productId?: string, exhibitionId?: string): StockMovement[] {
    let list = [...this.state.stockMovements];
    if (productId) {
      list = list.filter(m => m.product_id === productId);
    }
    if (exhibitionId) {
      list = list.filter(m => m.exhibition_id === exhibitionId);
    }
    return list.sort((a, b) => new Date(b.movement_date).getTime() - new Date(a.movement_date).getTime());
  }

  public getDayClosings(exhibitionId?: string): DayClosing[] {
    const list = exhibitionId
      ? this.state.dayClosings.filter(c => c.exhibition_id === exhibitionId)
      : this.state.dayClosings;
    return list.map(c => ({
      ...c,
      date: c.date || c.closing_date,
      total_sales: c.total_sales ?? c.sales_amount,
      cash_sales: c.cash_sales ?? c.cash_amount,
      upi_sales: c.upi_sales ?? c.upi_amount,
      card_sales: c.card_sales ?? c.card_amount,
      other_sales: c.other_sales ?? c.other_amount ?? 0,
      expected_cash_in_hand: c.expected_cash_in_hand ?? c.expected_amount,
      actual_cash_in_hand: c.actual_cash_in_hand ?? c.actual_amount,
      cash_difference: c.cash_difference ?? c.difference_amount,
      status: c.status || 'CONFIRMED',
      confirmed_by_name: c.confirmed_by_name || c.closed_by_name,
    }));
  }

  // ===================== STOCK COMPUTATION RULES =====================

  /**
   * Main inventory = sum of production - sum of allocations to exhibitions + returns
   */
  public getMainStock(productId: string): number {
    const movements = this.state.stockMovements.filter(m => m.product_id === productId);
    let stock = 0;
    for (const m of movements) {
      if (m.movement_type === 'PRODUCTION' || m.movement_type === 'EXHIBITION_RETURN') {
        stock += m.quantity_in;
      } else if (m.movement_type === 'EXHIBITION_ALLOCATION') {
        stock -= m.quantity_out;
      } else if (m.movement_type === 'STOCK_ADJUSTMENT') {
        stock = stock + m.quantity_in - m.quantity_out;
      }
    }
    return Math.max(0, stock);
  }

  /**
   * Single owner of the exhibition stock position, so every caller (POS,
   * allocation, returns, day closing, analytics) reads the same numbers.
   *
   * Exhibition Stock = Allocated - Sold - Returned to main warehouse.
   *
   * Returns are read from the EXHIBITION_RETURN stock movements rather than
   * from ExhibitionAllocation.quantity_returned: the movement ledger is
   * written by every return path, so it cannot drift.
   */
  private getExhibitionPositions(
    exhibitionId: string
  ): Map<string, {allocated: number; sold: number; returned: number}> {
    const positions = new Map<string, {allocated: number; sold: number; returned: number}>();
    const position = (productId: string) => {
      let cur = positions.get(productId);
      if (!cur) {
        cur = {allocated: 0, sold: 0, returned: 0};
        positions.set(productId, cur);
      }
      return cur;
    };

    for (const a of this.state.exhibitionAllocations) {
      if (a.exhibition_id !== exhibitionId) continue;
      position(a.product_id).allocated += a.quantity_allocated;
    }

    const saleIdsInExhibition = new Set(
      this.state.sales.filter(s => s.exhibition_id === exhibitionId).map(s => s.id)
    );
    for (const item of this.state.saleItems) {
      if (!saleIdsInExhibition.has(item.sale_id)) continue;
      position(item.product_id).sold += item.quantity;
    }

    for (const m of this.state.stockMovements) {
      if (m.exhibition_id !== exhibitionId) continue;
      if (m.movement_type !== 'EXHIBITION_RETURN') continue;
      position(m.product_id).returned += m.quantity_in;
    }

    return positions;
  }

  public getExhibitionStock(exhibitionId: string, productId: string): number {
    const pos = this.getExhibitionPositions(exhibitionId).get(productId);
    if (!pos) return 0;
    return Math.max(0, pos.allocated - pos.sold - pos.returned);
  }

  /**
   * Get all products available at an exhibition with stock counts
   */
  public getExhibitionInventoryList(exhibitionId: string): Array<{
    product: Product;
    allocated: number;
    sold: number;
    returned: number;
    available: number;
  }> {
    const result: Array<{
      product: Product;
      allocated: number;
      sold: number;
      returned: number;
      available: number;
    }> = [];

    for (const [prodId, counts] of this.getExhibitionPositions(exhibitionId).entries()) {
      const product = this.state.products.find(p => p.id === prodId);
      if (!product) continue;
      result.push({
        product,
        allocated: counts.allocated,
        sold: counts.sold,
        returned: counts.returned,
        available: Math.max(0, counts.allocated - counts.sold - counts.returned),
      });
    }
    return result;
  }

  // ===================== MUTATIONS =====================

  // CATEGORIES
  public addCategory(data: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Category {
    const newCat: Category = {
      ...data,
      id: nextId('cat'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.state.categories.push(newCat);
    this.saveToStorage();
    return newCat;
  }

  public updateCategory(id: string, data: Partial<Category>): Category | null {
    const cat = this.state.categories.find(c => c.id === id);
    if (!cat) return null;
    Object.assign(cat, data, { updated_at: new Date().toISOString() });
    this.saveToStorage();
    return cat;
  }

  public deleteCategory(id: string): { success: boolean; message?: string } {
    const hasProducts = this.state.products.some(p => p.category_id === id);
    if (hasProducts) {
      return { success: false, message: 'Cannot delete category that contains products. Please reassign or delete products first.' };
    }
    this.state.categories = this.state.categories.filter(c => c.id !== id);
    this.state.subCategories = this.state.subCategories.filter(s => s.category_id !== id);
    this.saveToStorage();
    return { success: true };
  }

  // SUB CATEGORIES
  public addSubCategory(data: Omit<SubCategory, 'id' | 'created_at' | 'updated_at'>): SubCategory {
    const newSub: SubCategory = {
      ...data,
      id: nextId('sub'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.state.subCategories.push(newSub);
    this.saveToStorage();
    return newSub;
  }

  public updateSubCategory(id: string, data: Partial<SubCategory>): SubCategory | null {
    const sub = this.state.subCategories.find(s => s.id === id);
    if (!sub) return null;
    Object.assign(sub, data, { updated_at: new Date().toISOString() });
    this.saveToStorage();
    return sub;
  }

  // PRODUCTS
  public addProduct(data: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'current_stock'>, initialStock: number = 0, initialCost: number = 0, userId: string = 'usr_admin', userName: string = 'Admin'): Product {
    // Check unique SKU
    const existing = this.state.products.find(p => p.sku.toLowerCase() === data.sku.toLowerCase());
    if (existing) {
      throw new Error(`SKU "${data.sku}" already exists. Please choose a unique SKU.`);
    }

    const newProd: Product = {
      ...data,
      id: nextId('prod'),
      current_stock: initialStock,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.state.products.push(newProd);

    // If initial stock provided, record a production / opening stock movement
    if (initialStock > 0) {
      this.state.stockMovements.push({
        id: nextId('mv_init'),
        product_id: newProd.id,
        product_name: newProd.name,
        sku: newProd.sku,
        movement_type: 'PRODUCTION',
        quantity_in: initialStock,
        quantity_out: 0,
        balance: initialStock,
        reference_type: 'OPENING_STOCK',
        reference_id: newProd.id,
        movement_date: new Date().toISOString(),
        created_by: userId,
        created_by_name: userName,
        notes: `Opening stock registration (${initialCost > 0 ? 'Cost ₹' + initialCost : 'Initial'})`,
      });
    }

    this.saveToStorage();
    return newProd;
  }

  public updateProduct(id: string, data: Partial<Product>): Product | null {
    const prod = this.state.products.find(p => p.id === id);
    if (!prod) return null;
    if (data.sku && data.sku !== prod.sku) {
      const duplicate = this.state.products.find(p => p.sku.toLowerCase() === data.sku!.toLowerCase() && p.id !== id);
      if (duplicate) {
        throw new Error(`SKU "${data.sku}" is already assigned to another product.`);
      }
    }
    Object.assign(prod, data, { updated_at: new Date().toISOString() });
    this.saveToStorage();
    return prod;
  }

  // PRODUCTION / MAKING
  public createProductionBatch(
    batchData: { batch_no: string; production_date: string; notes: string; created_by: string; created_by_name: string },
    items: Array<{ product_id: string; quantity: number; cost_per_unit: number; selling_price: number }>
  ): ProductionBatch {
    // Unique batch number check
    const existing = this.state.productionBatches.find(b => b.batch_no.toLowerCase() === batchData.batch_no.toLowerCase());
    if (existing) {
      throw new Error(`Batch Number "${batchData.batch_no}" already exists.`);
    }

    if (items.length === 0) {
      throw new Error('Please add at least one product to the production batch.');
    }

    let totalQuantity = 0;
    let totalCost = 0;

    const batchId = nextId('batch');
    const productionItems: ProductionItem[] = [];

    for (const it of items) {
      if (it.quantity <= 0) {
        throw new Error('Production quantity must be greater than zero.');
      }
      const prod = this.state.products.find(p => p.id === it.product_id);
      if (!prod) continue;

      const itemCost = it.quantity * it.cost_per_unit;
      totalQuantity += it.quantity;
      totalCost += itemCost;

      const pItem: ProductionItem = {
        id: nextId('pitem'),
        production_batch_id: batchId,
        product_id: it.product_id,
        product_name: prod.name,
        quantity: it.quantity,
        cost_per_unit: it.cost_per_unit,
        total_cost: itemCost,
        selling_price: it.selling_price || prod.default_selling_price,
      };
      productionItems.push(pItem);

      // Add stock movement for each item
      const currentBal = this.getMainStock(prod.id);
      const newBal = currentBal + it.quantity;

      this.state.stockMovements.push({
        id: nextId('mv_prod'),
        product_id: prod.id,
        product_name: prod.name,
        sku: prod.sku,
        movement_type: 'PRODUCTION',
        quantity_in: it.quantity,
        quantity_out: 0,
        balance: newBal,
        reference_type: 'PRODUCTION_BATCH',
        reference_id: batchId,
        movement_date: new Date(batchData.production_date).toISOString(),
        created_by: batchData.created_by,
        created_by_name: batchData.created_by_name,
        notes: `Production Batch ${batchData.batch_no} (${it.quantity} units @ ₹${it.cost_per_unit}/unit)`,
      });
    }

    const batch: ProductionBatch = {
      id: batchId,
      batch_no: batchData.batch_no,
      production_date: batchData.production_date,
      created_by: batchData.created_by,
      created_by_name: batchData.created_by_name,
      notes: batchData.notes,
      created_at: new Date().toISOString(),
      total_quantity: totalQuantity,
      total_cost: totalCost,
    };

    this.state.productionBatches.unshift(batch);
    this.state.productionItems.push(...productionItems);
    this.saveToStorage();

    return batch;
  }

  // EXHIBITIONS
  public addExhibition(data: Omit<Exhibition, 'id' | 'created_at' | 'updated_at'>): Exhibition {
    const newExh: Exhibition = {
      ...data,
      id: nextId('exh'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.state.exhibitions.unshift(newExh);
    this.saveToStorage();
    return newExh;
  }

  public createExhibition(data: any): Exhibition {
    // UPCOMING is the term the rest of the app uses for an exhibition that has
    // not started; PLANNED is an older spelling kept only for stored records.
    const status = data.status === 'PLANNED' ? 'UPCOMING' : data.status || 'UPCOMING';
    return this.addExhibition({
      name: data.name,
      start_date: data.start_date,
      end_date: data.end_date,
      venue: data.location || data.venue || data.city || 'Exhibition Venue',
      address: data.city || data.address || 'Gujarat',
      city: data.city,
      location: data.location,
      assigned_user_id: data.assigned_user_id,
      assigned_user_name: data.assigned_user_name,
      exhibition_fee: data.exhibition_fee || 0,
      status,
      notes: data.notes,
    });
  }

  public updateExhibition(id: string, data: Partial<Exhibition>): Exhibition | null {
    const exh = this.state.exhibitions.find(e => e.id === id);
    if (!exh) return null;
    Object.assign(exh, data, { updated_at: new Date().toISOString() });
    this.saveToStorage();
    return exh;
  }

  // EXHIBITION ALLOCATION
  public allocateStockToExhibition(
    exhibitionId: string,
    allocations: Array<{ product_id: string; quantity: number; cost_per_unit: number }>,
    userId: string,
    userName: string
  ): ExhibitionAllocation[] {
    const exh = this.state.exhibitions.find(e => e.id === exhibitionId);
    if (!exh) throw new Error('Exhibition not found');
    if (exh.status === 'COMPLETED' || exh.status === 'CANCELLED') {
      throw new Error(`Cannot allocate stock to a ${exh.status.toLowerCase()} exhibition.`);
    }

    // Validate the whole request before writing anything: a throw halfway
    // through used to leave already-created allocations in memory that
    // saveToStorage() never persisted, so the UI and localStorage disagreed.
    const requested = new Map<string, number>();
    for (const alloc of allocations) {
      if (alloc.quantity <= 0) continue;
      const prod = this.state.products.find(p => p.id === alloc.product_id);
      if (!prod) continue;
      requested.set(alloc.product_id, (requested.get(alloc.product_id) || 0) + alloc.quantity);
    }
    for (const [productId, quantity] of requested.entries()) {
      const prod = this.state.products.find(p => p.id === productId)!;
      const availableMain = this.getMainStock(productId);
      if (quantity > availableMain) {
        throw new Error(`Insufficient stock for "${prod.name}". Available main stock: ${availableMain}, requested: ${quantity}`);
      }
    }

    const createdAllocations: ExhibitionAllocation[] = [];
    const mainBalances = new Map<string, number>();

    for (const alloc of allocations) {
      if (alloc.quantity <= 0) continue;
      const prod = this.state.products.find(p => p.id === alloc.product_id);
      if (!prod) continue;

      const allocatedCost = alloc.quantity * alloc.cost_per_unit;
      const allocRecord: ExhibitionAllocation = {
        id: nextId('alloc'),
        exhibition_id: exhibitionId,
        product_id: alloc.product_id,
        product_name: prod.name,
        selling_price: prod.default_selling_price,
        quantity_allocated: alloc.quantity,
        quantity_sold: 0,
        quantity_returned: 0,
        cost_per_unit: alloc.cost_per_unit,
        allocated_cost: allocatedCost,
        allocated_at: new Date().toISOString(),
        allocated_by: userId,
        allocated_by_name: userName,
      };

      createdAllocations.push(allocRecord);
      this.state.exhibitionAllocations.push(allocRecord);

      // Stock movement record. Track the balance per product across lines so
      // two lines of the same product do not both record the same balance.
      const balanceBefore = mainBalances.get(prod.id) ?? this.getMainStock(prod.id);
      const mainBalAfter = balanceBefore - alloc.quantity;
      mainBalances.set(prod.id, mainBalAfter);
      this.state.stockMovements.push({
        id: nextId('mv_alloc'),
        product_id: prod.id,
        product_name: prod.name,
        sku: prod.sku,
        exhibition_id: exhibitionId,
        exhibition_name: exh.name,
        movement_type: 'EXHIBITION_ALLOCATION',
        quantity_in: 0,
        quantity_out: alloc.quantity,
        balance: mainBalAfter,
        reference_type: 'EXHIBITION_ALLOCATION',
        reference_id: allocRecord.id,
        movement_date: new Date().toISOString(),
        created_by: userId,
        created_by_name: userName,
        notes: `Allocated ${alloc.quantity} units to ${exh.name} (@ ₹${alloc.cost_per_unit})`,
      });
    }

    this.saveToStorage();
    return createdAllocations;
  }

  public allocateProductToExhibition(
    exhibitionId: string,
    productId: string,
    quantity: number,
    userId: string,
    userName: string
  ): ExhibitionAllocation {
    const prod = this.state.products.find(p => p.id === productId);

    // The cost carried into the allocation becomes the sale's recorded cost of
    // goods, so it decides reported profit. Use what the goods actually cost:
    // the most recent production batch for this product, else the cost of the
    // last allocation. Half the selling price is only a last resort for a
    // product that has never been produced or allocated.
    const latestProduction = this.state.productionItems
      .filter(i => i.product_id === productId)
      .map(item => {
        const batch = this.state.productionBatches.find(b => b.id === item.production_batch_id);
        return { cost: item.cost_per_unit, at: batch?.created_at || batch?.production_date || '' };
      })
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0];

    const latestAlloc = this.state.exhibitionAllocations
      .filter(a => a.product_id === productId)
      .sort((a, b) => new Date(b.allocated_at).getTime() - new Date(a.allocated_at).getTime())[0];

    const cost =
      latestProduction?.cost ??
      latestAlloc?.cost_per_unit ??
      Math.round((prod?.default_selling_price || 200) * 0.5);
    const res = this.allocateStockToExhibition(
      exhibitionId,
      [{ product_id: productId, quantity, cost_per_unit: cost }],
      userId,
      userName
    );
    return res[0];
  }

  // RETURN STOCK FROM EXHIBITION TO MAIN WAREHOUSE
  public returnStockFromExhibition(
    exhibitionId: string,
    returns: Array<{ product_id: string; quantity: number }>,
    userId: string,
    userName: string
  ) {
    const exh = this.state.exhibitions.find(e => e.id === exhibitionId);
    if (!exh) throw new Error('Exhibition not found');

    // Validate the whole request before writing anything, and aggregate repeated
    // lines for the same product so they cannot each pass against the same stock.
    const requested = new Map<string, number>();
    for (const ret of returns) {
      if (ret.quantity <= 0) continue;
      if (!this.state.products.find(p => p.id === ret.product_id)) continue;
      requested.set(ret.product_id, (requested.get(ret.product_id) || 0) + ret.quantity);
    }
    for (const [productId, quantity] of requested.entries()) {
      const prod = this.state.products.find(p => p.id === productId)!;
      const availableInExh = this.getExhibitionStock(exhibitionId, productId);
      if (quantity > availableInExh) {
        throw new Error(`Cannot return ${quantity} of "${prod.name}". Only ${availableInExh} available at exhibition.`);
      }
    }

    for (const [productId, quantity] of requested.entries()) {
      const prod = this.state.products.find(p => p.id === productId)!;
      const ret = {product_id: productId, quantity};

      // Record return allocation / negative adjustment or EXHIBITION_RETURN movement
      const mainStockNow = this.getMainStock(prod.id);
      this.state.stockMovements.push({
        id: nextId('mv_ret'),
        product_id: prod.id,
        product_name: prod.name,
        sku: prod.sku,
        exhibition_id: exhibitionId,
        exhibition_name: exh.name,
        movement_type: 'EXHIBITION_RETURN',
        quantity_in: ret.quantity,
        quantity_out: 0,
        balance: mainStockNow + ret.quantity,
        reference_type: 'EXHIBITION_RETURN',
        reference_id: exhibitionId,
        movement_date: new Date().toISOString(),
        created_by: userId,
        created_by_name: userName,
        notes: `Returned ${ret.quantity} units from ${exh.name} to main stock`,
      });

      // Keep the per-batch display figure in step with the ledger, oldest batch
      // first. Stock maths reads the ledger, so this is presentation only.
      let left = ret.quantity;
      const batches = this.state.exhibitionAllocations
        .filter(a => a.exhibition_id === exhibitionId && a.product_id === prod.id)
        .sort((a, b) => new Date(a.allocated_at).getTime() - new Date(b.allocated_at).getTime());
      for (const batch of batches) {
        if (left <= 0) break;
        const room = batch.quantity_allocated - (batch.quantity_returned || 0);
        const take = Math.min(room, left);
        if (take <= 0) continue;
        batch.quantity_returned = (batch.quantity_returned || 0) + take;
        left -= take;
      }
    }

    this.saveToStorage();
  }

  public returnProductFromExhibition(
    allocationIdOrExhibitionId: string,
    qtyOrProductId: number | string,
    userIdOrQty?: string | number,
    userNameOrUserId?: string,
    notesOrUserName?: string
  ) {
    const alloc = this.state.exhibitionAllocations.find(a => a.id === allocationIdOrExhibitionId);
    if (alloc) {
      const qty = typeof qtyOrProductId === 'number' ? qtyOrProductId : 1;
      const uId = typeof userIdOrQty === 'string' ? userIdOrQty : 'usr_admin';
      const uName = typeof userNameOrUserId === 'string' ? userNameOrUserId : 'Administrator';
      // returnStockFromExhibition owns both the ledger entry and the
      // quantity_returned bookkeeping; adding to it here would double count.
      this.returnStockFromExhibition(alloc.exhibition_id, [{ product_id: alloc.product_id, quantity: qty }], uId, uName);
      return;
    }
    const exhibitionId = allocationIdOrExhibitionId;
    const productId = String(qtyOrProductId);
    const qty = Number(userIdOrQty) || 1;
    const uId = String(userNameOrUserId || 'usr_admin');
    const uName = String(notesOrUserName || 'Administrator');
    this.returnStockFromExhibition(exhibitionId, [{ product_id: productId, quantity: qty }], uId, uName);
  }

  // SALES CREATION (POS / NEW SALE)
  public createSale(
    saleData: {
      exhibition_id: string;
      user_id?: string;
      user_name?: string;
      created_by?: string;
      created_by_name?: string;
      customer_name?: string;
      customer_mobile?: string;
      customer_phone?: string;
      payment_mode?: PaymentMethod;
      payment_method?: any;
      // Split tender for a MIXED payment. Anything not supplied is inferred
      // from payment_mode so day closing always sees a full breakdown.
      cash_amount?: number;
      upi_amount?: number;
      card_amount?: number;
      discount?: number;
      discount_amount?: number;
      notes?: string;
    },
    items: Array<{ product_id: string; quantity: number; selling_price: number; discount?: number }>
  ): Sale {
    const exh = this.state.exhibitions.find(e => e.id === saleData.exhibition_id);
    if (!exh) throw new Error('Exhibition not found.');
    if (exh.status === 'COMPLETED' || exh.status === 'CANCELLED') {
      throw new Error(`Sale cannot be completed because this exhibition has ${exh.status.toLowerCase()}.`);
    }

    if (!items || items.length === 0) {
      throw new Error('Please select at least one product for the sale.');
    }

    // Check Day Closing Lock
    const todayStr = new Date().toISOString().split('T')[0];
    const isClosedToday = this.state.dayClosings.some(
      c => c.exhibition_id === saleData.exhibition_id && c.closing_date === todayStr
    );
    if (isClosedToday) {
      throw new Error("Today's exhibition sales have already been locked by Day Closing. Contact Admin to reopen.");
    }

    // Validate available stock in this exhibition. Quantities are summed per
    // product first: two lines for the same product would otherwise each be
    // checked against the full available stock and together oversell it.
    const requestedPerProduct = new Map<string, number>();
    for (const it of items) {
      if (it.quantity <= 0) {
        throw new Error('Please enter a valid quantity.');
      }
      const prod = this.state.products.find(p => p.id === it.product_id);
      if (!prod) throw new Error(`Product not found.`);
      requestedPerProduct.set(it.product_id, (requestedPerProduct.get(it.product_id) || 0) + it.quantity);
    }
    for (const [productId, quantity] of requestedPerProduct.entries()) {
      const prod = this.state.products.find(p => p.id === productId)!;
      const availableInExh = this.getExhibitionStock(saleData.exhibition_id, productId);
      if (quantity > availableInExh) {
        throw new Error(
          `Insufficient stock for "${prod.name}". Only ${availableInExh} units available at this exhibition (requested ${quantity}).`
        );
      }
    }

    const userId = saleData.user_id || saleData.created_by || 'usr_staff';
    const userName = saleData.user_name || saleData.created_by_name || 'Staff';
    const paymentMode = (saleData.payment_mode || saleData.payment_method || 'CASH') as PaymentMethod;
    const customerMobile = saleData.customer_mobile || saleData.customer_phone || '';
    const orderDiscount = saleData.discount ?? saleData.discount_amount ?? 0;

    // Generate unique invoice number: INV-DF-XXXXX. Derived from the highest
    // number already issued, because a count of sales collides with the
    // numbers the seed data (and any deleted sale) already used.
    const highestInvoiceNo = this.state.sales.reduce((highest, s) => {
      const digits = /^INV-DF-(\d+)$/.exec(s.invoice_no || '');
      return digits ? Math.max(highest, parseInt(digits[1], 10)) : highest;
    }, 100);
    const invoiceNum = `INV-DF-${(highestInvoiceNo + 1).toString().padStart(5, '0')}`;
    const saleId = nextId('sale');
    let subtotal = 0;
    const saleItemsList: SaleItem[] = [];
    const exhBalances = new Map<string, number>();

    for (const it of items) {
      const prod = this.state.products.find(p => p.id === it.product_id)!;
      const itemDisc = it.discount || 0;
      const lineTotal = it.quantity * it.selling_price - itemDisc;
      subtotal += lineTotal;

      // Find historical cost from the latest allocation or production
      const latestAlloc = this.state.exhibitionAllocations
        .filter(a => a.exhibition_id === saleData.exhibition_id && a.product_id === it.product_id)
        .sort((a, b) => new Date(b.allocated_at).getTime() - new Date(a.allocated_at).getTime())[0];

      const historicalCost = latestAlloc ? latestAlloc.cost_per_unit : Math.round(it.selling_price * 0.5);

      const sItem: SaleItem = {
        id: nextId('sitem'),
        sale_id: saleId,
        product_id: it.product_id,
        product_name: prod.name,
        sku: prod.sku,
        quantity: it.quantity,
        cost_per_unit: historicalCost, // Recorded forever for strict financial audit!
        selling_price: it.selling_price,
        discount: itemDisc,
        total_amount: lineTotal,
      };
      saleItemsList.push(sItem);

      // Create Stock Movement record for this sale item. The balance is tracked
      // per product across lines, since the sale items are not committed to
      // state until the loop finishes.
      const balanceBefore =
        exhBalances.get(it.product_id) ?? this.getExhibitionStock(saleData.exhibition_id, it.product_id);
      const remainingExhStock = balanceBefore - it.quantity;
      exhBalances.set(it.product_id, remainingExhStock);
      this.state.stockMovements.push({
        id: nextId('mv_sale'),
        product_id: it.product_id,
        product_name: prod.name,
        sku: prod.sku,
        exhibition_id: saleData.exhibition_id,
        exhibition_name: exh.name,
        movement_type: 'SALE',
        quantity_in: 0,
        quantity_out: it.quantity,
        balance: remainingExhStock,
        reference_type: 'SALE',
        reference_id: saleId,
        movement_date: new Date().toISOString(),
        created_by: userId,
        created_by_name: userName,
        notes: `Sold via Invoice ${invoiceNum}`,
      });
    }

    const finalAmount = Math.max(0, subtotal - orderDiscount);

    // Resolve the tender split. A MIXED sale uses the supplied cash/UPI/card
    // amounts (any shortfall falls to cash so the buckets always add up to the
    // invoice); every other mode puts the whole total in its own bucket.
    let cashPaid = 0;
    let upiPaid = 0;
    let cardPaid = 0;
    if (paymentMode === 'MIXED') {
      cashPaid = Math.max(0, saleData.cash_amount || 0);
      upiPaid = Math.max(0, saleData.upi_amount || 0);
      cardPaid = Math.max(0, saleData.card_amount || 0);
      const declared = cashPaid + upiPaid + cardPaid;
      if (declared !== finalAmount) {
        cashPaid = Math.max(0, finalAmount - upiPaid - cardPaid);
      }
    } else if (paymentMode === 'CASH') {
      cashPaid = finalAmount;
    } else if (paymentMode === 'CARD') {
      cardPaid = finalAmount;
    } else if (paymentMode === 'UPI') {
      upiPaid = finalAmount;
    }

    const sale: Sale = {
      id: saleId,
      exhibition_id: saleData.exhibition_id,
      exhibition_name: exh.name,
      user_id: userId,
      user_name: userName,
      created_by: userId,
      created_by_name: userName,
      invoice_no: invoiceNum,
      sale_date: new Date().toISOString(),
      customer_name: saleData.customer_name || 'Walk-in Guest',
      customer_mobile: customerMobile,
      customer_phone: customerMobile,
      payment_mode: paymentMode,
      payment_method: paymentMode,
      payment_status: 'PAID',
      subtotal,
      discount: orderDiscount,
      discount_amount: orderDiscount,
      total_amount: finalAmount,
      cash_amount: cashPaid,
      upi_amount: upiPaid,
      card_amount: cardPaid,
      notes: saleData.notes || '',
      created_at: new Date().toISOString(),
      items: saleItemsList,
    };

    this.state.sales.unshift(sale);
    this.state.saleItems.push(...saleItemsList);
    this.saveToStorage();

    return sale;
  }

  // EXPENSES
  public addExpense(data: Omit<Expense, 'id' | 'created_at'>): Expense {
    const expenseType = data.expense_type || (data.category as any) || 'Other';
    const newExp: Expense = {
      ...data,
      expense_type: expenseType,
      category: data.category || expenseType,
      id: nextId('exp'),
      created_at: new Date().toISOString(),
    };
    this.state.expenses.unshift(newExp);
    this.saveToStorage();
    return newExp;
  }

  public deleteExpense(id: string): boolean {
    this.state.expenses = this.state.expenses.filter(e => e.id !== id);
    this.saveToStorage();
    return true;
  }

  // DAY CLOSING DRAFT & RECONCILIATION

  /**
   * Single owner of a day's reconciliation figures, shared by the draft and the
   * confirmation so the two can never report different numbers.
   *
   * Every sale lands in a bucket via its recorded tender split, so a MIXED or
   * bank-transfer sale is counted instead of being dropped.
   */
  private computeDayFigures(exhibitionId: string, closingDate: string) {
    const daySales = this.state.sales.filter(
      s => s.exhibition_id === exhibitionId && s.sale_date.startsWith(closingDate)
    );

    let cashAmount = 0;
    let upiAmount = 0;
    let cardAmount = 0;
    let otherAmount = 0;

    for (const s of daySales) {
      const mode = s.payment_mode || (s as any).payment_method;
      const hasSplit =
        s.cash_amount !== undefined || s.upi_amount !== undefined || s.card_amount !== undefined;
      const split = hasSplit
        ? {
            cash: s.cash_amount || 0,
            upi: s.upi_amount || 0,
            card: s.card_amount || 0,
          }
        : {
            // Sales recorded before the tender split existed.
            cash: mode === 'CASH' ? s.total_amount : 0,
            upi: mode === 'UPI' ? s.total_amount : 0,
            card: mode === 'CARD' ? s.total_amount : 0,
          };

      cashAmount += split.cash;
      upiAmount += split.upi;
      cardAmount += split.card;
      otherAmount += s.total_amount - split.cash - split.upi - split.card;
    }

    const expectedSalesTotal = cashAmount + upiAmount + cardAmount + otherAmount;

    const dayExpenses = this.state.expenses.filter(
      e => e.exhibition_id === exhibitionId && e.expense_date.startsWith(closingDate)
    );
    const cashExpenses = dayExpenses
      .filter(e => (e.payment_method || (e as any).payment_mode) === 'CASH')
      .reduce((sum, e) => sum + e.amount, 0);
    const upiExpenses = dayExpenses
      .filter(e => (e.payment_method || (e as any).payment_mode) !== 'CASH')
      .reduce((sum, e) => sum + e.amount, 0);

    const expectedCashInHand = Math.max(0, cashAmount - cashExpenses);

    const closingStockValue = this.getExhibitionInventoryList(exhibitionId).reduce(
      (sum, item) => sum + item.available * item.product.default_selling_price,
      0
    );

    return {
      cashAmount,
      upiAmount,
      cardAmount,
      otherAmount,
      expectedSalesTotal,
      cashExpenses,
      upiExpenses,
      totalExpenses: cashExpenses + upiExpenses,
      expectedCashInHand,
      closingStockValue,
    };
  }
  public generateDraftDayClosing(closingDate: string, exhibitionId: string): DayClosing {
    const exh = this.state.exhibitions.find(e => e.id === exhibitionId);
    const existing = this.state.dayClosings.find(
      c => c.exhibition_id === exhibitionId && (c.closing_date === closingDate || c.date === closingDate)
    );

    if (existing) {
      return {
        ...existing,
        date: existing.date || existing.closing_date,
        total_sales: existing.total_sales ?? existing.sales_amount,
        cash_sales: existing.cash_sales ?? existing.cash_amount,
        upi_sales: existing.upi_sales ?? existing.upi_amount,
        card_sales: existing.card_sales ?? existing.card_amount,
        other_sales: existing.other_sales ?? existing.other_amount ?? 0,
        expected_cash_in_hand: existing.expected_cash_in_hand ?? existing.expected_amount,
        actual_cash_in_hand: existing.actual_cash_in_hand ?? existing.actual_amount,
        cash_difference: existing.cash_difference ?? existing.difference_amount,
        status: existing.status || 'CONFIRMED',
      };
    }

    const {
      cashAmount,
      upiAmount,
      cardAmount,
      otherAmount,
      expectedSalesTotal,
      cashExpenses,
      upiExpenses,
      totalExpenses,
      expectedCashInHand,
      closingStockValue,
    } = this.computeDayFigures(exhibitionId, closingDate);

    return {
      id: nextId('dc_draft'),
      exhibition_id: exhibitionId,
      exhibition_name: exh?.name || 'Exhibition Stall',
      closing_date: closingDate,
      date: closingDate,
      opening_stock_value: closingStockValue + expectedSalesTotal * 0.7,
      sales_amount: expectedSalesTotal,
      total_sales: expectedSalesTotal,
      cash_amount: cashAmount,
      cash_sales: cashAmount,
      upi_amount: upiAmount,
      upi_sales: upiAmount,
      card_amount: cardAmount,
      card_sales: cardAmount,
      other_amount: otherAmount,
      other_sales: otherAmount,
      total_expenses: totalExpenses,
      cash_expenses: cashExpenses,
      upi_expenses: upiExpenses,
      expected_amount: expectedCashInHand,
      expected_cash_in_hand: expectedCashInHand,
      actual_amount: expectedCashInHand,
      actual_cash_in_hand: expectedCashInHand,
      difference_amount: 0,
      cash_difference: 0,
      closing_stock_value: closingStockValue,
      status: 'DRAFT',
      closed_by: '',
      closed_at: '',
    };
  }

  // DAY CLOSING CONFIRMATION
  public confirmDayClosing(
    arg1:
      | string
      | {
          exhibition_id: string;
          closing_date: string;
          actual_cash: number;
          actual_upi?: number;
          actual_card?: number;
          notes?: string;
          user_id: string;
          user_name: string;
        },
    arg2?: string,
    arg3?: number,
    arg4?: string,
    arg5?: string,
    arg6?: string
  ): DayClosing {
    let exhibition_id: string;
    let closing_date: string;
    let actual_cash: number;
    let actual_upi = 0;
    let actual_card = 0;
    let user_id: string;
    let user_name: string;
    let notes: string | undefined;

    if (typeof arg1 === 'object') {
      exhibition_id = arg1.exhibition_id;
      closing_date = arg1.closing_date;
      actual_cash = arg1.actual_cash;
      actual_upi = arg1.actual_upi || 0;
      actual_card = arg1.actual_card || 0;
      user_id = arg1.user_id;
      user_name = arg1.user_name;
      notes = arg1.notes;
    } else {
      closing_date = arg1;
      exhibition_id = arg2!;
      actual_cash = arg3!;
      user_id = arg4 || 'usr_staff';
      user_name = arg5 || 'Cashier';
      notes = arg6;
    }

    const exh = this.state.exhibitions.find(e => e.id === exhibition_id);
    if (!exh) throw new Error('Exhibition not found');

    const {
      cashAmount,
      upiAmount,
      cardAmount,
      otherAmount,
      expectedSalesTotal,
      cashExpenses,
      upiExpenses,
      expectedCashInHand,
      closingStockValue,
    } = this.computeDayFigures(exhibition_id, closing_date);

    const diff = actual_cash - expectedCashInHand;

    const closing: DayClosing = {
      id: nextId('dc'),
      exhibition_id,
      exhibition_name: exh.name,
      closing_date,
      date: closing_date,
      opening_stock_value: closingStockValue + expectedSalesTotal * 0.7,
      sales_amount: expectedSalesTotal,
      total_sales: expectedSalesTotal,
      cash_amount: cashAmount,
      cash_sales: cashAmount,
      upi_amount: upiAmount,
      upi_sales: upiAmount,
      card_amount: cardAmount,
      card_sales: cardAmount,
      other_amount: otherAmount,
      other_sales: otherAmount,
      total_expenses: cashExpenses + upiExpenses,
      cash_expenses: cashExpenses,
      upi_expenses: upiExpenses,
      expected_amount: expectedCashInHand,
      expected_cash_in_hand: expectedCashInHand,
      actual_amount: actual_cash,
      actual_cash_in_hand: actual_cash,
      difference_amount: diff,
      cash_difference: diff,
      closing_stock_value: closingStockValue,
      notes,
      status: 'CONFIRMED',
      confirmed_by: user_id,
      confirmed_by_name: user_name,
      closed_by: user_id,
      closed_by_name: user_name,
      closed_at: new Date().toISOString(),
    };

    // Remove any previous record for the same day/exhibition to avoid duplicate
    this.state.dayClosings = this.state.dayClosings.filter(
      c => !(c.exhibition_id === exhibition_id && (c.closing_date === closing_date || c.date === closing_date))
    );
    this.state.dayClosings.unshift(closing);
    this.saveToStorage();
    return closing;
  }

  // USERS
  // ===================== CREDENTIALS =====================

  /**
   * Gives every account without stored credentials the initial setup password,
   * flagged so it must be changed at first sign-in. Runs once per load; a new
   * install would otherwise have no way to sign in at all.
   */
  public async ensureInitialCredentials(): Promise<void> {
    const needsSetup = this.state.users.filter(u => !u.password_hash && !u.password);
    if (needsSetup.length === 0) return;

    for (const user of needsSetup) {
      const record = await hashPassword(INITIAL_ADMIN_PASSWORD);
      user.password_hash = record.password_hash;
      user.password_salt = record.password_salt;
      user.must_change_password = true;
    }
    this.saveToStorage();
  }

  /** Sets (or resets) an account password and clears the change requirement. */
  public async setUserPassword(userId: string, password: string): Promise<void> {
    const user = this.state.users.find(u => u.id === userId);
    if (!user) throw new Error('Account not found.');

    const record = await hashPassword(password);
    user.password_hash = record.password_hash;
    user.password_salt = record.password_salt;
    user.must_change_password = false;
    // Any password stored in the clear by an older version is discarded here.
    delete user.password;
    user.updated_at = new Date().toISOString();
    this.saveToStorage();
  }

  /** Marks an account as needing a new password at next sign-in. */
  public async resetUserPassword(userId: string, temporaryPassword: string): Promise<void> {
    await this.setUserPassword(userId, temporaryPassword);
    const user = this.state.users.find(u => u.id === userId)!;
    user.must_change_password = true;
    this.saveToStorage();
  }

  /**
   * Verifies a sign-in. Returns the account only when the password matches.
   *
   * Accounts created before hashing existed still hold a readable password;
   * those are checked once and immediately upgraded to a hash.
   */
  public async verifyCredentials(identifier: string, password: string): Promise<User | null> {
    const query = identifier.trim().toLowerCase();
    const user = this.state.users.find(
      u => u.email.toLowerCase() === query || (u.mobile && u.mobile === query)
    );
    if (!user) return null;

    if (user.password_hash) {
      const ok = await verifyPassword(password, {
        password_hash: user.password_hash,
        password_salt: user.password_salt,
      });
      return ok ? { ...user } : null;
    }

    if (user.password) {
      if (user.password !== password) return null;
      const record = await hashPassword(password);
      user.password_hash = record.password_hash;
      user.password_salt = record.password_salt;
      delete user.password;
      this.saveToStorage();
      return { ...user };
    }

    return null;
  }

  public addUser(data: Omit<User, 'id' | 'created_at' | 'updated_at'>): User {
    const newUser: User = {
      ...data,
      id: nextId('usr'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.state.users.push(newUser);
    this.saveToStorage();
    return newUser;
  }

  public updateUser(id: string, data: Partial<User>): User | null {
    const user = this.state.users.find(u => u.id === id);
    if (!user) return null;
    Object.assign(user, data, { updated_at: new Date().toISOString() });
    this.saveToStorage();
    return user;
  }

  // ===================== FINANCIAL & EXHIBITION ANALYTICS =====================

  public getExhibitionAnalytics(exhibitionId: string) {
    const exh = this.state.exhibitions.find(e => e.id === exhibitionId);
    if (!exh) return null;

    const allocations = this.state.exhibitionAllocations.filter(a => a.exhibition_id === exhibitionId);
    const totalAllocated = allocations.reduce((sum, a) => sum + a.quantity_allocated, 0);

    const sales = this.state.sales.filter(s => s.exhibition_id === exhibitionId);
    const saleIds = sales.map(s => s.id);
    const saleItems = this.state.saleItems.filter(i => saleIds.includes(i.sale_id));

    const totalSold = saleItems.reduce((sum, i) => sum + i.quantity, 0);
    const totalReturned = [...this.getExhibitionPositions(exhibitionId).values()].reduce(
      (sum, pos) => sum + pos.returned,
      0
    );
    const totalRemaining = Math.max(0, totalAllocated - totalSold - totalReturned);

    const salesRevenue = sales.reduce((sum, s) => sum + s.total_amount, 0);

    // CRITICAL: Sold Product Cost = SUM(quantity * historical cost_per_unit)
    const soldProductCost = saleItems.reduce((sum, i) => sum + (i.quantity * i.cost_per_unit), 0);

    const grossProfit = salesRevenue - soldProductCost;

    const expenses = this.state.expenses.filter(e => e.exhibition_id === exhibitionId);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    const netProfit = grossProfit - totalExpenses;
    const netProfitMargin = salesRevenue > 0 ? (netProfit / salesRevenue) * 100 : 0;

    return {
      exhibition: exh,
      productsAllocated: totalAllocated,
      productsSold: totalSold,
      productsReturned: totalReturned,
      productsRemaining: totalRemaining,
      salesRevenue,
      soldProductCost,
      costOfGoodsSold: soldProductCost,
      grossProfit,
      exhibitionExpenses: totalExpenses,
      netProfit,
      netProfitMargin: Number(netProfitMargin.toFixed(2)),
      netMargin: Number(netProfitMargin.toFixed(2)),
      salesCount: sales.length,
    };
  }

  public getOverallBusinessKPIs() {
    const totalProducts = this.state.products.length;
    const currentStock = this.state.products.reduce((sum, p) => sum + this.getMainStock(p.id), 0);
    const activeExhibitions = this.state.exhibitions.filter(e => e.status === 'ACTIVE').length;

    const todayStr = new Date().toISOString().split('T')[0];
    const todaySales = this.state.sales
      .filter(s => s.sale_date.startsWith(todayStr))
      .reduce((sum, s) => sum + s.total_amount, 0);

    // Current month sales
    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthlySalesList = this.state.sales.filter(s => s.sale_date.startsWith(currentMonth));
    const monthlySales = monthlySalesList.reduce((sum, s) => sum + s.total_amount, 0);

    // Monthly Profit: Sales - COGS - Expenses
    const monthlySaleIds = monthlySalesList.map(s => s.id);
    const monthlySaleItems = this.state.saleItems.filter(i => monthlySaleIds.includes(i.sale_id));
    const monthlyCOGS = monthlySaleItems.reduce((sum, i) => sum + (i.quantity * i.cost_per_unit), 0);
    const monthlyExpenses = this.state.expenses
      .filter(e => e.expense_date.startsWith(currentMonth))
      .reduce((sum, e) => sum + e.amount, 0);

    const monthlyProfit = monthlySales - monthlyCOGS - monthlyExpenses;

    return {
      totalProducts,
      currentStock,
      activeExhibitions,
      todaySales,
      monthlySales,
      monthlyProfit,
    };
  }
}

export const db = new DatabaseService();
