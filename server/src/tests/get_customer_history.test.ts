import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, salesTable } from '../db/schema';
import { getCustomerHistory } from '../handlers/get_customer_history';

describe('getCustomerHistory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return customer history with sales ordered by date (most recent first)', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '123-456-7890',
        email: 'test@example.com',
        address: '123 Test St'
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create test sales with different dates
    const oldDate = new Date('2024-01-01');
    const recentDate = new Date('2024-01-15');

    await db.insert(salesTable)
      .values([
        {
          customer_id: customerId,
          total_amount: '150.00',
          payment_method: 'cash',
          payment_status: 'paid',
          transaction_date: oldDate,
          notes: 'Old sale'
        },
        {
          customer_id: customerId,
          total_amount: '275.50',
          payment_method: 'credit_card',
          payment_status: 'paid',
          transaction_date: recentDate,
          notes: 'Recent sale'
        }
      ])
      .execute();

    const result = await getCustomerHistory(customerId);

    // Verify structure
    expect(result.customer_id).toEqual(customerId);
    expect(result.sales).toHaveLength(2);

    // Verify ordering (most recent first)
    expect(result.sales[0].transaction_date).toEqual(recentDate);
    expect(result.sales[1].transaction_date).toEqual(oldDate);

    // Verify numeric conversion
    expect(typeof result.sales[0].total_amount).toBe('number');
    expect(result.sales[0].total_amount).toEqual(275.50);
    expect(result.sales[1].total_amount).toEqual(150.00);

    // Verify all expected fields are present
    expect(result.sales[0].payment_method).toEqual('credit_card');
    expect(result.sales[0].payment_status).toEqual('paid');
    expect(result.sales[0].notes).toEqual('Recent sale');
    expect(result.sales[0].id).toBeDefined();
    expect(result.sales[0].created_at).toBeInstanceOf(Date);
    expect(result.sales[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return empty sales array for customer with no purchases', async () => {
    // Create test customer without any sales
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Customer No Sales',
        phone: null,
        email: null,
        address: null
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    const result = await getCustomerHistory(customerId);

    expect(result.customer_id).toEqual(customerId);
    expect(result.sales).toHaveLength(0);
    expect(Array.isArray(result.sales)).toBe(true);
  });

  it('should handle customer with single purchase', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Single Purchase Customer',
        phone: '555-0123',
        email: 'single@example.com',
        address: '456 Single St'
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create single sale
    await db.insert(salesTable)
      .values({
        customer_id: customerId,
        total_amount: '99.99',
        payment_method: 'e_wallet',
        payment_status: 'paid',
        transaction_date: new Date(),
        notes: 'Single purchase'
      })
      .execute();

    const result = await getCustomerHistory(customerId);

    expect(result.customer_id).toEqual(customerId);
    expect(result.sales).toHaveLength(1);
    expect(result.sales[0].total_amount).toEqual(99.99);
    expect(result.sales[0].payment_method).toEqual('e_wallet');
    expect(result.sales[0].notes).toEqual('Single purchase');
  });

  it('should throw error for non-existent customer', async () => {
    const nonExistentCustomerId = 99999;

    await expect(getCustomerHistory(nonExistentCustomerId))
      .rejects.toThrow(/Customer with ID 99999 not found/i);
  });

  it('should handle multiple sales with different payment methods and statuses', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Multi-Purchase Customer',
        phone: '555-0456',
        email: 'multi@example.com',
        address: '789 Multi Ave'
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create multiple sales with different characteristics
    await db.insert(salesTable)
      .values([
        {
          customer_id: customerId,
          total_amount: '50.00',
          payment_method: 'cash',
          payment_status: 'paid',
          transaction_date: new Date('2024-01-01'),
          notes: 'Cash payment'
        },
        {
          customer_id: customerId,
          total_amount: '125.75',
          payment_method: 'bank_transfer',
          payment_status: 'pending',
          transaction_date: new Date('2024-01-10'),
          notes: 'Pending transfer'
        },
        {
          customer_id: customerId,
          total_amount: '200.00',
          payment_method: 'credit_card',
          payment_status: 'cancelled',
          transaction_date: new Date('2024-01-05'),
          notes: 'Cancelled order'
        }
      ])
      .execute();

    const result = await getCustomerHistory(customerId);

    expect(result.customer_id).toEqual(customerId);
    expect(result.sales).toHaveLength(3);

    // Verify ordering by date (most recent first)
    const dates = result.sales.map(sale => sale.transaction_date);
    expect(dates[0]).toEqual(new Date('2024-01-10'));
    expect(dates[1]).toEqual(new Date('2024-01-05'));
    expect(dates[2]).toEqual(new Date('2024-01-01'));

    // Verify different payment methods and statuses are preserved
    const paymentMethods = result.sales.map(sale => sale.payment_method);
    expect(paymentMethods).toContain('cash');
    expect(paymentMethods).toContain('bank_transfer');
    expect(paymentMethods).toContain('credit_card');

    const paymentStatuses = result.sales.map(sale => sale.payment_status);
    expect(paymentStatuses).toContain('paid');
    expect(paymentStatuses).toContain('pending');
    expect(paymentStatuses).toContain('cancelled');

    // Verify numeric conversions
    result.sales.forEach(sale => {
      expect(typeof sale.total_amount).toBe('number');
    });
  });
});