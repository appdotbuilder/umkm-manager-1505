import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { createCustomer } from '../handlers/create_customer';
import { eq } from 'drizzle-orm';

// Complete test input with all fields
const testInputComplete: CreateCustomerInput = {
  name: 'John Doe',
  phone: '+1234567890',
  email: 'john.doe@example.com',
  address: '123 Main St, City, State 12345'
};

// Minimal test input (required fields only)
const testInputMinimal: CreateCustomerInput = {
  name: 'Jane Smith',
  phone: null,
  email: null,
  address: null
};

describe('createCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a customer with all fields', async () => {
    const result = await createCustomer(testInputComplete);

    // Basic field validation
    expect(result.name).toEqual('John Doe');
    expect(result.phone).toEqual('+1234567890');
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.address).toEqual('123 Main St, City, State 12345');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a customer with minimal fields', async () => {
    const result = await createCustomer(testInputMinimal);

    // Verify required fields
    expect(result.name).toEqual('Jane Smith');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify optional fields are null
    expect(result.phone).toBeNull();
    expect(result.email).toBeNull();
    expect(result.address).toBeNull();
  });

  it('should save customer to database', async () => {
    const result = await createCustomer(testInputComplete);

    // Query using proper drizzle syntax
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, result.id))
      .execute();

    expect(customers).toHaveLength(1);
    const savedCustomer = customers[0];
    expect(savedCustomer.name).toEqual('John Doe');
    expect(savedCustomer.phone).toEqual('+1234567890');
    expect(savedCustomer.email).toEqual('john.doe@example.com');
    expect(savedCustomer.address).toEqual('123 Main St, City, State 12345');
    expect(savedCustomer.created_at).toBeInstanceOf(Date);
    expect(savedCustomer.updated_at).toBeInstanceOf(Date);
  });

  it('should handle customer with valid email format', async () => {
    const validEmailInput: CreateCustomerInput = {
      name: 'Test Customer',
      phone: null,
      email: 'test@domain.co.uk',
      address: null
    };

    const result = await createCustomer(validEmailInput);

    expect(result.name).toEqual('Test Customer');
    expect(result.email).toEqual('test@domain.co.uk');
    expect(result.id).toBeDefined();
  });

  it('should create multiple customers with unique IDs', async () => {
    const customer1 = await createCustomer({
      name: 'Customer 1',
      phone: null,
      email: null,
      address: null
    });

    const customer2 = await createCustomer({
      name: 'Customer 2',
      phone: null,
      email: null,
      address: null
    });

    expect(customer1.id).not.toEqual(customer2.id);
    expect(customer1.name).toEqual('Customer 1');
    expect(customer2.name).toEqual('Customer 2');

    // Verify both are saved in database
    const allCustomers = await db.select()
      .from(customersTable)
      .execute();

    expect(allCustomers).toHaveLength(2);
    const names = allCustomers.map(c => c.name).sort();
    expect(names).toEqual(['Customer 1', 'Customer 2']);
  });

  it('should handle special characters in customer data', async () => {
    const specialCharInput: CreateCustomerInput = {
      name: "O'Connor & Associates",
      phone: '+1-800-555-0199',
      email: 'contact+business@company.com',
      address: '456 "Main" Street, Apt #2B\nSecond Line'
    };

    const result = await createCustomer(specialCharInput);

    expect(result.name).toEqual("O'Connor & Associates");
    expect(result.phone).toEqual('+1-800-555-0199');
    expect(result.email).toEqual('contact+business@company.com');
    expect(result.address).toEqual('456 "Main" Street, Apt #2B\nSecond Line');

    // Verify it's saved correctly
    const saved = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, result.id))
      .execute();

    expect(saved[0].name).toEqual("O'Connor & Associates");
    expect(saved[0].address).toEqual('456 "Main" Street, Apt #2B\nSecond Line');
  });
});