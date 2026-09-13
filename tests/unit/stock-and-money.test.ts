import assert from 'node:assert/strict';
import { db } from '../../src/lib/db';
import { buildBusiness, createProduct, produce, today } from '../helpers/fixture';

/**
 * Regression tests for the stock ledger and money reconciliation.
 *
 * The database ships empty, so each case builds the records it needs and
 * starts from a clean state, keeping the cases independent.
 */

console.log('🧾 Starting Divine Foods stock & money reconciliation tests...\n');

/** A stall holding 100 units of each product, with some already sold. */
function freshFixture(soldPerProduct = 95) {
  const { exhibition, products } = buildBusiness({
    productCount: 2,
    producedPerProduct: 200,
    allocatedPerProduct: 100,
    soldPerProduct,
  });
  return { exhibition, products };
}

// 1. Returning stock moves units, it must not create them.
console.log('Test 1: returning stock from an exhibition conserves total units');
{
  const { exhibition } = freshFixture();
  const stallRow = db.getExhibitionInventoryList(exhibition.id).find(i => i.available > 0)!;
  const product = stallRow.product;

  const before = db.getMainStock(product.id) + db.getExhibitionStock(exhibition.id, product.id);
  const returnQty = stallRow.available;

  db.returnStockFromExhibition(
    exhibition.id,
    [{ product_id: product.id, quantity: returnQty }],
    'usr_admin',
    'Admin'
  );

  const after = db.getMainStock(product.id) + db.getExhibitionStock(exhibition.id, product.id);
  assert.equal(after, before, 'total units across warehouse and stall must be unchanged by a return');
  assert.equal(
    db.getExhibitionStock(exhibition.id, product.id),
    0,
    'returned units must no longer count as stall stock'
  );
  console.log('  ✔ Return conserves inventory and clears stall availability');
}

// 2. A return must not be sellable at the stall afterwards.
console.log('Test 2: returned units cannot be sold at the stall');
{
  const { exhibition } = freshFixture();
  const stallRow = db.getExhibitionInventoryList(exhibition.id).find(i => i.available > 0)!;
  const product = stallRow.product;

  db.returnStockFromExhibition(
    exhibition.id,
    [{ product_id: product.id, quantity: stallRow.available }],
    'usr_admin',
    'Admin'
  );

  assert.throws(
    () =>
      db.createSale({ exhibition_id: exhibition.id, payment_mode: 'CASH' }, [
        { product_id: product.id, quantity: 1, selling_price: product.default_selling_price },
      ]),
    /Insufficient stock/,
    'selling returned units must be rejected'
  );
  console.log('  ✔ Stall sale of returned units rejected');
}

// 3. Repeated lines for one product must be summed before the stock check.
console.log('Test 3: repeated cart lines cannot oversell a product');
{
  const { exhibition } = freshFixture();
  const stallRow = db.getExhibitionInventoryList(exhibition.id).find(i => i.available >= 2)!;
  const product = stallRow.product;
  const available = stallRow.available;

  assert.throws(
    () =>
      db.createSale({ exhibition_id: exhibition.id, payment_mode: 'CASH' }, [
        { product_id: product.id, quantity: available, selling_price: product.default_selling_price },
        { product_id: product.id, quantity: available, selling_price: product.default_selling_price },
      ]),
    /Insufficient stock/,
    'two lines that together exceed available stock must be rejected'
  );

  assert.equal(
    db.getExhibitionStock(exhibition.id, product.id),
    available,
    'a rejected sale must leave stall stock untouched'
  );

  // The same total split across lines is fine when it fits.
  const sale = db.createSale({ exhibition_id: exhibition.id, payment_mode: 'CASH' }, [
    { product_id: product.id, quantity: 1, selling_price: product.default_selling_price },
    { product_id: product.id, quantity: 1, selling_price: product.default_selling_price },
  ]);
  assert.ok(sale.invoice_no, 'a sale within available stock must succeed');
  assert.equal(
    db.getExhibitionStock(exhibition.id, product.id),
    available - 2,
    'both lines must be deducted from stall stock'
  );
  console.log('  ✔ Per-product quantities aggregated before the stock check');
}

