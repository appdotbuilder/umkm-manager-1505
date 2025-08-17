import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput, type UpdateCustomerInput } from '../schema';
import { updateCustomer } from '../handlers/update_customer';
import { eq } from 'drizzle-orm';

// Helper to create a customer for testing
const createTestCustomer = async (input: CreateCustomerInput) => {
  const result = await db.insert(customersTable)
    .values({
      name: input.name,
      phone: input.phone,
      email: input.email,
      address: input.address
    })
    .returning()
    .execute();
  return result[0];
};

// Base customer data for testing
const baseCustomerInput: CreateCustomerInput = {
  name: 'John Doe',
  phone: '+1234567890',
  email: 'john.doe@example.com',
  address: '123 Main St, City, State'
};

describe('updateCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update customer name', async () => {
    // Create customer first
    const customer = await createTestCustomer(baseCustomerInput);

    const updateInput: UpdateCustomerInput = {
      id: customer.id,
      name: 'Jane Smith'
    };

    const result = await updateCustomer(updateInput);

    expect(result.id).toEqual(customer.id);
    expect(result.name).toEqual('Jane Smith');
    expect(result.phone).toEqual(baseCustomerInput.phone);
    expect(result.email).toEqual(baseCustomerInput.email);
    expect(result.address).toEqual(baseCustomerInput.address);
    expect(result.created_at).toEqual(customer.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > customer.updated_at).toBe(true);
  });

  it('should update customer contact information', async () => {
    const customer = await createTestCustomer(baseCustomerInput);

    const updateInput: UpdateCustomerInput = {
      id: customer.id,
      phone: '+0987654321',
      email: 'jane.smith@example.com'
    };

    const result = await updateCustomer(updateInput);

    expect(result.id).toEqual(customer.id);
    expect(result.name).toEqual(baseCustomerInput.name);
    expect(result.phone).toEqual('+0987654321');
    expect(result.email).toEqual('jane.smith@example.com');
    expect(result.address).toEqual(baseCustomerInput.address);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > customer.updated_at).toBe(true);
  });

  it('should update customer address', async () => {
    const customer = await createTestCustomer(baseCustomerInput);

    const updateInput: UpdateCustomerInput = {
      id: customer.id,
      address: '456 Oak Avenue, Another City, State'
    };

    const result = await updateCustomer(updateInput);

    expect(result.id).toEqual(customer.id);
    expect(result.name).toEqual(baseCustomerInput.name);
    expect(result.phone).toEqual(baseCustomerInput.phone);
    expect(result.email).toEqual(baseCustomerInput.email);
    expect(result.address).toEqual('456 Oak Avenue, Another City, State');
    expect(result.updated_at > customer.updated_at).toBe(true);
  });

  it('should update multiple fields at once', async () => {
    const customer = await createTestCustomer(baseCustomerInput);

    const updateInput: UpdateCustomerInput = {
      id: customer.id,
      name: 'Updated Name',
      phone: '+1111111111',
      email: 'updated@example.com',
      address: '789 New Street, New City'
    };

    const result = await updateCustomer(updateInput);

    expect(result.id).toEqual(customer.id);
    expect(result.name).toEqual('Updated Name');
    expect(result.phone).toEqual('+1111111111');
    expect(result.email).toEqual('updated@example.com');
    expect(result.address).toEqual('789 New Street, New City');
    expect(result.updated_at > customer.updated_at).toBe(true);
  });

  it('should update nullable fields to null', async () => {
    const customer = await createTestCustomer(baseCustomerInput);

    const updateInput: UpdateCustomerInput = {
      id: customer.id,
      phone: null,
      email: null,
      address: null
    };

    const result = await updateCustomer(updateInput);

    expect(result.id).toEqual(customer.id);
    expect(result.name).toEqual(baseCustomerInput.name);
    expect(result.phone).toBeNull();
    expect(result.email).toBeNull();
    expect(result.address).toBeNull();
    expect(result.updated_at > customer.updated_at).toBe(true);
  });

  it('should save updates to database', async () => {
    const customer = await createTestCustomer(baseCustomerInput);

    const updateInput: UpdateCustomerInput = {
      id: customer.id,
      name: 'Database Test Name',
      email: 'dbtest@example.com'
    };

    await updateCustomer(updateInput);

    // Verify changes persisted in database
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customer.id))
      .execute();

    expect(customers).toHaveLength(1);
    expect(customers[0].name).toEqual('Database Test Name');
    expect(customers[0].email).toEqual('dbtest@example.com');
    expect(customers[0].phone).toEqual(baseCustomerInput.phone);
    expect(customers[0].address).toEqual(baseCustomerInput.address);
    expect(customers[0].updated_at).toBeInstanceOf(Date);
    expect(customers[0].updated_at > customer.updated_at).toBe(true);
  });

  it('should throw error when customer not found', async () => {
    const updateInput: UpdateCustomerInput = {
      id: 999, // Non-existent customer ID
      name: 'Non-existent Customer'
    };

    await expect(updateCustomer(updateInput)).rejects.toThrow(/Customer with id 999 not found/i);
  });

  it('should handle customer with minimal data', async () => {
    // Create customer with only required field
    const minimalCustomer = await createTestCustomer({
      name: 'Minimal Customer',
      phone: null,
      email: null,
      address: null
    });

    const updateInput: UpdateCustomerInput = {
      id: minimalCustomer.id,
      phone: '+5555555555',
      email: 'minimal@example.com'
    };

    const result = await updateCustomer(updateInput);

    expect(result.id).toEqual(minimalCustomer.id);
    expect(result.name).toEqual('Minimal Customer');
    expect(result.phone).toEqual('+5555555555');
    expect(result.email).toEqual('minimal@example.com');
    expect(result.address).toBeNull();
    expect(result.updated_at > minimalCustomer.updated_at).toBe(true);
  });
});