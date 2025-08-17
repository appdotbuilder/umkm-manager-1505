import { db } from '../db';
import { salesTable, customersTable } from '../db/schema';
import { type CustomerPurchaseHistory } from '../schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Retrieves a customer's complete purchase history.
 * Returns all transactions and items purchased by a specific customer.
 */
export async function getCustomerHistory(customerId: number): Promise<CustomerPurchaseHistory> {
  try {
    // First verify the customer exists
    const customerExists = await db.select({ id: customersTable.id })
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .execute();

    if (customerExists.length === 0) {
      throw new Error(`Customer with ID ${customerId} not found`);
    }

    // Fetch all sales for the customer, ordered by most recent first
    const salesResults = await db.select()
      .from(salesTable)
      .where(eq(salesTable.customer_id, customerId))
      .orderBy(desc(salesTable.transaction_date))
      .execute();

    // Convert numeric fields back to numbers for each sale
    const sales = salesResults.map(sale => ({
      ...sale,
      total_amount: parseFloat(sale.total_amount) // Convert numeric to number
    }));

    return {
      customer_id: customerId,
      sales: sales
    };
  } catch (error) {
    console.error('Get customer history failed:', error);
    throw error;
  }
}