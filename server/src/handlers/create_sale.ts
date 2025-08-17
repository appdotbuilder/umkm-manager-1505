import { db } from '../db';
import { productsTable, salesTable, saleItemsTable, customersTable } from '../db/schema';
import { type CreateSaleInput, type Sale } from '../schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Creates a new sales transaction with multiple items.
 * Handles inventory updates for physical products and calculates totals.
 * Supports both registered customers and walk-in sales (null customer_id).
 */
export async function createSale(input: CreateSaleInput): Promise<Sale> {
  try {
    // Validate customer exists if customer_id is provided
    if (input.customer_id) {
      const customer = await db.select()
        .from(customersTable)
        .where(eq(customersTable.id, input.customer_id))
        .execute();

      if (customer.length === 0) {
        throw new Error(`Customer with ID ${input.customer_id} not found`);
      }
    }

    // Validate products exist and have sufficient stock
    const productIds = input.items.map(item => item.product_id);
    const uniqueProductIds = [...new Set(productIds)]; // Get unique product IDs
    const products = await db.select()
      .from(productsTable)
      .where(sql`${productsTable.id} = ANY(${sql`ARRAY[${sql.join(uniqueProductIds, sql`, `)}]::int[]`})`)
      .execute();

    if (products.length !== uniqueProductIds.length) {
      throw new Error('One or more products not found');
    }

    // Create product lookup map
    const productMap = new Map(products.map(p => [p.id, p]));

    // Validate stock and calculate expected total
    let calculatedTotal = 0;
    const stockUpdates = new Map<number, number>(); // product_id -> total quantity needed
    const productQuantityTotals = new Map<number, number>(); // Track total quantity per product

    // First pass: validate subtotals and aggregate quantities per product
    for (const item of input.items) {
      const product = productMap.get(item.product_id);
      if (!product) {
        throw new Error(`Product with ID ${item.product_id} not found`);
      }

      // Validate item calculations
      const expectedSubtotal = item.quantity * item.unit_price;
      if (Math.abs(item.subtotal - expectedSubtotal) > 0.01) {
        throw new Error(`Invalid subtotal for product "${product.name}". Expected: ${expectedSubtotal}, Provided: ${item.subtotal}`);
      }

      calculatedTotal += item.subtotal;

      // Aggregate quantities for same product
      const currentTotal = productQuantityTotals.get(item.product_id) || 0;
      productQuantityTotals.set(item.product_id, currentTotal + item.quantity);
    }

    // Second pass: validate stock and prepare updates
    for (const [productId, totalQuantity] of productQuantityTotals.entries()) {
      const product = productMap.get(productId)!;

      // Check stock for physical products only
      if (!product.is_service && product.stock_quantity !== null) {
        if (product.stock_quantity < totalQuantity) {
          throw new Error(`Insufficient stock for product "${product.name}". Available: ${product.stock_quantity}, Required: ${totalQuantity}`);
        }
        
        // Prepare stock update with aggregated quantity
        stockUpdates.set(productId, product.stock_quantity - totalQuantity);
      }
    }

    // Validate total amount
    if (Math.abs(input.total_amount - calculatedTotal) > 0.01) {
      throw new Error(`Total amount mismatch. Expected: ${calculatedTotal}, Provided: ${input.total_amount}`);
    }

    // Start transaction to create sale and update inventory
    const result = await db.transaction(async (tx) => {
      // Create the sale record
      const saleResult = await tx.insert(salesTable)
        .values({
          customer_id: input.customer_id,
          total_amount: input.total_amount.toString(),
          payment_method: input.payment_method,
          payment_status: input.payment_status,
          transaction_date: input.transaction_date,
          notes: input.notes
        })
        .returning()
        .execute();

      const sale = saleResult[0];

      // Create sale items
      const saleItemsValues = input.items.map(item => ({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity.toString(),
        unit_price: item.unit_price.toString(),
        subtotal: item.subtotal.toString()
      }));

      await tx.insert(saleItemsTable)
        .values(saleItemsValues)
        .execute();

      // Update stock for physical products
      for (const [productId, newQuantity] of stockUpdates.entries()) {
        await tx.update(productsTable)
          .set({ 
            stock_quantity: newQuantity,
            updated_at: new Date()
          })
          .where(eq(productsTable.id, productId))
          .execute();
      }

      return sale;
    });

    // Convert numeric fields back to numbers before returning
    return {
      ...result,
      total_amount: parseFloat(result.total_amount)
    };

  } catch (error) {
    console.error('Sale creation failed:', error);
    throw error;
  }
}