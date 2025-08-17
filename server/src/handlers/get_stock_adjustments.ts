import { db } from '../db';
import { stockAdjustmentsTable, productsTable } from '../db/schema';
import { type StockAdjustment } from '../schema';
import { desc, eq, sql } from 'drizzle-orm';

/**
 * Retrieves all stock adjustment records for inventory audit trail.
 * Returns adjustments with product information and adjustment details.
 */
export async function getStockAdjustments(): Promise<StockAdjustment[]> {
  try {
    // Join with products table to get product information
    const results = await db.select({
      id: stockAdjustmentsTable.id,
      product_id: stockAdjustmentsTable.product_id,
      adjustment_type: stockAdjustmentsTable.adjustment_type,
      quantity_change: stockAdjustmentsTable.quantity_change,
      reason: stockAdjustmentsTable.reason,
      adjusted_by: stockAdjustmentsTable.adjusted_by,
      adjustment_date: stockAdjustmentsTable.adjustment_date,
      created_at: stockAdjustmentsTable.created_at,
    })
    .from(stockAdjustmentsTable)
    .innerJoin(productsTable, eq(stockAdjustmentsTable.product_id, productsTable.id))
    .orderBy(desc(stockAdjustmentsTable.adjustment_date))
    .execute();

    // Convert data to match StockAdjustment schema
    return results.map(result => ({
      id: result.id,
      product_id: result.product_id,
      adjustment_type: result.adjustment_type,
      quantity_change: result.quantity_change,
      reason: result.reason,
      adjusted_by: result.adjusted_by,
      adjustment_date: result.adjustment_date,
      created_at: result.created_at
    }));
  } catch (error) {
    console.error('Stock adjustments retrieval failed:', error);
    throw error;
  }
}