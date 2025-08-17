import { db } from '../db';
import { salesTable } from '../db/schema';
import { type Sale } from '../schema';
import { desc } from 'drizzle-orm';

/**
 * Retrieves all sales transactions from the system.
 * Returns sales with customer information and transaction details.
 */
export const getSales = async (): Promise<Sale[]> => {
  try {
    // Query sales ordered by transaction date (most recent first)
    const results = await db.select()
      .from(salesTable)
      .orderBy(desc(salesTable.transaction_date))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(sale => ({
      ...sale,
      total_amount: parseFloat(sale.total_amount)
    }));
  } catch (error) {
    console.error('Failed to retrieve sales:', error);
    throw error;
  }
};