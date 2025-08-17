import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput, type Customer } from '../schema';

/**
 * Creates a new customer in the system.
 * Stores customer contact information and address for future transactions.
 */
export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  try {
    // Insert customer record
    const result = await db.insert(customersTable)
      .values({
        name: input.name,
        phone: input.phone,
        email: input.email,
        address: input.address
      })
      .returning()
      .execute();

    // Return the created customer
    return result[0];
  } catch (error) {
    console.error('Customer creation failed:', error);
    throw error;
  }
}