import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'bank_transfer', 'credit_card', 'e_wallet', 'other']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'cancelled']);
export const adjustmentTypeEnum = pgEnum('adjustment_type', ['increase', 'decrease', 'correction']);

// Products/Services table
export const productsTable = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'), // Nullable
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  stock_quantity: integer('stock_quantity'), // Nullable for services
  is_service: boolean('is_service').notNull().default(false),
  low_stock_threshold: integer('low_stock_threshold'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Customers table
export const customersTable = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'), // Nullable
  email: text('email'), // Nullable
  address: text('address'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Sales transactions table
export const salesTable = pgTable('sales', {
  id: serial('id').primaryKey(),
  customer_id: integer('customer_id'), // Nullable - for walk-in customers
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  payment_method: paymentMethodEnum('payment_method').notNull(),
  payment_status: paymentStatusEnum('payment_status').notNull().default('paid'),
  transaction_date: timestamp('transaction_date').defaultNow().notNull(),
  notes: text('notes'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Sale items table (detailed items per transaction)
export const saleItemsTable = pgTable('sale_items', {
  id: serial('id').primaryKey(),
  sale_id: integer('sale_id').notNull(),
  product_id: integer('product_id').notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Stock adjustments table (for manual inventory adjustments)
export const stockAdjustmentsTable = pgTable('stock_adjustments', {
  id: serial('id').primaryKey(),
  product_id: integer('product_id').notNull(),
  adjustment_type: adjustmentTypeEnum('adjustment_type').notNull(),
  quantity_change: integer('quantity_change').notNull(),
  reason: text('reason').notNull(),
  adjusted_by: text('adjusted_by').notNull(), // User who made the adjustment
  adjustment_date: timestamp('adjustment_date').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const productsRelations = relations(productsTable, ({ many }) => ({
  saleItems: many(saleItemsTable),
  stockAdjustments: many(stockAdjustmentsTable),
}));

export const customersRelations = relations(customersTable, ({ many }) => ({
  sales: many(salesTable),
}));

export const salesRelations = relations(salesTable, ({ one, many }) => ({
  customer: one(customersTable, {
    fields: [salesTable.customer_id],
    references: [customersTable.id],
  }),
  saleItems: many(saleItemsTable),
}));

export const saleItemsRelations = relations(saleItemsTable, ({ one }) => ({
  sale: one(salesTable, {
    fields: [saleItemsTable.sale_id],
    references: [salesTable.id],
  }),
  product: one(productsTable, {
    fields: [saleItemsTable.product_id],
    references: [productsTable.id],
  }),
}));

export const stockAdjustmentsRelations = relations(stockAdjustmentsTable, ({ one }) => ({
  product: one(productsTable, {
    fields: [stockAdjustmentsTable.product_id],
    references: [productsTable.id],
  }),
}));

// TypeScript types for table schemas
export type Product = typeof productsTable.$inferSelect;
export type NewProduct = typeof productsTable.$inferInsert;
export type Customer = typeof customersTable.$inferSelect;
export type NewCustomer = typeof customersTable.$inferInsert;
export type Sale = typeof salesTable.$inferSelect;
export type NewSale = typeof salesTable.$inferInsert;
export type SaleItem = typeof saleItemsTable.$inferSelect;
export type NewSaleItem = typeof saleItemsTable.$inferInsert;
export type StockAdjustment = typeof stockAdjustmentsTable.$inferSelect;
export type NewStockAdjustment = typeof stockAdjustmentsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  products: productsTable,
  customers: customersTable,
  sales: salesTable,
  saleItems: saleItemsTable,
  stockAdjustments: stockAdjustmentsTable,
};