import assert from 'node:assert/strict';
import { formatINR, formatDate, formatDateTime, BRAND_COLORS, BRAND_INFO } from '../../src/lib/brand';
import { db } from '../../src/lib/db';
import { buildBusiness } from '../helpers/fixture';

console.log('🧪 Starting Divine Foods Business Logic & Formatting Test Suite...\n');

// 1. Test Brand Formatters
console.log('Test 1: Currency & Date formatting');
assert.equal(formatINR(0), '₹0', 'formatINR(0) should return ₹0');
assert.equal(formatINR(1500), '₹1,500', 'formatINR(1500) should format with Indian commas');
assert.equal(formatINR(100000), '₹1,00,000', 'formatINR(100000) should follow Indian numbering system');

const testDate = '2026-09-10T10:30:00Z';
const formattedDate = formatDate(testDate);
assert.ok(formattedDate.includes('2026'), 'formatDate should include year 2026');
console.log('  ✔ Currency & Date formatters passed');

// 2. Test Brand Identity
console.log('Test 2: Brand constants and colors');
assert.equal(BRAND_INFO.name, 'Divine Foods');
assert.equal(BRAND_COLORS.darkGreen, '#1B4332');
assert.equal(BRAND_COLORS.warmOrange, '#D97706');
console.log('  ✔ Brand identity invariants validated');

// 3. A new installation starts empty, apart from the staff logins.
console.log('Test 3: A new database starts empty');
db.resetToDemoData();
assert.equal(db.getProducts().length, 0, 'a new database must hold no products');
assert.equal(db.getCategories().length, 0, 'a new database must hold no categories');
assert.equal(db.getExhibitions().length, 0, 'a new database must hold no exhibitions');
assert.equal(db.getSales().length, 0, 'a new database must hold no sales');
assert.equal(db.getExpenses().length, 0, 'a new database must hold no expenses');
assert.equal(db.getStockMovements().length, 0, 'a new database must hold no stock movements');

// The login screen authenticates against this list, so it must never be empty.
const users = db.getUsers();
assert.ok(users.length > 0, 'staff accounts must survive so the app can be signed into');
assert.ok(
  users.some(u => (u.role || '').toUpperCase() === 'ADMIN' && u.is_active),
  'an active admin account must exist'
);

// Invoices print these, so the placeholder tax id must not linger.
const settings = db.getSettings();
assert.equal(settings.gstin || '', '', 'no placeholder GSTIN may ship with the app');
console.log('  ✔ Empty database with working admin login and no placeholder tax id');

// 4. KPIs and stock levels over data entered through the app.
console.log('Test 4: KPIs and low stock alerts over entered data');
const emptyKpis = db.getOverallBusinessKPIs();
assert.equal(emptyKpis.totalProducts, 0, 'an empty database reports no products');
assert.equal(emptyKpis.currentStock, 0, 'an empty database reports no stock');
assert.equal(emptyKpis.monthlySales, 0, 'an empty database reports no sales');

const { products } = buildBusiness({
  productCount: 2,
  producedPerProduct: 150,
  allocatedPerProduct: 100,
  soldPerProduct: 10,
});

const kpis = db.getOverallBusinessKPIs();
assert.equal(kpis.totalProducts, 2, 'KPIs must count the products that were created');
assert.equal(kpis.currentStock, 100, 'warehouse stock must be production minus allocation');
assert.ok(kpis.monthlySales > 0, 'sales made this month must show in monthly sales');

const live = db.getProducts();
const lowStock = live.filter(p => p.current_stock <= p.min_stock_level);
assert.ok(Array.isArray(lowStock), 'Low stock filter must return an array');
assert.equal(lowStock.length, 0, 'stocked products must not be flagged as low');

// Draining a product to its minimum flags it.
const [first] = products;
db.allocateProductToExhibition(
  db.getExhibitions()[0].id,
  first.id,
  db.getMainStock(first.id),
  'usr_admin',
  'Admin'
);
const drained = db.getProducts().find(p => p.id === first.id)!;
assert.equal(drained.current_stock, 0, 'allocating all warehouse stock empties it');
assert.ok(
  drained.current_stock <= drained.min_stock_level,
  'an emptied product must qualify as low stock'
);
console.log('  ✔ KPIs, stock levels and low stock alerts verified');

db.resetToDemoData();
console.log('\n✅ All automated business logic tests passed successfully!');
