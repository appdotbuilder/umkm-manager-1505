import { db } from '../db';
import { customersTable } from '../db/schema';
import { type UpdateCustomerInput, type Customer } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Updates an existing customer's information.
 * Allows partial updates of customer contact details and address.
 */
export async function updateCustomer(input: UpdateCustomerInput): Promise<Customer> {
  try {
    // Build update object with only provided fields
    const updateData: Partial<typeof customersTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.phone !== undefined) {
      updateData.phone = input.phone;
    }
    if (input.email !== undefined) {
      updateData.email = input.email;
    }
    if (input.address !== undefined) {
      updateData.address = input.address;
    }

    // Update customer record
    const result = await db.update(customersTable)
      .set(updateData)
      .where(eq(customersTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Customer with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Customer update failed:', error);
    throw error;
  }
}