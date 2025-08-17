import { z } from 'zod';

// Product/Service schema
export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  stock_quantity: z.number().int().nullable(), // Nullable for services
  is_service: z.boolean(),
  low_stock_threshold: z.number().int().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Product = z.infer<typeof productSchema>;

export const createProductInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  price: z.number().positive(),
  stock_quantity: z.number().int().nonnegative().nullable(),
  is_service: z.boolean(),
  low_stock_threshold: z.number().int().nonnegative().nullable()
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

export const updateProductInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  price: z.number().positive().optional(),
  stock_quantity: z.number().int().nonnegative().nullable().optional(),
  is_service: z.boolean().optional(),
  low_stock_threshold: z.number().int().nonnegative().nullable().optional()
});

export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

// Customer schema
export const customerSchema = z.object({
  id: z.number(),
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Customer = z.infer<typeof customerSchema>;

export const createCustomerInputSchema = z.object({
  name: z.string().min(1),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  address: z.string().nullable()
});

export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;

export const updateCustomerInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().nullable().optional()
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerInputSchema>;

// Payment method enum
export const paymentMethodEnum = z.enum(['cash', 'bank_transfer', 'credit_card', 'e_wallet', 'other']);
export type PaymentMethod = z.infer<typeof paymentMethodEnum>;

// Sales transaction schema
export const saleSchema = z.object({
  id: z.number(),
  customer_id: z.number().nullable(),
  total_amount: z.number(),
  payment_method: paymentMethodEnum,
  payment_status: z.enum(['pending', 'paid', 'cancelled']),
  transaction_date: z.coerce.date(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Sale = z.infer<typeof saleSchema>;

export const createSaleInputSchema = z.object({
  customer_id: z.number().nullable(),
  total_amount: z.number().positive(),
  payment_method: paymentMethodEnum,
  payment_status: z.enum(['pending', 'paid', 'cancelled']).default('paid'),
  transaction_date: z.coerce.date().default(new Date()),
  notes: z.string().nullable(),
  items: z.array(z.object({
    product_id: z.number(),
    quantity: z.number().positive(),
    unit_price: z.number().positive(),
    subtotal: z.number().positive()
  }))
});

export type CreateSaleInput = z.infer<typeof createSaleInputSchema>;

// Sale item schema
export const saleItemSchema = z.object({
  id: z.number(),
  sale_id: z.number(),
  product_id: z.number(),
  quantity: z.number(),
  unit_price: z.number(),
  subtotal: z.number(),
  created_at: z.coerce.date()
});

export type SaleItem = z.infer<typeof saleItemSchema>;

// Stock adjustment schema
export const stockAdjustmentSchema = z.object({
  id: z.number(),
  product_id: z.number(),
  adjustment_type: z.enum(['increase', 'decrease', 'correction']),
  quantity_change: z.number(),
  reason: z.string(),
  adjusted_by: z.string(), // User who made the adjustment
  adjustment_date: z.coerce.date(),
  created_at: z.coerce.date()
});

export type StockAdjustment = z.infer<typeof stockAdjustmentSchema>;

export const createStockAdjustmentInputSchema = z.object({
  product_id: z.number(),
  adjustment_type: z.enum(['increase', 'decrease', 'correction']),
  quantity_change: z.number(),
  reason: z.string().min(1),
  adjusted_by: z.string().min(1),
  adjustment_date: z.coerce.date().default(new Date())
});

export type CreateStockAdjustmentInput = z.infer<typeof createStockAdjustmentInputSchema>;

// Report schemas
export const salesReportInputSchema = z.object({
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  period: z.enum(['daily', 'monthly']).optional()
});

export type SalesReportInput = z.infer<typeof salesReportInputSchema>;

export const salesReportSchema = z.object({
  period: z.string(),
  total_sales: z.number(),
  total_transactions: z.number(),
  average_transaction: z.number()
});

export type SalesReport = z.infer<typeof salesReportSchema>;

export const topProductsReportSchema = z.object({
  product_id: z.number(),
  product_name: z.string(),
  total_quantity_sold: z.number(),
  total_revenue: z.number()
});

export type TopProductsReport = z.infer<typeof topProductsReportSchema>;

export const topCustomersReportSchema = z.object({
  customer_id: z.number(),
  customer_name: z.string(),
  total_purchases: z.number(),
  total_spent: z.number()
});

export type TopCustomersReport = z.infer<typeof topCustomersReportSchema>;

export const lowStockReportSchema = z.object({
  product_id: z.number(),
  product_name: z.string(),
  current_stock: z.number(),
  low_stock_threshold: z.number(),
  stock_difference: z.number()
});

export type LowStockReport = z.infer<typeof lowStockReportSchema>;

// Customer purchase history
export const customerPurchaseHistorySchema = z.object({
  customer_id: z.number(),
  sales: z.array(saleSchema)
});

export type CustomerPurchaseHistory = z.infer<typeof customerPurchaseHistorySchema>;