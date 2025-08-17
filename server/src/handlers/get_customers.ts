import { db } from '../db';
import { customersTable } from '../db/schema';
import { asc } from 'drizzle-orm';
import { type Customer } from '../schema';

/**
 * Retrieves all customers from the system.
 * Returns customer information for transaction management and reporting.
 */
export async function getCustomers(): Promise<Customer[]> {
  try {
    // Fetch all customers ordered by name
    const results = await db.select()
      .from(customersTable)
      .orderBy(asc(customersTable.name))
      .execute();

    // Return results with proper date conversion
    return results.map(customer => ({
      ...customer,
      created_at: new Date(customer.created_at),
      updated_at: new Date(customer.updated_at)
    }));
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    throw error;
  }
}