// 4. Invoice numbers identify a sale, so they must never repeat.
console.log('Test 4: invoice numbers stay unique as sales accumulate');
{
  const { exhibition } = freshFixture();
  const product = db.getExhibitionInventoryList(exhibition.id)[0].product;
  produce(product, 60);
  db.allocateProductToExhibition(exhibition.id, product.id, 60, 'usr_admin', 'Admin');

  const issued = new Set(db.getSales().map(s => s.invoice_no));
  const seededCount = issued.size;

  for (let i = 0; i < 30; i++) {
    const sale = db.createSale({ exhibition_id: exhibition.id, payment_mode: 'CASH' }, [
      { product_id: product.id, quantity: 1, selling_price: product.default_selling_price },
    ]);
    assert.ok(!issued.has(sale.invoice_no), `invoice ${sale.invoice_no} was issued twice`);
    issued.add(sale.invoice_no);
  }

  assert.equal(issued.size, seededCount + 30, 'every sale must carry its own invoice number');
  console.log(`  ✔ ${issued.size} invoice numbers, no duplicates`);
}

// 5. A product may be allocated to the same stall more than once (a restock).
console.log('Test 5: stall availability counts every allocation batch');
{
  const { exhibition } = freshFixture(100); // everything allocated is sold
  const soldOut = db.getExhibitionInventoryList(exhibition.id).find(i => i.available === 0)!;
  const product = soldOut.product;

  assert.equal(db.getExhibitionStock(exhibition.id, product.id), 0, 'product should start sold out');

  produce(product, 50);
  db.allocateProductToExhibition(exhibition.id, product.id, 50, 'usr_admin', 'Admin');

  assert.equal(
    db.getExhibitionStock(exhibition.id, product.id),
    50,
    'a second allocation must be sellable at the stall'
  );

  const sale = db.createSale({ exhibition_id: exhibition.id, payment_mode: 'CASH' }, [
    { product_id: product.id, quantity: 50, selling_price: product.default_selling_price },
  ]);
  assert.ok(sale.invoice_no, 'the whole restocked quantity must be sellable');
  assert.equal(db.getExhibitionStock(exhibition.id, product.id), 0, 'stall stock must be drained');
  console.log('  ✔ Restocked units are visible and sellable');
}

// 6. Sold quantities are spread over batches instead of repeated on each one.
console.log('Test 6: sold quantities are split across allocation batches');
{
  const { exhibition } = freshFixture(100); // everything allocated is sold
  const soldOut = db.getExhibitionInventoryList(exhibition.id).find(i => i.available === 0)!;
  const product = soldOut.product;
  const alreadySold = soldOut.sold;

  produce(product, 40);
  db.allocateProductToExhibition(exhibition.id, product.id, 40, 'usr_admin', 'Admin');

  const batches = db.getExhibitionAllocations(exhibition.id).filter(a => a.product_id === product.id);
  assert.ok(batches.length >= 2, 'the product should now have more than one allocation batch');

  const soldAcrossBatches = batches.reduce((sum, b) => sum + b.quantity_sold, 0);
  assert.equal(
    soldAcrossBatches,
    alreadySold,
    'batch sold figures must add up to the units actually sold, not repeat the product total'
  );
  for (const batch of batches) {
    assert.ok(
      batch.quantity_sold <= batch.quantity_allocated,
      'a batch cannot report more sold than it ever held'
    );
  }
  console.log('  ✔ Batch figures reconcile with units sold');
}

// 7. Money: a split payment must reach day closing in full.
console.log('Test 7: split and non-cash tender reach day closing');
{
  const { exhibition } = freshFixture();
  const stallRow = db.getExhibitionInventoryList(exhibition.id).find(i => i.available >= 2)!;
  const product = stallRow.product;

  const mixed = db.createSale(
    {
      exhibition_id: exhibition.id,
      payment_mode: 'MIXED',
      cash_amount: 400,
      upi_amount: 600,
    },
    [{ product_id: product.id, quantity: 1, selling_price: 1000 }]
  );
  assert.equal(mixed.total_amount, 1000);
  assert.equal(mixed.cash_amount, 400, 'cash leg must be recorded on the sale');
  assert.equal(mixed.upi_amount, 600, 'UPI leg must be recorded on the sale');

  const salesToday = db.getSales(exhibition.id).filter(s => s.sale_date.startsWith(today()));
  const rawTotal = salesToday.reduce((sum, s) => sum + s.total_amount, 0);

  const closing = db.generateDraftDayClosing(today(), exhibition.id);
  assert.equal(
    closing.total_sales,
    rawTotal,
    'day closing total must equal the day\'s sales regardless of tender'
  );
  assert.equal(
    (closing.cash_sales || 0) + (closing.upi_sales || 0) + (closing.card_sales || 0) + (closing.other_sales || 0),
    rawTotal,
    'tender buckets must add up to the day total'
  );
  assert.ok(
    (closing.cash_sales || 0) >= 400,
    'the cash leg of a split payment must reach the cash drawer figure'
  );
  console.log('  ✔ Split tender reconciles; buckets add up to the day total');
}

