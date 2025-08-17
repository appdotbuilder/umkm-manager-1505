import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, salesTable } from '../db/schema';
import { getTopCustomers } from '../handlers/get_top_customers';

describe('getTopCustomers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return top customers by total spending', async () => {
    // Create test customers
    const customers = await db.insert(customersTable)
      .values([
        { name: 'Alice Smith', email: 'alice@example.com', phone: '+1234567890' },
        { name: 'Bob Johnson', email: 'bob@example.com', phone: '+1234567891' },
        { name: 'Carol Wilson', email: 'carol@example.com', phone: '+1234567892' }
      ])
      .returning()
      .execute();

    // Create sales with different amounts (Alice spends most, Bob middle, Carol least)
    await db.insert(salesTable)
      .values([
        // Alice's purchases (total: $300)
        { customer_id: customers[0].id, total_amount: '150.00', payment_method: 'cash', payment_status: 'paid' },
        { customer_id: customers[0].id, total_amount: '150.00', payment_method: 'credit_card', payment_status: 'paid' },
        // Bob's purchases (total: $200)
        { customer_id: customers[1].id, total_amount: '100.00', payment_method: 'bank_transfer', payment_status: 'paid' },
        { customer_id: customers[1].id, total_amount: '100.00', payment_method: 'cash', payment_status: 'paid' },
        // Carol's purchases (total: $50)
        { customer_id: customers[2].id, total_amount: '50.00', payment_method: 'e_wallet', payment_status: 'paid' }
      ])
      .execute();

    const result = await getTopCustomers(10);

    expect(result).toHaveLength(3);
    
    // Should be ordered by total spent (Alice first, Bob second, Carol third)
    expect(result[0].customer_name).toBe('Alice Smith');
    expect(result[0].total_spent).toBe(300);
    expect(result[0].total_purchases).toBe(2);
    
    expect(result[1].customer_name).toBe('Bob Johnson');
    expect(result[1].total_spent).toBe(200);
    expect(result[1].total_purchases).toBe(2);
    
    expect(result[2].customer_name).toBe('Carol Wilson');
    expect(result[2].total_spent).toBe(50);
    expect(result[2].total_purchases).toBe(1);

    // Verify all fields are present and correct types
    result.forEach(customer => {
      expect(customer.customer_id).toBeDefined();
      expect(typeof customer.customer_id).toBe('number');
      expect(customer.customer_name).toBeDefined();
      expect(typeof customer.customer_name).toBe('string');
      expect(typeof customer.total_spent).toBe('number');
      expect(typeof customer.total_purchases).toBe('number');
    });
  });

  it('should exclude walk-in customers (null customer_id)', async () => {
    // Create a customer
    const customer = await db.insert(customersTable)
      .values({ name: 'John Doe', email: 'john@example.com' })
      .returning()
      .execute();

    // Create sales - some with customer, some walk-in (null customer_id)
    await db.insert(salesTable)
      .values([
        { customer_id: customer[0].id, total_amount: '100.00', payment_method: 'cash', payment_status: 'paid' },
        { customer_id: null, total_amount: '200.00', payment_method: 'cash', payment_status: 'paid' }, // Walk-in customer
        { customer_id: null, total_amount: '300.00', payment_method: 'credit_card', payment_status: 'paid' } // Walk-in customer
      ])
      .execute();

    const result = await getTopCustomers(10);

    expect(result).toHaveLength(1);
    expect(result[0].customer_name).toBe('John Doe');
    expect(result[0].total_spent).toBe(100);
    expect(result[0].total_purchases).toBe(1);
  });

  it('should only include paid transactions', async () => {
    // Create test customer
    const customer = await db.insert(customersTable)
      .values({ name: 'Jane Doe', email: 'jane@example.com' })
      .returning()
      .execute();

    // Create sales with different payment statuses
    await db.insert(salesTable)
      .values([
        { customer_id: customer[0].id, total_amount: '100.00', payment_method: 'cash', payment_status: 'paid' },
        { customer_id: customer[0].id, total_amount: '200.00', payment_method: 'credit_card', payment_status: 'pending' },
        { customer_id: customer[0].id, total_amount: '150.00', payment_method: 'bank_transfer', payment_status: 'cancelled' }
      ])
      .execute();

    const result = await getTopCustomers(10);

    expect(result).toHaveLength(1);
    expect(result[0].customer_name).toBe('Jane Doe');
    expect(result[0].total_spent).toBe(100); // Only paid transaction counted
    expect(result[0].total_purchases).toBe(1);
  });

  it('should respect the limit parameter', async () => {
    // Create multiple customers
    const customers = await db.insert(customersTable)
      .values([
        { name: 'Customer A', email: 'a@example.com' },
        { name: 'Customer B', email: 'b@example.com' },
        { name: 'Customer C', email: 'c@example.com' },
        { name: 'Customer D', email: 'd@example.com' },
        { name: 'Customer E', email: 'e@example.com' }
      ])
      .returning()
      .execute();

    // Create sales for all customers
    const salesData = customers.map((customer, index) => ({
      customer_id: customer.id,
      total_amount: `${(index + 1) * 100}.00`, // Different amounts to ensure ordering
      payment_method: 'cash' as const,
      payment_status: 'paid' as const
    }));

    await db.insert(salesTable)
      .values(salesData)
      .execute();

    const result = await getTopCustomers(3);

    expect(result).toHaveLength(3);
    // Should return top 3 customers by spending
    expect(result[0].customer_name).toBe('Customer E'); // Highest spender
    expect(result[1].customer_name).toBe('Customer D');
    expect(result[2].customer_name).toBe('Customer C');
  });

  it('should return empty array when no customers have paid transactions', async () => {
    // Create customer with only pending transactions
    const customer = await db.insert(customersTable)
      .values({ name: 'No Sales Customer', email: 'nosales@example.com' })
      .returning()
      .execute();

    await db.insert(salesTable)
      .values({
        customer_id: customer[0].id,
        total_amount: '100.00',
        payment_method: 'cash',
        payment_status: 'pending'
      })
      .execute();

    const result = await getTopCustomers(10);

    expect(result).toHaveLength(0);
  });

  it('should handle customers with multiple purchases correctly', async () => {
    // Create customer
    const customer = await db.insert(customersTable)
      .values({ name: 'Multi Purchase Customer', email: 'multi@example.com' })
      .returning()
      .execute();

    // Create multiple sales for the same customer
    await db.insert(salesTable)
      .values([
        { customer_id: customer[0].id, total_amount: '25.50', payment_method: 'cash', payment_status: 'paid' },
        { customer_id: customer[0].id, total_amount: '30.75', payment_method: 'credit_card', payment_status: 'paid' },
        { customer_id: customer[0].id, total_amount: '15.25', payment_method: 'e_wallet', payment_status: 'paid' },
        { customer_id: customer[0].id, total_amount: '28.50', payment_method: 'bank_transfer', payment_status: 'paid' }
      ])
      .execute();

    const result = await getTopCustomers(10);

    expect(result).toHaveLength(1);
    expect(result[0].customer_name).toBe('Multi Purchase Customer');
    expect(result[0].total_purchases).toBe(4);
    expect(result[0].total_spent).toBe(100); // 25.50 + 30.75 + 15.25 + 28.50 = 100
  });
});