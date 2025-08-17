import { db } from '../db';
import { salesTable, customersTable } from '../db/schema';
import { type TopCustomersReport } from '../schema';
import { eq, isNotNull, sql, desc } from 'drizzle-orm';

/**
 * Retrieves the most valuable customers based on purchase frequency and total spending.
 * Analyzes sales data to identify best customers for loyalty programs.
 */
export async function getTopCustomers(limit: number = 10): Promise<TopCustomersReport[]> {
  try {
    const results = await db
      .select({
        customer_id: customersTable.id,
        customer_name: customersTable.name,
        total_purchases: sql<number>`count(${salesTable.id})::int`.as('total_purchases'),
        total_spent: sql<string>`sum(${salesTable.total_amount})`.as('total_spent')
      })
      .from(salesTable)
      .innerJoin(customersTable, eq(salesTable.customer_id, customersTable.id))
      .where(
        // Only include paid transactions and exclude walk-in customers (null customer_id)
        eq(salesTable.payment_status, 'paid')
      )
      .groupBy(customersTable.id, customersTable.name)
      .orderBy(desc(sql`sum(${salesTable.total_amount})`))
      .limit(limit)
      .execute();

    return results.map(result => ({
      customer_id: result.customer_id,
      customer_name: result.customer_name,
      total_purchases: result.total_purchases,
      total_spent: parseFloat(result.total_spent) // Convert numeric string back to number
    }));
  } catch (error) {
    console.error('Top customers retrieval failed:', error);
    throw error;
  }
}