import { db } from '../db';
import { productsTable, stockAdjustmentsTable } from '../db/schema';
import { type CreateStockAdjustmentInput, type StockAdjustment } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Creates a manual stock adjustment record and updates product inventory.
 * Used for inventory corrections, restocking, or handling damaged/lost items.
 */
export async function createStockAdjustment(input: CreateStockAdjustmentInput): Promise<StockAdjustment> {
  try {
    // First, validate that the product exists and is not a service
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.product_id))
      .execute();

    if (products.length === 0) {
      throw new Error('Product not found');
    }

    const product = products[0];

    if (product.is_service) {
      throw new Error('Cannot adjust stock for services');
    }

    // Calculate new stock quantity
    const currentStock = product.stock_quantity || 0;
    let newStock = currentStock;

    switch (input.adjustment_type) {
      case 'increase':
        newStock = currentStock + input.quantity_change;
        break;
      case 'decrease':
        newStock = currentStock - input.quantity_change;
        if (newStock < 0) {
          throw new Error('Stock adjustment would result in negative stock');
        }
        break;
      case 'correction':
        newStock = input.quantity_change; // Set to exact quantity
        if (newStock < 0) {
          throw new Error('Stock correction cannot result in negative stock');
        }
        break;
    }

    // Create the stock adjustment record
    const adjustmentResult = await db.insert(stockAdjustmentsTable)
      .values({
        product_id: input.product_id,
        adjustment_type: input.adjustment_type,
        quantity_change: input.quantity_change,
        reason: input.reason,
        adjusted_by: input.adjusted_by,
        adjustment_date: input.adjustment_date
      })
      .returning()
      .execute();

    // Update the product's stock quantity and updated_at timestamp
    await db.update(productsTable)
      .set({
        stock_quantity: newStock,
        updated_at: new Date()
      })
      .where(eq(productsTable.id, input.product_id))
      .execute();

    // Return the created stock adjustment
    const adjustment = adjustmentResult[0];
    return {
      ...adjustment,
      quantity_change: adjustment.quantity_change
    };
  } catch (error) {
    console.error('Stock adjustment creation failed:', error);
    throw error;
  }
}