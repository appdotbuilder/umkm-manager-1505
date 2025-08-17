import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { salesTable, customersTable, productsTable } from '../db/schema';
import { type SalesReportInput } from '../schema';
import { getSalesReport } from '../handlers/get_sales_report';

describe('getSalesReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const setupTestData = async () => {
    // Create test customer
    const [customer] = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '123-456-7890',
        email: 'test@example.com',
        address: '123 Test St'
      })
      .returning();

    // Create sales with different dates and statuses
    const salesData = [
      {
        customer_id: customer.id,
        total_amount: '100.00',
        payment_method: 'cash' as const,
        payment_status: 'paid' as const,
        transaction_date: new Date('2024-01-15'),
        notes: 'Test sale 1'
      },
      {
        customer_id: customer.id,
        total_amount: '150.00',
        payment_method: 'credit_card' as const,
        payment_status: 'paid' as const,
        transaction_date: new Date('2024-01-15'),
        notes: 'Test sale 2'
      },
      {
        customer_id: customer.id,
        total_amount: '200.00',
        payment_method: 'bank_transfer' as const,
        payment_status: 'paid' as const,
        transaction_date: new Date('2024-01-16'),
        notes: 'Test sale 3'
      },
      {
        customer_id: customer.id,
        total_amount: '75.00',
        payment_method: 'cash' as const,
        payment_status: 'pending' as const, // Should be excluded
        transaction_date: new Date('2024-01-16'),
        notes: 'Pending sale'
      },
      {
        customer_id: customer.id,
        total_amount: '300.00',
        payment_method: 'e_wallet' as const,
        payment_status: 'paid' as const,
        transaction_date: new Date('2024-02-01'),
        notes: 'February sale'
      }
    ];

    await db.insert(salesTable).values(salesData);

    return { customer };
  };

  it('should generate daily sales report for date range', async () => {
    await setupTestData();

    const input: SalesReportInput = {
      start_date: new Date('2024-01-15'),
      end_date: new Date('2024-01-16'),
      period: 'daily'
    };

    const result = await getSalesReport(input);

    expect(result).toHaveLength(2);
    
    // Should be ordered by period descending (most recent first)
    expect(result[0].period).toBe('2024-01-16');
    expect(result[0].total_sales).toBe(200.00);
    expect(result[0].total_transactions).toBe(1);
    expect(result[0].average_transaction).toBe(200.00);

    expect(result[1].period).toBe('2024-01-15');
    expect(result[1].total_sales).toBe(250.00); // 100 + 150
    expect(result[1].total_transactions).toBe(2);
    expect(result[1].average_transaction).toBe(125.00); // 250/2
  });

  it('should generate monthly sales report', async () => {
    await setupTestData();

    const input: SalesReportInput = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-02-28'),
      period: 'monthly'
    };

    const result = await getSalesReport(input);

    expect(result).toHaveLength(2);

    // Should be ordered by period descending
    expect(result[0].period).toBe('2024-02');
    expect(result[0].total_sales).toBe(300.00);
    expect(result[0].total_transactions).toBe(1);
    expect(result[0].average_transaction).toBe(300.00);

    expect(result[1].period).toBe('2024-01');
    expect(result[1].total_sales).toBe(450.00); // 100 + 150 + 200
    expect(result[1].total_transactions).toBe(3);
    expect(result[1].average_transaction).toBe(150.00); // 450/3
  });

  it('should exclude non-paid transactions', async () => {
    await setupTestData();

    const input: SalesReportInput = {
      start_date: new Date('2024-01-16'),
      end_date: new Date('2024-01-16'),
      period: 'daily'
    };

    const result = await getSalesReport(input);

    expect(result).toHaveLength(1);
    expect(result[0].total_sales).toBe(200.00); // Only paid transaction, excluding pending
    expect(result[0].total_transactions).toBe(1);
  });

  it('should return empty array when no sales in date range', async () => {
    await setupTestData();

    const input: SalesReportInput = {
      start_date: new Date('2024-03-01'),
      end_date: new Date('2024-03-31'),
      period: 'daily'
    };

    const result = await getSalesReport(input);

    expect(result).toHaveLength(0);
  });

  it('should handle single day date range', async () => {
    await setupTestData();

    const input: SalesReportInput = {
      start_date: new Date('2024-01-15'),
      end_date: new Date('2024-01-15'),
      period: 'daily'
    };

    const result = await getSalesReport(input);

    expect(result).toHaveLength(1);
    expect(result[0].period).toBe('2024-01-15');
    expect(result[0].total_sales).toBe(250.00);
    expect(result[0].total_transactions).toBe(2);
    expect(result[0].average_transaction).toBe(125.00);
  });

  it('should handle cases with only cancelled transactions', async () => {
    // Create a customer first
    const [customer] = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '123-456-7890',
        email: 'test@example.com',
        address: '123 Test St'
      })
      .returning();

    // Create only cancelled sales
    await db.insert(salesTable).values([
      {
        customer_id: customer.id,
        total_amount: '100.00',
        payment_method: 'cash',
        payment_status: 'cancelled',
        transaction_date: new Date('2024-01-15'),
        notes: 'Cancelled sale'
      }
    ]);

    const input: SalesReportInput = {
      start_date: new Date('2024-01-15'),
      end_date: new Date('2024-01-15'),
      period: 'daily'
    };

    const result = await getSalesReport(input);

    expect(result).toHaveLength(0);
  });

  it('should verify numeric conversions are correct', async () => {
    await setupTestData();

    const input: SalesReportInput = {
      start_date: new Date('2024-01-15'),
      end_date: new Date('2024-01-15'),
      period: 'daily'
    };

    const result = await getSalesReport(input);

    expect(result).toHaveLength(1);
    expect(typeof result[0].total_sales).toBe('number');
    expect(typeof result[0].total_transactions).toBe('number');
    expect(typeof result[0].average_transaction).toBe('number');
  });
});