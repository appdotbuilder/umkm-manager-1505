import { db } from '../db';
import { productsTable, saleItemsTable, salesTable } from '../db/schema';
import { type TopProductsReport } from '../schema';
import { eq, desc, sum, count, SQL } from 'drizzle-orm';

/**
 * Retrieves the best-selling products based on quantity sold and revenue.
 * Analyzes sale items to identify most popular products.
 */
export async function getTopProducts(limit: number = 10): Promise<TopProductsReport[]> {
  try {
    // Build the query step by step
    let query = db
      .select({
        product_id: productsTable.id,
        product_name: productsTable.name,
        total_quantity_sold: sum(saleItemsTable.quantity).as('total_quantity_sold'),
        total_revenue: sum(saleItemsTable.subtotal).as('total_revenue')
      })
      .from(saleItemsTable)
      .innerJoin(productsTable, eq(saleItemsTable.product_id, productsTable.id))
      .innerJoin(salesTable, eq(saleItemsTable.sale_id, salesTable.id))
      .where(eq(salesTable.payment_status, 'paid'))
      .groupBy(productsTable.id, productsTable.name)
      .orderBy(desc(sum(saleItemsTable.subtotal))) // Order by total revenue
      .limit(limit);

    const results = await query.execute();

    // Convert numeric fields back to numbers
    return results.map(result => ({
      product_id: result.product_id,
      product_name: result.product_name,
      total_quantity_sold: parseFloat(result.total_quantity_sold || '0'),
      total_revenue: parseFloat(result.total_revenue || '0')
    }));
  } catch (error) {
    console.error('Top products retrieval failed:', error);
    throw error;
  }
}