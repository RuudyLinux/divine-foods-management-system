import { db } from '../../src/lib/db';
import { Exhibition, Product } from '../../src/types';

/**
 * Test data builders.
 *
 * The application ships with an empty database, so tests create the records
 * they need through the public API. Going through the real entry points means
 * the fixtures obey the same rules as production data.
 */

export const today = () => new Date().toISOString().split('T')[0];

let counter = 0;
const uniqueSuffix = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

export interface BusinessFixture {
  exhibition: Exhibition;
  products: Product[];
}

/** Puts units into the main warehouse via a production batch. */
export function produce(product: Product, quantity: number, costPerUnit = 100) {
  db.createProductionBatch(
    {
      batch_no: `PB-TEST-${uniqueSuffix()}`,
      production_date: today(),
      notes: 'test batch',
      created_by: 'usr_admin',
      created_by_name: 'Admin',
    },
    [
      {
        product_id: product.id,
        quantity,
        cost_per_unit: costPerUnit,
        selling_price: product.default_selling_price,
      },
    ]
  );
}

export function createProduct(
  name: string,
  options: { sellingPrice?: number; minStockLevel?: number } = {}
): Product {
  const { sellingPrice = 250, minStockLevel = 20 } = options;

  const category = db.getCategories()[0] || db.addCategory({
    name: 'Test Category',
    description: 'Created by the test suite',
    is_active: true,
  });
  const subCategory =
    db.getSubCategories().find(sc => sc.category_id === category.id) ||
    db.addSubCategory({
      category_id: category.id,
      name: 'Test Sub Category',
      description: 'Created by the test suite',
      is_active: true,
    });

  return db.addProduct({
    category_id: category.id,
    sub_category_id: subCategory.id,
    sku: `SKU-${uniqueSuffix()}`,
    name,
    description: `${name} for testing`,
    unit: 'Pack',
    weight: 250,
    weight_unit: 'gm',
    default_selling_price: sellingPrice,
    min_stock_level: minStockLevel,
    is_active: true,
  });
}

export function createExhibition(name = 'Test Exhibition'): Exhibition {
  return db.addExhibition({
    name,
    start_date: today(),
    end_date: today(),
    venue: 'Test Venue',
    city: 'Vadodara',
    status: 'ACTIVE',
  });
}

/**
 * A running stall: products produced into the warehouse, allocated to an
 * exhibition, with `soldPerProduct` units already sold there.
 */
export function buildBusiness(
  options: {
    productCount?: number;
    producedPerProduct?: number;
    allocatedPerProduct?: number;
    soldPerProduct?: number;
  } = {}
): BusinessFixture {
  const {
    productCount = 3,
    producedPerProduct = 200,
    allocatedPerProduct = 100,
    soldPerProduct = 0,
  } = options;

  db.resetToDemoData();

  const exhibition = createExhibition();
  const products: Product[] = [];

  for (let i = 0; i < productCount; i++) {
    const product = createProduct(`Test Product ${i + 1}`, { sellingPrice: 100 * (i + 2) });
    produce(product, producedPerProduct);
    db.allocateStockToExhibition(
      exhibition.id,
      [{ product_id: product.id, quantity: allocatedPerProduct, cost_per_unit: 100 }],
      'usr_admin',
      'Admin'
    );
    products.push(product);
  }

  if (soldPerProduct > 0) {
    for (const product of products) {
      db.createSale({ exhibition_id: exhibition.id, payment_mode: 'CASH' }, [
        {
          product_id: product.id,
          quantity: soldPerProduct,
          selling_price: product.default_selling_price,
        },
      ]);
    }
  }

  // Products are re-read so callers see live stock figures.
  const refreshed = db.getProducts();
  return {
    exhibition,
    products: products.map(p => refreshed.find(r => r.id === p.id) || p),
  };
}
