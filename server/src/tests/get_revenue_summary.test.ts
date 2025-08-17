import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { salesTable, customersTable, productsTable } from '../db/schema';
import { getRevenueSummary } from '../handlers/get_revenue_summary';

describe('getRevenueSummary', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty summary for period with no sales', async () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const result = await getRevenueSummary(startDate, endDate);

    expect(result.total_revenue).toBe(0);
    expect(result.total_transactions).toBe(0);
    expect(result.average_transaction).toBe(0);
    expect(result.revenue_by_payment_method).toHaveLength(0);
    expect(result.period_start).toEqual(startDate);
    expect(result.period_end).toEqual(endDate);
  });

  it('should calculate revenue summary for single paid transaction', async () => {
    // Create a customer for the sale
    const customers = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '123-456-7890',
        address: '123 Test St'
      })
      .returning()
      .execute();

    // Create a paid sale
    await db.insert(salesTable)
      .values({
        customer_id: customers[0].id,
        total_amount: '150.75',
        payment_method: 'cash',
        payment_status: 'paid',
        transaction_date: new Date('2024-01-15'),
        notes: 'Test sale'
      })
      .execute();

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const result = await getRevenueSummary(startDate, endDate);

    expect(result.total_revenue).toBe(150.75);
    expect(result.total_transactions).toBe(1);
    expect(result.average_transaction).toBe(150.75);
    expect(result.revenue_by_payment_method).toHaveLength(1);
    expect(result.revenue_by_payment_method[0]).toEqual({
      payment_method: 'cash',
      total_amount: 150.75,
      transaction_count: 1
    });
  });

  it('should exclude pending and cancelled transactions', async () => {
    const customers = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '123-456-7890',
        address: '123 Test St'
      })
      .returning()
      .execute();

    // Create transactions with different statuses
    await db.insert(salesTable)
      .values([
        {
          customer_id: customers[0].id,
          total_amount: '100.00',
          payment_method: 'cash',
          payment_status: 'paid',
          transaction_date: new Date('2024-01-15')
        },
        {
          customer_id: customers[0].id,
          total_amount: '200.00',
          payment_method: 'credit_card',
          payment_status: 'pending',
          transaction_date: new Date('2024-01-16')
        },
        {
          customer_id: customers[0].id,
          total_amount: '75.00',
          payment_method: 'e_wallet',
          payment_status: 'cancelled',
          transaction_date: new Date('2024-01-17')
        }
      ])
      .execute();

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const result = await getRevenueSummary(startDate, endDate);

    // Only the paid transaction should be included
    expect(result.total_revenue).toBe(100.00);
    expect(result.total_transactions).toBe(1);
    expect(result.average_transaction).toBe(100.00);
    expect(result.revenue_by_payment_method).toHaveLength(1);
    expect(result.revenue_by_payment_method[0].payment_method).toBe('cash');
  });

  it('should filter transactions by date range correctly', async () => {
    const customers = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '123-456-7890',
        address: '123 Test St'
      })
      .returning()
      .execute();

    // Create transactions across different dates
    await db.insert(salesTable)
      .values([
        {
          customer_id: customers[0].id,
          total_amount: '100.00',
          payment_method: 'cash',
          payment_status: 'paid',
          transaction_date: new Date('2023-12-31') // Before range
        },
        {
          customer_id: customers[0].id,
          total_amount: '200.00',
          payment_method: 'credit_card',
          payment_status: 'paid',
          transaction_date: new Date('2024-01-15') // In range
        },
        {
          customer_id: customers[0].id,
          total_amount: '150.00',
          payment_method: 'bank_transfer',
          payment_status: 'paid',
          transaction_date: new Date('2024-01-31') // In range (end boundary)
        },
        {
          customer_id: customers[0].id,
          total_amount: '75.00',
          payment_method: 'e_wallet',
          payment_status: 'paid',
          transaction_date: new Date('2024-02-01') // After range
        }
      ])
      .execute();

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const result = await getRevenueSummary(startDate, endDate);

    // Should include only transactions from Jan 15 and Jan 31
    expect(result.total_revenue).toBe(350.00);
    expect(result.total_transactions).toBe(2);
    expect(result.average_transaction).toBe(175.00);
    expect(result.revenue_by_payment_method).toHaveLength(2);
  });

  it('should aggregate revenue by payment method correctly', async () => {
    const customers = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '123-456-7890',
        address: '123 Test St'
      })
      .returning()
      .execute();

    // Create multiple transactions with different payment methods
    await db.insert(salesTable)
      .values([
        {
          customer_id: customers[0].id,
          total_amount: '100.00',
          payment_method: 'cash',
          payment_status: 'paid',
          transaction_date: new Date('2024-01-10')
        },
        {
          customer_id: customers[0].id,
          total_amount: '150.00',
          payment_method: 'cash',
          payment_status: 'paid',
          transaction_date: new Date('2024-01-15')
        },
        {
          customer_id: customers[0].id,
          total_amount: '200.00',
          payment_method: 'credit_card',
          payment_status: 'paid',
          transaction_date: new Date('2024-01-20')
        },
        {
          customer_id: customers[0].id,
          total_amount: '75.50',
          payment_method: 'e_wallet',
          payment_status: 'paid',
          transaction_date: new Date('2024-01-25')
        },
        {
          customer_id: customers[0].id,
          total_amount: '300.25',
          payment_method: 'credit_card',
          payment_status: 'paid',
          transaction_date: new Date('2024-01-30')
        }
      ])
      .execute();

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const result = await getRevenueSummary(startDate, endDate);

    expect(result.total_revenue).toBe(825.75);
    expect(result.total_transactions).toBe(5);
    expect(result.average_transaction).toBe(165.15);
    expect(result.revenue_by_payment_method).toHaveLength(3);

    // Check payment method breakdown (sorted alphabetically)
    const cashMethod = result.revenue_by_payment_method.find(m => m.payment_method === 'cash');
    expect(cashMethod).toEqual({
      payment_method: 'cash',
      total_amount: 250.00, // 100 + 150
      transaction_count: 2
    });

    const creditCardMethod = result.revenue_by_payment_method.find(m => m.payment_method === 'credit_card');
    expect(creditCardMethod).toEqual({
      payment_method: 'credit_card',
      total_amount: 500.25, // 200 + 300.25
      transaction_count: 2
    });

    const eWalletMethod = result.revenue_by_payment_method.find(m => m.payment_method === 'e_wallet');
    expect(eWalletMethod).toEqual({
      payment_method: 'e_wallet',
      total_amount: 75.50,
      transaction_count: 1
    });
  });

  it('should handle walk-in customers (null customer_id)', async () => {
    // Create sales without customer (walk-in sales)
    await db.insert(salesTable)
      .values([
        {
          customer_id: null,
          total_amount: '50.00',
          payment_method: 'cash',
          payment_status: 'paid',
          transaction_date: new Date('2024-01-15')
        },
        {
          customer_id: null,
          total_amount: '125.75',
          payment_method: 'credit_card',
          payment_status: 'paid',
          transaction_date: new Date('2024-01-20')
        }
      ])
      .execute();

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const result = await getRevenueSummary(startDate, endDate);

    expect(result.total_revenue).toBe(175.75);
    expect(result.total_transactions).toBe(2);
    expect(result.average_transaction).toBe(87.875);
    expect(result.revenue_by_payment_method).toHaveLength(2);
  });

  it('should handle decimal calculations accurately', async () => {
    const customers = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '123-456-7890',
        address: '123 Test St'
      })
      .returning()
      .execute();

    // Create sales with precise decimal amounts
    await db.insert(salesTable)
      .values([
        {
          customer_id: customers[0].id,
          total_amount: '99.99',
          payment_method: 'cash',
          payment_status: 'paid',
          transaction_date: new Date('2024-01-10')
        },
        {
          customer_id: customers[0].id,
          total_amount: '0.01',
          payment_method: 'cash',
          payment_status: 'paid',
          transaction_date: new Date('2024-01-15')
        },
        {
          customer_id: customers[0].id,
          total_amount: '33.33',
          payment_method: 'credit_card',
          payment_status: 'paid',
          transaction_date: new Date('2024-01-20')
        }
      ])
      .execute();

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const result = await getRevenueSummary(startDate, endDate);

    expect(result.total_revenue).toBe(133.33);
    expect(result.total_transactions).toBe(3);
    expect(Math.round(result.average_transaction * 100) / 100).toBe(44.44); // Round to avoid floating point precision issues
    
    // Verify numeric conversion worked correctly
    expect(typeof result.total_revenue).toBe('number');
    expect(typeof result.average_transaction).toBe('number');
    result.revenue_by_payment_method.forEach(method => {
      expect(typeof method.total_amount).toBe('number');
    });
  });
});