// 8. A rejected multi-line allocation must leave no partial writes behind.
console.log('Test 8: a rejected allocation writes nothing');
{
  const { exhibition } = freshFixture();
  const good = createProduct('Atomicity Good');
  const bad = createProduct('Atomicity Bad');

  produce(good, 10);

  const allocationsBefore = db.getExhibitionAllocations(exhibition.id).length;
  const movementsBefore = db.getStockMovements().length;
  const goodStockBefore = db.getMainStock(good.id);

  assert.throws(
    () =>
      db.allocateStockToExhibition(
        exhibition.id,
        [
          { product_id: good.id, quantity: 10, cost_per_unit: 100 },
          { product_id: bad.id, quantity: 999999, cost_per_unit: 100 },
        ],
        'usr_admin',
        'Admin'
      ),
    /Insufficient stock/,
    'an allocation asking for more than the warehouse holds must be rejected'
  );

  assert.equal(
    db.getExhibitionAllocations(exhibition.id).length,
    allocationsBefore,
    'no allocation record may survive a rejected request'
  );
  assert.equal(
    db.getStockMovements().length,
    movementsBefore,
    'no stock movement may survive a rejected request'
  );
  assert.equal(db.getMainStock(good.id), goodStockBefore, 'warehouse stock must be unchanged');
  console.log('  ✔ Rejected allocation left no partial writes');
}

// 9. The ledger must agree with the reported stall position.
console.log('Test 9: stall position agrees with the movement ledger');
{
  const { exhibition } = freshFixture();
  for (const row of db.getExhibitionInventoryList(exhibition.id)) {
    const movements = db.getStockMovements(row.product.id, exhibition.id);
    const allocated = movements
      .filter(m => m.movement_type === 'EXHIBITION_ALLOCATION')
      .reduce((sum, m) => sum + m.quantity_out, 0);
    const sold = movements
      .filter(m => m.movement_type === 'SALE')
      .reduce((sum, m) => sum + m.quantity_out, 0);
    const returned = movements
      .filter(m => m.movement_type === 'EXHIBITION_RETURN')
      .reduce((sum, m) => sum + m.quantity_in, 0);

    assert.equal(
      row.sold,
      sold,
      `sold units for ${row.product.name} must match the SALE movements`
    );
    assert.equal(
      row.returned,
      returned,
      `returned units for ${row.product.name} must match the EXHIBITION_RETURN movements`
    );
    assert.ok(
      allocated >= row.sold + row.returned,
      `${row.product.name} cannot have sold or returned more than was allocated`
    );
  }
  console.log('  ✔ Reported stall position matches the ledger');
}

// 10. Records created in the same millisecond must stay distinct.
console.log('Test 10: rapidly created records get unique ids');
{
  db.resetToDemoData();
  const created = [];
  for (let i = 0; i < 25; i++) created.push(createProduct(`Rapid Product ${i}`));

  const ids = new Set(created.map(p => p.id));
  assert.equal(ids.size, created.length, 'each product must receive its own id');

  // An id collision would make two products share a stock ledger.
  produce(created[0], 10);
  assert.equal(db.getMainStock(created[0].id), 10, 'stock must belong to one product');
  assert.equal(db.getMainStock(created[1].id), 0, 'a sibling product must not share that stock');
  console.log(`  ✔ ${ids.size} records created back to back, all ids unique`);
}

db.resetToDemoData();
console.log('\n✅ Stock ledger and money reconciliation tests passed.');
