import { db } from '../db';
import { productsTable } from '../db/schema';
import { type LowStockReport } from '../schema';
import { and, eq, lte, isNull, or, asc, sql } from 'drizzle-orm';

/**
 * Retrieves products that are running low on stock.
 * Compares current stock with low_stock_threshold to identify items needing restocking.
 */
export async function getLowStockProducts(): Promise<LowStockReport[]> {
  try {
    // Query products that need restocking
    const results = await db.select()
      .from(productsTable)
      .where(
        and(
          eq(productsTable.is_service, false), // Only physical products
          or(
            // Products where stock is at or below threshold (treating null stock as 0)
            sql`COALESCE(${productsTable.stock_quantity}, 0) <= ${productsTable.low_stock_threshold}`,
            // Products with no threshold but zero stock (including null stock)
            and(
              isNull(productsTable.low_stock_threshold),
              or(
                eq(productsTable.stock_quantity, 0),
                isNull(productsTable.stock_quantity)
              )
            )
          )
        )
      )
      .orderBy(asc(productsTable.stock_quantity)) // Order by lowest stock first
      .execute();

    // Transform results to match LowStockReport schema
    return results.map(product => {
      const currentStock = product.stock_quantity || 0;
      const threshold = product.low_stock_threshold || 0;
      const stockDifference = threshold - currentStock;

      return {
        product_id: product.id,
        product_name: product.name,
        current_stock: currentStock,
        low_stock_threshold: threshold,
        stock_difference: stockDifference
      };
    });
  } catch (error) {
    console.error('Failed to retrieve low stock products:', error);
    throw error;
  }
}