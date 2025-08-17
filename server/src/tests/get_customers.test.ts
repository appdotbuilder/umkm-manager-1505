import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { getCustomers } from '../handlers/get_customers';

describe('getCustomers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no customers exist', async () => {
    const result = await getCustomers();
    
    expect(result).toEqual([]);
  });

  it('should return all customers ordered by name', async () => {
    // Create test customers in reverse alphabetical order to test sorting
    const customer1: CreateCustomerInput = {
      name: 'Zara Wilson',
      phone: '+1234567890',
      email: 'zara@example.com',
      address: '789 Oak St'
    };

    const customer2: CreateCustomerInput = {
      name: 'Alice Johnson',
      phone: '+0987654321',
      email: 'alice@example.com',
      address: '456 Elm St'
    };

    const customer3: CreateCustomerInput = {
      name: 'Bob Smith',
      phone: null,
      email: null,
      address: null
    };

    // Insert customers
    await db.insert(customersTable)
      .values([
        customer1,
        customer2,
        customer3
      ])
      .execute();

    const result = await getCustomers();

    // Should return 3 customers
    expect(result).toHaveLength(3);

    // Should be ordered by name (Alice, Bob, Zara)
    expect(result[0].name).toBe('Alice Johnson');
    expect(result[1].name).toBe('Bob Smith');
    expect(result[2].name).toBe('Zara Wilson');

    // Verify all fields are properly returned
    expect(result[0].phone).toBe('+0987654321');
    expect(result[0].email).toBe('alice@example.com');
    expect(result[0].address).toBe('456 Elm St');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    // Verify nullable fields work correctly
    expect(result[1].phone).toBeNull();
    expect(result[1].email).toBeNull();
    expect(result[1].address).toBeNull();
  });

  it('should handle large number of customers', async () => {
    // Create multiple customers
    const customers = Array.from({ length: 50 }, (_, i) => ({
      name: `Customer ${String(i).padStart(2, '0')}`,
      phone: `+123456${String(i).padStart(4, '0')}`,
      email: `customer${i}@example.com`,
      address: `${i + 1} Main Street`
    }));

    await db.insert(customersTable)
      .values(customers)
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(50);
    
    // Verify ordering - should be sorted alphabetically by name
    for (let i = 1; i < result.length; i++) {
      expect(result[i].name >= result[i - 1].name).toBe(true);
    }

    // Verify first and last customers
    expect(result[0].name).toBe('Customer 00');
    expect(result[result.length - 1].name).toBe('Customer 49');
  });

  it('should return customers with proper date objects', async () => {
    const testCustomer: CreateCustomerInput = {
      name: 'Test Customer',
      phone: '+1234567890',
      email: 'test@example.com',
      address: '123 Test St'
    };

    await db.insert(customersTable)
      .values(testCustomer)
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(1);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
    
    // Verify dates are reasonable (within last minute)
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    
    expect(result[0].created_at >= oneMinuteAgo).toBe(true);
    expect(result[0].created_at <= now).toBe(true);
    expect(result[0].updated_at >= oneMinuteAgo).toBe(true);
    expect(result[0].updated_at <= now).toBe(true);
  });

  it('should handle customers with special characters in names', async () => {
    const specialCustomers = [
      {
        name: 'José García-López',
        phone: '+34123456789',
        email: 'jose@example.com',
        address: 'Calle Mayor, 123'
      },
      {
        name: 'François Müller',
        phone: '+49123456789',
        email: 'francois@example.com', 
        address: 'Straße 456'
      },
      {
        name: '李小明',
        phone: '+86123456789',
        email: 'xiaoming@example.com',
        address: '北京市朝阳区'
      }
    ];

    await db.insert(customersTable)
      .values(specialCustomers)
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(3);
    
    // Verify all special characters are preserved
    const names = result.map(c => c.name).sort();
    expect(names).toContain('José García-López');
    expect(names).toContain('François Müller');
    expect(names).toContain('李小明');
  });
});